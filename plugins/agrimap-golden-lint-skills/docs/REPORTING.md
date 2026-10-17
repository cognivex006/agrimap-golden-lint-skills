# รายงานและการติดตามแก้ไข

[หน้าหลัก](../README.md) · [Workflows](WORKFLOWS.md) · [ตัวอย่างรายงาน](../examples/README.md)

หน้านี้อธิบายว่า `report` เก็บอะไรไว้ใน `.agrimap-agent` ของโครงการ อ่าน report.md อย่างไร และบันทึกผลทบทวนโดยไม่แตะผลของ scanner Layout ของรายงานมาจาก [report template](../skills/agrimap-golden-lint-skills/assets/report-template.md) เดียวกันทุก host

## โครงสร้างใน .agrimap-agent

```text
<project>/.agrimap-agent/reports/golden-lint/
├── index.md              ทุกรอบที่ตรวจ เรียงจากล่าสุด (สร้างใหม่ทุกครั้ง)
├── .gitignore            * — กันชุดรายงานเข้า Git โดยไม่แก้ .gitignore ของโครงการ
└── <report-id>/          หนึ่ง directory ต่อหนึ่งผลตรวจ ไม่เขียนทับ
    ├── summary.md        สรุปสั้นแบบเดียวกับที่แสดงในแชท
    ├── report.md         รายงานเต็ม
    ├── report.json       canonical report — หลักฐาน ห้ามแก้
    ├── envelope.json     report + protected roots สำหรับ explain/export/review-check
    ├── review.json       แบบฟอร์มบันทึกผลทบทวนราย finding
    ├── review.md         สมุดทบทวนที่แก้ข้อความได้
    ├── README.md         ลำดับการใช้ชุดรายงาน
    └── .gitignore
```

`.agrimap-agent` ถูก exclude จากการ scan เสมอ รายงานเก่าจึงไม่ปนเป็น input ของรอบถัดไป

## ไฟล์ในชุดรายงาน

| ไฟล์ | ใช้ทำอะไร | แก้ได้ไหม |
| --- | --- | --- |
| summary.md | อ่านเร็ว ส่งต่อในแชทหรือ ticket | ได้ (สำเนา) |
| report.md | รายงานเต็มและ prompt แก้ไข; checkbox ใช้ติดตามในสำเนา | ได้ แต่ไม่เปลี่ยนผล scanner |
| report.json | ใช้เป็น `--baseline` ของรอบถัดไป และอ้าง identity | ไม่ |
| envelope.json | ใช้กับ explain/export/review-check; มี absolute roots ของเครื่องนี้ | ไม่ |
| review.json | บันทึก reviewer, evidence, reason, proposedChange, verification | ได้ แล้วตรวจด้วย review-check |
| review.md | สถานะทบทวนแบบตารางหนึ่งแถวต่อ finding และรายละเอียดเฉพาะรายการที่บันทึกแล้ว; ใช้จดบันทึกได้แต่ไม่ถูก import กลับอัตโนมัติ | ได้ |

## อ่าน report.md

| หัวข้อ | มีอะไร |
| --- | --- |
| ส่วนหัว | โครงการ, สถานะ, branch/HEAD, scanner และ Golden version, report ID |
| สรุปและลำดับการแก้ | จำนวนรวม, coverage, ตารางรายกฎ (จุด, ไฟล์, ความเสี่ยง, สกิล, prompt ของกฎนั้น), prerequisite ที่ต้องแก้ก่อน (ถ้ามี), วิธีใช้รายงาน และหลักฐานที่ต้องมีก่อนยืนยัน finding — แสดงครั้งเดียว |
| แก้ทีละกฎ | การ์ดหนึ่งใบต่อกฎ เรียงตามตาราง: จำนวน/ความเสี่ยง/สกิล, Golden entry, สิ่งที่ตรวจพบ (ข้อความเดียวต่อกฎ ไม่ซ้ำราย finding) และ prompt พร้อมคัดลอก แบ่งชุดละไม่เกิน 40 จุดโดยไม่ตัดไฟล์ครึ่งกลาง; boundary review แสดงสิ่งที่ต้องเทียบแทน prompt |
| ดัชนีไฟล์ | ทุกไฟล์ที่พบ จำนวนจุด และตำแหน่งแบบย่อ เช่น `67 NULL-02 · 73, 79, 87 NULL-03` หรือ `NULL-02 ×73` เมื่อยาวเกิน |
| Checklist ทุก finding | จัดตามไฟล์ หนึ่งบรรทัดสั้นต่อ finding: F-label, บรรทัด:คอลัมน์, กฎ และ Finding ID พร้อม checkbox (เพิ่มชนิดหลักฐานเมื่อกฎนั้นมีหลายชนิด) |
| ผลทบทวนเพิ่มเติม | ตารางสำหรับ manual review แยกจากผลอัตโนมัติ |
| ภาคผนวก | provenance/snapshot, สถานะทุกกฎพร้อม Golden entry/digest และ diagnostics, source diagnostics, catalog และข้อจำกัด |

F001 เป็นเลขอ่านง่ายภายในรายงานเดียว เมื่อเทียบข้ามรอบให้ใช้ Finding ID ซึ่งไม่เปลี่ยนเมื่อมีการเพิ่มบรรทัดหรือ comment รอบนอก

**ความเสี่ยงในการแก้** มาจาก [remediation guidance](../skills/agrimap-golden-lint-skills/assets/remediation.json) ของแต่ละกฎ: ต่ำ = แก้เฉพาะจุด, กลาง = ต้องตรวจ null/async/error path หรือย้ายไฟล์, สูง = อาจกระทบ public API, wire name, template หรือ database contract, ทบทวน = boundary ที่คนต้องตัดสิน ค่านี้เป็นความเสี่ยงทั่วไปของกฎ ไม่ใช่ verdict ของแต่ละจุด

## Prompt ในการ์ดของแต่ละกฎ

แต่ละ prompt ระบุสกิลที่ใช้ (`agm-be`, `agm-fe`, `agm-sql`), Golden entry, ตำแหน่งไฟล์/บรรทัดทั้งหมดของชุด, รูปแบบที่ควรเป็น, วิธีแก้, และข้อกำหนดเดียวกันทุกชุด:

- แก้เฉพาะตำแหน่งที่ระบุ ไม่ refactor ส่วนอื่น
- ข้ามและรายงานจุดที่กระทบ public API, JSON/wire name, route, template binding หรือ database contract
- ตรวจหลังแก้ตาม lane และสรุปไฟล์ที่แก้ จุดที่ข้าม และผลตรวจ โดยยังไม่ commit/push
- รัน report ใหม่พร้อม `--baseline` ชี้ report.json ของชุดนี้

กฎแบบ boundary review ไม่มี prompt เพราะต้องให้เจ้าของ contract ตัดสินก่อน Prompt เป็นข้อเสนอ สิทธิ์แก้โค้ดยังเป็นของงานและเจ้าของโครงการตามปกติ

## สรุปในแชท

stdout ของ `report` (และ `scan --format summary`) เป็นรูปแบบเดียวกันทุก host: สถานะและจำนวนรวม, ตารางรายกฎ, ไฟล์ที่พบมากที่สุด 10 ไฟล์ (บอกเสมอว่ากี่ไฟล์จากทั้งหมด), prompt ที่แนะนำให้เริ่ม และ path ของ report.md Agent ต้องวางสรุปนี้ตามที่ได้ ไม่สร้างตารางที่ไม่มีหัวคอลัมน์ และไม่ตัดผลจนผู้ใช้เข้าใจว่าเป็นรายการครบ

## บันทึกผลทบทวน

ใน review.json ใช้ status `todo`, `confirmed`, `exception`, `needs-evidence` หรือ `fixed-pending-rescan` สถานะอื่นนอกจาก todo ต้องมี reviewer, reason และ evidence; `fixed-pending-rescan` ต้องมี proposedChange และ verification ด้วย ข้อยกเว้นที่คนบันทึกไม่กลายเป็น accepted-exception ของ scanner และไม่ซ่อน finding

**PowerShell — อ่านอย่างเดียว เพื่อตรวจบันทึกทบทวน:**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs review-check --report '<bundle>/envelope.json' --report-id '<report-id>' --review '<bundle>/review.json'
```

**PowerShell — authorized external write: สำเนาใหม่ภายนอกโครงการที่รวมผลทบทวน**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs export --report '<bundle>/envelope.json' --report-id '<report-id>' --review '<bundle>/review.json' --to '<absolute-new-combined.md>' --authorize-output '<absolute-new-combined.md>' --format markdown
```

สำเนารวมแสดง review input digest และระบุว่าเป็น commentary ไม่ใช่ canonical verdict

## เก็บรายงานจาก scan เดิม

ถ้ามี canonical report จาก `scan` อยู่แล้ว ห่อเป็น [envelope](../examples/README.md) ที่ `protectedRoots` รายการแรกคือ scanned root แล้วใช้ save

**PowerShell — authorized external write: สร้างชุดรายงานตาม report ID ที่ระบุ**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs save --report '<envelope.json>' --report-id '<report-id>' --workspace '<absolute-scanned-root>' --authorize-output '<absolute-scanned-root>/.agrimap-agent/reports/golden-lint/<report-id>'
```

save ไม่อัปเดต index.md ให้ใช้ `report` เป็นวิธีหลัก

## รายงาน partial หรือไม่มี finding

รายงานแสดงกฎที่ blocked/error และ source diagnostics ครบในภาคผนวก และ “สรุปและลำดับการแก้” จะชี้ prerequisite ที่ต้องแก้ก่อน ผลว่างไม่ได้แปลว่าไม่มีไฟล์ผิด Golden เพราะบางกลุ่มยัง review-only หรือ not-implemented อ่านขั้นตอนแก้ใน [Troubleshooting](TROUBLESHOOTING.md)

Observations ใช้ข้อความคงที่และ hash ไม่คัดลอก source code, ค่าคงที่ หรือ secrets ลงรายงาน แต่ relative path และบรรทัดยังเป็นข้อมูลที่ควรเก็บเป็น private ตามนโยบายของโครงการ
