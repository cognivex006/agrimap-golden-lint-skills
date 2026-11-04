import test from 'node:test';
import assert from 'node:assert/strict';
import { scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { fixture } from './helpers.mjs';

const file = 'services/agmws-case/Src/Application/UseCases/DemoUseCase.cs';
const method = body => `namespace AgriMap.Web.Service.Application.UseCases; public class DemoUseCase { void Run(int x) { ${body} } }`;
const scanBody = (t, body) => {
  const f = fixture(t, { [file]: method(body) });
  const report = scan({ ...f.args });
  assert.equal(report.scanStatus, 'completed', JSON.stringify(report.rules.filter(r => ['error', 'blocked'].includes(r.executionStatus)).map(r => [r.detectorId, r.diagnostics])));
  return report.findings.filter(finding => finding.detectorId === 'be-complexity-review');
};

// PlusRightUseCase-shaped: request guards, nested keep branch, status checks and a switch expression.
const mixed = `if (x == 0 || x < -1) { return; }
  if (x > 100) { if (x == 101 && x > 0) { foreach (var i in new[] { 1 }) { if (i == x) { return; } } } else if (x == 102) { } else { } }
  for (var i = 0; i < x; i++) { if (i == 3 || i == 4 && x > 2) { continue; } }
  var next = x switch { 1 => 2, _ => x > 5 ? 1 : 0 };`;

test('estimated cognitive complexity flags a mixed method above 15 with its score', t => {
  const hits = scanBody(t, mixed);
  assert.equal(hits.length, 1);
  assert.equal(hits[0].disposition, 'review-candidate');
  assert.equal(hits[0].authority.externalAnalyzer.resultStatus, 'not-imported');
  assert.match(hits[0].observation, /Estimated score: \d+\./);
  assert.match(hits[0].observation, /not a SonarQube result/);
});

test('estimated cognitive complexity ignores flat chains, comments and local functions', t => {
  assert.equal(scanBody(t, `if(x==1){} else if(x==2){} else if(x==3){} else if(x==4){} else if(x==5 && x>0){} // if (x) { if (x) { if (x) {} } }\n`).length, 0);
  // Fifteen exactly is at the Sonar default and is not reported.
  assert.equal(scanBody(t, `if(x==1){ if(x==2){ if(x==3){ if(x==4){ } } } } if(x==5){} if(x==6){} if(x==7){} if(x==8){} if(x==9){}`).length, 0);
  const local = scanBody(t, `var y = 0; void Local(){ ${'if(x==1){ if(x==2){ if(x==3){ if(x==4){ } } } } '.repeat(2)} }`);
  assert.equal(local.length, 1, 'local function is scored on its own');
});
