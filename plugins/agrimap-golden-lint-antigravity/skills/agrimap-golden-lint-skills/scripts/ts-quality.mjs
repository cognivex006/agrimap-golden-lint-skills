// Read-only lexical observations for the Golden complexity rules QUALITY-01 (if/else-if per function),
// QUALITY-02 (parameters per function) and ADV-19 (void operator, SonarQube S3735) in TypeScript.
// Functions are found by shape (methods, function declarations, function expressions and block-bodied
// arrows) without a parser, so every observation is a review candidate. No Cognitive Complexity score:
// SonarQube S3776 stays the authority for that gate.
import { hash } from './contracts.mjs';
import { scrub } from './hardcode.mjs';
import { lex, closing } from './security.mjs';

const BRANCH_LIMIT = 7, PARAMETER_LIMIT = 7;
const checks = {
  'QUALITY-01': { title: 'Too many if decisions in one function', guidance: 'Split the function into cohesive helpers or guard clauses, never nested ternaries; in a generated API client change the generator template, not the output.' },
  'QUALITY-02': { title: 'Too many parameters', guidance: 'Group related inputs into one typed options object or split the responsibility; report a public-contract change before making it.' },
  'ADV-19': { title: 'void operator', guidance: 'Call the promise or observable without void and handle it explicitly (await, subscribe, or a named helper that ignores the result).' }
};
const review = 'Review candidate: function boundaries are found by shape, not by a parser.';
const notName = /^(?:if|for|while|switch|catch|function|return|typeof|new|super|await|constructor)$/;

// Each function-like head: name or arrow, its parameter span and its braced body.
function functions(code) {
  const found = [];
  const add = (index, open) => {
    const close = closing(code, open);
    const after = code.slice(close + 1);
    const typed = /^\s*(?::\s*[^{=;]+?)?\s*(=>)?\s*\{/.exec(after);
    if (!typed) return;
    const bodyOpen = close + 1 + typed[0].length - 1;
    found.push({ index, open, close, bodyOpen, bodyClose: closing(code, bodyOpen, '{}') });
  };
  for (const m of code.matchAll(/(?:\bfunction\s*\*?\s*\w*\s*|(?<![\w$.])([A-Za-z_$][\w$]*)\s*(?:<[^<>()]*>)?\s*)\(/g)) {
    if (m[1] && notName.test(m[1]) && m[1] !== 'constructor') continue;
    if (m[1] && /\b(?:new|await|return)\s*$/.test(code.slice(Math.max(0, m.index - 8), m.index))) continue;
    add(m.index, m.index + m[0].length - 1);
  }
  // Arrow functions with parenthesized parameters: (a, b) => { ... }
  for (const m of code.matchAll(/(?<![\w$])\((?=[^()]*(?:\([^()]*\)[^()]*)*\)\s*(?::\s*[^=;{]+)?\s*=>\s*\{)/g)) add(m.index, m.index);
  const unique = new Map(found.map(f => [f.bodyOpen, f]));
  return [...unique.values()].sort((a, b) => a.index - b.index);
}

function topLevelParameters(code, open, close) {
  const inner = code.slice(open + 1, close).trim();
  if (!inner) return 0;
  let depth = 0, count = 1;
  for (const c of inner) {
    if ('([{<'.includes(c)) depth++;
    else if (')]}>'.includes(c)) depth--;
    else if (c === ',' && depth === 0) count++;
  }
  return inner.endsWith(',') ? count - 1 : count;
}

function branchSites(ctx) {
  const fns = functions(ctx.code), found = [];
  for (const fn of fns) {
    const nested = fns.filter(o => o !== fn && o.bodyOpen > fn.bodyOpen && o.bodyClose <= fn.bodyClose);
    const inside = i => !nested.some(o => i > o.bodyOpen && i < o.bodyClose);
    const count = [...ctx.code.slice(fn.bodyOpen, fn.bodyClose).matchAll(/\bif\s*\(/g)].filter(m => inside(fn.bodyOpen + m.index)).length;
    if (count > BRANCH_LIMIT) found.push({ index: fn.index, kind: 'branches', detail: `The function has ${count} if/else-if decisions; the team limit is ${BRANCH_LIMIT}.` });
  }
  return found;
}
function parameterSites(ctx) {
  return functions(ctx.code).map(fn => ({ fn, count: topLevelParameters(ctx.code, fn.open, fn.close) }))
    .filter(x => x.count > PARAMETER_LIMIT)
    .map(({ fn, count }) => ({ index: fn.index, kind: 'parameters', detail: `The function declares ${count} parameters; the limit is ${PARAMETER_LIMIT}.` }));
}
function voidSites(ctx) {
  return [...ctx.code.matchAll(/(?<![\w$.:])void\s+(?![;)\]},]|0\b)(?=[\w$(])/g)]
    .filter(m => !/:\s*$|<[^>]*$|=>\s*$|\|\s*$/.test(ctx.code.slice(Math.max(0, m.index - 30), m.index)))
    .map(m => ({ index: m.index, kind: 'void', detail: 'The void operator discards the value of an expression, usually a promise or observable, so its failure is silently ignored.' }));
}

const siteFinders = { 'QUALITY-01': branchSites, 'QUALITY-02': parameterSites, 'ADV-19': voidSites };

function observation(ctx, check, site) {
  const entry = checks[check], snippet = ctx.code.slice(site.index, site.index + 80).replace(/\s+/g, ' ');
  const key = `${check}|${site.kind}|${snippet}`;
  return { line: ctx.text.slice(0, site.index).split('\n').length, column: site.index - ctx.text.lastIndexOf('\n', site.index - 1),
    anchor: `${check}:${hash(key).slice(0, 16)}`, fingerprint: hash(key),
    observation: scrub(`${entry.title} (${check}): ${site.detail} ${entry.guidance} ${review}`),
    observationKind: 'text-observation', disposition: 'review-candidate', applicability: 'unknown', actualEvidenceLevel: 'text' };
}

export const tsQualityChecks = Object.keys(checks);
export function tsQualityObservations(text, rule, file) {
  if (!checks[rule.tsQualityCheck] || !file.path.endsWith('.ts') || file.path.endsWith('.d.ts')) return [];
  const ctx = { text, ...lex(text, 'ts') };
  return siteFinders[rule.tsQualityCheck](ctx).map(site => observation(ctx, rule.tsQualityCheck, site));
}
