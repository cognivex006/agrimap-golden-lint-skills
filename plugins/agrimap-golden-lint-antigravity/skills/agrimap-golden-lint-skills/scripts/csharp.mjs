import { readFileSync, readdirSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { packageRoot, json, hash, digest, within } from './contracts.mjs';

const base = path.join(packageRoot, 'skills/agrimap-golden-lint-skills');
const parserLock = () => json(path.join(base, 'assets/csharp-parser-lock.json'));
export function verifyCSharpBundle(directory = path.join(base, 'runtime/csharp')) {
  const lock = parserLock(), actual = [];
  function walk(folder, prefix = '') {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const relative = prefix + entry.name, full = path.join(folder, entry.name);
      if (entry.isSymbolicLink() || !within(directory, realpathSync(full))) throw new Error('CSHARP_BUNDLE_UNTRUSTED');
      if (entry.isDirectory()) walk(full, relative + '/'); else actual.push(relative);
    }
  }
  walk(directory);
  if (actual.length !== Object.keys(lock.files).length || actual.some(file => !lock.files[file] || hash(readFileSync(path.join(directory, file))) !== lock.files[file])) throw new Error('CSHARP_BUNDLE_UNTRUSTED');
  return lock;
}

const messages = {
  'member-case': 'ชื่อ method/property/event/enum member ไม่ตรง PascalCase; ไม่รวม override และ explicit interface implementations ตรวจ public/deployed compatibility ก่อน rename',
  'async-suffix': 'Method คืน runtime Task ที่ resolve แล้วแต่ไม่มี Async suffix; ตรวจ interface/callers และ legacy compatibility ก่อน rename',
  'namespace-declaration': 'Parsed namespace declaration differs from the fixed namespace/file-scoped contract. Review profile, compatibility and owner exceptions.',
  'namespace-reference': 'Parsed using references an internal namespace outside the fixed allowlist. A reference is not proof of a declaration violation.',
  'namespace-missing': 'Parsed type occurs outside a namespace. Review the fixed/file-scoped contract and any proven host-entry exception before moving it.',
  'using-after-namespace': 'Using directive is declared after the namespace, inside its scope (NS-01). Move required imports above the namespace; check that moving it out of the namespace scope does not change name resolution.',
  'section-spacing': 'Using block, file-scoped namespace and first type are not separated by exactly one blank line (NS-01). Formatting only; keep header comments and directives where they are.',
  'block-namespace': 'Library namespace uses a block declaration instead of `namespace Name;` (NS-01). Keep the published namespace name and type identity; report a language-version blocker rather than changing project settings.',
  'multiple-public-types': 'More than one explicit public type declaration occurs in this file, including nested declarations. Review published/nested contracts before splitting.',
  'type-case': 'Parsed type name differs from the uppercase-initial, no-underscore PascalCase shape. Confirm naming scope and published compatibility.',
  'interface-prefix': 'Parsed interface name does not use I followed by an uppercase character. Check public consumers before renaming.',
  'role-suffix': 'Public top-level type name differs from the role suffix implied by its selected DTO/use-case/repository folder. Resolve actual responsibility before renaming.',
  'repository-placement': 'Repository-named public declaration is outside its prescribed Persistence Interfaces/Repositories folder. Preserve legacy/public ownership until reviewed.',
  'dependency-field': 'Private readonly field assigned from a constructor parameter does not follow _camelCase. This check does not classify all readonly fields as dependencies.',
  'nullable-suppression': 'Parsed null-forgiving operator conflicts with NULL-02. Resolve the null contract rather than mechanically replacing it.',
  'null-equality': 'Parsed equality comparison against null differs from NULL-03 pattern-check guidance. Operator overloads and behavior must be reviewed before changing it.',
  'empty-catch': 'Parsed catch block has no statements. ERR-04 requires a proven error path or an explained compatibility catch with appropriate logging.',
  'task-result': 'Result access resolves to a trusted runtime Task/ValueTask type. Review blocking, ordering and caller contracts before replacing it.',
  'task-wait': 'Wait/WaitAll/WaitAny call resolves to a trusted runtime Task type. Review the complete async path before changing it.',
  'awaiter-get-result': 'GetResult resolves to a trusted runtime Task/ValueTask awaiter. Confirm the surrounding async and compatibility contract.',
  'branch-limit': 'Function scope has more than 7 if/else-if statements, counting nested ones; a bare else, local functions and lambdas are counted separately. This is the QUALITY-01 team limit, not a SonarQube S3776 Cognitive Complexity score.',
  'parameter-limit': 'Method, constructor or local function declares more than 7 parameters (QUALITY-02, aligned with S107). Overrides, explicit interface implementations and extern declarations are not reported. Review public callers and DI before changing the signature.',
  'nested-ternary': 'Conditional expression is nested inside another conditional expression, including inside an anonymous-object member (QUALITY-03, aligned with S3358). Preserve lazy evaluation, ordering, exact strings and response shape when extracting it.',
  'overload-adjacency': 'Methods with this name are not declared next to each other in the type (ADV-01, aligned with S4136). Advisory: recommend moving the overloads together, simplest first; edit only when the requester asks.',
  'dispose-suppress-finalize': 'IDisposable.Dispose() of an unsealed class, or a class with a finalizer, does not call GC.SuppressFinalize (ADV-07, aligned with CA1816). Advisory: recommend the call or sealing the class; edit only when the requester asks.',
  'unused-local': 'Local variable is never referenced again in its block (ADV-05, aligned with S1481). Advisory: recommend removing it while keeping any side-effecting initializer as a discard; edit only when the requester asks.',
  'caller-info-argument': 'Runtime guard receives an explicit paramName that CallerArgumentExpression would supply (ADV-04, aligned with S3236). Advisory: removing a different literal changes ParamName/message; edit only when the requester asks.',
  'fake-async': 'Awaited FromResult resolves to the trusted runtime Task factory. Inspect all branches and public signatures before simplifying async.'
};

export function readCSharp({ dotnet, root, goldenRoot, files }) {
  if (!dotnet) return { state: 'missing-host', identity: null, files: new Map() };
  let lock, host, directory;
  try {
    if (!path.isAbsolute(dotnet)) throw new Error('HOST_PATH');
    host = realpathSync(dotnet);
    if (!lstatSync(host).isFile() || !/^dotnet(?:\.exe)?$/i.test(path.basename(host)) || [root, goldenRoot].some(folder => within(folder, host))) throw new Error('HOST_PATH');
    directory = realpathSync(path.join(base, 'runtime/csharp'));
    lock = verifyCSharpBundle(directory);
  } catch { return { state: 'untrusted-runtime-or-host', identity: null, files: new Map() }; }
  const input = JSON.stringify(files);
  if (Buffer.byteLength(input) > 64 * 1024 * 1024) return { state: 'input-too-large', identity: null, files: new Map() };
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(DOTNET_|COMPlus_|CORECLR_|COR_|LD_PRELOAD$|LD_LIBRARY_PATH$|DYLD_)/i.test(key)));
  Object.assign(env, { DOTNET_CLI_TELEMETRY_OPTOUT: '1', DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1', DOTNET_NOLOGO: '1', DOTNET_EnableDiagnostics: '0' });
  try {
    const result = JSON.parse(execFileSync(host, [path.join(directory, lock.entry)], { input, encoding: 'utf8', cwd: directory, env, windowsHide: true, timeout: 30000, maxBuffer: 64 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }));
    if (result.protocolVersion !== lock.protocolVersion || result.roslynVersion !== lock.roslynVersion || result.files.length !== files.length) throw new Error('READER_IDENTITY');
    const paths = new Set(files.map(file => file.path)), results = new Map();
    for (const file of result.files) {
      if (!paths.has(file.path) || results.has(file.path) || !['evaluated', 'blocked', 'error'].includes(file.status)) throw new Error('READER_RESULT');
      results.set(file.path, { ...file, observations: file.observations.map(observation => {
        if (!messages[observation.case] || !/^[a-f0-9]{64}$/.test(observation.anchor) || !/^[a-f0-9]{64}$/.test(observation.fingerprint) || !Number.isInteger(observation.line) || observation.line < 1 || !Number.isInteger(observation.column) || observation.column < 1) throw new Error('READER_OBSERVATION');
        return { ...observation, observation: messages[observation.case], actualEvidenceLevel: observation.evidence,
          disposition: 'review-candidate', applicability: 'unknown',
          observationKind: observation.case === 'namespace-missing' ? 'namespace-declaration' : observation.case.startsWith('namespace-') ? observation.case : observation.evidence === 'semantic' ? 'semantic-observation' : 'syntax-observation',
          symbolResolution: { status: observation.evidence === 'semantic' ? 'resolved-runtime-task-symbol' : 'not-requested', declarations: [] } };
      }) });
    }
    return { state: 'available', identity: { roslynVersion: lock.roslynVersion, bundleDigest: digest(lock.files), hostDigest: hash(readFileSync(host)), frameworkFiles: result.frameworkFiles }, files: results };
  } catch { return { state: 'unavailable', identity: null, files: new Map() }; }
}
