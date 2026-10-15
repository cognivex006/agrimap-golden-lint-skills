# ตัวอย่างรายงานและการเก็บหลักฐาน

[หน้าหลัก](../README.md) · [คู่มือคำสั่ง](../docs/USAGE.md) · [Workflow](../docs/WORKFLOWS.md)

ดู [JSON](report.json) คู่กับ [Markdown](report.md) เพื่อเข้าใจโครงสร้างรายงาน ตัวอย่างนี้มาจาก sanitized fixture ไม่ใช่จำนวน defect ของระบบจริง และตรวจตาม [report schema 1](../schemas/report.schema.json)

## เก็บ report ให้ explain/export ใช้ต่อ

เมื่อได้รับ JSON จาก `scan` ให้ host เก็บ report ทั้งก้อน พร้อมทุก product/Golden root เดิม เป็น local envelope:

```json
{
  "report": "แทนข้อความนี้ด้วย canonical report object ทั้งก้อน",
  "protectedRoots": ["<absolute-original-product-root>", "<absolute-original-Golden-root>"]
}
```

นี่เป็นโครงตัวอย่าง ยังใช้เรียกคำสั่งไม่ได้จนกว่าจะแทน placeholder ด้วยข้อมูลจริง `--report` ของ explain/export รับ envelope นี้ ส่วน `--baseline` รับ canonical report JSON โดยตรง

Absolute roots เป็น transport metadata นอก canonical report ผู้เรียกต้องรักษารายการให้ครบและถูกต้อง report hash ยืนยัน content identity ไม่ได้ยืนยันความซื่อสัตย์หรือ authentication ของ caller

## อ่านตัวอย่างอย่างไร

ดู `scanStatus` และ coverage ก่อน แล้วแยก `violation` จาก `review-candidate` ตัวอย่างที่ completed หมายถึงทำงานครบตามความสามารถที่ประกาศ ไม่ใช่ผ่าน Golden ทุกข้อหรือพิสูจน์ว่าแก้ได้โดยไม่กระทบงาน

ไฟล์ report.json/report.md เก็บไว้เป็น fixture output ตามเดิม การปรับภาษาในคู่มือไม่สร้างผล scan ใหม่ การสร้าง fixture outputs ใหม่ทำเฉพาะงานดูแล source ที่ได้รับมอบหมาย; runtime scan ไม่เขียน examples นี้
