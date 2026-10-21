import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync, readFileSync, unlinkSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { fixture, treeDigest, sql } from './helpers.mjs';
import { canonical, digest, validateReport } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { evaluateGovernance, ledgerPath, validateLedger } from '../skills/agrimap-golden-lint-skills/scripts/governance.mjs';
import { updateGovernance } from '../skills/agrimap-golden-lint-skills/scripts/report-bundle.mjs';
import { scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { renderMarkdown, renderSummary } from '../skills/agrimap-golden-lint-skills/scripts/render.mjs';
import { run } from '../skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs';

const dated = '2026-10-21';
const sign = (key, value) => ({ ...value, [key]: digest(value) });
function ledger(snapshotIdentity = 'a'.repeat(64)) {
  return { schemaVersion: 1, snapshotIdentity, inventory: { complete: true, reviewer: 'Reviewer', evidence: 'Manifests, transitive lockfiles, bundled tools and SaaS configuration reviewed' }, assessments: [sign('assessmentId', {
    previous: null, subject: 'sample-provider', kind: 'saas', version: 'plan-1', usage: 'redistribution', checkedOn: dated, reviewAfter: '2026-11-01', reviewer: 'Reviewer',
    sources: [{ kind: 'terms-of-service', url: 'https://example.com/terms', clause: 'Synthetic prohibition, section 2', contentDigest: 'b'.repeat(64) }],
    outcome: 'violation', severity: 'critical', rationale: 'Use conflicts with cited prohibition', remediation: 'Remove integration or obtain provider permission', verification: 'Verify removal and all consumers'
  })], decisions: [] };
}
const decide = (l, action) => {
  const previous = l.decisions.filter(d => d.assessmentId === l.assessments[0].assessmentId).at(-1)?.decisionId || null;
  l.decisions.push(sign('decisionId', { previous, assessmentId: l.assessments[0].assessmentId, action, owner: 'Owner', decidedOn: dated, reason: action === 'decline' ? 'Owner explicitly declines remediation' : 'Owner requests remediation', evidence: 'Explicit owner instruction in decision record' }));
};

test('severe conflict blocks; decline remains unresolved and reopen/fix preserves history', () => {
  const l = ledger(), evaluate = () => evaluateGovernance(l, l.snapshotIdentity, dated);
  assert.equal(evaluate().items[0].status, 'blocked-owner');
  decide(l, 'decline');
  assert.equal(evaluate().items[0].status, 'acknowledged-unresolved');
  assert.equal(evaluate().status, 'blocked');
  decide(l, 'reopen'); assert.equal(evaluate().items[0].status, 'blocked-owner');
  decide(l, 'fix'); assert.equal(evaluate().items[0].status, 'blocked-remediation');
  assert.equal(l.decisions.length, 3);
  const old = l.assessments[0];
  l.assessments.push(sign('assessmentId', { ...Object.fromEntries(Object.entries(old).filter(([k]) => k !== 'assessmentId')), previous: old.assessmentId, outcome: 'compliant', rationale: 'Provider permission obtained', verification: 'Reviewed permission covers deployed usage' }));
  assert.equal(evaluate().status, 'reviewed');
  assert.equal(evaluate().items[0].decisionId, null);
});

test('unknown/missing evidence, expiry, future dates, changed snapshot and incomplete inventory cannot pass', () => {
  assert.equal(evaluateGovernance(null, 'a'.repeat(64), dated).status, 'needs-review');
  const l = ledger(), a = l.assessments[0];
  l.assessments[0] = sign('assessmentId', { ...Object.fromEntries(Object.entries(a).filter(([k]) => k !== 'assessmentId')), outcome: 'compliant' });
  assert.equal(evaluateGovernance(l, l.snapshotIdentity, '2026-11-02').status, 'needs-review');
  assert.equal(evaluateGovernance(l, l.snapshotIdentity, '2026-10-20').status, 'needs-review');
  assert.equal(evaluateGovernance(l, 'c'.repeat(64), dated).status, 'needs-review');
  l.inventory.complete = false;
  assert.equal(evaluateGovernance(l, l.snapshotIdentity, dated).status, 'needs-review');
  assert.throws(() => evaluateGovernance(l, l.snapshotIdentity, '2026-02-30'), /DATE/);
});

test('forged IDs, orphan decisions, untrusted URLs, unknown fields and secrets rejected', () => {
  for (const mutate of [l => l.assessments[0].severity = 'low', l => l.assessments[0].extra = true, l => l.decisions.push({}), l => { const a = l.assessments[0]; delete a.assessmentId; a.sources[0].url = 'https://user:pass@example.com/terms'; l.assessments[0] = sign('assessmentId', a); }, l => l.inventory.evidence = 'Bearer abcdefghijklmnopqrstuvwxyz']) {
    const l = ledger(); mutate(l); assert.throws(() => validateLedger(l));
  }
});

test('authorized ledger writer, no-baseline recall, report/export visibility and no-write scan', t => {
  const f = fixture(t, { [sql]: 'CREATE PROCEDURE X AS SELECT 1;' });
  mkdirSync(path.dirname(path.join(f.root, ledgerPath)), { recursive: true });
  const args = { ...f.args, governanceDate: dated }, beforeReport = scan(args);
  const l = ledger(beforeReport.snapshot.contentIdentity), target = path.join(f.root, ledgerPath), roots = [f.root, f.golden];
  assert.throws(() => updateGovernance(beforeReport, l, f.root, roots), /AUTHORIZATION/);
  updateGovernance(beforeReport, l, target, roots);
  let report = scan(args);
  assert.equal(report.governance.items[0].status, 'blocked-owner');
  decide(l, 'decline'); updateGovernance(report, l, target, roots);
  const tree = treeDigest(f.root);
  report = scan(args);
  assert.equal(treeDigest(f.root), tree);
  assert.equal(report.governance.items[0].status, 'acknowledged-unresolved');
  for (const text of [renderMarkdown(report), renderSummary(report)]) {
    assert.match(text, /acknowledged-unresolved/); assert.match(text, /example.com\/terms/); assert.match(text, /Owner explicitly declines/);
  }
  const out = [];
  assert.equal(run(['scan', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--governance-date', dated], s => out.push(s)), 4);
  assert.equal(JSON.parse(out.join('')).governance.status, 'blocked');
  const rewritten = structuredClone(l); rewritten.decisions = [];
  assert.throws(() => updateGovernance(report, rewritten, target, roots), /HISTORY_REWRITE/);
  assert.equal(readFileSync(target, 'utf8'), canonical(l));
  const forged = structuredClone(report); forged.governance.status = 'reviewed'; delete forged.reportId; forged.reportId = digest(forged);
  assert.throws(() => validateReport(forged), /INVALID_REPORT/);
  f.put(sql, 'CREATE PROCEDURE CHANGED AS SELECT 1;');
  assert.equal(scan(args).governance.items[0].freshness, 'stale');
  assert.equal(scan(args).governance.status, 'blocked');
});

test('new report stays readable with old optional-governance schema; legacy reports are not assessed', t => {
  const f = fixture(t);
  const report = scan({ ...f.args, governanceDate: dated });
  delete report.governance; delete report.reportId; report.reportId = digest(report);
  assert.equal(validateReport(report), report);
  assert.match(renderMarkdown(report), /not-assessed/);
});

test('a serious assessment cannot be laundered to unknown/compliant without owner remediation', () => {
  for (const outcome of ['unknown', 'compliant']) {
    const l = ledger(), previous = l.assessments[0];
    const { assessmentId, ...payload } = previous;
    l.assessments.push(sign('assessmentId', { ...payload, previous: assessmentId, outcome }));
    assert.throws(() => validateLedger(l), /INVALID_GOVERNANCE/);
  }
});

test('writer and CLI preserve report evidence; baseline detects lost history and snapshot cannot be silently reattested', t => {
  const f = fixture(t, { [sql]: 'CREATE PROCEDURE X AS SELECT 1;' });
  mkdirSync(path.dirname(path.join(f.root, ledgerPath)), { recursive: true });
  const args = { ...f.args, governanceDate: dated }, report = scan(args), l = ledger(report.snapshot.contentIdentity);
  const envelope = path.join(f.output, 'envelope.json'), candidate = path.join(f.output, 'candidate.json'), destination = path.join(f.root, ledgerPath);
  writeFileSync(envelope, canonical({ report, protectedRoots: [f.root, f.golden] }));
  writeFileSync(candidate, canonical(l));
  assert.equal(run(['governance-update', '--report', envelope, '--report-id', report.reportId, '--governance', candidate, '--authorize-output', destination], () => {}), 0);
  assert.equal(JSON.parse(readFileSync(envelope)).report.reportId, report.reportId);
  const baseline = scan(args);
  f.put(sql, 'CREATE PROCEDURE Y AS SELECT 1;');
  const changed = scan(args), reattested = structuredClone(l); reattested.snapshotIdentity = changed.snapshot.contentIdentity;
  assert.throws(() => updateGovernance(changed, reattested, destination, [f.root, f.golden]), /REASSESSMENT_REQUIRED/);
  unlinkSync(destination);
  assert.throws(() => scan({ ...args, baseline }), /GOVERNANCE_HISTORY_MISSING/);
  // Input failure must not authorize an output redirect into another directory.
  symlinkSync(f.output, path.dirname(destination) + '-link', 'junction');
  const redirected = path.join(path.dirname(destination) + '-link', 'third-party.json');
  assert.throws(() => updateGovernance(changed, reattested, redirected, [f.root, f.golden]), /AUTHORIZATION/);
});

test('complete reviewed scope returns exit zero while blocked reports retain their gate in saved JSON and index', t => {
  const f = fixture(t), dateArgs = ['--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--governance-date', dated];
  const directory = path.dirname(path.join(f.root, ledgerPath)); mkdirSync(directory, { recursive: true });
  const report = scan({ ...f.args, governanceDate: dated }), l = ledger(report.snapshot.contentIdentity), roots = [f.root, f.golden];
  updateGovernance(report, l, path.join(f.root, ledgerPath), roots);
  const output = [];
  assert.equal(run(['report', ...dateArgs, '--authorize-output', directory, '--format', 'json'], s => output.push(s)), 4);
  assert.equal(JSON.parse(output.join('')).governanceStatus, 'blocked');
  assert.match(readFileSync(path.join(directory, 'index.md'), 'utf8'), /Governance.*\n/);
  assert.match(readFileSync(path.join(directory, 'index.md'), 'utf8'), /blocked/);
  decide(l, 'fix');
  const { assessmentId, ...payload } = l.assessments[0];
  l.assessments.push(sign('assessmentId', { ...payload, previous: assessmentId, outcome: 'compliant', rationale: 'Permission obtained and verified' }));
  updateGovernance(scan({ ...f.args, governanceDate: dated }), l, path.join(f.root, ledgerPath), roots);
  assert.equal(run(['scan', ...dateArgs], () => {}), 0);
});
