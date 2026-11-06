// Read-only lexical observations for the SonarQube rows that Golden 6.1.2 marks `must` in
// patterns/sonarqube/csharp.md and patterns/sonarqube/typescript.md and that had no detector:
// ADV-21/23/25/26/27/28/29/30/31/33/39/41/42/44/45/48/49/50/51/53 plus the unnumbered rows
// CS1998, S6582, S6606 and S2245. No execution and no type resolution: a `bool?` compared with
// true, an `IQueryable` Where chain or a deliberate empty hook all look the same as the smell, so
// every observation is a review candidate. Site details name shapes, never literal values.
import { closing, callAt } from './security.mjs';

export const structureChecks = {
  'ADV-21': { languages: ['cs', 'ts'], title: 'TODO/FIXME marker left in code', guidance: 'Finish the work or report it in the summary; never add the marker.' },
  'ADV-23': { languages: ['cs', 'ts'], title: 'Commented-out code', guidance: 'Delete it; Git keeps the history. A comment that explains intent stays.' },
  'ADV-25': { languages: ['cs', 'ts'], title: 'Two branches with the same body', guidance: 'Merge the conditions with || or hoist the common code; keep evaluation order and short-circuiting.' },
  'ADV-26': { languages: ['cs', 'ts'], title: 'Multi-line body after an unbraced if or loop', guidance: 'Add braces after confirming which lines were meant to be conditional; treat it as a possible bug and add a test.' },
  'ADV-27': { languages: ['ts'], title: 'Default parameter before a required one', guidance: 'Move optional parameters last or use an options object; on a shared API add the new signature and migrate callers.' },
  'ADV-28': { languages: ['cs', 'ts'], title: 'Two functions with the same body', guidance: 'Extract one shared private method or utility with a test; keep routes, attributes and public names.' },
  'ADV-29': { languages: ['cs', 'ts'], title: 'Boolean compared with a literal', guidance: 'Write x or !x on a non-nullable boolean; for bool? use ?? false or is true.' },
  'ADV-30': { languages: ['cs'], title: 'Where followed by a terminal LINQ call', guidance: 'Pass the predicate to FirstOrDefault/Any/Count directly, or Find/Exists on List<T>; keep the chain when an IQueryable translates it to SQL.' },
  'ADV-31': { languages: ['ts'], title: 'Global isNaN/parseInt/parseFloat', guidance: 'Use Number.isNaN, Number.parseInt(x, 10) or Number.parseFloat; convert first when the input can be a string.' },
  'ADV-33': { languages: ['cs', 'ts'], title: 'Empty function without a comment', guidance: 'Delete it with its binding, or comment why it is empty (interface no-op).' },
  'ADV-39': { languages: ['cs', 'ts'], title: 'if nested directly in an if without else', guidance: 'Merge into if (a && b); keep side-effect order.' },
  'ADV-41': { languages: ['ts'], title: 'Import from node_modules or an internal chunk', guidance: 'Import the package public entry, for example @angular/common/http, then build to confirm.' },
  'ADV-42': { languages: ['ts'], title: 'Older string/array idiom', guidance: 'Use replaceAll for a literal global replace and at(-1) for the last element (ES2022 or later).' },
  'ADV-44': { languages: ['cs'], title: 'JsonSerializerOptions created per call', guidance: 'Hold one private static readonly options instance and never change it after first use; keep every option value.' },
  'ADV-45': { languages: ['cs'], title: 'Manual argument guard', guidance: 'Use ArgumentNullException.ThrowIfNull, ArgumentOutOfRangeException.ThrowIfNegative or ObjectDisposedException.ThrowIf; keep the explicit throw when a custom message is asserted.' },
  'ADV-48': { languages: ['ts'], title: 'Same module imported twice', guidance: 'Merge into one import; keep side-effect imports and required import type lines.' },
  'ADV-49': { languages: ['cs', 'ts'], title: 'switch with fewer than three labels', guidance: 'Use if/else or a ternary, or a lookup table for a growing list; keep fall-through and default behavior.' },
  'ADV-50': { languages: ['cs'], title: 'Case comparison through ToLower/ToUpper', guidance: 'Use string.Equals(a, b, StringComparison.OrdinalIgnoreCase) when the code means equal ignoring case; when it means "already lower case" the suggested fix inverts the check.' },
  'ADV-51': { languages: ['cs'], title: 'Identifier named field inside a property', guidance: 'Rename that lambda parameter or local (f, item) or write @field; rename only that scope.' },
  'ADV-53': { languages: ['cs', 'ts'], title: 'Every path returns the same value', guidance: 'Return void/Task/Promise<void> and let the caller use the constant; callers that use the value keep the same result and ordering.' },
  CS1998: { languages: ['cs'], title: 'async method without await', guidance: 'Drop async and return Task.FromResult/Task.CompletedTask, or make the method synchronous.' },
  S6582: { languages: ['ts'], title: 'Guard chain instead of optional chaining', guidance: 'Write a?.b instead of a && a.b when the falsy-but-defined case (0, \'\') does not matter.' },
  S6606: { languages: ['ts'], title: 'Null check ternary instead of ??', guidance: 'Write a ?? b instead of a !== null && a !== undefined ? a : b.' },
  S2245: { languages: ['ts'], title: 'Math.random() used', guidance: 'Use crypto.randomUUID() or crypto.getRandomValues() when the value is an id, key or token; display-only randomness may stay.' }
};

const keywords = new Set(['if', 'for', 'foreach', 'while', 'switch', 'catch', 'using', 'lock', 'fixed', 'return', 'nameof', 'typeof', 'sizeof', 'default', 'when', 'checked', 'unchecked', 'base', 'this', 'with', 'await', 'new', 'throw', 'function', 'super', 'else', 'do', 'in', 'of', 'is', 'as', 'not', 'and', 'or']);
const lineOf = (text, index) => text.slice(0, index).split('\n').length;
const collapse = value => value.replace(/\s+/g, ' ').trim();
// Code with comments blanked but literal text restored, so identical-body checks see "a" and "b" apart.
function source(ctx) {
  if (ctx.src) return ctx.src;
  let out = '', last = 0;
  for (const s of ctx.strings) { out += ctx.code.slice(last, s.index) + ctx.text.slice(s.index, s.end); last = s.end; }
  return (ctx.src = out + ctx.code.slice(last));
}
const inComment = (ctx, index) => ctx.code[index] !== ctx.text[index] && !ctx.strings.some(s => index >= s.index && index < s.end);
const statementStart = (code, index) => Math.max(code.lastIndexOf(';', index - 1), code.lastIndexOf('{', index - 1), code.lastIndexOf('}', index - 1)) + 1;

// Named function, method, constructor and accessor-like headers that open a braced body.
function functions(ctx) {
  if (ctx.fns) return ctx.fns;
  const code = ctx.code, out = [];
  for (const m of code.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*(?:<[^<>(){};]*>)?\s*\(/g)) {
    if (keywords.has(m[1])) continue;
    const before = code.slice(Math.max(0, m.index - 12), m.index);
    if (/\bnew\s+$|\.\s*$|\?\.\s*$/.test(before)) continue;
    const open = m.index + m[0].length - 1, close = closing(code, open);
    const brace = code.indexOf('{', close);
    if (brace === -1) continue;
    const between = code.slice(close + 1, brace);
    if (!/^\s*(?::[^{};=]*?)?\s*(?:where\s[^{};]+)?$/.test(between) || /=>/.test(between)) continue;
    // A call such as foo(x) followed by a block on the next statement is not a header.
    const prefix = code.slice(statementStart(code, m.index), m.index);
    if (/[=(,?:]\s*$/.test(prefix) || /\breturn\s*$/.test(prefix)) continue;
    const end = closing(code, brace, '{}');
    out.push({ name: m[1], index: m.index, params: code.slice(open + 1, close), prefix, brace, end, body: code.slice(brace + 1, end) });
  }
  return (ctx.fns = out);
}

function todoSites(ctx) {
  return [...ctx.text.matchAll(/\b(TODO|FIXME)\b/g)].filter(m => inComment(ctx, m.index))
    .map(m => ({ index: m.index, kind: m[1], detail: `A ${m[1]} marker is left in a comment.` }));
}

const codeComment = /^(?:[{}]\s*;?|.*[;{}]\s*)$/;
const codeShape = /[(=.]|^\s*[{}]|^\s*(?:return|var|let|const|if|for|foreach|await|throw)\b/;
function commentedCodeSites(ctx) {
  const found = [];
  let offset = 0, previous = false;
  for (const line of ctx.text.split('\n')) {
    const at = line.indexOf('//'), content = at === -1 ? '' : line.slice(at + 2);
    const hit = at !== -1 && line.slice(0, at).trim() === '' && !line.startsWith('///', at) && inComment(ctx, offset + at)
      && codeComment.test(content.trim()) && codeShape.test(content) && !/^\s*(?:https?:|eslint|@ts-|prettier|#)/.test(content);
    if (hit && !previous) found.push({ index: offset + at, kind: 'commented-code', detail: 'A line comment holds a statement or block delimiter, which reads as commented-out code.' });
    previous = hit;
    offset += line.length + 1;
  }
  return found;
}

// An if/else-if/else chain whose every branch is braced; returns the branch bodies with positions.
function chain(code, start) {
  const branches = [];
  let at = start;
  for (;;) {
    const head = /^(?:\s*else\s+)?\s*if\s*\(/.exec(code.slice(at));
    if (!head) return null;
    const open = at + head[0].length - 1, close = closing(code, open);
    const brace = /^\s*\{/.exec(code.slice(close + 1));
    if (!brace) return null;
    const b = close + brace[0].length, end = closing(code, b, '{}');
    branches.push({ index: b, start: b + 1, end, conditionEnd: close });
    const rest = code.slice(end + 1);
    const elseIf = /^\s*else\s+if\s*\(/.exec(rest), elseBlock = /^\s*else\s*\{/.exec(rest);
    if (elseIf) { at = end + 1; continue; }
    if (elseBlock) {
      const eb = end + elseBlock[0].length, ee = closing(code, eb, '{}');
      branches.push({ index: eb, start: eb + 1, end: ee, isElse: true });
      return { branches, end: ee };
    }
    return { branches, end };
  }
}
const chainStarts = code => [...code.matchAll(/\bif\s*\(/g)].filter(m => !/\belse\s*$/.test(code.slice(Math.max(0, m.index - 10), m.index)));

function sameBranchSites(ctx) {
  const found = [], src = source(ctx);
  for (const m of chainStarts(ctx.code)) {
    const c = chain(ctx.code, m.index);
    if (!c || c.branches.length < 2) continue;
    const seen = [];
    for (const branch of c.branches) {
      const body = collapse(src.slice(branch.start, branch.end));
      if (body && seen.includes(body)) found.push({ index: branch.index, kind: 'same-branch', detail: 'This branch repeats the body of an earlier branch in the same if/else chain.' });
      seen.push(body);
    }
  }
  return found;
}

const indent = line => line.length - line.trimStart().length;
const balanced = line => (line.match(/\(/g) || []).length === (line.match(/\)/g) || []).length;
function unbracedSites(ctx) {
  const found = [], lines = ctx.code.split('\n');
  let offset = 0;
  const offsets = lines.map(l => { const o = offset; offset += l.length + 1; return o; });
  const next = from => { for (let i = from; i < lines.length; i++) if (lines[i].trim()) return i; return -1; };
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!(/^(?:\}\s*)?(?:else\s+)?(?:if|for|foreach|while)\s*\(.*\)$/.test(t) && balanced(t)) && !/^(?:\}\s*)?else$/.test(t)) continue;
    const a = next(i + 1);
    if (a === -1) continue;
    const first = lines[a].trim();
    if (first.startsWith('{') || indent(lines[a]) <= indent(lines[i]) || !first.endsWith(';') || /^(?:if|for|foreach|while|else)\b/.test(first)) continue;
    const b = next(a + 1);
    if (b === -1) continue;
    const second = lines[b].trim();
    if (indent(lines[b]) === indent(lines[a]) && !/^[}\])]|^else\b|^case\b|^default\b/.test(second))
      found.push({ index: offsets[i] + indent(lines[i]), kind: 'unbraced-body', detail: 'The line after the single unbraced statement is indented as if it belonged to the same body.' });
  }
  return found;
}

function splitParams(params) {
  const out = [];
  let depth = 0, last = 0;
  for (let i = 0; i < params.length; i++) {
    const ch = params[i];
    if ('([{<'.includes(ch)) depth++;
    else if (')]}>'.includes(ch) && params[i - 1] !== '=') depth--;
    else if (ch === ',' && depth === 0) { out.push(params.slice(last, i)); last = i + 1; }
  }
  out.push(params.slice(last));
  return out.map(p => p.trim()).filter(Boolean);
}
const hasDefault = param => { let depth = 0; for (let i = 0; i < param.length; i++) { const ch = param[i]; if ('([{<'.includes(ch)) depth++; else if (')]}>'.includes(ch) && param[i - 1] !== '=') depth--; else if (ch === '=' && depth === 0 && param[i + 1] !== '>' && !'=!<>'.includes(param[i - 1])) return true; } return false; };
function defaultFirstSites(ctx) {
  const found = [];
  for (const fn of functions(ctx)) {
    const params = splitParams(fn.params);
    const firstDefault = params.findIndex(hasDefault);
    if (firstDefault === -1) continue;
    const required = params.slice(firstDefault + 1).some(p => !hasDefault(p) && !p.startsWith('...') && !/^[\w$\s]*\?\s*:/.test(p.replace(/^(?:(?:private|public|protected|readonly|override)\s+)+/, '')));
    if (required) found.push({ index: fn.index, kind: 'default-before-required', detail: 'A parameter with a default value comes before a required parameter.' });
  }
  return found;
}

function duplicateBodySites(ctx) {
  const found = [], src = source(ctx), seen = new Map();
  for (const fn of functions(ctx)) {
    const body = collapse(src.slice(fn.brace + 1, fn.end));
    if ((body.match(/;/g) || []).length < 3) continue;
    if (seen.has(body)) found.push({ index: fn.index, kind: 'duplicate-body', detail: 'This function has the same body as another function in the file.' });
    else seen.set(body, fn.name);
  }
  return found;
}

// A ?. operand is nullable by construction, so `x?.On != true` is the bool? form Golden keeps.
const nullableOperand = (code, index) => /\?\.[\w$.]*\)?\s*$/.test(code.slice(Math.max(0, index - 60), index));
function boolLiteralSites(ctx) {
  return [...ctx.code.matchAll(/[=!]==?\s*(?:true|false)\b|\b(?:true|false)\s*[=!]==?(?!>)/g)]
    .filter(m => !/^[=!]/.test(m[0]) || !nullableOperand(ctx.code, m.index))
    .map(m => ({ index: m.index, kind: 'bool-literal', detail: 'A value is compared with the true/false literal.' }));
}

function whereTerminalSites(ctx) {
  const found = [];
  for (const m of ctx.code.matchAll(/\.\s*Where\s*\(/g)) {
    const call = callAt(ctx.code, m);
    const tail = /^\s*\.\s*(FirstOrDefault|First|SingleOrDefault|Single|LastOrDefault|Last|Any|Count|LongCount)\s*\(\s*\)/.exec(ctx.code.slice(call.close + 1));
    if (tail) found.push({ index: m.index, kind: tail[1], detail: `Where(predicate) is followed by ${tail[1]}(), which takes the predicate directly.` });
  }
  return found;
}

function globalNumberSites(ctx) {
  return [...ctx.code.matchAll(/(?<![\w$.])(isNaN|isFinite|parseInt|parseFloat)\s*\(/g)]
    .filter(m => !/\bfunction\s+$/.test(ctx.code.slice(Math.max(0, m.index - 12), m.index)))
    .map(m => ({ index: m.index, kind: m[1], detail: `The global ${m[1]} is called instead of Number.${m[1]}.` }));
}

function emptyFunctionSites(ctx, language) {
  const found = [];
  for (const fn of functions(ctx)) {
    if (ctx.text.slice(fn.brace + 1, fn.end).trim()) continue;
    if (fn.name === 'constructor') continue;
    // A C# constructor has only modifiers before its name (no return type).
    if (language === 'cs' && /^\s*(?:(?:public|private|protected|internal|static)\s+)*$/.test(fn.prefix.replace(/\[[^\]]*\]/g, ''))) continue;
    found.push({ index: fn.index, kind: 'empty-function', detail: 'The function body is empty and has no comment explaining why.' });
  }
  return found;
}

function nestedIfSites(ctx) {
  const found = [], code = ctx.code;
  for (const m of chainStarts(code)) {
    const c = chain(code, m.index);
    if (!c || c.branches.length !== 1) continue;
    const outer = c.branches[0], body = code.slice(outer.start, outer.end), lead = /^\s*/.exec(body)[0].length;
    if (!/^if\s*\(/.test(body.slice(lead))) continue;
    const inner = chain(code, outer.start + lead);
    if (inner && inner.branches.length === 1 && !code.slice(inner.end + 1, outer.end).trim())
      found.push({ index: m.index, kind: 'nested-if', detail: 'The if body is only another if, and neither has an else branch.' });
  }
  return found;
}

function importPathSites(ctx) {
  const found = [];
  for (const s of ctx.strings) {
    if (!/\b(?:from|import)\s*\(?\s*$/.test(ctx.code.slice(Math.max(0, s.index - 12), s.index))) continue;
    if (/(?:^|\/)node_modules\/|\/f?esm(?:\d+)?\//.test(s.value)) found.push({ index: s.index, kind: 'internal-import', detail: 'The import path points into node_modules or a package build chunk instead of its public entry.' });
  }
  return found;
}

function modernIdiomSites(ctx) {
  const found = [], code = ctx.code;
  for (const m of code.matchAll(/\.\s*replace\s*\(\s*\/((?:\\.|[^/\\\n])+)\/([a-z]*)\s*,/g)) {
    const plain = m[1].replace(/\\[^dDwWsSbB0-9]/g, '');
    if (m[2].includes('g') && !/[\\^$.|?*+()[\]{}]/.test(plain)) found.push({ index: m.index, kind: 'replace-global', detail: 'replace is called with a literal global regex, which replaceAll expresses with a string.' });
  }
  for (const m of code.matchAll(/(?<![\w$.])((?:this\.)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*\[\s*\1\s*\.\s*length\s*-\s*1\s*\]/g))
    found.push({ index: m.index, kind: 'last-index', detail: 'The last element is read through length - 1, which at(-1) expresses.' });
  return found;
}

function jsonOptionsSites(ctx) {
  const found = [], code = ctx.code;
  for (const m of code.matchAll(/\bnew\s+(?:System\.Text\.Json\.)?JsonSerializerOptions\b/g)) {
    const prefix = code.slice(statementStart(code, m.index), m.index);
    if (/\bstatic\b|\breadonly\b|\bconst\b/.test(prefix)) continue;
    found.push({ index: m.index, kind: 'json-options', detail: 'A JsonSerializerOptions instance is created inside a member body instead of being reused.' });
  }
  return found;
}

function guardSites(ctx) {
  const found = [], code = ctx.code;
  const patterns = [
    [/\bif\s*\(\s*([A-Za-z_]\w*)\s*(?:is\s+null|==\s*null)\s*\)\s*(\{\s*)?throw\s+new\s+(?:System\.)?ArgumentNullException\s*\(\s*nameof\s*\(\s*\1\s*\)\s*\)\s*;/g, 'CA1510', 'ArgumentNullException.ThrowIfNull'],
    [/\bif\s*\(\s*([A-Za-z_]\w*)\s*<\s*0\s*\)\s*(\{\s*)?throw\s+new\s+(?:System\.)?ArgumentOutOfRangeException\s*\(\s*nameof\s*\(\s*\1\s*\)\s*\)\s*;/g, 'CA1512', 'ArgumentOutOfRangeException.ThrowIfNegative'],
    [/\bif\s*\(\s*(!?\s*[A-Za-z_][\w.]*)\s*\)\s*(\{\s*)?throw\s+new\s+(?:System\.)?ObjectDisposedException\s*\(/g, 'CA1513', 'ObjectDisposedException.ThrowIf']
  ];
  for (const [pattern, kind, helper] of patterns) for (const m of code.matchAll(pattern)) {
    if (m[2] && !/^\s*\}/.test(code.slice(m.index + m[0].length))) continue;
    found.push({ index: m.index, kind, detail: `A manual if/throw guard matches what ${helper} does.` });
  }
  return found;
}

function duplicateImportSites(ctx) {
  const found = [], src = source(ctx), seen = new Set();
  for (const m of src.matchAll(/(?:^|[;\n])\s*import\s+(?!type\b)[^;'"]*?\bfrom\s*(['"])([^'"]+)\1/g)) {
    if (seen.has(m[2])) found.push({ index: m.index + m[0].indexOf('import'), kind: 'duplicate-import', detail: 'The same module is imported in more than one import statement.' });
    seen.add(m[2]);
  }
  return found;
}

function smallSwitchSites(ctx) {
  const found = [], code = ctx.code;
  for (const m of code.matchAll(/\bswitch\s*\(/g)) {
    const call = callAt(code, m), brace = /^\s*\{/.exec(code.slice(call.close + 1));
    if (!brace) continue;
    const open = call.close + brace[0].length, end = closing(code, open, '{}');
    let depth = 0, labels = 0;
    for (let i = open + 1; i < end; i++) {
      const ch = code[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (depth === 0 && /[cd]/.test(ch) && !/[\w$]/.test(code[i - 1]) && /^(?:case\b|default\s*:)/.test(code.slice(i, i + 9))) labels++;
    }
    if (labels > 0 && labels < 3) found.push({ index: m.index, kind: 'small-switch', detail: `The switch statement has ${labels} label${labels === 1 ? '' : 's'}, fewer than three.` });
  }
  return found;
}

function caseCompareSites(ctx) {
  const found = [], code = ctx.code;
  for (const m of code.matchAll(/\.\s*To(?:Lower|Upper)(?:Invariant)?\s*\(\s*\)/g)) {
    const after = code.slice(m.index + m[0].length, m.index + m[0].length + 4), lineStart = code.lastIndexOf('\n', m.index) + 1;
    const before = code.slice(lineStart, m.index);
    if (/^\s*[!=]=/.test(after) || /[!=]=\s*[\w.()[\]]*$/.test(before)) found.push({ index: m.index, kind: 'case-compare', detail: 'A ToLower/ToUpper result is compared with == or !=.' });
  }
  return found;
}

function fieldIdentifierSites(ctx) {
  const found = [], code = ctx.code;
  for (const m of code.matchAll(/\bfield\s*=>|\(\s*field\s*[,)]|\bvar\s+field\b/g)) {
    if (/@\s*$/.test(code.slice(m.index - 1, m.index))) continue;
    const start = statementStart(code, m.index), prefix = code.slice(start, m.index);
    const exprProperty = /^\s*(?:\[[^\]]*\]\s*)*(?:(?:public|private|protected|internal|static|override|virtual|new|sealed|required|abstract)\s+)*[\w<>?,.[\]\s]+?\s+[A-Za-z_]\w*\s*=>/.test(prefix) && !/\(/.test(prefix.split('=>')[0]);
    const accessor = /^\s*(?:get|set|init)\s*=>/.test(prefix) || /\b(?:get|set|init)\s*$/.test(code.slice(0, start - 1).trimEnd());
    if (exprProperty || accessor) found.push({ index: m.index, kind: 'field-identifier', detail: 'An identifier named field is declared inside a property, where C# 14 reads field as the backing-field keyword.' });
  }
  return found;
}

const literalValue = /^(?:true|false|null|undefined|-?\d+(?:\.\d+)?[mMdDfFlLuU]?|"[^"\\]*"|'[^'\\]*'|string\.Empty)$/;
function sameReturnSites(ctx) {
  const found = [], src = source(ctx);
  for (const fn of functions(ctx)) {
    if (/=>|\bfunction\b|\bdelegate\b/.test(fn.body)) continue;
    const values = [...src.slice(fn.brace + 1, fn.end).matchAll(/\breturn\b([^;]*);/g)].map(r => r[1].trim());
    if (values.length >= 2 && values.every(v => v && v === values[0] && literalValue.test(v)))
      found.push({ index: fn.index, kind: 'same-return', detail: `All ${values.length} return statements return the same literal value.` });
  }
  return found;
}

function asyncWithoutAwaitSites(ctx) {
  const found = [], code = ctx.code;
  for (const m of code.matchAll(/\basync\s+(?:(?:System\.Threading\.Tasks\.)?(?:Task|ValueTask)(?:<[^;{}()]*>)?|void)\s+([A-Za-z_]\w*)\s*(?:<[^<>(){};]*>)?\s*\(/g)) {
    const call = callAt(code, m), rest = code.slice(call.close + 1);
    const lead = /^\s*(?:where\s[^{;=]+)?/.exec(rest)[0].length, at = call.close + 1 + lead;
    let body;
    if (code[at] === '{') body = code.slice(at + 1, closing(code, at, '{}'));
    else if (code.startsWith('=>', at)) body = code.slice(at + 2, code.indexOf(';', at));
    else continue;
    if (!/\bawait\b/.test(body)) found.push({ index: m.index, kind: 'async-no-await', detail: `${m[1]} is declared async but its body has no await.` });
  }
  return found;
}

function optionalChainSites(ctx) {
  return [...ctx.code.matchAll(/(?<![\w$.!])((?:this\.)?[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\s*&&\s*\1\s*\.\s*[A-Za-z_$]/g)]
    .map(m => ({ index: m.index, kind: 'guard-chain', detail: 'A value is tested with && and then dereferenced, which optional chaining expresses.' }));
}

function nullishSites(ctx) {
  const id = '((?:this\\.)?[A-Za-z_$][\\w$]*(?:\\.[A-Za-z_$][\\w$]*)*)';
  const patterns = [new RegExp(`(?<![\\w$.])${id}\\s*!==?\\s*null\\s*&&\\s*\\1\\s*!==?\\s*undefined\\s*\\?\\s*\\1\\s*:`, 'g'), new RegExp(`(?<![\\w$.])${id}\\s*!=\\s*null\\s*\\?\\s*\\1\\s*:`, 'g')];
  return patterns.flatMap(p => [...ctx.code.matchAll(p)]).map(m => ({ index: m.index, kind: 'nullish-ternary', detail: 'A null/undefined check ternary returns the tested value, which ?? expresses.' }));
}

function randomSites(ctx) {
  return [...ctx.code.matchAll(/\bMath\s*\.\s*random\s*\(/g)].map(m => ({ index: m.index, kind: 'math-random', detail: 'Math.random() is not cryptographically secure; confirm the value is not an id, key or token.' }));
}

export const structureFinders = {
  'ADV-21': todoSites, 'ADV-23': commentedCodeSites, 'ADV-25': sameBranchSites, 'ADV-26': unbracedSites, 'ADV-27': defaultFirstSites,
  'ADV-28': duplicateBodySites, 'ADV-29': boolLiteralSites, 'ADV-30': whereTerminalSites, 'ADV-31': globalNumberSites, 'ADV-33': emptyFunctionSites,
  'ADV-39': nestedIfSites, 'ADV-41': importPathSites, 'ADV-42': modernIdiomSites, 'ADV-44': jsonOptionsSites, 'ADV-45': guardSites,
  'ADV-48': duplicateImportSites, 'ADV-49': smallSwitchSites, 'ADV-50': caseCompareSites, 'ADV-51': fieldIdentifierSites, 'ADV-53': sameReturnSites,
  CS1998: asyncWithoutAwaitSites, S6582: optionalChainSites, S6606: nullishSites, S2245: randomSites
};
