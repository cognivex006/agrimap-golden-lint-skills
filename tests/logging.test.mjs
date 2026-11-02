import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, cs } from './helpers.mjs';
import { bindings, catalog } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { loggingObservations, loggingChecks } from '../skills/agrimap-golden-lint-skills/scripts/logging.mjs';
import { scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { remediation, renderMarkdown, fixPrompts, judgmentLine } from '../skills/agrimap-golden-lint-skills/scripts/render.mjs';

const filter = 'services/agmws-fixture-netcore/Src/Presentation/Filters/ActionLoggingFilter.cs';
const middleware = 'services/agmws-fixture-netcore/Src/Presentation/Middlewares/GlobalExceptionMiddleware.cs';
// Unit-level: the lines one check reports for one text.
const lines = (check, text, file = cs) => loggingObservations(text, { textCheck: check }, { path: file }).map(o => o.line);
const details = (check, text) => loggingObservations(text, { textCheck: check }, { path: cs }).map(o => o.observation);

test('bindings, catalog and remediation cover every check on its Golden rule', () => {
  const logging = bindings.filter(r => r.textCheck);
  assert.deepEqual([...new Set(logging.map(r => r.textCheck))].sort(), [...loggingChecks].sort());
  for (const rule of logging) {
    const baseline = rule.textCheck.startsWith('OBS-');
    // Golden tier only where Golden states the rule; the observability baseline is SHOULD and judgment-based.
    assert.equal(rule.goldenRuleId, baseline ? `none — ${rule.textCheck} observability baseline` : rule.textCheck);
    assert.equal(rule.tier, baseline ? 'SHOULD' : 'MUST');
    assert.equal(rule.sourceStatusBasis, baseline ? 'package-observability-baseline' : 'normalized-maintained-contract');
    assert.equal(rule.entry, 'references/patterns/csharp.md');
    assert.equal(rule.minimumEvidenceLevel, 'text');
    assert(catalog.some(f => f.lane === rule.lane && f.detectorIds.includes(rule.detectorId)), rule.detectorId);
    assert.equal(remediation.detectors[rule.detectorId]?.tag, rule.textCheck, rule.detectorId);
    assert.equal(Boolean(remediation.detectors[rule.detectorId].judgment), baseline, rule.detectorId);
  }
  // Host and HTTP status wiring belong to services; libraries carry the logging, Console and status-code rules.
  assert.deepEqual(logging.filter(r => r.lane === 'be-library').map(r => r.textCheck).sort(), ['LOG-01', 'LOG-02', 'OBS-01', 'OBS-03']);
});

test('OBS-01 flags Console writes and notes multi-line payloads', () => {
  const text = [
    'Console.WriteLine($"Exec: {operationName}");',
    'Console.WriteLine($"PI: {JsonSerializer.Serialize(parameters, options)}");',
    'Console.Error.WriteLine(exception.StackTrace);',
    'await Console.Out.WriteLineAsync("ready");',
    'Console.Write("x");',
    '_logger.LogDebug("Exec: {Operation}", operationName);',
    'var writer = Console.Out;'
  ].join('\n');
  assert.deepEqual(lines('OBS-01', text), [1, 2, 3, 4, 5]);
  const found = details('OBS-01', text);
  assert.doesNotMatch(found[0], /serialized payload/);
  assert.match(found[1], /serialized payload/);
  assert.match(found[2], /standard error/);
});

test('OBS-02 flags NLog registered through both builder and host', () => {
  const both = ['builder.Logging.ClearProviders();', 'builder.Logging.AddNLogWeb($"nlog.{env}.config");', '', 'builder.Host.UseNLog();'].join('\n');
  assert.deepEqual(lines('OBS-02', both), [4]);
  assert.match(details('OBS-02', both)[0], /written twice/);
  assert.deepEqual(lines('OBS-02', 'builder.Logging.ClearProviders();\nbuilder.Host.UseNLog();'), []);
  assert.deepEqual(lines('OBS-02', 'builder.Logging.AddNLogWeb("nlog.config");'), []);
});

test('OBS-03 flags caller-input codes thrown as 500 and keeps internal failures', () => {
  const text = [
    'throw new AppException(500, "province_id_is_required", "Invalid province ID");',
    'throw new AppException(StatusCodes.Status500InternalServerError, "invalid_content_type", "x");',
    'throw new AppException(500, "district_id_must_be_4_characters", "x");',
    'throw new AppException(500, "user_inactive", "x");',
    'throw new AppException(500, "aes_key_not_configured", "AES_KEY is missing");',
    'throw new AppException(500, result.Message, detail);',
    'throw new AppException(400, "province_id_is_required", "x");',
    'throw new AppException(500, $"{code}_required", "x");',
    'throw new AppException(500, "database_procedure_failed", "x");',
    'throw new AppException(500, "invalid_configuration", "x");'
  ].join('\n');
  assert.deepEqual(lines('OBS-03', text), [1, 2, 3, 4]);
  assert.match(details('OBS-03', text)[0], /Error code province_id_is_required/);
});

test('LOG-02 flags concatenated, interpolated and formatted messages', () => {
  const text = [
    '_logger.LogError("Unhandled Exception: " + ex.ToString());',
    '_logger.LogError("Error occurred while executing {Action}: " + executed.Exception.ToString());',
    '_logger.Information($"Auth token resolver: Path={context.Request.Path}, Skip={string.Join(",", options.Prefixes)}");',
    'logger.LogWarning($"{message}{Environment.NewLine}{exception.ToString()}");',
    '_logger.LogError(string.Format("x {0}", y));',
    '_logger.LogError(ex, "Error occurred while executing {Action}", actionName);',
    '_logger.LogInformation("Starting: {Action}", actionName);',
    '_logger.LogInformation("first part " + "second part");',
    'logger.LogInformation(message, args);'
  ].join('\n');
  assert.deepEqual(lines('LOG-02', text), [1, 2, 3, 4, 5]);
  const [, action] = details('LOG-02', text);
  assert.match(action, /built by concatenation/);
  assert.match(action, /Exception text is written into the message/);
  assert.match(action, /has no argument and is written verbatim/);
});

test('LOG-01 flags exception text, exceptions after the template and placeholder mismatches', () => {
  const text = [
    '_logger.LogError("failed", ex);',
    '_logger.LogInformation("Run {A} {B}", a);',
    '_logger.LogError("Failed {Error}", ex.Message);',
    '_logger.LogError(ex.ToString());',
    '_logger.LogError(ex, "boom {Message}", ex.Message);',
    '_logger.LogError(new EventId(1), ex, "boom {Id}", id);',
    '_logger.LogInformation("{{literal}} {Id}", id);',
    '_logger.LogInformation("Job {JobId} enqueued", message.JobId);',
    '_logger.Error("failed", ex);',
    '_logger.Warning("Skipping cleanup");',
    'logger.LogInformation(message, args);',
    '_logger.LogError("Unhandled Exception: " + ex.ToString());'
  ].join('\n');
  assert.deepEqual(lines('LOG-01', text), [1, 2, 3, 4]);
  const found = details('LOG-01', text);
  assert.match(found[0], /binds as a format value/);
  assert.match(found[1], /2 placeholder\(s\) but the call passes 1 argument/);
  assert.match(found[2], /without passing the exception object first/);
});

test('ERR-03 flags server bugs mapped to 400 and leaves 500 and caller errors alone', () => {
  const text = [
    '{ typeof(NullReferenceException), StatusCodes.Status400BadRequest },',
    '{ typeof(IndexOutOfRangeException), StatusCodes.Status400BadRequest },',
    '{ typeof(ArgumentException), StatusCodes.Status400BadRequest },',
    '{ typeof(NullReferenceException), StatusCodes.Status500InternalServerError },',
    'catch (NullReferenceException) { return BadRequest(); }',
    'catch (IndexOutOfRangeException ex) { _logger.LogError(ex, "x"); throw; }',
    'NullReferenceException => (int)HttpStatusCode.BadRequest,',
    'throw new NullReferenceException("value 400");',
    'var code = ex is IndexOutOfRangeException ? 400 : 500;'
  ].join('\n');
  assert.deepEqual(lines('ERR-03', text), [1, 2, 5, 7, 9]);
});

test('adversarial: comments, strings, other writers and non-C# files never trigger', () => {
  const text = [
    '// _logger.LogError("Unhandled Exception: " + ex.ToString());',
    '/* { typeof(NullReferenceException), StatusCodes.Status400BadRequest } */',
    'var doc = "_logger.LogError(\\"x\\" + y)";',
    'Console.WriteLine("value " + y);',
    'Debug.WriteLine($"value {y}");',
    'var note = "NullReferenceException maps to 400";',
    '// Console.WriteLine("debug"); builder.Logging.AddNLogWeb(); builder.Host.UseNLog();',
    'var hint = "throw new AppException(500, \\"invalid_x\\")";'
  ].join('\n');
  for (const check of loggingChecks.filter(c => c !== 'OBS-01')) assert.deepEqual(lines(check, text), [], check);
  // The real Console write is OBS-01's subject; Debug.WriteLine, comments and strings are not.
  assert.deepEqual(lines('OBS-01', text), [4]);
  assert.deepEqual(lines('LOG-02', 'logger.error("x" + y);', 'apps/web/agmwa-fixture-ng/src/app/a.ts'), []);
});

test('end-to-end scan reports the template defects as Golden review candidates without message text', t => {
  const secret = 'TemplateSentinel42';
  const f = fixture(t, {
    [filter]: [
      'namespace Fixture.Presentation.Filters;',
      '',
      'public sealed class ActionLoggingFilter',
      '{',
      `    public void Done(string actionName, Exception ex) { _logger.LogError("${secret} {Action}: " + ex.ToString()); _logger.LogInformation("Ended: {Action} ({ElapsedMs} ms)", actionName); }`,
      '}'
    ].join('\n'),
    [middleware]: [
      'namespace Fixture.Presentation.Middlewares;',
      '',
      'public class GlobalExceptionMiddleware',
      '{',
      '    private static readonly Dictionary<Type, int> Map = new() { { typeof(NullReferenceException), StatusCodes.Status400BadRequest } };',
      '}'
    ].join('\n')
  });
  const report = scan(f.args);
  const findings = report.findings.filter(x => ['LOG-01', 'LOG-02', 'ERR-03'].includes(x.authority.goldenRuleId));
  assert.deepEqual(findings.map(x => `${x.detectorId}:${x.line}`).sort(), ['be-error-status:5', 'be-log-composition:5', 'be-log-template:5']);
  for (const finding of findings) {
    assert.equal(finding.disposition, 'review-candidate');
    assert.equal(finding.actualEvidenceLevel, 'text');
    assert.equal(finding.authority.tier, 'MUST');
  }
  assert(!JSON.stringify(report).includes(secret));
  const executions = report.rules.filter(r => bindings.some(b => b.textCheck && b.detectorId === r.detectorId));
  assert.equal(executions.length, bindings.filter(r => r.textCheck).length);
  assert(executions.filter(r => r.denominator).every(r => r.executionStatus === 'evaluated'));
  assert(report.limitations.some(l => l.startsWith('Logging and error-mapping observations')));
});

test('end-to-end scan reports the observability baseline as SHOULD with judgment guidance', t => {
  const f = fixture(t, {
    'services/agmws-fixture-netcore/Src/Shared/Extensions/ProgramExtensions.cs': [
      'namespace Fixture.Shared.Extensions;',
      '',
      'public static class ProgramExtensions',
      '{',
      '    public static void ConfigureLogging(WebApplicationBuilder builder) { builder.Logging.AddNLogWeb("nlog.config"); builder.Host.UseNLog(); }',
      '}'
    ].join('\n'),
    'services/agmws-fixture-netcore/Src/Application/UseCases/AreaUseCase.cs': [
      'namespace Fixture.Application.UseCases;',
      '',
      'public sealed class AreaUseCase',
      '{',
      '    public void Check(string id) { Console.WriteLine($"Exec: {id}"); if (id.Length != 2) throw new AppException(500, "province_id_must_be_2_characters", "Province ID must be 2 characters long"); }',
      '}'
    ].join('\n')
  });
  const report = scan(f.args);
  const findings = report.findings.filter(x => x.detectorId.startsWith('be-obs-'));
  assert.deepEqual(findings.map(x => x.detectorId).sort(), ['be-obs-console-write', 'be-obs-input-as-500', 'be-obs-nlog-duplicate']);
  for (const finding of findings) {
    assert.equal(finding.authority.tier, 'SHOULD');
    assert.match(finding.authority.goldenRuleId, /^none — OBS-0\d observability baseline$/);
    assert.equal(finding.disposition, 'review-candidate');
  }
  const markdown = renderMarkdown(report);
  assert(markdown.includes('Observability baseline (SHOULD)'));
  const prompt = fixPrompts(report).find(p => p.group.detectorId === 'be-obs-input-as-500').prompt;
  assert(prompt.includes(judgmentLine));
  assert.match(prompt, /observability baseline ของ agm-lint/);
});

test('ERR-06 flags reserved exceptions, including ?? throw, and leaves AppException alone', () => {
  const text = [
    'var scheme = (context.HttpContext ?? throw new NullReferenceException()).Request.Scheme;',
    'throw new System.Exception("boom");',
    'throw new AppException(400, "invalid_parameter", "x");',
    'throw new InvalidOperationException("HttpContext is not available.");',
    '// throw new NullReferenceException();',
    'var note = "throw new ApplicationException()";',
    'throw new IndexOutOfRangeException();'
  ].join('\n');
  assert.deepEqual(lines('ERR-06', text), [1, 2, 7]);
});

test('ERR-07 flags literal paramName and nameof of a non-parameter', () => {
  const text = [
    'private static object[] Build(ConstructorInfo ctor, Dictionary<string, object> byProp)',
    '{',
    '    var a = param.Name ?? throw new ArgumentNullException("key");',
    '    var b = x ?? throw new ArgumentNullException(nameof(ctor));',
    '    var c = x ?? throw new ArgumentNullException(nameof(other));',
    '    throw new ArgumentException("bad value", nameof(byProp));',
    '    throw new ArgumentException("bad value", "byProp");',
    '    throw new ArgumentOutOfRangeException(nameof(ctor), "too large");',
    '}',
    'public string Name { set { _name = value ?? throw new ArgumentNullException(nameof(value)); } }'
  ].join('\n');
  assert.deepEqual(lines('ERR-07', text), [3, 5, 7]);
});

test('QUALITY-06 flags trailing return/continue only where they change nothing', () => {
  const text = [
    'private void Trace()',
    '{',
    '    try { Write(); }',
    '    catch',
    '    {',
    '        // Diagnostics must not interrupt the fallback.',
    '        return;',
    '    }',
    '}',
    'private object Build()',
    '{',
    '    for (int i = 0; i < n; i++)',
    '    {',
    '        if (Match(i)) { args[i] = v; continue; }',
    '        if (param.HasDefaultValue) { continue; }',
    '        continue;',
    '    }',
    '    if (done) { return; }',
    '    return result;',
    '}',
    'public void Stop() { Close(); return; }'
  ].join('\n');
  assert.deepEqual(lines('QUALITY-06', text), [7, 16, 21]);
});
