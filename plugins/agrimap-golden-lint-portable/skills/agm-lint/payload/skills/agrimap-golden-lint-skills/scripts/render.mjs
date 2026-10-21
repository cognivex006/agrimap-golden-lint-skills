// Presentation only: renders an already validated canonical report. Kept out of the
// analysis contract so wording/layout changes never make baselines incomparable.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { json, packageRoot, validateReport, slash } from './contracts.mjs';

const skillRoot = path.join(packageRoot, 'skills/agrimap-golden-lint-skills');
export const remediation = json(path.join(skillRoot, 'assets/remediation.json'));
const dispositions = ['violation', 'review-candidate', 'accepted-exception'];
export const reviewStatuses = ['todo', 'confirmed', 'exception', 'needs-evidence', 'fixed-pending-rescan'];
// Recorded decisions that take a finding out of fix prompts.
const decided = new Set(['exception', 'needs-evidence', 'fixed-pending-rescan']);
const statusLabels = { todo: 'ยังไม่ทบทวน', confirmed: 'ยืนยันว่าต้องแก้', exception: 'ไม่แก้', 'needs-evidence': 'หลักฐานไม่พอ — ห้ามแก้ ต้อง investigate', 'fixed-pending-rescan': 'แก้แล้ว รอ scan ยืนยัน' };
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
  return remediation.detectors[detectorId] || { tag: detectorId, title: detectorId, risk: 'review', skill: null, impact: 'cross-service', expected: 'เปิด exact Golden entry และตรวจ active contract ก่อนสรุป', approach: [], verify: [], evidence: [], investigate: [] };
}
// One branch per rule, always cut from the configured base (develop) with the configured type (hotfix).
export function branchName(detectorId) {
  const d = remediation.delivery;
  return `${d.branchType}/${d.branchPrefix}${guide(detectorId).tag.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}
const riskRank = risk => remediation.riskOrder.indexOf(risk);
const riskShort = risk => remediation.riskShort[risk] || risk;
const impactShort = impact => remediation.impactShort[impact] || impact;
const short = id => id.slice(0, 12);
const lines = items => [...new Set(items.map(i => i.line))].sort((a, b) => a - b).join(', ');
const count = (items, key) => [...items.reduce((m, i) => m.set(key(i), (m.get(key(i)) || 0) + 1), new Map())];

// Stable labels (F001...) follow canonical finding order, so report.md, review.md and summaries agree.
export function model(report, review = null) {
  const reviews = new Map((review?.reviews || []).map(r => [r.findingId, r]));
  const indexed = report.findings.map((finding, index) => ({ finding, label: `F${String(index + 1).padStart(3, '0')}`, guide: guide(finding.detectorId), review: reviews.get(finding.findingId) || null,
    status: reviews.get(finding.findingId)?.status || 'todo' }));
  const byFile = new Map(), byRule = new Map();
  for (const item of indexed) {
    if (!byFile.has(item.finding.path)) byFile.set(item.finding.path, []);
    byFile.get(item.finding.path).push(item);
    if (!byRule.has(item.finding.detectorId)) byRule.set(item.finding.detectorId, []);
    byRule.get(item.finding.detectorId).push(item);
  }
  const groups = [...byRule].map(([detectorId, items]) => ({ detectorId, items, guide: guide(detectorId), files: new Set(items.map(i => i.finding.path)).size, rule: report.rules.find(r => r.detectorId === detectorId),
    observations: count(items, i => i.finding.observation), open: items.filter(i => !decided.has(i.status)) }))
    .sort((a, b) => riskRank(a.guide.risk) - riskRank(b.guide.risk) || a.files - b.files || a.items.length - b.items.length || cmp(a.detectorId, b.detectorId));
  const counts = Object.fromEntries(dispositions.map(k => [k, report.findings.filter(f => f.disposition === k).length]));
  const statuses = Object.fromEntries(reviewStatuses.map(s => [s, indexed.filter(i => i.status === s).length]));
  const problems = report.rules.filter(r => ['blocked', 'error'].includes(r.executionStatus));
  return { indexed, byFile: new Map([...byFile].sort(([a], [b]) => cmp(a, b))), groups, counts, statuses, problems };
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

// Keep whole files together so one prompt never edits half of a file's findings. Findings already
// decided in review.json (not fixing, evidence missing, fixed) never reappear in a fix prompt.
export function fixPrompts(report, context = {}) {
  const { groups } = model(report, context.review);
  const prompts = [];
  let number = 0;
  for (const group of groups) {
    if (!group.guide.skill || group.guide.risk === 'review' || group.rule?.implementationStatus === 'review-only' || !group.open.length) continue;
    number++;
    const files = new Map();
    for (const item of group.open) {
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
    batches.forEach((batch, index) => prompts.push({ id: batches.length > 1 ? `P${number}.${index + 1}` : `P${number}`, group, batch, part: index + 1, parts: batches.length, branch: branchName(group.detectorId), prompt: promptText(report, group, batch, index + 1, batches.length, context) }));
  }
  return prompts;
}

// The agent runs from the project root, so root-relative bundle paths keep every prompt short.
function bundlePath(context, file) {
  if (context.reportDirectory && context.projectRoot) return slash(path.relative(context.projectRoot, path.join(context.reportDirectory, file)));
  if (context.reportDirectory) return path.join(context.reportDirectory, file);
  return `<ชุดรายงาน>/${file}`;
}

function promptText(report, group, batch, part, parts, context) {
  const g = group.guide, authority = group.items[0].finding.authority, d = remediation.delivery, branch = branchName(group.detectorId);
  const cross = g.impact === 'cross-service';
  const bundle = context.reportDirectory || '<ชุดรายงาน>';
  return [
    `ใช้สกิล ${g.skill} แก้ ${literal(g.tag)} — ${literal(g.title)} ตาม Golden ของ agrimap-agent-skills`,
    context.projectName ? `โครงการ: ${literal(context.projectName)}` : 'โครงการ: root เดียวกับที่ scan',
    `Governance: ${report.governance?.status || 'not-assessed'}; ตรวจ terms/license/policy และ decision ledger ก่อนเปลี่ยน dependency/third party/SaaS หยุด affected action เมื่อ blocked; Owner decline ไม่อนุญาตละเมิดเงื่อนไข`,
    `ที่มา: agm-lint report ${short(report.reportId)} · ${batch.count} จุดใน ${batch.files.length} ไฟล์${parts > 1 ? ` (ชุด ${part}/${parts} ของกฎนี้)` : ''}`,
    `Golden: ${literal(authority.entry)} · ${literal(authority.goldenRuleId)} · ${literal(authority.tier)}`,
    `Branch: ${branch} (แตกจาก ${d.baseBranch} ล่าสุด${parts > 1 ? ' ทุกชุดของกฎนี้ใช้ branch เดียวกัน' : ''})`,
    '',
    'ตำแหน่งที่ต้องตรวจ (บรรทัดจากรายงาน เปิดไฟล์จริงก่อน):',
    ...batch.files.map(([file, findings]) => `- ${literal(file)}: ${lines(findings)}`),
    '',
    'ขั้นที่ 1 — เตรียม branch',
    `- working tree ต้องสะอาด ถ้ามีงานค้างให้หยุดและถามผู้ใช้`,
    `- git fetch แล้วสร้าง ${branch} จาก origin/${d.baseBranch} ถ้ามี branch นี้อยู่แล้วให้ checkout ใช้ต่อ ห้ามแก้บน ${d.baseBranch} หรือ main โดยตรง ถ้าโครงการไม่มี ${d.baseBranch} ให้หยุดและถาม`,
    `- ใช้ได้เฉพาะ ${d.allowedBranchTypes.map(t => t + '/*').join(' หรือ ')}; งานนี้เป็น ${d.branchType}`,
    '',
    'ขั้นที่ 2 — วิเคราะห์ก่อนแก้ (ยังไม่แก้ไฟล์)',
    cross
      ? '- กฎนี้อาจกระทบนอก service: AgriMap มีหลาย services (agmws-*/agmbo-*), agmwa-* apps และ shared libraries ที่อาจอ้างชื่อเดียวกัน ค้นชื่อที่จะเปลี่ยน (type/member/route/JSON/procedure) ในทุก repository ของ workspace ที่มีในเครื่อง รวม generated-apis ของ frontend และระบุ repository ที่ค้นไม่ได้ว่า "ยังไม่ได้ตรวจ"'
      : '- กฎนี้ปกติกระทบเฉพาะภายใน service: ตรวจ callers ในโครงการนี้ ค้นนอก service เฉพาะเมื่อจุดนั้นเป็น public API, shared contract หรือถูกใช้โดย service/app อื่น',
    cross
      ? '- ระบุลำดับงาน (sequence) ที่ต้องเกิดก่อน/หลัง เช่น แก้ shared library ก่อน service, แก้ BE ก่อน regenerate generated-apis ของ FE, แก้ SQL ก่อน BE หรือต้องแยกเป็นงานของ repository อื่น'
      : '- ถ้าพบว่าจุดใดถูกใช้นอก service ให้ย้ายไปกลุ่ม B และระบุ repository และลำดับงานที่เกี่ยวข้อง',
    `- หลักฐานที่ต้องมีก่อนแก้แต่ละจุด: ${g.evidence.map(literal).join('; ') || 'ยืนยัน consumers และ contract ที่เกี่ยวข้อง'}`,
    '- จัดทุกตำแหน่งเป็น 3 กลุ่ม แล้วแสดงตาราง ไฟล์:บรรทัด | กลุ่ม | หลักฐานหรือเหตุผล | ผลกระทบนอก service',
    '  A แก้ได้ — มีหลักฐานครบตามข้างบน',
    '  B ไม่แก้ — กระทบ public/JSON/route/template/database contract หรือเข้าข้อยกเว้นของ Golden',
    `  C หลักฐานไม่พอ — ห้ามแก้ ให้เขียนวิธี investigate ต่อที่ชัดเจน เช่น ${g.investigate.map(literal).join('; ') || 'ค้น consumers และขอ owner ยืนยัน'}`,
    cross
      ? '- หยุดหลังวิเคราะห์ ส่งตารางและลำดับงานให้ผู้ใช้ยืนยันก่อนแก้ทุกครั้ง'
      : '- ถ้าไม่พบผลกระทบนอก service ให้แก้กลุ่ม A ต่อได้ ถ้าพบ ให้หยุดและส่งตารางให้ผู้ใช้ยืนยันก่อน',
    '',
    'ขั้นที่ 3 — แก้เฉพาะกลุ่ม A',
    `- รูปแบบที่ควรเป็น: ${literal(g.expected)}`,
    ...g.approach.map(step => `- ${literal(step)}`),
    '- แก้เฉพาะตำแหน่งที่ระบุและสิ่งที่จำเป็นให้ build ผ่าน ไม่ refactor ส่วนอื่น',
    `- ตรวจหลังแก้: ${g.verify.map(literal).join('; ') || 'build/test ตาม lane'}`,
    '',
    'ขั้นที่ 4 — บันทึกผลกลับเข้ารายงาน (ต้องทำทุกครั้ง ห้ามปล่อยรายการค้าง)',
    `- แก้ ${bundlePath(context, 'review.json')} ให้ครบทุกตำแหน่งของชุดนี้ โดยใส่ reviewer, reason และ evidence ทุกรายการ:`,
    '  A ที่แก้แล้ว → fixed-pending-rescan พร้อม proposedChange และ verification',
    '  B หรือผู้ใช้ยืนยันว่าไม่แก้ → exception พร้อมเหตุผลว่าไม่แก้เพราะอะไรและใครยืนยัน',
    '  C → needs-evidence พร้อมวิธี investigate ที่จะใช้',
    `- ใช้สกิล agm-lint operation review-update: --report ${bundlePath(context, 'envelope.json')} --report-id ${report.reportId} --review ${bundlePath(context, 'review.json')} --authorize-output "${literal(bundle)}" เพื่อให้ report.md และ review.md แสดงสถานะล่าสุด`,
    '- สรุปกลุ่ม A/B/C จุดที่แก้ และผลตรวจ ยังไม่ commit/push',
    `- รอบถัดไปให้รัน agm-lint report ใหม่บน ${branch} โดยใช้ --baseline "${bundlePath(context, 'report.json')}" เพื่อยืนยันว่าจุดที่แก้หายไปและไม่มี finding ใหม่`
  ].join('\n');
}

const kinds = report => [...new Set(report.findings.map(f => f.observationKind || 'not-recorded'))].sort()
  .map(kind => `${text(kind)} ${report.findings.filter(f => (f.observationKind || 'not-recorded') === kind).length}`).join(', ') || 'ยังไม่มี';
const totals = (report, m) => `พบ **${report.findings.length} จุดใน ${m.byFile.size} ไฟล์** (${m.counts.violation} violations / ${m.counts['review-candidate']} review candidates / ${m.counts['accepted-exception']} accepted exceptions) · เลือกตรวจ ${report.coverage.selected} จาก ${report.coverage.discovered} inventory records (excluded ${report.coverage.excluded})`;
const progress = m => `สถานะทบทวน: ${reviewStatuses.map(s => `${s} ${m.statuses[s]}`).join(' · ')}`;
const promptIds = (prompts, detectorId) => {
  const ids = prompts.filter(p => p.group.detectorId === detectorId).map(p => p.id);
  return ids.length > 1 ? `${ids[0]}–${ids.at(-1)}` : ids[0] || '—';
};
const decisionRows = items => items.filter(i => i.status !== 'todo').map(i => [i.label, code(`${i.finding.path}:${i.finding.line}`), text(i.guide.tag), text(statusLabels[i.status]), text(i.review.reason || '—'), text(i.review.reviewer || '—')]);

function governanceSection(report) {
  const g = report.governance;
  if (!g) return 'Third-party governance: **not-assessed** (legacy report)';
  const lines = [`Third-party governance: **${text(g.status)}** · วันที่ประเมิน ${text(g.asOf)}`, '',
    'หลักฐานของผู้ทบทวน แยกจาก Golden verdict; ไม่ดึง terms สด ไม่รับรอง inventory ครบอัตโนมัติ การยืนยันไม่แก้ไม่ใช่สิทธิ์ละเมิดเงื่อนไข หยุดการใช้งาน/เผยแพร่ส่วนที่ถูก block และให้ Owner ตัดสินก่อนดำเนินการที่เกี่ยวข้อง', '',
    ...g.diagnostics.map(d => `- ${text(d)}`)];
  if (g.ledger) lines.push(`Inventory: ${g.ledger.inventory.complete ? 'ผู้ทบทวนยืนยันครบ' : 'ยังไม่ครบ'} · ${text(g.ledger.inventory.reviewer)} · ${text(g.ledger.inventory.evidence)}`, '',
    table(['Third party / version / usage', 'Outcome / severity / freshness', 'Gate / Owner decision', 'เหตุผล / เสนอแก้ / ตรวจผล', 'เงื่อนไขและหลักฐาน'], g.items.map(i => {
      const a = g.ledger.assessments.find(a => a.assessmentId === i.assessmentId);
      const d = g.ledger.decisions.find(d => d.decisionId === i.decisionId);
      return [text(`${a.subject} / ${a.version} / ${a.usage}`), text(`${a.outcome} / ${a.severity} / ${i.freshness}`), text(`${i.status} / ${d ? d.action + ': ' + d.owner + ' / ' + d.reason + ' / ' + d.evidence : 'ยังไม่มี Owner decision'}`), text(`${a.rationale} / ${a.remediation} / ${a.verification}`), a.sources.map(s => text(`${s.kind}: ${s.url} / ${s.clause} / SHA256 ${s.contentDigest}`)).join('<br>') || 'ยังไม่มีหลักฐาน'];
    })), '', `Ledger SHA-256: ${code(g.inputDigest)} · ประวัติ assessments ${g.ledger.assessments.length} / decisions ${g.ledger.decisions.length} รายการอยู่ใน report.json`, '',
    'ย้อนกลับมาแก้: append assessment ที่มี previous อ้าง assessmentId เดิม หรือ append decision action=reopen/fix ที่มี previous อ้าง decisionId เดิม แล้ว governance-update และ report ใหม่ ห้ามลบ/เขียนทับประวัติ');
  return lines.join('\n');
}

export function renderMarkdown(report, context = {}) {
  validateReport(report);
  const m = model(report, context.review), prompts = fixPrompts(report, context), d = remediation.delivery;
  const snapshot = report.snapshot, provenance = report.provenance;
  const blocked = report.rules.filter(r => r.executionStatus === 'blocked').length, errors = report.rules.filter(r => r.executionStatus === 'error').length;
  const header = table(['รายการ', 'ค่า'], [
    ...(context.projectName ? [['โครงการ', code(context.projectName)]] : []),
    ['สถานะ scan', `**${text(report.scanStatus)}** · กฎ blocked ${blocked} · error ${errors}`],
    ['Branch / HEAD', `${text(snapshot.branch)} / ${snapshot.headCommit || snapshot.commit ? code((snapshot.headCommit || snapshot.commit).slice(0, 12)) : '—'}`],
    ['Scanner / Golden', `${text(report.analysisContract.scannerVersion)} / ${text(provenance.packageName)} ${text(provenance.activeVersion)}`],
    ['เทียบ baseline', report.comparison.comparisonStatus === 'not-requested' ? 'ไม่ได้ขอ' : `${text(report.comparison.comparisonStatus)} · ${code(short(report.comparison.baselineReportId || '—'))}`],
    ['ผลทบทวน', context.review ? `อัปเดตจาก review.json · ${m.indexed.length - m.statuses.todo} จาก ${m.indexed.length} รายการมีข้อสรุปแล้ว` : 'ยังไม่มี'],
    ['Report ID', code(report.reportId)]
  ]);
  const obligations = report.findings[0]?.remediation.verificationObligations || [];
  const decisions = decisionRows(m.indexed);
  const overview = [
    totals(report, m),
    `ชนิดหลักฐาน: ${kinds(report)}`,
    progress(m),
    ...(m.problems.length ? [`> **ตรวจไม่ครบ:** ${m.problems.map(r => `${code(r.detectorId)} ${text(r.executionStatus)}`).join(', ')} — แก้ prerequisite ตาม diagnostics ในภาคผนวกแล้ว scan ใหม่ก่อนสรุปผลของกฎเหล่านี้`] : []),
    m.groups.length ? table(['ลำดับ', 'กฎ', 'สิ่งที่ตรวจ', 'จุด', 'ไฟล์', 'ความเสี่ยง', 'ผลกระทบ', 'Branch', 'Prompt'],
      m.groups.map((g, i) => [String(i + 1), text(g.guide.tag), text(g.guide.title), g.open.length === g.items.length ? String(g.items.length) : `${g.open.length} / ${g.items.length}`, String(g.files), text(riskShort(g.guide.risk)), text(impactShort(g.guide.impact)),
        g.guide.skill && g.guide.risk !== 'review' ? code(branchName(g.detectorId)) : '—', promptIds(prompts, g.detectorId)]), [null, null, null, 'right', 'right'])
      : 'ไม่มี finding จากการตรวจครั้งนี้ ตรวจกฎที่ blocked/error และ coverage ในภาคผนวกก่อนสรุปผล',
    m.groups.some(g => g.open.length !== g.items.length) ? 'คอลัมน์ "จุด" แบบ x / y คือจุดที่ยังต้องดำเนินการ / ทั้งหมด จุดที่มีข้อสรุปแล้วไม่อยู่ใน prompt' : '',
    [
      '**วิธีใช้รายงานนี้**',
      '',
      `1. ${m.problems.length ? 'แก้ prerequisite ของกฎที่ตรวจไม่ครบก่อน แล้วจึง' : ''}ทำตามลำดับในตาราง: เปิดการ์ดของกฎในหัวข้อ “แก้ทีละกฎ” แล้วคัดลอก prompt ทีละชุดไปให้สกิลที่ระบุ`,
      `2. ทุก prompt แก้บน branch ${d.branchType}/* ที่แตกจาก ${d.baseBranch} ล่าสุด (หนึ่ง branch ต่อกฎ) และต้องวิเคราะห์ผลกระทบก่อนแก้ กฎที่อาจข้าม service ต้องให้ผู้ใช้ยืนยันผลวิเคราะห์ก่อน`,
      '3. จุดที่หลักฐานไม่พอห้ามแก้ ให้บันทึก needs-evidence พร้อมวิธี investigate จุดที่ตัดสินใจไม่แก้ให้บันทึก exception พร้อมเหตุผล',
      '4. ทุกข้อสรุปต้องบันทึกใน review.json แล้วรัน review-update ให้รายงานนี้แสดงสถานะล่าสุด ไม่ปล่อยรายการค้างที่ todo',
      '5. หลังแก้แต่ละรอบ ให้รัน report ใหม่พร้อม `--baseline` ชี้ report.json ของรอบนี้ เพื่อดูว่าจุดใดหาย จุดใดเกิดใหม่'
    ].join('\n'),
    obligations.length ? `**ก่อนยืนยัน finding ใดว่าต้องแก้** ต้องมีหลักฐาน: ${obligations.map(text).join(' · ')} ทุก finding เริ่มที่ impact และ manageability = unknown` : '',
    decisions.length ? ['**ข้อสรุปที่บันทึกแล้ว**', '', table(['Finding', 'ตำแหน่ง', 'กฎ', 'ข้อสรุป', 'เหตุผล', 'ผู้ทบทวน'], decisions)].join('\n') : '',
    'คำที่ใช้: violation = syntax ขัดกฎในขอบเขตที่พิสูจน์ได้ · review-candidate = จุดที่ต้องยืนยันก่อนแก้ · blocked = ตรวจไม่ได้เพราะ prerequisite ขาด · ความเสี่ยง = ความเสี่ยงทั่วไปของการแก้กฎนั้น ไม่ใช่ verdict ของแต่ละจุด'
  ].filter(Boolean).join('\n\n');
  // One card per rule, in the same order as the overview table, holding everything needed to fix it.
  const ruleCards = m.groups.length ? m.groups.map((g, i) => {
    const f = g.items[0].finding, own = prompts.filter(p => p.group.detectorId === g.detectorId);
    const found = g.observations.length === 1 ? `สิ่งที่ตรวจพบ: ${text(g.observations[0][0])}`
      : ['สิ่งที่ตรวจพบ:', ...g.observations.map(([obs, n]) => `- ${text(obs)} (${n})`)].join('\n');
    const closed = g.items.filter(x => x.status !== 'todo' && x.status !== 'confirmed');
    const body = own.length
      ? own.map(p => `#### ${p.id} · ${p.batch.count} จุดใน ${p.batch.files.length} ไฟล์\n\n\`\`\`text\n${p.prompt}\n\`\`\``).join('\n\n')
      : g.guide.risk === 'review' || !g.guide.skill
        ? [`ไม่มี prompt เพราะเป็น boundary review ที่เจ้าของ contract ต้องตัดสิน รูปแบบที่ต้องเทียบ: ${text(g.guide.expected)}`, ...g.guide.approach.map(step => `- ${text(step)}`), '', `ไฟล์: ${[...new Set(g.items.map(x => x.finding.path))].map(code).join(', ')}`].join('\n')
        : 'ทุกจุดของกฎนี้มีข้อสรุปแล้ว จึงไม่มี prompt ค้าง';
    return [
      `### ${i + 1} · ${text(g.guide.tag)} — ${text(g.guide.title)}`, '',
      `**${g.items.length} จุด · ${g.files} ไฟล์ · ความเสี่ยง${text(riskShort(g.guide.risk))} · ${text(impactShort(g.guide.impact))} · ${g.guide.skill ? 'สกิล ' + code(g.guide.skill) : 'ไม่มีสกิลแก้'}**`, '',
      `Golden ${text(f.authority.goldenRuleId)} (${text(f.authority.tier)}) ใน ${code(f.authority.entry)} · evidence ${text(f.actualEvidenceLevel)} · confidence ${text(f.confidence.level)}${g.guide.skill && g.guide.risk !== 'review' ? ` · branch ${code(branchName(g.detectorId))} จาก ${text(d.baseBranch)}` : ''}`, '',
      found, '',
      `หลักฐานที่ต้องมีก่อนแก้: ${g.guide.evidence.map(text).join(' · ') || '—'}`, '',
      ...(closed.length ? [`ข้อสรุปแล้ว ${closed.length} จุด: ${count(closed, x => statusLabels[x.status]).map(([s, n]) => `${text(s)} ${n}`).join(' · ')} — ดูเหตุผลในตาราง “ข้อสรุปที่บันทึกแล้ว”`, ''] : []),
      body
    ].join('\n');
  }).join('\n\n') : 'ไม่มีกฎที่พบ finding';
  const variedKinds = new Set(m.groups.filter(g => g.observations.length > 1).map(g => g.detectorId));
  const mark = item => item.status === 'exception' || item.status === 'fixed-pending-rescan' ? 'x' : ' ';
  const sections = {
    header,
    governance: governanceSection(report),
    overview,
    ruleCards,
    fileIndex: m.byFile.size ? table(['ไฟล์', 'จุด', 'ตำแหน่ง (บรรทัด กฎ)', 'Findings'], [...m.byFile].map(([file, items]) => [code(file), String(items.length), text(positions(items, true)), `${items[0].label}${items.length > 1 ? '–' + items.at(-1).label : ''}`]), [null, 'right']) : 'ยังไม่มี finding ให้ทำดัชนี ตรวจ blocked/error และ coverage ก่อนสรุปผล',
    checklist: m.indexed.length ? [...m.byFile].map(([file, items]) => [`### ${code(file)}`, '', ...items.map(item => {
      const { finding: f, label, guide: g } = item;
      return `- [${mark(item)}] ${label} · L${f.line}:${f.column} · ${text(g.tag)}${variedKinds.has(f.detectorId) ? ' · ' + text(f.observationKind || 'not-recorded') : ''}${f.disposition === 'review-candidate' ? '' : ' · ' + text(f.disposition)}${item.status === 'todo' ? '' : ' · **' + text(statusLabels[item.status]) + '**'} · ${code(f.findingId)}`;
    })].join('\n')).join('\n\n') : 'ไม่มี finding ที่สร้างได้จากการตรวจครั้งนี้ ดู diagnostics/ข้อจำกัดประกอบ',
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
  const m = model(report, context.review), prompts = fixPrompts(report, context), limit = 10;
  const files = [...m.byFile].sort(([a, x], [b, y]) => y.length - x.length || cmp(a, b));
  const blocked = report.rules.filter(r => r.executionStatus === 'blocked').length, errors = report.rules.filter(r => r.executionStatus === 'error').length;
  const out = [`## ผลตรวจ AgriMap Golden${context.projectName ? ' — ' + text(context.projectName) : ''}`, '',
    `สถานะ **${text(report.scanStatus)}** · พบ **${report.findings.length} จุดใน ${m.byFile.size} ไฟล์** · เลือกตรวจ ${report.coverage.selected} จาก ${report.coverage.discovered} inventory records (excluded ${report.coverage.excluded}) · กฎ blocked ${blocked} · error ${errors} · comparison ${text(report.comparison.comparisonStatus)}`, ''];
  out.push(governanceSection(report), '');
  if (context.review) out.push(progress(m), '');
  if (m.problems.length) out.push(`> **ตรวจไม่ครบ:** ${m.problems.map(r => `${code(r.detectorId)} ${text(r.executionStatus)}`).join(', ')} — ผลของกฎเหล่านี้ยังสรุปไม่ได้ ดู diagnostics ใน report.md`, '');
  if (m.groups.length) {
    out.push(table(['กฎ', 'สิ่งที่ตรวจ', 'จุด', 'ไฟล์', 'ความเสี่ยงแก้', 'ผลกระทบ'], m.groups.map(g => [text(g.guide.tag), text(g.guide.title), String(g.items.length), String(g.files), text(riskShort(g.guide.risk)), text(impactShort(g.guide.impact))]), [null, null, 'right', 'right']), '');
    out.push(`**ไฟล์ที่พบมากที่สุด** (${Math.min(limit, files.length)} จาก ${files.length} ไฟล์ — รายการครบอยู่ใน report.md)`, '');
    out.push(table(['ไฟล์', 'จุด', 'ตำแหน่ง (บรรทัด กฎ)'], files.slice(0, limit).map(([file, items]) => [code(file), String(items.length), text(positions(items, true))]), [null, 'right']), '');
  } else out.push('ไม่มี finding — ยังสรุปว่าผ่าน Golden ทั้งหมดไม่ได้ ตรวจ coverage และกฎที่ not-implemented ใน report.md', '');
  if (prompts.length) out.push(context.reportDirectory
    ? `**Prompt สำหรับแก้ไข:** ${prompts.length} prompt ในหัวข้อ “แก้ทีละกฎ” ของ report.md แต่ละกฎแก้บน branch ${remediation.delivery.branchType}/* ของตัวเองที่แตกจาก ${remediation.delivery.baseBranch} — แนะนำเริ่มที่ ${prompts[0].id} (${text(prompts[0].group.guide.tag)}, ${code(prompts[0].branch)}) แล้วทำทีละ prompt`
    : `**Prompt สำหรับแก้ไข:** มี ${prompts.length} prompt เมื่อสร้างชุดรายงานด้วย operation report (สรุปนี้ไม่ได้เขียนไฟล์)`, '');
  if (context.reportDirectory) out.push(`**รายงานเต็ม:** ${code(path.join(context.reportDirectory, 'report.md'))}`, '');
  out.push('Findings ทั้งหมดเป็นจุดให้ทบทวนตามหลักฐาน ไม่ใช่ bug ที่ยืนยันแล้ว และรายงานนี้ไม่อนุมัติการแก้โค้ด');
  return out.join('\n') + '\n';
}
