// Read-only lexical observations for the Golden structured-logging, error-mapping and exception rules
// LOG-01, LOG-02, ERR-03, ERR-06, ERR-07 and QUALITY-06, plus the package observability baseline OBS-01..03. No execution and no symbol
// resolution: the receiver type of a logging call and the pipeline that maps an exception stay
// unproven, so every observation is a review candidate. Observation text names shapes from a fixed
// vocabulary; message text and values never leave, except a validated snake_case error code (OBS-03).
import { hash } from './contracts.mjs';
import { scrub } from './hardcode.mjs';
import { lex, closing, callAt } from './security.mjs';

const checks = {
  'LOG-01': { title: 'Structured message template and exception argument', guidance: 'Keep the message a constant template whose {Placeholder} count matches its arguments, and pass the exception object first, for example _logger.LogError(ex, "Error occurred while executing {Action}", actionName).' },
  'LOG-02': { title: 'Composed log message', guidance: 'Use a constant template with named placeholders instead of concatenation, interpolation or string.Format, for example _logger.LogError(ex, "Unhandled exception").' },
  'ERR-03': { title: 'Server bug mapped to HTTP 400', guidance: 'Let NullReferenceException and IndexOutOfRangeException reach the 500 path; reserve 400 for caller input the service has validated.' },
  'ERR-06': { title: 'Reserved exception thrown', guidance: 'Throw ArgumentNullException for a missing argument, InvalidOperationException with a message for missing state such as HttpContext, or AppException for a client error.' },
  'ERR-07': { title: 'Argument exception names no parameter', guidance: 'Pass nameof(<parameter of the enclosing method>); when the null value is not a parameter, throw InvalidOperationException or skip the value instead.' },
  'QUALITY-06': { title: 'Redundant jump', guidance: 'Remove the trailing return; or continue; and keep the intent as a comment; control flow is unchanged.' },
  // Observability rules: Golden 5.0.15 states them as SHOULD in csharp.md, so team judgment decides.
  'OBS-01': { title: 'Console write bypasses the logger', guidance: 'Write through the injected ILogger (Debug for development traces) so the line keeps the JSON layout, level, app and request_id fields.' },
  'OBS-02': { title: 'NLog registered twice', guidance: 'Register NLog once. AddNLogWeb is often the call that selects nlog.{environment}.config, so keep that configuration selection when removing the duplicate.' },
  'OBS-03': { title: 'Caller-input error thrown as HTTP 500', guidance: 'Use the 4xx status that matches the code (400 invalid input, 404 not found, 409 conflict) so 5xx keeps meaning a server defect; confirm what the front end does with the status before changing it.' }
};
const review = 'Review candidate: the receiver type and pipeline are not proven from text.';

// ILogger and the AgriMap.Platform LoggerExtensions wrappers by receiver name, plus a static Log;
// Console, Debug and Trace writers are not templates.
const logCall = /\b(?:_?\w*[Ll]ogger\w*|Log)\s*\.\s*(Log(?:Trace|Debug|Information|Warning|Error|Critical)|Information|Warning|Error|Debug|Critical)\s*\(/g;
// Only these overloads bind trailing arguments to placeholders; the Platform Warning/Error wrappers
// take (message) or (message, exception) and have no template arguments.
const templateMethod = /^Log|^Information$/;
const eventIdShape = /^(?:new\s+EventId\b|\d+$|[\w.]*EventId\w*$)/;
// ex, e, exception, persistEx, executed.Exception: the names catch blocks and filters give exceptions.
const exceptionName = /^(?:[A-Za-z_]\w*\s*\.\s*)*(?:ex|exc|e|exception|\w*Ex|\w*Exception)$/;
const exceptionText = /\b(?:ex|exc|e|exception|\w*Ex|\w*Exception)\s*\.\s*(?:ToString\s*\(|Message\b|StackTrace\b|InnerException\b)/;
const placeholder = /(?<!\{)\{(?!\{)[^{}]+\}/g;
const concatenated = segment => /\+=?\s*[A-Za-z_(]/.test(segment) || /[A-Za-z_)\]]\s*\+(?!\+)/.test(segment);
const formatted = /\b(?:string|String)\s*\.\s*Format\s*\(/;

const stringsIn = (ctx, part) => ctx.strings.filter(s => s.index >= part.start && s.end <= part.end);
// Top-level arguments; a literal is blank in the masked code, so the last part counts when it holds one.
function argumentsOf(ctx, call) {
  const { code } = ctx, parts = [];
  let depth = 0, start = call.open + 1;
  for (let i = call.open + 1; i < call.close; i++) {
    if ('([{'.includes(code[i])) depth++;
    else if (')]}'.includes(code[i])) depth--;
    else if (code[i] === ',' && depth === 0) { parts.push({ start, end: i }); start = i + 1; }
  }
  const last = { start, end: call.close };
  if (code.slice(start, call.close).trim() || stringsIn(ctx, last).length) parts.push(last);
  return parts.map(part => ({ ...part, code: code.slice(part.start, part.end).trim() }));
}
// Interpolation holes count as text that reaches the message; nameof(...) is already excluded.
const textOf = (ctx, part) => [part.code, ...stringsIn(ctx, part).flatMap(s => s.holes)].join(' ');

function logSites(ctx, check) {
  const found = [];
  for (const m of ctx.code.matchAll(logCall)) {
    const call = callAt(ctx.code, m), args = argumentsOf(ctx, call);
    let at = 0;
    if (args[at] && eventIdShape.test(args[at].code)) at++;
    const exceptionFirst = Boolean(args[at] && exceptionName.test(args[at].code) && args.length > at + 1);
    if (exceptionFirst) at++;
    const message = args[at];
    if (!message) continue;
    const literals = stringsIn(ctx, message), trailing = args.slice(at + 1);
    const interpolated = literals.some(s => s.holes.length), composed = interpolated || concatenated(message.code) || formatted.test(message.code);
    const flattened = exceptionText.test(textOf(ctx, message));
    if (check === 'LOG-02') {
      if (!composed) continue;
      const how = interpolated ? 'interpolation' : formatted.test(message.code) ? 'string.Format' : 'concatenation';
      const unbound = !trailing.length && literals.some(s => !s.holes.length && s.value.match(placeholder));
      found.push({ index: m.index, kind: how, detail: `The message argument is built by ${how}, so the template changes per call and its values are not structured properties.${flattened ? ' Exception text is written into the message instead of passing the exception first.' : ''}${unbound ? ' A {Placeholder} in the literal part has no argument and is written verbatim.' : ''}` });
      continue;
    }
    if (composed) continue;
    if (!exceptionFirst && (flattened || trailing.some(arg => exceptionText.test(textOf(ctx, arg))))) {
      found.push({ index: m.index, kind: 'exception-text', detail: 'Exception text is logged without passing the exception object first, so the exception field and its stack trace are lost.' });
      continue;
    }
    // A single constant template: compare placeholders with the arguments that bind to them.
    if (!templateMethod.test(m[1]) || literals.length !== 1 || message.code !== '') continue;
    if (trailing.length === 1 && /^(?:args|parameters|values|new\s*(?:object)?\s*\[\s*\])/.test(trailing[0].code)) continue;
    const expected = (literals[0].value.match(placeholder) || []).length;
    if (expected === trailing.length) continue;
    const exceptionAfter = !exceptionFirst && trailing.some(arg => exceptionName.test(arg.code));
    found.push({ index: m.index, kind: exceptionAfter ? 'exception-after-message' : 'placeholder-count', detail: exceptionAfter
      ? 'An exception is passed after the message template, so it binds as a format value instead of the exception argument.'
      : `The template has ${expected} placeholder(s) but the call passes ${trailing.length} argument(s); unmatched placeholders are written verbatim.` });
  }
  return found;
}

const serverBug = /\b(?:System\s*\.\s*)?(?:NullReferenceException|IndexOutOfRangeException)\b/g;
const badRequest = /\bStatus400BadRequest\b|\bHttpStatusCode\s*\.\s*BadRequest\b|\bBadRequest(?:Object)?(?:Result)?\s*\(|(?<![\w.])400(?![\w.])/;
// The mapping sits in the same entry or arm (dictionary, switch, ternary), a catch block or a case.
function errorStatusSites(ctx) {
  const found = [];
  for (const m of ctx.code.matchAll(serverBug)) {
    const end = m.index + m[0].length, before = ctx.code.slice(Math.max(0, m.index - 40), m.index);
    let window;
    if (/\bcatch\s*\(\s*$/.test(before)) {
      const open = ctx.code.indexOf('{', end);
      window = open === -1 ? '' : ctx.code.slice(open, closing(ctx.code, open, '{}') + 1);
    } else {
      const stops = [/\bcase\s+$/.test(before) ? ';' : '\n', '}', ';'].map(stop => ctx.code.indexOf(stop, end)).filter(i => i !== -1);
      window = ctx.code.slice(end, stops.length ? Math.min(...stops) : ctx.code.length);
    }
    if (badRequest.test(window)) found.push({ index: m.index, kind: 'bad-request', detail: 'NullReferenceException or IndexOutOfRangeException is mapped to HTTP 400, which reports a server defect as a caller error.' });
  }
  return found;
}

// throw new X(...) or ?? throw new X(...): reserved types only, so AppException never matches.
const reserved = /\bthrow\s+new\s+(?:System\s*\.\s*)?(NullReferenceException|IndexOutOfRangeException|Exception|SystemException|ApplicationException)\s*\(/g;
function reservedSites(ctx) {
  return [...ctx.code.matchAll(reserved)].map(m => ({ index: m.index, kind: m[1], detail: `${m[1]} is reserved for the runtime or too general to handle, so callers cannot tell a defect from an expected failure.` }));
}

// Parameter names of the nearest method, constructor or local function declared before the index.
const notDeclaration = /^(?:if|for|foreach|while|switch|catch|using|lock|return|nameof|typeof|sizeof|default|new|when)$/;
function parametersBefore(code, index) {
  let names = null;
  for (const m of code.slice(0, index).matchAll(/\b(\w+)\s*(?:<[^<>()]*>)?\s*\(([^()]*(?:\([^()]*\)[^()]*)*)\)\s*(?:where\b[^{;]*)?(?:\{|=>)/g)) {
    if (notDeclaration.test(m[1])) continue;
    names = m[2].split(',').map(p => p.replace(/=[\s\S]*$/, '').trim().split(/\s+/).pop()).filter(Boolean).map(p => p.replace(/^@/, ''));
  }
  return names;
}
const argumentException = /\bnew\s+(?:System\s*\.\s*)?(Argument(?:Null|OutOfRange)?Exception)\s*\(/g;
function paramNameSites(ctx) {
  const found = [];
  for (const m of ctx.code.matchAll(argumentException)) {
    const args = argumentsOf(ctx, callAt(ctx.code, m));
    // ArgumentException(message, paramName); the Null/OutOfRange forms take paramName first.
    const param = m[1] === 'ArgumentException' ? args[1] : args[0];
    if (!param) continue;
    const literals = stringsIn(ctx, param);
    if (param.code === '' && literals.length === 1 && !literals[0].holes.length) {
      found.push({ index: m.index, kind: 'literal', detail: `${m[1]} takes a string literal as paramName instead of nameof(...), so a rename leaves the name stale and analyzers cannot check it.` });
      continue;
    }
    const named = /^nameof\s*\(\s*@?(\w+)\s*\)$/.exec(param.code), parameters = named && parametersBefore(ctx.code, m.index);
    if (parameters && !parameters.includes(named[1]) && named[1] !== 'value') {
      found.push({ index: m.index, kind: 'not-a-parameter', detail: `${m[1]} names a value that is not a parameter of the enclosing method, so ParamName points callers at an argument they never passed.` });
    }
  }
  return found;
}

// The opening brace that matches the closing brace at close.
function openOf(code, close) {
  let depth = 0;
  for (let i = close; i >= 0; i--) {
    if (code[i] === '}') depth++;
    else if (code[i] === '{' && --depth === 0) return i;
  }
  return -1;
}
const nextCode = (code, from) => { const m = /\S/.exec(code.slice(from)); return m ? from + m.index : -1; };
// What owns a block: a loop, catch/finally, or a void/Task method signature.
function blockOwner(code, open) {
  if (open < 0) return null;
  const before = code.slice(Math.max(0, open - 400), open).trimEnd();
  const word = /\b(finally|catch|else|try)$/.exec(before);
  if (word) return word[1];
  if (!before.endsWith(')')) return null;
  let depth = 0, i = before.length - 1;
  for (; i >= 0; i--) { if (before[i] === ')') depth++; else if (before[i] === '(' && --depth === 0) break; }
  const lead = before.slice(0, Math.max(0, i));
  if (/\b(?:for|foreach|while)\s*$/.test(lead)) return 'loop';
  if (/\bcatch\s*$/.test(lead)) return 'catch';
  if (/\b(?:void|Task)\s+\w+\s*(?:<[^<>]*>)?\s*$/.test(lead)) return 'void';
  return null;
}
function redundantJumpSites(ctx) {
  const found = [], code = ctx.code;
  for (const m of code.matchAll(/\b(return|continue)\s*;/g)) {
    const close = nextCode(code, m.index + m[0].length);
    if (close === -1 || code[close] !== '}') continue;
    const owner = blockOwner(code, openOf(code, close));
    let redundant = m[1] === 'continue' ? owner === 'loop' : owner === 'void';
    // return; ending the last catch/finally of a try that itself ends a void method.
    if (!redundant && m[1] === 'return' && (owner === 'catch' || owner === 'finally')) {
      const after = nextCode(code, close + 1);
      redundant = after !== -1 && code[after] === '}' && blockOwner(code, openOf(code, after)) === 'void';
    }
    if (redundant) found.push({ index: m.index, kind: m[1], detail: `A bare ${m[1]}; is the last statement of its ${m[1] === 'continue' ? 'loop body' : 'method path'}, so removing it changes nothing.` });
  }
  return found;
}

const consoleWrite = /\bConsole\s*\.\s*(?:(Error|Out)\s*\.\s*)?Write(?:Line)?(?:Async)?\s*\(/g;
const payloadShape = /\bSerialize\s*\(|\bStackTrace\b|WriteIndented|\bToString\s*\(\s*\)/;
function consoleSites(ctx) {
  return [...ctx.code.matchAll(consoleWrite)].map(m => {
    const call = callAt(ctx.code, m), stream = m[1] === 'Error' ? 'standard error' : 'standard output';
    const payload = payloadShape.test(textOf(ctx, { start: call.open, end: call.close, code: ctx.code.slice(call.open, call.close) })) ?' The argument is a serialized payload, exception or stack trace, which can span several lines and arrive as separate entries.' : '';
    return { index: m.index, kind: stream, detail: `Console writes to ${stream} outside NLog, so the line reaches the log store as plain text without level, app or request_id fields.${payload}` };
  });
}

// Both registrations in one file: ILoggingBuilder.AddNLog/AddNLogWeb and IHostBuilder.UseNLog.
function providerSites(ctx) {
  const calls = [...ctx.code.matchAll(/\.\s*(?:AddNLog(?:Web)?|UseNLog)\s*\(/g)];
  const adds = calls.filter(m => /AddNLog/.test(m[0])), uses = calls.filter(m => /UseNLog/.test(m[0]));
  if (!adds.length || !uses.length) return [];
  return [{ index: calls[1].index, kind: 'duplicate-provider', detail: 'The same file registers NLog through both AddNLog/AddNLogWeb and UseNLog, which adds two providers, so every event can be written twice and error counts double.' }];
}

const serverStatus = /^(?:500|StatusCodes\.Status500InternalServerError|\(int\)HttpStatusCode\.InternalServerError)$/;
// Snake_case codes that name a caller-input, lookup or state outcome (ERR-02 vocabulary shape).
const callerCode = /_required$|^required_|^invalid_|_invalid$|_must_(?:be|not)_|^not_found$|_not_found$|_not_exists?$|_inactive$|_already_exists$|^duplicate_|_duplicate$|_not_allowed$|_expired$|_mismatch$|_too_(?:long|large|short|many)$|_empty$|_out_of_range$/;
function statusSites(ctx) {
  const found = [];
  for (const m of ctx.code.matchAll(/\bnew\s+AppException\s*\(/g)) {
    const args = argumentsOf(ctx, callAt(ctx.code, m));
    if (args.length < 2 || !serverStatus.test(args[0].code.replace(/\s+/g, '')) || args[1].code !== '') continue;
    const literals = stringsIn(ctx, args[1]);
    const code = literals.length === 1 && !literals[0].holes.length ? literals[0].value.trim() : '';
    // invalid_configuration, *_not_configured: the service's own setup failed, so 500 is right.
    if (!/^[a-z0-9_]{1,64}$/.test(code) || !callerCode.test(code) || /config|setting|environment/.test(code)) continue;
    found.push({ index: m.index, kind: code, detail: `Error code ${code} names a caller-input, lookup or state outcome but is thrown as HTTP 500, so 5xx counts mix rejected requests with server defects. If the code really describes an internal failure, keep 500 and record that decision.` });
  }
  return found;
}

const siteFinders = { 'ERR-03': errorStatusSites, 'ERR-06': reservedSites, 'ERR-07': paramNameSites, 'QUALITY-06': redundantJumpSites, 'OBS-01': consoleSites, 'OBS-02': providerSites, 'OBS-03': statusSites };

function observation(ctx, check, site) {
  const entry = checks[check], snippet = ctx.code.slice(site.index, site.index + 80).replace(/\s+/g, ' ');
  const key = `${check}|${site.kind}|${snippet}`;
  return { line: ctx.text.slice(0, site.index).split('\n').length, column: site.index - ctx.text.lastIndexOf('\n', site.index - 1),
    anchor: `${check}:${hash(key).slice(0, 16)}`, fingerprint: hash(key),
    observation: scrub(`${entry.title} (${check}): ${site.detail} ${entry.guidance} ${review}`),
    observationKind: 'text-observation', disposition: 'review-candidate', applicability: 'unknown', actualEvidenceLevel: 'text' };
}

export const loggingChecks = Object.keys(checks);
export function loggingObservations(text, rule, file) {
  if (!checks[rule.textCheck] || !file.path.endsWith('.cs')) return [];
  const ctx = { text, ...lex(text, 'cs') };
  const sites = (siteFinders[rule.textCheck] || (c => logSites(c, rule.textCheck)))(ctx);
  return sites.map(site => observation(ctx, rule.textCheck, site));
}
