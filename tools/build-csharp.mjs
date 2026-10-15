// Maintainer-only offline build. Never imported or invoked by scan.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { packageRoot, hash, canonical, json } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';

export function buildCSharp(dotnet, roslyn) {
  if (![dotnet, roslyn].every(p => p && path.isAbsolute(p))) throw new Error('EXPLICIT_DOTNET_AND_ROSLYN_REQUIRED');
  const root = path.join(packageRoot, 'skills/agrimap-golden-lint-skills');
  const lockFile = path.join(root, 'assets/csharp-parser-lock.json');
  const previous = json(lockFile);
  for (const file of ['Microsoft.CodeAnalysis.dll', 'Microsoft.CodeAnalysis.CSharp.dll']) {
    if (hash(readFileSync(path.join(roslyn, file))) !== previous.files[file]) throw new Error('ROSLYN_SOURCE_REVIEW_REQUIRED');
  }
  const output = path.join(root, 'runtime/csharp');
  const intermediate = path.join(packageRoot, '.agrimap-agent/runtime/csharp-build') + path.sep;
  mkdirSync(intermediate, { recursive: true });
  execFileSync(dotnet, ['build', path.join(packageRoot, 'tools/csharp-parser/AgriMap.Lint.CSharp.csproj'), '--configfile', path.join(packageRoot, 'tools/csharp-parser/NuGet.Config'),
    `-p:RoslynDir=${roslyn}`, `-p:BaseIntermediateOutputPath=${intermediate}`, '-p:ImportDirectoryBuildProps=false', '-p:ImportDirectoryBuildTargets=false', '-o', output, '--nologo', '-v:q'],
  { cwd: packageRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const identity = JSON.parse(execFileSync(dotnet, [path.join(output, previous.entry)], { input: '[]', encoding: 'utf8', windowsHide: true }));
  if (identity.roslynVersion !== previous.roslynVersion) throw new Error('ROSLYN_VERSION_REVIEW_REQUIRED');
  const files = {};
  function walk(directory, relative = '') {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const name = relative + entry.name, full = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(full, name + '/');
      else {
        // Keep locked text bytes portable across source checkouts; DLL bytes are unchanged.
        if (/\.(json|txt)$/.test(name)) writeFileSync(full, readFileSync(full, 'utf8').replace(/\r\n/g, '\n'), 'utf8');
        files[name] = hash(readFileSync(full));
      }
    }
  }
  walk(output);
  const sourceFiles = Object.fromEntries(['tools/csharp-parser/Reader.cs', 'tools/csharp-parser/AgriMap.Lint.CSharp.csproj', 'tools/csharp-parser/NuGet.Config', 'tools/build-csharp.mjs'].map(file => [file, hash(readFileSync(path.join(packageRoot, file)))]));
  writeFileSync(lockFile, canonical({ ...previous, files, sourceFiles }));
  return { files: Object.keys(files).length, roslynVersion: identity.roslynVersion };
}
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  if (args.length !== 4 || args[0] !== '--dotnet' || args[2] !== '--roslyn') throw new Error('USE_DOTNET_HOST_AND_INSPECTED_ROSLYN_DIRECTORY');
  console.log(JSON.stringify(buildCSharp(args[1], args[3])));
}
