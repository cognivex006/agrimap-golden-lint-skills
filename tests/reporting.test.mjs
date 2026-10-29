import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { scan } from '../skills/agrimap-golden-lint-skills/scripts/scanner.mjs';
import { packageRoot, digest } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { renderMarkdown } from '../skills/agrimap-golden-lint-skills/scripts/render.mjs';
import { fixture, cs, sql } from './helpers.mjs';

test('report template renders every finding, file index, diagnostics and review checklist', t => {
  const f = fixture(t, { [cs]: 'using AgriMap.Web.Service.Application.Models;\n\nnamespace Bad.Name;', [sql]: 'CREATE PROCEDURE X AS SELECT 1;' });
  const report = scan(f.args), markdown = renderMarkdown(report);
  assert.equal(report.findings.length, 6);
  for (const finding of report.findings) assert(markdown.includes(finding.findingId));
  for (const heading of ['## สรุปและลำดับการแก้', '## แก้ทีละกฎ', '## ดัชนีไฟล์ที่พบประเด็น', '## Checklist ทุก finding', '## ผลทบทวนเพิ่มเติม', '## ภาคผนวก', '### แหล่งอ้างอิงและ snapshot', '### สถานะกฎและ diagnostics']) assert(markdown.includes(heading), heading);
  assert.equal((markdown.match(/^- \[ \]/gm) || []).length, report.findings.length);
  assert(markdown.includes('0 violations / 6 review candidates'));
  assert(markdown.includes('namespace-declaration 1'));
  assert(markdown.includes('namespace-reference 1'));
  const template = readFileSync(path.join(packageRoot, 'skills/agrimap-golden-lint-skills/assets/report-template.md'), 'utf8');
  assert(template.includes('{{fileIndex}}'));
  assert(!markdown.includes('{{'));
});
test('Markdown escapes untrusted file labels and retains working-tree Git context separately', t => {
  const special = cs.replace('Demo.cs', 'Demo|[x]<tag>.cs');
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  const git = args => execFileSync('git', ['-C', f.root, ...args], { encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git(['init']);
  git(['symbolic-ref', 'HEAD', 'refs/heads/develop']);
  git(['add', '--', cs]);
  git(['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', 'fixture']);
  const report = scan(f.args);
  assert.equal(report.snapshot.branch, 'develop');
  assert.equal(report.snapshot.headCommit, git(['rev-parse', 'HEAD']));
  assert.equal(report.snapshot.commit, null);
  assert.equal(report.snapshot.gitDirty, false);
  // Simulate a valid report from a filesystem that permits these characters.
  report.files.find(file => file.path === cs).path = special;
  for (const finding of report.findings) {
    finding.path = special;
    finding.findingId = digest({ detectorId: finding.detectorId, revision: finding.detectorRevision, path: finding.path, anchor: finding.symbolAnchor, evidenceFingerprint: finding.evidenceFingerprint, occurrence: finding.occurrence });
  }
  const { reportId, ...payload } = report;
  report.reportId = digest(payload);
  const markdown = renderMarkdown(report);
  assert(markdown.includes('develop'));
  // Prompt bodies are literal fenced text; everything rendered as Markdown must be escaped.
  const rendered = markdown.replace(/^```text\n[\s\S]*?^```$/gm, '');
  assert(!rendered.includes('<tag>'));
  assert(markdown.includes('\\|'));
  assert(markdown.includes('&lt;tag&gt;'));
});
test('partial zero-finding report includes blocking diagnostics and never declares all files compliant', t => {
  const f = fixture(t, { [cs]: 'namespace Bad.Name;' });
  const file = path.join(f.golden, 'skills/agrimap-agent-skills/references/patterns/csharp.md');
  // Source drift must be explained even when no finding could be produced.
  writeFileSync(file, 'changed source');
  const markdown = renderMarkdown(scan(f.args));
  assert(markdown.includes('partial'));
  assert(markdown.includes('SOURCE_AUTHORITY_UNVERIFIED'));
  assert(markdown.includes('ยังสรุปว่าผ่าน Golden ทั้งหมดไม่ได้'));
  assert(markdown.includes('0 violations / 0 review candidates'));
});
