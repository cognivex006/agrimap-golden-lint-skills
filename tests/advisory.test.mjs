import test from 'node:test';
import assert from 'node:assert/strict';
import { scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { fixPrompts, renderMarkdown, advisoryLine } from '../skills/agrimap-golden-lint-skills/scripts/render.mjs';
import { validateReport } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { fixture } from './helpers.mjs';

const file = 'services/agmws-case/Src/Application/UseCases/DemoUseCase.cs';
const args = f => ({ ...f.args, dotnet: process.env.AGM_LINT_DOTNET });
const scanText = (t, text) => {
  const f = fixture(t, { [file]: text });
  const report = scan(args(f));
  assert.equal(report.scanStatus, 'completed');
  return report;
};
const found = (t, body, id) => {
  const report = scanText(t, `namespace AgriMap.Web.Service.Application.UseCases;
public class DemoUseCase {
${body}
}`);
  return { report, hits: report.findings.filter(x => x.detectorId === id) };
};

test('ADV-01 reports split overloads once at the first declaration, including interfaces', t => {
  const report = scanText(t, `namespace AgriMap.Web.Service.Application.UseCases;
public interface IOAuthUseCase {
  System.Threading.Tasks.Task<int> RefreshTokenAsync(object c, int r);
  System.Threading.Tasks.Task<int> RevokeTokenAsync(object c, int r);
  System.Threading.Tasks.Task<int> LoginAsync(object c);
  System.Threading.Tasks.Task<int> RevokeTokenAsync(int r);
}`);
  const hits = report.findings.filter(x => x.detectorId === 'be-overload-adjacency');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 4);
  assert.equal(hits[0].authority.goldenRuleId, 'ADV-01');
  assert.equal(hits[0].authority.tier, 'SHOULD');
  assert.equal(hits[0].authority.externalAnalyzer.ruleKey, 'csharpsquid:S4136');
  assert.equal(hits[0].disposition, 'review-candidate');
  // Adjacent overloads and explicit interface implementations are not reported.
  assert.equal(found(t, 'void Run() { } void Run(int a) { } void Run(int a, int b) { } int Other() => 0;', 'be-overload-adjacency').hits.length, 0);
  assert.equal(found(t, 'public void Dispose() { } int Other() => 0; void System.IDisposable.Dispose() { }', 'be-overload-adjacency').hits.length, 0);
});

test('ADV-04 flags explicit paramName on runtime guards only', t => {
  const { hits } = found(t, `
  void A(string? name) { System.ArgumentNullException.ThrowIfNull(name, "key"); }
  void B(string name) { System.ArgumentException.ThrowIfNullOrEmpty(argument: name, paramName: "name"); }
  void C(int a, int b) { System.ArgumentOutOfRangeException.ThrowIfGreaterThan(a, b, "a"); }`, 'be-caller-info-argument');
  assert.deepEqual(hits.map(h => h.line), [4, 5, 6]);
  assert(hits.every(h => h.authority.goldenRuleId === 'ADV-04' && h.authority.externalAnalyzer.ruleKey === 'csharpsquid:S3236'));
  const quiet = found(t, `
  void A(string? name) { System.ArgumentNullException.ThrowIfNull(name); }
  void C(int a, int b) { System.ArgumentOutOfRangeException.ThrowIfGreaterThan(a, b); }
  void D(object a) { Guard.ThrowIfNull(a, "a"); }
  static class Guard { public static void ThrowIfNull(object a, string n) { } }`, 'be-caller-info-argument');
  assert.equal(quiet.hits.length, 0);
});

test('ADV-05 reports locals never referenced again and skips using, discards and nested uses', t => {
  const { hits } = found(t, `
  void Configure(string? env) {
    var basePath = System.AppDomain.CurrentDomain.BaseDirectory;
    var isDevMode = env == "Development" || env == "Inhouse";
    Use(basePath);
  }
  void Use(string s) { }`, 'be-unused-local');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].line, 6);
  assert.equal(hits[0].authority.externalAnalyzer.ruleKey, 'csharpsquid:S1481');
  const quiet = found(t, `
  void Run(System.IO.Stream s) {
    using var reader = new System.IO.StreamReader(s);
    var _ = s.Length;
    var used = 1;
    System.Func<int> f = () => used;
    f();
  }`, 'be-unused-local');
  assert.equal(quiet.hits.length, 0);
});

test('ADV-07 reports Dispose without GC.SuppressFinalize on unsealed or finalizing classes', t => {
  const report = scanText(t, `namespace AgriMap.Web.Service.Application.UseCases;
public class Open : System.IDisposable { public void Dispose() { } }
public class Done : System.IDisposable { public void Dispose() { GC.SuppressFinalize(this); } }
public sealed class Sealed : System.IDisposable { public void Dispose() { } }
public sealed class Finalized : System.IDisposable { ~Finalized() { } public void Dispose() { } }
public class NotDisposable { public void Dispose() { } }
public class Explicit : System.IDisposable { void System.IDisposable.Dispose() { } }`);
  const hits = report.findings.filter(x => x.detectorId === 'be-dispose-suppress-finalize');
  assert.deepEqual(hits.map(h => h.line), [2, 5, 7]);
  assert(hits.every(h => h.authority.externalAnalyzer.ruleKey === 'external_roslyn:CA1816' && h.authority.externalAnalyzer.defaultSeverity === 'Info'));
  assert(validateReport(report));
});

test('advisory rules are recommendation-first in report order, cards and prompts', t => {
  const { report } = found(t, `
  string Status(bool a, bool b) => a ? "R" : b ? "F" : "S";
  void Run(string? env) { var unused = env; }`, 'be-unused-local');
  const markdown = renderMarkdown(report);
  assert(markdown.includes(advisoryLine));
  assert.match(markdown, /low · advisory|ต่ำ · advisory|· advisory \|/);
  assert(markdown.indexOf('ADV-05') > markdown.indexOf('QUALITY-03'));
  const prompts = fixPrompts(report);
  const advisory = prompts.find(p => p.group.detectorId === 'be-unused-local').prompt;
  assert(advisory.includes(advisoryLine));
  assert(advisory.includes('sonarqube-remediation.md'));
  assert(!prompts.find(p => p.group.detectorId === 'be-nested-ternary').prompt.includes(advisoryLine));
  for (const family of ['be-advisory-semantic-smells', 'be-advisory-test-smells'])
    assert(report.catalog.some(f => f.familyId === family && f.implementationStatus === 'not-implemented'), family);
});
