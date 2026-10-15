import { existsSync, realpathSync, mkdirSync, cpSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { packageRoot, json, within } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { sync } from './sync.mjs';

export function installIde(destination) {
  if (!path.isAbsolute(destination) || path.basename(destination) !== 'agm-lint' || existsSync(destination)) throw new Error('NEW_ABSOLUTE_SKILL_DESTINATION_REQUIRED');
  const parent = path.dirname(destination);
  if (!existsSync(parent) || realpathSync(parent) !== path.resolve(parent)) throw new Error('EXISTING_DIRECT_PARENT_REQUIRED');
  const source = path.join(packageRoot, json(path.join(packageRoot, 'config/hosts.json')).ideBundle);
  if (within(source, destination)) throw new Error('INSTALL_DESTINATION_UNSAFE');
  sync(true); // Verify the complete canonical payload before creating any destination.
  // User supplies the exact new skill directory; no profile settings/cache files are edited.
  mkdirSync(destination);
  cpSync(source, destination, { recursive: true, errorOnExist: true, force: false });
  return { installed: true, host: 'antigravity-ide', destination };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 3 || args[0] !== 'antigravity-ide' || args[1] !== '--to') throw new Error('USE_ANTIGRAVITY_IDE_TO_DESTINATION');
  console.log(JSON.stringify(installIde(args[2])));
}
