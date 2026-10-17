// Explicit report operations only. This writer is never imported by the scanner.
import { existsSync, realpathSync, lstatSync, mkdirSync, writeFileSync, readFileSync, readdirSync, renameSync, statSync } from 'node:fs';
import path from 'node:path';
import { canonical, digest, validateReport, within, json, packageRoot } from './contracts.mjs';
import { renderMarkdown, renderSummary, model, text, code } from './render.mjs';
import { validateSchema } from './schema.mjs';

export function reviewTemplate(report) {
  return { schemaVersion: 1, reportId: report.reportId, canonical: false, reviews: report.findings.map(f => ({
    findingId: f.findingId, status: 'todo', reviewer: '', evidence: [], reason: '', proposedChange: '', verification: ''
  })) };
}

export function validateReview(report, input) {
  validateReport(report);
  const fail = () => { throw new Error('INVALID_REVIEW'); };
  try { validateSchema(input, json(path.join(packageRoot, 'schemas/review.schema.json')), path.join(packageRoot, 'schemas')); } catch { fail(); }
  if (!input || input.schemaVersion !== 1 || input.reportId !== report.reportId || input.canonical !== false || !Array.isArray(input.reviews) || input.reviews.length > report.findings.length) fail();
  if (Object.keys(input).some(k => !['schemaVersion', 'reportId', 'canonical', 'reviews'].includes(k))) fail();
  const ids = new Set();
  for (const r of input.reviews) {
    if (!r || !report.findings.some(f => f.findingId === r.findingId) || ids.has(r.findingId) || !['todo', 'confirmed', 'exception', 'needs-evidence', 'fixed-pending-rescan'].includes(r.status)) fail();
    ids.add(r.findingId);
    if (Object.keys(r).some(k => !['findingId', 'status', 'reviewer', 'evidence', 'reason', 'proposedChange', 'verification'].includes(k))) fail();
    if (!['reviewer', 'reason', 'proposedChange', 'verification'].every(k => typeof r[k] === 'string' && r[k].length <= 8000) || !Array.isArray(r.evidence) || !r.evidence.every(e => typeof e === 'string' && e.trim().length > 0 && e.length <= 2000)) fail();
    if (r.status !== 'todo' && (!r.reviewer.trim() || !r.reason.trim() || !r.evidence.length)) fail();
    if (r.status === 'fixed-pending-rescan' && (!r.proposedChange.trim() || !r.verification.trim())) fail();
  }
  if (/(?:Bearer\s+[A-Za-z0-9._-]{12,}|AKIA[A-Z0-9]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:password|secret|token)\s*[=:]\s*["']?[A-Za-z0-9+/_-]{8,})/i.test(canonical(input))) fail();
  return input;
}

// One compact row per finding; full text only for reviews that actually record something.
export function renderReview(report, input) {
  validateReview(report, input);
  const { indexed, byFile } = model(report);
  const reviews = new Map(input.reviews.map(r => [r.findingId, r]));
  const statuses = ['todo', 'confirmed', 'exception', 'needs-evidence', 'fixed-pending-rescan'];
  const status = id => reviews.get(id)?.status || 'todo';
  const recorded = indexed.filter(({ finding }) => status(finding.findingId) !== 'todo');
  const sections = [...byFile].map(([file, items]) => [`### ${code(file)}`, '',
    '| Finding | บรรทัด | กฎ | Finding ID | สถานะ |', '| --- | --- | --- | --- | --- |',
    ...items.map(({ finding: f, label, guide: g }) => `| ${label} | ${f.line}:${f.column} | ${text(g.tag)} | ${code(f.findingId.slice(0, 12))} | ${text(status(f.findingId))} |`)].join('\n'));
  const details = recorded.map(({ finding: f, label, guide: g }) => {
    const r = reviews.get(f.findingId);
    return [`### ${label} · ${code(`${f.path}:${f.line}:${f.column}`)} · ${text(g.tag)}`, '',
      `Finding ID: ${code(f.findingId)} · สถานะ: **${text(r.status)}** · ผู้ทบทวน: ${text(r.reviewer || 'ยังไม่ระบุ')}`, '',
      `- เหตุผล/ข้อยกเว้น: ${text(r.reason || '—')}`, `- หลักฐาน: ${r.evidence.map(text).join('; ') || '—'}`,
      `- เสนอแก้: ${text(r.proposedChange || '—')}`, `- ตรวจหลังแก้: ${text(r.verification || '—')}`].join('\n');
  });
  return ['# บันทึกทบทวนและแผนแก้ไข', '',
    'ข้อมูลผู้ทบทวน ไม่ใช่ผล scanner และไม่เปลี่ยน canonical disposition บันทึกผลจริงใน review.json แล้วตรวจด้วย review-check ไฟล์นี้ใช้จดบันทึกเพิ่มได้ แต่ไม่ถูก import กลับอัตโนมัติ', '',
    `Report ID: ${code(report.reportId)} · Review input SHA-256: ${code(digest(input))}`, '',
    `สถานะ: ${statuses.map(s => `${s} ${indexed.filter(({ finding }) => status(finding.findingId) === s).length}`).join(' · ')}`, '',
    '## ผลทบทวนที่บันทึกแล้ว', '', details.length ? details.join('\n\n') : 'ยังไม่มี finding ที่บันทึกผลทบทวน', '',
    '## รายการทั้งหมด', '', sections.join('\n\n') || 'ไม่มี finding', ''].join('\n');
}

const same = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
export const reportsDirectory = root => path.join(root, '.agrimap-agent', 'reports', 'golden-lint');

function checkDirectory(current) {
  let stat;
  try { stat = lstatSync(current); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  if (stat && (stat.isSymbolicLink() || !stat.isDirectory() || !same(realpathSync(current), current))) throw new Error('OUTPUT_PATH_INDIRECTION');
}
// Validate roots and every existing ancestor before anything is created.
function reportsRoot(workspace, roots) {
  if (typeof workspace !== 'string' || !path.isAbsolute(workspace) || !Array.isArray(roots) || roots.length < 2 || !roots.every(r => typeof r === 'string' && path.isAbsolute(r) && lstatSync(realpathSync(r)).isDirectory())) throw new Error('REPORT_ENVELOPE_REQUIRED');
  const resolvedRoots = roots.map(r => realpathSync(r));
  const root = realpathSync(workspace);
  if (!same(root, path.resolve(workspace)) || !same(root, resolvedRoots[0]) || !lstatSync(root).isDirectory()) throw new Error('REPORT_WORKSPACE_MISMATCH');
  const directory = reportsDirectory(root);
  if (resolvedRoots.slice(1).some(r => within(r, directory))) throw new Error('OUTPUT_UNSAFE_OR_EXISTS');
  let current = root;
  for (const part of ['.agrimap-agent', 'reports', 'golden-lint']) checkDirectory(current = path.join(current, part));
  return { root, directory, roots: resolvedRoots };
}

function bundleFiles(report, roots, context) {
  const review = reviewTemplate(report);
  return {
    '.gitignore': '*\n', // Keep private report/review metadata out of Git without editing product config.
    'report.json': canonical(report), 'report.md': renderMarkdown(report, context),
    'summary.md': renderSummary(report, context),
    'envelope.json': canonical({ report, protectedRoots: roots }), 'review.json': canonical(review),
    'review.md': renderReview(report, review),
    'README.md': '# รายงาน Golden และการติดตามแก้ไข\n\n1. อ่าน [สรุป](summary.md) แล้วเปิด [รายงานเต็ม](report.md) ซึ่งมีลำดับการแก้, การ์ดและ prompt แก้ไขของแต่ละกฎ, ดัชนีไฟล์ และ checklist ทุก finding\n2. คัดลอก prompt ทีละชุดไปให้ Agent ที่ติดตั้ง agrimap-agent-skills แก้ เริ่มจากความเสี่ยงต่ำ\n3. บันทึกข้อสรุปใน [review.json](review.json) (todo / confirmed / exception / needs-evidence / fixed-pending-rescan) หรือจดใน [review.md](review.md) โดยอ้าง Finding ID แล้วใช้ review-check ตรวจ\n4. หลังแก้ ให้รัน report ใหม่โดยใช้ --baseline ชี้ report.json ของชุดนี้ จะได้ชุดรายงานใหม่คู่กับชุดเดิม\n\nเก็บ report.json และ envelope.json ไว้เป็นหลักฐาน ไม่แก้เพื่อซ่อน findings การแก้ review ไม่แก้โค้ดหรืออนุมัติ rename public/data contracts\n'
  };
}
function writeBundle(destination, files) {
  mkdirSync(destination, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(destination, name), text, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
}

export function saveBundle(report, workspace, authorization, roots) {
  validateReport(report);
  const target = reportsRoot(workspace, roots);
  const destination = path.join(target.directory, report.reportId);
  if (typeof authorization !== 'string' || !path.isAbsolute(authorization) || path.resolve(authorization) !== destination) throw new Error('OUTPUT_AUTHORIZATION_REQUIRED');
  checkDirectory(destination);
  if (existsSync(destination)) throw new Error('OUTPUT_UNSAFE_OR_EXISTS');
  const files = bundleFiles(report, target.roots, { projectName: path.basename(target.root), projectRoot: target.root, reportDirectory: destination });
  writeBundle(destination, files);
  return { reportId: report.reportId, saved: true, directory: destination, files: Object.keys(files) };
}

// One-step report: the report ID is only known after scanning, so authorization names the
// lint-owned reports directory itself. An identical re-run reuses the existing bundle.
export function saveReport(report, workspace, authorization, roots) {
  validateReport(report);
  const target = reportsRoot(workspace, roots);
  if (typeof authorization !== 'string' || !path.isAbsolute(authorization) || !same(path.resolve(authorization), target.directory)) throw new Error('OUTPUT_AUTHORIZATION_REQUIRED');
  const destination = path.join(target.directory, report.reportId);
  checkDirectory(destination);
  const context = { projectName: path.basename(target.root), projectRoot: target.root, reportDirectory: destination };
  let status = 'saved';
  if (existsSync(destination)) {
    let existing = null;
    try { existing = readFileSync(path.join(destination, 'report.json'), 'utf8'); } catch {}
    if (existing !== canonical(report)) throw new Error('OUTPUT_UNSAFE_OR_EXISTS');
    status = 'existing';
  } else writeBundle(destination, bundleFiles(report, target.roots, context));
  const ignore = path.join(target.directory, '.gitignore');
  if (!existsSync(ignore)) writeFileSync(ignore, '*\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  writeIndex(target.directory);
  return { reportId: report.reportId, scanStatus: report.scanStatus, status, directory: destination, reportMarkdown: path.join(destination, 'report.md'), index: path.join(target.directory, 'index.md'), summary: renderSummary(report, context) };
}

// Derived navigation only: rebuilt from bundles on disk and replaced atomically.
function writeIndex(directory) {
  const rows = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || !/^[a-f0-9]{64}$/.test(entry.name)) continue;
    const time = statSync(path.join(directory, entry.name)).mtime;
    try { rows.push({ id: entry.name, time, report: JSON.parse(readFileSync(path.join(directory, entry.name, 'report.json'), 'utf8')) }); }
    catch { rows.push({ id: entry.name, time, report: null }); }
  }
  rows.sort((a, b) => b.time - a.time || (a.id < b.id ? -1 : 1));
  const cell = value => String(value ?? '—').replace(/[|\r\n`[\]]/g, ' ');
  const lines = ['# รายงาน AgriMap Golden Lint', '', 'สร้างใหม่ทุกครั้งที่รัน report เรียงจากล่าสุด เมื่อต้องการเทียบผลหลังแก้ ให้ใช้ report.json ของรอบก่อนเป็น --baseline', '',
    '| บันทึกเมื่อ (UTC) | สถานะ | Findings | ไฟล์ | Branch / HEAD | Scanner | รายงาน |', '| --- | --- | ---: | ---: | --- | --- | --- |',
    ...rows.map(({ id, time, report: r }) => r
      ? `| ${time.toISOString().slice(0, 16).replace('T', ' ')} | ${cell(r.scanStatus)} | ${r.findings?.length ?? '—'} | ${new Set((r.findings || []).map(f => f.path)).size} | ${cell(r.snapshot?.branch)} / ${cell(r.snapshot?.headCommit?.slice(0, 12))} | ${cell(r.analysisContract?.scannerVersion)} | [${id.slice(0, 12)}](${id}/report.md) |`
      : `| — | อ่านไม่ได้ | — | — | — | — | ${id.slice(0, 12)} |`)];
  const temporary = path.join(directory, `.index-${process.pid}-${Date.now()}.tmp`);
  writeFileSync(temporary, lines.join('\n') + '\n', { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  renameSync(temporary, path.join(directory, 'index.md'));
}
