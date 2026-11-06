import test from 'node:test';
import assert from 'node:assert/strict';
import { advisoryObservations } from '../skills/agrimap-golden-lint-skills/scripts/advisory.mjs';
import { structureChecks } from '../skills/agrimap-golden-lint-skills/scripts/advisory-structure.mjs';
import { bindings } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';

const cs = 'services/agmws-fixture-netcore/Src/Application/UseCases/DemoUseCase.cs';
const ts = 'apps/web/agmwa-fixture/src/app/core/demo.ts';
const lines = (check, text, file) => advisoryObservations(text, { advisoryCheck: check }, { path: file }).map(o => o.line);
const both = (check, text) => ({ cs: lines(check, text, cs), ts: lines(check, text, ts) });

test('every Golden 6.1.2 structure check is bound once per lane of its languages', () => {
  for (const [check, entry] of Object.entries(structureChecks)) {
    const lanes = bindings.filter(r => r.advisoryCheck === check).map(r => r.lane).sort();
    const expected = [...(entry.languages.includes('cs') ? ['be-library', 'be-main'] : []), ...(entry.languages.includes('ts') ? ['fe-library', 'fe-main'] : [])].sort();
    assert.deepEqual(lanes, expected, check);
  }
});

test('ADV-21 reads TODO/FIXME in comments only', () => {
  const text = '// TODO: finish\nvar s = "TODO in a string";\n/* FIXME later */\nvar todo = 1;';
  assert.deepEqual(both('ADV-21', text), { cs: [1, 3], ts: [1, 3] });
});

test('ADV-23 reports one finding per commented-out block and keeps prose comments', () => {
  const text = 'int a = 1;\n// var x = Load();\n// x.Save();\n// explains why the cache is skipped\n/// <summary>doc;</summary>\n// eslint-disable-next-line no-console;\nint b = 2;\n// }';
  assert.deepEqual(lines('ADV-23', text, cs), [2, 8]);
});

test('ADV-25 flags repeated branch bodies and ignores string differences', () => {
  const text = 'if (a) { Run("x"); }\nelse if (b) { Run("y"); }\nelse { Run("x"); }\nif (c) { Go(); } else { Go(); }';
  assert.deepEqual(both('ADV-25', text), { cs: [3, 4], ts: [3, 4] });
});

test('ADV-26 flags a second statement indented under an unbraced if', () => {
  const text = 'void M() {\n  if (a)\n    One();\n    Two();\n  if (b)\n    Three();\n  Four();\n  if (c) { Five(); }\n}';
  assert.deepEqual(lines('ADV-26', text, cs), [2]);
});

test('ADV-27 flags a default parameter before a required one in TypeScript', () => {
  const text = 'function a(x = 1, y: number) {}\nfunction b(x: number, y = 1) {}\nfunction c(x = 1, y?: number) {}\nfunction d(x = 1, ...rest: number[]) {}';
  assert.deepEqual(lines('ADV-27', text, ts), [1]);
});

test('ADV-28 flags a second function with the same non-trivial body', () => {
  const text = 'class C {\n  A() { x(); y(); z(); }\n  B() { x(); y(); z(); }\n  D() { x(); }\n  E() { x(); }\n}';
  assert.deepEqual(both('ADV-28', text), { cs: [3], ts: [3] });
});

test('ADV-29 flags comparison with boolean literals', () => {
  assert.deepEqual(lines('ADV-29', 'if (x == true) {}\nif (false != y) {}\nvar z = true;\nif (a === false) {}\nif (user?.Identity?.IsAuthenticated != true) {}\nif ((a?.b) !== false) {}', ts), [1, 2, 4]);
});

test('ADV-30 flags Where followed by a parameterless terminal call', () => {
  const text = 'var a = items.Where(x => x.On).FirstOrDefault();\nvar b = items.Where(x => x.On).Any();\nvar c = items.Where(x => x.On).ToList();\nvar d = items.FirstOrDefault(x => x.On);';
  assert.deepEqual(lines('ADV-30', text, cs), [1, 2]);
  assert.deepEqual(lines('ADV-30', text, ts), []);
});

test('ADV-31 flags global number helpers only', () => {
  assert.deepEqual(lines('ADV-31', 'isNaN(v);\nNumber.isNaN(v);\nconst n = parseInt(s, 10);\nthis.parseFloat(s);', ts), [1, 3]);
});

test('ADV-33 flags empty functions without a comment and skips constructors', () => {
  const tsText = 'class A {\n  constructor(private x: X) {}\n  ngOnInit(): void {}\n  onClick() { /* intentional no-op */ }\n  run() { go(); }\n}';
  assert.deepEqual(lines('ADV-33', tsText, ts), [3]);
  const csText = 'public class A {\n  public A() { }\n  public void Run() { }\n  public void Go() { Do(); }\n}';
  assert.deepEqual(lines('ADV-33', csText, cs), [3]);
});

test('ADV-39 flags collapsible nested ifs only', () => {
  const text = 'if (a) {\n  if (b) { Go(); }\n}\nif (c) {\n  if (d) { Go(); } else { Stop(); }\n}\nif (e) {\n  if (f) { Go(); }\n  Next();\n}';
  assert.deepEqual(both('ADV-39', text), { cs: [1], ts: [1] });
});

test('ADV-41 flags imports into node_modules or build chunks', () => {
  const text = "import { a } from '../../node_modules/lib/a';\nimport { b } from '@angular/common/http';\nimport { c } from 'lib/fesm2022/lib.mjs';";
  assert.deepEqual(lines('ADV-41', text, ts), [1, 3]);
});

test('ADV-42 flags literal global replace and length - 1 indexing', () => {
  const text = "s.replace(/-/g, '_');\ns.replace(/a+/g, '');\nconst last = items[items.length - 1];\nconst x = a[b.length - 1];";
  assert.deepEqual(lines('ADV-42', text, ts), [1, 3]);
});

test('ADV-44 flags options created in a member body and skips static fields', () => {
  const text = 'private static readonly JsonSerializerOptions Options = new JsonSerializerOptions { WriteIndented = true };\nstring M(object o) { return JsonSerializer.Serialize(o, new JsonSerializerOptions { WriteIndented = true }); }';
  assert.deepEqual(lines('ADV-44', text, cs), [2]);
});

test('ADV-45 flags manual guards that a throw helper replaces', () => {
  const text = 'if (name is null) throw new ArgumentNullException(nameof(name));\nif (count < 0) { throw new ArgumentOutOfRangeException(nameof(count)); }\nif (_disposed) throw new ObjectDisposedException(nameof(Demo));\nif (name is null) throw new ArgumentNullException(nameof(name), "custom");\nif (other == null) throw new ArgumentNullException(nameof(name));';
  assert.deepEqual(lines('ADV-45', text, cs), [1, 2, 3]);
});

test('ADV-48 flags a module imported twice and keeps import type', () => {
  const text = "import { a } from './x';\nimport type { T } from './x';\nimport {\n  b\n} from './x';\nimport { c } from './y';";
  assert.deepEqual(lines('ADV-48', text, ts), [3]);
});

test('ADV-49 flags switches with fewer than three labels', () => {
  const text = 'switch (a) { case 1: Go(); break; default: Stop(); break; }\nswitch (b) { case 1: case 2: Go(); break; default: break; }\nvar r = c switch { 1 => "a", _ => "b" };';
  assert.deepEqual(both('ADV-49', text), { cs: [1], ts: [1] });
});

test('ADV-50 flags ToLower/ToUpper equality only', () => {
  const text = 'if (a.ToLower() == b) {}\nif (x != y.ToUpperInvariant()) {}\nvar k = a.ToLowerInvariant();';
  assert.deepEqual(lines('ADV-50', text, cs), [1, 2]);
});

test('ADV-51 flags identifiers named field inside properties', () => {
  const text = 'public bool IsBlank => Fields.TrueForAll(field => field.Length == 0);\npublic bool M() => Fields.TrueForAll(field => field.Length == 0);\npublic bool Ok => Fields.TrueForAll(@field => @field.Length == 0);';
  assert.deepEqual(lines('ADV-51', text, cs), [1]);
});

test('ADV-53 flags functions whose every return gives the same literal', () => {
  const text = 'bool A(int x) { if (x > 0) { Log(); return true; } Save(); return true; }\nbool B(int x) { if (x > 0) return true; return false; }\nbool C() { return true; }';
  assert.deepEqual(both('ADV-53', text), { cs: [1], ts: [1] });
});

test('CS1998 flags async methods with no await', () => {
  const text = 'public async Task<int> A() { return 1; }\npublic async Task B() { await Task.Delay(1); }\npublic async Task<string> C() => "x";\npublic Task D() => Task.CompletedTask;';
  assert.deepEqual(lines('CS1998', text, cs), [1, 3]);
});

test('S6582, S6606 and S2245 flag TypeScript shapes', () => {
  assert.deepEqual(lines('S6582', 'if (a && a.b) {}\nif (this.x && this.x.y) {}\nif (a && b.c) {}', ts), [1, 2]);
  assert.deepEqual(lines('S6606', 'const v = a !== null && a !== undefined ? a : b;\nconst w = a != null ? a : b;\nconst z = a != null ? b : a;', ts), [1, 2]);
  assert.deepEqual(lines('S2245', 'const id = Math.random().toString(36);\nconst r = random();', ts), [1]);
});

test('observations never carry literal values', () => {
  const [o] = advisoryObservations('// TODO: secret-token-123', { advisoryCheck: 'ADV-21' }, { path: cs });
  assert(!o.observation.includes('secret-token-123'));
  assert.equal(o.disposition, 'review-candidate');
});
