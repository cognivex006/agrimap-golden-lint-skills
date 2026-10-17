import { existsSync, realpathSync, mkdirSync, cpSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { packageRoot, json, within } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { sync } from './sync.mjs';

// Hosts that load a self-contained agm-lint skill folder copied into an existing skills directory.
export const portableHosts = ['antigravity-ide', 'cursor', 'agent-skills'];

export function installIde(destination, host = 'antigravity-ide') {
  if (!portableHosts.includes(host)) throw new Error('UNSUPPORTED_PORTABLE_HOST');
  if (!path.isAbsolute(destination) || path.basename(destination) !== 'agm-lint' || existsSync(destination)) throw new Error('NEW_ABSOLUTE_SKILL_DESTINATION_REQUIRED');
  const parent = path.dirname(destination);
  if (!existsSync(parent) || realpathSync(parent) !== path.resolve(parent)) throw new Error('EXISTING_DIRECT_PARENT_REQUIRED');
  const source = path.join(packageRoot, json(path.join(packageRoot, 'config/hosts.json')).portableSkill);
  if (within(source, destination)) throw new Error('INSTALL_DESTINATION_UNSAFE');
  sync(true); // Verify the complete canonical payload before creating any destination.
  // User supplies the exact new skill directory; no profile settings/cache files are edited.
  mkdirSync(destination);
  cpSync(source, destination, { recursive: true, errorOnExist: true, force: false });
  return { installed: true, host, destination };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  if (args.length !== 3 || !portableHosts.includes(args[0]) || args[1] !== '--to') throw new Error('USE_<antigravity-ide|cursor|agent-skills>_--to_<absolute-new-agm-lint-directory>');
  console.log(JSON.stringify(installIde(args[2], args[0])));
}
