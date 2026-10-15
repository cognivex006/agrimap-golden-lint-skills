import test from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { fixture, fe, cs, sql } from './helpers.mjs';
import { bindings, lock } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { readFileSync, unlinkSync } from 'node:fs';

for (const source of [
  'references/patterns/frontend.md',
  'references/patterns/gencode-api.md',
  'references/patterns/pattern-status.md',
  'references/patterns/checklists/README.md'
]) test(`authority dependency drift blocks FE rules: ${source}`, t => {
  const f = fixture(t, { [fe]: 'class Demo { value: any; }', [cs]: 'namespace Bad.Name;', [sql]: 'CREATE PROCEDURE X AS SELECT 1;' });
  writeFileSync(path.join(f.golden, 'skills/agrimap-agent-skills', source), 'changed authority');
  const report = scan(f.args);
  const rule = report.rules.find(r => r.detectorId === 'fe-explicit-any');
  assert.equal(rule.executionStatus, 'blocked');
  assert(rule.diagnostics.includes(`SOURCE_DEPENDENCY_UNVERIFIED:${source}`));
  assert(!report.findings.some(r => r.detectorId === 'fe-explicit-any'));
  assert.equal(report.scanStatus, 'partial');
  if (source.includes('frontend.md') || source.includes('gencode-api.md')) {
    assert(report.findings.some(r => r.detectorId === 'be-namespace-observation'));
    assert(report.findings.some(r => r.detectorId === 'sql-procedure-declaration'));
  }
});

test('selected curated entry digests agree with collection manifests', t => {
  const f = fixture(t);
  for (const rule of bindings.filter(r => r.entry.includes('/golden/'))) {
    const manifestFile = `references/patterns/golden/${rule.collection}/manifest.json`;
    const manifest = JSON.parse(readFileSync(path.join(f.golden, 'skills/agrimap-agent-skills', manifestFile)));
    const entry = manifest.examples.find(e => e.fileName === path.posix.basename(rule.entry));
    assert(entry, rule.entry);
    assert.equal(entry.sha256, lock.files[rule.entry]);
    assert.equal(entry.status || manifest.status, rule.sourceStatus);
    assert.equal(entry.evidenceMode || manifest.evidenceMode, 'curated-reference');
  }
});

test('missing normalized BE contract blocks BE only and discloses dependency digests', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;', [sql]: 'CREATE PROCEDURE X AS SELECT 1;' });
  const dependency = 'references/patterns/backend.md';
  unlinkSync(path.join(f.golden, 'skills/agrimap-agent-skills', dependency));
  const report = scan(f.args);
  const rule = report.rules.find(r => r.detectorId === 'be-namespace-observation');
  assert.equal(rule.executionStatus, 'blocked');
  assert.equal(rule.authority.sourceDependencies[dependency], null);
  assert.equal(rule.authority.sourceDependencies['references/patterns/csharp.md'], lock.files['references/patterns/csharp.md']);
  assert(report.findings.some(f => f.detectorId === 'sql-procedure-declaration'));
});
