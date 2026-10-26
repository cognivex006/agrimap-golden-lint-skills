import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateSchema } from './schema.mjs';
import { validateGovernance } from './governance.mjs';
import { validateHardcodePolicyResult } from './hardcode-policy.mjs';

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
  if (report.governance) {
    try { validateGovernance(report.governance); } catch { fail(); }
    if (report.governance.snapshotIdentity !== report.snapshot.contentIdentity) fail();
  }
  if (report.hardcodePolicy) {
    try { validateHardcodePolicyResult(report.hardcodePolicy); } catch { fail(); }
  }
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
