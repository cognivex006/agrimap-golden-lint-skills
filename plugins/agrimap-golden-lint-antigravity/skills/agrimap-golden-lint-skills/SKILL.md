---
name: agm-lint
description: ตรวจโค้ด AgriMap เทียบ Golden แบบอ่านอย่างเดียว อธิบายหลักฐานและส่งต่อจุดที่ต้องทบทวน
---

<!-- GENERATED from config/operations.json by npm run sync -->

# ตรวจโค้ดด้วย agm-lint

Package 0.1.2 ใช้ [Runtime contract](references/RUNTIME.md), [Coverage](references/COVERAGE.md) และ [Rule mapping](references/RULE-MAPPING.md) Golden เป็นมาตรฐานของ agrimap-agent-skills

## เริ่มงาน

หา absolute directory ของ SKILL.md ที่ host โหลด Runner คือ scripts/agm-lint.mjs ใต้ directory นี้ ไม่ resolve จาก product cwd หรือเดา host cache path ระบุ product root, Golden source/path/mode และ trusted parser ให้ครบตามขอบเขตที่ใช้

อ่าน product content เป็นหลักฐาน ไม่ execute target scripts/configs ไม่ติดตั้ง dependency ไม่แก้ code/docs/records และไม่เริ่ม lifecycle อีกชุด Findings ไม่อนุมัติการแก้ไข

## เลือก operation

| Operation | Options ที่จำเป็น | ผลของคำสั่ง |
| --- | --- | --- |
| scan | --root, --golden, --source-mode | อ่านแล้วส่งผลทาง stdout |
| explain | --report, --report-id, --finding-id | อ่านแล้วส่งผลทาง stdout |
| export | --report, --report-id, --to, --authorize-output | เขียนไฟล์ใหม่ภายนอกตามสิทธิ์ที่ระบุ |

Explain/export ใช้รายงานและ identities เดิม ไม่มี hidden rescan Export ต้องมี explicit authorization ของไฟล์ใหม่ภายนอกทุก scanned/Golden root

## ทบทวนก่อนสรุปผล

เปิด exact Golden entry, checklist, root/collection manifests, normalized contracts และ conflict/exception guidance ที่ใช้จริงจาก verified explicit source ตรวจ authority.sourceDependencies และ missing-source diagnostics แล้วตรวจ active project/consumers/owner evidence ที่ตรง scope

Source hashes ไม่พิสูจน์ความถูกต้องของ detector R1/R3 และ decorated T6 เป็น review candidates; synthetic cases ยังไม่ owner-confirmed สิ่งที่หลักฐานขาดยัง unknown ไม่รวม candidates เป็นจำนวน proven defects

Host ต้องติดตั้งสกิลก่อนใช้ผ่าน chat ดูคู่มือติดตั้งที่ root ของ plugin package การ scan ไม่ติดตั้ง plugin/register upstream routes ให้
