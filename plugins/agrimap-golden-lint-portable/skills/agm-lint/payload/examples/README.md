# ตัวอย่างรายงาน

[หน้าหลัก](../README.md) · [คู่มือคำสั่ง](../docs/USAGE.md) · [Reporting](../docs/REPORTING.md)

ตัวอย่างนี้มาจาก sanitized fixture ที่มีครบทั้ง FE, BE, SQL และ library boundary ไม่ใช่จำนวน defect ของระบบจริง

| ไฟล์ | คืออะไร |
| --- | --- |
| [summary.md](summary.md) | สรุปแบบเดียวกับที่ Agent แสดงในแชท |
| [report.md](report.md) | รายงานเต็มจาก template ปัจจุบัน รวม prompt สำหรับแก้ไข |
| [report.json](report.json) | canonical report ตาม [report schema 1](../schemas/report.schema.json) |

report.md และ summary.md สร้างจาก report.json ชุดเดียวกันด้วย renderer ปัจจุบัน ไม่ใช่ผล scan ใหม่ การสร้างตัวอย่างใหม่เป็นงานดูแล source; runtime scan ไม่เขียนไฟล์ในโฟลเดอร์นี้

## Envelope สำหรับ explain/export

ชุดรายงานที่สร้างด้วย `report` มี `envelope.json` ให้แล้ว ถ้ามีเพียง JSON จาก `scan` ให้ห่อเป็นโครงนี้ก่อนใช้ explain/export/save:

```json
{
  "report": "แทนข้อความนี้ด้วย canonical report object ทั้งก้อน",
  "protectedRoots": ["<absolute-original-product-root>", "<absolute-original-Golden-root>"]
}
```

`--report` ของ explain/export/review-check รับ envelope ส่วน `--baseline` รับ report.json โดยตรง Absolute roots เป็น transport metadata นอก canonical report ผู้เรียกต้องรักษารายการให้ครบและถูกต้อง report hash ยืนยัน content identity แต่ไม่ได้ authenticate roots เหล่านี้

## อ่านตัวอย่างอย่างไร

ดูสถานะและ coverage ก่อน แล้วแยก `violation` จาก `review-candidate` สถานะ completed หมายถึงทำงานครบตามความสามารถที่ประกาศ ไม่ใช่ผ่าน Golden ทุกข้อ ดูความหมายของแต่ละหัวข้อใน [Reporting](../docs/REPORTING.md)
