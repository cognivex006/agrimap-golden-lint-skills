import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sourceHandshake, scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { canonical, sourceRequirements } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { fixture, cs, GOLDEN_VERSION } from './helpers.mjs';

function manifest(f, file, value) {
  const target = path.join(f.golden, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
}
for (const file of ['.codex-plugin/plugin.json', '.claude-plugin/plugin.json', 'gemini-extension.json', 'plugin.json']) {
  test(`installed Golden accepts ${file} without root package.json`, t => {
    const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
    unlinkSync(path.join(f.golden, 'package.json'));
    manifest(f, file, { name: sourceRequirements.packageName, version: GOLDEN_VERSION });
    const source = sourceHandshake(f.golden, 'installed');
    assert.equal(source.sourceOk, true);
    assert.equal(source.provenance.identitySource, file);
    assert.equal(source.provenance.activeVersion, GOLDEN_VERSION);
    assert.equal(scan(f.args).scanStatus, 'completed');
    assert.equal(scan(f.args).findings.length, 1);
    assert.equal(sourceHandshake(f.golden, 'checkout').sourceOk, false);
  });
}
test('installed identity does not fall back around invalid or conflicting metadata', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  manifest(f, '.codex-plugin/plugin.json', { name: sourceRequirements.packageName, version: GOLDEN_VERSION });
  for (const bad of ['{broken', { name: sourceRequirements.packageName, version: '99.0.0' }, { name: 'private-person@example.invalid', version: GOLDEN_VERSION }]) {
    manifest(f, 'package.json', bad);
    const source = sourceHandshake(f.golden, 'installed');
    assert.equal(source.sourceOk, false);
    assert.equal(scan(f.args).scanStatus, 'partial');
    assert(!canonical(source).includes('private-person'));
  }
  manifest(f, 'package.json', { name: sourceRequirements.packageName, version: GOLDEN_VERSION });
  manifest(f, '.codex-plugin/plugin.json', { name: sourceRequirements.packageName, version: '99.0.0' });
  const conflict = sourceHandshake(f.golden, 'installed');
  assert.equal(conflict.sourceOk, false);
  assert(conflict.diagnostics.includes('SOURCE_IDENTITY_CONFLICT'));
});
test('any Golden release runs every rule; changed reference text is not drift, a missing file blocks', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  for (const file of ['package.json', '.codex-plugin/plugin.json']) manifest(f, file, { name: sourceRequirements.packageName, version: '99.0.0' });
  const source = sourceHandshake(f.golden, 'installed');
  assert.equal(source.sourceOk, true);
  assert.equal(source.provenance.activeVersion, '99.0.0');
  assert(!source.diagnostics.some(d => d.startsWith('SOURCE_VERSION')));
  assert(source.provenance.identitySources.every(r => r.status === 'verified'));
  const file = 'references/patterns/checklists/backend-main.md';
  writeFileSync(path.join(f.golden, 'skills/agrimap-agent-skills', file), 'newer Golden wording');
  const report = scan(f.args);
  assert.equal(report.scanStatus, 'completed');
  assert.equal(report.findings.length, 1);
  unlinkSync(path.join(f.golden, 'skills/agrimap-agent-skills', file));
  const missing = scan(f.args);
  assert.equal(missing.rules.find(r => r.detectorId === 'be-namespace-observation').executionStatus, 'blocked');
  assert(missing.sourceDiagnostics.includes(`SOURCE_MISSING:${file}`));
});
test('manifest mutation during a scan is disclosed as source drift', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  const report = scan({ ...f.args, beforeRecheck: () => manifest(f, '.codex-plugin/plugin.json', { name: sourceRequirements.packageName, version: GOLDEN_VERSION }) });
  assert.equal(report.snapshot.inputDrift, true);
  assert.equal(report.scanStatus, 'partial');
});
test('matching metadata does not bypass a missing reference; versionless plugin alone is insufficient', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  unlinkSync(path.join(f.golden, 'package.json'));
  manifest(f, 'plugin.json', { name: sourceRequirements.packageName });
  assert.equal(sourceHandshake(f.golden, 'installed').sourceOk, false);
  manifest(f, '.codex-plugin/plugin.json', { name: sourceRequirements.packageName, version: GOLDEN_VERSION });
  assert.equal(sourceHandshake(f.golden, 'installed').sourceOk, true);
  unlinkSync(path.join(f.golden, 'skills/agrimap-agent-skills/references/patterns/csharp.md'));
  assert.equal(scan(f.args).scanStatus, 'partial');
  assert.equal(scan(f.args).findings.length, 0);
});
