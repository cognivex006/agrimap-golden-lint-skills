import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scan, sourceDependencies } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { bindings, lock } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { fixture, parserPath, fe, store } from './helpers.mjs';

const corpus = JSON.parse(readFileSync(new URL('./fixtures/conformance/fe-cases.json', import.meta.url)));
const paths = { component: fe, store,
  library: 'standards/libraries/angular/agrimap-platform/projects/dynamic-lut/src/lib/demo.ts',
  generated: fe.replace('/features/demo/demo.component.ts', '/generated-apis/demo.ts') };

test('all admitted source dependencies are explicitly pinned', () => {
  for (const rule of bindings) {
    assert(rule.sourceDependencies.length > 0, rule.detectorId);
    for (const file of sourceDependencies(rule)) assert(lock.files[file], `${rule.detectorId}: ${file}`);
  }
  assert.equal(corpus.reviewStatus, 'pending-owner-review');
});

for (const item of corpus.cases) test(`provisional conformance: ${item.id}`, { skip: !parserPath }, t => {
  const f = fixture(t, Object.fromEntries(Object.entries(item.files).map(([kind, text]) => [paths[kind], text])));
  const report = scan(f.args);
  assert.equal(report.scanStatus, 'completed');
  const actual = {};
  for (const finding of report.findings) (actual[finding.detectorId] ||= []).push(finding.disposition);
  assert.deepEqual(actual, item.expected);
  // A syntax/name match must not turn an unresolved framework identity into an exception or architecture verdict.
  for (const finding of report.findings.filter(f => ['fe-component-dependency', 'fe-store-await'].includes(f.detectorId))) {
    assert.equal(finding.applicability, 'unknown');
    assert.equal(finding.disposition, 'review-candidate');
  }
});
