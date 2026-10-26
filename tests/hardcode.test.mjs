import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fixture, fe, cs, sql } from './helpers.mjs';
import { canonical, digest, hash } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { hardcodeObservations, hardcodeClassesFor, hardcodeTable } from '../skills/agrimap-golden-lint-skills/scripts/hardcode.mjs';
import { hardcodePolicyPath, evaluateHardcodePolicy, validateHardcodePolicyHistory, acknowledgedSubjects } from '../skills/agrimap-golden-lint-skills/scripts/hardcode-policy.mjs';
import { scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { fixPrompts, renderMarkdown, renderSummary } from '../skills/agrimap-golden-lint-skills/scripts/render.mjs';
import { run } from '../skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs';

const library = 'standards/libraries/angular/agrimap-platform/projects/demo/src/public-api.ts';
const libraryCs = 'standards/libraries/netcore/AgriMap.Platform/AgriMap.Platform/Src/Demo.cs';
const secret = 'AKIAIOSFODNN7EXAMPLE';
const external = 'https://api.partner.co.th/v1/forms';
const findingsOf = report => report.findings.filter(x => x.hardcode);
// Unit-level routing: which class a lane/tier bucket assigns to one literal.
const classes = (text, lane, tier, file) => hardcodeObservations(text, { lane, hardcodeTier: tier }, { path: file }).map(o => o.hardcode.class);
const decision = fields => {
  const payload = { previous: null, subjectKey: hash('subject'), class: 'HC-EXTURL', tier: 'MUST', path: fe, valueMask: external,
    action: 'skip', owner: 'Owner', reason: 'เป็น endpoint สำหรับยิงทดสอบ', evidence: ['user confirmed 2026-01-05'],
    decidedOn: '2026-01-05', reviewAfter: '2027-01-05', snapshotIdentity: hash('snapshot'), ...fields };
  return { entryId: digest(payload), ...payload };
};
const writeLedger = (root, entries) => {
  const file = path.join(root, hardcodePolicyPath);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, canonical({ schemaVersion: 1, entries }));
  return file;
};

test('hardcode class table keeps one tier and one disposition per class', () => {
  for (const entry of hardcodeTable) {
    assert(['MUST', 'SHOULD'].includes(entry.tier), entry.class);
    assert(['violation', 'review-candidate'].includes(entry.disposition), entry.class);
    assert(entry.lanes.length && entry.title && entry.guidance, entry.class);
  }
  assert.deepEqual(hardcodeClassesFor('sql-procedure', 'MUST').map(e => e.class), ['HC-SECRET']);
  assert(hardcodeClassesFor('be-main', 'MUST').map(e => e.class).includes('HC-ENVURL'));
  assert(!hardcodeClassesFor('sql-table', 'MUST').some(e => e.class === 'HC-ENVURL'));
});

test('every hardcode class is reachable from its own lane and tier bucket', () => {
  assert.deepEqual(classes(`const k = "${secret}";`, 'be-main', 'MUST', cs), ['HC-SECRET']);
  assert.deepEqual(classes('const u = "https://agrimap-api.cdg.co.th/api/v1";', 'be-main', 'MUST', cs), ['HC-ENVURL']);
  assert.deepEqual(classes('const t = "https://services.arcgis.com/x/arcgis/rest/services/Y/MapServer";', 'fe-main', 'MUST', fe), ['HC-PROXYBYPASS']);
  assert.deepEqual(classes('const m = "https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=13.1,100.2";', 'fe-main', 'MUST', fe), ['HC-PROXYBYPASS']);
  assert.deepEqual(classes(`const c = "${external}";`, 'fe-library', 'MUST', library), ['HC-EXTURL']);
  assert.deepEqual(classes('var env = "Production";', 'be-library', 'SHOULD', libraryCs), ['HC-CONFIG']);
  assert.deepEqual(classes('const maxPageSize = 100;', 'be-main', 'SHOULD', cs), ['HC-MAGIC']);
  assert.deepEqual(classes("SELECT 'https://agrimap-api.cdg.co.th/api/v1';", 'sql-procedure', 'SHOULD', sql), ['HC-SQL']);
  assert.deepEqual(classes("SELECT '[agrimap_app].[dbo].[DEMO]';", 'sql-table', 'SHOULD', sql), ['HC-SQL']);
});

test('dev hosts, placeholders, schema hosts, timing names and config-of-record files stay silent', () => {
  assert.deepEqual(classes('const u = "http://localhost:4200/api";', 'fe-main', 'MUST', fe), []);
  assert.deepEqual(classes('const u = "https://${host}/api/v1";', 'fe-main', 'MUST', fe), []);
  assert.deepEqual(classes('const u = "https://www.w3.org/2001/XMLSchema";', 'be-main', 'MUST', cs), []);
  assert.deepEqual(classes('const requestTimeout = 30000;', 'be-main', 'SHOULD', cs), []);
  assert.deepEqual(classes('const pageSize = 20;', 'be-main', 'SHOULD', cs), []);
  assert.deepEqual(classes('const u = "https://agrimap-api.cdg.co.th/api/v1";', 'fe-main', 'MUST', 'apps/web/agmwa-fixture-ng/src/environments/environment.ts'), []);
  assert.deepEqual(classes('const u = "https://agrimap-api.cdg.co.th/api/v1";', 'fe-main', 'MUST', 'apps/web/agmwa-fixture-ng/src/app/api.d.ts'), []);
});

test('secret material is masked everywhere and a commented value never becomes a finding', () => {
  const observations = hardcodeObservations(`// key = "${secret}"\npublic class Demo { public string K = "${secret}"; }`, { lane: 'be-main', hardcodeTier: 'MUST' }, { path: cs });
  assert.equal(observations.length, 1);
  assert.equal(observations[0].hardcode.class, 'HC-SECRET');
  assert.equal(observations[0].hardcode.valueMask, '<masked:aws-access-key-id>');
  assert(!JSON.stringify(observations).includes(secret));
  assert(!observations[0].observation.includes(secret));
  const masked = hardcodeObservations('const u = "https://user:pw@api.partner.co.th/x?a=1";', { lane: 'fe-main', hardcodeTier: 'MUST' }, { path: fe });
  assert.equal(masked[0].hardcode.valueMask, 'https://api.partner.co.th/x?<query-masked> (userinfo removed)');
});

test('scanner emits hardcode findings with lane tiers and never writes the raw secret', t => {
  const f = fixture(t, { [cs]: `public class Demo { public string Api = "https://agrimap-api.cdg.co.th/api/v1"; public string Key = "${secret}"; }` });
  const report = scan(f.args);
  const classes = findingsOf(report).map(x => x.hardcode.class).sort();
  assert.deepEqual(classes, ['HC-ENVURL', 'HC-SECRET']);
  assert(findingsOf(report).every(x => x.disposition === 'violation' && x.actualEvidenceLevel === 'text'));
  assert(!canonical(report).includes(secret));
  const rule = report.rules.find(r => r.detectorId === 'be-main-hardcode-must');
  assert.equal(rule.executionStatus, 'evaluated');
  assert.equal(rule.authority.tier, 'MUST');
  assert(report.rules.find(r => r.detectorId === 'be-main-hardcode-should').authority.tier === 'SHOULD');
});

test('a recorded decision recalls the point, drops it from prompts and lists it as an accepted exception', t => {
  const f = fixture(t, { [fe]: `export const endpoint = '${external}';` });
  const first = scan(f.args), finding = findingsOf(first).find(x => x.hardcode.class === 'HC-EXTURL');
  assert(finding && finding.disposition === 'review-candidate');
  writeLedger(f.root, [decision({ subjectKey: finding.hardcode.subjectKey })]);
  const report = scan(f.args), recalled = report.findings.find(x => x.findingId === finding.findingId);
  assert.equal(recalled.disposition, 'accepted-exception');
  assert.equal(recalled.hardcode.acknowledged.owner, 'Owner');
  assert.equal(report.hardcodePolicy.status, 'reviewed');
  const covered = fixPrompts(report).flatMap(p => p.batch.files.flatMap(([, items]) => items.map(x => x.findingId)));
  assert(!covered.includes(finding.findingId));
  const markdown = renderMarkdown(report);
  assert(markdown.includes('## Hardcode decisions และข้อยกเว้นที่บันทึกไว้'));
  assert(markdown.includes('HC-EXTURL / MUST') && markdown.includes('accepted-exception'));
  assert(markdown.includes('เป็น endpoint สำหรับยิงทดสอบ'));
  assert(renderSummary(report).includes('Hardcode decisions: **reviewed**'));
});

test('a changed value or moved file is a new subject and is asked again', t => {
  const f = fixture(t, { [fe]: `export const endpoint = '${external}';` });
  const finding = findingsOf(scan(f.args))[0];
  writeLedger(f.root, [decision({ subjectKey: finding.hardcode.subjectKey })]);
  assert.equal(findingsOf(scan(f.args))[0].disposition, 'accepted-exception');
  f.put(fe, "export const endpoint = 'https://api.partner.co.th/v2/forms';");
  assert.equal(findingsOf(scan(f.args))[0].disposition, 'review-candidate');
});

test('expired and reopened decisions are asked again and surface as needs-review', t => {
  const f = fixture(t, { [fe]: `export const endpoint = '${external}';` });
  const finding = findingsOf(scan(f.args))[0];
  const entry = decision({ subjectKey: finding.hardcode.subjectKey, reviewAfter: '2026-02-01' });
  const expired = evaluateHardcodePolicy({ schemaVersion: 1, entries: [entry] }, '2026-03-01');
  assert.equal(expired.status, 'needs-review');
  assert.equal(expired.items[0].state, 'expired');
  assert.equal(acknowledgedSubjects(expired).size, 0);
  const reopened = decision({ subjectKey: finding.hardcode.subjectKey, previous: entry.entryId, action: 'reopen', decidedOn: '2026-03-02', reviewAfter: '2027-03-02' });
  const chained = { schemaVersion: 1, entries: [entry, reopened] };
  validateHardcodePolicyHistory({ schemaVersion: 1, entries: [entry] }, chained);
  assert.equal(evaluateHardcodePolicy(chained, '2026-03-03').items[0].state, 'open');
  assert.throws(() => validateHardcodePolicyHistory({ schemaVersion: 1, entries: [entry] }, { schemaVersion: 1, entries: [reopened] }));
  writeLedger(f.root, [entry]);
  const out = [];
  assert.equal(run(['scan', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--format', 'summary', '--governance-date', '2026-03-01'], v => out.push(v)), 3);
  assert(out.join('').includes('needs-review'));
});

test('policy-update writes only the private ledger, needs authorization and refuses history rewrite', t => {
  const f = fixture(t, { [fe]: `export const endpoint = '${external}';` });
  const reports = path.join(f.root, '.agrimap-agent', 'reports', 'golden-lint');
  assert.equal(run(['report', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--authorize-output', reports], () => {}), 3);
  const bundle = path.join(reports, readFileSync(path.join(reports, 'index.md'), 'utf8').match(/\(([a-f0-9]{64})\/report\.md\)/)[1]);
  const report = JSON.parse(readFileSync(path.join(bundle, 'report.json'), 'utf8'));
  const finding = report.findings.find(x => x.hardcode);
  const ledger = { schemaVersion: 1, entries: [decision({ subjectKey: finding.hardcode.subjectKey })] };
  const policy = path.join(f.output, 'policy.json');
  writeFileSync(policy, JSON.stringify(ledger, null, 2));
  const destination = path.join(f.root, hardcodePolicyPath);
  const base = ['policy-update', '--report', path.join(bundle, 'envelope.json'), '--report-id', report.reportId, '--policy', policy];
  assert.equal(run([...base, '--authorize-output', f.output], () => {}), 2);
  assert.equal(run([...base, '--authorize-output', destination], () => {}), 0);
  assert.deepEqual(JSON.parse(readFileSync(destination, 'utf8')), ledger);
  const rewritten = { schemaVersion: 1, entries: [decision({ subjectKey: finding.hardcode.subjectKey, reason: 'เขียนทับประวัติ' })] };
  writeFileSync(policy, JSON.stringify(rewritten, null, 2));
  assert.equal(run([...base, '--authorize-output', destination], () => {}), 2);
  assert.deepEqual(JSON.parse(readFileSync(destination, 'utf8')), ledger);
});
