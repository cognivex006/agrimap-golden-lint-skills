---
name: agm-lint
description: ตรวจโค้ด AgriMap เทียบ Golden แบบอ่านอย่างเดียว อธิบายหลักฐานและส่งต่อจุดที่ต้องทบทวน
---

<!-- GENERATED from config/operations.json by npm run sync -->

# ตรวจโค้ดด้วย agm-lint

Package 0.1.5 ใช้ [Runtime contract](references/RUNTIME.md), [Coverage](references/COVERAGE.md) และ [Rule mapping](references/RULE-MAPPING.md) Golden เป็นมาตรฐานของ agrimap-agent-skills

## เริ่มงาน

หา absolute directory ของ SKILL.md ที่ host โหลด Runner คือ scripts/agm-lint.mjs ใต้ directory นี้ ไม่ resolve จาก product cwd หรือเดา host cache path ระบุ product root, Golden source/path/mode และ trusted parser ให้ครบตามขอบเขตที่ใช้

อ่าน product content เป็นหลักฐาน ไม่ execute target scripts/configs ไม่ติดตั้ง dependency ไม่แก้ code/docs/records และไม่เริ่ม lifecycle อีกชุด Findings ไม่อนุมัติการแก้ไข

## เลือก operation

| Operation | Options ที่จำเป็น | ผลของคำสั่ง |
| --- | --- | --- |
| scan | --root, --golden, --source-mode | อ่านแล้วส่งผลทาง stdout |
| explain | --report, --report-id, --finding-id | อ่านแล้วส่งผลทาง stdout |
| export | --report, --report-id, --to, --authorize-output | เขียนเฉพาะปลายทางใหม่ที่ operation อนุญาต |
| save | --report, --report-id, --workspace, --authorize-output | เขียนเฉพาะปลายทางใหม่ที่ operation อนุญาต |
| review-check | --report, --report-id, --review | อ่านแล้วส่งผลทาง stdout |

Explain/export/save/review-check ใช้รายงานและ identities เดิม ไม่มี hidden rescan Export ใช้ไฟล์ใหม่ภายนอก roots; save รับ explicit authorization เฉพาะ .agrimap-agent/reports/golden-lint/report-id ตาม Reporting ส่วน scan ไม่เขียน records

## ทบทวนก่อนสรุปผล

เปิด exact Golden entry, checklist, root/collection manifests, normalized contracts และ conflict/exception guidance ที่ใช้จริงจาก verified explicit source ตรวจ authority.sourceDependencies และ missing-source diagnostics แล้วตรวจ active project/consumers/owner evidence ที่ตรง scope

Source hashes ไม่พิสูจน์ความถูกต้องของ detector R1/R3 และ decorated T6 เป็น review candidates; synthetic cases ยังไม่ owner-confirmed สิ่งที่หลักฐานขาดยัง unknown ไม่รวม candidates เป็นจำนวน proven defects

## C# prerequisites

เมื่อมี be-main C# scope ให้ระบุ existing trusted absolute --dotnet host ซึ่งอยู่นอก scanned/Golden roots ต้องมี .NET 8 runtime อ่าน [Backend lint](../../docs/BACKEND-LINT.md) ก่อนรัน ใช้ packaged digest-locked reader ไม่ build/restore target project และไม่ติดตั้ง prerequisites ระหว่าง scan

## Golden ที่ติดตั้งจริง

Installed mode อ่าน identity จาก package.json หรือ plugin/extension manifests ที่รองรับ ตรวจชื่อ/version และ selected reference hashes ห้ามให้ backend product เพิ่ม package.json เพื่อผ่าน identity gate หาก metadata ขัดกันต้องรายงานแหล่ง Golden ที่ผิดและบล็อกกฎตามจริง

## ส่งรายงานที่ไล่ตรวจได้

ใช้ [คู่มือรายงาน](../../docs/REPORTING.md) และ [report template](assets/report-template.md) สำหรับผลฉบับเต็ม แสดงทุกไฟล์/บรรทัดและทุก finding พร้อม Golden entry, observation kind, evidence, expected contract และสิ่งที่ยังขาด ห้ามสรุปเพียงตัวอย่างไม่กี่ไฟล์แล้วทำให้ผู้ใช้เข้าใจว่าเป็นรายการครบ

สรุป chat แยกจากรายงานเต็ม หากผู้ใช้ขอ artifact ให้ export ภายนอก protected roots หรือใช้ explicit save สำหรับ .agrimap-agent/reports/golden-lint/report-id ตาม Reporting หรือแสดงรายงานใน chat หากยังไม่มี destination authority แยก manual findings ลงตาราง review ต่างหาก ไม่ผสมเป็น scanner findings เมื่อไม่มี findings ต้องแสดง blocked/error/coverage แทนการสรุปว่าโครงการผ่านทั้งหมด

Host ต้องติดตั้งสกิลก่อนใช้ผ่าน chat ดูคู่มือติดตั้งที่ root ของ plugin package การ scan ไม่ติดตั้ง plugin/register upstream routes ให้
