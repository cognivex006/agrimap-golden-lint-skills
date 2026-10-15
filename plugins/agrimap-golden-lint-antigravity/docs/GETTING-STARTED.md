# เริ่มใช้งาน AgriMap Golden Lint

[หน้าหลัก](../README.md) · [ติดตั้งตาม host](INSTALLATION.md) · [แก้ปัญหา](TROUBLESHOOTING.md)

เริ่มจากตรวจหนึ่งโครงการให้ได้รายงานก่อน แล้วค่อยใช้ baseline หรือส่งออกรายงาน

## 1. เลือกวิธีใช้

| วิธี | เหมาะกับ |
| --- | --- |
| Node runner จาก release ZIP | ต้องการตรวจผ่าน Terminal โดยไม่เพิ่มสกิลใน host |
| Node runner จาก source checkout | ผู้ดูแลหรือผู้ทดลอง working copy |
| สกิลใน Agent | ต้องการสนทนา อธิบายผล และส่งต่อข้อเสนอใน host ที่ใช้ |

รุ่น 0.1.2 มี runtime ZIP สำหรับ Node runner และ hosts ZIP สำหรับติดตั้งสกิล ส่วน runtime ZIP รุ่น 0.1.1 เดิมไม่มี host adapters ดูวิธีติดตั้งและผลตรวจแต่ละ host ใน [Installation](INSTALLATION.md) การติดตั้งเป็นงานตั้งค่าที่แยกจากการ scan

## 2. เตรียมสิ่งที่ต้องใช้

| สิ่งที่ต้องมี | ใช้ทำอะไร |
| --- | --- |
| Node 22+ | รัน scanner; หลักฐานการตรวจเดิมใช้ Windows / Node 26.7.0 |
| Lint package | ใช้ source checkout หรือ runtime ZIP ที่ตรวจ checksum แล้ว |
| โครงการเป้าหมาย | เช่น `agmwa-*`, `agmws-*`, `agmbo-*` หรือ library workspace ตาม layout ที่รองรับ |
| `agrimap-agent-skills` 4.11.0 | เป็นแหล่ง Golden; selected reference bytes ต้องตรง source lock ด้วย |
| TypeScript 5.9.3 ที่ตรง digest | ใช้เมื่อขอบเขตมี TypeScript syntax rules |

`<golden-package-root>` ต้องเป็นโฟลเดอร์ที่มี `package.json` และ `skills/agrimap-agent-skills/` ไม่ใช่โฟลเดอร์ `references/` หรือ root ของ lint package

เลือก source mode ให้ตรงกับแหล่งที่ใช้:

- `checkout`: แหล่ง Golden เป็น Git checkout ที่อ่าน commit/tree ได้
- `installed`: แหล่ง Golden เป็น package ที่ติดตั้งหรือแตกไฟล์แล้ว บันทึก version และ content digests โดยไม่อ้าง Git identity

Parser คือไฟล์ `lib/typescript.js` ที่มีอยู่แล้วและตรง `parser-lock.json` หากไม่มี parser กฎ syntax จะถูกบล็อก ส่วนกฎอื่นยังทำงานตามขอบเขตของตนได้ การ scan ไม่ติดตั้งหรือซ่อม prerequisites ให้

## 3. ทดลองตรวจหนึ่งโครงการ

เปิด **Terminal ที่ root ของ lint package** และแทน placeholder ด้วย path จริง คำสั่งนี้อ่านอย่างเดียวและส่ง JSON ออก stdout:

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan --root '<product-root>' --golden '<golden-package-root>' --source-mode checkout --typescript '<trusted-typescript.js>'
```

หากใช้ runtime ZIP ให้ตรวจ SHA-256 ก่อนแตกลงโฟลเดอร์ว่าง แล้วเปิด Terminal ที่ root ที่แตกไฟล์ ใช้คำสั่งเดียวกันได้โดยไม่รัน `npm run sync` ใน runtime artifact

หากใช้สกิล ให้เปิด session ใหม่หลังติดตั้ง แล้วบอก Agent ว่าต้องการตรวจโครงการใด พร้อม source mode/path และ parser เดียวกัน ดู [ตัวอย่างช่องสนทนา](COMMAND-COOKBOOK.md)

## 4. อ่านผลครั้งแรก

| ฟิลด์ | ดูอะไร |
| --- | --- |
| `scanStatus` | `completed` หรือ `partial` |
| `coverage` / `files` | เลือกไฟล์ใดและยกเว้นอะไร |
| `rules` | กฎใดประเมินแล้ว ถูกบล็อก หรือไม่เกี่ยวข้อง |
| `findings` | ตำแหน่งและหลักฐานของผลตรวจ |
| `sourceDiagnostics` / `limitations` | อะไรยังไม่ทราบหรือทำให้ตรวจไม่ครบ |

Exit 0 หมายถึงตรวจครบตามความสามารถที่ประกาศ แม้มี findings; exit 3 หมายถึงตรวจได้บางส่วน; exit 2 หมายถึงคำสั่งหรือ prerequisites ระดับ invocation ไม่ผ่าน ผลว่างไม่ได้ยืนยันว่าผ่าน Golden ทุกข้อ

## ทำอะไรต่อ

- ต้องการเข้าใจ finding: ใช้ `explain` กับรายงานเดิมตาม [Usage](USAGE.md)
- ต้องการเปรียบเทียบก่อน/หลัง: อ่าน [Workflow](WORKFLOWS.md)
- ต้องการไฟล์รายงาน: เตรียม envelope และปลายทางตาม [Examples](../examples/README.md)
