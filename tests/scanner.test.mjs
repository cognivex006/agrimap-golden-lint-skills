import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, readFileSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { classify, canonical, digest, validateReport, renderMarkdown, lock, packageRoot } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { scan, sourceHandshake } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { run, exportReport } from '../skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs';
import { fixture, treeDigest, parserPath, fe, store, cs, sql } from './helpers.mjs';

test('all target lanes/profiles; reference/generated/test exclusions', () => {
  const cases = {
    [fe]: 'fe-main',
    'standards/libraries/angular/agrimap-platform/projects/demo/src/public-api.ts': 'fe-library',
    [cs]: 'be-main',
    'jobs/agmbo-demo-netcore/Src/Presentation/Controllers/Demo.cs': 'be-main',
    'standards/libraries/netcore/AgriMap.Platform/AgriMap.Platform/Src/Demo.cs': 'be-library',
    [sql]: 'sql-procedure',
    'services/agmws-demo/sql/DEMO/table/DEMO.sql': 'sql-table'
  };
  for (const [file, lane] of Object.entries(cases)) assert.equal(classify(file).lane, lane);
  assert.equal(classify('jobs/agmbo-demo-netcore/Src/Presentation/Controllers/Demo.cs').profile, 'agmbo');
  for (const file of ['infra/database/X.sql', fe.replace('features', 'generated-apis'), fe.replace('.ts', '.spec.ts'), 'services/agmws-demo/docs/system-reference/sources/X.sql', 'services/agmws-demo/schema/X.sql']) assert.equal(classify(file).selected, false);
});

test('lexical positive/negative/adversarial cases do not assert semantic violations', t => {
  const f = fixture(t, { [cs]: '// namespace Bad.Name;\nvar s = "namespace Bad.Name;";\nnamespace AgriMap.Web.Service.Application.Models;\npublic class Demo {}', [sql]: "-- CREATE PROC fake\nSELECT 'CREATE PROCEDURE fake';\nALTER PROCEDURE [agrimap_app].[DEMO_Q] AS SELECT 1;" });
  const report = scan(f.args);
  assert.equal(report.scanStatus, 'completed');
  assert.equal(report.findings.length, 2);
  assert(report.findings.every(f => f.disposition === 'review-candidate' && f.remediation.impact === 'unknown'));
  f.put(cs, 'namespace AgriMap.Web.Service.Presentation.Controllers; public class Demo {}');
  f.put(sql, 'CREATE OR ALTER PROCEDURE [agrimap_app].[DEMO_Q] AS SELECT 1;');
  assert.equal(scan(f.args).findings.length, 0);
});

test('T6 AST positives, text false positives, decorator exception and duplicate IDs', { skip: !parserPath }, t => {
  const f = fixture(t, { [fe]: `// any!\nconst text = 'any!';\nclass Demo { first: any; second: any; value = source!; @ViewChild('x', {static: true}) item!: ElementRef; }` });
  const report = scan(f.args);
  assert.equal(report.scanStatus, 'completed');
  assert.equal(report.findings.filter(f => f.detectorId === 'fe-explicit-any').length, 2);
  assert.equal(report.findings.filter(f => f.detectorId === 'fe-non-null').length, 2);
  assert.equal(new Set(report.findings.map(f => f.findingId)).size, 4);
  assert.equal(report.findings.filter(f => f.disposition === 'review-candidate').length, 1);
  f.put(fe, 'class Demo { first: unknown; value = source ?? null; }');
  assert.equal(scan(f.args).findings.length, 0);
});

test('architecture aliases/collisions only candidates; store await parsed, providers alone clean', { skip: !parserPath }, t => {
  const f = fixture(t, { [fe]: "import { inject as obtain } from '@angular/core'; class Demo { store=obtain(Alias); }", [store]: 'class DemoStore { async load(){ await task; } }' });
  const report = scan(f.args);
  assert(report.findings.some(f => f.detectorId === 'fe-component-dependency'));
  assert(report.findings.some(f => f.detectorId === 'fe-store-await'));
  assert(report.findings.every(f => f.disposition === 'review-candidate'));
  f.put(fe, 'const inject = () => 1; class Demo { value = inject(); providers = [DemoStore]; }');
  assert(!scan(f.args).findings.some(f => f.detectorId === 'fe-component-dependency'));
});

test('store call aliases and backend namespace references are bounded review outcomes', { skip: !parserPath }, t => {
  const f = fixture(t, { [store]: "import { firstValueFrom as first } from 'rxjs'; class DemoStore { load(){ first(task); } }", [cs]: 'using AgriMap.Web.Service.Application.Models; namespace AgriMap.Web.Service.Application.UseCases; public class OAuthUseCase {}' });
  const report = scan(f.args);
  assert(report.findings.some(f => f.detectorId === 'fe-store-await'));
  assert(report.findings.some(f => f.detectorId === 'be-namespace-observation'));
  assert(report.findings.every(f => f.disposition === 'review-candidate'));
});

test('missing/untrusted parser blocks syntax without executing chosen code; lexical rules continue', t => {
  const f = fixture(t, { [fe]: 'let x: any;', [cs]: 'namespace Bad.Name;' });
  const bad = path.join(f.output, 'parser.js'); writeFileSync(bad, 'throw new Error("must not run");');
  for (const typescript of [undefined, bad]) {
    const report = scan({ ...f.args, typescript });
    assert.equal(report.scanStatus, 'partial');
    assert(report.findings.some(f => f.detectorId === 'be-namespace-observation'));
    assert(report.rules.some(r => r.executionStatus === 'blocked'));
  }
});

test('source missing/drift blocks only affected authoritative bindings', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;', [sql]: 'CREATE PROCEDURE X AS SELECT 1;' });
  const file = 'skills/agrimap-agent-skills/references/patterns/csharp.md';
  writeFileSync(path.join(f.golden, file), 'changed authority');
  const report = scan(f.args);
  assert.equal(report.scanStatus, 'partial');
  assert(!report.findings.some(f => f.detectorId === 'be-namespace-observation'));
  assert(report.findings.some(f => f.detectorId === 'sql-procedure-declaration'));
  assert(sourceHandshake(f.golden, 'installed').diagnostics.length > 0);
  assert.throws(() => sourceHandshake(f.golden, 'auto'));
});

test('unexpected source package identities are hashed without reflecting sensitive values', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  writeFileSync(path.join(f.golden, 'package.json'), JSON.stringify({ name: 'private-person@example.invalid', version: 'Bearer abcdefghijklmnopqrstuvwxyz' }));
  const report = scan(f.args);
  assert.equal(report.scanStatus, 'partial');
  assert.equal(report.provenance.packageName, null);
  assert.equal(report.provenance.activeVersion, null);
  assert(!canonical(report).includes('private-person') && !canonical(report).includes('Bearer'));
});

test('canonical JSON/Markdown repeat; line/comments preserve finding ID and baseline attribution', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  const base = scan(f.args), repeated = scan(f.args);
  assert.equal(canonical(base), canonical(repeated));
  assert.equal(renderMarkdown(base), renderMarkdown(repeated));
  f.put(cs, '// comment shift\n\nnamespace Bad.Name;');
  const next = scan({ ...f.args, baseline: base });
  assert.equal(next.findings[0].findingId, base.findings[0].findingId);
  assert.equal(next.findings[0].changeOrigin, 'pre-existing');
  assert.equal(next.findings[0].codeScope, 'modified');
  assert.equal(next.findings.length, 1);
  f.put(cs, 'namespace Another.Bad;');
  assert.equal(scan({ ...f.args, baseline: base }).findings[0].changeOrigin, 'unknown');
  const incompatible = structuredClone(base); incompatible.analysisContract.detectorRevision++;
  delete incompatible.reportId; incompatible.reportId = digest(incompatible);
  assert.equal(scan({ ...f.args, baseline: incompatible }).comparison.comparisonStatus, 'not-comparable');
});

test('input drift produces partial/stale evidence, no hiding observations', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  const report = scan({ ...f.args, beforeRecheck: () => f.put(cs, 'namespace Another.Bad;') });
  assert.equal(report.scanStatus, 'partial'); assert.equal(report.snapshot.inputDrift, true); assert.equal(report.findings.length, 1);
});

test('no-write filesystem snapshots include ignored/untracked/generated/Golden/docs/records', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;', 'untracked.txt': 'owner text', '.gitignore': 'ignored.txt', 'ignored.txt': 'ignored', 'docs/README.md': 'do not change', 'CHANGELOG.md': 'do not change', '.agrimap-agent/record.json': '{}', 'generated/Api.cs': 'namespace Bad.Name;', 'package.json': '{"scripts":{"scan":"throw"}}' });
  const before = treeDigest(f.home);
  const packageDocs = ['README.md', 'CHANGELOG.md', 'AGENTS.md', 'DEVELOPMENT.md'].map(file => readFileSync(path.join(packageRoot, file), 'utf8'));
  const report = scan(f.args);
  assert.equal(treeDigest(f.home), before);
  assert.deepEqual(['README.md', 'CHANGELOG.md', 'AGENTS.md', 'DEVELOPMENT.md'].map(file => readFileSync(path.join(packageRoot, file), 'utf8')), packageDocs);
  assert.equal(report.coverage.discovered, report.coverage.selected + report.coverage.excluded);
  assert(!report.files.some(f => f.path.includes('.agrimap-agent/record')));
});

test('report retains lane boundaries and suffix candidates never become business violations', t => {
  const f = fixture(t, {
    'jobs/agmbo-fixture/Src/Presentation/Controllers/Result.cs': 'namespace AgriMap.Worker.Presentation.Controllers; public class ResultController { public IActionResult Get() => null; }',
    'standards/libraries/angular/agrimap-platform/projects/dynamic-lut/src/public-api.ts': "export { Facade, Store, TOKEN as ENVIRONMENT_INJECT_DYNAMIC_LUT } from './lib/contract';",
    'standards/libraries/netcore/AgriMap.Platform/AgriMap.Platform/Src/Demo.cs': 'public class Demo {}',
    'services/agmws-fixture/sql/LM/table/LM.sql': 'CREATE TABLE LM (ID INT);',
    [sql]: 'CREATE OR ALTER PROCEDURE [agrimap_app].[LM_LICENSE_IMPORT_COMMIT] AS SELECT 1;'
  });
  const report = scan(f.args);
  assert.equal(report.scanStatus, 'completed');
  assert.equal(report.findings.length, 6);
  assert(report.findings.every(f => f.disposition === 'review-candidate'));
  assert(!report.findings.some(f => f.path.startsWith('jobs/')));
  assert(report.findings.filter(f => f.path === sql).every(f => f.detectorId === 'sql-procedure-naming' && f.applicability === 'unknown'));
  assert(report.catalog.some(f => f.implementationStatus === 'not-implemented' && f.selectedLaneFiles > 0));
});

test('export refuses roots/existing files/indirection; writes only new external file', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' }); const report = scan(f.args);
  const inside = path.join(f.root, 'report.md');
  assert.throws(() => exportReport(report, inside, inside, [f.root, f.golden]));
  const goldenDest = path.join(f.golden, 'report.md'); assert.throws(() => exportReport(report, goldenDest, goldenDest, [f.root, f.golden]));
  const dest = path.join(f.output, 'report.md');
  assert.throws(() => exportReport(report, dest, 'no', [f.root, f.golden]));
  exportReport(report, dest, dest, [f.root, f.golden]);
  assert.equal(readFileSync(dest, 'utf8'), renderMarkdown(report));
  assert.throws(() => exportReport(report, dest, dest, [f.root, f.golden]));
  const link = path.join(f.home, 'junction');
  symlinkSync(f.root, link, process.platform === 'win32' ? 'junction' : 'dir');
  const indirect = path.join(link, 'report.md');
  assert.throws(() => exportReport(report, indirect, indirect, [f.root, f.golden]));
});

test('explain/export bind to retained identity and do not rescan changed source', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' }); const report = scan(f.args);
  const envelope = path.join(f.output, 'envelope.json'); writeFileSync(envelope, JSON.stringify({ report, protectedRoots: [f.root, f.golden] }));
  f.put(cs, 'totally changed');
  let output = '';
  assert.equal(run(['explain', '--report', envelope, '--report-id', report.reportId, '--finding-id', report.findings[0].findingId], s => output += s), 0);
  assert.equal(JSON.parse(output).finding.findingId, report.findings[0].findingId);
  assert.equal(run(['explain', '--report', envelope, '--report-id', 'wrong', '--finding-id', 'x'], () => {}), 2);
  assert.equal(run(['scan', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--fix', 'true'], () => {}), 2);
});

test('findings do not fail scan; required parser failures yield exit 3', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  assert.equal(run(['scan', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--dotnet', f.args.dotnet], () => {}), 0);
  f.put(fe, 'let x: any;');
  assert.equal(run(['scan', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--dotnet', f.args.dotnet], () => {}), 3);
});

test('schemas reject invalid states, duplicate IDs, no-effect without proof and sensitive examples', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' }); const report = scan(f.args);
  const mutate = change => { const x = structuredClone(report); change(x); delete x.reportId; x.reportId = digest(x); return x; };
  for (const x of [mutate(x => x.findings[0].remediation.impact = 'safe'), mutate(x => x.findings.push(x.findings[0])), mutate(x => x.findings[0].remediation.impact = 'no-effect-proven'), mutate(x => x.findings[0].observation = 'Bearer abcdefghijklmnopqrstuvwxyz'), mutate(x => x.rules[0].executionStatus = 'error')]) assert.throws(() => validateReport(x));
});

test('local relative alias/re-export resolution, unresolved external identities stay review candidates', { skip: !parserPath }, t => {
  const relative = fe.replace('/features/demo/demo.component.ts', '/domain/demo/demo.store.ts');
  const barrel = fe.replace('/features/demo/demo.component.ts', '/domain/index.ts');
  const f = fixture(t, { [relative]: 'export class DemoStore {}', [barrel]: "export { DemoStore as Alias } from './demo/demo.store';", [fe]: "import { inject as obtain } from '@angular/core'; import { Alias } from '../../domain'; class Demo { state = obtain(Alias); }" });
  const candidate = scan(f.args).findings.find(f => f.detectorId === 'fe-component-dependency');
  assert.equal(candidate.symbolResolution.status, 'resolved-local-declaration');
  assert.equal(candidate.symbolResolution.declarations[0].path, relative);
  assert.equal(candidate.disposition, 'review-candidate');
  f.put(fe, "import { inject } from '@angular/core'; import { Alias } from '@unresolved'; class Demo { state = inject(Alias); }");
  assert.equal(scan(f.args).findings.find(f => f.detectorId === 'fe-component-dependency').symbolResolution.status, 'unresolved');
});

test('immutable Git refs compare blobs without changing ignored/untracked/index/ref state', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;', '.gitignore': 'ignored.txt\n' });
  const git = args => execFileSync('git', ['-C', f.root, ...args], { stdio: 'pipe', windowsHide: true }).toString().trim();
  git(['init']); git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'add', cs, '.gitignore']);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture base']);
  const base = git(['rev-parse', 'HEAD']);
  f.put(cs, '// touched\nnamespace Bad.Name;');
  git(['add', cs]); git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture target']);
  const target = git(['rev-parse', 'HEAD']);
  f.put('ignored.txt', 'unchanged'); f.put('untracked.txt', 'unchanged');
  const before = treeDigest(f.root);
  const report = scan({ ...f.args, baseRef: base, targetRef: target });
  assert.equal(report.snapshot.commit, target); assert.equal(report.comparison.baseSnapshot.commit, base);
  assert.equal(report.findings[0].changeOrigin, 'pre-existing');
  assert.equal(treeDigest(f.root), before);
  assert.throws(() => scan({ ...f.args, baseRef: '--help' }));
  assert.throws(() => scan({ ...f.args, baseRef: 'missing-ref' }));
  assert.throws(() => scan({ ...f.args, baseRef: base, baseline: report }));
});
