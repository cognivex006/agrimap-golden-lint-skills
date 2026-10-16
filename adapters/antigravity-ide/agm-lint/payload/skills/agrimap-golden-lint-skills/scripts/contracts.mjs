import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSchema } from './schema.mjs';

export const packageRoot = fileURLToPath(new URL('../../../', import.meta.url));
export const json = file => JSON.parse(readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
export const hash = value => createHash('sha256').update(value).digest('hex');
export function canonical(value) {
  const sort = item => Array.isArray(item) ? item.map(sort) : item && typeof item === 'object'
    ? Object.fromEntries(Object.keys(item).sort().map(key => [key, sort(item[key])])) : item;
  return JSON.stringify(sort(value), null, 2) + '\n';
}
export const digest = value => hash(canonical(value));
export const slash = value => value.replaceAll('\\', '/');
export function within(root, candidate) {
  const rel = path.relative(root, candidate);
  return rel === '' || (!rel.startsWith('..' + path.sep) && rel !== '..' && !path.isAbsolute(rel));
}
export function safeRead(root, relative) {
  const file = path.resolve(root, relative);
  if (!within(root, file) || !within(root, realpathSync(file)) || !lstatSync(file).isFile()) throw new Error('UNSAFE_INPUT');
  return readFileSync(file);
}
export const registry = json(path.join(packageRoot, 'config/operations.json'));
export const bindings = json(path.join(packageRoot, 'skills/agrimap-golden-lint-skills/assets/rules.json'));
export const catalog = json(path.join(packageRoot, 'skills/agrimap-golden-lint-skills/assets/catalog.json'));
export const lock = json(path.join(packageRoot, 'skills/agrimap-golden-lint-skills/assets/source-lock.json'));
export const parserLock = json(path.join(packageRoot, 'skills/agrimap-golden-lint-skills/assets/parser-lock.json'));

export function parseArgs(args) {
  const operation = args.shift();
  const contract = registry.operations[operation];
  if (!contract) throw new Error('INVALID_OPERATION');
  const result = { operation };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].replace(/^--/, '');
    if (!args[i].startsWith('--') || ![...contract.required, ...contract.optional].includes(key) || key in result || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('INVALID_OPTION');
    result[key] = args[i + 1];
  }
  if (contract.required.some(key => !(key in result))) throw new Error('MISSING_OPTION');
  return result;
}

export function classify(relative) {
  const p = slash(relative);
  if (/(^|\/)(infra\/database|\.git|node_modules|bin|obj|dist|\.agrimap-agent)(\/|$)/i.test(p)) return { selected: false, reason: 'excluded-directory' };
  if (/(^|\/)(docs|schema|legacy|migrations?|playground|tests?|fixtures)(\/|$)/i.test(p) || /\.(spec|test)\./.test(p)) return { selected: false, reason: 'reference-or-test' };
  if (/(^|\/)(generated-apis|generated)(\/|$)/i.test(p) || /\.g\.(cs|ts)$/.test(p)) return { selected: false, reason: 'generated' };
  let lane = null, profile = null;
  if (/^services\/agmws-[^/]+\/sql\/[^/]+\/procedure\/[^/]+\.sql$/i.test(p)) lane = 'sql-procedure';
  else if (/^services\/agmws-[^/]+\/sql\/[^/]+\/table\/[^/]+\.sql$/i.test(p)) lane = 'sql-table';
  else if (/^services\/agmws-[^/]+\/sql\/[^/]+\/messages\.sql$/i.test(p)) lane = 'sql-messages';
  else if (/^apps\/web\/agmwa-[^/]+\/src\/app\/.+\.ts$/.test(p)) lane = 'fe-main';
  else if (/^standards\/libraries\/angular\/agrimap-platform\/projects\/[^/]+\/src\/.+\.ts$/.test(p)) lane = 'fe-library';
  else if (/^services\/agmws-[^/]+\/Src\/.+\.cs$/i.test(p)) { lane = 'be-main'; profile = 'agmws'; }
  else if (/^jobs\/agmbo-[^/]+\/Src\/.+\.cs$/i.test(p)) { lane = 'be-main'; profile = 'agmbo'; }
  else if (/^standards\/libraries\/netcore\/AgriMap.Platform\/AgriMap.Platform\/Src\/.+\.cs$/i.test(p)) lane = 'be-library';
  return lane ? { selected: true, lane, profile } : { selected: false, reason: 'outside-declared-product-layout' };
}

export function validateReport(report) {
  const fail = () => { throw new Error('INVALID_REPORT'); };
  try { validateSchema(report, json(path.join(packageRoot, 'schemas/report.schema.json')), path.join(packageRoot, 'schemas')); } catch { fail(); }
  if (report.schemaVersion !== 1 || !['completed', 'partial', 'failed'].includes(report.scanStatus) || !Array.isArray(report.files) || !Array.isArray(report.findings) || !Array.isArray(report.rules) || !report.coverage || !report.analysisContract) fail();
  const { reportId, ...payload } = report;
  if (reportId !== digest(payload)) fail();
  if (report.coverage.discovered !== report.files.length || report.coverage.selected + report.coverage.excluded !== report.files.length) fail();
  const ids = new Set();
  for (const finding of report.findings) {
    if (ids.has(finding.findingId) || !report.files.some(f => f.path === finding.path && f.selected) || !['violation', 'review-candidate', 'accepted-exception'].includes(finding.disposition)) fail();
    ids.add(finding.findingId);
    if (!bindings.some(r => r.detectorId === finding.detectorId) || finding.findingId !== digest({ detectorId: finding.detectorId, revision: finding.detectorRevision, path: finding.path, anchor: finding.symbolAnchor, evidenceFingerprint: finding.evidenceFingerprint, occurrence: finding.occurrence })) fail();
    if (!['text', 'syntax', 'semantic', 'contract-review'].includes(finding.actualEvidenceLevel) || !['introduced', 'pre-existing', 'unknown'].includes(finding.changeOrigin) || !['new', 'modified', 'unchanged', 'unknown'].includes(finding.codeScope)) fail();
    if (!['no-effect-proven', 'internal-effect', 'external-effect', 'unknown'].includes(finding.remediation.impact) || !['manageable', 'unmanageable-with-current-evidence', 'unknown'].includes(finding.remediation.manageability)) fail();
    if (finding.remediation.impact === 'no-effect-proven' && !finding.remediation.equivalenceEvidence?.length) fail();
  }
  const all = canonical(report);
  if (/(?:Bearer\s+[A-Za-z0-9._-]{12,}|AKIA[A-Z0-9]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:password|secret|token)\s*[=:]\s*["']?[A-Za-z0-9+/_-]{8,})/i.test(all)) fail();
  for (const rule of report.rules) {
    if (!['evaluated', 'not-applicable', 'skipped', 'blocked', 'error'].includes(rule.executionStatus)) fail();
    if (!['automated', 'review-only', 'not-implemented'].includes(rule.implementationStatus) || rule.evaluated > rule.denominator) fail();
    if (rule.evaluated + rule.failed > rule.denominator || (rule.denominator === 0 && rule.executionStatus !== 'not-applicable')) fail();
  }
  if (new Set(report.files.map(f => f.path)).size !== report.files.length || new Set(report.rules.map(r => r.detectorId)).size !== report.rules.length) fail();
  if (report.coverage.selected !== report.files.filter(f => f.selected).length || report.coverage.excluded !== report.files.filter(f => !f.selected).length) fail();
  if (Object.values(report.coverage.selectedByLane).reduce((a, b) => a + b, 0) !== report.coverage.selected) fail();
  if (report.scanStatus === 'completed' && report.rules.some(r => ['blocked', 'error'].includes(r.executionStatus))) fail();
  return report;
}

function markdownText(value) {
  return String(value ?? '—').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/[\\`*_[\]{}()|#!]/g, '\\$&').replace(/[\r\n]+/g, ' ');
}

const reportExpectations = {
  'fe-file-naming': 'App: kebab-case + role suffix เช่น user-list.component.ts / UserListComponent; selector agrimap-user-list',
  'fe-library-file-naming': 'Library: user-list.ts / UserList ไม่มี .component/Component; selector agrimap-user-list และรักษา legacy public exports',
  'fe-symbol-naming': 'Types: UserConfig (ไม่ใช่ IUserConfig); const กลาง: menuApp; output: closed; handler: onClosed; Observable: users$; Subject: searchSubject',
  'be-member-naming': 'Method/property/event/enum member ใช้ PascalCase เช่น SearchUser / DisplayName; override และ explicit implementation คง contract เดิม',
  'be-async-naming': 'Method ที่คืน Task ใช้ SearchUserAsync; แก้ interface/implementation/callers พร้อมกันเมื่ออนุมัติ scope แล้ว',
  'be-library-member-naming': 'Shared library ใช้ PascalCase members; ตรวจ published consumers และ public compatibility ก่อน rename',
  'be-library-async-naming': 'Task-returning method ใช้ Async suffix; public legacy name ต้องประเมิน consumers ก่อนเปลี่ยน',
  'be-library-type-naming': 'Types ใช้ PascalCase และ interface I ตามด้วย PascalCase; รักษา published API',
  'be-library-dependency-naming': 'Private readonly dependency ที่รับจาก constructor ใช้ _camelCase เช่น _userRepository',
  'sql-procedure-naming': 'sql/DOMAIN/procedure/USER_Q.sql ตรง [agrimap_app].[USER_Q]; suffix _I/_U/_D/_Q/_CHECK_Q หรือมี owner exception',
  'sql-table-naming': 'sql/DOMAIN/table/USER.sql ตรง [agrimap_app].[USER]; columns UPPER_SNAKE_CASE, constraint PK_/UQ_/DF_/CK_/FK_, indexes IX_/UX_',
  'be-public-type-count': 'หนึ่ง explicit public type ต่อไฟล์ รวม nested declarations ที่พบ; ตรวจ published/nested contract ก่อน split',
  'be-type-naming': 'Type ใช้ PascalCase shape และ interface ใช้ I ตามด้วยตัวพิมพ์ใหญ่; ไม่เปลี่ยน public names โดยไม่มี consumer evidence',
  'be-dependency-naming': 'Private readonly field ที่รับค่าจาก constructor parameter ใช้ _camelCase; ไม่เหมารวม readonly state ทุก field เป็น dependency',
  'be-role-naming': 'ชื่อ public top-level type ให้ตรง RequestDto/ResponseDto/UseCase/Repository ตามโฟลเดอร์และความรับผิดชอบจริง',
  'be-repository-placement': 'Repository interface อยู่ Infrastructure/Persistence/Interfaces และ implementation อยู่ Infrastructure/Persistence/Repositories; ไม่ย้าย legacy API อัตโนมัติ',
  'be-null-forgiving': 'NULL-02: แก้ null contract แทนการใช้ ! กด warning; การเปลี่ยน fallback อาจเปลี่ยน behavior',
  'be-null-comparison': 'NULL-03: ใช้ is null / is not null; ตรวจ operator overload และ behavior ก่อนแก้ equality',
  'be-empty-catch': 'ERR-04: ห้าม empty catch; ออกแบบ error path หรือ compatibility catch ที่มี logging ตาม contract',
  'be-async-blocking': 'ASYNC-03: ไม่ block Task/ValueTask หรือ await Task.FromResult โดยไม่จำเป็น; ตรวจ async/public contract ทั้งเส้นทาง',
  'fe-explicit-any': 'T6: ใช้ type ที่ระบุชัด หรือ unknown แล้ว narrow แทน explicit any',
  'fe-non-null': 'T6: หลีกเลี่ยง assertion; ViewChild static:true ต้อง resolve Angular identity และขอบเขตข้อยกเว้นก่อน',
  'fe-store-await': 'R3: Store เป็น pure synchronous state/selectors/mutators; พิสูจน์ ownership และ call identity ก่อนตัดสิน',
  'fe-component-dependency': 'R1: Component ใช้ Facade; การ inject Store/generated API ตรงต้องพิสูจน์ symbol และ applicability รวม trivial-view exception',
  'be-namespace-observation': 'ใช้ fixed namespace allowlist และ file-scoped declaration ตาม csharp.md; subfolder ไม่ขยาย namespace โดยอัตโนมัติ',
  'sql-procedure-declaration': 'Procedure outputs ที่สร้างหรือแก้ใช้ CREATE OR ALTER PROCEDURE; ต้องยืนยัน deployment/history scope ก่อน',
  'fe-library-public-surface': 'รักษา direct/wildcard/aliased public exports และ approved islands; ตรวจ actual consumers และ version',
  'be-library-contract': 'รักษา published API/active source และ compatibility; ตรวจ consumers และขอบเขตที่ owner อนุมัติ',
  'sql-table-contract': 'ตรวจ normalized DDL, owner schema และ deployment contract โดยไม่ infer การเปลี่ยน data semantics',
  'sql-message-contract': 'ตรวจ messages.sql registry, idempotent guards และ code meanings ด้วย owner/registry evidence'
};

export function renderMarkdown(report) {
  validateReport(report);
  const text = markdownText;
  const code = value => '`' + String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/`/g, '&#96;').replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ') + '`';
  const findings = report.findings;
  const counts = Object.fromEntries(['violation', 'review-candidate', 'accepted-exception'].map(k => [k, findings.filter(f => f.disposition === k).length]));
  const indexed = findings.map((finding, index) => ({ finding, label: `F${String(index + 1).padStart(3, '0')}` }));
  const byFile = new Map();
  for (const item of indexed) {
    if (!byFile.has(item.finding.path)) byFile.set(item.finding.path, []);
    byFile.get(item.finding.path).push(item);
  }
  const snapshot = report.snapshot, provenance = report.provenance;
  const table = (headers, rows) => [
    `| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${row.join(' | ')} |`)
  ].join('\n');
  const sections = {
    reportId: report.reportId,
    actionPlan: [
      '1. ตรวจ blocked/error ก่อน: ถ้ามีกฎที่รันไม่ได้ ให้แก้แหล่ง Golden/parser ที่ระบุ แล้วตรวจใหม่ อย่าสรุปจากจำนวน findings เพียงอย่างเดียว',
      '2. เปิดไฟล์ตามบรรทัดในดัชนี อ่าน “สิ่งที่ตรวจพบ” และตัวอย่างรูปแบบที่ควรเป็น เปรียบเทียบ exact Golden entry ของ lane นั้น',
      '3. ยืนยันว่าเป็นโค้ดใหม่/ส่วนที่แก้ หรือ legacy ที่ต้องรักษา พร้อมตรวจ exports, callers, template bindings และชื่อที่ระบบภายนอกใช้',
      '4. เลือกข้อสรุปต่อ finding: ต้องแก้ / ข้อยกเว้น / ยังขาดหลักฐาน บันทึกเหตุผล ผู้ทบทวน หลักฐาน และแผนตรวจหลังแก้',
      '5. แก้ product เฉพาะเมื่อมีสิทธิ์ในงานนั้น แล้ว scan ใหม่ เก็บ report ID ใหม่คู่กับผลเดิม ห้ามแก้ canonical JSON เพื่อให้ดูเหมือนผ่าน'
    ].join('\n'),
    summary: [
      `Scan: **${text(report.scanStatus)}** — ${counts.violation} violations / ${counts['review-candidate']} review candidates / ${counts['accepted-exception']} accepted exceptions`,
      `เลือก ${report.coverage.selected} จาก ${report.coverage.discovered} inventory records; excluded ${report.coverage.excluded}; ไฟล์ที่มี finding ${byFile.size}; findings ทั้งหมด ${findings.length}`,
      `กฎ blocked ${report.rules.filter(r => r.executionStatus === 'blocked').length}; error ${report.rules.filter(r => r.executionStatus === 'error').length}; comparison ${text(report.comparison.comparisonStatus)}`,
      `ชนิดหลักฐาน: ${[...new Set(findings.map(f => f.observationKind || 'not-recorded'))].sort().map(kind => `${text(kind)} ${findings.filter(f => (f.observationKind || 'not-recorded') === kind).length}`).join(', ') || 'ยังไม่มี'}`,
      'Excluded subtrees นับเป็น boundary records ไม่ใช่จำนวนไฟล์ภายใน ไฟล์ที่ไม่มี finding อาจอยู่ภายใต้ coverage ที่ยังไม่ทำหรือกฎที่ถูกบล็อก'
    ].join('\n\n'),
    provenance: table(['รายการ', 'ค่า'], [
      ['Scanner', text(report.analysisContract.scannerVersion)],
      ['Target mode', text(snapshot.mode)],
      ['Target branch', text(snapshot.branch)],
      ['Target HEAD / immutable commit', text(snapshot.headCommit || snapshot.commit)],
      ['Git dirty / input drift', `${text(snapshot.gitDirty)} / ${text(snapshot.inputDrift)}`],
      ['Snapshot content identity', text(snapshot.contentIdentity)],
      ['Golden source mode', text(provenance.mode)],
      ['Golden package / version', `${text(provenance.packageName)} / ${text(provenance.activeVersion)}`],
      ['Golden identity source / verified', `${text(provenance.identitySource)} / ${text(provenance.identityVerified)}`],
      ['Golden active commit', text(provenance.activeCommit)],
      ['Golden selected content identity', text(provenance.selectedContentIdentity)],
      ['Baseline report ID', text(report.comparison.baselineReportId)]
    ]) + '\n\nWorking-tree HEAD ใช้อ้างอิง Git เท่านั้น ไม่ได้แปลว่า file bytes มาจาก committed snapshot ใช้ content identity และ input drift ร่วมกัน',
    rules: table(['Detector / Golden ID', 'Capability', 'Execution', 'Evaluated / applicable / failed', 'Diagnostics'], report.rules.map(r => [
      `${text(r.detectorId)} / ${text(r.authority.goldenRuleId)}`, text(r.implementationStatus), text(r.executionStatus),
      `${r.evaluated} / ${r.denominator} / ${r.failed}`, r.diagnostics.map(code).join('<br>') || '—'
    ])),
    sourceDiagnostics: report.sourceDiagnostics.length ? report.sourceDiagnostics.map(d => `- ${code(d)}`).join('\n') : 'ไม่พบ source diagnostic ในรายงานนี้',
    fileIndex: byFile.size ? table(['ไฟล์', 'Violations', 'Review candidates', 'Accepted exceptions', 'รายการทั้งหมด'], [...byFile].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([file, items]) => [
      text(file), ...['violation', 'review-candidate', 'accepted-exception'].map(k => items.filter(i => i.finding.disposition === k).length),
      items.map(({ label, finding }) => `[${label}](#${label.toLowerCase()}) ${finding.line}:${finding.column}`).join(', ')
    ])) : 'ยังไม่มี finding ให้ทำดัชนี ตรวจ blocked/error และ coverage ก่อนสรุปผล',
    details: indexed.length ? indexed.map(({ finding: f, label }) => [
      `### ${label}`, '',
      table(['รายการ', 'รายละเอียด'], [
        ['ไฟล์:บรรทัด:คอลัมน์', `${text(f.path)}:${f.line}:${f.column}`],
        ['Finding ID', text(f.findingId)],
        ['ผล / applicability', `${text(f.disposition)} / ${text(f.applicability)}`],
        ['ชนิดหลักฐาน', text(f.observationKind || 'not-recorded')],
        ['Detector / evidence', `${text(f.detectorId)} / ${text(f.actualEvidenceLevel)} (ต้องการ ${text(f.minimumEvidenceLevel)})`],
        ['Golden ID / tier / status', `${text(f.authority.goldenRuleId)} / ${text(f.authority.tier)} / ${text(f.authority.sourceStatus)}`],
        ['Exact Golden entry / digest', `${text(f.authority.entry)} / ${text(f.authority.entryDigest)}`],
        ['สิ่งที่ตรวจพบ', text(f.observation)],
        ['รูปแบบหรือ contract ที่ต้องเทียบ', text(reportExpectations[f.detectorId] || 'เปิด exact Golden entry และตรวจ active contract ก่อนสรุป')],
        ['Symbol resolution', text(f.symbolResolution?.status || 'not-requested')],
        ['Confidence / เหตุผล', `${text(f.confidence.level)} / ${text(f.confidence.rationale)}`],
        ['Origin / code scope', `${text(f.changeOrigin)} / ${text(f.codeScope)}`],
        ['Impact / manageability', `${text(f.remediation.impact)} / ${text(f.remediation.manageability)}`],
        ['ข้อเสนอ', text(f.remediation.proposal)],
        ['แนะนำให้ทำต่อ', text(f.targetKind.startsWith('fe') ? 'ตรวจ imports/exports และ template bindings; เลือกชื่อที่ตรง lane; หลังแก้ให้ type-check/build และทดสอบหน้าที่ใช้จริง' : f.targetKind.startsWith('be') ? 'ตรวจ interface/implementation/callers และ wire names; ประเมิน compatibility; หลังแก้ให้ compile และทดสอบพฤติกรรมที่เกี่ยวข้อง' : 'เทียบชื่อ object/ไฟล์กับ deployed schema และ callers; ตรวจ scripts แบบ static; การ rename/ย้าย schema ต้องมีงาน migration ที่อนุมัติแยก')],
        ['บันทึกผลทบทวน', 'สถานะ: ยังไม่ทบทวน · ผู้รับผิดชอบ: — · หลักฐาน: — · ชื่อ/รูปแบบที่เสนอ: — · ผลตรวจหลังแก้: — (บันทึกใน review.json หรือสมุด review.md)'],
        ['หลักฐานที่ยังขาด', f.remediation.verificationObligations.map(text).join('<br>') || '—'],
        ['คำถามที่ยังไม่ทราบ', f.remediation.unresolvedQuestions.map(text).join('<br>') || '—'],
        ['Owner / exception evidence', `${f.authority.ownerEvidence.length} / ${f.authority.exceptionEvidence.length}`]
      ])
    ].join('\n')).join('\n\n') : 'ไม่มี finding ที่สร้างได้จากการตรวจครั้งนี้ ดู diagnostics/ข้อจำกัดประกอบ',
    catalog: table(['Family', 'Lane', 'Capability', 'Selected lane files', 'ข้อจำกัด'], report.catalog.map(f => [text(f.familyId), text(f.lane), text(f.implementationStatus), f.selectedLaneFiles, text(f.note)])),
    checklist: indexed.length ? indexed.map(({ finding: f, label }) => `- [ ] [${label}](#${label.toLowerCase()}) ${text(f.path)}:${f.line}:${f.column} — ทบทวน scope/exception/consumers และบันทึกข้อสรุปโดยอ้าง Finding ID`).join('\n') : 'ยังไม่มีรายการ finding ให้ติดตาม ให้แก้ prerequisite ที่ถูกบล็อกหรือยืนยัน coverage ก่อน',
    limitations: report.limitations.map(item => `- ${text(item)}`).join('\n')
  };
  const template = readFileSync(path.join(packageRoot, 'skills/agrimap-golden-lint-skills/assets/report-template.md'), 'utf8');
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(sections, key)) throw new Error('REPORT_TEMPLATE_FIELD_UNKNOWN');
    return sections[key];
  });
}
