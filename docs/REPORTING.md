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

แต่ละ prompt ระบุสกิลที่ใช้ (`agm-be`, `agm-fe`, `agm-sql`), Golden entry, branch และตำแหน่งไฟล์/บรรทัดทั้งหมดของชุด แล้วสั่งงานเป็น 4 ขั้นเดียวกันทุกรายงาน:

| ขั้น | สิ่งที่ Agent ต้องทำ |
| --- | --- |
| 1. เตรียม branch | working tree ต้องสะอาด แล้วสร้าง `hotfix/golden-<กฎ>` จาก `origin/develop` ล่าสุด (หนึ่ง branch ต่อกฎ ทุกชุดของกฎเดียวกันใช้ branch เดิม) ห้ามแก้บน develop หรือ main ถ้าไม่มี develop ให้หยุดและถาม |
| 2. วิเคราะห์ก่อนแก้ | ยังไม่แก้ไฟล์ ตรวจผลกระทบตามขอบเขตของกฎ และจัดทุกจุดเป็น A แก้ได้ / B ไม่แก้ (กระทบ contract หรือข้อยกเว้น Golden) / C หลักฐานไม่พอ — ห้ามแก้ พร้อมวิธี investigate |
| 3. แก้เฉพาะกลุ่ม A | ตามรูปแบบและวิธีแก้ของกฎ แก้เฉพาะตำแหน่งที่ระบุ แล้ว build/test ตาม lane |
| 4. บันทึกผลกลับเข้ารายงาน | บันทึกทุกจุดใน review.json (A → fixed-pending-rescan, B หรือผู้ใช้ยืนยันไม่แก้ → exception, C → needs-evidence) แล้วรัน review-update ยังไม่ commit/push |

**ขอบเขตผลกระทบ** มาจาก remediation guidance ของแต่ละกฎ:

| ขอบเขต | ตัวอย่างกฎ | Prompt สั่งให้ |
| --- | --- | --- |
| ภายใน service | NULL-03, NULL-02, ERR-04, ASYNC-03, one-public-type | ตรวจ callers ในโครงการนี้ ค้นนอก service เฉพาะเมื่อจุดนั้นเป็น contract ที่ผู้อื่นใช้ ถ้าไม่พบผลกระทบภายนอกให้แก้กลุ่ม A ต่อได้ |
| อาจข้าม service | ASYNC-02, member-case, role-suffix, type-case, namespace, SQL/FE naming, library | ค้นชื่อที่จะเปลี่ยนใน services, agmwa-* apps (รวม generated-apis) และ shared libraries ที่มีในเครื่อง ระบุลำดับงาน (เช่น library ก่อน service, BE ก่อน regenerate FE client, SQL ก่อน BE) แล้ว **หยุดให้ผู้ใช้ยืนยันก่อนแก้ทุกครั้ง** |

แต่ละกฎระบุ "หลักฐานที่ต้องมีก่อนแก้" (เช่น NULL-03: type ไม่มี operator overload และไม่อยู่ใน expression tree) และ "วิธี investigate" เมื่อหลักฐานไม่พอ เพื่อให้กลุ่ม C มีขั้นตอนตรวจต่อที่ชัดเจน

กฎแบบ boundary review ไม่มี prompt เพราะต้องให้เจ้าของ contract ตัดสินก่อน Prompt เป็นข้อเสนอ สิทธิ์แก้โค้ดยังเป็นของงานและเจ้าของโครงการตามปกติ

## สรุปในแชท

stdout ของ `report` (และ `scan --format summary`) เป็นรูปแบบเดียวกันทุก host: สถานะและจำนวนรวม, ตารางรายกฎ, ไฟล์ที่พบมากที่สุด 10 ไฟล์ (บอกเสมอว่ากี่ไฟล์จากทั้งหมด), prompt ที่แนะนำให้เริ่ม และ path ของ report.md Agent ต้องวางสรุปนี้ตามที่ได้ ไม่สร้างตารางที่ไม่มีหัวคอลัมน์ และไม่ตัดผลจนผู้ใช้เข้าใจว่าเป็นรายการครบ

## บันทึกข้อสรุปกลับเข้ารายงาน

ทุกข้อสรุปต้องอยู่ใน review.json ของชุดรายงานนั้น และต้องสะท้อนกลับใน report.md เสมอ ไม่ปล่อยให้ checklist ค้างทั้งที่ตัดสินแล้ว:

| สถานการณ์ | status ใน review.json | ผลใน report.md |
| --- | --- | --- |
| แก้แล้ว รอ scan ยืนยัน | `fixed-pending-rescan` | checkbox ติ๊ก ไม่อยู่ใน prompt |
| ผู้ใช้ยืนยันว่าไม่แก้ หรือกระทบ contract | `exception` (reason บอกเหตุผลและผู้ยืนยัน) | checkbox ติ๊ก แสดงในตาราง "ข้อสรุปที่บันทึกแล้ว" ไม่อยู่ใน prompt |
| หลักฐานไม่พอ | `needs-evidence` (reason บอกวิธี investigate) | ห้ามแก้ ไม่อยู่ใน prompt จนกว่าจะมีหลักฐาน |
| ยืนยันว่าต้องแก้ | `confirmed` | ยังอยู่ใน prompt |

หลังแก้ review.json ให้รัน review-update operation นี้เขียนใหม่เฉพาะ report.md, review.md และ summary.md ของชุดนั้น (และ index.md) ไม่แตะ report.json, envelope.json หรือ review.json และใช้ได้เฉพาะ review.json ที่อยู่ในชุดรายงานเดียวกัน

**PowerShell — authorized report write: อัปเดตรายงานตามข้อสรุปใน review.json**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs review-update --report '<bundle>/envelope.json' --report-id '<report-id>' --review '<bundle>/review.json' --authorize-output '<absolute-bundle-directory>'
```

เมื่อรัน report รอบใหม่พร้อม `--baseline <bundle>/report.json` ข้อสรุปใน review.json ของ baseline จะถูกยกไปยังชุดใหม่ตาม Finding ID (reason ขึ้นต้นด้วย "[ต่อจาก report …]") ส่วนรายการที่เคยบันทึกว่าแก้แล้วแต่ scan ยังพบ จะกลับเป็น todo พร้อมหมายเหตุให้ตรวจอีกครั้ง

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
