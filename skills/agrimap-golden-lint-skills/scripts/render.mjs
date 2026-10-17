// Presentation only: renders an already validated canonical report. Kept out of the
// analysis contract so wording/layout changes never make baselines incomparable.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { json, packageRoot, validateReport } from './contracts.mjs';

const skillRoot = path.join(packageRoot, 'skills/agrimap-golden-lint-skills');
export const remediation = json(path.join(skillRoot, 'assets/remediation.json'));
const dispositions = ['violation', 'review-candidate', 'accepted-exception'];
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const promptBatchSize = 40;

export const text = value => String(value ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/[\\`*_[\]|]/g, '\\$&').replace(/[\r\n]+/g, ' ');
export const code = value => '`' + String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/`/g, '&#96;').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ') + '`';
// Fenced prompt bodies are literal text; only fence breakers and control characters need removing.
const literal = value => String(value ?? '').replace(/`/g, "'").replace(/[\x00-\x08\x0b-\x1f\x7f]/g, ' ');
const table = (headers, rows, align = []) => [
  `| ${headers.join(' | ')} |`, `| ${headers.map((_, i) => align[i] === 'right' ? '---:' : '---').join(' | ')} |`,
  ...rows.map(row => `| ${row.join(' | ')} |`)
].join('\n');

export function guide(detectorId) {
  return remediation.detectors[detectorId] || { tag: detectorId, title: detectorId, risk: 'review', skill: null, expected: 'เปิด exact Golden entry และตรวจ active contract ก่อนสรุป', approach: [], verify: [] };
}
const riskRank = risk => remediation.riskOrder.indexOf(risk);
const short = id => id.slice(0, 12);
const lines = items => [...new Set(items.map(i => i.line))].sort((a, b) => a - b).join(', ');

// Stable labels (F001...) follow canonical finding order, so report.md and summaries agree.
function model(report) {
  const indexed = report.findings.map((finding, index) => ({ finding, label: `F${String(index + 1).padStart(3, '0')}`, guide: guide(finding.detectorId) }));
  const byFile = new Map(), byRule = new Map();
  for (const item of indexed) {
    if (!byFile.has(item.finding.path)) byFile.set(item.finding.path, []);
    byFile.get(item.finding.path).push(item);
    if (!byRule.has(item.finding.detectorId)) byRule.set(item.finding.detectorId, []);
    byRule.get(item.finding.detectorId).push(item);
  }
  const groups = [...byRule].map(([detectorId, items]) => ({ detectorId, items, guide: guide(detectorId), files: new Set(items.map(i => i.finding.path)).size, rule: report.rules.find(r => r.detectorId === detectorId) }))
    .sort((a, b) => riskRank(a.guide.risk) - riskRank(b.guide.risk) || a.files - b.files || a.items.length - b.items.length || cmp(a.detectorId, b.detectorId));
  const counts = Object.fromEntries(dispositions.map(k => [k, report.findings.filter(f => f.disposition === k).length]));
  const problems = report.rules.filter(r => ['blocked', 'error'].includes(r.executionStatus));
  return { indexed, byFile: new Map([...byFile].sort(([a], [b]) => cmp(a, b))), groups, counts, problems };
}

// Compact form keeps index rows readable; the details section always lists every line.
function positions(items, compact = false) {
  const byTag = new Map();
  for (const item of items) {
    if (!byTag.has(item.guide.tag)) byTag.set(item.guide.tag, []);
    byTag.get(item.guide.tag).push(item.finding);
  }
  return [...byTag].map(([tag, findings]) => compact && new Set(findings.map(f => f.line)).size > 6
    ? `${tag} ×${findings.length}` : `${lines(findings)} ${tag}`).join(' · ');
}

// Keep whole files together so one prompt never edits half of a file's findings.
export function fixPrompts(report, context = {}) {
  const { groups } = model(report);
  const prompts = [];
  let number = 0;
  for (const group of groups) {
    if (!group.guide.skill || group.guide.risk === 'review' || group.rule?.implementationStatus === 'review-only') continue;
    number++;
    const files = new Map();
    for (const item of group.items) {
      if (!files.has(item.finding.path)) files.set(item.finding.path, []);
      files.get(item.finding.path).push(item.finding);
    }
    const batches = [];
    for (const [file, findings] of [...files].sort(([a], [b]) => cmp(a, b))) {
      const last = batches.at(-1);
      if (!last || (last.count + findings.length > promptBatchSize && last.count > 0)) batches.push({ files: [], count: 0 });
      batches.at(-1).files.push([file, findings]);
      batches.at(-1).count += findings.length;
    }
    batches.forEach((batch, index) => prompts.push({ id: batches.length > 1 ? `P${number}.${index + 1}` : `P${number}`, group, batch, part: index + 1, parts: batches.length, prompt: promptText(report, group, batch, index + 1, batches.length, context) }));
  }
  return prompts;
}

function promptText(report, group, batch, part, parts, context) {
  const g = group.guide, authority = group.items[0].finding.authority;
  const project = context.projectName ? `โครงการ: ${literal(context.projectName)}` : 'โครงการ: root เดียวกับที่ scan';
  const baseline = context.reportDirectory ? `"${literal(path.join(context.reportDirectory, 'report.json'))}"` : 'report.json ของรายงานนี้';
  return [
    `ใช้สกิล ${g.skill} แก้ ${literal(g.tag)} — ${literal(g.title)} ตาม Golden ของ agrimap-agent-skills`,
    project,
    `ที่มา: agm-lint report ${short(report.reportId)} · ${batch.count} จุดใน ${batch.files.length} ไฟล์${parts > 1 ? ` (ชุด ${part}/${parts} ของ ${group.items.length} จุด)` : ''}`,
    `Golden: ${literal(authority.entry)} · ${literal(authority.goldenRuleId)} · ${literal(authority.tier)}`,
    '',
    'ตำแหน่งที่ต้องตรวจและแก้ (บรรทัดจากรายงาน เปิดไฟล์จริงก่อนแก้):',
    ...batch.files.map(([file, findings]) => `- ${literal(file)}: ${lines(findings)}`),
    '',
    `รูปแบบที่ควรเป็น: ${literal(g.expected)}`,
    'วิธีแก้:',
    ...g.approach.map(step => `- ${literal(step)}`),
    '',
    'ข้อกำหนด:',
    '- อ่าน Golden entry ข้างบนก่อน แล้วแก้เฉพาะตำแหน่งที่ระบุและสิ่งที่จำเป็นให้ build ผ่าน ไม่ refactor ส่วนอื่น',
    '- จุดที่กระทบ public API, JSON/wire name, route, template binding หรือ database contract หรือเข้าข่ายข้อยกเว้นของ Golden ให้ข้ามและรายงานพร้อมเหตุผล',
    `- ตรวจหลังแก้: ${g.verify.map(literal).join('; ') || 'build/test ตาม lane'}`,
    '- สรุปไฟล์ที่แก้ จุดที่ข้ามพร้อมเหตุผล และผลตรวจ ยังไม่ commit/push',
    `- เมื่อแก้เสร็จ ให้รัน agm-lint report ใหม่โดยใช้ --baseline ${baseline} เพื่อยืนยันว่าจุดที่แก้หายไปและไม่มี finding ใหม่`
  ].join('\n');
}

function summaryLines(report, m) {
  return [
    `Scan: **${text(report.scanStatus)}** — ${m.counts.violation} violations / ${m.counts['review-candidate']} review candidates / ${m.counts['accepted-exception']} accepted exceptions`,
    `พบ **${report.findings.length} จุดใน ${m.byFile.size} ไฟล์** · เลือกตรวจ ${report.coverage.selected} จาก ${report.coverage.discovered} inventory records (excluded ${report.coverage.excluded}) · กฎ blocked ${report.rules.filter(r => r.executionStatus === 'blocked').length} · error ${report.rules.filter(r => r.executionStatus === 'error').length} · comparison ${text(report.comparison.comparisonStatus)}`,
    `ชนิดหลักฐาน: ${[...new Set(report.findings.map(f => f.observationKind || 'not-recorded'))].sort().map(kind => `${text(kind)} ${report.findings.filter(f => (f.observationKind || 'not-recorded') === kind).length}`).join(', ') || 'ยังไม่มี'}`
  ];
}
function ruleRows(m) {
  return m.groups.map((g, i) => [String(i + 1), text(g.guide.tag), text(g.guide.title), String(g.items.length), String(g.files), text(remediation.riskShort[g.guide.risk] || g.guide.risk), g.guide.skill ? code(g.guide.skill) : '—']);
}

export function renderMarkdown(report, context = {}) {
  validateReport(report);
  const m = model(report), prompts = fixPrompts(report, context);
  const snapshot = report.snapshot, provenance = report.provenance;
  const header = table(['รายการ', 'ค่า'], [
    ...(context.projectName ? [['โครงการ', code(context.projectName)]] : []),
    ['สถานะ scan', `**${text(report.scanStatus)}**`],
    ['Branch / HEAD', `${text(snapshot.branch)} / ${snapshot.headCommit || snapshot.commit ? code((snapshot.headCommit || snapshot.commit).slice(0, 12)) : '—'}`],
    ['Scanner / Golden', `${text(report.analysisContract.scannerVersion)} / ${text(provenance.packageName)} ${text(provenance.activeVersion)}`],
    ['Report ID', code(report.reportId)]
  ]);
  const actionPlan = [
    m.problems.length ? `1. **แก้ prerequisite ก่อน:** กฎ ${m.problems.map(r => code(r.detectorId)).join(', ')} รันไม่ครบ ดูภาคผนวก “สถานะกฎและ diagnostics” แล้ว scan ใหม่ ผลของกฎเหล่านี้ยังสรุปไม่ได้` : '1. ทุกกฎที่เกี่ยวข้องรันครบ (ไม่มี blocked/error) อ่าน diagnostics ในภาคผนวกประกอบ',
    prompts.length ? `2. เริ่มจาก prompt ความเสี่ยงต่ำตามลำดับในหัวข้อ “Prompt สำหรับแก้ไข” (${prompts[0].id} · ${text(prompts[0].group.guide.tag)}) ทำทีละ prompt แล้ว build/test ก่อนไป prompt ถัดไป` : '2. ไม่มี finding ที่ต้องแก้โค้ด ตรวจ coverage และกฎที่ยัง not-implemented ก่อนสรุป',
    '3. กลุ่มความเสี่ยงสูง (rename/ย้าย type) ต้องตรวจ consumers, JSON/route และ public contract ก่อน; จุดที่เป็น legacy contract ให้บันทึกเป็น exception ใน review.json แทนการแก้',
    '4. หลังแก้แต่ละรอบ ให้รัน `report` ใหม่พร้อม `--baseline` ชี้ report.json ของรอบก่อน เพื่อดูว่าจุดใดหาย จุดใดเกิดใหม่',
    '',
    'คำที่ใช้: violation = พบ syntax ที่ขัดกฎในขอบเขตที่พิสูจน์ได้ · review-candidate = จุดที่ต้องยืนยันก่อนแก้ · blocked = ตรวจไม่ได้เพราะ prerequisite ขาด · ความเสี่ยงในการแก้ = ความเสี่ยงทั่วไปของการแก้กฎนั้น ไม่ใช่ verdict ของแต่ละจุด'
  ].join('\n');
  const sections = {
    header,
    summary: [...summaryLines(report, m), m.groups.length ? table(['ลำดับ', 'กฎ', 'สิ่งที่ตรวจ', 'จุด', 'ไฟล์', 'ความเสี่ยงในการแก้', 'สกิลที่ใช้แก้'], ruleRows(m), [null, null, null, 'right', 'right']) : 'ไม่มี finding จากการตรวจครั้งนี้ ตรวจกฎที่ blocked/error และ coverage ก่อนสรุปผล'].join('\n\n'),
    actionPlan,
    fixPrompts: prompts.length ? [
      'คัดลอก prompt ไปวางในช่องสนทนาของ Agent ที่ติดตั้ง agrimap-agent-skills (เช่น Codex `$agm-be`, Claude Code `/agrimap-agent-skills:agm-be`, Cursor `/agm-be`) ทำทีละ prompt Prompt เป็นข้อเสนอ ไม่อนุมัติ commit, merge หรือ deploy',
      table(['Prompt', 'กฎ', 'จุด', 'ไฟล์', 'ความเสี่ยง', 'สกิล'], prompts.map(p => [p.id, text(p.group.guide.tag), String(p.batch.count), String(p.batch.files.length), text(remediation.riskShort[p.group.guide.risk]), code(p.group.guide.skill)]), [null, null, 'right', 'right']),
      ...prompts.map(p => `### ${p.id} · ${text(p.group.guide.tag)} — ${text(p.group.guide.title)}\n\n\`\`\`text\n${p.prompt}\n\`\`\``)
    ].join('\n\n') : 'ไม่มี prompt สำหรับแก้ไข เพราะไม่มี automated finding ที่แก้ได้ หรือมีเพียง boundary review',
    fileIndex: m.byFile.size ? table(['ไฟล์', 'จุด', 'ตำแหน่ง (บรรทัด กฎ)', 'Findings'], [...m.byFile].map(([file, items]) => [code(file), String(items.length), text(positions(items, true)), `${items[0].label}${items.length > 1 ? '–' + items.at(-1).label : ''}`]), [null, 'right']) : 'ยังไม่มี finding ให้ทำดัชนี ตรวจ blocked/error และ coverage ก่อนสรุปผล',
    details: m.indexed.length ? [...m.byFile].map(([file, items]) => [`### ${code(file)}`, '', ...items.map(({ finding: f, label, guide: g }) =>
      `- [ ] ${label} · L${f.line}:${f.column} · ${text(g.tag)} · ${text(f.disposition)} — ${text(f.observation)} · ${code(f.findingId)}`)].join('\n')).join('\n\n') : 'ไม่มี finding ที่สร้างได้จากการตรวจครั้งนี้ ดู diagnostics/ข้อจำกัดประกอบ',
    ruleGuide: m.groups.length ? m.groups.map(g => {
      const f = g.items[0].finding;
      return [`### ${text(g.guide.tag)} · ${text(g.detectorId)}`, '', table(['รายการ', 'รายละเอียด'], [
        ['Golden ID / tier / status', `${text(f.authority.goldenRuleId)} / ${text(f.authority.tier)} / ${text(f.authority.sourceStatus)}`],
        ['Exact Golden entry / digest', `${text(f.authority.entry)} / ${code(f.authority.entryDigest)}`],
        ['รูปแบบที่ควรเป็น', text(g.guide.expected)],
        ['วิธีแก้ที่แนะนำ', g.guide.approach.map(text).join('<br>') || '—'],
        ['ตรวจหลังแก้', g.guide.verify.map(text).join('<br>') || '—'],
        ['ความเสี่ยงในการแก้ / สกิล', `${text(remediation.riskLabels[g.guide.risk] || g.guide.risk)} / ${g.guide.skill ? code(g.guide.skill) : '—'}`],
        ['Evidence / confidence', `${text(f.actualEvidenceLevel)} (ต้องการ ${text(f.minimumEvidenceLevel)}) / ${text(f.confidence.level)} — ${text(f.confidence.rationale)}`],
        ['หลักฐานที่ต้องมีก่อนสรุป', f.remediation.verificationObligations.map(text).join('<br>') || '—'],
        ['Impact / manageability', `${text(f.remediation.impact)} / ${text(f.remediation.manageability)}`]
      ])].join('\n');
    }).join('\n\n') : 'ไม่มีกฎที่พบ finding',
    provenance: table(['รายการ', 'ค่า'], [
      ['Scanner', text(report.analysisContract.scannerVersion)],
      ['Target mode', text(snapshot.mode)],
      ['Target branch', text(snapshot.branch)],
      ['Target HEAD / immutable commit', text(snapshot.headCommit || snapshot.commit)],
      ['Git dirty / input drift', `${text(snapshot.gitDirty)} / ${text(snapshot.inputDrift)}`],
      ['Snapshot content identity', text(snapshot.contentIdentity)],
      ['C# project context', snapshot.csharpProjects?.length ? snapshot.csharpProjects.map(p => `${code(p.path)} implicit usings ${p.implicitUsings ? 'on' : 'off'}`).join('<br>') : '—'],
      ['Golden source mode', text(provenance.mode)],
      ['Golden package / version', `${text(provenance.packageName)} / ${text(provenance.activeVersion)}`],
      ['Golden identity source / verified', `${text(provenance.identitySource)} / ${text(provenance.identityVerified)}`],
      ['Golden active commit', text(provenance.activeCommit)],
      ['Golden selected content identity', text(provenance.selectedContentIdentity)],
      ['Baseline report ID', text(report.comparison.baselineReportId)]
    ]) + '\n\nWorking-tree HEAD ใช้อ้างอิง Git เท่านั้น ไม่ได้แปลว่า file bytes มาจาก committed snapshot ใช้ content identity และ input drift ร่วมกัน',
    rules: table(['Detector / Golden ID', 'Capability', 'Execution', 'Evaluated / applicable / failed', 'Diagnostics'], report.rules.map(r => {
      const codes = new Map();
      for (const d of r.diagnostics) { const key = d.split(':')[0]; codes.set(key, (codes.get(key) || 0) + 1); }
      return [`${text(r.detectorId)} / ${text(r.authority.goldenRuleId)}`, text(r.implementationStatus), text(r.executionStatus), `${r.evaluated} / ${r.denominator} / ${r.failed}`, [...codes].map(([c, n]) => `${code(c)} ×${n}`).join('<br>') || '—'];
    })) + (report.rules.some(r => r.diagnostics.length) ? '\n\nDiagnostics ทั้งหมดรายกฎ:\n\n' + report.rules.filter(r => r.diagnostics.length).map(r => `- ${code(r.detectorId)}: ${r.diagnostics.map(code).join(', ')}`).join('\n') : ''),
    sourceDiagnostics: report.sourceDiagnostics.length ? report.sourceDiagnostics.map(d => `- ${code(d)}`).join('\n') : 'ไม่พบ source diagnostic ในรายงานนี้',
    catalog: table(['Family', 'Lane', 'Capability', 'Selected lane files', 'ข้อจำกัด'], report.catalog.map(f => [text(f.familyId), text(f.lane), text(f.implementationStatus), f.selectedLaneFiles, text(f.note)])),
    limitations: report.limitations.map(item => `- ${text(item)}`).join('\n')
  };
  const template = readFileSync(path.join(skillRoot, 'assets/report-template.md'), 'utf8');
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(sections, key)) throw new Error('REPORT_TEMPLATE_FIELD_UNKNOWN');
    return sections[key];
  });
}

// Bounded chat summary: totals are complete, file rows are capped and say so explicitly.
export function renderSummary(report, context = {}) {
  validateReport(report);
  const m = model(report), prompts = fixPrompts(report, context), limit = 10;
  const files = [...m.byFile].sort(([a, x], [b, y]) => y.length - x.length || cmp(a, b));
  const out = [`## ผลตรวจ AgriMap Golden${context.projectName ? ' — ' + text(context.projectName) : ''}`, '', `สถานะ **${text(report.scanStatus)}** · ${summaryLines(report, m)[1]}`, ''];
  if (m.problems.length) out.push(`> **ตรวจไม่ครบ:** ${m.problems.map(r => `${code(r.detectorId)} ${text(r.executionStatus)}`).join(', ')} — ผลของกฎเหล่านี้ยังสรุปไม่ได้ ดู diagnostics ใน report.md`, '');
  if (m.groups.length) {
    out.push(table(['กฎ', 'สิ่งที่ตรวจ', 'จุด', 'ไฟล์', 'ความเสี่ยงแก้'], m.groups.map(g => [text(g.guide.tag), text(g.guide.title), String(g.items.length), String(g.files), text(remediation.riskShort[g.guide.risk])]), [null, null, 'right', 'right']), '');
    out.push(`**ไฟล์ที่พบมากที่สุด** (${Math.min(limit, files.length)} จาก ${files.length} ไฟล์ — รายการครบอยู่ใน report.md)`, '');
    out.push(table(['ไฟล์', 'จุด', 'ตำแหน่ง (บรรทัด กฎ)'], files.slice(0, limit).map(([file, items]) => [code(file), String(items.length), text(positions(items, true))]), [null, 'right']), '');
  } else out.push('ไม่มี finding — ยังสรุปว่าผ่าน Golden ทั้งหมดไม่ได้ ตรวจ coverage และกฎที่ not-implemented ใน report.md', '');
  if (prompts.length) out.push(context.reportDirectory
    ? `**Prompt สำหรับแก้ไข:** ${prompts.length} prompt ในหัวข้อ “Prompt สำหรับแก้ไข” ของ report.md — แนะนำเริ่มที่ ${prompts[0].id} (${text(prompts[0].group.guide.tag)}, ความเสี่ยง${text(remediation.riskShort[prompts[0].group.guide.risk])}) แล้วทำทีละ prompt`
    : `**Prompt สำหรับแก้ไข:** มี ${prompts.length} prompt เมื่อสร้างชุดรายงานด้วย operation report (สรุปนี้ไม่ได้เขียนไฟล์)`, '');
  if (context.reportDirectory) out.push(`**รายงานเต็ม:** ${code(path.join(context.reportDirectory, 'report.md'))}`, '');
  out.push('Findings ทั้งหมดเป็นจุดให้ทบทวนตามหลักฐาน ไม่ใช่ bug ที่ยืนยันแล้ว และรายงานนี้ไม่อนุมัติการแก้โค้ด');
  return out.join('\n') + '\n';
}
