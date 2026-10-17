import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, existsSync, symlinkSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { mirrors, assertMirror, assertOutputPath } from '../tools/sync.mjs';
import { assertBundleFiles } from '../tools/host-adapters.mjs';
import { installIde } from '../tools/install-host.mjs';
import { packageRoot, json, within, validateReport } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { checkText, checkRuntimeInstruction } from '../tools/validate.mjs';
import { fixture, cs, dotnetPath } from './helpers.mjs';

const hosts = json(path.join(packageRoot, 'config/hosts.json'));
test('marketplace sources resolve to full runtime bundles and versions agree', () => {
  const version = json(path.join(packageRoot, 'package.json')).version;
  const codex = json(path.join(packageRoot, '.agents/plugins/marketplace.json'));
  const claude = json(path.join(packageRoot, '.claude-plugin/marketplace.json'));
  assert.equal(codex.plugins[0].source.path, './' + hosts.sharedBundle);
  assert.equal(claude.plugins[0].source, './' + hosts.sharedBundle);
  for (const rel of ['plugin.json', '.codex-plugin/plugin.json', '.claude-plugin/plugin.json', 'gemini-extension.json']) {
    const manifest = json(path.join(packageRoot, hosts.sharedBundle, rel));
    assert.equal(manifest.name, hosts.pluginName); assert.equal(manifest.version, version);
    assert(!manifest.hooks && !manifest.mcpServers);
  }
  assert.deepEqual(Object.keys(json(path.join(packageRoot, hosts.antigravityBundle, 'plugin.json'))).sort(), ['description', 'name']);
});

test('all generated bundle links and instruction scope remain self-contained without private files', () => {
  const output = mirrors();
  for (const root of [hosts.sharedBundle, hosts.antigravityBundle, hosts.portableBundle]) {
    const files = Object.keys(output).filter(p => p.startsWith(root + '/'));
    const allowed = new Set(files.map(p => path.join(packageRoot, p)));
    for (const rel of files) {
      assert(!/(^|\/)(\.agrimap-agent|\.git|tests|tools)(\/|$)/.test(rel));
      checkRuntimeInstruction(output[rel], rel);
      if (rel.endsWith('.md')) checkText(output[rel], path.join(packageRoot, rel), allowed);
    }
  }
  assert.equal(Object.keys(output).filter(p => p.startsWith(hosts.portableBundle + '/') && p.endsWith('/SKILL.md')).length, 1);
});

test('native bundles run from an unrelated cwd without a checkout/cache path dependency', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  for (const bundle of [hosts.sharedBundle, hosts.antigravityBundle]) {
    const runner = path.join(packageRoot, bundle, 'skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs');
    const report = validateReport(JSON.parse(execFileSync(process.execPath, [runner, 'scan', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--dotnet', dotnetPath], { cwd: f.output, windowsHide: true, encoding: 'utf8' })));
    assert.equal(report.scanStatus, 'completed'); assert.equal(report.findings.length, 1);
    assert(!JSON.stringify(report).includes(packageRoot));
  }
});

test('IDE installer copies the full isolated skill once, preserving other profile contents', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  const parent = path.join(f.home, 'skills'); mkdirSync(parent);
  const destination = path.join(parent, 'agm-lint');
  installIde(destination);
  assert(existsSync(path.join(destination, 'SKILL.md')));
  assert.throws(() => installIde(destination));
  assert.throws(() => installIde(path.join(parent, 'wrong-name')));
  const indirect = path.join(f.home, 'skill-link');
  symlinkSync(parent, indirect, process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => installIde(path.join(indirect, 'agm-lint')));
  const runner = path.join(destination, 'payload/skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs');
  const report = validateReport(JSON.parse(execFileSync(process.execPath, [runner, 'scan', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--dotnet', dotnetPath], { cwd: f.output, windowsHide: true, encoding: 'utf8' })));
  assert.equal(report.findings.length, 1);
});

test('stale payload/private extra files are rejected instead of silently shipping', () => {
  assert.throws(() => assertBundleFiles(['SKILL.md', '.agrimap-agent/history.md'], ['SKILL.md']));
  assert.throws(() => assertMirror('modified installed mirror', 'canonical expected mirror'));
  assert.throws(() => assertOutputPath(path.resolve(packageRoot, '..', 'outside-host-cache.json')));
});
