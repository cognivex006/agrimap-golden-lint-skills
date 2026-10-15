# สร้างรายงานเพื่อไล่ตรวจรายไฟล์

[หน้าหลัก](../README.md) · [Workflow](WORKFLOWS.md) · [ตัวอย่างรายงาน](../examples/README.md)

ใช้เมื่อต้องการเห็นทุกไฟล์และทุกจุดที่ scanner พบ พร้อมแยกผลอัตโนมัติจากการทบทวนของ Agent/owner รุ่น 0.1.3 ใช้ [report template](../skills/agrimap-golden-lint-skills/assets/report-template.md) เดียวกันสำหรับ Markdown export และตัวอย่างรายงาน

## รายงานต้องมีอะไร

| ส่วน | ใช้ตรวจอะไร |
| --- | --- |
| สรุปผล | completed/partial, จำนวน selected/excluded, violations, candidates และไฟล์ที่พบประเด็น |
| Source และ snapshot | branch/HEAD, working-tree หรือ immutable mode, content identity, Golden version และ manifest ที่ใช้ |
| สถานะกฎ | denominator, evaluated, failed, blocked และ diagnostics ของทุกกฎ แม้ไม่มี findings |
| ดัชนีไฟล์ | ทุกไฟล์ที่มี finding พร้อมบรรทัด/คอลัมน์และลิงก์ F001, F002 ฯลฯ |
| รายละเอียด findings | ทุก finding มี ID, exact Golden entry/digest, สิ่งที่พบ, contract ที่ควรเทียบ, evidence level, confidence และสิ่งที่ยังขาด |
| Catalog | กฎที่ automated/review-only/not-implemented ให้เห็นสิ่งที่ยังไม่ได้ตรวจ |
| รายการติดตาม | Checkbox หนึ่งรายการต่อ finding ใช้ในสำเนารายงานสำหรับทบทวน |
| ผลทบทวนเพิ่มเติม | ตารางแยก manual review โดยบันทึกไฟล์/บรรทัด กฎ หลักฐาน ข้อยกเว้น และผู้ทบทวน |

F001 เป็นเลขอ่านง่ายภายใน report เดียว หากเทียบข้ามครั้งให้ใช้ findingId และ analysis contract ไม่ใช้เลขลำดับนี้แทน identity

## แยกตัวเลขให้ตรงความหมาย

C# namespace findings แยกชนิด `namespace-declaration` และ `namespace-reference` โดยชนิดหลังเป็น using reference จุดอ้างอิงที่ต้องทบทวนไม่เท่ากับไฟล์ที่ประกาศ namespace ผิด จำนวน findings อาจมากกว่าจำนวนไฟล์

`review-candidate` ยังไม่ใช่ confirmed defect ส่วนไฟล์ที่ไม่พบ finding อาจมีปัญหาในกฎที่ยัง not-implemented หรือ blocked ได้ การตรวจ C# ในรุ่นนี้ยังไม่ automate nullable suppression หรือการนับ public types จึงไม่ควรสรุปว่าผ่านข้อเหล่านั้นจาก scanner

## สร้าง Markdown จากผลเดิม

เก็บ canonical report และทุก protected root เป็น [envelope](../examples/README.md) แล้วระบุปลายทางใหม่ภายนอก product/Golden roots **PowerShell — authorized external write:**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs export --report '<envelope.json>' --report-id '<report-id>' --to '<absolute-new-report.md>' --authorize-output '<absolute-new-report.md>' --format markdown
```

คำสั่งใช้ผลเดิม ไม่ scan ซ้ำ หากต้องการ JSON ใช้ --format json เก็บคู่กับ Markdown เพื่ออ้าง identities และ evidence ที่ครบถ้วน การ export ไม่รับ destination ภายใน scanned/Golden roots ไม่สร้างโฟลเดอร์แม่หรือเขียนทับไฟล์เดิม

## สิ่งที่ Agent ควรส่งกลับ

เมื่อผู้ใช้ขอรายงาน ให้ใช้ template นี้ แสดง summary และลิงก์ไฟล์รายงานเต็มหากข้อความยาว ดัชนีและรายละเอียดใน artifact ต้องมีทุก finding ไม่ตัดเหลือเพียงตัวอย่าง 3–5 ไฟล์ หากยังไม่มีสิทธิ์เขียนปลายทางให้ส่งรายงานเต็มในช่องสนทนาหรือขอปลายทางตามขอบเขตงาน

แยก manual observations ออกจากผล scanner ไม่เพิ่มเข้า canonical JSON เดิมและไม่อ้างว่าถูกตรวจอัตโนมัติ รายการ manual ต้องมีตำแหน่ง กฎ หลักฐานและสถานะที่ชัดเจน ไม่แสดง raw secrets หรือ source excerpts ที่ไม่ได้รับอนุญาต

Checkbox เป็นเครื่องช่วยติดตามในสำเนา Markdown ไม่ใช่การเปลี่ยน disposition ของ canonical finding เมื่อตัดสินว่าเป็น exception ให้แนบ owner evidence และขอบเขตที่อนุมัติ

## รายงาน partial หรือ findings ว่าง

ต้องแสดงกฎที่ blocked/error และ source diagnostics ให้ครบ ห้ามแทนด้วยสรุปว่าไม่มีไฟล์ผิด format Identity ของ Golden เป็น metadata ของแหล่งสกิล ไม่ใช่ requirement ว่า backend product ต้องมี package.json อ่านขั้นตอนแก้ใน [Troubleshooting](TROUBLESHOOTING.md)
