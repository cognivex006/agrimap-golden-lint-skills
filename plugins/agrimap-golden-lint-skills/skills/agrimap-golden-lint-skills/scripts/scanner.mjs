import { readdirSync, readFileSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { bindings, catalog, lock, parserLock, hash, digest, json, safeRead, classify, slash, within, validateReport, packageRoot } from './contracts.mjs';

const require = createRequire(import.meta.url);
const forbiddenDirs = new Set(['.git', 'node_modules', 'bin', 'obj', 'dist', '.agrimap-agent']);
const cmp = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const runtimeIdentity = () => digest(Object.fromEntries(['scanner.mjs', 'contracts.mjs', 'schema.mjs'].map(file => [file, hash(readFileSync(path.join(packageRoot, 'skills/agrimap-golden-lint-skills/scripts', file)))])));
function git(root, args) {
  try { return execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-c', 'core.untrackedCache=false', '-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true }).trim(); }
  catch { return null; }
}
function rootPrefix(root) {
  const name = path.basename(root);
  if (/^agmwa-/.test(name)) return `apps/web/${name}/`;
  if (/^agmws-/.test(name)) return `services/${name}/`;
  if (/^agmbo-/.test(name)) return `jobs/${name}/`;
  if (name === 'agrimap-platform' && /libraries[\\/]angular/i.test(root)) return 'standards/libraries/angular/agrimap-platform/';
  if (name === 'AgriMap.Platform' && /libraries[\\/]netcore/i.test(root)) return /AgriMap\.Platform[\\/]AgriMap\.Platform$/.test(root) ? 'standards/libraries/netcore/AgriMap.Platform/AgriMap.Platform/' : 'standards/libraries/netcore/AgriMap.Platform/';
  return '';
}
export function inventory(root) {
  const files = [], prefix = rootPrefix(root);
  function walk(dir, relative = '') {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => cmp(a.name, b.name))) {
      const rel = slash(path.join(relative, entry.name));
      if (/[\x00-\x1f\x7f]/.test(rel)) throw new Error('UNSAFE_FILENAME');
      const file = path.join(dir, entry.name);
      if (entry.isSymbolicLink() || !within(root, realpathSync(file))) {
        files.push({ path: rel, selected: false, reason: 'path-indirection', digest: null });
      } else if (entry.isDirectory()) {
        if (forbiddenDirs.has(entry.name.toLowerCase()) || (prefix + rel).toLowerCase() === 'infra/database') {
          files.push({ path: rel + '/', selected: false, reason: 'excluded-subtree', digest: null });
        } else walk(file, rel);
      } else if (entry.isFile()) {
        const kind = classify(prefix + rel);
        const bytes = kind.selected ? safeRead(root, rel) : null;
        files.push({ path: rel, ...kind, digest: bytes ? hash(bytes) : null });
      }
    }
  }
  walk(root);
  return files;
}

function gitSnapshot(root, ref) {
  if (typeof ref !== 'string' || ref.startsWith('-') || /[\x00-\x20]/.test(ref)) throw new Error('INVALID_GIT_REF');
  const commit = git(root, ['rev-parse', '--verify', '--end-of-options', `${ref}^{commit}`]);
  if (!commit || !/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('GIT_SNAPSHOT_UNAVAILABLE');
  const gitRoot = git(root, ['rev-parse', '--show-toplevel']);
  if (!gitRoot) throw new Error('GIT_SNAPSHOT_UNAVAILABLE');
  const subpath = slash(path.relative(gitRoot, root));
  const scope = subpath ? subpath + '/' : '';
  const tree = git(root, ['rev-parse', `${commit}^{tree}`]);
  const entries = execFileSync('git', ['--no-optional-locks', '-c', 'core.fsmonitor=false', '-C', gitRoot, 'ls-tree', '-r', '-z', commit, '--', scope || '.'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true }).split('\0').filter(Boolean);
  const files = [], contents = new Map(), excludedSubtrees = new Set();
  for (const entry of entries) {
    const match = /^(\d+) (\w+) ([a-f0-9]+)\t([\s\S]+)$/.exec(entry);
    if (!match || !match[4].startsWith(scope)) throw new Error('GIT_TREE_INVALID');
    const relative = match[4].slice(scope.length);
    if (/[\x00-\x1f\x7f]/.test(relative)) throw new Error('UNSAFE_FILENAME');
    const parts = relative.split('/');
    const forbidden = parts.findIndex(p => forbiddenDirs.has(p.toLowerCase()));
    if (forbidden >= 0 || (rootPrefix(root) + relative).toLowerCase().startsWith('infra/database/')) {
      const boundary = forbidden >= 0 ? parts.slice(0, forbidden + 1).join('/') + '/' : 'infra/database/';
      if (!excludedSubtrees.has(boundary)) files.push({ path: boundary, selected: false, reason: 'excluded-subtree', digest: null });
      excludedSubtrees.add(boundary); continue;
    }
    if (match[1] === '120000' || match[2] !== 'blob') { files.push({ path: relative, selected: false, reason: 'path-indirection', digest: null }); continue; }
    const kind = classify(rootPrefix(root) + relative);
    const bytes = kind.selected ? execFileSync('git', ['--no-optional-locks', '-C', gitRoot, 'cat-file', 'blob', match[3]], { maxBuffer: 16 * 1024 * 1024, windowsHide: true }) : null;
    if (bytes) contents.set(relative, bytes);
    files.push({ path: relative, ...kind, digest: bytes ? hash(bytes) : null });
  }
  files.sort((a, b) => cmp(a.path, b.path));
  return { files, contents, commit, tree };
}

export function sourceHandshake(root, mode) {
  if (!['checkout', 'installed'].includes(mode)) throw new Error('INVALID_SOURCE_MODE');
  const verified = {}, actual = {}, diagnostics = [];
  for (const [file, expected] of Object.entries(lock.files)) {
    try { actual[file] = hash(safeRead(root, 'skills/agrimap-agent-skills/' + file)); verified[file] = actual[file] === expected; }
    catch { actual[file] = null; verified[file] = false; }
    if (!verified[file]) diagnostics.push(`SOURCE_MISSING_OR_DRIFT:${file}`);
  }
  let version = null, name = null;
  try { const pkg = JSON.parse(safeRead(root, 'package.json')); version = pkg.version; name = pkg.name; } catch {}
  const identityOk = version === lock.expectedVersion && name === lock.packageName;
  const commit = mode === 'checkout' ? git(root, ['rev-parse', 'HEAD']) : null;
  const tree = mode === 'checkout' ? git(root, ['rev-parse', 'HEAD^{tree}']) : null;
  if (!identityOk) diagnostics.push('SOURCE_PACKAGE_IDENTITY_MISMATCH');
  if (mode === 'checkout' && (!commit || !tree)) diagnostics.push('SOURCE_CHECKOUT_IDENTITY_MISSING');
  const sourceOk = identityOk && (mode !== 'checkout' || Boolean(commit && tree));
  let collectionStatuses = {};
  if (verified['references/patterns/golden/manifest.json']) collectionStatuses = Object.fromEntries(Object.entries(JSON.parse(safeRead(root, 'skills/agrimap-agent-skills/references/patterns/golden/manifest.json')).collections).map(([name, value]) => [name, value.status]));
  return { verified, sourceOk, collectionStatuses, diagnostics, provenance: {
    mode, expectedVersion: lock.expectedVersion, packageName: name === lock.packageName ? name : null, activeVersion: typeof version === 'string' && /^\d+\.\d+\.\d+$/.test(version) ? version : null, observedPackageIdentityDigest: digest({ name, version }),
    expectedReferenceCommit: lock.referenceCommit, activeCommit: commit, activeTree: tree,
    selectedContentIdentity: digest(actual), files: actual,
    dirty: mode === 'checkout' ? Boolean(git(root, ['status', '--porcelain', '--untracked-files=no'])) : null,
    installedCompared: false
  } };
}
function authority(rule, source) {
  return { goldenRuleId: rule.goldenRuleId, entry: rule.entry, collection: rule.collection, tier: rule.tier,
    sourceStatus: rule.sourceStatus, sourceStatusBasis: rule.sourceStatusBasis || 'collection-manifest', collectionSourceStatus: source.collectionStatuses[rule.collection] || null,
    packageName: source.provenance.packageName, version: source.provenance.activeVersion,
    revision: source.provenance.activeCommit, entryDigest: source.provenance.files[rule.entry],
    rootManifestDigest: source.provenance.files['references/patterns/golden/manifest.json'],
    collectionManifestDigest: source.provenance.files[`references/patterns/golden/${rule.collection}/manifest.json`],
    conflictResolutionDigest: source.provenance.files['references/patterns/conflict-resolution.md'],
    sourceDependencies: Object.fromEntries(sourceDependencies(rule).map(file => [file, source.provenance.files[file] ?? null])),
    ownerEvidence: [], exceptionEvidence: [] };
}
export function sourceDependencies(rule) {
  return [...new Set([rule.entry, 'references/patterns/conflict-resolution.md',
    'references/patterns/pattern-status.md', 'references/patterns/checklists/README.md',
    'references/patterns/golden/manifest.json', `references/patterns/golden/${rule.collection}/manifest.json`,
    `references/patterns/checklists/${rule.collection}.md`, ...(rule.sourceDependencies || [])])].sort(cmp);
}
function sourceReady(rule, source) {
  return source.sourceOk && sourceDependencies(rule).every(f => source.verified[f]);
}
function parser(modulePath) {
  if (!modulePath) return { ts: null, state: 'missing', identity: null };
  try {
    const entry = realpathSync(modulePath);
    if (hash(readFileSync(entry)) !== parserLock.sha256) return { ts: null, state: 'untrusted-content', identity: null };
    const ts = require(entry);
    if (ts.version !== parserLock.version) throw new Error('PARSER_VERSION');
    return { ts, state: 'available', identity: { name: parserLock.name, version: ts.version, digest: parserLock.sha256 } };
  } catch { return { ts: null, state: 'unavailable', identity: null }; }
}
function applies(rule, file) {
  if (rule.lane !== file.lane) return false;
  if (rule.detectorId === 'fe-store-await') return /\/domain\/.+\.store\.ts$/.test('/' + file.path);
  if (rule.detectorId === 'fe-component-dependency') return /\/(features|shared)\/.+\.component\.ts$/.test('/' + file.path);
  if (rule.detectorId === 'fe-library-public-surface') return /\/public-api\.ts$/.test('/' + file.path);
  return true;
}
function normalizeTokens(ts, text) {
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, text);
  const tokens = [];
  for (let k = scanner.scan(); k !== ts.SyntaxKind.EndOfFileToken; k = scanner.scan()) tokens.push(`${k}:${scanner.getTokenText()}`);
  return tokens.join('|');
}
function tsObservations(ts, sf, rule, checker) {
  const results = [];
  function push(node, observation, disposition = 'violation', applicability = 'applicable') {
    let parent = node, anchor = [];
    while (parent && parent !== sf) {
      if (parent.name && (ts.isIdentifier(parent.name) || ts.isStringLiteral(parent.name))) anchor.unshift(parent.name.text);
      parent = parent.parent;
    }
    const pos = sf.getLineAndCharacterOfPosition(node.getStart(sf));
    let symbolResolution = { status: 'not-requested', declarations: [] };
    if (checker && ts.isCallExpression(node) && node.arguments[0]) {
      try {
        let symbol = checker.getSymbolAtLocation(node.arguments[0]);
        if (symbol && symbol.flags & ts.SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
        const declarations = (symbol?.declarations || []).map(d => ({ path: d.getSourceFile().fileName.replace(/^\/virtual\//, ''), kind: ts.SyntaxKind[d.kind] }));
        symbolResolution = { status: declarations.length ? 'resolved-local-declaration' : 'unresolved', declarations };
      } catch { symbolResolution = { status: 'unresolved', declarations: [] }; }
    }
    results.push({ line: pos.line + 1, column: pos.character + 1, anchor: anchor.join('.') || 'module', fingerprint: hash(normalizeTokens(ts, node.getText(sf))), observation, disposition, applicability, actualEvidenceLevel: 'syntax', symbolResolution });
  }
  function visit(node) {
    if (rule.detectorId === 'fe-explicit-any' && node.kind === ts.SyntaxKind.AnyKeyword) push(node, 'Explicit any type token conflicts with T6. Inspect actual values and narrowing before replacing it.');
    if (rule.detectorId === 'fe-non-null' && (ts.isNonNullExpression(node) || (ts.isPropertyDeclaration(node) && node.exclamationToken))) {
      if (ts.isPropertyDeclaration(node) && ts.getDecorators(node)?.length) {
        // A decorator name alone cannot resolve Angular identity or a shadowed ViewChild.
        push(node, 'Definite assignment assertion with a decorator. Resolve Angular ViewChild and static:true exception before asserting a conflict.', 'review-candidate', 'unknown');
      } else push(node, 'Non-null assertion conflicts with T6; null-path and consumer behavior remain unproven.');
    }
    if (rule.detectorId === 'fe-store-await' && (ts.isAwaitExpression(node) || ts.getModifiers(node)?.some(m => m.kind === ts.SyntaxKind.AsyncKeyword))) push(node, 'Async syntax in a domain store path. Confirm this declaration owns store state and assess ordering before moving orchestration.', 'review-candidate', 'unknown');
    if (rule.detectorId === 'fe-store-await' && ts.isCallExpression(node)) {
      const name = ts.isIdentifier(node.expression) ? node.expression.text : ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : '';
      const aliases = sf.statements.filter(ts.isImportDeclaration).flatMap(s => {
        const b = s.importClause?.namedBindings;
        return b && ts.isNamedImports(b) ? b.elements.filter(e => ['inject', 'firstValueFrom', 'effect'].includes((e.propertyName || e.name).text)).map(e => e.name.text) : [];
      });
      if (['inject', 'firstValueFrom', 'subscribe', 'effect'].includes(name) || aliases.includes(name)) push(node, 'Injection/async/subscription/effect-shaped call in a domain store path. Resolve actual symbols and approved state ownership before asserting R3.', 'review-candidate', 'unknown');
    }
    if (rule.detectorId === 'fe-component-dependency' && ts.isCallExpression(node)) {
      const imports = sf.statements.filter(ts.isImportDeclaration).flatMap(s => {
        const b = s.importClause?.namedBindings;
        return b && ts.isNamedImports(b) ? b.elements.filter(e => (e.propertyName || e.name).text === 'inject').map(e => e.name.text) : [];
      });
      const isInjectName = ts.isIdentifier(node.expression) && (node.expression.text === 'inject' || imports.includes(node.expression.text));
      if (isInjectName && node.arguments.length) push(node, 'Component injection-shaped call. Resolve imported aliases, token identity, Store/API ownership and facade exceptions; syntax alone does not prove R1.', 'review-candidate', 'unknown');
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return results;
}
// Conservative lexical observations only: strings/comments are removed, never architecture proof.
export function maskLexical(text, language) {
  const pattern = language === 'sql'
    ? /--[^\r\n]*|\/\*[\s\S]*?\*\/|'(?:''|[^'])*'/g
    : /\/\/[^\r\n]*|\/\*[\s\S]*?\*\/|"""[\s\S]*?"""|@"(?:""|[^"])*"|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g;
  return text.replace(pattern, match => match.replace(/[^\r\n]/g, ' '));
}
function lexicalObservations(text, rule, file) {
  const results = [], masked = maskLexical(text, rule.lane.startsWith('sql') ? 'sql' : 'cs');
  if (rule.detectorId === 'be-namespace-observation') {
    const allowed = ['Application', 'Application.Interfaces', 'Application.UseCases', 'Domain.Constants', 'Domain.Entities', 'Domain.ValueObjects', 'Infrastructure', 'Infrastructure.ExternalService', 'Infrastructure.Persistence.Interfaces', 'Infrastructure.Persistence.Models', 'Infrastructure.Persistence.Repositories', 'Presentation.Config', 'Presentation.Controllers', 'Presentation.DTOs.Requests', 'Presentation.DTOs.Responses', 'Presentation.Filters', 'Presentation.Middlewares', 'Presentation.Mockup', 'Presentation.Models', 'Shared.Extensions', 'Shared.Helpers'];
    if (file.profile === 'agmbo') allowed.push('Infrastructure.Jobs');
    const root = file.profile === 'agmbo' ? 'AgriMap.Worker.' : 'AgriMap.Web.Service.';
    for (const match of masked.matchAll(/\bnamespace\s+([A-Za-z_][\w.]*)\s*([;{])/g)) {
      if (!match[1].startsWith(root) || !allowed.includes(match[1].slice(root.length)) || match[2] !== ';') results.push({ index: match.index, anchor: match[1], fingerprint: hash(match[0].replace(/\s+/g, ' ')), observation: 'Namespace-shaped declaration differs from the fixed namespace/file-scoped contract. Confirm conditional compilation, namespace syntax and deployed ownership with a C# parser before declaring a violation.' });
    }
    for (const match of masked.matchAll(/\busing\s+([A-Za-z_][\w.]*)\s*;/g)) {
      if (match[1].startsWith(root) && !allowed.includes(match[1].slice(root.length))) results.push({ index: match.index, anchor: match[1], fingerprint: hash(match[0].replace(/\s+/g, ' ')), observation: 'Using directive references a namespace outside the fixed allowlist. Resolve its actual declaration, conditional compilation and compatibility before proposing a correction; this reference alone is not a proven declaration violation.' });
    }
  }
  if (rule.detectorId === 'sql-procedure-declaration') {
    for (const match of masked.matchAll(/\b(CREATE\s+(?:OR\s+ALTER\s+)?|ALTER\s+)(?:PROCEDURE|PROC)\s+((?:\[[^\]]+\]|[\w]+)(?:\s*\.\s*(?:\[[^\]]+\]|[\w]+))?)/gi)) {
      if (!/^CREATE\s+OR\s+ALTER/i.test(match[1])) results.push({ index: match.index, anchor: match[2].replace(/\s/g, ''), fingerprint: hash(match[0].replace(/\s+/g, ' ').toUpperCase()), observation: 'Standalone procedure declaration candidate. The CREATE OR ALTER rule governs created/edited outputs; current history, deployment role and SQL parsing must establish applicability. No suffix/business semantics are inferred.' });
    }
  }
  return results.map(r => ({ ...r, line: text.slice(0, r.index).split('\n').length, column: r.index - text.lastIndexOf('\n', r.index - 1), disposition: 'review-candidate', applicability: 'unknown', actualEvidenceLevel: 'text' }));
}

export function scan({ root: rootInput, golden, sourceMode, typescript, baseline, baseRef, targetRef, beforeRecheck } = {}) {
  const root = realpathSync(rootInput), goldenRoot = realpathSync(golden);
  if (/(^|\/)infra\/database(\/|$)/i.test(slash(root))) throw new Error('EXCLUDED_DATABASE_ROOT');
  if (!lstatSync(root).isDirectory() || !lstatSync(goldenRoot).isDirectory()) throw new Error('INVALID_ROOT');
  if (baseline && baseRef) throw new Error('BASELINE_INPUT_CONFLICT');
  if (baseRef) baseline = scan({ root, golden: goldenRoot, sourceMode, typescript, targetRef: baseRef });
  const source = sourceHandshake(goldenRoot, sourceMode), parsed = parser(typescript);
  const immutable = targetRef ? gitSnapshot(root, targetRef) : null;
  const files = immutable ? immutable.files : inventory(root), selected = files.filter(f => f.selected);
  const content = file => immutable ? immutable.contents.get(file) : safeRead(root, file);
  const analysisContract = { scannerVersion: json(path.join(packageRoot, 'package.json')).version, runtimeContentDigest: runtimeIdentity(), detectorRevision: 1, classifierRevision: 1, ruleBindingDigest: digest(bindings), catalogDigest: digest(catalog), sourceContentIdentity: source.provenance.selectedContentIdentity, sourceMode, parser: parsed.identity, compilerContext: 'local-relative-import-graph-no-external-framework-or-target-config', exceptions: 'owner-evidence-not-loaded-review-required' };
  const comparisonStatus = baseline ? digest(baseline.analysisContract) === digest(analysisContract) && baseline.scanStatus === 'completed' ? 'comparable' : 'not-comparable' : 'not-requested';
  if (baseline) validateReport(baseline);
  const findings = [], executions = [], parsedFiles = new Map();
  let checker = null;
  if (parsed.ts) {
    const memory = new Map();
    for (const f of selected.filter(f => f.path.endsWith('.ts'))) {
      const sf = parsed.ts.createSourceFile('/virtual/' + f.path, content(f.path).toString('utf8'), parsed.ts.ScriptTarget.Latest, true);
      parsedFiles.set(f.path, sf); memory.set(sf.fileName, sf);
    }
    const host = { getSourceFile: name => memory.get(slash(name)), getDefaultLibFileName: () => '', writeFile: () => { throw new Error('COMPILER_WRITE_FORBIDDEN'); }, getCurrentDirectory: () => '/virtual', getDirectories: () => [], fileExists: name => memory.has(slash(name)), readFile: name => memory.get(slash(name))?.text, getCanonicalFileName: name => name, useCaseSensitiveFileNames: () => true, getNewLine: () => '\n', resolveModuleNames: (names, from) => names.map(name => {
      if (!name.startsWith('.')) return undefined;
      const base = path.posix.resolve(path.posix.dirname(slash(from)), name);
      const found = [base, base + '.ts', base + '/index.ts'].find(p => memory.has(p));
      return found ? { resolvedFileName: found, extension: parsed.ts.Extension.Ts } : undefined;
    }) };
    checker = parsed.ts.createProgram([...memory.keys()], { noLib: true, noEmit: true, target: parsed.ts.ScriptTarget.Latest, module: parsed.ts.ModuleKind.ESNext }, host).getTypeChecker();
  }
  const limitations = ['Only local relative TypeScript imports/re-exports resolve; external framework, tsconfig aliases and C# semantic contexts remain unavailable. Architecture candidates require owner review.', 'No owner exception input is implemented; decorated assertions and legacy/public boundaries remain review candidates.', 'Other catalog families are review-only or not implemented; full catalog automation is not claimed.', 'No-effect and manageability require behavioral/consumer evidence; all remediation assessments start unknown.', 'Excluded subtrees are counted as boundary records, not enumerated files. Working-tree untracked selected files are included; ignored files outside excluded subtrees are also included.', 'Lexical C#/SQL observations are candidates; preprocessor/raw-string/nested-comment edge cases require a real language parser.'];
  for (const rule of bindings) {
    const applicable = selected.filter(f => applies(rule, f));
    const execution = { detectorId: rule.detectorId, implementationStatus: rule.implementationStatus, minimumEvidenceLevel: rule.minimumEvidenceLevel, prerequisites: rule.prerequisites, denominator: applicable.length, evaluated: 0, failed: 0, executionStatus: applicable.length ? 'evaluated' : 'not-applicable', diagnostics: [], authority: authority(rule, source) };
    executions.push(execution);
    if (!applicable.length) continue;
    if (!sourceReady(rule, source)) {
      execution.executionStatus = 'blocked';
      execution.diagnostics.push('SOURCE_AUTHORITY_UNVERIFIED', ...sourceDependencies(rule).filter(f => !source.verified[f]).map(f => `SOURCE_DEPENDENCY_UNVERIFIED:${f}`));
      continue;
    }
    if (rule.minimumEvidenceLevel === 'syntax' && !parsed.ts) { execution.executionStatus = 'blocked'; execution.diagnostics.push(`PARSER_${parsed.state.toUpperCase()}`); continue; }
    for (const file of applicable) {
      let observations = [];
      try {
        const text = content(file.path).toString('utf8');
        if (rule.implementationStatus === 'review-only') observations = [{ line: 1, column: 1, anchor: 'contract-boundary', fingerprint: hash(rule.detectorId), actualEvidenceLevel: 'text', observation: 'Contract boundary located. Obtain public surface, actual consumers, owner approval/exception scope and behavior evidence. This is a review requirement, not a defect.', disposition: 'review-candidate', applicability: 'unknown' }];
        else if (rule.minimumEvidenceLevel === 'syntax') {
          let sf = parsedFiles.get(file.path);
          if (!sf) { sf = parsed.ts.createSourceFile(file.path, text, parsed.ts.ScriptTarget.Latest, true); parsedFiles.set(file.path, sf); }
          if (sf.parseDiagnostics.length) { execution.failed++; execution.executionStatus = 'error'; execution.diagnostics.push(`PARSE_ERROR:${file.path}`); continue; }
          observations = tsObservations(parsed.ts, sf, rule, checker);
        } else observations = lexicalObservations(text, rule, file);
        execution.evaluated++;
        const duplicates = new Map();
        for (const observation of observations) {
          const identity = { detectorId: rule.detectorId, revision: 1, path: file.path, anchor: hash(observation.anchor), evidenceFingerprint: observation.fingerprint };
          const key = digest(identity), occurrence = (duplicates.get(key) || 0) + 1;
          duplicates.set(key, occurrence);
          const findingId = digest({ ...identity, occurrence });
          const prior = comparisonStatus === 'comparable' ? baseline.findings.find(f => f.findingId === findingId) : null;
          const previousFile = comparisonStatus === 'comparable' ? baseline.files.find(f => f.path === file.path && f.selected) : null;
          findings.push({ findingId, detectorId: rule.detectorId, detectorRevision: 1, path: file.path, line: observation.line, column: observation.column, symbolAnchor: identity.anchor, evidenceFingerprint: observation.fingerprint, occurrence,
            targetKind: file.lane, profile: file.profile, actualEvidenceLevel: observation.actualEvidenceLevel, minimumEvidenceLevel: rule.minimumEvidenceLevel, prerequisites: rule.prerequisites, symbolResolution: observation.symbolResolution || { status: 'not-requested', declarations: [] },
            observation: observation.observation, disposition: observation.disposition, applicability: observation.applicability,
            confidence: { level: observation.disposition === 'violation' ? 'high' : 'limited', rationale: observation.disposition === 'violation' ? 'Parsed explicit syntax and pinned applicable source; impact remains unknown.' : 'Observation only; semantic/owner/applicability evidence is incomplete.' },
            authority: authority(rule, source), codeScope: comparisonStatus !== 'comparable' ? 'unknown' : !previousFile ? 'new' : previousFile.digest === file.digest ? 'unchanged' : 'modified',
            changeOrigin: comparisonStatus !== 'comparable' ? 'unknown' : prior ? 'pre-existing' : previousFile && previousFile.digest !== file.digest ? 'unknown' : !previousFile ? 'introduced' : 'unknown',
            comparisonStatus,
            remediation: { proposal: 'Investigate this exact declaration and its callers; propose the smallest owner-reviewed correction only after resolving applicability and compatibility.', impact: 'unknown', manageability: 'unknown', consumers: [], equivalenceEvidence: [], verificationObligations: ['Resolve applicable owner exceptions', 'Identify behavior/public/wire/data consumers', 'Prove observables and null/async/error semantics', 'Define containment and rollback'], ownerDecisionNeeded: true, unresolvedQuestions: ['What is the approved ownership and consumer scope?'] } });
        }
      } catch { execution.failed++; execution.executionStatus = 'error'; execution.diagnostics.push(`FILE_ANALYSIS_ERROR:${file.path}`); }
    }
  }
  beforeRecheck?.();
  let drift = false;
  try { drift = (!immutable && digest(inventory(root)) !== digest(files)) || digest(sourceHandshake(goldenRoot, sourceMode).provenance) !== digest(source.provenance) || runtimeIdentity() !== analysisContract.runtimeContentDigest; } catch { drift = true; }
  if (drift) limitations.push('INPUT_DRIFT: observations are stale relative to the final observed inputs.');
  if (comparisonStatus === 'not-comparable') limitations.push('Baseline analysis contract/health is incompatible; origin remains unknown.');
  const payload = { schemaVersion: 1, analysisContract, provenance: source.provenance, sourceDiagnostics: source.diagnostics,
    snapshot: { mode: immutable ? 'git-immutable' : 'working-tree-including-untracked', contentIdentity: digest(files), inputDrift: drift, commit: immutable?.commit || null, tree: immutable?.tree || null }, comparison: { comparisonStatus, baselineReportId: baseline?.reportId || null, baseSnapshot: baseline?.snapshot || null, removedFindingIds: comparisonStatus === 'comparable' ? baseline.findings.filter(b => !findings.some(f => f.findingId === b.findingId)).map(f => f.findingId).sort(cmp) : [] },
    scanStatus: drift || executions.some(r => ['blocked', 'error'].includes(r.executionStatus)) ? 'partial' : 'completed',
    files, rules: executions, catalog: catalog.map(family => ({ ...family, selectedLaneFiles: selected.filter(f => f.lane === family.lane).length })), findings: findings.sort((a, b) => cmp(a.path, b.path) || cmp(a.detectorId, b.detectorId) || a.line - b.line || cmp(a.findingId, b.findingId)),
    coverage: { discovered: files.length, selected: selected.length, excluded: files.length - selected.length, selectedByLane: Object.fromEntries([...new Set(selected.map(f => f.lane))].sort(cmp).map(l => [l, selected.filter(f => f.lane === l).length])) }, limitations };
  return validateReport({ ...payload, reportId: digest(payload) });
}
