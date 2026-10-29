import test from 'node:test';
import assert from 'node:assert/strict';
import { scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { validateReport } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { fixture } from './helpers.mjs';

const main = 'services/agmws-case/Src/Application/UseCases/DemoUseCase.cs';
const library = 'standards/libraries/netcore/AgriMap.Platform/AgriMap.Platform/Src/Demo/Demo.cs';
const ns = 'AgriMap.Web.Service.Application.UseCases';
const layout = (t, text, file = main) => {
  const report = scan({ ...fixture(t, { [file]: text }).args, dotnet: process.env.AGM_LINT_DOTNET });
  assert.equal(report.scanStatus, 'completed');
  assert(validateReport(report));
  const id = file === main ? 'be-file-layout' : 'be-library-file-layout';
  return { report, hits: report.findings.filter(x => x.detectorId === id).map(x => `${x.line}:${x.observation.split(' ')[0]}`) };
};

test('NS-01 accepts both owner layouts, CRLF, header comments and type attributes', t => {
  for (const text of [
    `using System.Text;\n\nnamespace ${ns};\n\npublic class DemoUseCase { }\n`,
    `namespace ${ns};\n\n/// <summary>Demo</summary>\n[System.Obsolete]\npublic class DemoUseCase { }\n`,
    `using System.Text;\r\n\r\nnamespace ${ns};\r\n\r\npublic class DemoUseCase { }\r\n`,
    `// License header\nusing System.Text;\n\n// Section note\nnamespace ${ns};\n\npublic class DemoUseCase { }\n`
  ]) assert.deepEqual(layout(t, text).hits, [], text);
});

test('NS-01 reports a namespace placed above its imports, which still compiles', t => {
  const { report, hits } = layout(t, `namespace ${ns};\nusing System.Text;\nusing System.Linq;\n\npublic class DemoUseCase { }\n`);
  assert.deepEqual(hits, ['2:Using', '3:Using']);
  const first = report.findings.find(x => x.detectorId === 'be-file-layout');
  assert.equal(first.authority.goldenRuleId, 'NS-01');
  assert.equal(first.authority.tier, 'MUST');
  assert.equal(first.disposition, 'review-candidate');
  // The allowlisted file-scoped declaration itself is not a namespace finding.
  assert.equal(report.findings.filter(x => x.detectorId === 'be-namespace-observation').length, 0);
});

test('NS-01 reports missing or doubled blank lines around the namespace', t => {
  assert.deepEqual(layout(t, `using System.Text;\nnamespace ${ns};\n\npublic class DemoUseCase { }\n`).hits, ['2:Using']);
  assert.deepEqual(layout(t, `using System.Text;\n\nnamespace ${ns};\npublic class DemoUseCase { }\n`).hits, ['4:Using']);
  assert.deepEqual(layout(t, `namespace ${ns};\n\n\npublic class DemoUseCase { }\n`).hits, ['4:Using']);
  // Assembly attributes between sections are not judged.
  assert.deepEqual(layout(t, `using System.Text;\n[assembly: System.CLSCompliant(false)]\nnamespace ${ns};\npublic class DemoUseCase { }\n`).hits, []);
});

test('NS-01 in libraries reports block namespaces and namespace-local imports, not the published name', t => {
  const { report, hits } = layout(t, `namespace AgriMap.Platform.Demo\n{\n    using System.Text;\n\n    public class Demo { }\n}\n`, library);
  assert.deepEqual(hits, ['1:Library', '3:Using']);
  assert(report.findings.every(x => x.detectorId !== 'be-namespace-observation'));
  assert.deepEqual(layout(t, `using System.Text;\n\nnamespace AgriMap.Platform.Demo;\n\npublic class Demo { }\n`, library).hits, []);
});

test('ADV-01 runs on libraries as an advisory twin of the be-main detector', t => {
  const { report } = layout(t, `namespace AgriMap.Platform.Demo;\n\npublic class Demo\n{\n    public void Search(int a) { }\n    public void Get() { }\n    public void Search(int a, int b) { }\n}\n`, library);
  const hits = report.findings.filter(x => x.detectorId === 'be-library-overload-adjacency');
  assert.deepEqual(hits.map(x => x.line), [5]);
  assert.equal(hits[0].authority.goldenRuleId, 'ADV-01');
  assert.equal(hits[0].authority.tier, 'SHOULD');
  for (const family of ['be-library-file-layout', 'be-library-advisory-smells'])
    assert(report.catalog.some(f => f.familyId === family && f.implementationStatus === 'automated'), family);
});
