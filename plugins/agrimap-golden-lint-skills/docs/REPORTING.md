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

`.agrimap-agent` ถูก exclude จากการ scan เสมอ รายงานเก่าจึงไม่ปนเป็น product input ของรอบถัดไป ส่วน third-party.json เป็น governance input ที่อ่านแยกอย่างชัดเจน

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

## Third-party governance

ก่อนเสนอเพิ่ม/ใช้/อัปเดต/เผยแพร่ dependency, library, 3rd party หรือ SaaS ต้องศึกษาข้อกำหนดจากแหล่งทางการที่ตรงเวอร์ชัน แผนบริการ และการใช้จริง ครอบคลุม direct/transitive dependencies, bundled runtime/tools, licenses/notices, redistribution/source obligations, commercial restrictions, API/automation/scraping/rate limits, acceptable use, data/privacy/retention และกฎขององค์กรที่เกี่ยวข้อง รายการที่ใช้ไม่ได้กับกรณีนั้นให้บันทึกเหตุผล ไม่เดาว่าอนุญาตจากความเงียบของเอกสาร

เริ่มค้น inventory จาก manifests/lockfiles, vendored assets, integrations และการตั้งค่า SaaS แล้วให้ผู้ทบทวนยืนยันขอบเขต Scanner ยังไม่ค้น dependency graph หรือ SaaS ให้ครบอัตโนมัติ Package metadata เป็นจุดเริ่มค้น license ไม่ทดแทนการอ่านเงื่อนไข: ดู [npm package.json](https://docs.npmjs.com/cli/configuring-npm/package-json/) และ [NuGet nuspec](https://learn.microsoft.com/nuget/reference/nuspec)

แยก unknown จาก violation ที่มี clause และ usage evidence รองรับ Severity high/critical ใช้เมื่อมีข้อขัดชัดเจนซึ่งกระทบสิทธิ์ใช้งาน/แจกจ่ายอย่างมีนัยสำคัญ หรือฝ่าฝืนข้อจำกัดข้อมูล/ความปลอดภัยอย่างร้ายแรง กรณีไม่ชัดให้ needs-review และเสนอวิธีหาหลักฐาน ไม่สร้าง legal verdict อัตโนมัติ เสนอทางแก้ที่ทำได้ เช่นเปลี่ยนวิธีใช้/แผนบริการ, ขอสิทธิ์จากผู้ให้บริการ, เพิ่ม notices หรือถอด/เปลี่ยน dependency พร้อมผลกระทบและวิธีตรวจผล

### ทะเบียนและประวัติ

ไฟล์คงที่คือ `<root>/.agrimap-agent/reports/golden-lint/third-party.json` ตาม [governance schema](../schemas/governance.schema.json) Scan/report อ่านเองทุกครั้งโดยไม่ต้องส่ง baseline และไม่เขียนทะเบียน ทะเบียนเป็นข้อมูล ไม่ execute URL หรือคำสั่งที่อยู่ข้างใน รายงานเก็บสำเนา ledger พร้อม input digest จึงเปิดดู decision ย้อนหลังได้ แม้ working ledger เปลี่ยนแล้ว

1. รัน report เพื่อสร้าง bundle และ boundary `.agrimap-agent` ก่อน ใช้ snapshot.contentIdentity ของรายงานนั้นเป็น snapshotIdentity ของทะเบียน
2. เตรียม candidate JSON: schemaVersion=1, inventory `{complete, reviewer, evidence}`, assessments และ decisions ห้ามใส่ secrets หรือข้อมูลลูกค้าจริง หาก inventory ไม่ครบใช้ complete=false แม้ assessments ยังว่าง
3. assessment บันทึก subject ที่คงที่, kind, version/plan, usage/scope, checkedOn, reviewAfter (YYYY-MM-DD รวมวันสุดท้าย), reviewer, sources, outcome, severity, rationale, remediation และ verification Sources แต่ละรายการมี kind, official HTTPS url (ไม่มี credential/query/fragment), clause locator และ contentDigest ของเอกสารที่อ่านจริง เก็บหลักฐานการใช้ใน rationale/verification โดยไม่คัดลอกเงื่อนไขทั้งฉบับ
4. สร้าง assessmentId ด้วย `digest(payload)` จาก scripts/contracts.mjs โดย payload คือ assessment ทุก field ยกเว้น assessmentId; revision แรก previous=null รอบถัดไป previous=assessmentId ล่าสุดของ subject นั้น ห้ามแก้ revision เดิม การเปลี่ยน version/usage/terms หรือการยืนยันว่าแก้สำเร็จต้อง append assessment ใหม่พร้อม verification
5. รอ Owner ยืนยันก่อนสร้าง decision: assessmentId, action=fix|decline|reopen, owner, decidedOn, reason, evidence (อ้างคำสั่งหรือ decision ที่ยืนยันจริง), previous=decisionId ล่าสุดของ assessment นั้นหรือ null แล้วคำนวณ decisionId ด้วย digest(payload) เช่นเดียวกัน การใส่ชื่อ Owner ใน JSON ไม่ใช่หลักฐานว่าคนนั้นอนุมัติจริง Agent ต้องตรวจ authority และคำยืนยันจากบริบทที่เชื่อถือได้ ห้ามยก exception ใน review.json มาเป็นการยืนยัน governance โดยปริยาย

`digest` คือ SHA256 ของ canonical JSON (sort keys ทุกระดับ, indent 2, LF ท้ายไฟล์) ไม่ใช่ hash ของ JSON ที่จัดรูปแบบเอง ทดสอบตัวอย่าง synthetic และขั้นตอนคำนวณได้ใน source tests/governance.test.mjs; test fixture ไม่ใช่สิทธิ์ใช้งานของผู้ให้บริการจริง

**ช่องสนทนา Agent — บันทึกทะเบียนที่ Owner ยืนยันแล้ว:** ใช้ operation governance-update กับ envelope/report-id ของ bundle เดิม, `--governance <candidate.json>` และ `--authorize-output <root>/.agrimap-agent/reports/golden-lint/third-party.json` แบบ absolute path ตรงกัน คำสั่งนี้เขียนเฉพาะทะเบียน private ตรวจ schema, IDs, snapshot และประวัติที่ต้องเป็น prefix เดิมครบก่อนเขียนแบบ atomic replacement ไม่มี product/docs/changelog writes แล้วรัน report ใหม่เพื่อให้รายงานสะท้อนข้อสรุป (รายงานเดิมไม่ถูกเขียนทับ)

เก็บ memory/decision ของโครงการเป็น pointer ไป subject + assessmentId/decisionId และ report ID เมื่อ workflow ของโครงการรองรับ ให้ changelog ของงานแก้บอกผลที่เกิดขึ้นจริง ห้ามอ้างว่าแก้แล้วจาก decision=fix อย่างเดียว Lint ไม่เขียน memory/changelog ของ product เอง และไฟล์ private ที่ ignore ไม่ย้ายข้ามเครื่องอัตโนมัติ ต้องส่งต่อด้วยกลไกที่ Owner อนุมัติ

### Gate และการกลับมาแก้

| กรณี | ผล |
| --- | --- |
| ไม่มีทะเบียน / inventory ไม่ครบ / unknown / พ้น reviewAfter / snapshot เปลี่ยน | needs-review; ไม่สรุป compliance |
| high/critical violation ยังไม่มี decision หรือ reopen | blocked-owner |
| Owner เลือก fix | blocked-remediation จนมี assessment ใหม่ที่พิสูจน์ผลแล้ว |
| Owner เลือก decline | acknowledged-unresolved; จำเหตุผล/หลักฐานและยัง blocked สำหรับการใช้ที่ขัดเงื่อนไข |
| เงื่อนไขปัจจุบันมีหลักฐาน compliant และ inventory ครบ | reviewed ในขอบเขตที่ผู้ทบทวนยืนยัน |

หยุด affected action เช่นการใช้/ติดตั้ง/เผยแพร่ที่ขัดเงื่อนไข ไม่หยุดการอ่าน วิเคราะห์ หรือเตรียมแนวทางแก้ Owner decline ปิดการถามซ้ำเรื่องเดิม แต่ไม่อนุญาตละเมิดสิทธิ์บุคคลอื่นหรือข้อกำหนดที่ Owner ยกเว้นไม่ได้ Snapshot/terms/usage เปลี่ยนต้องเปิดทบทวนใหม่ โดย decision เดิมยังอยู่ในประวัติ รายการร้ายแรงเดิมที่ stale ยัง blocked ไม่ตกเป็น reviewed

หาก Owner เปลี่ยนใจให้ append decision=fix หรือ reopen พร้อม previous ที่ถูกต้อง เมื่อแก้จริงให้ append assessment ที่อ้าง revision เดิม พร้อมหลักฐานเงื่อนไข/การใช้ล่าสุดและผล verification รายงานจะเลือก revision ล่าสุดและไม่ใช้ decision จาก assessment เก่ามาอนุมัติ scope ใหม่ History ที่ขาด/ถูกแก้ถูกปฏิเสธโดย governance-update; report --baseline ที่มี ledger เดิมตรวจว่าประวัติยังอยู่ด้วย ไม่ลบทะเบียนเพื่อซ่อนปัญหา

### JSON / Markdown / exit code

Canonical report เพิ่ม governance แยกจาก findings/catalog/Golden authority: status, inputDigest, asOf, snapshotIdentity, ledger (ประวัติทั้งหมด), items (ผลปัจจุบัน), diagnostics Report.md และ summary.md แสดง gate, version/usage, clause/source digest, remediation/verification และ Owner decision; export Markdown/JSON ใช้ข้อมูลเดิม Review-update เปลี่ยนเฉพาะ human findings review ไม่เปลี่ยน governance gate Prompt แก้ทุกชุดเตือนตรวจทะเบียนก่อน affected action

`--governance-date YYYY-MM-DD` สำหรับ scan/report กำหนดวันประเมินที่ทำซ้ำได้ ค่าเริ่มต้นเป็นวันที่ UTC ของการรัน ใช้วันปัจจุบันในงานจริง ห้ามย้อนหลังเพื่อหลบ expiry วันที่นี้เป็น input ชัดเจนใน canonical report จึงอาจเปลี่ยน report ID ข้ามวัน แม้ source bytes เดิม ไม่มี network refresh; Agent ต้องตรวจ official terms อีกครั้งตามกำหนดหรือเมื่อได้รับแจ้งเปลี่ยนเงื่อนไข

Exit 4 = governance blocked (มีลำดับก่อน exit 3); exit 3 = scan partial หรือ governance needs-review; exit 0 = declared scan completed และ governance reviewed ภายในขอบเขตหลักฐาน; exit 2 = invalid/fatal input scanStatus ยังคงบอกเฉพาะสถานะ detector ไม่ปะปน governance status รายงาน Git target-ref ไม่ใช้ทะเบียน working tree มาอ้างว่าครอบคลุมอดีต จึง needs-review

ข้อจำกัด: ไม่ใช่ legal advice/automatic legal adjudication, ไม่พิสูจน์ความแท้ของผู้ลงชื่อ/ความครบของ inventory และ hash chain ป้องกันการแก้ผ่าน writer แต่ไม่ใช่ลายเซ็นหรือ immutable storage ของ OS หากลบทะเบียนและไม่ส่ง baseline ที่มีประวัติ scanner รู้เพียง not-assessed ต้องรักษา private records และ backups ตาม workflow ของ Owner
