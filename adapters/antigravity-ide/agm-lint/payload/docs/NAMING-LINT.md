# ตรวจชื่อไฟล์ class และตัวแปรตาม Golden

[หน้าหลัก](../README.md) · [อ่านรายงานและติดตามแก้ไข](REPORTING.md) · [Coverage](../skills/agrimap-golden-lint-skills/references/COVERAGE.md)

ใช้เมื่ออยากรู้ว่าชื่อใดต่างจาก Golden และควรเริ่มตรวจตรงไหน รุ่น 0.1.5 ตรวจชื่อจาก syntax และตำแหน่งไฟล์ ไม่เดาความหมายทางธุรกิจจากคำว่า get/save/user ชื่อที่น่าสงสัยเป็น review-candidate จนยืนยันประวัติ ข้อยกเว้น และ consumers

## รูปแบบที่ตรวจได้

| ส่วน | ตัวอย่างที่ควรเป็น | สิ่งที่ต้องตรวจต่อ |
| --- | --- | --- |
| FE app component | user-list.component.ts / UserListComponent / agrimap-user-list | imported Angular decorator, templates และ legacy selectors |
| FE library component | user-list.ts / UserList / agrimap-user-list | ห้ามนำ suffix ของ app มาบังคับ library; ตรวจ public-api และ alias exports |
| FE type/interface/enum | UserConfig ไม่มี IUserConfig/TUserConfig; enum ใน .enum.ts และสมาชิก PascalCase | ชื่อเดิมอาจเป็น public contract |
| FE const กลาง | menuApp ใน shared/constants | ไม่เหมารวม provider const ซึ่งใช้ PascalCase |
| FE signal/input/output | ไม่มี _ prefix; input/output/model camelCase; output closed แทน onClose | import aliases, shadowing และ output alias/template bindings |
| FE RxJS variable/property | users$ สำหรับ declared Observable; searchSubject สำหรับ Subject | ตรวจเฉพาะชนิด/constructor ที่ import จาก rxjs ไม่เดา stream จากชื่อ |
| FE handler | onSelectItem แทน handleSelectItem | handle* เป็น candidate ต้องยืนยันว่าเป็น event handler และโค้ดใหม่ |
| BE types/dependencies | User / IUserRepository / _userRepository | dependency ต้องรับจาก constructor จริง; ไม่เหมารวม readonly state |
| BE members | SearchUser / DisplayName / Changed / enum member PascalCase | override/explicit interface implementations ไม่ถูกกล่าวหาจากการรักษา contract |
| BE async method | SearchUserAsync เมื่อ return type resolve เป็น runtime Task | ชื่อ Task ของ product ไม่ใช่ runtime Task; unresolved sites เป็น diagnostics |
| SQL objects/files | [agrimap_app].[USER_Q] ใน procedure/USER_Q.sql; table/USER.sql | deployed name/schema, deployment ordering และ owner exceptions |
| SQL columns/constraints/indexes | USER_ID, PK_USER, DF_USER_DEL_FLAG, IX_USER_NAME | ตรวจ lexical shape; ไม่พิสูจน์ว่า index จำเป็นหรือควรเปลี่ยน FK/ข้อมูล |

BE library ตรวจ type/interface/dependency/member/Task naming โดยไม่ใช้ namespace ของ web service มาบังคับ Shared library ไม่มีข้อกำหนดให้ camelCase ทุก local/parameter ใน normalized contract จึงไม่สร้างกฎนั้นขึ้นเอง

SQL suffix ที่คาดคือ _I/_U/_D/_Q/_CHECK_Q; suffix เช่น _COMMIT/_CLEANUP ต้องทบทวน owner evidence ไม่เปลี่ยนชื่อหรือสรุป business defect จาก suffix เพียงอย่างเดียว Lexer ข้าม strings, quoted identifiers และ nested comments; SQL ที่ lexer อ่านไม่ครบเป็น error/partial ไม่ใช่ตรวจแล้วผ่าน

## ใช้ผลอย่างไร

1. เปิดไฟล์ตามบรรทัด/คอลัมน์ในรายงาน แล้วเทียบข้อความสิ่งที่พบกับรูปแบบในตาราง
2. บันทึกชื่อ/รูปแบบที่เสนอ เหตุผล ผลต่อ consumers และข้อยกเว้นใน review.json หรือ review.md
3. เมื่อได้รับสิทธิ์แก้ product ในงานนั้นแล้ว เปลี่ยน declarations และจุดเรียกที่เกี่ยวข้องพร้อมกัน ทดสอบตาม lane แล้ว scan ใหม่

รายงานไม่คัดลอก source values หรือชื่อ identifiers ลง observation; path/line/column ใช้เปิดตำแหน่งจริง ส่วนตัวอย่างในคู่มือนี้เป็นชื่อสมมติ การ rename อาจเปลี่ยน imports, templates, public API, JSON หรือ database contracts จึงไม่มี autofix

## ขอบเขตที่ยังต้องใช้คนทบทวน

ยังไม่พิสูจน์ Boolean/verb ว่าสื่อความหมายถูก, framework ownership ทั้ง graph, flow/lifecycle, generated drift, public breaking changes, behavior equivalence, SQL relationships/transactions หรือ arbitrary owner exception ingestion กฎที่ยังไม่ทำแสดงใน catalog เสมอ การผ่าน tests ไม่เท่ากับ V002 ผ่านครบหรือ owner รับรอง precision/recall
