import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture, fe, cs, sql } from './helpers.mjs';
import { bindings, catalog } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { securityObservations, securityTable } from '../skills/agrimap-golden-lint-skills/scripts/security.mjs';
import { scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { fixPrompts, renderMarkdown, guide, remediation } from '../skills/agrimap-golden-lint-skills/scripts/render.mjs';

const controller = 'services/agmws-fixture-netcore/Src/Presentation/Controllers/AuthController.cs';
const program = 'services/agmws-fixture-netcore/Src/Program.cs';
const libraryCs = 'standards/libraries/netcore/AgriMap.Platform/AgriMap.Platform/Src/Security/TokenService.cs';
const fileFor = lane => lane.startsWith('fe') ? fe : lane.startsWith('sql') ? sql : cs;
// Unit-level: which sites one class reports for one text, as line:severity pairs.
const hits = (cls, lane, text, file = fileFor(lane)) => securityObservations(text, { lane, securityClass: cls }, { path: file }).map(o => `${o.line}:${o.security.severity}`);

test('class table, bindings and catalog stay consistent and project-neutral', () => {
  assert.equal(securityTable.length, 22);
  for (const entry of securityTable) {
    assert.match(entry.class, /^SEC-\d{2}$/);
    assert.match(entry.owasp, /^A(?:0[1-9]|10):2021 /);
    assert(entry.cwe.every(c => /^CWE-\d+$/.test(c)) && entry.lanes.length && entry.observation && entry.responseContract, entry.class);
    assert(remediation.securityClasses[entry.class]?.contract, entry.class);
    for (const lane of entry.lanes) assert(bindings.some(r => r.securityClass === entry.class && r.lane === lane), `${entry.class}:${lane}`);
  }
  const security = bindings.filter(r => r.securityClass);
  assert(security.every(r => catalog.some(f => f.detectorIds.includes(r.detectorId))));
  // Golden tier only where Golden states the rule; everything else is a SHOULD baseline.
  assert(security.every(r => (r.sourceStatusBasis === 'external-security-standard') === (r.tier === 'SHOULD')));
  assert.deepEqual([...new Set(security.filter(r => r.tier === 'MUST').map(r => r.securityClass))].sort(), ['SEC-01', 'SEC-05', 'SEC-06', 'SEC-07']);
  assert(!security.some(r => r.lane === 'sql-procedure' && r.tier === 'MUST'));
  // No product host, route or field from a single application is baked into the table.
  assert(!/\bmea\b|workforce|agrimap-api|fakeLogin|FunctionID/i.test(JSON.stringify(securityTable)));
});

test('SEC-01 flags composed SQL and leaves parameterized SQL alone', () => {
  const text = [
    'var a = $"SELECT * FROM UM_USER WHERE NAME = \'{name}\'";',
    'var b = "SELECT * FROM UM_USER WHERE NAME = @name";',
    'var c = "SELECT * FROM T ORDER BY " + sort;',
    'var d = db.Users.FromSql($"SELECT * FROM UM_USER WHERE NAME = {name}");',
    'var e = db.Users.FromSqlRaw(query);',
    'var f = "Please select an item from the list";',
    'var g = $"Hello {name}";'
  ].join('\n');
  assert.deepEqual(hits('SEC-01', 'be-main', text), ['1:critical', '3:critical', '5:critical']);
  const procedure = [
    'CREATE OR ALTER PROCEDURE dbo.demo_q @name NVARCHAR(50), @col SYSNAME AS',
    'BEGIN',
    "  DECLARE @sql NVARCHAR(MAX) = N'SELECT * FROM T WHERE NAME = ''' + @name + '''';",
    '  EXEC(@sql);',
    "  DECLARE @safe NVARCHAR(MAX) = N'SELECT * FROM T WHERE NAME = @n';",
    "  EXEC sp_executesql @safe, N'@n NVARCHAR(50)', @n = @name;",
    "  DECLARE @q NVARCHAR(MAX) = N'SELECT ' + QUOTENAME(@col) + N' FROM T';",
    '  EXEC(@q);',
    "  EXEC('SELECT * FROM ' + @col);",
    '  EXEC dbo.other_q @name;',
    'END'
  ].join('\n');
  assert.deepEqual(hits('SEC-01', 'sql-procedure', procedure), ['4:critical', '9:critical']);
});

test('SEC-05 separates missing authorization, test endpoints and intended anonymous access', () => {
  const text = [
    '[ApiController]',
    '[Route("api/auth")]',
    'public class AuthController : ControllerBase',
    '{',
    '    [HttpPost("fakeLogin")]',
    '    public IActionResult FakeLogin() => Ok();',
    '    [AllowAnonymous]',
    '    [HttpPost("login")]',
    '    public IActionResult Login() => Ok();',
    '    [HttpGet("me")]',
    '    public IActionResult Me() => Ok();',
    '}',
    '[Authorize]',
    '[ApiController]',
    'public class SafeController : ControllerBase',
    '{',
    '    [HttpGet("x")] public IActionResult X() => Ok();',
    '}',
    'public class ChildController : BaseApiController { [HttpGet("y")] public IActionResult Y() => Ok(); }',
    '[AllowAnonymous]',
    '[HttpGet("health")]',
    'public IActionResult Health() => Ok();'
  ].join('\n');
  assert.deepEqual(hits('SEC-05', 'be-main', text), ['3:critical', '5:high', '7:low', '19:medium']);
  const minimal = 'app.MapGet("/items", () => 1);\napp.MapGet("/health", () => 1);\napp.MapPost("/orders", (Order o) => { Save(o); return 1; }).RequireAuthorization();';
  assert.deepEqual(hits('SEC-05', 'be-main', minimal), ['1:high']);
  assert.deepEqual(hits('SEC-05', 'be-main', 'var options = new AuthorizationOptions { FallbackPolicy = policy };\napp.MapGet("/items", () => 1);'), []);
  // Probe routes are anonymous by design; similar words inside other segments are not probes.
  assert.deepEqual(hits('SEC-05', 'be-main', '[ApiController]\npublic class PingController : ControllerBase\n{\n    [HttpGet("pingpong")]\n    public object PingPong() => 1;\n}'), []);
  assert.deepEqual(hits('SEC-05', 'be-main', '[ApiController]\npublic class MapController : ControllerBase\n{\n    [HttpGet("field-mapping")]\n    public object Mapping() => 1;\n}'), ['2:critical']);
});

test('SEC-06 and SEC-07 keep internal detail and secrets out of responses and logs', () => {
  const errors = [
    'try { x(); } catch (Exception ex) { _logger.LogError(ex, "failed"); return BadRequest(ex.Message); }',
    'try { x(); } catch (Exception e) { throw new AppException(500, "internal_server_error", $"failed: {e.Message}"); }',
    'try { x(); } catch (AppException ex) { return BadRequest(ex.Message); }',
    'try { x(); } catch (Exception ex) { _logger.LogError(ex, "boom {Message}", ex.Message); throw; }',
    'app.UseDeveloperExceptionPage();',
    'if (app.Environment.IsDevelopment()) { app.UseDeveloperExceptionPage(); }'
  ].join('\n');
  assert.deepEqual(hits('SEC-06', 'be-main', errors), ['1:high', '2:high', '5:medium']);
  const logs = [
    '_logger.LogInformation("Login {User} {Password}", u, p);',
    '_logger.LogInformation("Login {User}", request.UserName);',
    '_logger.LogDebug("issued " + accessToken);',
    '_logger.LogInformation("Lifetime {TokenLifetime}", tokenLifetime);',
    '_logger.LogInformation("Run {Id}", id, cancellationToken);',
    '_logger.LogInformation("Headers {H}", Request.Headers);'
  ].join('\n');
  assert.deepEqual(hits('SEC-07', 'be-library', logs, libraryCs), ['1:high', '3:high', '6:high']);
});

test('crypto, token, TLS, deserialization, CORS, override and cookie classes report bounded sites', () => {
  const text = [
    'var h = MD5.Create(); var s = SHA256.Create(); var r = RSA.Create(1024); var ok = RSA.Create(2048);',
    'var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes("short-key"));',
    'var p = new TokenValidationParameters { ValidateIssuer = false, ValidateAudience = true, ValidateLifetime = false };',
    'public string Issue() { var t = new JwtSecurityToken(issuer, audience, claims, signingCredentials: creds); return handler.WriteToken(t); }',
    'handler.ServerCertificateCustomValidationCallback = (m, c, ch, e) => true;',
    'var bf = new BinaryFormatter(); var js = new JsonSerializerSettings { TypeNameHandling = TypeNameHandling.None };',
    'policy.AllowAnyOrigin().AllowAnyHeader().AllowCredentials();',
    'app.UseHttpMethodOverride();',
    'var o = new CookieOptions { HttpOnly = false, Secure = true, SameSite = SameSiteMode.None };'
  ].join('\n');
  assert.deepEqual(hits('SEC-08', 'be-library', text, libraryCs), ['1:high', '1:high', '2:high']);
  assert.deepEqual(hits('SEC-09', 'be-library', text, libraryCs), ['3:critical', '3:critical']);
  assert.deepEqual(hits('SEC-10', 'be-library', text, libraryCs), ['4:medium']);
  assert.deepEqual(hits('SEC-10', 'be-library', 'public string Issue() { var t = new JwtSecurityToken(issuer, audience, new[] { new Claim(JwtRegisteredClaimNames.Jti, id) }, expires: until); }', libraryCs), []);
  assert.deepEqual(hits('SEC-11', 'be-library', text, libraryCs), ['5:critical']);
  assert.deepEqual(hits('SEC-12', 'be-library', text, libraryCs), ['6:critical']);
  assert.deepEqual(hits('SEC-13', 'be-library', text, libraryCs), ['7:critical']);
  assert.deepEqual(hits('SEC-13', 'be-main', 'policy.AllowAnyOrigin().AllowAnyHeader();'), ['1:medium']);
  assert.deepEqual(hits('SEC-14', 'be-library', text, libraryCs), ['8:medium']);
  assert.deepEqual(hits('SEC-20', 'be-library', text, libraryCs), ['9:medium']);
});

test('path, redirect, query, response-field and paging classes respect visible guards', () => {
  const text = [
    'public IActionResult Download(string fileName) { var path = Path.Combine(_root, fileName); return PhysicalFile(path, "application/pdf"); }',
    'public IActionResult Safe(string fileName) { var full = Path.GetFullPath(Path.Combine(_root, fileName)); if (!full.StartsWith(_root)) return NotFound(); return PhysicalFile(full, "a"); }',
    'public IActionResult Go(string returnUrl) => Redirect(returnUrl);',
    'public IActionResult Go2(string returnUrl) { if (Url.IsLocalUrl(returnUrl)) return Redirect(returnUrl); return Redirect("/"); }',
    'public IActionResult Find([FromQuery] string password, [FromQuery] string username, CancellationToken cancellationToken) => Ok();',
    'public class UserResponseDto { public string Email { get; set; } public string PasswordHash { get; set; } public string FunctionId { get; set; } }',
    'public class UserSearchRequestDto { public double FirstRow { get; set; } [Range(1, 1000)] public int RowsPerPage { get; set; } }'
  ].join('\n');
  assert.deepEqual(hits('SEC-04', 'be-main', text), ['1:high']);
  assert.deepEqual(hits('SEC-15', 'be-main', text), ['3:medium']);
  assert.deepEqual(hits('SEC-16', 'be-main', text), ['5:medium']);
  // FunctionId is an identifier of a function, not a national ID: only explicit field names match.
  assert.deepEqual(hits('SEC-17', 'be-main', text), ['6:medium', '6:high']);
  assert.deepEqual(hits('SEC-18', 'be-main', text), ['7:medium']);
  // Real-code shapes: a service field named *paths, a GUID-validated id and a configuration-driven redirect.
  const quiet = [
    'public string SessionPath(string id) { if (!Guid.TryParseExact(id, "N", out _)) throw new AppException(404, "file_not_found", "x"); return Path.Combine(_paths.StagingRoot(), id); }',
    'public string Root { get { return Path.Combine(_paths.StagingRoot(), "sessions"); } }',
    'public async Task<IActionResult> Ios() => Redirect(await _redirectUseCase.GetMobileUrlAsync("IOS_URL"));',
    'public IActionResult Open(DownloadRequest request) { var name = request.FileName; return PhysicalFile(Path.Combine(_root, name), "a"); }'
  ].join('\n');
  assert.deepEqual(hits('SEC-04', 'be-main', quiet), ['4:high']);
  assert.deepEqual(hits('SEC-15', 'be-main', quiet), []);
  assert.deepEqual(hits('SEC-19', 'be-main', 'var builder = WebApplication.CreateBuilder(args); var app = builder.Build(); app.UseHsts(); app.Run();', program), ['1:low']);
  assert.deepEqual(hits('SEC-19', 'be-main', 'var builder = WebApplication.CreateBuilder(args); var app = builder.Build(); app.UseAgriMapSecurityHeaders(); app.Run();', program), []);
});

test('frontend classes cover sanitizer bypass, storage, redirects and query credentials', () => {
  const text = [
    'this.el.nativeElement.innerHTML = data.html;',
    "this.el.nativeElement.innerHTML = '';",
    'const s = this.sanitizer.bypassSecurityTrustHtml(value);',
    "localStorage.setItem('access_token', token);",
    "localStorage.setItem('theme', 'dark');",
    "window.location.href = this.route.snapshot.queryParams['returnUrl'];",
    'window.location.href = environment.loginUrl;',
    "this.http.get('/api/u', { params: { password: p, page: 1 } });",
    'const url = `/api/login?password=${p}`;',
    "setTimeout('alert(1)', 10);",
    'setTimeout(() => this.load(), 10);'
  ].join('\n');
  assert.deepEqual(hits('SEC-21', 'fe-main', text), ['1:high', '3:high', '10:high']);
  assert.deepEqual(hits('SEC-22', 'fe-main', text), ['4:medium']);
  assert.deepEqual(hits('SEC-15', 'fe-library', text, 'standards/libraries/angular/agrimap-platform/projects/demo/src/lib/a.ts'), ['6:medium']);
  assert.deepEqual(hits('SEC-16', 'fe-main', text), ['8:medium', '9:medium']);
});

test('adversarial: comments, string contents and similar names never trigger', () => {
  const cSharp = [
    '// Process.Start(cmd); BinaryFormatter; app.UseHttpMethodOverride();',
    '/* ValidateIssuer = false; MD5.Create(); */',
    'var doc = "Do not use BinaryFormatter or AllowAnyOrigin()";',
    'var note = "Process.Start(cmd)";',
    'public class FunctionResponseDto { public string FunctionId { get; set; } public string Username { get; set; } }'
  ].join('\n');
  for (const cls of ['SEC-02', 'SEC-08', 'SEC-09', 'SEC-12', 'SEC-13', 'SEC-14', 'SEC-17']) assert.deepEqual(hits(cls, 'be-main', cSharp), [], cls);
  assert.deepEqual(hits('SEC-21', 'fe-main', "// el.innerHTML = x;\nconst help = 'call bypassSecurityTrustHtml only for constants';"), []);
  assert.deepEqual(hits('SEC-01', 'sql-procedure', "-- EXEC(@sql)\nSELECT 'EXEC(' + 'x' + ')';"), []);
  // A class is only evaluated on the lanes it declares.
  assert.deepEqual(hits('SEC-05', 'be-library', '[ApiController] public class AController : ControllerBase { [HttpGet] public IActionResult A() => Ok(); }', libraryCs), []);
});

test('end-to-end scan attaches OWASP authority, keeps values out of the report and carries the response contract', t => {
  const secret = 'Sup3rS3cretValue42';
  const f = fixture(t, {
    [controller]: [
      'namespace Fixture.Presentation.Controllers;',
      '',
      '[ApiController]',
      '[Route("api/auth")]',
      'public class AuthController : ControllerBase',
      '{',
      '    [HttpPost("fakeLogin")]',
      `    public IActionResult FakeLogin(string user) { _logger.LogInformation("login {Password}", "${secret}"); var q = "SELECT * FROM UM_USER WHERE NAME = '" + user + "'"; return Ok(q); }`,
      '}'
    ].join('\n'),
    [fe]: 'export class DemoComponent { show(html: string) { this.host.innerHTML = html; } }',
    [sql]: 'CREATE OR ALTER PROCEDURE dbo.demo_q @col SYSNAME AS\nBEGIN\n  EXEC(\'SELECT * FROM \' + @col);\nEND'
  });
  const report = scan(f.args);
  const findings = report.findings.filter(x => x.security);
  const classes = [...new Set(findings.map(x => `${x.detectorId}:${x.security.class}`))].sort();
  assert.deepEqual(classes, ['be-sec-missing-authorization:SEC-05', 'be-sec-sensitive-logging:SEC-07', 'be-sec-sql-injection:SEC-01', 'fe-sec-dom-xss-sink:SEC-21', 'sql-procedure-sec-sql-injection:SEC-01']);
  for (const finding of findings) {
    assert.equal(finding.disposition, 'review-candidate');
    assert.equal(finding.authority.securityStandard.resultStatus, 'not-imported');
    assert.equal(finding.authority.securityStandard.standard, 'OWASP Top 10:2021');
  }
  assert.equal(findings.find(x => x.detectorId === 'be-sec-sql-injection').authority.securityStandard.goldenBacking, 'golden-rule');
  assert.equal(findings.find(x => x.detectorId === 'sql-procedure-sec-sql-injection').authority.tier, 'SHOULD');
  assert(!JSON.stringify(report).includes(secret));
  const executions = report.rules.filter(r => r.detectorId.includes('-sec-'));
  assert.equal(executions.length, bindings.filter(r => r.securityClass).length);
  assert(executions.filter(r => r.denominator).every(r => r.executionStatus === 'evaluated'));
  const markdown = renderMarkdown(report);
  assert.match(markdown, /Security SEC-01 · A03:2021 Injection · CWE-89/);
  assert.match(markdown, /Response contract:/);
  const prompt = fixPrompts(report).find(p => p.group.detectorId === 'be-sec-sql-injection').prompt;
  assert.match(prompt, /^ใช้สกิล agm-be แก้ SEC-01/);
  assert.match(prompt, /regression test ของ request ที่ถูกต้องและมีสิทธิ์/);
  assert.equal(guide('be-library-sec-token-validation').impact, 'cross-service');
  assert.equal(guide('sql-procedure-sec-sql-injection').skill, 'agm-sql');
});
