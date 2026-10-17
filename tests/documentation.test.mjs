import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
import { validate, checkText, checkChangelog, runtimeFiles, checkRuntimeInstruction, checkPublicGuides } from '../tools/validate.mjs';
import { sync, mirrors, assertMirror } from '../tools/sync.mjs';
import { packageRoot } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';

test('source/runtime docs, operation grammar, schemas and generated adapters validate', () => assert(validate().documents > 0));
test('sync idempotence and no upstream/product repair surface', () => {
  sync(true);
  assert(Object.keys(mirrors()).every(p => /^(skills\/|plugins\/|\.agents\/plugins\/|\.claude-plugin\/|\.cursor-plugin\/)/.test(p)));
  assert(Object.keys(mirrors()).includes('.agents/plugins/marketplace.json'));
  assert(runtimeFiles().every(f => !/(AGENTS|DEVELOPMENT|MAINTAINING)\.md$/.test(f)));
});
test('negative docs fixtures detect links/anchors/grammar/chat/write/availability/redaction', () => {
  const file = path.join(packageRoot, 'README.md');
  const bad = ['[broken](missing.md)', '[anchor](README.md#does-not-exist)', '```powershell\n$agm-lint scan project\n```', '```powershell\nnode skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs install\n```', '```powershell\nnode skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan --fix true\n```', '```powershell\nnode skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs export --report x --report-id x --to x --authorize-output x\n```', 'published plugin available', 'Bearer abcdefghijklmnopqrstuvwxyz'];
  for (const text of bad) assert.throws(() => checkText(text, file));
  assert.throws(() => checkText('[maintainer](DEVELOPMENT.md)', file, new Set(runtimeFiles())));
});
test('changelog duplicate/unreleased/finalization negative fixtures', () => {
  for (const text of ['## Unreleased\n## Unreleased', '## Unreleased\n- same\n- same', '## Unreleased\n## 0.1.0 - 2026-10-14']) assert.throws(() => checkChangelog(text));
});
test('negative mirror/leakage/orphan fixtures, including source-checkout consumer scope', () => {
  assert.throws(() => assertMirror('stale', 'generated'));
  assert.throws(() => checkRuntimeInstruction('<!-- AGM-MAINTAINER-ONLY -->\nmodify docs', 'SKILL.md'));
  assert.throws(() => checkRuntimeInstruction('maintainer rule', 'AGENTS.md'));
  assert.throws(() => checkPublicGuides('home', [path.join(packageRoot, 'docs/USAGE.md')]));
  const scope = readFileSync(path.join(packageRoot, 'AGENTS.md'), 'utf8');
  assert(scope.includes('Consumer') || scope.includes('consumer'));
  assert(scope.includes('do not activate maintainer workflow'));
});
