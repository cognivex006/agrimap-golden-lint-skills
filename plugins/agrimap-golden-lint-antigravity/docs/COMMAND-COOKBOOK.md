# ชุดคำสั่งพร้อมใช้

[หน้าหลัก](../README.md) · [คู่มือคำสั่ง](USAGE.md) · [แก้ปัญหา](TROUBLESHOOTING.md)

แทน `<...>` ด้วยค่าจริงก่อนใช้ และเตรียม [prerequisites](GETTING-STARTED.md) ให้ครบ ตัวอย่างในหน้านี้ไม่ใช่คำสั่งให้ Agent แก้โค้ดหรือติดตั้งสิ่งใด

## พิมพ์ในช่องสนทนา Agent

ตัวอย่างใช้ `$agm-lint` ของ Codex ใน Claude Code ใช้ `/agrimap-golden-lint-skills:agm-lint` ใน Cursor ใช้ `/agm-lint` ส่วน host อื่นใช้ชื่อที่ host แสดง

| ต้องการ | โจทย์ตัวอย่าง |
| --- | --- |
| ตรวจหนึ่งโครงการ | `$agm-lint ตรวจ <project-root> เทียบ Golden แล้วบันทึกรายงานใน .agrimap-agent ยังไม่แก้โค้ด` |
| ตรวจแบบไม่เขียนไฟล์ | `$agm-lint ตรวจ <project-root> แบบอ่านอย่างเดียว ห้ามเขียนไฟล์ใด ๆ สรุปผลในแชท` |
| ระบุแหล่ง Golden เอง | `$agm-lint ตรวจ <project-root> โดยใช้ Golden <golden-package-root> mode checkout` |
| ตรวจซ้ำหลังแก้ | `$agm-lint ตรวจ <project-root> อีกครั้งโดยใช้ baseline <bundle>/report.json สรุปจุดที่หายและจุดใหม่` |
| ขอ prompt แก้ไขกลุ่มเดียว | `$agm-lint จากรายงานล่าสุดของ <project-root> ขอ prompt แก้ NULL-03 ทั้งก้อน` |
| อธิบาย finding | `$agm-lint อธิบาย finding <finding-id> จากรายงาน <report-id> อ้าง Golden entry และหลักฐานที่ยังขาด` |
| เตรียมข้อมูลให้เจ้าของโค้ด | `$agm-lint จากรายงานล่าสุด สรุปกลุ่มความเสี่ยงสูง consumers ที่ต้องตรวจ และสิ่งที่ต้องพิสูจน์ก่อนแก้` |

## ส่ง prompt แก้ไขให้สกิลของ lane

คัดลอก prompt จาก report.md หัวข้อ “Prompt สำหรับแก้ไข” ทั้งก้อน แล้ววางในแชท Prompt ระบุชื่อสกิลไว้ในบรรทัดแรกแล้ว host ส่วนใหญ่จึงเลือกสกิลได้เอง หากต้องการบังคับให้ขึ้นต้นด้วยชื่อเรียกของ host เช่น `$agm-be` (Codex) ตัวอย่างโครง prompt:

```text
ใช้สกิล agm-be แก้ NULL-03 — ใช้ is null / is not null แทน == null ตาม Golden ของ agrimap-agent-skills
โครงการ: agmws-sample-netcore
ตำแหน่งที่ต้องตรวจและแก้:
- Src/Application/UseCases/SampleUseCase.cs: 31, 88
...
- สรุปไฟล์ที่แก้ จุดที่ข้ามพร้อมเหตุผล และผลตรวจ ยังไม่ commit/push
```

## Terminal: ตรวจและบันทึกรายงาน

เปิด **PowerShell ที่ root ของ lint package**

**PowerShell — authorized report write: บันทึกชุดรายงานใน .agrimap-agent ของโครงการ**

```powershell
$dotnet = (Get-Command dotnet).Source
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs report --root '<project-root>' --golden '<golden-package-root>' --source-mode installed --dotnet $dotnet --authorize-output '<project-root>/.agrimap-agent/reports/golden-lint'
```

โครงการ Angular เปลี่ยน `--dotnet $dotnet` เป็น `--typescript '<project-root>/node_modules/typescript/lib/typescript.js'` Portfolio ที่มีทั้งสองภาษาให้ส่งทั้งสอง option

## Terminal: ตรวจซ้ำพร้อม baseline

**PowerShell — authorized report write: ชุดรายงานใหม่ที่เทียบกับรอบก่อน**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs report --root '<project-root>' --golden '<golden-package-root>' --source-mode installed --dotnet $dotnet --baseline '<previous-bundle>/report.json' --authorize-output '<project-root>/.agrimap-agent/reports/golden-lint'
```

Baseline ต้องมาจาก scanner รุ่นเดียวกันจึงจะ `comparable` ผลปัจจุบันยังแสดงครบเสมอ

## Terminal: เปรียบเทียบ committed snapshots

**PowerShell — อ่านอย่างเดียว:**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan --root '<project-root>' --golden '<golden-package-root>' --source-mode checkout --dotnet $dotnet --base-ref '<base-ref>' --target-ref '<target-ref>' --format summary
```

Refs ต้องมีในเครื่องแล้ว ไม่รวม untracked/working changes ของ target ref

## Terminal: อธิบาย finding เดิม

**PowerShell — อ่านอย่างเดียว:**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs explain --report '<bundle>/envelope.json' --report-id '<report-id>' --finding-id '<finding-id>'
```

ใช้ envelope และ IDs จากชุดรายงานเดิม หาก ID ไม่ตรงจะหยุดโดยไม่ scan ใหม่

## Terminal: ส่งออกนอกโครงการ

**PowerShell — authorized external write: ไฟล์ใหม่ภายนอกทุก root**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs export --report '<bundle>/envelope.json' --report-id '<report-id>' --to '<absolute-new-external-report.md>' --authorize-output '<absolute-new-external-report.md>' --format markdown
```

ปลายทางต้องอยู่นอกทุก scanned/Golden root มีโฟลเดอร์แม่แล้ว และยังไม่มีไฟล์ชื่อนั้น
