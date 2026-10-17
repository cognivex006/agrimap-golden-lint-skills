// Presentation only: renders an already validated canonical report. Kept out of the
// analysis contract so wording/layout changes never make baselines incomparable.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { json, packageRoot, validateReport, slash } from './contracts.mjs';

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
const riskShort = risk => remediation.riskShort[risk] || risk;
const short = id => id.slice(0, 12);
const lines = items => [...new Set(items.map(i => i.line))].sort((a, b) => a - b).join(', ');
const count = (items, key) => [...items.reduce((m, i) => m.set(key(i), (m.get(key(i)) || 0) + 1), new Map())];

// Stable labels (F001...) follow canonical finding order, so report.md, review.md and summaries agree.
export function model(report) {
  const indexed = report.findings.map((finding, index) => ({ finding, label: `F${String(index + 1).padStart(3, '0')}`, guide: guide(finding.detectorId) }));
  const byFile = new Map(), byRule = new Map();
  for (const item of indexed) {
    if (!byFile.has(item.finding.path)) byFile.set(item.finding.path, []);
    byFile.get(item.finding.path).push(item);
    if (!byRule.has(item.finding.detectorId)) byRule.set(item.finding.detectorId, []);
    byRule.get(item.finding.detectorId).push(item);
  }
  const groups = [...byRule].map(([detectorId, items]) => ({ detectorId, items, guide: guide(detectorId), files: new Set(items.map(i => i.finding.path)).size, rule: report.rules.find(r => r.detectorId === detectorId),
    observations: count(items, i => i.finding.observation) }))
    .sort((a, b) => riskRank(a.guide.risk) - riskRank(b.guide.risk) || a.files - b.files || a.items.length - b.items.length || cmp(a.detectorId, b.detectorId));
  const counts = Object.fromEntries(dispositions.map(k => [k, report.findings.filter(f => f.disposition === k).length]));
  const problems = report.rules.filter(r => ['blocked', 'error'].includes(r.executionStatus));
  return { indexed, byFile: new Map([...byFile].sort(([a], [b]) => cmp(a, b))), groups, counts, problems };
}

// Compact form keeps index rows readable; the checklist always lists every finding.
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

// The agent runs from the project root, so a root-relative baseline keeps every prompt short.
function baselineOf(context) {
  if (context.reportDirectory && context.projectRoot) return `"${slash(path.relative(context.projectRoot, path.join(context.reportDirectory, 'report.json')))}"`;
  if (context.reportDirectory) return `"${path.join(context.reportDirectory, 'report.json')}"`;
  return 'report.json ของรายงานนี้';
}

function promptText(report, group, batch, part, parts, context) {
  const g = group.guide, authority = group.items[0].finding.authority;
  return [
    `ใช้สกิล ${g.skill} แก้ ${literal(g.tag)} — ${literal(g.title)} ตาม Golden ของ agrimap-agent-skills`,
    context.projectName ? `โครงการ: ${literal(context.projectName)}` : 'โครงการ: root เดียวกับที่ scan',
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
    `- เมื่อแก้เสร็จ ให้รัน agm-lint report ใหม่โดยใช้ --baseline ${baselineOf(context)} เพื่อยืนยันว่าจุดที่แก้หายไปและไม่มี finding ใหม่`
  ].join('\n');
}

const kinds = report => [...new Set(report.findings.map(f => f.observationKind || 'not-recorded'))].sort()
  .map(kind => `${text(kind)} ${report.findings.filter(f => (f.observationKind || 'not-recorded') === kind).length}`).join(', ') || 'ยังไม่มี';
const totals = (report, m) => `พบ **${report.findings.length} จุดใน ${m.byFile.size} ไฟล์** (${m.counts.violation} violations / ${m.counts['review-candidate']} review candidates / ${m.counts['accepted-exception']} accepted exceptions) · เลือกตรวจ ${report.coverage.selected} จาก ${report.coverage.discovered} inventory records (excluded ${report.coverage.excluded})`;
const promptIds = (prompts, detectorId) => {
  const ids = prompts.filter(p => p.group.detectorId === detectorId).map(p => p.id);
  return ids.length > 1 ? `${ids[0]}–${ids.at(-1)}` : ids[0] || '—';
};

export function renderMarkdown(report, context = {}) {
  validateReport(report);
  const m = model(report), prompts = fixPrompts(report, context);
  const snapshot = report.snapshot, provenance = report.provenance;
  const blocked = report.rules.filter(r => r.executionStatus === 'blocked').length, errors = report.rules.filter(r => r.executionStatus === 'error').length;
  const header = table(['รายการ', 'ค่า'], [
    ...(context.projectName ? [['โครงการ', code(context.projectName)]] : []),
    ['สถานะ scan', `**${text(report.scanStatus)}** · กฎ blocked ${blocked} · error ${errors}`],
    ['Branch / HEAD', `${text(snapshot.branch)} / ${snapshot.headCommit || snapshot.commit ? code((snapshot.headCommit || snapshot.commit).slice(0, 12)) : '—'}`],
    ['Scanner / Golden', `${text(report.analysisContract.scannerVersion)} / ${text(provenance.packageName)} ${text(provenance.activeVersion)}`],
    ['เทียบ baseline', report.comparison.comparisonStatus === 'not-requested' ? 'ไม่ได้ขอ' : `${text(report.comparison.comparisonStatus)} · ${code(short(report.comparison.baselineReportId || '—'))}`],
    ['Report ID', code(report.reportId)]
  ]);
  const obligations = report.findings[0]?.remediation.verificationObligations || [];
  const overview = [
    totals(report, m),
    `ชนิดหลักฐาน: ${kinds(report)}`,
    ...(m.problems.length ? [`> **ตรวจไม่ครบ:** ${m.problems.map(r => `${code(r.detectorId)} ${text(r.executionStatus)}`).join(', ')} — แก้ prerequisite ตาม diagnostics ในภาคผนวกแล้ว scan ใหม่ก่อนสรุปผลของกฎเหล่านี้`] : []),
    m.groups.length ? table(['ลำดับ', 'กฎ', 'สิ่งที่ตรวจ', 'จุด', 'ไฟล์', 'ความเสี่ยง', 'สกิล', 'Prompt'],
      m.groups.map((g, i) => [String(i + 1), text(g.guide.tag), text(g.guide.title), String(g.items.length), String(g.files), text(riskShort(g.guide.risk)), g.guide.skill ? code(g.guide.skill) : '—', promptIds(prompts, g.detectorId)]), [null, null, null, 'right', 'right'])
      : 'ไม่มี finding จากการตรวจครั้งนี้ ตรวจกฎที่ blocked/error และ coverage ในภาคผนวกก่อนสรุปผล',
    [
      '**วิธีใช้รายงานนี้**',
      '',
      `1. ${m.problems.length ? 'แก้ prerequisite ของกฎที่ตรวจไม่ครบก่อน แล้วจึง' : ''}ทำตามลำดับในตาราง: เปิดการ์ดของกฎในหัวข้อ “แก้ทีละกฎ” แล้วคัดลอก prompt ทีละชุดไปให้สกิลที่ระบุ`,
      '2. Build/test ให้ผ่านก่อนไป prompt ถัดไป กลุ่มความเสี่ยงสูง (rename/ย้าย type) ต้องตรวจ consumers, JSON/route และ public contract ก่อนเสมอ',
      '3. จุดที่เป็น legacy หรือ public contract ให้บันทึกเป็น exception ใน review.json แทนการแก้',
      '4. หลังแก้แต่ละรอบ ให้รัน report ใหม่พร้อม `--baseline` ชี้ report.json ของรอบนี้ เพื่อดูว่าจุดใดหาย จุดใดเกิดใหม่'
    ].join('\n'),
    obligations.length ? `**ก่อนยืนยัน finding ใดว่าต้องแก้** ต้องมีหลักฐาน: ${obligations.map(text).join(' · ')} ทุก finding เริ่มที่ impact และ manageability = unknown` : '',
    'คำที่ใช้: violation = syntax ขัดกฎในขอบเขตที่พิสูจน์ได้ · review-candidate = จุดที่ต้องยืนยันก่อนแก้ · blocked = ตรวจไม่ได้เพราะ prerequisite ขาด · ความเสี่ยง = ความเสี่ยงทั่วไปของการแก้กฎนั้น ไม่ใช่ verdict ของแต่ละจุด'
  ].filter(Boolean).join('\n\n');
  // One card per rule, in the same order as the overview table, holding everything needed to fix it.
  const ruleCards = m.groups.length ? m.groups.map((g, i) => {
    const f = g.items[0].finding, own = prompts.filter(p => p.group.detectorId === g.detectorId);
    const found = g.observations.length === 1 ? `สิ่งที่ตรวจพบ: ${text(g.observations[0][0])}`
      : ['สิ่งที่ตรวจพบ:', ...g.observations.map(([obs, n]) => `- ${text(obs)} (${n})`)].join('\n');
    const body = own.length
      ? own.map(p => `#### ${p.id} · ${p.batch.count} จุดใน ${p.batch.files.length} ไฟล์\n\n\`\`\`text\n${p.prompt}\n\`\`\``).join('\n\n')
      : [`ไม่มี prompt เพราะเป็น boundary review ที่เจ้าของ contract ต้องตัดสิน รูปแบบที่ต้องเทียบ: ${text(g.guide.expected)}`, ...g.guide.approach.map(step => `- ${text(step)}`), '', `ไฟล์: ${[...new Set(g.items.map(x => x.finding.path))].map(code).join(', ')}`].join('\n');
    return [
      `### ${i + 1} · ${text(g.guide.tag)} — ${text(g.guide.title)}`, '',
      `**${g.items.length} จุด · ${g.files} ไฟล์ · ความเสี่ยง${text(riskShort(g.guide.risk))} · ${g.guide.skill ? 'สกิล ' + code(g.guide.skill) : 'ไม่มีสกิลแก้'}**`, '',
      `Golden ${text(f.authority.goldenRuleId)} (${text(f.authority.tier)}) ใน ${code(f.authority.entry)} · evidence ${text(f.actualEvidenceLevel)} · confidence ${text(f.confidence.level)}`, '',
      found, '',
      body
    ].join('\n');
  }).join('\n\n') : 'ไม่มีกฎที่พบ finding';
  const variedKinds = new Set(m.groups.filter(g => g.observations.length > 1).map(g => g.detectorId));
  const sections = {
    header,
    overview,
    ruleCards,
    fileIndex: m.byFile.size ? table(['ไฟล์', 'จุด', 'ตำแหน่ง (บรรทัด กฎ)', 'Findings'], [...m.byFile].map(([file, items]) => [code(file), String(items.length), text(positions(items, true)), `${items[0].label}${items.length > 1 ? '–' + items.at(-1).label : ''}`]), [null, 'right']) : 'ยังไม่มี finding ให้ทำดัชนี ตรวจ blocked/error และ coverage ก่อนสรุปผล',
    checklist: m.indexed.length ? [...m.byFile].map(([file, items]) => [`### ${code(file)}`, '', ...items.map(({ finding: f, label, guide: g }) =>
      `- [ ] ${label} · L${f.line}:${f.column} · ${text(g.tag)}${variedKinds.has(f.detectorId) ? ' · ' + text(f.observationKind || 'not-recorded') : ''}${f.disposition === 'review-candidate' ? '' : ' · ' + text(f.disposition)} · ${code(f.findingId)}`)].join('\n')).join('\n\n') : 'ไม่มี finding ที่สร้างได้จากการตรวจครั้งนี้ ดู diagnostics/ข้อจำกัดประกอบ',
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
    rules: table(['Detector / Golden ID', 'Capability', 'Execution', 'Evaluated / applicable / failed', 'Golden entry / digest', 'Diagnostics'], report.rules.map(r => [
      `${text(r.detectorId)} / ${text(r.authority.goldenRuleId)}`, text(r.implementationStatus), text(r.executionStatus), `${r.evaluated} / ${r.denominator} / ${r.failed}`,
      `${text(r.authority.entry)}<br>${r.authority.entryDigest ? code(r.authority.entryDigest) : '—'}`,
      count(r.diagnostics, d => d.split(':')[0]).map(([c, n]) => `${code(c)} ×${n}`).join('<br>') || '—'
    ])) + (report.rules.some(r => r.diagnostics.length) ? '\n\nDiagnostics ทั้งหมดรายกฎ:\n\n' + report.rules.filter(r => r.diagnostics.length).map(r => `- ${code(r.detectorId)}: ${r.diagnostics.map(code).join(', ')}`).join('\n') : ''),
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
  const blocked = report.rules.filter(r => r.executionStatus === 'blocked').length, errors = report.rules.filter(r => r.executionStatus === 'error').length;
  const out = [`## ผลตรวจ AgriMap Golden${context.projectName ? ' — ' + text(context.projectName) : ''}`, '',
    `สถานะ **${text(report.scanStatus)}** · พบ **${report.findings.length} จุดใน ${m.byFile.size} ไฟล์** · เลือกตรวจ ${report.coverage.selected} จาก ${report.coverage.discovered} inventory records (excluded ${report.coverage.excluded}) · กฎ blocked ${blocked} · error ${errors} · comparison ${text(report.comparison.comparisonStatus)}`, ''];
  if (m.problems.length) out.push(`> **ตรวจไม่ครบ:** ${m.problems.map(r => `${code(r.detectorId)} ${text(r.executionStatus)}`).join(', ')} — ผลของกฎเหล่านี้ยังสรุปไม่ได้ ดู diagnostics ใน report.md`, '');
  if (m.groups.length) {
    out.push(table(['กฎ', 'สิ่งที่ตรวจ', 'จุด', 'ไฟล์', 'ความเสี่ยงแก้'], m.groups.map(g => [text(g.guide.tag), text(g.guide.title), String(g.items.length), String(g.files), text(riskShort(g.guide.risk))]), [null, null, 'right', 'right']), '');
    out.push(`**ไฟล์ที่พบมากที่สุด** (${Math.min(limit, files.length)} จาก ${files.length} ไฟล์ — รายการครบอยู่ใน report.md)`, '');
    out.push(table(['ไฟล์', 'จุด', 'ตำแหน่ง (บรรทัด กฎ)'], files.slice(0, limit).map(([file, items]) => [code(file), String(items.length), text(positions(items, true))]), [null, 'right']), '');
  } else out.push('ไม่มี finding — ยังสรุปว่าผ่าน Golden ทั้งหมดไม่ได้ ตรวจ coverage และกฎที่ not-implemented ใน report.md', '');
  if (prompts.length) out.push(context.reportDirectory
    ? `**Prompt สำหรับแก้ไข:** ${prompts.length} prompt ในหัวข้อ “แก้ทีละกฎ” ของ report.md — แนะนำเริ่มที่ ${prompts[0].id} (${text(prompts[0].group.guide.tag)}, ความเสี่ยง${text(riskShort(prompts[0].group.guide.risk))}) แล้วทำทีละ prompt`
    : `**Prompt สำหรับแก้ไข:** มี ${prompts.length} prompt เมื่อสร้างชุดรายงานด้วย operation report (สรุปนี้ไม่ได้เขียนไฟล์)`, '');
  if (context.reportDirectory) out.push(`**รายงานเต็ม:** ${code(path.join(context.reportDirectory, 'report.md'))}`, '');
  out.push('Findings ทั้งหมดเป็นจุดให้ทบทวนตามหลักฐาน ไม่ใช่ bug ที่ยืนยันแล้ว และรายงานนี้ไม่อนุมัติการแก้โค้ด');
  return out.join('\n') + '\n';
}
