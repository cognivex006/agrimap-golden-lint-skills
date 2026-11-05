import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, lstatSync, rmSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { sourceRequirements, hash, canonical, packageRoot } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
// Env overrides win; otherwise use the pinned devDependency and the dotnet host on PATH.
const localParser = path.resolve(packageRoot, 'node_modules/typescript/lib/typescript.js');
const pathDotnet = () => {
  const name = process.platform === 'win32' ? 'dotnet.exe' : 'dotnet';
  return (process.env.PATH || '').split(path.delimiter).filter(Boolean).map(dir => path.join(dir, name)).find(existsSync);
};
export const parserPath = process.env.AGM_LINT_TYPESCRIPT || (existsSync(localParser) ? localParser : undefined);
export const dotnetPath = process.env.AGM_LINT_DOTNET || pathDotnet();
// Any release works; the fixture copies whatever Golden checkout sits beside this repository.
export const GOLDEN_VERSION = '1.0.0';
export function fixture(t, content = {}) {
  const home = mkdtempSync(path.join(os.tmpdir(), 'agm-lint-test-'));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const root = path.join(home, 'product'), golden = path.join(home, 'golden'), output = path.join(home, 'output');
  for (const dir of [root, golden, output]) mkdirSync(dir);
  writeFileSync(path.join(golden, 'package.json'), JSON.stringify({ name: sourceRequirements.packageName, version: GOLDEN_VERSION }));
  const upstream = process.env.AGM_LINT_GOLDEN || path.resolve(packageRoot, '../agrimap-agent-skills');
  for (const file of sourceRequirements.files) {
    const rel = 'skills/agrimap-agent-skills/' + file;
    mkdirSync(path.dirname(path.join(golden, rel)), { recursive: true });
    copyFileSync(path.join(upstream, rel), path.join(golden, rel));
  }
  const put = (rel, text) => { mkdirSync(path.dirname(path.join(root, rel)), { recursive: true }); writeFileSync(path.join(root, rel), text); };
  for (const [rel, text] of Object.entries(content)) put(rel, text);
  return { home, root, golden, output, put, args: { root, golden, sourceMode: 'installed', typescript: parserPath, dotnet: dotnetPath } };
}
export function treeDigest(root) {
  const rows = [];
  function walk(dir) {
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name), st = lstatSync(full), rel = path.relative(root, full);
      if (st.isSymbolicLink()) rows.push([rel, 'link']);
      else if (st.isDirectory()) { rows.push([rel, 'directory']); walk(full); }
      else rows.push([rel, hash(readFileSync(full))]);
    }
  }
  walk(root); return hash(canonical(rows));
}
export const fe = 'apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts';
export const store = 'apps/web/agmwa-fixture-ng/src/app/domain/demo/demo.store.ts';
export const cs = 'services/agmws-fixture-netcore/Src/Domain/Entities/Demo.cs';
export const sql = 'services/agmws-fixture-netcore/sql/DEMO/procedure/DEMO_Q.sql';
