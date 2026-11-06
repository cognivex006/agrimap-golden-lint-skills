// Read-only lexical observations for the Golden advisory smells ADV-10, ADV-11, ADV-14, ADV-17,
// ADV-18 (C#), ADV-15 and ADV-16 (TypeScript) from references/sonarqube-remediation.md. No execution and no type resolution: the
// receiver of a StartsWith call is not proven to be a string, so every observation is a review
// candidate. Observation text names shapes from a fixed vocabulary; literal values never leave.
import { hash } from './contracts.mjs';
import { scrub } from './hardcode.mjs';
import { lex, callAt, closing } from './security.mjs';
import { structureChecks, structureFinders } from './advisory-structure.mjs';

const checks = {
  'ADV-11': { language: 'cs', title: 'One-char string passed to a string overload', guidance: 'Use the char overload, for example StartsWith(\'/\'); keep a StringComparison argument that matters for letters.' },
  'ADV-10': { language: 'cs', title: 'Well-known header read through the indexer', guidance: 'Use the typed IHeaderDictionary property, for example Request.Headers.Authorization; it returns the same StringValues.' },
  'ADV-14': { language: 'cs', title: 'Loop body is only a filter', guidance: 'Move the condition into Where, or return through Any/FirstOrDefault when the body returns the first match.' },
  'ADV-17': { language: 'cs', title: 'ContainsKey guards an indexer read', guidance: 'Read once with TryGetValue(key, out var value); keep .ToString() for StringValues.' },
  'ADV-18': { language: 'cs', title: 'Hash computed through an instance', guidance: 'Call the static HashData, for example SHA256.HashData(bytes); keep the instance API for streams and incremental hashing.' },
  'ADV-15': { language: 'ts', title: 'String.match without the g flag', guidance: 'Call exec on the regex, for example /re/.exec(value); keep match for global regexes and matchAll.' },
  'ADV-16': { language: 'ts', title: 'Verbose character class', guidance: 'Use \\w for [A-Za-z0-9_] and \\d for [0-9]; both are exact equivalents in JavaScript regexes.' }
};
const advisory = 'Advisory (QUALITY-05): recommend first and fix only when the requester asks.';

const charMethod = /\.\s*(StartsWith|EndsWith|IndexOf|LastIndexOf|Contains|Split)\s*\(/g;
function charOverloadSites(ctx) {
  const found = [];
  for (const m of ctx.code.matchAll(charMethod)) {
    const call = callAt(ctx.code, m), first = ctx.strings.find(s => s.index > call.open && s.index < call.close);
    if (!first || first.holes.length || ctx.code.slice(call.open + 1, first.index).trim()) continue;
    const raw = ctx.text.slice(first.index, first.end);
    // A regular "x" literal of exactly one character (escapes such as "\n" count as one).
    if (!/^"(?:[^"\\]|\\.)"$/.test(raw)) continue;
    // A culture or comparison argument other than Ordinal changes semantics for letters.
    const rest = ctx.code.slice(first.end, call.close);
    if (/StringComparison\s*\.\s*(?!Ordinal\b)\w+|CultureInfo/.test(rest)) continue;
    found.push({ index: m.index, kind: m[1], detail: `${m[1]} is called with a one-character string literal, which uses the slower string overload.` });
  }
  return found;
}

const regexLiteral = /(?<=[=(,:!&|?;{}[\n]\s*)\/((?:\\.|\[(?:\\.|[^\]\\\n])*\]|[^/\\[\n])+)\/([dgimsuvy]*)/g;
function matchSites(ctx) {
  const found = [];
  for (const m of ctx.code.matchAll(/\.\s*match\s*\(\s*/g)) {
    const literal = new RegExp(regexLiteral.source, 'y');
    literal.lastIndex = m.index + m[0].length;
    const regex = literal.exec(ctx.code);
    if (regex && !regex[2].includes('g')) found.push({ index: m.index, kind: 'match', detail: 'String.match is called with a non-global regex literal, which returns the same result as RegExp.exec.' });
  }
  return found;
}

const verbose = [[/\[A-Za-z0-9_\]|\[a-zA-Z0-9_\]|\[A-Za-z_0-9\]|\[a-zA-Z_0-9\]|\[_A-Za-z0-9\]|\[0-9A-Za-z_\]/, '\\w'], [/(?<!\\)\[0-9\]/, '\\d']];
function classSites(ctx) {
  const found = [];
  for (const m of ctx.code.matchAll(regexLiteral)) {
    // The i flag makes [A-Z] and [a-z] fold, and u/v change \w only with i; keep those out.
    if (/[iuv]/.test(m[2])) continue;
    const hit = verbose.find(([shape]) => shape.test(m[1]));
    if (hit) found.push({ index: m.index, kind: hit[1], detail: `A regex literal spells out a character class that ${hit[1]} expresses exactly.` });
  }
  return found;
}

const knownHeaders = { Authorization: 'Authorization', 'X-Requested-With': 'XRequestedWith', 'Cache-Control': 'CacheControl', Expires: 'Expires', Cookie: 'Cookie' };
function headerSites(ctx) {
  const found = [];
  for (const m of ctx.code.matchAll(/\bHeaders\s*\[/g)) {
    const literal = ctx.strings.find(s => s.index > m.index && s.index < m.index + m[0].length + 4);
    if (!literal || literal.holes.length || ctx.code.slice(m.index + m[0].length, literal.index).trim()) continue;
    const name = Object.keys(knownHeaders).find(h => h.toLowerCase() === literal.value.toLowerCase());
    if (name) found.push({ index: m.index, kind: name, detail: `The ${name} header is read by string key although IHeaderDictionary has the typed ${knownHeaders[name]} property.` });
  }
  return found;
}

// foreach (...) { if (...) { ... } } with nothing else in the body and no else branch.
function filterLoopSites(ctx) {
  const found = [], code = ctx.code;
  for (const m of code.matchAll(/\bforeach\s*\(/g)) {
    const head = callAt(code, m), open = code.indexOf('{', head.close);
    if (open === -1 || code.slice(head.close + 1, open).trim()) continue;
    const close = closing(code, open, '{}'), body = code.slice(open + 1, close).trim();
    const cond = /^if\s*\(/.exec(body);
    if (!cond) continue;
    const condClose = closing(body, body.indexOf('('));
    const rest = body.slice(condClose + 1).trim();
    const blockEnd = rest.startsWith('{') ? closing(rest, 0, '{}') + 1 : rest.indexOf(';') + 1;
    if (blockEnd > 0 && !rest.slice(blockEnd).trim()) found.push({ index: m.index, kind: 'foreach-if', detail: 'The foreach body is a single if without else, so the loop only filters its source.' });
  }
  return found;
}

// x.ContainsKey(k) followed by x[k] on the same receiver and key text within the same statement or guarded block.
function doubleLookupSites(ctx) {
  const found = [], code = ctx.code;
  for (const m of code.matchAll(/([\w.]+)\s*\.\s*ContainsKey\s*\(/g)) {
    const call = callAt(code, m), key = code.slice(call.open + 1, call.close).trim();
    const literal = ctx.strings.find(s => s.index > call.open && s.end <= call.close);
    const keyText = key || (literal ? ctx.text.slice(literal.index, literal.end) : '');
    if (!keyText) continue;
    const window = ctx.text.slice(call.close, call.close + 240);
    const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const read = new RegExp(`${escape(m[1])}\\s*\\[\\s*${escape(keyText)}\\s*\\](?!\\s*=(?!=))`).exec(window);
    if (read && !/[;{}]/.test(code.slice(call.close, call.close + read.index).replace(/^\)\s*\{/, ''))) found.push({ index: m.index, kind: 'containskey-indexer', detail: 'ContainsKey is followed by an indexer read of the same key, which looks the key up twice.' });
  }
  return found;
}

const hashTypes = 'SHA1|SHA256|SHA384|SHA512|MD5|HMACSHA256';
function hashSites(ctx) {
  const found = [], code = ctx.code;
  for (const m of code.matchAll(new RegExp(`\\b(?:var\\s+)?(\\w+)\\s*=\\s*(${hashTypes})\\s*\\.\\s*Create\\s*\\(\\s*\\)`, 'g'))) {
    if (m[2] === 'HMACSHA256') continue;
    const after = code.slice(m.index, m.index + 600);
    if (new RegExp(`\\b${m[1]}\\s*\\.\\s*ComputeHash\\s*\\(`).test(after)) found.push({ index: m.index, kind: m[2], detail: `${m[2]}.Create() is used only to call ComputeHash, which the static ${m[2]}.HashData does without an instance.` });
  }
  for (const m of code.matchAll(new RegExp(`\\b(${hashTypes})\\s*\\.\\s*Create\\s*\\(\\s*\\)\\s*\\.\\s*ComputeHash\\s*\\(`, 'g'))) found.push({ index: m.index, kind: m[1], detail: `${m[1]}.Create().ComputeHash allocates an instance that the static ${m[1]}.HashData avoids.` });
  return found;
}

const siteFinders = { 'ADV-10': headerSites, 'ADV-14': filterLoopSites, 'ADV-17': doubleLookupSites, 'ADV-18': hashSites, 'ADV-11': charOverloadSites, 'ADV-15': matchSites, 'ADV-16': classSites, ...structureFinders };
Object.assign(checks, structureChecks);

function observation(ctx, check, site) {
  const entry = checks[check], snippet = ctx.code.slice(site.index, site.index + 80).replace(/\s+/g, ' ');
  const key = `${check}|${site.kind}|${snippet}`;
  return { line: ctx.text.slice(0, site.index).split('\n').length, column: site.index - ctx.text.lastIndexOf('\n', site.index - 1),
    anchor: `${check}:${hash(key).slice(0, 16)}`, fingerprint: hash(key),
    observation: scrub(`${entry.title} (${check}): ${site.detail} ${entry.guidance} ${advisory}`),
    observationKind: 'text-observation', disposition: 'review-candidate', applicability: 'unknown', actualEvidenceLevel: 'text' };
}

export const advisoryChecks = Object.keys(checks);
export function advisoryObservations(text, rule, file) {
  const entry = checks[rule.advisoryCheck];
  const language = entry && (entry.languages || [entry.language]).find(l => file.path.endsWith(`.${l}`));
  if (!language) return [];
  const ctx = { text, ...lex(text, language) };
  return siteFinders[rule.advisoryCheck](ctx, language).map(site => observation(ctx, rule.advisoryCheck, site));
}
