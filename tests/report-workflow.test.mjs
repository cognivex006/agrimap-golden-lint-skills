import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fixture, treeDigest, cs, sql } from './helpers.mjs';
import { run } from '../skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs';
import { scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { fixPrompts, renderMarkdown, renderSummary, remediation, text } from '../skills/agrimap-golden-lint-skills/scripts/render.mjs';
import { renderReview, reviewTemplate } from '../skills/agrimap-golden-lint-skills/scripts/report-bundle.mjs';
import { bindings, packageRoot, json } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';

const project = 'services/agmws-fixture-netcore/AgriMap.Web.Service.csproj';
const csproj = '<Project Sdk="Microsoft.NET.Sdk.Web"><PropertyGroup><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings></PropertyGroup></Project>';
const source = [
  'namespace AgriMap.Web.Service.Application.UseCases;',
  'public class DemoUseCase',
  '{',
  '    public async Task Load() { string? s = null; var n = s!.Trim()!.Length; if (s == null) { } await Task.Delay(n); }',
  '}',
  'public class Extra { }'
].join('\n');
const useCase = 'services/agmws-fixture-netcore/Src/Application/UseCases/DemoUseCase.cs';
const args = f => ['--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--dotnet', f.args.dotnet];
const capture = () => { const out = []; return { out, write: value => out.push(value) }; };
// Every Markdown table we emit must have a non-empty header row.
const emptyHeaders = markdown => markdown.split('\n').filter((line, i, all) => /^\| ?---/.test(all[i + 1] || '') && line.split('|').slice(1, -1).some(cell => !cell.trim()));

test('report writes one Markdown bundle in .agrimap-agent, reuses identical re-runs and never touches product files', t => {
  const f = fixture(t, { [useCase]: source, [project]: csproj });
  const reports = path.join(f.root, '.agrimap-agent', 'reports', 'golden-lint');
  const product = readFileSync(path.join(f.root, useCase));
  const first = capture();
  assert.equal(run(['report', ...args(f), '--authorize-output', reports], first.write), 0);
  const [id] = readdirSync(reports).filter(name => /^[a-f0-9]{64}$/.test(name));
  for (const file of ['report.md', 'summary.md', 'report.json', 'envelope.json', 'review.json', 'review.md', 'README.md', '.gitignore']) assert(existsSync(path.join(reports, id, file)), file);
  assert(existsSync(path.join(reports, 'index.md')) && readFileSync(path.join(reports, '.gitignore'), 'utf8') === '*\n');
  const summary = first.out.join('');
  assert(summary.includes('## ผลตรวจ AgriMap Golden') && summary.includes(path.join(reports, id, 'report.md')));
  assert.deepEqual(emptyHeaders(summary), []);
  assert.deepEqual(emptyHeaders(readFileSync(path.join(reports, id, 'report.md'), 'utf8')), []);
  assert.deepEqual(readFileSync(path.join(f.root, useCase)), product);
  // The first run adds the .agrimap-agent boundary record to the inventory, so the
  // snapshot changes once; from then on identical runs reuse the same bundle.
  const runJson = () => { const out = capture(); assert.equal(run(['report', ...args(f), '--authorize-output', reports, '--format', 'json'], out.write), 0); return JSON.parse(out.out.join('')); };
  const second = runJson(), third = runJson();
  assert.equal(second.status, 'saved');
  assert.equal(third.status, 'existing');
  assert.equal(third.reportId, second.reportId);
  assert.equal(readdirSync(reports).filter(name => /^[a-f0-9]{64}$/.test(name)).length, 2);
  assert.equal((readFileSync(path.join(reports, 'index.md'), 'utf8').match(/\]\([a-f0-9]{64}\/report\.md\)/g) || []).length, 2);
});

test('report refuses any other authorization and leaves the tree unchanged', t => {
  const f = fixture(t, { [sql]: 'CREATE PROCEDURE X AS SELECT 1;' });
  const before = treeDigest(f.root);
  for (const target of [path.join(f.root, '.agrimap-agent'), path.join(f.output, 'golden-lint'), 'relative/golden-lint']) {
    const out = capture();
    assert.equal(run(['report', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--authorize-output', target], out.write), 2);
    assert.match(out.out.join(''), /OUTPUT_AUTHORIZATION_REQUIRED|REPORT_ENVELOPE_REQUIRED/);
  }
  assert.equal(treeDigest(f.root), before);
});

test('scan --format summary is read-only Markdown and rejects unknown formats', t => {
  const f = fixture(t, { [sql]: 'CREATE PROCEDURE X AS SELECT 1;' });
  const before = treeDigest(f.root), out = capture();
  assert.equal(run(['scan', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--format', 'summary'], out.write), 0);
  assert(out.out.join('').includes('สถานะ **completed**'));
  assert.equal(treeDigest(f.root), before);
  assert.equal(run(['scan', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--format', 'markdown'], () => {}), 2);
});

test('fix prompts cover every automated finding exactly once, batch by whole files and stay fence-safe', t => {
  const files = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`services/agmws-fixture-netcore/sql/DEMO/procedure/DEMO${i}_Q.sql`, 'CREATE PROCEDURE A AS SELECT 1;\nCREATE PROCEDURE B AS SELECT 1;\nCREATE PROCEDURE C AS SELECT 1;\nCREATE PROCEDURE D AS SELECT 1;']));
  const f = fixture(t, files);
  const report = scan(f.args), prompts = fixPrompts(report, { projectName: 'demo' });
  const automated = report.findings.filter(x => report.rules.find(r => r.detectorId === x.detectorId).implementationStatus === 'automated');
  const covered = prompts.flatMap(p => p.batch.files.flatMap(([file, findings]) => findings.map(x => x.findingId)));
  assert.equal(new Set(covered).size, covered.length);
  assert.deepEqual([...covered].sort(), automated.map(x => x.findingId).sort());
  assert(prompts.length > 1 && prompts.every(p => p.batch.count <= 40 || p.batch.files.length === 1));
  assert(prompts.every(p => !p.prompt.includes('```') && p.prompt.includes('ยังไม่ commit') && p.prompt.includes(`ใช้สกิล ${p.group.guide.skill}`)));
  const markdown = renderMarkdown(report, { projectName: 'demo' });
  assert.equal((markdown.match(/^```text$/gm) || []).length, prompts.length);
  assert(renderSummary(report).includes('สรุปนี้ไม่ได้เขียนไฟล์'));
});

test('remediation guidance exists for every detector with a known risk and skill', () => {
  for (const rule of bindings) {
    const g = remediation.detectors[rule.detectorId];
    assert(g && g.tag && g.title && g.expected && remediation.riskOrder.includes(g.risk), rule.detectorId);
    assert(remediation.skills[g.skill], rule.detectorId);
    assert.equal(g.skill, rule.lane.startsWith('fe') ? 'agm-fe' : rule.lane.startsWith('be') ? 'agm-be' : 'agm-sql');
  }
});

test('C# reads SDK implicit usings from the nearest csproj only and locates each chained ! operator', t => {
  const f = fixture(t, { [useCase]: source, [project]: csproj, 'services/agmws-other-netcore/Src/Application/UseCases/OtherUseCase.cs': source.replace('DemoUseCase', 'OtherUseCase') });
  const report = scan(f.args);
  assert.equal(report.scanStatus, 'completed');
  const at = (file, detector) => report.findings.filter(x => x.path === file && x.detectorId === detector);
  assert.equal(at(useCase, 'be-async-naming').length, 1);
  const forgiving = at(useCase, 'be-null-forgiving');
  assert.equal(forgiving.length, 2);
  assert.equal(new Set(forgiving.map(x => x.column)).size, 2);
  const other = 'services/agmws-other-netcore/Src/Application/UseCases/OtherUseCase.cs';
  assert.equal(at(other, 'be-async-naming').length, 0);
  assert(report.rules.find(r => r.detectorId === 'be-async-naming').diagnostics.some(d => d.startsWith('ASYNC_NAMING_SYMBOL_UNRESOLVED') && d.endsWith(other)));
  assert.deepEqual(report.snapshot.csharpProjects, [{ path: project, implicitUsings: true }]);
  assert(report.files.find(x => x.path === project).digest);
});

test('portable Cursor/Agent Skills bundle keeps the folder name equal to the skill name', () => {
  const hosts = json(path.join(packageRoot, 'config/hosts.json'));
  const market = json(path.join(packageRoot, '.cursor-plugin/marketplace.json'));
  assert.equal(market.plugins[0].source, hosts.portableBundle);
  const manifest = json(path.join(packageRoot, hosts.portableBundle, '.cursor-plugin/plugin.json'));
  assert.equal(manifest.version, json(path.join(packageRoot, 'package.json')).version);
  assert(!manifest.hooks && !manifest.mcpServers);
  const skill = readFileSync(path.join(packageRoot, hosts.portableSkill, 'SKILL.md'), 'utf8');
  assert.equal(/^name: (.+)$/m.exec(skill)[1], path.basename(hosts.portableSkill));
  assert(existsSync(path.join(packageRoot, hosts.portableSkill, 'payload/skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs')));
  const canonicalSkill = readFileSync(path.join(packageRoot, 'skills/agrimap-golden-lint-skills/SKILL.md'), 'utf8');
  // Both layouts are generated from one text, differing only in relative paths.
  const strip = value => value.replace(/<!--.*-->/, '').replace(/\(payload\/[^)]+\)|\((?:\.\.\/\.\.\/docs|references)\/[^)]+\)/g, '()').replace(/`(?:payload\/skills\/agrimap-golden-lint-skills\/)?scripts\/agm-lint\.mjs`/, '');
  assert.equal(strip(skill), strip(canonicalSkill));
});

test('report.md states each observation once per rule, links rules to prompts and keeps one checklist line per finding', t => {
  const files = Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`services/agmws-fixture-netcore/sql/DEMO/procedure/DEMO${i}_Q.sql`, 'CREATE PROCEDURE A AS SELECT 1;\nCREATE PROCEDURE B AS SELECT 1;']));
  const f = fixture(t, files);
  const report = scan(f.args);
  const root = path.join(f.root), dir = path.join(root, '.agrimap-agent', 'reports', 'golden-lint', report.reportId);
  const markdown = renderMarkdown(report, { projectName: 'demo', projectRoot: root, reportDirectory: dir });
  for (const observation of new Set(report.findings.map(x => text(x.observation)))) assert.equal(markdown.split(observation).length - 1, 1, observation.slice(0, 40));
  assert.equal((markdown.match(/^- \[ \]/gm) || []).length, report.findings.length);
  assert(markdown.indexOf('## แก้ทีละกฎ') < markdown.indexOf('## ดัชนีไฟล์ที่พบประเด็น') && markdown.indexOf('## ดัชนีไฟล์ที่พบประเด็น') < markdown.indexOf('## Checklist ทุก finding'));
  assert(markdown.includes('--baseline ".agrimap-agent/reports/golden-lint/' + report.reportId + '/report.json"'));
  assert.deepEqual(emptyHeaders(markdown), []);
});

test('review.md is one compact row per finding and expands only recorded reviews', t => {
  const f = fixture(t, { [sql]: 'CREATE PROCEDURE A AS SELECT 1;\nCREATE PROCEDURE B AS SELECT 1;' });
  const report = scan(f.args), review = reviewTemplate(report);
  const blank = renderReview(report, review);
  assert.equal((blank.match(/^\| F\d{3} \|/gm) || []).length, report.findings.length);
  assert(blank.includes('ยังไม่มี finding ที่บันทึกผลทบทวน') && !blank.includes('ยังไม่ทบทวน'));
  Object.assign(review.reviews[0], { status: 'exception', reviewer: 'Owner', evidence: ['decision/ref'], reason: 'legacy <deploy> name' });
  const filled = renderReview(report, review);
  assert(filled.includes(report.findings[0].findingId) && filled.includes('legacy &lt;deploy&gt; name') && filled.includes('exception 1'));
});

const sqlFiles = n => Object.fromEntries(Array.from({ length: n }, (_, i) => [`services/agmws-fixture-netcore/sql/DEMO/procedure/DEMO${i}_Q.sql`, 'CREATE PROCEDURE A AS SELECT 1;\nCREATE PROCEDURE B AS SELECT 1;']));
const bundleOf = (f, reports) => path.join(reports, readdirSync(reports).find(name => /^[a-f0-9]{64}$/.test(name)));

test('every fix prompt names a hotfix branch from develop, analyses impact first and gates edits on evidence', t => {
  const f = fixture(t, sqlFiles(3));
  const report = scan(f.args), prompts = fixPrompts(report, { projectName: 'demo', projectRoot: f.root, reportDirectory: path.join(f.root, '.agrimap-agent/reports/golden-lint', report.reportId) });
  assert(prompts.length > 0);
  for (const p of prompts) {
    assert.match(p.branch, /^hotfix\/golden-[a-z0-9-]+$/);
    assert(p.branch.length <= 40);
    for (const part of [`Branch: ${p.branch}`, 'origin/develop', 'ขั้นที่ 2 — วิเคราะห์ก่อนแก้', 'A แก้ได้', 'B ไม่แก้', 'C หลักฐานไม่พอ — ห้ามแก้', 'ขั้นที่ 4 — บันทึกผลกลับเข้ารายงาน', 'review-update', 'exception', 'needs-evidence']) assert(p.prompt.includes(part), part);
    assert.equal(p.prompt.includes('หยุดหลังวิเคราะห์'), p.group.guide.impact === 'cross-service');
  }
  const sameRule = prompts.filter(p => p.group.detectorId === prompts[0].group.detectorId);
  assert.equal(new Set(sameRule.map(p => p.branch)).size, 1);
});

test('remediation declares impact, evidence and investigation steps for every detector', () => {
  assert.equal(remediation.delivery.branchType, 'hotfix');
  assert.equal(remediation.delivery.baseBranch, 'develop');
  for (const rule of bindings) {
    const g = remediation.detectors[rule.detectorId];
    assert(['local', 'cross-service'].includes(g.impact), rule.detectorId);
    assert(g.evidence.length && g.investigate.length, rule.detectorId);
  }
});

test('review-update re-renders only derived Markdown, drops decided findings from prompts and refuses drift', t => {
  const f = fixture(t, sqlFiles(2));
  const reports = path.join(f.root, '.agrimap-agent', 'reports', 'golden-lint');
  assert.equal(run(['report', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--authorize-output', reports], () => {}), 0);
  const bundle = bundleOf(f, reports), id = path.basename(bundle);
  const keep = Object.fromEntries(['report.json', 'envelope.json'].map(n => [n, readFileSync(path.join(bundle, n), 'utf8')]));
  const review = JSON.parse(readFileSync(path.join(bundle, 'review.json'), 'utf8'));
  const target = review.reviews[0].findingId;
  Object.assign(review.reviews[0], { status: 'exception', reviewer: 'Owner', evidence: ['user confirmed'], reason: 'ไม่แก้ เพราะเป็น deployed name' });
  const args = ['review-update', '--report', path.join(bundle, 'envelope.json'), '--report-id', id, '--review', path.join(bundle, 'review.json'), '--authorize-output', bundle];
  // A review kept outside the bundle must not drive the report.
  const outside = path.join(f.output, 'review.json');
  writeFileSync(outside, JSON.stringify(review, null, 2));
  assert.equal(run([...args.slice(0, 6), outside, ...args.slice(7)], () => {}), 2);
  writeFileSync(path.join(bundle, 'review.json'), JSON.stringify(review, null, 2));
  assert.equal(run([...args.slice(0, -1), reports], () => {}), 2);
  const out = []; assert.equal(run(args, v => out.push(v)), 0);
  assert.equal(JSON.parse(out.join('')).statuses.exception, 1);
  for (const [n, text] of Object.entries(keep)) assert.equal(readFileSync(path.join(bundle, n), 'utf8'), text, n);
  const markdown = readFileSync(path.join(bundle, 'report.md'), 'utf8');
  assert(markdown.includes('ไม่แก้ เพราะเป็น deployed name') && markdown.includes('**ข้อสรุปที่บันทึกแล้ว**'));
  assert(markdown.includes(`- [x] F001`) && markdown.includes(target));
  const report = JSON.parse(keep['report.json']), decided = report.findings.find(x => x.findingId === target);
  const prompts = fixPrompts(report, { review });
  assert(!prompts.some(p => p.batch.files.some(([, findings]) => findings.some(x => x.findingId === decided.findingId))));
  assert(readFileSync(path.join(bundle, 'review.md'), 'utf8').includes('exception 1'));
});

test('report --baseline carries settled decisions forward and reopens fixed items that are still found', t => {
  const f = fixture(t, sqlFiles(1));
  const reports = path.join(f.root, '.agrimap-agent', 'reports', 'golden-lint');
  run(['report', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--authorize-output', reports], () => {});
  const first = bundleOf(f, reports);
  const review = JSON.parse(readFileSync(path.join(first, 'review.json'), 'utf8'));
  Object.assign(review.reviews[0], { status: 'exception', reviewer: 'Owner', evidence: ['user confirmed'], reason: 'ไม่แก้' });
  Object.assign(review.reviews[1], { status: 'fixed-pending-rescan', reviewer: 'agent', evidence: ['build'], reason: 'แก้แล้ว', proposedChange: 'x', verification: 'y' });
  writeFileSync(path.join(first, 'review.json'), JSON.stringify(review, null, 2));
  const out = [];
  assert.equal(run(['report', '--root', f.root, '--golden', f.golden, '--source-mode', 'installed', '--baseline', path.join(first, 'report.json'), '--authorize-output', reports, '--format', 'json'], v => out.push(v)), 0);
  const saved = JSON.parse(out.join(''));
  assert.equal(saved.carriedReviews, 2);
  const next = JSON.parse(readFileSync(path.join(saved.directory, 'review.json'), 'utf8'));
  const byId = new Map(next.reviews.map(r => [r.findingId, r]));
  assert.equal(byId.get(review.reviews[0].findingId).status, 'exception');
  assert.match(byId.get(review.reviews[0].findingId).reason, /^\[ต่อจาก report [a-f0-9]{12}\] ไม่แก้$/);
  assert.equal(byId.get(review.reviews[1].findingId).status, 'todo');
  assert(readFileSync(path.join(saved.directory, 'report.md'), 'utf8').includes('**ข้อสรุปที่บันทึกแล้ว**'));
});
