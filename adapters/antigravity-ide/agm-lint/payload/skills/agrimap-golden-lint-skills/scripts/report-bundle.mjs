// Explicit report operations only. This writer is never imported by the scanner.
import { existsSync, realpathSync, lstatSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { canonical, digest, validateReport, renderMarkdown, within, json, packageRoot } from './contracts.mjs';
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

export function renderReview(report, input) {
  validateReview(report, input);
  const safe = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/[\\`*_[\]{}()|#!]/g, '\\$&').replace(/[\r\n]+/g, ' ');
  return '# บันทึกทบทวนและแผนแก้ไข\n\nข้อมูลผู้ทบทวน ไม่ใช่ผล scanner และไม่เปลี่ยน canonical disposition\n\nReport ID: ' + report.reportId + '\n\nReview input SHA-256: ' + digest(input) + '\n\n' + input.reviews.map(r => {
    const f = report.findings.find(f => f.findingId === r.findingId);
    return `## ${safe(f.path)}:${f.line}:${f.column}\n\nFinding ID: ${r.findingId}\n\nสถานะ: ${safe(r.status)}\n\nผู้ทบทวน: ${safe(r.reviewer) || 'ยังไม่ระบุ'}\n\nเหตุผล/ข้อยกเว้น: ${safe(r.reason) || 'ยังไม่ทบทวน'}\n\nหลักฐาน: ${r.evidence.map(safe).join('; ') || 'ยังไม่มี'}\n\nเสนอแก้: ${safe(r.proposedChange) || 'เปิดตำแหน่งที่พบ เทียบ Golden และยืนยัน consumers ก่อนเลือกชื่อ/รูปแบบใหม่'}\n\nตรวจหลังแก้: ${safe(r.verification) || 'ตรวจ callers/imports/templates/SQL contracts ตาม lane แล้ว scan ใหม่'}\n`;
  }).join('\n');
}

export function saveBundle(report, workspace, authorization, roots) {
  validateReport(report);
  if (!path.isAbsolute(workspace) || !Array.isArray(roots) || roots.length < 2 || !roots.every(r => typeof r === 'string' && path.isAbsolute(r) && lstatSync(realpathSync(r)).isDirectory())) throw new Error('REPORT_ENVELOPE_REQUIRED');
  roots = roots.map(r => realpathSync(r));
  const root = realpathSync(workspace);
  const same = (a, b) => process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b;
  if (!same(root, path.resolve(workspace)) || !same(root, realpathSync(roots[0])) || !lstatSync(root).isDirectory()) throw new Error('REPORT_WORKSPACE_MISMATCH');
  const destination = path.join(root, '.agrimap-agent', 'reports', 'golden-lint', report.reportId);
  if (typeof authorization !== 'string' || !path.isAbsolute(authorization) || path.resolve(authorization) !== destination) throw new Error('OUTPUT_AUTHORIZATION_REQUIRED');
  if (roots.slice(1).some(r => within(realpathSync(r), destination))) throw new Error('OUTPUT_UNSAFE_OR_EXISTS');
  // Validate every existing ancestor before creating any file or directory.
  let current = root;
  for (const part of ['.agrimap-agent', 'reports', 'golden-lint', report.reportId]) {
    current = path.join(current, part);
    let stat;
    try { stat = lstatSync(current); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (stat && (stat.isSymbolicLink() || !stat.isDirectory() || !same(realpathSync(current), current))) throw new Error('OUTPUT_PATH_INDIRECTION');
  }
  if (existsSync(destination)) throw new Error('OUTPUT_UNSAFE_OR_EXISTS');
  const review = reviewTemplate(report);
  const files = {
    '.gitignore': '*\n', // Keep private report/review metadata out of Git without editing product config.
    'report.json': canonical(report), 'report.md': renderMarkdown(report),
    'envelope.json': canonical({ report, protectedRoots: roots }), 'review.json': canonical(review),
    'review.md': renderReview(report, review),
    'README.md': '# รายงาน Golden และการติดตามแก้ไข\n\n1. อ่าน [รายงาน](report.md) เพื่อดูปัญหา ตำแหน่ง เหตุผล และแนวทางแก้ครบทุก finding\n2. บันทึกข้อสรุปใน [review.json](review.json) หรือจดใน [review.md](review.md) โดยอ้าง Finding ID; Markdown เป็นสมุดทำงาน ไม่ถูก import อัตโนมัติ\n3. review.json: กรอก reviewer, evidence, reason, proposedChange, verification; ใช้ todo / confirmed / exception / needs-evidence / fixed-pending-rescan\n4. ใช้ review-check ตรวจ review.json และ export --review รวมผลทบทวนในสำเนารายงานใหม่\n5. เมื่อแก้ product ตามสิทธิ์ของงานแล้ว ให้ scan ใหม่และเก็บ report ID ใหม่; fixed-pending-rescan ไม่ได้แปลว่า scanner ยืนยันผ่าน\n\nเก็บ report.json และ envelope.json เดิมไว้เป็นหลักฐาน ไม่แก้เพื่อซ่อน findings การแก้ review ไม่แก้โค้ดหรืออนุมัติ rename public/data contracts\n'
  };
  mkdirSync(destination, { recursive: true });
  for (const [name, text] of Object.entries(files)) writeFileSync(path.join(destination, name), text, { encoding: 'utf8', flag: 'wx', mode: 0o600 });
  return { reportId: report.reportId, saved: true, directory: destination, files: Object.keys(files) };
}
