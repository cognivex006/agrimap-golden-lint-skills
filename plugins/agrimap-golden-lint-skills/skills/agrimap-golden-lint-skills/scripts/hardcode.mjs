// Read-only lexical hardcode observations. No execution, no network, no product writes.
// Credential-shaped values are never emitted: only a shape label, a masked form and a digest.
import path from 'node:path';
import { hash, json, packageRoot } from './contracts.mjs';

const table = json(path.join(packageRoot, 'skills/agrimap-golden-lint-skills/assets/hardcode-classes.json'));
export const hardcodeTable = table.classes;
// One detector is bound to one tier bucket, so the authority tier it reports always matches the
// classes it may emit; the exact class travels on each finding instead.
export const hardcodeClassesFor = (lane, tier) => table.classes.filter(entry => entry.lanes.includes(lane) && entry.tier === tier);

// A line-comment marker also appears inside string values ("https://host"), so comments and literals
// are separated in one pass. Masking comments first would destroy every URL literal before matching.
const blank = value => value.replace(/[^\r\n]/g, ' ');
const lineEnd = (text, index) => { const end = text.indexOf('\n', index); return end === -1 ? text.length : end; };
const blockEnd = (text, index) => { const end = text.indexOf('*/', index + 2); return end === -1 ? text.length : end + 2; };
const commentAt = (text, index, sql) => (text[index] === '/' && (text[index + 1] === '/' || text[index + 1] === '*')) || (sql && text[index] === '-' && text[index + 1] === '-');
// Index of the opening quote when a literal starts here, otherwise -1.
function literalStart(text, index, sql) {
  const char = text[index];
  if (sql) return char === "'" ? index : -1;
  if (char === '"' || char === "'" || char === '`') return index;
  if (char !== '@' && char !== '$') return -1;
  let cursor = index;
  while (text[cursor] === '@' || text[cursor] === '$') cursor++;
  return text[cursor] === '"' ? cursor : -1;
}
function readLiteral(text, start, sql) {
  const quote = text[start];
  let index = start + 1, value = '';
  while (index < text.length) {
    const char = text[index];
    if (char === quote && text[index + 1] === quote) { value += quote; index += 2; continue; }
    if (char === quote) return { value, end: index + 1 };
    if (char === '\\' && !sql) { value += text[index + 1] ?? ''; index += 2; continue; }
    value += char; index++;
  }
  return { value, end: text.length };
}
const envHost = /(?:^|\.)(?:appserv2\.cdg\.co\.th|agrimap-api\.cdg\.co\.th|agrimap-api\.ldd\.go\.th|agrimap-[a-z0-9-]+\.(?:cdg\.co\.th|ldd\.go\.th))$|(?:^|\.)svc\.cluster\.local$|(?:^|\.)(?:cdg\.co\.th|ldd\.go\.th)$/i;
const mapHost = /(?:^|\.)(?:arcgis\.com|arcgisonline\.com|esri\.com|googleapis\.com|google\.com|openstreetmap\.org|mapbox\.com|maptiler\.com|here\.com)$/i;
const schemaHost = /(?:^|\.)(?:w3\.org|json-schema\.org|schemas\.microsoft\.com|purl\.org|xml\.org|openxmlformats\.org|ietf\.org|example\.com|example\.org|localhost\.localdomain)$/i;
const devHost = /^(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i;
const environmentName = /^(?:Development|Inhouse|K8s\.dev|Staging|Production)$/;
const limitName = /(?:max|min|limit|threshold|capacity|page.?size|batch.?size|total|quota)/i;
const timingName = /(?:timeout|delay|interval|ttl|retry|retries|second|millisecond|minute|hour|tick)/i;
const sqlObjectName = /^\[?[A-Za-z_][\w]*\]?\.\[?dbo\]?\./i;
const urlShape = /^(https?):\/\/([^\s/?#]+)([^\s?#]*)(?:\?([^\s#]*))?/i;
const magicAssignment = /([A-Za-z_$][\w$]*)\s*[:=]\s*(\d{3,})/g;
const configOfRecord = { file: /^environment(\.[\w-]+)?\.ts$/i, directory: /\/environments?\//i, declaration: /\.d\.ts$/i };
const secretShapes = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private-key-block'],
  [/AKIA[0-9A-Z]{16}/, 'aws-access-key-id'],
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\./, 'jwt-token'],
  [/(?:User\s*ID|Uid)\s*=[^;]*;\s*(?:Password|Pwd)\s*=/i, 'connection-string-credentials'],
  [/AccountKey\s*=\s*[A-Za-z0-9+/=]{20,}/i, 'storage-account-key'],
  [/(?:api[_-]?key|apikey|client[_-]?secret|access[_-]?key)\s*[=:]\s*["']?[A-Za-z0-9+/_-]{8,}/i, 'key-assignment'],
  [/(?:password|pwd|passwd|secret|token)\s*[=:]\s*["']?[A-Za-z0-9+/_-]{8,}/i, 'credential-assignment'],
  [/Bearer\s+[A-Za-z0-9._-]{12,}/i, 'bearer-token']
];
const secretText = /(?:Bearer\s+[A-Za-z0-9._-]{12,}|AKIA[A-Z0-9]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:password|secret|token)\s*[=:]\s*["']?[A-Za-z0-9+/_-]{8,})/gi;

// Belt and braces: no emitted text may carry a value that a report or ledger validator rejects.
const scrub = value => String(value ?? '').replace(secretText, '<masked>');

function literals(text, language) {
  const sql = language === 'sql', found = [];
  let index = 0;
  while (index < text.length) {
    if (commentAt(text, index, sql)) index = text[index + 1] === '*' ? blockEnd(text, index) : lineEnd(text, index);
    else {
      const start = literalStart(text, index, sql);
      if (start === -1) index++;
      else { const literal = readLiteral(text, start, sql); if (literal.value.length >= 2) found.push({ index: start, value: literal.value }); index = Math.max(literal.end, index + 1); }
    }
  }
  return found;
}
// Comments and literal bodies are blanked with their length and newlines preserved, so a value
// pattern can never match inside a comment or a string.
function maskCode(text, language) {
  const sql = language === 'sql';
  let out = '', index = 0;
  while (index < text.length) {
    if (commentAt(text, index, sql)) { const end = text[index + 1] === '*' ? blockEnd(text, index) : lineEnd(text, index); out += blank(text.slice(index, end)); index = end; }
    else {
      const start = literalStart(text, index, sql);
      if (start === -1) { out += text[index]; index++; }
      else { const end = readLiteral(text, start, sql).end; out += blank(text.slice(index, end)); index = end; }
    }
  }
  return out;
}
function urlParts(value) {
  const match = urlShape.exec(value.trim());
  if (!match) return null;
  const userinfo = match[2].includes('@'), authority = userinfo ? match[2].split('@').pop() : match[2], port = authority.match(/:(\d+)$/);
  return { scheme: match[1].toLowerCase(), host: authority.replace(/:\d+$/, '').toLowerCase(), port: port ? port[1] : null, path: match[3] || '', query: match[4] || '', userinfo };
}
const maskUrl = url => `${url.scheme}://${url.host}${url.port ? ':' + url.port : ''}${url.path}${url.query ? '?<query-masked>' : ''}${url.userinfo ? ' (userinfo removed)' : ''}`;
const maskValue = value => value.length <= 48 ? value : value.slice(0, 45) + '...';

function secretShape(value) {
  for (const [pattern, shape] of secretShapes) if (pattern.test(value)) return shape;
  return null;
}
// Placeholder hosts, schema namespaces and loopback addresses are not deployment endpoints.
function urlClass(host) {
  if (host.includes('${') || schemaHost.test(host) || devHost.test(host)) return null;
  if (mapHost.test(host)) return 'HC-PROXYBYPASS';
  return envHost.test(host) ? 'HC-ENVURL' : 'HC-EXTURL';
}
function sqlClass(value) {
  const trimmed = value.trim();
  return sqlObjectName.test(trimmed) ? { class: 'HC-SQL', mask: maskValue(trimmed) } : null;
}
function configClass(value, lane) {
  const trimmed = value.trim();
  return lane.startsWith('be') && value.length >= 8 && environmentName.test(trimmed) ? { class: 'HC-CONFIG', mask: trimmed } : null;
}
function classify(value, lane) {
  const shape = secretShape(value);
  if (shape) return { class: 'HC-SECRET', mask: `<masked:${shape}>` };
  const url = urlParts(value);
  if (url) {
    const id = urlClass(url.host);
    if (!id) return null;
    // The URL classes are bound to the frontend/backend lanes; a host or link literal inside SQL is
    // reported through the SQL class, whose guidance covers host/link/database-name literals.
    return { class: lane.startsWith('sql') ? 'HC-SQL' : id, mask: maskUrl(url) };
  }
  return lane.startsWith('sql') ? sqlClass(value) : configClass(value, lane);
}

// The same normalized value in the same file is one stable subject, so a recorded decision
// survives line moves, unrelated edits and re-scans.
const subjectOf = (classId, fingerprint, file) => hash(`${classId}|${fingerprint}|${file.path}`);
function observationOf(context, index, fingerprint) {
  const { text, entry, mask, file } = context;
  return {
    line: text.slice(0, index).split('\n').length, column: index - text.lastIndexOf('\n', index - 1),
    anchor: `${entry.class}:${fingerprint.slice(0, 16)}`, fingerprint: hash(`${entry.class}:${fingerprint}`),
    observation: scrub(`${entry.title}: ${entry.guidance} Observed value ${mask}.`),
    observationKind: 'text-observation', disposition: entry.disposition, applicability: entry.disposition === 'violation' ? 'applicable' : 'unknown',
    actualEvidenceLevel: 'text',
    hardcode: { class: entry.class, tier: entry.tier, severity: entry.severity, valueMask: scrub(mask), subjectKey: subjectOf(entry.class, fingerprint, file) }
  };
}
function matchedEntry(lanes, value, lane) {
  const classification = classify(value, lane);
  return classification ? { entry: lanes.find(candidate => candidate.class === classification.class), mask: classification.mask } : null;
}
function literalObservations(context) {
  const { text, rule, lanes, language } = context, results = [];
  for (const literal of literals(text, language)) {
    const match = matchedEntry(lanes, literal.value, rule.lane);
    if (match?.entry) results.push(observationOf({ ...context, entry: match.entry, mask: match.mask }, literal.index, hash(literal.value.trim())));
  }
  return results;
}
function magicObservations(context) {
  const entry = context.lanes.find(candidate => candidate.class === 'HC-MAGIC'), results = [];
  if (!entry) return results;
  for (const match of maskCode(context.text, context.language).matchAll(magicAssignment)) {
    if (timingName.test(match[1]) || !limitName.test(match[1])) continue;
    results.push(observationOf({ ...context, entry, mask: `${match[1]} = ${match[2]}` }, match.index + match[0].indexOf(match[2]), hash(`${match[1]}:${match[2]}`)));
  }
  return results;
}
// Configuration-of-record files are where these values belong; they are not findings.
const isConfigOfRecord = filePath => configOfRecord.file.test(path.posix.basename(filePath)) || configOfRecord.directory.test('/' + filePath) || configOfRecord.declaration.test(path.posix.basename(filePath));

export function hardcodeObservations(text, rule, file) {
  const lanes = hardcodeClassesFor(rule.lane, rule.hardcodeTier);
  if (!lanes.length || isConfigOfRecord(file.path)) return [];
  const language = rule.lane.startsWith('sql') ? 'sql' : file.path.endsWith('.cs') ? 'cs' : 'ts';
  const context = { text, rule, file, lanes, language };
  return [...literalObservations(context), ...magicObservations(context)];
}
