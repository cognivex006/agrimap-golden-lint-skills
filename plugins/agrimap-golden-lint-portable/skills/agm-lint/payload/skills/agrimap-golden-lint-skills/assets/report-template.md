# รายงานตรวจ AgriMap Golden

{{header}}

## สรุปและลำดับการแก้

{{overview}}

ยังสรุปว่าผ่าน Golden ทั้งหมดไม่ได้ จำนวน review candidates คือจุดให้ทบทวน ไม่ใช่จำนวน runtime bugs ที่ยืนยันแล้ว ผล completed หมายถึงทำความสามารถที่ประกาศครบ ไม่ใช่ระบบถูกต้องทั้งหมด

## Third-party guardrails และ Owner decisions

{{governance}}

## แก้ทีละกฎ

การ์ดหนึ่งใบต่อกฎ เรียงตามตารางข้างบน แต่ละ prompt ครบในตัว คัดลอกไปวางในช่องสนทนาของ Agent ที่ติดตั้ง agrimap-agent-skills ได้ทันที (เช่น Codex `$agm-be`, Claude Code `/agrimap-agent-skills:agm-be`, Cursor `/agm-be`) Prompt เป็นข้อเสนอ ไม่อนุมัติ commit, merge หรือ deploy

{{ruleCards}}

## ดัชนีไฟล์ที่พบประเด็น

{{fileIndex}}

## Checklist ทุก finding

หนึ่งบรรทัดต่อ finding: ลำดับ · บรรทัด:คอลัมน์ · กฎ · Finding ID ความหมายของแต่ละกฎอยู่ในการ์ดของ “แก้ทีละกฎ” Checkbox ใช้ติดตามในสำเนานี้ได้ แต่ไม่เปลี่ยนผลของ scanner F001 เป็นเลขอ่านง่ายภายในรายงานเดียว เมื่อเทียบข้ามรอบให้ใช้ Finding ID

{{checklist}}

## ผลทบทวนเพิ่มเติม

ยังไม่มีผลทบทวนด้วยมือในข้อมูล scanner ชุดนี้ บันทึกผลใน review.json ของชุดรายงาน หรือเพิ่มในสำเนานี้โดยแยกจากผลอัตโนมัติ ไม่แก้ canonical JSON เดิมเพื่อใส่ผลทบทวน

| Review ID | ไฟล์:บรรทัด | Golden entry / ID | สิ่งที่พบ / รูปแบบที่ควรเป็น | หลักฐานและข้อยกเว้น | สถานะ / ผู้ทบทวน |
| --- | --- | --- | --- | --- | --- |
| ยังไม่มีรายการ | — | — | — | — | ยังไม่ทบทวน |

## ภาคผนวก

### แหล่งอ้างอิงและ snapshot

{{provenance}}

### สถานะกฎและ diagnostics

{{rules}}

### Source diagnostics

{{sourceDiagnostics}}

### ความสามารถทั้งหมดใน catalog

{{catalog}}

### ข้อจำกัดและหลักฐานที่ยังขาด

{{limitations}}

ผลตรวจไม่อนุมัติการแก้โค้ด ประเมิน consumers, behavior/public/wire/data contracts และขอบเขต rollback ก่อนเสนอการแก้ทุกครั้ง
