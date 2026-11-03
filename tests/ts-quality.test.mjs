import test from 'node:test';
import assert from 'node:assert/strict';
import { bindings, catalog } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { tsQualityObservations, tsQualityChecks } from '../skills/agrimap-golden-lint-skills/scripts/ts-quality.mjs';
import { remediation } from '../skills/agrimap-golden-lint-skills/scripts/render.mjs';

const ts = 'apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts';
const lines = (check, text, file = ts) => tsQualityObservations(text, { tsQualityCheck: check }, { path: file }).map(o => o.line);
const ifs = n => Array.from({ length: n }, (_, i) => `    if (v === ${i}) { throw new Error('e'); }`).join('\n');

test('bindings, catalog and remediation cover every TypeScript quality check in both FE lanes', () => {
  const quality = bindings.filter(r => r.tsQualityCheck);
  assert.deepEqual([...new Set(quality.map(r => r.tsQualityCheck))].sort(), [...tsQualityChecks].sort());
  assert.deepEqual([...new Set(quality.map(r => r.lane))].sort(), ['fe-library', 'fe-main']);
  for (const rule of quality) {
    assert.equal(rule.goldenRuleId, rule.tsQualityCheck);
    assert.equal(rule.tier, rule.tsQualityCheck === 'ADV-19' ? 'SHOULD' : 'MUST');
    assert(catalog.some(f => f.lane === rule.lane && f.detectorIds.includes(rule.detectorId)), rule.detectorId);
    assert.equal(remediation.detectors[rule.detectorId]?.tag, rule.tsQualityCheck, rule.detectorId);
  }
});

test('QUALITY-01 counts if decisions per function and keeps nested functions apart', () => {
  const text = [
    'export class Api {',
    '  validate({ mode, from }: { mode: string; from: string }): void {',
    ifs(8),
    '  }',
    '  ok(v: number): void {',
    ifs(7),
    '    const inner = () => { if (v) { return; } };',
    '  }',
    '}'
  ].join('\n');
  assert.deepEqual(lines('QUALITY-01', text), [2]);
  assert.deepEqual(lines('QUALITY-01', text, 'apps/web/x/src/types.d.ts'), []);
});

test('QUALITY-02 counts top-level parameters, destructured objects as one', () => {
  const text = [
    'function many(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number): void {}',
    'function seven(a: number, b: number, c: number, d: number, e: number, f: number, g: Map<string, number>): void {}',
    'const one = ({ a, b, c, d, e, f, g, h }: Options) => { return a; };'
  ].join('\n');
  assert.deepEqual(lines('QUALITY-02', text), [1]);
});

test('ADV-19 flags the void operator and skips void types', () => {
  const text = [
    'if (from && to) void this.facade.load(from, to);',
    'void promise;',
    'let p: Promise<void>; type F = () => void; function f(): void {}',
    'const x = void 0;'
  ].join('\n');
  assert.deepEqual(lines('ADV-19', text), [1, 2]);
});
