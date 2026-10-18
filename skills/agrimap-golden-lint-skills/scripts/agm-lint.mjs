#!/usr/bin/env node
import { realpathSync, lstatSync, openSync, writeFileSync, closeSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { scan } from './scanner.mjs';
import { parseArgs, json, canonical, validateReport, within } from './contracts.mjs';
import { renderMarkdown, renderSummary } from './render.mjs';
import { saveBundle, saveReport, updateReview, validateReview, renderReview } from './report-bundle.mjs';

export function exportReport(report, destination, authorization, roots, format = 'markdown', review = null) {
  validateReport(report);
  if (!Array.isArray(roots) || roots.length < 2 || !roots.every(r => typeof r === 'string' && path.isAbsolute(r) && lstatSync(realpathSync(r)).isDirectory())) throw new Error('REPORT_ENVELOPE_REQUIRED');
  if (review) validateReview(report, review);
  if (review && format !== 'markdown') throw new Error('REVIEW_MARKDOWN_REQUIRED');
  if (!['markdown', 'json'].includes(format) || authorization !== destination || !path.isAbsolute(destination)) throw new Error('OUTPUT_AUTHORIZATION_REQUIRED');
  const parent = path.dirname(destination), resolvedParent = realpathSync(parent);
  // Refuse even benign symlink/junction indirection in the destination chain.
  const comparablePath = p => process.platform === 'win32' ? p.toLowerCase() : p;
  if (comparablePath(path.resolve(parent)) !== comparablePath(resolvedParent)) throw new Error('OUTPUT_PATH_INDIRECTION');
  const resolved = path.join(resolvedParent, path.basename(destination));
  if (roots.some(root => within(realpathSync(root), resolved)) || existsSync(resolved)) throw new Error('OUTPUT_UNSAFE_OR_EXISTS');
  if (!lstatSync(resolvedParent).isDirectory()) throw new Error('OUTPUT_PARENT_INVALID');
  const fd = openSync(resolved, 'wx', 0o600);
  try { writeFileSync(fd, format === 'json' ? canonical(report) : renderMarkdown(report, { projectName: path.basename(roots[0]), review }) + (review ? '\n' + renderReview(report, review) : ''), 'utf8'); }
  finally { closeSync(fd); }
}

export function run(args, stdout = value => process.stdout.write(value)) {
  try {
    const input = parseArgs([...args]);
    if (input.operation === 'scan' || input.operation === 'report') {
      if (input.format && !(input.operation === 'report' ? ['markdown', 'json'] : ['json', 'summary']).includes(input.format)) throw new Error('INVALID_OPTION');
      const report = scan({ root: input.root, golden: input.golden, sourceMode: input['source-mode'], typescript: input.typescript, dotnet: input.dotnet, baseline: input.baseline ? json(input.baseline) : null, baseRef: input['base-ref'], targetRef: input['target-ref'] });
      if (input.operation === 'scan') stdout(input.format === 'summary' ? renderSummary(report, { projectName: path.basename(realpathSync(input.root)) }) : canonical(report));
      else {
        // The scanned root and the Golden root are the protected roots, exactly as an envelope records them.
        const root = realpathSync(input.root);
        const { summary, ...saved } = saveReport(report, root, input['authorize-output'], [root, realpathSync(input.golden)], input.baseline ? path.resolve(input.baseline) : null);
        stdout(input.format === 'json' ? canonical(saved) : `${summary}\n${saved.carriedReviews ? `ยกข้อสรุปจาก review.json ของ baseline มา ${saved.carriedReviews} รายการ\n` : ''}ชุดรายงาน (${saved.status}): ${saved.directory}\nดัชนีรายงานทั้งหมด: ${saved.index}\n`);
      }
      return report.scanStatus === 'completed' ? 0 : 3;
    }
    // Existing reports are treated as untrusted data and validated before use.
    const envelope = json(input.report);
    if (!envelope.report || !Array.isArray(envelope.protectedRoots) || envelope.protectedRoots.length < 2) throw new Error('REPORT_ENVELOPE_REQUIRED');
    if (!envelope.protectedRoots.every(r => typeof r === 'string' && path.isAbsolute(r))) throw new Error('REPORT_ENVELOPE_REQUIRED');
    const report = validateReport(envelope.report);
    if (report.reportId !== input['report-id']) throw new Error('REPORT_ID_MISMATCH');
    if (input.operation === 'explain') {
      const finding = report.findings.find(f => f.findingId === input['finding-id']);
      if (!finding) throw new Error('FINDING_NOT_IN_REPORT');
      stdout(canonical({ reportId: report.reportId, finding }));
    } else if (input.operation === 'save') {
      stdout(canonical(saveBundle(report, input.workspace, input['authorize-output'], envelope.protectedRoots)));
    } else if (input.operation === 'review-check') {
      const review = validateReview(report, json(input.review));
      stdout(canonical({ reportId: report.reportId, valid: true, reviewed: review.reviews.filter(r => r.status !== 'todo').length, total: report.findings.length }));
    } else if (input.operation === 'review-update') {
      stdout(canonical(updateReview(report, json(input.review), input['authorize-output'], envelope.protectedRoots)));
    } else {
      exportReport(report, input.to, input['authorize-output'], envelope.protectedRoots, input.format || 'markdown', input.review ? json(input.review) : null);
      stdout(canonical({ reportId: report.reportId, exported: true }));
    }
    return 0;
  } catch (error) {
    const safeCode = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'PREFLIGHT_OR_IO_FAILURE';
    stdout(canonical({ scanStatus: 'failed', diagnostic: safeCode }));
    return 2;
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = run(process.argv.slice(2));
