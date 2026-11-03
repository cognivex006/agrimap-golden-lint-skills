// Read-only lexical observations for the Golden advisory smells ADV-11 (C#), ADV-15 and ADV-16
// (TypeScript) from references/sonarqube-remediation.md. No execution and no type resolution: the
// receiver of a StartsWith call is not proven to be a string, so every observation is a review
// candidate. Observation text names shapes from a fixed vocabulary; literal values never leave.
import { hash } from './contracts.mjs';
import { scrub } from './hardcode.mjs';
import { lex, callAt } from './security.mjs';

const checks = {
  'ADV-11': { language: 'cs', title: 'One-char string passed to a string overload', guidance: 'Use the char overload, for example StartsWith(\'/\'); keep a StringComparison argument that matters for letters.' },
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

const siteFinders = { 'ADV-11': charOverloadSites, 'ADV-15': matchSites, 'ADV-16': classSites };

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
  if (!entry || !file.path.endsWith(`.${entry.language}`)) return [];
  const ctx = { text, ...lex(text, entry.language) };
  return siteFinders[rule.advisoryCheck](ctx).map(site => observation(ctx, rule.advisoryCheck, site));
}
