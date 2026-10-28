import test from 'node:test';
import assert from 'node:assert/strict';
import { scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { fixPrompts, renderMarkdown } from '../skills/agrimap-golden-lint-skills/scripts/render.mjs';
import { validateReport, digest } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { fixture } from './helpers.mjs';

const file = 'services/agmws-case/Src/Application/UseCases/DemoUseCase.cs';
const args = f => ({ ...f.args, dotnet: process.env.AGM_LINT_DOTNET });
const wrap = body => `namespace AgriMap.Web.Service.Application.UseCases;
public class DemoUseCase {
${body}
}`;
const ifs = n => Array.from({ length: n }, (_, i) => `if (x == ${i}) { y++; }`).join(' ');
const params = n => Array.from({ length: n }, (_, i) => `int p${i}`).join(', ');
const found = (t, body, id) => {
  const f = fixture(t, { [file]: wrap(body) });
  const report = scan(args(f));
  assert.equal(report.scanStatus, 'completed');
  return { report, hits: report.findings.filter(x => x.detectorId === id) };
};

test('QUALITY-01 counts if/else-if per function scope with a 7/8 boundary', t => {
  assert.equal(found(t, `void Seven(int x) { var y = 0; ${ifs(7)} }`, 'be-method-branches').hits.length, 0);
  assert.equal(found(t, `void Eight(int x) { var y = 0; ${ifs(8)} }`, 'be-method-branches').hits.length, 1);
  // Nested ifs and else-if count; a bare else does not.
  const chain = 'if (x == 0) { if (x > 1) { } } else if (x == 2) { } else if (x == 3) { } else if (x == 4) { } else if (x == 5) { } else if (x == 6) { } else { }';
  assert.equal(found(t, `void Chain(int x) { ${chain} }`, 'be-method-branches').hits.length, 0);
  assert.equal(found(t, `void Chain(int x) { ${chain} if (x == 7) { } }`, 'be-method-branches').hits.length, 1);
  // Local functions and lambdas are their own scopes: 4 + 4 split never adds up to 8 for the method.
  const split = found(t, `void Split(int x) { var y = 0; ${ifs(4)} void Local() { ${ifs(4)} } System.Action a = () => { ${ifs(4)} }; }`, 'be-method-branches');
  assert.equal(split.hits.length, 0);
  const local = found(t, `void Outer(int x) { var y = 0; void Local() { ${ifs(8)} } }`, 'be-method-branches');
  assert.equal(local.hits.length, 1);
  assert.equal(local.hits[0].authority.goldenRuleId, 'QUALITY-01');
  assert.equal(local.hits[0].authority.externalAnalyzer.ruleKey, 'csharpsquid:S3776');
  assert.equal(local.hits[0].authority.externalAnalyzer.relation, 'related-not-equivalent');
  assert.equal(local.hits[0].disposition, 'review-candidate');
});

test('QUALITY-01 ignores if inside strings/comments and keeps identity across body edits', t => {
  const quiet = found(t, `// ${ifs(8)}\n string Text = "${ifs(8)}"; void Run(int x) { var y = 0; ${ifs(2)} }`, 'be-method-branches');
  assert.equal(quiet.hits.length, 0);
  const a = found(t, `void Run(int x) { var y = 0; ${ifs(8)} }`, 'be-method-branches').hits[0];
  const b = found(t, `void Run(int x) { var y = 1; ${ifs(9)} }`, 'be-method-branches').hits[0];
  assert.equal(a.findingId, b.findingId);
});

test('QUALITY-02 bounds methods, constructors and local functions at 7 parameters', t => {
  assert.equal(found(t, `void Seven(${params(7)}) { } public DemoUseCase(${params(7)}) { }`, 'be-parameter-count').hits.length, 0);
  const eight = found(t, `void Eight(${params(8)}) { } public DemoUseCase(${params(8)}) { } void Host() { void Local(${params(8)}) { } }`, 'be-parameter-count');
  assert.equal(eight.hits.length, 3);
  assert(eight.hits.every(h => h.authority.externalAnalyzer.ruleKey === 'csharpsquid:S107' && h.actualEvidenceLevel === 'syntax'));
  // Signatures fixed elsewhere are not reported.
  const fixed = found(t, `public override bool Equals(object? o) => false; [System.Runtime.InteropServices.DllImport("x")] static extern void Native(${params(8)});`, 'be-parameter-count');
  assert.equal(fixed.hits.length, 0);
});

test('QUALITY-03 finds the three Golden nested-ternary examples, including anonymous objects', t => {
  const { hits } = found(t, `
  string Status(Job j) => j.IsRunning ? "Running" : j.HasErrors ? "Failed" : "Succeeded";
  void Message(string message, Req request, string status) { RequireMessage(message, request.AuthorizeResult == "fail" ? "diable_success"
    : status == "RESERVE" ? "reserve_success" : "reuse_right_code"); }
  object Error(object context, int statusCode, string errorCode, string message) => IsPlusRight(context)
    ? new { status_code = statusCode, code = errorCode == "internal_server_error" ? "internal_error" : errorCode, message }
    : (object)new { status_code = statusCode, error = errorCode, message };
  void RequireMessage(string a, string b) { }
  bool IsPlusRight(object c) => true;
  public class Job { public bool IsRunning; public bool HasErrors; }
  public class Req { public string AuthorizeResult = ""; }`, 'be-nested-ternary');
  assert.equal(hits.length, 3);
  assert.deepEqual(hits.map(h => h.line), [4, 6, 8]);
  assert(hits.every(h => h.authority.goldenRuleId === 'QUALITY-03' && h.authority.externalAnalyzer.ruleKey === 'csharpsquid:S3358'));
});

test('QUALITY-03 compliant replacements, standalone ternary, ?? and ?. are not reported', t => {
  const { report, hits } = found(t, `
  string Status(Job j) { if (j.IsRunning) return "Running"; return j.HasErrors ? "Failed" : "Succeeded"; }
  string Code(Req request, string status) => request.AuthorizeResult == "fail" ? "diable_success" : ReserveCode(status);
  string ReserveCode(string status) => status == "RESERVE" ? "reserve_success" : "reuse_right_code";
  object Error(bool plus, int statusCode, string errorCode, string message) { var code = errorCode == "internal_server_error" ? "internal_error" : errorCode;
    return plus ? new { status_code = statusCode, code, message } : (object)new { status_code = statusCode, error = errorCode, message }; }
  string Coalesce(Req? r) => r?.AuthorizeResult ?? "none";
  string Text = "a ? b ? c : d : e"; // x ? y ? z : w : v
  System.Func<bool, string> Lazy(bool a) => a ? (b => b ? "x" : "y") : (b => "z");
  public class Job { public bool IsRunning; public bool HasErrors; }
  public class Req { public string AuthorizeResult = ""; }`, 'be-nested-ternary');
  assert.equal(hits.length, 0);
  assert.equal(report.findings.filter(x => x.detectorId === 'be-method-branches').length, 0);
});

test('report separates Golden lint candidates from SonarQube results and prompts carry the notice contract', t => {
  const { report } = found(t, `string Status(bool a, bool b) => a ? "R" : b ? "F" : "S";`, 'be-nested-ternary');
  const markdown = renderMarkdown(report);
  assert.match(markdown, /lint candidate ตาม Golden ไม่ใช่ผล SonarQube จริง/);
  assert.match(markdown, /ไม่ได้นำเข้า จึงไม่สรุปว่า Quality Gate ผ่านหรือไม่ผ่าน/);
  const prompt = fixPrompts(report).find(p => p.group.detectorId === 'be-nested-ternary').prompt;
  for (const phrase of ['sonarqube-remediation.md', 'กลับมาแก้งานที่เสร็จแล้ว', 'ห้ามอนุมานจาก Git commit', 'ไม่ใช่ approval gate ใหม่', 'รัน SonarQube ซ้ำหรือยัง'])
    assert(prompt.includes(phrase), phrase);
  assert(report.catalog.some(f => f.familyId === 'be-sonar-cognitive-complexity' && f.implementationStatus === 'not-implemented'));
  // Rules without a related analyzer keep their old prompt and authority shape.
  const { report: plain } = found(t, 'void Run() { try { } catch { } }', 'be-empty-catch');
  assert.equal(plain.findings.find(x => x.detectorId === 'be-empty-catch').authority.externalAnalyzer, undefined);
  assert(!fixPrompts(plain).some(p => p.prompt.includes('sonarqube-remediation.md')));
});

test('externalAnalyzer is optional for older reports and closed against invented scan results', t => {
  const { report } = found(t, `string Status(bool a, bool b) => a ? "R" : b ? "F" : "S";`, 'be-nested-ternary');
  // reportId is a content digest, so each altered copy is resealed before validation.
  const altered = change => { const { reportId, ...copy } = structuredClone(report); change(copy); return { ...copy, reportId: digest(copy) }; };
  const sonar = copy => copy.findings.find(f => f.authority.externalAnalyzer).authority.externalAnalyzer;
  assert(validateReport(altered(copy => { for (const f of [...copy.findings, ...copy.rules]) delete f.authority.externalAnalyzer; })));
  assert.throws(() => validateReport(altered(copy => { sonar(copy).resultStatus = 'passed'; })));
  assert.throws(() => validateReport(altered(copy => { sonar(copy).scanId = 'AYx'; })));
});
