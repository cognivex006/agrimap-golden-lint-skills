# แก้ปัญหาการใช้งาน

[หน้าหลัก](../README.md) · [เริ่มใช้งาน](GETTING-STARTED.md) · [เลือกเวอร์ชัน](VERSIONS.md)

เริ่มจากดู exit code, `sourceDiagnostics` และ `rules[].diagnostics` เพื่อแยกว่าเป็นปัญหาการเรียกคำสั่ง แหล่งอ้างอิง หรือขอบเขตที่ยังตรวจไม่ได้

## เรียกสกิลไม่ขึ้น

ตรวจว่า host ติดตั้งจาก source ใด เปิด session ใหม่แล้วหรือยัง และรุ่นนั้นมี adapter จริงหรือไม่ ZIP ของ release 0.1.1 มี Node runner แต่ยังไม่มี host adapters ที่เตรียมไว้ใน working copy ดู [Installation](INSTALLATION.md)

หาก CLI ของ host ไม่มีคำสั่งตามตัวอย่าง ให้ตรวจ help ของรุ่นนั้นก่อน การใช้คำสั่งของ host อื่นหรือลบ cache ไม่ใช่ขั้นตอนแก้เริ่มต้น

## ตรวจได้บางส่วนหรือคำสั่งไม่ผ่าน

| อาการ / diagnostic | ตรวจอะไร | ทำอย่างไรต่อ |
| --- | --- | --- |
| `SOURCE_MISSING_OR_DRIFT` | path และ digest ของไฟล์เทียบ `source-lock.json` | เลือกแหล่งที่ตรง หรือส่งผู้ดูแลตรวจ compatibility; ไม่ rehash เพียงเพื่อให้ผ่าน |
| `SOURCE_DEPENDENCY_UNVERIFIED` | dependency ของกฎที่ระบุ | กฎนั้นถูกบล็อก; กฎอื่นที่มีแหล่งครบยังทำงานได้ |
| `SOURCE_PACKAGE_IDENTITY_MISMATCH` | Metadata ของ Golden และ source mode | ตรวจ root ของแหล่งสกิล; installed mode ใช้ plugin/extension manifest ได้ backend product ไม่ต้องมี package.json |
| `SOURCE_IDENTITY_MISSING` / `SOURCE_IDENTITY_INVALID` / `SOURCE_IDENTITY_MISMATCH` | Identity sources ที่รายงานและ metadata ที่เสีย/ขัดกัน | ใช้แหล่งที่มีชื่อ/version ตรง lock; ไม่ fallback รอบ metadata ที่ขัดกัน |
| `SOURCE_CHECKOUT_IDENTITY_MISSING` | Golden เป็น Git checkout จริงหรือไม่ | ใช้ mode ให้ตรงแหล่ง ไม่สลับ mode โดยซ่อนข้อจำกัด |
| `PARSER_MISSING` / `PARSER_UNTRUSTED-CONTENT` / `PARSER_UNAVAILABLE` | path, bytes และ version เทียบ `parser-lock.json` | เลือก parser ที่มีอยู่และตรง digest; หากต้องติดตั้งให้แยกเป็นงานตั้งค่า |
| `CSHARP_PARSER_MISSING_HOST` | ไม่ส่ง --dotnet | ระบุ existing trusted absolute dotnet host ที่อยู่นอก product/Golden roots |
| `CSHARP_PARSER_UNTRUSTED_RUNTIME_OR_HOST` | Host path หรือ packaged reader hashes ไม่ผ่าน | ตรวจ package/source ที่ตรงรุ่น ไม่ rebuild/rehash ระหว่าง scan |
| `CSHARP_PARSER_UNAVAILABLE` | Existing .NET 8 runtime หรือ process ของ reader ไม่พร้อม | ให้แยกการตั้งค่าเครื่องจากการ scan; ไม่รัน target build เพื่อแก้ |
| `CSHARP_CONDITIONAL_COMPILATION_CONTEXT_REQUIRED` | ไฟล์มี #if แต่ไม่มี build-symbol context | ไฟล์นั้น blocked; ตรวจด้วย context ที่ยืนยันแล้วเป็นงานต่อ ไม่เดาว่า branch ใด active |
| `ASYNC_SYMBOL_UNRESOLVED` | Task-shaped site ไม่ resolve จาก selected sources/runtime metadata | ยังไม่พิสูจน์ว่าปลอดภัยและไม่ยืนยันว่าเป็น Task; ทบทวน reference/implicit using context |
| `PARSE_ERROR` | ไฟล์และ syntax ตามภาษาจริง | กฎ/ไฟล์นั้นมี error; ให้เจ้าของโครงการตรวจด้วย tooling ของตน |
| `INPUT_DRIFT` | inventory/source ก่อนและหลัง | หยุดการเปลี่ยนไฟล์พร้อมกัน แล้วสั่ง scan ใหม่อย่างชัดเจน |
| Baseline `not-comparable` | analysis contract และ baseline health | ใช้หลักฐานที่เข้ากันได้; origin ที่พิสูจน์ไม่ได้ยังเป็น unknown |
| `OUTPUT_UNSAFE_OR_EXISTS` | protected roots, โฟลเดอร์แม่ และไฟล์ปลายทาง | เลือกไฟล์ใหม่ภายนอกทุก root พร้อมระบุสิทธิ์ปลายทางใหม่ |
| `INVALID_REPORT` / ID ไม่ตรง | payload, envelope และ IDs เดิม | ใช้รายงานต้นฉบับให้ถูก; explain/export ไม่ scan แทนให้ |
| ทุกไฟล์ถูก excluded | `coverage` และ layout ที่รองรับ | ระบุ root ให้ตรง หรือขอเพิ่ม classifier เป็นงานแยก |

บาง diagnostic มี suffix เป็น path เพื่อบอกตำแหน่งที่เกี่ยวข้อง ข้อความจริงอาจมี prefix ตามขั้นที่เกิด error

## Findings เยอะ หรือผลว่างผิดคาด

ดู denominator และ capability ใน `rules`/`catalog` ก่อน จำนวน candidate ไม่ใช่จำนวน defect เช่น valid Facade call อาจเป็น review candidate ได้ ส่วนกฎ `not-implemented` ไม่ได้ตรวจโค้ดครบแล้วไม่พบปัญหา อ่าน [Coverage](../skills/agrimap-golden-lint-skills/references/COVERAGE.md) และ [Workflow](WORKFLOWS.md)

## ขอบเขตของการแก้ปัญหา

Diagnostics ไม่อนุญาตให้ scanner ติดตั้ง dependency, รัน product scripts, เชื่อมฐานข้อมูล, แก้ Golden หรือ refactor โค้ดเอง path/write guards เป็นการป้องกันระดับ application ไม่ใช่ OS sandbox สำหรับต้าน process อันตรายที่เปลี่ยนไฟล์พร้อมกัน

## ชื่อที่ตรวจได้เป็น candidate หรือบันทึกรายงานไม่ได้

Naming ยังต้องตรวจ legacy/owner exception และ consumers ไม่ใช่คำสั่งให้ rename ทันที SQL_LEXICAL_CONTEXT_REQUIRED หมายถึง lexer อ่าน SQL ไม่ครบ ให้ตรวจ comments/strings โดยไม่ execute SQL

save ต้องใช้ scanned root เดิมเป็น protectedRoots รายการแรก ให้ --authorize-output ตรง .agrimap-agent/reports/golden-lint/report-id ที่เป็น directory ใหม่ OUTPUT_PATH_INDIRECTION ให้ตรวจ junction/symlink โดยไม่ย้ายหรือซ่อมเอง INVALID_REVIEW ให้ตรวจ reportId/findingId, status, reviewer/reason/evidence และข้อมูลอ่อนไหว แล้วใช้ review-check อีกครั้ง
