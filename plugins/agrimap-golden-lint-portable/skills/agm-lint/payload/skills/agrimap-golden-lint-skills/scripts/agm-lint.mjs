#!/usr/bin/env node
import { realpathSync, lstatSync, openSync, writeFileSync, closeSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { scan } from './scanner.mjs';
import { parseArgs, json, canonical, validateReport, within } from './contracts.mjs';
import { renderMarkdown, renderSummary } from './render.mjs';
import { saveBundle, saveReport, updateGovernance, updateHardcodePolicy, updateReview, validateReview, renderReview } from './report-bundle.mjs';

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

function runScan(input, stdout) {
  if (input.format && !(input.operation === 'report' ? ['markdown', 'json'] : ['json', 'summary']).includes(input.format)) throw new Error('INVALID_OPTION');
  const report = scan({ root: input.root, golden: input.golden, sourceMode: input['source-mode'], typescript: input.typescript, dotnet: input.dotnet, baseline: input.baseline ? json(input.baseline) : null, baseRef: input['base-ref'], targetRef: input['target-ref'], governanceDate: input['governance-date'] });
  if (input.operation === 'scan') stdout(input.format === 'summary' ? renderSummary(report, { projectName: path.basename(realpathSync(input.root)) }) : canonical(report));
  else {
    // The scanned root and the Golden root are the protected roots, exactly as an envelope records them.
    const root = realpathSync(input.root);
    const { summary, ...saved } = saveReport(report, root, input['authorize-output'], [root, realpathSync(input.golden)], input.baseline ? path.resolve(input.baseline) : null);
    stdout(input.format === 'json' ? canonical(saved) : `${summary}\n${saved.carriedReviews ? `ยกข้อสรุปจาก review.json ของ baseline มา ${saved.carriedReviews} รายการ\n` : ''}ชุดรายงาน (${saved.status}): ${saved.directory}\nดัชนีรายงานทั้งหมด: ${saved.index}\n`);
  }
  const policyNeedsReview = report.hardcodePolicy?.status === 'needs-review';
  return report.governance?.status === 'blocked' ? 4 : report.scanStatus !== 'completed' || report.governance?.status === 'needs-review' || policyNeedsReview ? 3 : 0;
}

// One branch per operation. Each operation writes only inside the authorization it was given.
function applyOperation(input, report, envelope, stdout) {
  if (input.operation === 'governance-update') return stdout(canonical(updateGovernance(report, json(input.governance), input['authorize-output'], envelope.protectedRoots)));
  if (input.operation === 'policy-update') return stdout(canonical(updateHardcodePolicy(report, json(input.policy), input['authorize-output'], envelope.protectedRoots)));
  if (input.operation === 'explain') return explainOperation(input, report, stdout);
  if (input.operation === 'save') return stdout(canonical(saveBundle(report, input.workspace, input['authorize-output'], envelope.protectedRoots)));
  if (input.operation === 'review-check') return stdout(canonical(checkOperation(report, json(input.review))));
  if (input.operation === 'review-update') return stdout(canonical(updateReview(report, json(input.review), input['authorize-output'], envelope.protectedRoots)));
  return exportOperation(input, report, envelope, stdout);
}

function explainOperation(input, report, stdout) {
  const finding = report.findings.find(f => f.findingId === input['finding-id']);
  if (!finding) throw new Error('FINDING_NOT_IN_REPORT');
  return stdout(canonical({ reportId: report.reportId, finding }));
}

function checkOperation(report, review) {
  const valid = validateReview(report, review);
  return { reportId: report.reportId, valid: true, reviewed: valid.reviews.filter(r => r.status !== 'todo').length, total: report.findings.length };
}

function exportOperation(input, report, envelope, stdout) {
  const review = input.review ? json(input.review) : null;
  exportReport(report, input.to, input['authorize-output'], envelope.protectedRoots, input.format || 'markdown', review);
  return stdout(canonical({ reportId: report.reportId, exported: true }));
}

export function run(args, stdout = value => process.stdout.write(value)) {
  try {
    const input = parseArgs([...args]);
    if (input.operation === 'scan' || input.operation === 'report') return runScan(input, stdout);
    // Existing reports are treated as untrusted data and validated before use.
    const envelope = json(input.report);
    if (!envelope.report || !Array.isArray(envelope.protectedRoots) || envelope.protectedRoots.length < 2) throw new Error('REPORT_ENVELOPE_REQUIRED');
    if (!envelope.protectedRoots.every(r => typeof r === 'string' && path.isAbsolute(r))) throw new Error('REPORT_ENVELOPE_REQUIRED');
    const report = validateReport(envelope.report);
    if (report.reportId !== input['report-id']) throw new Error('REPORT_ID_MISMATCH');
    applyOperation(input, report, envelope, stdout);
    return 0;
  } catch (error) {
    const safeCode = /^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'PREFLIGHT_OR_IO_FAILURE';
    stdout(canonical({ scanStatus: 'failed', diagnostic: safeCode }));
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = run(process.argv.slice(2));
