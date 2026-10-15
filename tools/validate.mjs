import { readFileSync, readdirSync, lstatSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packageRoot, json, registry, validateReport, bindings, catalog, lock, hash } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { verifyCSharpBundle } from '../skills/agrimap-golden-lint-skills/scripts/csharp.mjs';
import { sourceDependencies } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { sync } from './sync.mjs';
import { distributionFiles } from './distribution.mjs';

const walk = root => readdirSync(root, { withFileTypes: true }).flatMap(e => e.isDirectory() && !['.git', '.agrimap-agent', 'node_modules'].includes(e.name) ? walk(path.join(root, e.name)) : e.isFile() ? [path.join(root, e.name)] : []);
export function runtimeFiles() {
  return distributionFiles();
}
export function checkText(text, filename, allowed) {
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const link = match[1];
    if (/^(https?:|mailto:)/.test(link)) continue;
    const [file, anchor] = link.split('#');
    const resolved = file ? path.resolve(path.dirname(filename), file) : filename;
    if (allowed && !allowed.has(resolved)) throw new Error('PACKAGED_LINK_MISSING');
    let target; try { target = readFileSync(resolved, 'utf8'); } catch { throw new Error('BROKEN_LINK'); }
    if (anchor) {
      const headings = [...target.matchAll(/^#+\s+(.+)$/gm)].map(m => m[1].toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s/g, '-'));
      if (!headings.includes(anchor)) throw new Error('BROKEN_ANCHOR');
    }
  }
  for (const fence of text.matchAll(/```(powershell|bash|sh)\n([\s\S]*?)```/g)) {
    if (/\$agm-lint/.test(fence[2])) throw new Error('CHAT_AS_SHELL');
    for (const line of fence[2].split('\n').filter(l => l.includes('agm-lint.mjs'))) {
      const tokens = line.match(/'[^']*'|"[^"]*"|\S+/g) || [];
      const start = tokens.findIndex(t => t.endsWith('agm-lint.mjs'));
      const name = tokens[start + 1], op = registry.operations[name];
      if (!op) throw new Error('DOC_UNKNOWN_OPERATION');
      const options = tokens.slice(start + 2).filter((_, i) => i % 2 === 0).map(t => t.replace(/^--/, ''));
      if (options.some(o => ![...op.required, ...op.optional].includes(o)) || op.required.some(o => !options.includes(o))) throw new Error('DOC_INVALID_OPTION');
      if (op.sideEffect !== 'stdout' && !/authorized external write/.test(text.slice(Math.max(0, fence.index - 180), fence.index))) throw new Error('UNLABELED_WRITE');
    }
  }
  if (/\b(published plugin available|automatically installed|all Golden rules automated)\b/i.test(text)) throw new Error('FALSE_AVAILABILITY');
  if (/(?:Bearer\s+[A-Za-z0-9._-]{12,}|AKIA[A-Z0-9]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/.test(text)) throw new Error('UNSAFE_EXAMPLE');
}
export function checkChangelog(text) {
  if ((text.match(/^## Unreleased$/gm) || []).length !== 1) throw new Error('CHANGELOG_STRUCTURE');
  const entries = text.split('\n').filter(l => l.startsWith('- '));
  if (new Set(entries).size !== entries.length) throw new Error('CHANGELOG_DUPLICATE');
  if (/^## \[?0\.1\.0\]?.*\d{4}-\d{2}-\d{2}/m.test(text)) throw new Error('UNAUTHORIZED_FINALIZATION');
}
export function checkRuntimeInstruction(text, filename) {
  if (text.includes('<!-- AGM-MAINTAINER-ONLY -->') || ['AGENTS.md', 'DEVELOPMENT.md', 'MAINTAINING.md'].includes(path.basename(filename))) throw new Error('MAINTAINER_LEAKAGE');
}
export function checkPublicGuides(readme, files) {
  for (const file of files.filter(f => /[\\/]docs[\\/].+\.md$/.test(f))) if (!readme.includes(path.basename(file))) throw new Error('ORPHAN_PUBLIC_GUIDE');
}
export function validate() {
  sync(true);
  const reader = verifyCSharpBundle();
  if (!reader.sourceFiles || Object.entries(reader.sourceFiles).some(([file, expected]) => hash(readFileSync(path.join(packageRoot, file))) !== expected)) throw new Error('CSHARP_REBUILD_REQUIRED');
  const sourceFiles = walk(packageRoot);
  const markdown = sourceFiles.filter(f => f.endsWith('.md') && !path.basename(f).includes('PROMPT'));
  for (const file of markdown) checkText(readFileSync(file, 'utf8'), file);
  const runtime = runtimeFiles(), allowed = new Set(runtime);
  for (const file of runtime) {
    if (file.endsWith('.md')) checkText(readFileSync(file, 'utf8'), file, allowed);
    const text = readFileSync(file, 'utf8');
    checkRuntimeInstruction(text, file);
  }
  const readme = readFileSync(path.join(packageRoot, 'README.md'), 'utf8');
  checkPublicGuides(readme, runtime);
  checkChangelog(readFileSync(path.join(packageRoot, 'CHANGELOG.md'), 'utf8'));
  if (new Set(bindings.map(r => r.detectorId)).size !== bindings.length) throw new Error('CAPABILITY_DRIFT');
  if (catalog.some(f => !['automated', 'review-only', 'not-implemented'].includes(f.implementationStatus) || f.detectorIds.some(id => !bindings.some(r => r.detectorId === id)))) throw new Error('CATALOG_DRIFT');
  if (bindings.some(r => !catalog.some(f => f.detectorIds.includes(r.detectorId)))) throw new Error('UNCATALOGED_DETECTOR');
  for (const rule of bindings) {
    if (!Array.isArray(rule.sourceDependencies) || !rule.sourceDependencies.length || sourceDependencies(rule).some(file => !lock.files[file])) throw new Error('UNPINNED_RULE_DEPENDENCY');
  }
  const reportFile = path.join(packageRoot, 'examples/report.json');
  if (sourceFiles.includes(reportFile)) validateReport(json(reportFile));
  return { documents: markdown.length, runtimeFiles: runtime.length };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) console.log(JSON.stringify(validate()));
