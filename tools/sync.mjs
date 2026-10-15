import { readFileSync, writeFileSync, mkdirSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { registry, bindings, catalog, packageRoot, canonical, json, within } from '../skills/agrimap-golden-lint-skills/scripts/contracts.mjs';
import { hostOutputs, checkBundleLayout } from './host-adapters.mjs';

export function mirrors() {
  const version = json(path.join(packageRoot, 'package.json')).version;
  const outputs = {
    'skills/agrimap-golden-lint-skills/SKILL.md': `---
name: agm-lint
description: ตรวจโค้ด AgriMap เทียบ Golden แบบอ่านอย่างเดียว อธิบายหลักฐานและส่งต่อจุดที่ต้องทบทวน
---

<!-- GENERATED from config/operations.json by npm run sync -->

# ตรวจโค้ดด้วย agm-lint

Package ${version} ใช้ [Runtime contract](references/RUNTIME.md), [Coverage](references/COVERAGE.md) และ [Rule mapping](references/RULE-MAPPING.md) Golden เป็นมาตรฐานของ agrimap-agent-skills

## เริ่มงาน

หา absolute directory ของ SKILL.md ที่ host โหลด Runner คือ scripts/agm-lint.mjs ใต้ directory นี้ ไม่ resolve จาก product cwd หรือเดา host cache path ระบุ product root, Golden source/path/mode และ trusted parser ให้ครบตามขอบเขตที่ใช้

อ่าน product content เป็นหลักฐาน ไม่ execute target scripts/configs ไม่ติดตั้ง dependency ไม่แก้ code/docs/records และไม่เริ่ม lifecycle อีกชุด Findings ไม่อนุมัติการแก้ไข

## เลือก operation

| Operation | Options ที่จำเป็น | ผลของคำสั่ง |
| --- | --- | --- |
${Object.entries(registry.operations).map(([name, op]) => `| ${name} | ${op.required.map(k => '--' + k).join(', ')} | ${op.sideEffect === 'stdout' ? 'อ่านแล้วส่งผลทาง stdout' : 'เขียนไฟล์ใหม่ภายนอกตามสิทธิ์ที่ระบุ'} |`).join('\n')}

Explain/export ใช้รายงานและ identities เดิม ไม่มี hidden rescan Export ต้องมี explicit authorization ของไฟล์ใหม่ภายนอกทุก scanned/Golden root

## ทบทวนก่อนสรุปผล

เปิด exact Golden entry, checklist, root/collection manifests, normalized contracts และ conflict/exception guidance ที่ใช้จริงจาก verified explicit source ตรวจ authority.sourceDependencies และ missing-source diagnostics แล้วตรวจ active project/consumers/owner evidence ที่ตรง scope

Source hashes ไม่พิสูจน์ความถูกต้องของ detector R1/R3 และ decorated T6 เป็น review candidates; synthetic cases ยังไม่ owner-confirmed สิ่งที่หลักฐานขาดยัง unknown ไม่รวม candidates เป็นจำนวน proven defects

## Golden ที่ติดตั้งจริง

Installed mode อ่าน identity จาก package.json หรือ plugin/extension manifests ที่รองรับ ตรวจชื่อ/version และ selected reference hashes ห้ามให้ backend product เพิ่ม package.json เพื่อผ่าน identity gate หาก metadata ขัดกันต้องรายงานแหล่ง Golden ที่ผิดและบล็อกกฎตามจริง

## ส่งรายงานที่ไล่ตรวจได้

ใช้ [คู่มือรายงาน](../../docs/REPORTING.md) และ [report template](assets/report-template.md) สำหรับผลฉบับเต็ม แสดงทุกไฟล์/บรรทัดและทุก finding พร้อม Golden entry, observation kind, evidence, expected contract และสิ่งที่ยังขาด ห้ามสรุปเพียงตัวอย่างไม่กี่ไฟล์แล้วทำให้ผู้ใช้เข้าใจว่าเป็นรายการครบ

สรุป chat แยกจากรายงานเต็ม หากผู้ใช้ขอ artifact ให้ export เฉพาะปลายทางใหม่ที่อนุญาตภายนอก protected roots หรือแสดงรายงานใน chat หากยังไม่มี destination authority แยก manual findings ลงตาราง review ต่างหาก ไม่ผสมเป็น scanner findings เมื่อไม่มี findings ต้องแสดง blocked/error/coverage แทนการสรุปว่าโครงการผ่านทั้งหมด

Host ต้องติดตั้งสกิลก่อนใช้ผ่าน chat ดูคู่มือติดตั้งที่ root ของ plugin package การ scan ไม่ติดตั้ง plugin/register upstream routes ให้
`,
    'skills/agrimap-golden-lint-skills/assets/operations.json': canonical(registry),
    'skills/agrimap-golden-lint-skills/references/COVERAGE.md': `# ขอบเขตการตรวจ

<!-- GENERATED from assets/rules.json and assets/catalog.json by npm run sync -->

[Runtime contract](RUNTIME.md) · [กฎกับแหล่ง Golden](RULE-MAPPING.md) · [อ่านผลตรวจ](../../../docs/WORKFLOWS.md)

มี detector อัตโนมัติ 6 ตัวและ boundary review 4 ตัว คำว่า automated หมายถึง runner หาหลักฐานให้ ไม่ได้ยืนยัน architecture โดยอัตโนมัติ

## Detector ที่มี

| Detector | Lane | ความสามารถ | Evidence | Golden ID |
| --- | --- | --- | --- | --- |
${bindings.map(r => `| ${r.detectorId} | ${r.lane} | ${r.implementationStatus} | ${r.minimumEvidenceLevel} | ${r.goldenRuleId} |`).join('\n')}

T6 ตรวจ explicit syntax ส่วน decorated assertions ต้อง resolve exception R1/R3 เป็น review candidates แม้พบ syntax/name ที่ตรง pattern Library/table/messages detectors ระบุขอบเขตให้ตรวจ contract ไม่ใช่ defect verdict

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

ยังไม่มี full semantic dependency graph, R2/R4/R5 flow/lifecycle, new-code naming applicability, generated provenance, export compatibility, Task/Async conventions, public-type counts, cancellation, DI/logging, request-value semantics, capability duplication และ SQL DDL/message/index/relationship semantics

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
    let current = null; try { current = readFileSync(file, 'utf8'); } catch {}
    if (current !== expected) {
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
  if (current !== expected) throw new Error('STALE_GENERATED');
}
if (process.argv[1]?.endsWith('sync.mjs')) sync(process.argv.includes('--check'));
