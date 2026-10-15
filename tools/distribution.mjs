import { readdirSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { json, within, packageRoot } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';

export function distributionFiles(root = packageRoot) {
  const files = new Set();
  function walk(file) {
    if (!within(root, path.resolve(file)) || !within(realpathSync(root), realpathSync(file)) || lstatSync(file).isSymbolicLink()) throw new Error('DISTRIBUTION_PATH_UNSAFE');
    if (lstatSync(file).isDirectory()) for (const name of readdirSync(file).sort()) walk(path.join(file, name));
    else {
      const rel = path.relative(root, file).replaceAll('\\', '/');
      if (/(^|\/)(\.agrimap-agent|\.git|tests|tools)(\/|$)/.test(rel) || ['AGENTS.md', 'DEVELOPMENT.md', 'MAINTAINING.md', 'IMPLEMENTATION.md'].includes(path.basename(file))) throw new Error('DISTRIBUTION_PRIVATE_FILE');
      files.add(file);
    }
  }
  for (const rel of json(path.join(root, 'config/distribution.json')).runtime) walk(path.resolve(root, rel));
  return [...files].sort();
}
