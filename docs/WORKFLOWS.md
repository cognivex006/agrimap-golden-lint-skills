# อ่านผล แก้ไข และตรวจซ้ำ

[หน้าหลัก](../README.md) · [คู่มือคำสั่ง](USAGE.md) · [ขอบเขตการตรวจ](../skills/agrimap-golden-lint-skills/references/COVERAGE.md)

วงจรปกติคือ ตรวจ → เลือกกลุ่มที่จะแก้ → ส่ง prompt ให้สกิลของ lane → ตรวจซ้ำพร้อม baseline → บันทึกข้อยกเว้น ทุกขั้นใช้ชุดรายงานใน `.agrimap-agent/reports/golden-lint` เป็นหลักฐาน

## 1. ตรวจและอ่านสรุป

สั่ง agm-lint ตรวจโครงการ (ดู [Command cookbook](COMMAND-COOKBOOK.md)) แล้วดูตามลำดับ:

1. **สถานะ** — `partial` หมายถึงมีกฎที่ยังตรวจไม่ได้ ให้แก้ prerequisite ใน diagnostics ก่อน แล้วตรวจใหม่ อย่าสรุปจากจำนวน findings อย่างเดียว
2. **ตารางรายกฎ** — เรียงจากความเสี่ยงในการแก้ต่ำไปสูง กลุ่มต่ำ เช่น NULL-03 เหมาะเป็นงานแรก
3. **ไฟล์ที่พบมากที่สุด** — ไฟล์เดียวอาจรวมหลายกฎ การแก้ทีละกฎทั่วทั้งโครงการมักตรวจทานง่ายกว่าแก้ทีละไฟล์

## 2. แยกสิ่งที่พบออกจากสิ่งที่พิสูจน์แล้ว

| Disposition | อ่านอย่างไร |
| --- | --- |
| `violation` | syntax ขัดกฎในขอบเขตที่ detector ประเมินได้ ผลกระทบของการแก้ยังไม่ทราบ |
| `review-candidate` | จุดที่ต้องยืนยัน symbol, ownership, applicability หรือ contract ก่อนแก้ |
| `accepted-exception` | ค่าที่ schema รองรับ แต่ runner ยังไม่รับ owner exception เข้ามาสรุปอัตโนมัติ |

ก่อนยืนยัน candidate ให้เปิด exact Golden entry ที่การ์ดของกฎในหัวข้อ “แก้ทีละกฎ” ระบุ (digest อยู่ในภาคผนวก) พร้อม checklist และ conflict guidance ของ lane นั้น แล้วตรวจ code, consumers และข้อยกเว้นจริง ตัวอย่างเช่น `inject(Facade)` ที่ถูกต้องอาจยังเป็น R1 candidate และ ViewChild ที่มี decorator ต้อง resolve Angular identity ก่อน

## 3. แก้ด้วย prompt จากรายงาน

1. เปิด report.md หัวข้อ “แก้ทีละกฎ” แล้วคัดลอก prompt จากการ์ดของกฎทีละชุด แต่ละกฎใช้ branch `hotfix/golden-<กฎ>` ของตัวเองที่แตกจาก developไปวางในแชทของ Agent ที่ติดตั้ง agrimap-agent-skills
2. สกิลจะวิเคราะห์ผลกระทบก่อน และจัดทุกจุดเป็น A แก้ได้ / B ไม่แก้ / C หลักฐานไม่พอ กฎที่อาจข้าม service จะหยุดให้คุณยืนยันตารางผลกระทบและลำดับงานก่อนแก้ ตรวจ diff และผล build/test ด้วยตนเอง
3. ทุกข้อสรุปต้องบันทึกใน review.json ของชุดรายงาน (แก้แล้ว → fixed-pending-rescan, ไม่แก้ → exception, หลักฐานไม่พอ → needs-evidence) แล้วรัน review-update ให้ report.md แสดงสถานะล่าสุด ถ้าคุณบอกว่าไม่แก้จุดใด สกิลต้องบันทึก exception พร้อมเหตุผลและผู้ยืนยัน ไม่ปล่อยรายการค้าง

ทำทีละ prompt ไม่รวมหลายกฎใน diff เดียว กลุ่มความเสี่ยงสูง (rename type/member, Async suffix, ย้ายไฟล์) ต้องตรวจ consumers, JSON/route และ public API ก่อนเสมอ โดยเฉพาะ library ที่มี consumers นอก workspace

## 4. ตรวจซ้ำพร้อม baseline

สั่งตรวจใหม่โดยใช้ report.json ของรอบก่อนเป็น `--baseline` เช่น ในแชท:

```text
$agm-lint ตรวจ <project-root> อีกครั้งโดยใช้ baseline <bundle>/report.json แล้วสรุปว่าจุดใดหายและมีจุดใหม่หรือไม่
```

| ผลเปรียบเทียบ | ความหมาย |
| --- | --- |
| `comparable` | analysis contract ตรงกันและ baseline ตรวจครบ ใช้จับ finding เดิมได้ |
| `not-comparable` | scanner/rules/source/parser ต่างกัน หรือ baseline เป็น partial — origin ยังเป็น unknown |
| `pre-existing` | finding เดิม แม้มีการเพิ่มบรรทัดหรือ comment รอบนอก |
| `introduced` | finding ในไฟล์ path ใหม่ภายใต้ contract เดียวกัน |
| `unknown` | หลักฐานยังแยกไม่ได้ว่าเป็นของเดิมหรือเกิดจากงานนี้ |

`removedFindingIds` ใน report.json คือ finding ของ baseline ที่ไม่พบในรอบนี้ Baseline จากรุ่น scanner อื่นจะเป็น `not-comparable` เสมอ ให้สร้าง baseline ใหม่ด้วยรุ่นเดียวกันก่อนเริ่มแก้ Rename/refactor และ edited-range matching ยังไม่รองรับ ผลปัจจุบันจะแสดงครบเสมอ ไม่ถูกซ่อนเพราะ baseline

`index.md` เก็บทุกรอบไว้ให้เห็นแนวโน้มของจำนวน findings และเลือก baseline ได้ง่าย

## 5. กรณีที่มี contract เดิม

Library facade/store islands, public aliases, OAuth redirect/HTML และ job ที่เปิด HTTP ต้องใช้หลักฐาน owner หรือ deployed contract ไม่สรุปจากชื่อหรือ signature อย่างเดียว SQL แยก naming ออกจาก business semantics: seed, index, cascade, replace semantics และข้อความ error ต้องตรวจ owner/schema/caller evidence

## 6. ส่งต่อให้เจ้าของโค้ด

เมื่อยังไม่แก้เองหรือต้องให้เจ้าของตัดสิน ให้ส่ง summary.md หรือ report.md พร้อมคำตอบสองข้อต่อกลุ่ม:

- **Impact:** แก้แล้วกระทบอะไร — `no-effect-proven`, `internal-effect`, `external-effect` หรือ `unknown`
- **Manageability:** คุมความเสี่ยงได้หรือยัง — `manageable`, `unmanageable-with-current-evidence` หรือ `unknown`

Static detectors เริ่มทั้งสองค่าที่ unknown การบอกว่า no-effect ต้องพิสูจน์ behavior/public/wire/data observables การ build/test ผ่านหรือ diff เล็กอย่างเดียวไม่พอ แนบ consumers, equivalence obligations และ containment/rollback ตามจริง

agm-lint เป็นตัวช่วยอ่านอย่างเดียว ไม่แทน lane skills และไม่เริ่ม workflow ของโครงการเอง ดูวิธีบันทึกผลทบทวนใน [Reporting](REPORTING.md) และกฎตั้งชื่อใน [Naming lint](NAMING-LINT.md)

## Owner decision สำหรับ third party

ศึกษาเงื่อนไขและบันทึก governance ก่อน affected action ใช้ [decision loop](REPORTING.md#third-party-governance) แยกจาก finding exception ร้ายแรงที่ยืนยันแล้วต้องรอ Owner fix/decline บันทึก decision ด้วย governance-update และ report ใหม่เพื่อแสดงผล รอบถัดไปอ่านทะเบียนเอง ไม่ต้องพึ่ง memory ของแชท เมื่อ Owner ต้องการแก้ย้อนหลัง append fix/reopen และ assessment ใหม่หลังตรวจผล ไม่ลบประวัติ
