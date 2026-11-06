import test from 'node:test';
import assert from 'node:assert/strict';
import { bindings, catalog } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { advisoryObservations, advisoryChecks } from '../skills/agrimap-golden-lint-skills/scripts/advisory.mjs';
import { remediation } from '../skills/agrimap-golden-lint-skills/scripts/render.mjs';

const cs = 'services/agmws-fixture-netcore/Src/Application/UseCases/OAuthUseCase.cs';
const ts = 'apps/web/agmwa-fixture/src/app/core/release.ts';
const lines = (check, text, file = ['ADV-15', 'ADV-16'].includes(check) ? ts : cs) => advisoryObservations(text, { advisoryCheck: check }, { path: file }).map(o => o.line);

test('bindings, catalog and remediation cover every advisory text check', () => {
  const advisory = bindings.filter(r => r.advisoryCheck);
  assert.deepEqual([...new Set(advisory.map(r => r.advisoryCheck))].sort(), [...advisoryChecks].sort());
  for (const rule of advisory) {
    assert.equal(rule.goldenRuleId, rule.advisoryCheck);
    assert.equal(rule.tier, 'SHOULD');
    // Numbered ADV rows live in sonarqube-remediation.md; unnumbered Golden 6.1.2 rows (CS1998, S6582, ...) in the language file.
    assert.equal(rule.entry, rule.advisoryCheck.startsWith('ADV-') ? 'references/sonarqube-remediation.md' : `references/patterns/sonarqube/${rule.lane.startsWith('be') ? 'csharp' : 'typescript'}.md`);
    assert.equal(rule.minimumEvidenceLevel, 'text');
    assert(catalog.some(f => f.lane === rule.lane && f.detectorIds.includes(rule.detectorId)), rule.detectorId);
    assert.equal(remediation.detectors[rule.detectorId]?.tag, rule.advisoryCheck, rule.detectorId);
    assert.equal(remediation.detectors[rule.detectorId].advisory, true, rule.detectorId);
  }
});

test('ADV-11 flags one-char string overloads only', () => {
  const text = [
    'var a = url.StartsWith("/") ? url : "/" + url;',
    'var b = url.EndsWith("?");',
    'var c = url.IndexOf("\\n");',
    'var d = url.StartsWith("//");',
    'var e = url.StartsWith(\'/\');',
    'var f = name.StartsWith("a", StringComparison.OrdinalIgnoreCase);',
    'var g = name.StartsWith("a", StringComparison.Ordinal);',
    'var h = url.StartsWith($"{x}");',
    '// url.StartsWith("/")'
  ].join('\n');
  assert.deepEqual(lines('ADV-11', text), [1, 2, 3, 7]);
  assert.deepEqual(lines('ADV-11', text, ts), []);
});

test('ADV-15 flags match with a non-global regex literal', () => {
  const text = [
    'const nuget = line.match(/Include="(AgriMap\\.[\\w.]+)"/);',
    'const npm = line.match(/"(@agrimap\\/[a-z0-9._-]+)"\\s*:/i);',
    'const all = line.match(/x/g);',
    'const v = line.match(pattern);',
    'const r = /x/.exec(line);'
  ].join('\n');
  assert.deepEqual(lines('ADV-15', text), [1, 2]);
});

test('ADV-16 flags verbose classes without i/u/v flags', () => {
  const text = [
    'const a = /(AgriMap\\.[A-Za-z0-9_]+)/;',
    'const b = /^[0-9]+$/;',
    'const c = /[A-Za-z0-9_]/i;',
    'const d = /[\\w.]+/;',
    'const e = /[0-9a-f]+/;'
  ].join('\n');
  assert.deepEqual(lines('ADV-16', text), [1, 2]);
});

test('observations are advisory review candidates without literal values', () => {
  const [o] = advisoryObservations('x.StartsWith("Z");', { advisoryCheck: 'ADV-11' }, { path: cs });
  assert.equal(o.disposition, 'review-candidate');
  assert.match(o.observation, /Advisory \(QUALITY-05\)/);
  assert.doesNotMatch(o.observation, /"Z"/);
});

test('ADV-10/14/17/18 flag the C# shapes and skip their safe variants', () => {
  assert.deepEqual(lines('ADV-10', 'var a = Request.Headers["Authorization"];\nvar b = Request.Headers["token"];\nvar c = Request.Headers.Authorization;'), [1]);
  assert.deepEqual(lines('ADV-14', 'foreach (var s in Z)\n{\n    if (F(s))\n    {\n        return 1;\n    }\n}\nforeach (var k in K) { if (a) { x(); } y(); }\nforeach (var k in K) { if (a) { x(); } else { z(); } }'), [1]);
  assert.deepEqual(lines('ADV-17', 'var t = ctx.Request.Headers.ContainsKey("token")\n    ? ctx.Request.Headers["token"].ToString() : null;\nif (d.ContainsKey(k)) d[k] = 1;\nif (d.TryGetValue(k, out var v)) Use(v);'), [1]);
  assert.deepEqual(lines('ADV-18', 'using (var sha256 = SHA256.Create())\n{\n    var h = sha256.ComputeHash(b);\n}\nvar z = MD5.Create().ComputeHash(b);\nvar y = SHA256.HashData(b);'), [1, 5]);
});
