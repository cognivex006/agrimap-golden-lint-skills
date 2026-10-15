# ข้อกำหนดการพัฒนา AgriMap Golden Lint

<!-- AGM-MAINTAINER-ONLY -->
<!-- Consumer scans do not activate maintainer workflow. -->

ใช้กับงานพัฒนา/ทดสอบใน source repository นี้ที่ได้รับมอบหมายโดยตรง การใช้สกิลที่ติดตั้ง การ scan ของผู้ใช้ และการอ่าน reference ไม่เปิด maintainer workflow คำสั่งผู้ใช้และลำดับอำนาจของ host มีผลเหนือเอกสารนี้

## เริ่มงาน

อ่าน [DEVELOPMENT.md](DEVELOPMENT.md), canonical config/assets/schemas ที่เกี่ยวข้อง และ exact Golden references ของงาน รักษางานแก้เดิมและ specification history ที่เป็น immutable input Golden เป็นมาตรฐานของ agrimap-agent-skills; local bindings ไม่มีสิทธิ์นิยามใหม่

## แก้ต้นฉบับและตรวจผล

อัปเดต canonical user docs ที่ได้รับผลและ CHANGELOG.md ใน Unreleased ให้ตรงงานที่ทำ ใช้ภาษาและโครงสร้างตาม documentation contract ใน DEVELOPMENT แล้วรัน npm run sync เพื่อสร้าง mirrors/adapters ห้ามแก้ generated copies โดยตรง

ตรวจ behavior, safety, schema และเอกสารให้พอดีกับงาน รายงาน passed/failed/not-run พร้อมข้อจำกัดตามจริง การผ่าน tests หรือ packaging ไม่ใช่หลักฐานว่าตรวจ Golden ได้ถูกต้องครบ

## ขอบเขตระหว่าง scan กับการพัฒนา package

Runtime scan อ่านและรายงานเท่านั้น แม้รันจาก source checkout ไม่เปลี่ยน product code/docs/changelog/bootstrap/Git records, installations หรือ Golden แหล่ง/tool ที่ขาดเป็น scoped diagnostic ไม่ใช่สิทธิ์ติดตั้งหรือซ่อม ไม่มี SQL/database execution, external messages หรือ uploads

งานพัฒนา package ครอบคลุม local sources/tests/docs ที่ได้รับมอบหมาย ส่วน bump, install, commit, push, merge, tag และ publication ต้องมีคำสั่งที่อนุมัติการกระทำนั้น การดูแล Unreleased ไม่อนุมัติ release ใหม่

งาน implementation แรกอยู่ feature/golden-lint-v002 โดยไม่ commit/push ต่อมาผู้ขออนุมัติ source/runtime release 0.1.1 โดยเฉพาะ ประวัตินี้ไม่อนุมัติ release ถัดไปและไม่พิสูจน์ server protection

## ส่งมอบงาน

แยกสิ่งที่ทำจริง, docs/changelog ที่แก้, ผลตรวจ, ข้อจำกัด และ repository actions ไม่สรุปว่า V002 ผ่านทั้งหมดเมื่อพิสูจน์ได้เพียงบางส่วน

AGENTS.md, DEVELOPMENT.md และ source maintainer guides อยู่นอก runtime artifacts หากพบไฟล์เหล่านี้ใน source archive ก็ยังใช้เฉพาะงานผู้ดูแลที่ได้รับมอบหมาย
