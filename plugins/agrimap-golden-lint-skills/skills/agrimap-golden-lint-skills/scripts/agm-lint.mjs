#!/usr/bin/env node
import { realpathSync, lstatSync, openSync, writeFileSync, closeSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { scan } from './scanner.mjs';
import { parseArgs, json, canonical, validateReport, renderMarkdown, within } from './contracts.mjs';

export function exportReport(report, destination, authorization, roots, format = 'markdown') {
  validateReport(report);
  if (!['markdown', 'json'].includes(format) || authorization !== destination || !path.isAbsolute(destination)) throw new Error('OUTPUT_AUTHORIZATION_REQUIRED');
  const parent = path.dirname(destination), resolvedParent = realpathSync(parent);
  // Refuse even benign symlink/junction indirection in the destination chain.
  const comparablePath = p => process.platform === 'win32' ? p.toLowerCase() : p;
  if (comparablePath(path.resolve(parent)) !== comparablePath(resolvedParent)) throw new Error('OUTPUT_PATH_INDIRECTION');
  const resolved = path.join(resolvedParent, path.basename(destination));
  if (roots.some(root => within(realpathSync(root), resolved)) || existsSync(resolved)) throw new Error('OUTPUT_UNSAFE_OR_EXISTS');
  if (!lstatSync(resolvedParent).isDirectory()) throw new Error('OUTPUT_PARENT_INVALID');
  const fd = openSync(resolved, 'wx', 0o600);
  try { writeFileSync(fd, format === 'json' ? canonical(report) : renderMarkdown(report), 'utf8'); }
  finally { closeSync(fd); }
}

export function run(args, stdout = value => process.stdout.write(value)) {
  try {
    const input = parseArgs([...args]);
    if (input.operation === 'scan') {
      const report = scan({ root: input.root, golden: input.golden, sourceMode: input['source-mode'], typescript: input.typescript, dotnet: input.dotnet, baseline: input.baseline ? json(input.baseline) : null, baseRef: input['base-ref'], targetRef: input['target-ref'] });
      stdout(canonical(report));
      return report.scanStatus === 'completed' ? 0 : 3;
    }
    // Existing reports are treated as untrusted data and validated before use.
    const envelope = json(input.report);
    if (!envelope.report || !Array.isArray(envelope.protectedRoots) || envelope.protectedRoots.length < 2) throw new Error('REPORT_ENVELOPE_REQUIRED');
    const report = validateReport(envelope.report);
    if (report.reportId !== input['report-id']) throw new Error('REPORT_ID_MISMATCH');
    if (input.operation === 'explain') {
      const finding = report.findings.find(f => f.findingId === input['finding-id']);
      if (!finding) throw new Error('FINDING_NOT_IN_REPORT');
      stdout(canonical({ reportId: report.reportId, finding }));
    } else {
      exportReport(report, input.to, input['authorize-output'], envelope.protectedRoots, input.format || 'markdown');
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
