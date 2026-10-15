# รายงานตรวจ AgriMap Golden

Report ID: `{{reportId}}`

## สรุปผล

{{summary}}

ยังสรุปว่าผ่าน Golden ทั้งหมดไม่ได้ จำนวน review candidates คือจุดให้ทบทวน ไม่ใช่จำนวน runtime bugs ที่ยืนยันแล้ว

## แหล่งอ้างอิงและ snapshot

{{provenance}}

## สถานะกฎและ diagnostics

{{rules}}

### Source diagnostics

{{sourceDiagnostics}}

## ดัชนีไฟล์ที่พบประเด็น

{{fileIndex}}

## รายละเอียดครบทุก finding

{{details}}

## ความสามารถทั้งหมดใน catalog

{{catalog}}

## รายการติดตาม

{{checklist}}

## ผลทบทวนเพิ่มเติม

ยังไม่มีผลทบทวนด้วยมือในข้อมูล scanner ชุดนี้ Agent/owner บันทึกเพิ่มในสำเนาสำหรับทบทวนโดยแยกจากผลอัตโนมัติ ใช้รูปแบบต่อไปนี้ทุกจุด และไม่แก้ canonical JSON เดิมเพื่อใส่ผลทบทวน

| Review ID | ไฟล์:บรรทัด | Golden entry / ID | สิ่งที่พบ / รูปแบบที่ควรเป็น | หลักฐานและข้อยกเว้น | สถานะ / ผู้ทบทวน |
| --- | --- | --- | --- | --- | --- |
| ยังไม่มีรายการ | — | — | — | — | ยังไม่ทบทวน |

## ข้อจำกัดและหลักฐานที่ยังขาด

{{limitations}}

ผลตรวจไม่อนุมัติการแก้โค้ด ประเมิน consumers, behavior/public/wire/data contracts และขอบเขต rollback ก่อนเสนอการแก้ทุกครั้ง
