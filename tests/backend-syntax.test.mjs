import test from 'node:test';
import assert from 'node:assert/strict';
import { scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { verifyCSharpBundle } from '../skills/agrimap-golden-lint-skills/scripts/csharp.mjs';
import { cpSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { packageRoot } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { fixture, treeDigest } from './helpers.mjs';

const file = 'services/agmws-case/Src/Domain/Entities/Demo.cs';
const args = f => ({ ...f.args, dotnet: process.env.AGM_LINT_DOTNET });
test('C# AST detects type shape, nullable syntax and empty catches without string/comment false positives', t => {
  const f = fixture(t, { [file]: `namespace AgriMap.Web.Service.Domain.Entities;
public interface badName { }
public class Demo {
  string text = "x! == null catch { }"; // another! == null
  object? value;
  void Run() { var x = value!; if (value == null) { } try { } catch { /* no log */ } }
}` });
  const report = scan(args(f));
  assert.equal(report.scanStatus, 'completed');
  for (const id of ['be-public-type-count', 'be-type-naming', 'be-null-forgiving', 'be-null-comparison', 'be-empty-catch']) assert(report.findings.some(f => f.detectorId === id), id);
  assert.equal(report.findings.filter(f => f.detectorId === 'be-null-forgiving').length, 1);
  assert(report.findings.every(f => f.disposition === 'review-candidate'));
});
test('C# naming and repository placement are bounded by role and constructor assignment', t => {
  const misplaced = file.replace('/Domain/Entities/Demo.cs', '/Application/Interfaces/Repository.cs');
  const dto = file.replace('/Domain/Entities/Demo.cs', '/Presentation/DTOs/Requests/Request.cs');
  const f = fixture(t, {
    [misplaced]: 'namespace AgriMap.Web.Service.Application.Interfaces; public interface IOrderRepository { }',
    [dto]: 'namespace AgriMap.Web.Service.Presentation.DTOs.Requests; public class Order { }',
    [file]: 'namespace AgriMap.Web.Service.Domain.Entities; public class Demo { private readonly object Dependency; private readonly object State = new(); public Demo(object value) { Dependency = value; } }'
  });
  const report = scan(args(f));
  assert.equal(report.scanStatus, 'completed');
  assert.equal(report.findings.filter(f => f.detectorId === 'be-repository-placement').length, 1);
  assert.equal(report.findings.filter(f => f.detectorId === 'be-role-naming').length, 1);
  assert.equal(report.findings.filter(f => f.detectorId === 'be-dependency-naming').length, 1);
});
test('C# compliant syntax, raw/interpolated strings and global namespace spellings avoid false positives', t => {
  const f = fixture(t, { [file]: `using Alias = System.String;
using static System.Math;

namespace AgriMap . Web . Service . Domain . Entities;

public class Demo {
  private readonly object _dependency;
  public Demo(object value) { _dependency = value; }
  string Text = """ any! x == null catch { } """;
  string Interpolated(object value) => $"x == null {value}";
  bool Valid(object? value) => value is not null && !false;
  void Error() { try { } catch { throw; } }
}` });
  const report = scan(args(f));
  assert.equal(report.scanStatus, 'completed');
  assert.equal(report.findings.length, 0);
});
test('Roslyn package hashes and out-of-target host boundary are enforced before execution', t => {
  const f = fixture(t, { [file]: 'namespace Bad.Name;' });
  const copied = path.join(f.output, 'reader');
  cpSync(path.join(packageRoot, 'skills/agrimap-golden-lint-skills/runtime/csharp'), copied, { recursive: true });
  assert.equal(verifyCSharpBundle(copied).roslynVersion, '4.11.0.0');
  writeFileSync(path.join(copied, 'AgriMap.Lint.CSharp.dll'), 'untrusted');
  assert.throws(() => verifyCSharpBundle(copied));
  f.put('dotnet.exe', 'must not execute');
  const before = treeDigest(f.home);
  const report = scan({ ...args(f), dotnet: path.join(f.root, 'dotnet.exe') });
  assert.equal(report.scanStatus, 'partial');
  assert.equal(treeDigest(f.home), before);
});
test('C# Task checks resolve runtime symbols and ignore a local Result/Wait/FromResult collision', t => {
  const f = fixture(t, { [file]: `using System.Threading.Tasks;
namespace AgriMap.Web.Service.Domain.Entities;
public class Demo {
  async Task<int> RunAsync(Task<int> task) { task.Wait(); var x = task.Result; task.GetAwaiter().GetResult(); return await Task.FromResult(x); }
  void Local(LocalTask task) { task.Wait(); var x = task.Result; }
}
class LocalTask { public int Result => 1; public void Wait() { } }` });
  const report = scan(args(f));
  const results = report.findings.filter(f => f.detectorId === 'be-async-blocking');
  assert.equal(results.length, 4);
  assert(results.every(f => f.actualEvidenceLevel === 'semantic'));
});
test('missing explicit dotnet host blocks C# syntax instead of silently falling back to regex', t => {
  const f = fixture(t, { [file]: 'namespace Bad.Name; public class Demo { object x = null!; }' });
  const report = scan({ ...args(f), dotnet: undefined });
  assert.equal(report.scanStatus, 'partial');
  assert(report.rules.some(r => r.detectorId === 'be-null-forgiving' && r.executionStatus === 'blocked'));
  assert.equal(report.findings.length, 0);
});
test('C# reader leaves target/Golden/package evidence unchanged and discloses conditional context', t => {
  const f = fixture(t, { [file]: '#if DEBUG\nnamespace Bad.Name; class Demo { object value = null!; }\n#endif\n' });
  const before = treeDigest(f.home);
  const report = scan(args(f));
  assert.equal(treeDigest(f.home), before);
  assert.equal(report.scanStatus, 'partial');
  assert(report.rules.some(r => r.diagnostics.some(d => d.includes('CONDITIONAL_COMPILATION'))));
});
test('C# declaration anchors survive unrelated method-body edits and syntax errors stay scoped', t => {
  const f = fixture(t, { [file]: 'namespace Bad.Name; public class Demo { void Run() { } }' });
  const base = scan(args(f));
  f.put(file, 'namespace Bad.Name; public class Demo { void Run() { var value = 1; } }');
  const next = scan({ ...args(f), baseline: base });
  const oldNamespace = base.findings.find(f => f.detectorId === 'be-namespace-observation');
  const currentNamespace = next.findings.find(f => f.detectorId === 'be-namespace-observation');
  assert.equal(currentNamespace.findingId, oldNamespace.findingId);
  assert.equal(currentNamespace.changeOrigin, 'pre-existing');
  f.put(file, 'namespace Bad.Name; public class Demo {');
  const broken = scan(args(f));
  assert.equal(broken.scanStatus, 'partial');
  assert(broken.rules.some(r => r.executionStatus === 'error'));
});
test('shadowed constructor parameters and hidden members on Task subclasses are not misclassified', t => {
  const f = fixture(t, { [file]: `using System.Threading.Tasks;
namespace AgriMap.Web.Service.Domain.Entities;
public class Demo {
  private readonly object Dependency = new();
  public Demo(object Dependency, object value) { Dependency = value; }
  void Run(DerivedTask task) { task.Wait(); var value = task.Result; }
}
class DerivedTask : Task<int> {
  public DerivedTask() : base(() => 1) { }
  public new int Result => 2;
  public new void Wait() { }
}` });
  const report = scan(args(f));
  assert.equal(report.scanStatus, 'completed');
  assert.equal(report.findings.filter(f => ['be-dependency-naming', 'be-async-blocking'].includes(f.detectorId)).length, 0);
});
test('parsing never executes a target static constructor', t => {
  const f = fixture(t);
  const marker = path.join(f.output, 'target-executed.txt');
  f.put(file, `namespace AgriMap.Web.Service.Domain.Entities; public class Demo {
    static Demo() { System.IO.File.WriteAllText(@"${marker.replaceAll('"', '""')}", "must-not-run"); }
  }`);
  const before = treeDigest(f.home);
  assert.equal(scan(args(f)).scanStatus, 'completed');
  assert.equal(existsSync(marker), false);
  assert.equal(treeDigest(f.home), before);
});
