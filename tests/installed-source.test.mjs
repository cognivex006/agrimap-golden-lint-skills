import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { sourceHandshake, scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { canonical, lock } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { fixture, cs } from './helpers.mjs';

function manifest(f, file, value) {
  const target = path.join(f.golden, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, typeof value === 'string' ? value : JSON.stringify(value));
}
for (const file of ['.codex-plugin/plugin.json', '.claude-plugin/plugin.json', 'gemini-extension.json', 'plugin.json']) {
  test(`installed Golden accepts ${file} without root package.json`, t => {
    const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
    unlinkSync(path.join(f.golden, 'package.json'));
    manifest(f, file, { name: lock.packageName, version: lock.expectedVersion });
    const source = sourceHandshake(f.golden, 'installed');
    assert.equal(source.sourceOk, true);
    assert.equal(source.provenance.identitySource, file);
    assert.equal(source.provenance.activeVersion, lock.expectedVersion);
    assert.equal(scan(f.args).scanStatus, 'completed');
    assert.equal(scan(f.args).findings.length, 1);
    assert.equal(sourceHandshake(f.golden, 'checkout').sourceOk, false);
  });
}
test('installed identity does not fall back around invalid or conflicting metadata', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  manifest(f, '.codex-plugin/plugin.json', { name: lock.packageName, version: lock.expectedVersion });
  for (const bad of ['{broken', { name: lock.packageName, version: '99.0.0' }, { name: 'private-person@example.invalid', version: lock.expectedVersion }]) {
    manifest(f, 'package.json', bad);
    const source = sourceHandshake(f.golden, 'installed');
    assert.equal(source.sourceOk, false);
    assert.equal(scan(f.args).scanStatus, 'partial');
    assert(!canonical(source).includes('private-person'));
  }
  manifest(f, 'package.json', { name: lock.packageName, version: lock.expectedVersion });
  manifest(f, '.codex-plugin/plugin.json', { name: lock.packageName, version: '99.0.0' });
  assert.equal(sourceHandshake(f.golden, 'installed').sourceOk, false);
});
test('manifest mutation during a scan is disclosed as source drift', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  const report = scan({ ...f.args, beforeRecheck: () => manifest(f, '.codex-plugin/plugin.json', { name: lock.packageName, version: lock.expectedVersion }) });
  assert.equal(report.snapshot.inputDrift, true);
  assert.equal(report.scanStatus, 'partial');
});
test('matching metadata does not bypass reference drift; versionless plugin alone is insufficient', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  unlinkSync(path.join(f.golden, 'package.json'));
  manifest(f, 'plugin.json', { name: lock.packageName });
  assert.equal(sourceHandshake(f.golden, 'installed').sourceOk, false);
  manifest(f, '.codex-plugin/plugin.json', { name: lock.packageName, version: lock.expectedVersion });
  assert.equal(sourceHandshake(f.golden, 'installed').sourceOk, true);
  writeFileSync(path.join(f.golden, 'skills/agrimap-agent-skills/references/patterns/csharp.md'), 'drift');
  assert.equal(scan(f.args).scanStatus, 'partial');
  assert.equal(scan(f.args).findings.length, 0);
});
