// Read-only lexical security observations mapped to OWASP Top 10:2021 and CWE. No execution, no
// network and no data-flow proof: every observation is a review candidate whose reachability, caller
// identity and compensating controls (gateway, shared middleware, global policy) stay unproven.
// Observation text names APIs and shapes from a fixed vocabulary; code and literal values never leave.
import path from 'node:path';
import { hash, json, packageRoot } from './contracts.mjs';
import { blank, commentAt, lineEnd, blockEnd, literalStart, readLiteral, scrub } from './hardcode.mjs';

const table = json(path.join(packageRoot, 'skills/agrimap-golden-lint-skills/assets/security-classes.json'));
export const securityTable = table.classes;
export const securityStandard = table.standard;
export const securityClass = id => table.classes.find(entry => entry.class === id);

// Comments and literal bodies are blanked with offsets kept, so a code pattern never matches inside a
// string or comment, while literal values and interpolation holes stay available for shape checks.
const lexCache = new Map();
function lex(text, language) {
  const key = language + '\0' + text;
  if (lexCache.has(key)) return lexCache.get(key);
  const sql = language === 'sql', parts = [], strings = [];
  let index = 0, last = 0;
  const cut = (end, replacement) => { parts.push(text.slice(last, index), replacement); index = end; last = end; };
  while (index < text.length) {
    if (commentAt(text, index, sql)) { const end = text[index + 1] === '*' ? blockEnd(text, index) : lineEnd(text, index); cut(end, blank(text.slice(index, end))); continue; }
    const start = literalStart(text, index, sql);
    if (start === -1) { index++; continue; }
    const { value, end } = readLiteral(text, start, sql);
    const interpolated = language === 'cs' ? text.slice(index, start).includes('$') : language === 'ts' && text[start] === '`';
    strings.push({ index, end, value, holes: interpolated ? holesOf(value, language) : [] });
    cut(end, blank(text.slice(index, end)));
  }
  parts.push(text.slice(last));
  const lexed = { code: parts.join(''), strings };
  if (lexCache.size > 512) lexCache.clear();
  lexCache.set(key, lexed);
  return lexed;
}
function holesOf(value, language) {
  const pattern = language === 'cs' ? /(?<!\{)\{(?!\{)([^{}]+)\}/g : /\$\{([^}]+)\}/g;
  // nameof(...) and nested literals are compile-time text, not caller values.
  return [...value.matchAll(pattern)].map(m => m[1].trim()).filter(h => h && !/^nameof\s*\(/.test(h) && !/^(?:"[^"]*"|'[^']*')$/.test(h));
}

const at = (code, index) => code.slice(0, index);
function closing(code, open, pair = '()') {
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === pair[0]) depth++;
    else if (code[i] === pair[1] && --depth === 0) return i;
  }
  return code.length;
}
// Argument text of the call whose regex match ends with the opening parenthesis.
function callAt(code, match) {
  const open = match.index + match[0].length - 1, close = closing(code, open);
  return { open, close, args: code.slice(open + 1, close) };
}
function firstArg(code, call) {
  let depth = 0;
  for (let i = call.open + 1; i < call.close; i++) {
    if ('([{'.includes(code[i])) depth++;
    else if (')]}'.includes(code[i])) depth--;
    else if (code[i] === ',' && depth === 0) return { start: call.open + 1, end: i };
  }
  return { start: call.open + 1, end: call.close };
}
function statementOf(code, index) {
  const start = Math.max(code.lastIndexOf(';', index), code.lastIndexOf('{', index), code.lastIndexOf('}', index)) + 1;
  const end = code.indexOf(';', index);
  return { start, end: end === -1 ? code.length : end, text: code.slice(start, end === -1 ? code.length : end) };
}
const stringsIn = (ctx, start, end) => ctx.strings.filter(s => s.index >= start && s.end <= end);
const keywords = /\b(?:new|null|true|false|default|nameof|typeof|await|this)\b/g;
// A range is non-literal when code outside literals names a value or a literal interpolates one.
const nonLiteral = (ctx, start, end) => /[A-Za-z_]/.test(ctx.code.slice(start, end).replace(keywords, '')) || stringsIn(ctx, start, end).some(s => s.holes.length);
const concatenated = segment => /\+=?\s*[A-Za-z_(]/.test(segment) || /[A-Za-z_)\]]\s*\+(?!\+)/.test(segment.replace(/\b(?:new|return|await)\b/g, ''));
function composed(ctx, s) {
  if (s.holes.length) return true;
  if (/\{\d+\}/.test(s.value) && /\b(?:Format|AppendFormat)\s*\(\s*$/.test(at(ctx.code, s.index).slice(-80))) return true;
  return concatenated(statementOf(ctx.code, s.index).text);
}
// Method/constructor headers approximate the enclosing member for guard checks in C#.
function memberOf(ctx, index) {
  if (!ctx.members) ctx.members = [...ctx.code.matchAll(/^[ \t]*(?:public|private|protected|internal)\b[^;=\n{]*\(/gm)].map(m => m.index);
  const start = ctx.members.filter(i => i <= index).at(-1) ?? 0, end = ctx.members.find(i => i > index) ?? ctx.code.length;
  return { start, end, code: ctx.code.slice(start, end) };
}
// Heads of identifier chains (request.FileName -> request, FileName) inside an argument range.
const chains = segment => [...segment.matchAll(/(?<![\w.])([A-Za-z]\w*)((?:\s*\.\s*[A-Za-z_]\w*)*)/g)].map(([, head, rest]) => [head, ...rest.split('.').map(part => part.trim()).filter(Boolean)]);
// Property names that carry a file name or path (request.FileName, session.FilePath); ids are lookups.
const nameShape = { test: name => /file|path|folder|dir|name|document|attachment/i.test(name) && !/(?:Id|Ids|Count|Size|Length|Type|Extension)$/.test(name) };
// A bare parameter is caller-shaped when it names a file (fileName, attachment); a parameter called
// path, root or directory is usually an internal, already composed location.
const paramShape = name => /name|document|attachment/i.test(name) || (/file/i.test(name) && !/path|dir|folder|root|id$/i.test(name));
// Parameters of the enclosing member plus locals assigned from them: the values a caller can shape.
// The flag says whether the value is file-name shaped, so a path built from a validated id through a
// helper is not mistaken for a caller-supplied name.
function memberParams(ctx, index) {
  const member = memberOf(ctx, index), open = ctx.code.indexOf('(', member.start);
  if (open === -1 || open > index) return new Map();
  const params = new Map(ctx.code.slice(open + 1, closing(ctx.code, open)).split(',').map(p => p.replace(/=[\s\S]*$/, '').trim().match(/([A-Za-z_]\w*)\s*$/)?.[1]).filter(Boolean).map(name => [name, paramShape(name)]));
  for (const m of member.code.matchAll(/\b[\w.<>?\[\]]+\s+([A-Za-z_]\w*)\s*=(?!=)\s*([^;]+);/g)) {
    const sources = chains(m[2]).filter(chain => params.has(chain[0]));
    if (sources.length) params.set(m[1], sources.some(chain => params.get(chain[0]) || chain.slice(1).some(part => nameShape.test(part))));
  }
  return params;
}
const isDevelopmentGuarded = (code, index) => /IsDevelopment\s*\(/.test(code.slice(Math.max(0, index - 400), index));
function attributesBefore(code, index) {
  const start = Math.max(code.lastIndexOf(';', index), code.lastIndexOf('{', index), code.lastIndexOf('}', index)) + 1;
  return { start, text: code.slice(start, index) };
}
const split = value => value.split(/[\/_.\-{}\s]+|(?<=[a-z0-9])(?=[A-Z])/).filter(Boolean).map(part => part.toLowerCase());

// Fixed vocabulary for sensitive names; the matched category, never the identifier, is reported.
const sensitive = [
  ['password', /pass(?:word|wd)|^pwd|pwd$/i], ['secret', /secret|privatekey/i], ['token', /token|jwt|bearer/i],
  ['api key', /api_?key|accesskey/i], ['authorization value', /^authorization/i], ['cookie', /^cookies?$|cookievalue/i],
  ['one-time code', /^otp|otp$|otpcode|^pin$|^pincode$/i], ['card number', /cardnumber|creditcard|^cvv$/i],
  ['national identifier', /citizen_?id|citizen_?no|national_?id|id_?card|personal_?id/i]
];
const benign = /cancellation|expir|lifetime|length|count|policy|url$|uri$|endpoint|options|settings|provider|service|handler|validator|validation|required|format|enabled|type$|name$|generator|factory|manager|helper/i;
function sensitiveCategory(name) {
  if (!name || benign.test(name)) return null;
  return sensitive.find(([, pattern]) => pattern.test(name))?.[0] ?? null;
}
const identifiers = segment => segment.replace(keywords, ' ').match(/[A-Za-z_]\w*/g) || [];

function observation(ctx, entry, site) {
  const { text } = ctx, snippet = ctx.code.slice(site.index, site.index + 80).replace(/\s+/g, ' ');
  const key = `${site.detail}|${snippet}`;
  return { line: text.slice(0, site.index).split('\n').length, column: site.index - text.lastIndexOf('\n', site.index - 1),
    anchor: `${entry.class}:${hash(key).slice(0, 16)}`, fingerprint: hash(`${entry.class}:${key}`),
    observation: scrub(`${entry.title} (${entry.owasp}; ${entry.cwe.join(', ')}): ${site.detail} ${entry.observation} Review candidate: reachability, caller identity and compensating controls are not proven from text.`),
    observationKind: 'text-observation', disposition: 'review-candidate', applicability: 'unknown', actualEvidenceLevel: 'text',
    security: { class: entry.class, owasp: entry.owasp, cwe: entry.cwe, severity: site.severity || entry.severity } };
}
const sites = (ctx, pattern, detail, severity) => [...ctx.code.matchAll(pattern)].map(m => ({ index: m.index, detail, severity }));

const sqlUpper = /\bSELECT\b[\s\S]+?\bFROM\b|\bINSERT\s+INTO\b|\bUPDATE\s+[\w\[\].]+\s+SET\b|\bDELETE\s+FROM\b|\bMERGE\s+(?:INTO\s+)?[\w\[\].]+|\bWHERE\s+[\w\[\].]+\s*(?:[=<>]|LIKE\b|IN\b)|\bORDER\s+BY\b|\bEXEC(?:UTE)?\s+[\w\[\].]+/;
const sqlLower = /\bselect\s+[\w*,.\s\[\]]+?\s+from\s+[\w\[\]#.]+\s*(?:where|join|inner|left|order\s+by|group\s+by|\)|$)|\bwhere\s+[\w\[\].]+\s*(?:=|<|>|like\b)|\border\s+by\s*$/;
const safeSqlSink = /\b(?:FromSql|FromSqlInterpolated|ExecuteSql|ExecuteSqlAsync|ExecuteSqlInterpolated|ExecuteSqlInterpolatedAsync|SqlQuery)\s*(?:<[^>()]*>)?\s*\(\s*$/;
const ldapShape = /\(\s*(?:[&|!]\s*\(\s*)*(?:sAMAccountName|userPrincipalName|uid|cn|mail|memberOf|objectClass|objectCategory|distinguishedName|givenName|sn|displayName|employeeID|employeeNumber)\s*[~<>]?=/i;
// Whole route or name segments only, so "mapping" or "delivery" never reads as a probe.
const probeParts = new Set(['health', 'healthz', 'ready', 'readiness', 'live', 'liveness', 'ping', 'pingpong']);
const healthShape = { test: value => split(value).some(part => probeParts.has(part)) };
const testShape = new Set(['fake', 'mock', 'dummy', 'debug', 'test', 'bypass', 'backdoor', 'impersonate', 'impersonation']);
const redirectShape = /(?:return|redirect|next|callback|target|goto|continue|dest)\w*|queryParam|searchParams|URLSearchParams/i;
const queryShape = /[?&](?:password|passwd|pwd|token|access_token|id_token|refresh_token|secret|client_secret|api_?key|apikey|otp|pin|citizen_?id|national_?id)=/i;
const pagingName = /^(?:PageSize|RowsPerPage|PerPage|Limit|Take|Top|MaxRows|MaxResults|MaxRecords|BatchSize|FirstRow|Skip|Offset|PageNumber|PageIndex|Page)$/i;
const secretField = /(?:password|passwd|passwordhash|passwordsalt|^salt|secret|privatekey|pincode)$/i;
const personalField = /(?:email|emailaddress|citizenid|citizenno|nationalid|idcard|idcardno|personalid|taxid|passportno|phone|phoneno|phonenumber|mobile|mobileno|birthdate|dateofbirth)$/i;
const safeExceptionType = /(?:^|\.)(?:App|Validation|Business|Procedure|Domain)\w*Exception$/;

const detectors = {
  'SEC-01': ctx => ctx.language === 'sql' ? dynamicSql(ctx) : [
    ...ctx.strings.filter(s => (sqlUpper.test(s.value) || sqlLower.test(s.value)) && composed(ctx, s)
      && !(safeSqlSink.test(at(ctx.code, s.index).slice(-80)) && !concatenated(statementOf(ctx.code, s.index).text)))
      .map(s => ({ index: s.index, detail: 'A SQL-shaped literal is completed by interpolation, concatenation or string formatting.' })),
    ...[...ctx.code.matchAll(/\b(?:FromSqlRaw|ExecuteSqlRaw|ExecuteSqlRawAsync|SqlQueryRaw)\s*(?:<[^>()]*>)?\s*\(/g)].flatMap(m => {
      const arg = firstArg(ctx.code, callAt(ctx.code, m));
      return !stringsIn(ctx, arg.start, arg.end).length && nonLiteral(ctx, arg.start, arg.end) ? [{ index: m.index, detail: 'A raw SQL API receives command text built outside the call.' }] : [];
    })
  ],
  'SEC-02': ctx => {
    const found = [], hasInfo = /\bProcessStartInfo\b/.test(ctx.code);
    for (const m of ctx.code.matchAll(/\bProcess\s*\.\s*Start\s*\(/g)) {
      const call = callAt(ctx.code, m);
      if (nonLiteral(ctx, call.open + 1, call.close) && !(hasInfo && /^\s*\w+\s*$/.test(call.args))) found.push({ index: m.index, detail: 'Process.Start receives a non-literal command or argument.' });
    }
    for (const m of ctx.code.matchAll(/\bnew\s+ProcessStartInfo\b/g)) {
      const end = statementOf(ctx.code, m.index).end, body = ctx.code.slice(m.index, end);
      const paren = /^new\s+ProcessStartInfo\s*\(/.exec(body);
      if (paren) { const call = callAt(ctx.code, { index: m.index, 0: paren[0] }); if (nonLiteral(ctx, call.open + 1, call.close)) found.push({ index: m.index, detail: 'ProcessStartInfo is built from a non-literal command or argument.' }); }
      for (const p of body.matchAll(/\b(?:Arguments|FileName)\s*=(?!=)/g)) {
        const start = m.index + p.index + p[0].length, stop = start + (/[,}]/.exec(ctx.code.slice(start, end))?.index ?? end - start);
        if (nonLiteral(ctx, start, stop)) found.push({ index: m.index + p.index, detail: 'ProcessStartInfo Arguments or FileName is assigned a non-literal value.' });
      }
    }
    found.push(...sites(ctx, /\bCSharpScript\s*\.\s*(?:EvaluateAsync|RunAsync|Create)\b/g, 'Roslyn scripting evaluates code at runtime.'));
    for (const m of ctx.code.matchAll(/\.\s*Compute\s*\(/g)) {
      if (!/\bDataTable\b/.test(ctx.code)) break;
      const arg = firstArg(ctx.code, callAt(ctx.code, m));
      if (nonLiteral(ctx, arg.start, arg.end)) found.push({ index: m.index, detail: 'DataTable.Compute evaluates a non-literal expression.' });
    }
    for (const m of ctx.code.matchAll(/\bType\s*\.\s*GetType\s*\(/g)) {
      const arg = firstArg(ctx.code, callAt(ctx.code, m));
      if (nonLiteral(ctx, arg.start, arg.end)) found.push({ index: m.index, detail: 'Type.GetType resolves a type name from a non-literal value.', severity: 'medium' });
    }
    return found;
  },
  'SEC-03': ctx => ctx.strings.filter(s => ldapShape.test(s.value) && composed(ctx, s)).map(s => ({ index: s.index, detail: 'An LDAP filter literal is completed by interpolation, concatenation or string formatting.' })),
  'SEC-04': ctx => {
    const found = [], members = new Set();
    const apis = /\b(?:File\s*\.\s*(?:ReadAll\w*|ReadLines|Open\w*|WriteAll\w*|AppendAll\w*|Delete|Copy|Move|Exists|Create\w*|Replace)|Directory\s*\.\s*(?:GetFiles|EnumerateFiles|GetDirectories|EnumerateDirectories|Delete|CreateDirectory|Exists|Move)|Path\s*\.\s*Combine|PhysicalFile|new\s+(?:FileStream|FileInfo|DirectoryInfo|StreamReader|StreamWriter|PhysicalFileProvider))\s*\(/g;
    const apiTokens = /^(?:Path|File|Directory|FileMode|FileAccess|FileShare|FileOptions|Combine|GetFileName|GetTempPath|GetTempFileName|AppContext|BaseDirectory|ContentRootPath|WebRootPath|CurrentDirectory|Environment|Encoding|UTF8|ContentType|MimeType)$/;
    for (const m of ctx.code.matchAll(apis)) {
      const call = callAt(ctx.code, m), member = memberOf(ctx, m.index);
      if (members.has(member.start)) continue;
      const params = memberParams(ctx, m.index);
      const named = chains(call.args).some(chain => params.has(chain[0]) && (params.get(chain[0]) || chain.slice(1).some(name => !apiTokens.test(name) && nameShape.test(name))));
      const guarded = /\bPath\s*\.\s*GetFileName\s*\(|\bGetFullPath\s*\([\s\S]*?\.\s*StartsWith\s*\(|\bGetRelativePath\s*\(|\bGetInvalid(?:FileName|Path)Chars\b|\bGuid\s*\.\s*(?:TryParse|Parse)\w*\s*\(/.test(member.code);
      if (named && !guarded) { members.add(member.start); found.push({ index: m.index, detail: 'A file-system API receives a name or path value and the enclosing member shows no full-path containment check.' }); }
    }
    return found;
  },
  'SEC-05': ctx => [...controllerSites(ctx), ...minimalApiSites(ctx)],
  'SEC-06': ctx => {
    const found = [];
    for (const m of ctx.code.matchAll(/\bcatch\s*\(\s*([\w.<>]+)\s+(\w+)\s*\)/g)) {
      if (safeExceptionType.test(m[1])) continue;
      const open = ctx.code.indexOf('{', m.index + m[0].length), close = closing(ctx.code, open, '{}'), name = m[2], seen = new Set();
      const uses = [...ctx.code.slice(open, close).matchAll(new RegExp(`\\b${name}\\s*\\.\\s*(?:Message|StackTrace|InnerException|ToString\\s*\\(\\s*\\)|Source|TargetSite)\\b`, 'g'))].map(u => open + u.index);
      uses.push(...stringsIn(ctx, open, close).filter(s => s.holes.some(h => new RegExp(`^${name}\\b`).test(h))).map(s => s.index));
      for (const use of uses.sort((a, b) => a - b)) {
        const statement = statementOf(ctx.code, use);
        if (seen.has(statement.start) || /\b\w*[Ll]og(?:ger)?\w*\s*\.\s*(?:Log\w*|Information|Warning|Error|Debug|Critical|Trace|Fatal)\s*\(/.test(statement.text)) continue;
        if (/\breturn\b|\bthrow\s+new\s+(?:\w+\.)*AppException\b|\b(?:Ok|BadRequest|StatusCode|Problem|NotFound|Conflict|UnprocessableEntity|ValidationProblem|Json|Content|ObjectResult|JsonResult|BadRequestObjectResult|WriteAsync|WriteAsJsonAsync)\s*\(|\b(?:Message|Detail|Details|Error|Errors|ErrorMessage|Description|Reason|Title)\s*=(?!=)/.test(statement.text)) {
          seen.add(statement.start); found.push({ index: use, detail: 'Exception text, stack trace or inner detail flows into a response, a user-facing AppException message or an error field.' });
        }
      }
    }
    for (const m of ctx.code.matchAll(/\bUseDeveloperExceptionPage\s*\(|\b(?:IncludeExceptionDetails|DetailedErrors|IncludeErrorDetails|IncludeExceptionDetailInFaults)\s*=\s*true\b/g)) {
      if (!isDevelopmentGuarded(ctx.code, m.index)) found.push({ index: m.index, detail: 'A developer exception page or detailed-error switch is enabled without a visible development-environment guard.', severity: 'medium' });
    }
    return found;
  },
  'SEC-07': ctx => {
    const found = [];
    for (const m of ctx.code.matchAll(/\b(?:_?\w*[Ll]ogger\w*|Log|Console|Debug|Trace)\s*\.\s*(?:Log(?:Trace|Debug|Information|Warning|Error|Critical)?|Information|Warning|Error|Debug|Verbose|Fatal|Critical|Write(?:Line)?)\s*\(/g)) {
      const call = callAt(ctx.code, m), names = identifiers(call.args);
      for (const s of stringsIn(ctx, call.open, call.close)) names.push(...s.holes.flatMap(identifiers), ...[...s.value.matchAll(/\{@?(\w+)(?:[:,][^}]*)?\}/g)].map(p => p[1]));
      const category = names.map(sensitiveCategory).find(Boolean);
      if (category) found.push({ index: m.index, detail: `A logging call argument or message template names a ${category}.` });
      else if (/\bRequest\s*\.\s*(?:Headers|Cookies)\b/.test(call.args)) found.push({ index: m.index, detail: 'A logging call writes request headers or cookies, which carry authorization and session values.' });
    }
    for (const m of ctx.code.matchAll(/\bEnableSensitiveDataLogging\s*\(/g)) if (!isDevelopmentGuarded(ctx.code, m.index)) found.push({ index: m.index, detail: 'EF Core sensitive data logging is enabled without a visible development-environment guard.' });
    return found;
  },
  'SEC-08': ctx => {
    const found = [
      ...sites(ctx, /\b(?:MD5|SHA1)\s*\.\s*(?:Create|HashData|HashDataAsync)\s*\(|\bnew\s+(?:MD5CryptoServiceProvider|SHA1CryptoServiceProvider|SHA1Managed|SHA1Cng|MD5Cng|HMACMD5|HMACSHA1)\s*\(/g, 'MD5 or SHA-1 is used; confirm it is not protecting passwords, signatures or integrity.'),
      ...sites(ctx, /\b(?:DES|TripleDES|RC2)\s*\.\s*Create\s*\(|\bnew\s+(?:DESCryptoServiceProvider|TripleDESCryptoServiceProvider|RC2CryptoServiceProvider)\s*\(/g, 'A legacy block cipher (DES, 3DES or RC2) is used.'),
      ...sites(ctx, /\bCipherMode\s*\.\s*ECB\b/g, 'ECB cipher mode leaks plaintext patterns.'),
      ...sites(ctx, /\b(?:RSA|DSA)\s*\.\s*Create\s*\(\s*(?:512|768|1024)\s*\)|\bnew\s+(?:RSACryptoServiceProvider|DSACryptoServiceProvider)\s*\(\s*(?:512|768|1024)\s*\)|\bKeySize\s*=\s*(?:512|768|1024)\b/g, 'An asymmetric key below 2048 bits is created.')
    ];
    for (const m of ctx.code.matchAll(/\bnew\s+Random\s*\(|\bRandom\s*\.\s*Shared\b/g)) {
      if (/token|otp|password|salt|nonce|secret|pin|verif|reset/i.test(memberOf(ctx, m.index).code)) found.push({ index: m.index, detail: 'System.Random is used in a member that handles a secret, code or salt.', severity: 'medium' });
    }
    for (const m of ctx.code.matchAll(/\bnew\s+SymmetricSecurityKey\s*\(/g)) {
      const call = callAt(ctx.code, m);
      if (stringsIn(ctx, call.open, call.close).some(s => !s.holes.length && Buffer.byteLength(s.value) < 32)) found.push({ index: m.index, detail: 'A signing key literal is shorter than 256 bits.' });
    }
    return found;
  },
  'SEC-09': ctx => [
    ...sites(ctx, /\bValidate(?:Issuer|Audience|Lifetime|IssuerSigningKey)\s*=\s*false\b|\bRequire(?:SignedTokens|ExpirationTime|Audience)\s*=\s*false\b/g, 'A token validation check is switched off.'),
    ...sites(ctx, /\bSignatureValidator\s*=(?!=)/g, 'A custom signature validator replaces token signature checking.'),
    ...sites(ctx, /\bRequireHttpsMetadata\s*=\s*false\b/g, 'Authority metadata may be fetched over plain HTTP.', 'medium'),
    ...sites(ctx, /\bClockSkew\s*=\s*TimeSpan\s*\.\s*MaxValue\b/g, 'Token lifetime is effectively unlimited through clock skew.'),
    ...sites(ctx, /\.\s*ReadJwtToken\s*\(|\bnew\s+JwtSecurityToken\s*\(\s*\w+\s*\)/g, 'A token is decoded without validation; confirm the result never decides access.', 'medium')
  ],
  'SEC-10': ctx => [...ctx.code.matchAll(/\bnew\s+JwtSecurityToken\s*\(|\bnew\s+SecurityTokenDescriptor\b/g)].flatMap(m => {
    if (/^new\s+JwtSecurityToken\s*\(\s*\w+\s*\)/.test(ctx.code.slice(m.index, m.index + 80))) return [];
    const member = memberOf(ctx, m.index), literals = stringsIn(ctx, member.start, member.end).map(s => s.value);
    const missing = [!/\bJti\b/.test(member.code) && !literals.includes('jti') && 'a unique jti claim', !/\bexpires\s*:|\bExpires\s*=/.test(member.code) && 'an expiry'].filter(Boolean);
    return missing.length ? [{ index: m.index, detail: `Token creation shows no ${missing.join(' and no ')}.` }] : [];
  }),
  'SEC-11': ctx => {
    const found = [];
    for (const m of ctx.code.matchAll(/\b(?:ServerCertificateCustomValidationCallback|RemoteCertificateValidationCallback|ServerCertificateValidationCallback)\s*\+?=(?!=)/g)) {
      const always = /^[^;]*?(?:=>\s*true\b|return\s+true\s*;)/.test(ctx.code.slice(m.index + m[0].length, m.index + m[0].length + 300));
      found.push({ index: m.index, detail: always ? 'A certificate validation callback accepts every certificate.' : 'A custom certificate validation callback replaces default chain validation.', severity: always ? 'critical' : 'medium' });
    }
    found.push(...sites(ctx, /\bDangerousAcceptAnyServerCertificateValidator\b/g, 'The HttpClientHandler accept-any-certificate validator is used.'),
      ...sites(ctx, /\bCheckCertificateRevocationList\s*=\s*false\b/g, 'Certificate revocation checking is switched off.', 'medium'),
      ...sites(ctx, /\bSslProtocols\s*\.\s*(?:Ssl2|Ssl3|Tls|Tls11)\b/g, 'A deprecated TLS or SSL protocol version is pinned.', 'high'));
    return found;
  },
  'SEC-12': ctx => [
    ...sites(ctx, /\b(?:BinaryFormatter|NetDataContractSerializer|SoapFormatter|LosFormatter|ObjectStateFormatter)\b/g, 'A type-embedding serializer is used.'),
    ...sites(ctx, /\bTypeNameHandling\s*=\s*TypeNameHandling\s*\.\s*(?:All|Auto|Objects|Arrays)\b/g, 'Json.NET reads type names from the payload.'),
    ...sites(ctx, /\bnew\s+JavaScriptSerializer\s*\(\s*new\s+SimpleTypeResolver\b/g, 'JavaScriptSerializer resolves types from the payload.')
  ],
  'SEC-13': ctx => [
    ...[...ctx.code.matchAll(/\.\s*AllowAnyOrigin\s*\(\s*\)/g)].map(m => {
      const chain = statementOf(ctx.code, m.index).text;
      return /AllowCredentials\s*\(/.test(chain) ? { index: m.index, detail: 'Any origin is allowed together with credentials.', severity: 'critical' } : { index: m.index, detail: 'Any origin is allowed; confirm the API is public and carries no cookies or user data.', severity: 'medium' };
    }),
    ...sites(ctx, /\.\s*SetIsOriginAllowed\s*\(\s*\(?\s*\w*\s*\)?\s*=>\s*true\s*\)/g, 'Every origin is accepted by an always-true origin check.'),
    ...[...ctx.code.matchAll(/\.\s*WithOrigins\s*\(/g)].filter(m => { const call = callAt(ctx.code, m); return stringsIn(ctx, call.open, call.close).some(s => s.value.trim() === '*'); })
      .map(m => ({ index: m.index, detail: 'A wildcard origin is listed.' }))
  ],
  'SEC-14': ctx => [
    ...sites(ctx, /\bUseHttpMethodOverride\s*\(/g, 'The HTTP method override middleware is enabled.'),
    ...ctx.strings.filter(s => /^(?:X-HTTP-Method-Override|X-HTTP-Method|X-Method-Override|_method)$/i.test(s.value.trim())).map(s => ({ index: s.index, detail: 'A method override header or form field name is read.' }))
  ],
  'SEC-15': ctx => ctx.language === 'ts' ? [
    ...[...ctx.code.matchAll(/\b(?:window\s*\.\s*)?location\s*(?:\.\s*href\s*)?=(?!=)/g)].flatMap(m => {
      const start = m.index + m[0].length, end = start + (/[;\n]/.exec(ctx.code.slice(start))?.index ?? 0);
      return nonLiteral(ctx, start, end) && redirectShape.test(ctx.code.slice(start, end) + stringsIn(ctx, start, end).flatMap(s => s.holes).join(' ')) ? [{ index: m.index, detail: 'The browser location is set from a return, redirect or query value.' }] : [];
    }),
    ...[...ctx.code.matchAll(/\b(?:location\s*\.\s*(?:assign|replace)|window\s*\.\s*open)\s*\(/g)].flatMap(m => {
      const arg = firstArg(ctx.code, callAt(ctx.code, m));
      return nonLiteral(ctx, arg.start, arg.end) && redirectShape.test(ctx.code.slice(arg.start, arg.end)) ? [{ index: m.index, detail: 'Navigation opens a return, redirect or query value.' }] : [];
    })
  ] : [...ctx.code.matchAll(/\b(?:Redirect|RedirectPermanent|RedirectPreserveMethod|RedirectPermanentPreserveMethod)\s*\(|\bnew\s+RedirectResult\s*\(/g)].flatMap(m => {
    const arg = firstArg(ctx.code, callAt(ctx.code, m));
    const params = memberParams(ctx, m.index), segment = ctx.code.slice(arg.start, arg.end);
    const shaped = chains(segment).some(chain => params.has(chain[0])) || /\bRequest\s*\.\s*(?:Query|Form|Headers)\b/.test(segment);
    return shaped && !/\bIsLocalUrl\s*\(/.test(memberOf(ctx, m.index).code) ? [{ index: m.index, detail: 'A redirect target comes from a parameter or request value without a visible local-URL check.' }] : [];
  }),
  'SEC-16': ctx => {
    const found = ctx.strings.filter(s => queryShape.test(s.value)).map(s => ({ index: s.index, detail: 'A URL literal carries a credential or personal identifier in the query string.' }));
    if (ctx.language === 'ts') {
      for (const m of ctx.code.matchAll(/\b(?:params|fromObject)\s*:\s*\{/g)) {
        const open = m.index + m[0].length - 1, keys = [...ctx.code.slice(open, closing(ctx.code, open, '{}')).matchAll(/([A-Za-z_]\w*)\s*[:,}]/g)].map(k => k[1]);
        const category = keys.map(sensitiveCategory).find(Boolean);
        if (category) found.push({ index: m.index, detail: `HTTP query parameters include a ${category}.` });
      }
      for (const m of ctx.code.matchAll(/\.\s*(?:set|append)\s*\(/g)) {
        if (!/\bHttpParams\b/.test(ctx.code)) break;
        const arg = firstArg(ctx.code, callAt(ctx.code, m)), name = stringsIn(ctx, arg.start, arg.end)[0]?.value;
        const category = sensitiveCategory(name);
        if (category) found.push({ index: m.index, detail: `HttpParams carries a ${category}.` });
      }
    } else {
      for (const m of ctx.code.matchAll(/\[\s*FromQuery\b[^\]]*\]\s*(?:[\w.<>?\[\],]+\s+)+?([A-Za-z_]\w*)\s*(?=[,)=])/g)) {
        const named = stringsIn(ctx, m.index, m.index + m[0].length).map(s => s.value), category = [m[1], ...named].map(sensitiveCategory).find(Boolean);
        if (category) found.push({ index: m.index, detail: `A query-bound parameter carries a ${category}.` });
      }
      for (const m of ctx.code.matchAll(/\bQuery\s*\[/g)) {
        const category = sensitiveCategory(ctx.strings.find(s => s.index > m.index && s.index < m.index + m[0].length + 4)?.value);
        if (category) found.push({ index: m.index, detail: `A query-string value read carries a ${category}.` });
      }
    }
    return found;
  },
  'SEC-17': ctx => {
    const found = [];
    for (const m of ctx.code.matchAll(/\b(?:class|record)\s+(\w+)/g)) {
      if (!/(?:Response|Result|ViewModel|View|Output|Info|Detail|Dto)$/.test(m[1]) || /Request|Command|Query|Filter|Param|Criteria/.test(m[1])) continue;
      const open = ctx.code.indexOf('{', m.index), close = open === -1 ? -1 : closing(ctx.code, open, '{}');
      if (open === -1 || /;/.test(ctx.code.slice(m.index, open).replace(/\([^)]*\)/g, ''))) continue;
      for (const p of ctx.code.slice(open, close).matchAll(/\bpublic\s+(?:required\s+)?[\w.<>?\[\],]+\s+(\w+)\s*\{/g)) {
        const index = open + p.index;
        if (secretField.test(p[1])) found.push({ index, detail: 'A response contract declares a secret, password, hash or salt field.', severity: 'high' });
        else if (personalField.test(p[1])) found.push({ index, detail: 'A response contract declares a personal identifier or contact field; confirm record-level authorization and projection scope.', severity: 'medium' });
      }
    }
    return found;
  },
  'SEC-18': ctx => {
    const found = [];
    for (const m of ctx.code.matchAll(/\bpublic\s+(int|long|short|uint|ulong|double|float|decimal)\??\s+(\w+)\s*\{/g)) {
      if (!pagingName.test(m[2])) continue;
      const owner = [...at(ctx.code, m.index).matchAll(/\b(?:class|record)\s+(\w+)/g)].at(-1)?.[1] || '';
      if (!/Request|Query|Filter|Param|Search|Criteria|Paging|Page/.test(owner) || /\[\s*Range\b|\bRangeAttribute\b/.test(attributesBefore(ctx.code, m.index).text)) continue;
      found.push({ index: m.index, detail: /double|float|decimal/.test(m[1]) ? 'A paging or size value uses a floating-point type and declares no range.' : 'A paging or size value declares no range.' });
    }
    for (const m of ctx.code.matchAll(/\[\s*FromQuery\b[^\]]*\]\s*(int|long|double|float|decimal)\??\s+(\w+)/g)) {
      if (pagingName.test(m[2]) && !/\[\s*Range\b/.test(ctx.code.slice(Math.max(0, m.index - 120), m.index))) found.push({ index: m.index, detail: 'A query-bound paging or size parameter declares no range.' });
    }
    return found;
  },
  'SEC-19': ctx => {
    const host = /\bWebApplication\s*\.\s*CreateBuilder\s*\(|\bConfigure\s*\(\s*IApplicationBuilder\b/.exec(ctx.code);
    if (!host) return [];
    const values = ctx.strings.map(s => s.value).join('\n'), all = ctx.code + '\n' + values, shared = /\bUse\w*SecurityHeaders\b|\bAdd\w*SecurityHeaders\b/.test(ctx.code);
    const missing = [!/\bUseHsts\s*\(|Strict-Transport-Security/i.test(all) && 'HSTS', !/X-Content-Type-Options/i.test(values) && 'X-Content-Type-Options', !/Cache-Control|\bNoStore\b|\bCacheControlHeaderValue\b|\bResponseCache\b/i.test(all) && 'Cache-Control for sensitive responses'].filter(Boolean);
    return missing.length && !shared ? [{ index: host.index, detail: `The host pipeline sets no visible ${missing.join(', ')}; confirm the gateway or shared middleware owns them.` }] : [];
  },
  'SEC-20': ctx => {
    const found = [
      ...sites(ctx, /\bHttpOnly\s*=\s*false\b/g, 'A cookie is readable from script (HttpOnly = false).'),
      ...sites(ctx, /\bSecure\s*=\s*false\b|\bSecurePolicy\s*=\s*CookieSecurePolicy\s*\.\s*(?:None|SameAsRequest)\b/g, 'A cookie may travel over plain HTTP.')
    ];
    for (const m of ctx.code.matchAll(/\bSameSite\s*=\s*SameSiteMode\s*\.\s*None\b/g)) {
      if (!/\bSecure\s*=\s*true\b|CookieSecurePolicy\s*\.\s*Always\b/.test(ctx.code.slice(Math.max(0, m.index - 300), m.index + 300))) found.push({ index: m.index, detail: 'SameSite=None is set without Secure.' });
    }
    return found;
  },
  'SEC-21': ctx => {
    const found = [...sites(ctx, /\bbypassSecurityTrust(?:Html|Script|Style|Url|ResourceUrl)\s*\(/g, 'Angular sanitization is bypassed.'),
      ...sites(ctx, /\.\s*insertAdjacentHTML\s*\(|\bdocument\s*\.\s*write(?:ln)?\s*\(|(?<![\w.$])eval\s*\(|\bnew\s+Function\s*\(/g, 'HTML or script is written or evaluated directly.')];
    for (const m of ctx.code.matchAll(/\.\s*(?:innerHTML|outerHTML)\s*\+?=(?!=)/g)) {
      const start = m.index + m[0].length, end = start + (/[;\n]/.exec(ctx.code.slice(start))?.index ?? 0);
      if (nonLiteral(ctx, start, end)) found.push({ index: m.index, detail: 'A non-literal value is assigned to innerHTML or outerHTML.' });
    }
    // Literal bodies are blank in code, so the first argument is read from the original text.
    for (const m of ctx.code.matchAll(/\b(?:setTimeout|setInterval)\s*\(/g)) if (/^\s*['"`]/.test(ctx.text.slice(m.index + m[0].length, m.index + m[0].length + 40))) found.push({ index: m.index, detail: 'A timer evaluates a string as code.' });
    for (const m of ctx.code.matchAll(/\.\s*setProperty\s*\(/g)) {
      const call = callAt(ctx.code, m);
      if (stringsIn(ctx, call.open, call.close).some(s => /^(?:innerHTML|outerHTML)$/.test(s.value))) found.push({ index: m.index, detail: 'Renderer2 writes innerHTML or outerHTML.' });
    }
    found.push(...ctx.strings.filter(s => /\[(?:innerHTML|outerHTML)\]\s*=/.test(s.value)).map(s => ({ index: s.index, detail: 'An inline template binds [innerHTML]; Angular sanitizes it, so confirm no bypass feeds it trusted HTML from users.', severity: 'low' })));
    return found;
  },
  'SEC-22': ctx => [...ctx.code.matchAll(/\b(?:localStorage|sessionStorage)\s*\.\s*setItem\s*\(/g)].flatMap(m => {
    const arg = firstArg(ctx.code, callAt(ctx.code, m)), names = [...stringsIn(ctx, arg.start, arg.end).map(s => s.value), ...identifiers(ctx.code.slice(arg.start, arg.end))];
    return names.some(name => /token|jwt|auth|credential|password|secret|refresh|session/i.test(name)) ? [{ index: m.index, detail: 'Web Storage keeps an auth token, session or credential value.' }] : [];
  })
};

function dynamicSql(ctx) {
  const found = [], code = ctx.code;
  const assembled = name => {
    const pattern = new RegExp(`\\b(?:SET|SELECT|DECLARE)\\s+${name}\\b[^=;\\n]*?\\+?=`, 'gi');
    let any = false;
    for (const m of code.matchAll(pattern)) {
      any = true;
      const rest = code.slice(m.index + m[0].length), stop = /;|\n\s*(?:SET|SELECT|DECLARE|EXEC|EXECUTE|IF|ELSE|END|BEGIN|PRINT|RETURN|INSERT|UPDATE|DELETE|WHILE)\b/i.exec(rest);
      const rhs = rest.slice(0, stop ? stop.index : rest.length).replace(/QUOTENAME\s*\([^()]*\)/gi, 'Q').replace(new RegExp(`${name}\\b`, 'gi'), '');
      if (/\+/.test(rhs) && /@(?!@)\w+/.test(rhs)) return 'concatenated';
    }
    return any ? 'constant' : 'unknown';
  };
  for (const m of code.matchAll(/\bEXEC(?:UTE)?\s*\(\s*(@\w+)\s*\)/gi)) {
    const state = assembled(m[1]);
    if (state !== 'constant') found.push({ index: m.index, detail: state === 'concatenated' ? 'Dynamic SQL executes text concatenated with variable values.' : 'Dynamic SQL executes a variable whose text is built outside this file.' });
  }
  for (const m of code.matchAll(/\bEXEC(?:UTE)?\s*\(/gi)) {
    const call = callAt(code, m), args = call.args.replace(/QUOTENAME\s*\([^()]*\)/gi, 'Q');
    if (/\+/.test(args) && /@(?!@)\w+/.test(args)) found.push({ index: m.index, detail: 'EXEC runs a string concatenated with variable values.' });
  }
  for (const m of code.matchAll(/\bsp_executesql\s+(@\w+)/gi)) {
    if (assembled(m[1]) === 'concatenated') found.push({ index: m.index, detail: 'sp_executesql runs text concatenated with variable values instead of passing them as parameters.' });
  }
  return found;
}

function controllerSites(ctx) {
  const found = [];
  for (const m of ctx.code.matchAll(/\bclass\s+(\w+)\s*(?:<[^>{]*>)?\s*:\s*([^{]+)\{/g)) {
    if (!/\b\w*Controller(?:Base)?\b/.test(m[2])) continue;
    const attributes = attributesBefore(ctx.code, m.index).text, open = m.index + m[0].length - 1, close = closing(ctx.code, open, '{}');
    const classAuthorized = /\[\s*(?:[\w.]+\.)?Authorize\b/.test(attributes), body = ctx.code.slice(open, close);
    if (stringsIn(ctx, attributesBefore(ctx.code, m.index).start, m.index).some(s => split(s.value).some(part => testShape.has(part)))) found.push({ index: m.index, detail: 'A controller route looks like a test, mock, debug or bypass endpoint; deployable code should not carry it.', severity: 'high' });
    let unprotected = 0;
    for (const action of body.matchAll(/\[\s*Http(?:Get|Post|Put|Delete|Patch|Head|Options)\b/g)) {
      const index = open + action.index, region = attributesBefore(ctx.code, index), after = ctx.code.slice(index, index + 600);
      const modifier = /\b(?:public|private|protected|internal)\b/.exec(after), signature = modifier ? ctx.code.slice(index, index + modifier.index) : after;
      const attrs = region.text + signature;
      const routes = stringsIn(ctx, region.start, index + (modifier?.index ?? 0)).map(s => s.value), method = modifier ? /\b(\w+)\s*\(/.exec(after.slice(modifier.index))?.[1] : null;
      // Health and ping probes are anonymous by design (Golden service-url-matrix /health).
      if (!/\[\s*(?:[\w.]+\.)?(?:Authorize|AllowAnonymous)\b/.test(attrs) && !healthShape.test(routes.join(' '))) unprotected++;
      if ([...routes, method || ''].some(value => split(value).some(part => testShape.has(part)))) found.push({ index, detail: 'An action route or name looks like a test, mock, debug or bypass endpoint; deployable code should not carry it.', severity: 'high' });
    }
    if (!classAuthorized && unprotected) {
      const direct = /\b(?:ControllerBase|Controller)\b/.test(m[2].split(',')[0]);
      found.push({ index: m.index, detail: `A controller without class-level [Authorize] has ${unprotected} action(s) without [Authorize]${direct ? '' : '; it derives from a custom base controller that may carry the requirement'}.`, severity: direct ? 'critical' : 'medium' });
    }
  }
  for (const m of ctx.code.matchAll(/\[\s*(?:[\w.]+\.)?AllowAnonymous\b/g)) {
    // Only this declaration's attributes and signature line decide whether it is a health endpoint.
    const modifier = /\b(?:public|private|protected|internal)\b/.exec(ctx.code.slice(m.index)), lineStop = modifier ? ctx.code.indexOf('\n', m.index + modifier.index) : -1;
    const end = lineStop === -1 ? Math.min(ctx.code.length, m.index + 600) : lineStop;
    const window = [...stringsIn(ctx, m.index, end).map(s => s.value), ctx.code.slice(m.index, end)].join(' ');
    if (!healthShape.test(window)) found.push({ index: m.index, detail: 'Explicit anonymous access; confirm the endpoint is public by design (login, token refresh, public lookup).', severity: 'low' });
  }
  return found;
}
function minimalApiSites(ctx) {
  const found = [], fallback = /\bFallbackPolicy\b/.test(ctx.code), grouped = /\bRequireAuthorization\s*\(/.test(ctx.code);
  for (const m of ctx.code.matchAll(/\b(\w+)\s*\.\s*Map(?:Get|Post|Put|Delete|Patch|Methods)\s*\(/g)) {
    const close = callAt(ctx.code, m).close, end = ctx.code.indexOf(';', close);
    const statement = ctx.code.slice(m.index, end === -1 ? ctx.code.length : end), routes = stringsIn(ctx, m.index, m.index + statement.length).map(s => s.value).join(' ');
    if (healthShape.test(routes)) continue;
    if (/\.\s*AllowAnonymous\s*\(/.test(statement)) found.push({ index: m.index, detail: 'Explicit anonymous access; confirm the endpoint is public by design (login, token refresh, public lookup).', severity: 'low' });
    else if (!/\.\s*RequireAuthorization\s*\(/.test(statement) && !fallback && !(grouped && m[1] !== 'app')) found.push({ index: m.index, detail: 'A minimal API endpoint declares no RequireAuthorization and the file shows no fallback policy.', severity: 'high' });
  }
  return found;
}

export function securityObservations(text, rule, file) {
  const entry = securityClass(rule.securityClass);
  if (!entry || !entry.lanes.includes(rule.lane)) return [];
  const language = rule.lane.startsWith('sql') ? 'sql' : file.path.endsWith('.cs') ? 'cs' : 'ts';
  const ctx = { text, file, language, ...lex(text, language) };
  const seen = new Set();
  return detectors[entry.class](ctx).sort((a, b) => a.index - b.index).filter(site => !seen.has(site.index) && seen.add(site.index)).map(site => observation(ctx, entry, site));
}
