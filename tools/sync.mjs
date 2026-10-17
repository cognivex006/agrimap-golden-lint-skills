import { readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { registry, bindings, catalog, packageRoot, canonical, json, within } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { hostOutputs, checkBundleLayout } from './host-adapters.mjs';
import { skillMarkdown } from './skill-text.mjs';

export function mirrors() {
  const version = json(path.join(packageRoot, 'package.json')).version;
  const outputs = {
    'skills/agrimap-golden-lint-skills/SKILL.md': skillMarkdown({ version, generatedFrom: 'tools/skill-text.mjs and config/operations.json', runner: 'scripts/agm-lint.mjs', references: 'references', docs: '../../docs' }),
    'skills/agrimap-golden-lint-skills/assets/operations.json': canonical(registry),
    'skills/agrimap-golden-lint-skills/references/COVERAGE.md': `# ขอบเขตการตรวจ

<!-- GENERATED from assets/rules.json and assets/catalog.json by npm run sync -->

[Runtime contract](RUNTIME.md) · [กฎกับแหล่ง Golden](RULE-MAPPING.md) · [อ่านผลตรวจ](../../../docs/WORKFLOWS.md)

มี detector อัตโนมัติ ${bindings.filter(r => r.implementationStatus === 'automated').length} ตัวและ boundary review ${bindings.filter(r => r.implementationStatus === 'review-only').length} ตัว คำว่า automated หมายถึง runner หาหลักฐานให้ ไม่ได้ยืนยัน architecture โดยอัตโนมัติ

## Detector ที่มี

| Detector | Lane | ความสามารถ | Evidence | Golden ID |
| --- | --- | --- | --- | --- |
${bindings.map(r => `| ${r.detectorId} | ${r.lane} | ${r.implementationStatus} | ${r.minimumEvidenceLevel} | ${r.goldenRuleId} |`).join('\n')}

T6 ตรวจ explicit syntax ส่วน decorated assertions ต้อง resolve exception R1/R3 เป็น review candidates แม้พบ syntax/name ที่ตรง pattern BE main/library ใช้ Roslyn detectors ตาม catalog ตาม [Backend lint](../../../docs/BACKEND-LINT.md) และ --dotnet; ผลยังเป็น candidates Library/table/messages detectors ระบุขอบเขตให้ตรวจ contract ไม่ใช่ defect verdict

## อ่านสถานะอย่างไร

| สถานะ | ความหมาย |
| --- | --- |
| automated | มี observation detector ตาม evidence level และ prerequisites ที่ระบุ |
| review-only | มี boundary locator ต้องเพิ่ม consumer/owner/contract evidence |
| not-implemented | ยังไม่มีการตรวจ family นี้ ไม่ใช่ตรวจแล้วผ่าน |

## Catalog ทั้งหมด

Canonical status มาจาก assets/catalog.json และปรากฏในรายงานทุกครั้ง Selected lane counts ให้บริบท ไม่ใช่จำนวนไฟล์ที่ family ที่ยังไม่ทำประเมินแล้ว อ่านข้อจำกัดราย family ใน catalog note ของ JSON report

| Family | Lane | สถานะ | Detector |
| --- | --- | --- | --- |
${catalog.map(f => `| ${f.familyId} | ${f.lane} | ${f.implementationStatus} | ${f.detectorIds.join(', ') || '—'} |`).join('\n')}

## สิ่งที่ยังต้องทบทวนด้วยหลักฐานเพิ่ม

ยังไม่มี full semantic dependency graph, R2/R4/R5 flow/lifecycle, new-code naming applicability ที่ต้องยืนยัน history, generated provenance, export compatibility, full async/signature contracts, cancellation, DI/logging, request-value semantics, capability duplication และ SQL DDL/message/index/relationship semantics

ดู exact scope/conflicts/exceptions ใน Rule mapping ก่อนอธิบายผล ขณะนี้ยังไม่มี owner-exception input และ independent real-product conformance corpus ชุด synthetic cases ยัง pending-owner-review จึงไม่ใช้ยืนยัน precision/recall
`
  };
  return { ...outputs, ...hostOutputs(outputs) };
}
export function sync(check = false) {
  const outputs = mirrors();
  for (const [rel, expected] of Object.entries(outputs)) {
    const file = path.join(packageRoot, rel);
    assertOutputPath(file);
    let current = null; try { current = readFileSync(file, Buffer.isBuffer(expected) ? undefined : 'utf8'); } catch {}
    if (Buffer.isBuffer(expected) ? !Buffer.isBuffer(current) || !current.equals(expected) : current !== expected) {
      if (check) assertMirror(current, expected);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, expected, 'utf8');
    }
  }
  checkBundleLayout(outputs);
}
export function assertOutputPath(file) {
  if (!within(packageRoot, path.resolve(file))) throw new Error('GENERATED_OUTPUT_OUTSIDE_PACKAGE');
  let ancestor = file;
  while (path.resolve(ancestor) !== path.resolve(packageRoot)) {
    if (existsSync(ancestor) && (lstatSync(ancestor).isSymbolicLink() || !within(realpathSync(packageRoot), realpathSync(ancestor)))) throw new Error('GENERATED_OUTPUT_INDIRECTION');
    ancestor = path.dirname(ancestor);
  }
}
export function assertMirror(current, expected) {
  if (Buffer.isBuffer(expected) ? !Buffer.isBuffer(current) || !current.equals(expected) : current !== expected) throw new Error('STALE_GENERATED');
}
if (process.argv[1]?.endsWith('sync.mjs')) sync(process.argv.includes('--check'));
