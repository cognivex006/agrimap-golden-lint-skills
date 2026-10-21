# หลักฐาน implementation และการตรวจ

<!-- AGM-MAINTAINER-ONLY -->

[วิธีพัฒนา](../DEVELOPMENT.md) · [แผนที่ source](MAINTAINING.md) · [หน้าหลัก](../README.md)

หน้านี้แยกหลักฐานของ working copy จาก release เดิม ตัวเลข tests และผล scan ย้อนหลังอ้างอิงช่วงงานที่ระบุ ไม่ใช่การรับรอง conformance ทั้งหมด

## Release 0.1.10 — 2026-10-21

Owner แก้เลข candidate ที่ยังไม่เผยแพร่จาก 0.1.20 เป็น 0.1.10 และอนุมัติ release ใหม่ รวม commit/merge เข้า main, annotated tag v0.1.10 และ GitHub release พร้อม runtime/hosts ZIP และ SHA256SUMS งานเพิ่ม read-only governance evaluation แยกจาก Golden: official-source/clause/digest evidence, inventory attestation, snapshot/date freshness, severe-conflict gates, append-only Owner decisions และ reopen/remediation verification เขียนได้เฉพาะ private ledger ผ่าน governance-update ที่มี authorization; scan ไม่เขียนอะไร Report JSON เก็บประวัติเต็ม ส่วน report.md/summary.md/index.md/prompts แสดงสถานะและวิธีดำเนินการ

ผลตรวจ candidate: sync/validate/diff check ผ่าน และ npm test 107/107 ไม่มี failed/skipped ด้วย existing digest-matching TypeScript 5.9.3 และ existing dotnet host เพิ่ม governance regression 8 cases รวม no-baseline recall, decline/reopen/fix, prevention of severe-conflict downgrade, expiry/snapshot invalidation, append-only history, CLI write authority และ legacy reports Docs/changelog และ generated host bundles อัปเดตพร้อมกัน; Golden lock 5.0.2 คงเดิมและไม่เปลี่ยน Golden bindings/coverage

Release artifacts ต้องตรวจ archive entries และ bytes เทียบ release commit พร้อมตรวจ remote tag/asset checksums การลบ V001 ที่ค้างก่อนเริ่มงานไม่รวมใน commit; .agrimap-agent ไม่ถูก track หรือแจกจ่าย ไม่ติดตั้ง dependencies/host profiles และไม่อ้างว่าได้พิสูจน์ legal compliance จริง, Owner signature, native host activation หรือ Golden conformance ครบทุกข้อ

## แก้ repository identity และเผยแพร่ tags เดิมใหม่ — 2026-10-20

ผู้ขอสั่งแก้ชื่อเจ้าของ repository เป็น `cognivex006` ทั้ง main และ tags เดิม และอนุมัติให้ลบ release/tags เก่าแล้วเผยแพร่ใหม่ ใช้เลขรุ่นเดิม 0.1.1–0.1.9 เก็บ parent commits เดิมไว้ และแก้ URL ใน specification เฉพาะชื่อเจ้าของตามคำสั่งล่าสุด ไม่เปลี่ยน commit pin หรือข้อกำหนด Golden การลบ V001 ที่ค้างอยู่ก่อนเริ่มงานไม่รวมใน commit

แต่ละ tag ใช้ source ของรุ่นนั้น แก้ canonical URLs และสร้าง mirrors ด้วย sync โดยไม่ยก scanner รุ่นใหม่ไปแทนรุ่นเก่า Release assets ที่เผยแพร่ใหม่ใช้ 0.1.9; tags เก่ารุ่นอื่นยังเป็น source tags

ผลตรวจรอบแก้ identity: main ผ่าน sync, sync --check, validate, diff --check และ tests 99/99 ไม่มี failed/skipped โดยใช้ TypeScript parser ที่ตรง digest และ dotnet host ที่มีอยู่ การผ่านชุดนี้ไม่รับรอง Golden conformance ทุกข้อ ไม่ได้ทดสอบ native host activation ในงานนี้

## Release 0.1.9 — 2026-10-20

ย้ายปลายทางไป `cognivex006/agrimap-golden-lint-skills` ตามคำสั่งผู้ขอ พร้อมแก้ canonical repository/install links, author metadata และสร้าง host mirrors ด้วย sync โดยไม่เปลี่ยน scanner, detectors, schemas หรือ trust locks คง tag/history เดิมและไม่รวมการลบ specification ที่ค้างอยู่ก่อนเริ่มงานใน release commit

ผลตรวจ: sync, sync --check, validate และ diff --check ผ่าน; npm test รอบแรกขาด TypeScript parser จึงผ่าน 71, failed 5, skipped 23 จากนั้นเลือก parser ที่มีอยู่และ hash ตรง lock พร้อม dotnet host แล้วรันใหม่ผ่าน 99/99 ไม่มี failed/skipped ตรวจ GitHub API ของ repo ใหม่พบ workflow 0 รายการ ไม่ได้ติดตั้ง dependency หรือ host profiles และไม่ได้พิสูจน์ Golden conformance ครบทุกข้อ

## Release 0.1.8 — 2026-10-18

ผู้ใช้กำหนดให้ prompt แก้ไขทุกรายงานใช้ branch hotfix/* จาก develop, วิเคราะห์ผลกระทบข้าม service ก่อนแก้เฉพาะกฎที่เกี่ยวข้อง, ห้ามแก้จุดที่หลักฐานไม่พอ และต้องบันทึกข้อสรุปกลับเข้ารายงานเมื่อผู้ใช้ตัดสินใจไม่แก้ จึงเพิ่ม delivery และ impact/evidence/investigate ใน remediation.json, prompt 4 ขั้น, operation review-update และการยกข้อสรุปตาม baseline Detector/scanner/reader ไม่เปลี่ยน

ผลตรวจ: sync/sync --check/validate ผ่าน; npm test 99/99 (เพิ่ม 4) ไม่มี failed/skipped; ทดลองวงจรครบบนสำเนาโครงการจริง (บันทึก exception/needs-evidence/fixed-pending-rescan แล้ว review-update ทำให้ 3 จุดออกจาก prompt และแสดงในตาราง "ข้อสรุปที่บันทึกแล้ว"; report --baseline ยกข้อสรุปมา 3 รายการ และจุดที่เคยแก้แต่ยังพบกลับเป็น todo); report บนโครงการจริงได้ 308 findings ID และตำแหน่งตรงกับ 0.1.6 และ git status ของโครงการก่อน/หลังเหมือนเดิม report.md ใหญ่ขึ้นจาก 110 เป็น 174 KB เพราะ prompt 14 ชุดมีขั้นตอน 4 ขั้นครบในตัว Release นี้ผู้ใช้อนุมัติล่วงหน้าให้ commit, push, merge เข้า main, annotated tag v0.1.8 และ GitHub release

## Release 0.1.7 — 2026-10-17

จากการทบทวนรายงานจริงของ 0.1.6 (agmws-dynamic-dashboard-netcore, 308 findings): ประโยค observation 10 แบบถูกพิมพ์ซ้ำทุก finding (~50 KB), คำแนะนำรายกฎซ้ำกับ prompt, ข้อมูลที่เหมือนกันทุกกฎ (impact/manageability, obligations, evidence) ซ้ำ 9 ครั้ง, คำอธิบายกฎอยู่ท้ายรายงานหลัง prompt และ review.md มีบล็อก placeholder 308 ชุด

ปรับเฉพาะ renderer/template/review.md (อยู่นอก analysis contract): รวมสรุปกับลำดับการแก้, การ์ดหนึ่งใบต่อกฎที่รวม prompt, checklist บรรทัดสั้น, entry digest ย้ายไปภาคผนวก, review.md เป็นตาราง และ prompt ใช้ baseline path แบบ relative

ผลตรวจ: sync/sync --check/validate ผ่าน; npm test 95/95 (เพิ่ม 2) ไม่มี failed/skipped; report บนโครงการจริงด้วย working copy ได้ 308 findings ID และตำแหน่งตรงกับ 0.1.6 ทุกตัว report.md 170 → 110 KB, review.md 215 → 26 KB และ git status ของโครงการก่อน/หลังเหมือนเดิม Baseline จาก 0.1.6 ยัง not-comparable เพราะ scannerVersion อยู่ใน analysis contract แม้ Finding IDs ตรงกันทุกตัว Release นี้ผู้ใช้อนุมัติ commit, push, merge เข้า main, annotated tag v0.1.7 และ GitHub release

## Release 0.1.6 — 2026-10-17

ปัญหาที่พบจากการใช้งานจริงของ 0.1.5 บน agmws-dynamic-dashboard-netcore: Agent ต้อง redirect JSON ไป Temp และสร้าง envelope เอง ไม่มีรูปแบบสรุปในแชทที่กำหนดไว้ (จึงได้ตารางไม่มีหัวคอลัมน์ทีละไฟล์) ไม่มี prompt แก้ไข, ASYNC-02/ASYNC-03 ไม่ resolve `Task` เพราะไม่รู้ ImplicitUsings (diagnostics 41 จุด), `!` ที่ต่อกันรายงานคอลัมน์เดียวกัน (22 ตำแหน่งซ้ำ) และ Cursor โหลด skill ไม่ได้เพราะชื่อโฟลเดอร์ไม่ตรงชื่อ skill

แก้โดยเพิ่ม operation `report` และ `scan --format summary`, แยก renderer/remediation guidance ออกจาก analysis contract, ออกแบบ report.md ใหม่พร้อม prompt แก้ไขรายกฎ, เพิ่ม reader protocol 2 (per-project SDK implicit usings, operator-token location) และ portable plugin สำหรับ Cursor/Agent Skills ที่แทน adapters/antigravity-ide

Reader rebuild แบบ offline ด้วย SDK 8.0.426 และ Roslyn 4.11.0.0 เดิม: build Reader.cs เดิมได้ DLL ตรง lock ทุก byte ก่อนแก้ จากนั้นมีเพียง AgriMap.Lint.CSharp.dll และ source digest ใน csharp-parser-lock.json ที่เปลี่ยน ไฟล์ Roslyn/resources คงเดิม

ตัด Roslyn culture satellites (26 ไฟล์ใน 13 folders) ออกจาก reader bundle: Reader.cs ใช้เฉพาะ `Diagnostic.Id` และ case codes คงที่ ไม่เรียก `GetMessage` และ exception ทุกกรณีเป็น `CSHARP_READER_FAILED` Rebuild ด้วย SDK 8.0.426 bincore เดิมได้ AgriMap.Lint.CSharp.dll และ Roslyn DLLs ตรง lock ทุก byte เปลี่ยนเฉพาะ deps.json, digest ของ build-csharp.mjs และรายการไฟล์ใน lock; rebuild ซ้ำได้ lock เดิม runtime/csharp 32 → 25 MB, แต่ละ host bundle 32 → 26 MB ผลตรวจ: sync/sync --check/validate ผ่าน, npm test 93/93 (AGM_LINT_TYPESCRIPT 5.9.3, AGM_LINT_DOTNET) และ `scan --format summary` บน agmws-dynamic-dashboard-netcore ตรงกันทุก byte ทั้ง checkout, installed และ portable payload (308 findings ใน 50 ไฟล์); JSON ต่างเฉพาะ `analysisContract.csharp.bundleDigest` และ `reportId` ที่ derive จากมัน ไม่ได้ทดสอบบนเครื่องที่ UI culture เป็นภาษาที่เคยมี satellite (เช่น de-DE)

ผลตรวจ: sync/validate ผ่าน; npm test ผ่าน 93/93 (86 เดิม + 7 ใหม่) ไม่มี failed/skipped โดยตั้ง AGM_LINT_TYPESCRIPT (5.9.3 digest ตรง) และ AGM_LINT_DOTNET บนโครงการจริงเดิม scan ด้วย bundle ที่ generate แล้วจาก cwd อื่น: completed, Finding IDs เดิม 270 รายการยังอยู่ครบ, เพิ่ม ASYNC-02 33 จุดและ ASYNC-03 5 จุด (สุ่มตรวจ ASYNC-03 ทั้ง 5 จุดใน source เป็น `GetAwaiter().GetResult()`, `.Result`-shaped call และ `await Task.FromResult` จริง), unresolved async diagnostics 41 → 2, ตำแหน่งซ้ำ 22 → 0 รวม 308 findings ใน 50 ไฟล์ บันทึกชุดรายงานใน .agrimap-agent ของโครงการนั้นโดย `git status` ก่อน/หลังเหมือนเดิม portable payload ให้ผลเดียวกัน

ยังไม่ได้ทดสอบ: การติดตั้งและเรียกใช้จริงใน Cursor, Gemini และ Antigravity Release นี้ผู้ใช้อนุมัติ commit, merge เข้า main, annotated tag v0.1.6 และ GitHub release พร้อม runtime/hosts ZIP และ SHA256SUMS แล้วจึงอัปเดต Codex/Claude ที่ติดตั้งในเครื่องเป็นงานแยกหลังเผยแพร่

## Working copy 0.1.5 — 2026-10-16

เพิ่ม naming detectors 11 ตัว รวม automated 26 ตัวและ boundary review 4 ตัวใน catalog 30 families แยก FE app/library naming, C# member/runtime-Task Async naming และ SQL lexical object/file/schema/column/constraint/index shape โดยรักษา new/touched/legacy และ public compatibility เป็น review-candidate/unknown ไม่สร้างกฎ camelCase ทุก C# local/parameter จากความชอบของ lint

Refresh selected Golden dependencies เป็น agrimap-agent-skills 5.0.2 ที่ inspected checkout 1243bdb98f862528e0b52e32d60bbd67686ee5cc และเพิ่ม exact frontend naming entry ที่ตรวจ digest กับ collection manifest คง original V002 reference commit ไว้แยกต่างหาก ไม่แก้ immutable specification หรือ upstream Golden

เพิ่ม explicit save สำหรับ .agrimap-agent/reports/golden-lint/report-id ตามคำขอผู้ใช้ แยกจาก read-only scan มี canonical report/envelope, รายงานภาษาอ่านง่าย, review JSON/Markdown และ .gitignore ภายในชุดรายงานเท่านั้น ไม่แก้ .gitignore ของ product บังคับ absolute protected roots, new directory, no Golden overlap/indirection/overwrite และตรวจ review IDs/status/evidence/secret patterns ผลทบทวนไม่เปลี่ยน canonical verdict; export commentary มี input digest

Offline reader build, sync/validate และ npm test ผ่าน 86/86 ไม่มี failed/skipped ครอบคลุม nested SQL comments/strings/quoted keywords, ALTER TABLE constraints, temp tables, malformed SQL, Angular/RxJS aliases/shadowing, provider/local exclusions, runtime Task collisions, stable naming IDs เมื่อเปลี่ยน comment/body, report write boundaries, blank/foreign/duplicate review evidence และ Markdown escaping เป็น fixtures พิสูจน์ behavior ที่ระบุ ไม่ใช่ owner-confirmed product precision/recall หรือ V002 certification

Codex/Claude ติดตั้ง 0.1.5 จาก local marketplace ของ source checkout นี้ ตรวจ installed files 76 ไฟล์ต่อ host เทียบ generated bundle ไม่พบ mismatch; retained-report review-check รันจาก unrelated cwd ผ่าน Claude native manifest validation ผ่าน Gemini/Antigravity CLI/IDE bundles ใช้ runtime/template เดียวกัน ผ่าน structure/runner fixtures แต่ไม่มี Gemini/agy ในเครื่อง จึงยังไม่ได้ native installation/activation ไม่มี authenticated Agent session ของแต่ละ host ถูกใช้รับรองความสามารถ

ตรวจจริง 5 โครงการรวม 941 selected files (FE app/library, BE main/library, SQL procedure/table/messages) ได้ 638 observations รวม naming 71 จุด completed ทั้งหมด ไม่มี blocked/error ทุก finding มีรายละเอียดใน Markdown ครบ และ Git status ก่อน/หลัง save รอบสุดท้ายตรงกันทุกโครงการ จำนวนนี้ไม่ใช่จำนวน confirmed bugs

รายงานโครงการจริงและ verification summaries เก็บใน ignored .agrimap-agent ของงานนี้และ report directory ที่ผู้ใช้อนุญาตในแต่ละ product โดยไม่แก้ product source หรือ execute SQL Source version 0.1.5 ไม่ใช่คำยืนยัน GitHub release; รอบนี้ไม่มี commit/push/merge/tag/publication และคง pre-existing V001 deletion เดิมไว้

## งานใน release 0.1.4 — 2026-10-15 — backend rules ชุดแรก

เพิ่ม Roslyn-backed detectors 9 ตัว และอัปเกรด namespace detector เป็น AST revision 2 รวม C# be-main 10 ตัว: public types, bounded type/interface/dependency/role naming, Repository placement, null-forgiving/null equality, empty catches และ runtime-resolved Task/ValueTask blocking/fake async ผลทุกตัวเป็น review-candidate พร้อม unknown applicability

Packaged reader build offline จาก package-owned Reader.cs โดยอ้าง existing Roslyn 4.11.0.0 จาก SDK 8.0.426; มี MIT license และ exact file digests รวม source-file digests สำหรับตรวจ rebuild Node runner ใช้ explicit trusted --dotnet host ภายนอก product/Golden roots บันทึก host/framework metadata digests ไม่โหลด target project/config/analyzers/generators ไม่ build/restore หรือ execute source ของ product

sync/validate และ npm test ผ่าน 74/74 ไม่มี failed/skipped รวม regression ของ Task-name/member collisions, constructor-parameter shadowing, comments/raw strings, readonly state exclusion, missing/tampered prerequisites, conditional compilation, syntax errors, stable declaration anchors และ target static constructor ที่ไม่ถูก execute Host mirrors รองรับ DLL bytes และรันได้จาก unrelated cwd

ตรวจ backend เดิมแบบอ่านอย่างเดียวที่ develop 0415637c: selected C# 374 ไฟล์, completed, 860 review candidates ใน 114 ไฟล์ แยก namespace 73, extra public declarations 51, role suffix 19, null-forgiving 629, null equality 81, empty catch 7 อีกสี่กฎไม่มี findings ภายใต้ scope ที่ตรวจได้ Task-shaped sites ที่ยัง resolve ไม่ได้เป็น diagnostics ไม่ใช่การรับรองว่าไม่มี blocking

รายงาน Markdown/JSON พร้อมทุก finding เก็บไว้ใน local ignored reports/0.1.4 เท่านั้น Product Git state ก่อน/หลังตรงกัน ไม่แก้ backend, Golden source lock หรือ release assets เดิม Release 0.1.4 รวมงานชุดนี้; publication ตรวจ main/tag และ ZIP checksums แยกจากผล scan

## งานใน release 0.1.3 — 2026-10-15

แก้ installed Golden handshake ให้ใช้ package.json หรือ versioned Codex/Claude/Gemini/plugin manifests ที่มีอยู่จริง เก็บ identity source/digests และบล็อก metadata ที่เสียหรือขัดกัน Versionless plugin เดี่ยว ๆ ไม่ยืนยัน version และ source dependency hashes ยังต้องผ่านตามเดิม Checkout mode ยังต้องใช้ package.json และ Git identity

เพิ่ม assets/report-template.md, REPORTING guide และ renderer ที่แสดงทุกไฟล์/บรรทัด/finding พร้อม rule/source diagnostics, expected contracts, evidence, snapshot/Git context, catalog และ checklist แยก manual review จาก scanner Namespace observations แยก declaration กับ using reference โดยไม่เลื่อนเป็น semantic violation

Regression suite ผ่าน 64/64 ไม่มี failed/skipped โดยใช้ trusted TypeScript เดิม สแกน agmws-data-management-netcore แบบอ่านอย่างเดียวที่ develop 0415637c ผ่าน installed source 4.11.0 โดย reference digests ครบ 25/25 ได้ completed, selected C# 374 ไฟล์ พบ 73 review candidates ใน 46 ไฟล์ แยก declaration 29 และ using reference 44 ไม่ใช่จำนวน confirmed runtime bugs ตรวจ product Git status ก่อน/หลังตรงกัน

รายงานจริงเก็บเฉพาะ local ignored reports ไม่แจกไปกับ runtime/source commits ไม่มี product edits, build/test ของ product หรือ SQL execution Nullable suppression/public-type count ยังไม่ automate ต้องบันทึกผล manual แยกต่างหาก Trust locks และ published 0.1.1/0.1.2 assets คงเดิม

## งานใน release 0.1.2 — 2026-10-15

### ความถูกต้องของกฎ

ทำต่อจาก handoff 2026-10-14 บน feature/golden-rule-correctness โดยรักษา uncommitted host packaging และ V001 deletion เดิม Package version, source lock และ V002 ไม่เปลี่ยน

ก่อนแก้ มี 4 regression cases ที่ใช้ trusted parser แล้วพบว่า FE rules ยัง evaluated แม้ frontend.md, gencode-api.md, pattern-status.md หรือ checklists/README.md drift หลังแก้ตรวจ declared per-binding normalized contracts และ common authority dependencies พร้อม individual digests และ exact dependency diagnostics BE/SQL ที่ไม่พึ่ง FE references ยังประเมินต่อได้

[Rule mapping](../skills/agrimap-golden-lint-skills/references/RULE-MAPPING.md) ผูก detector ทั้ง 10 กับ exact entry, normalized interpretation, scope, conflicts, exceptions และ evidence ceiling Generated skill ให้เปิด source ก่อนตัดสิน candidate

มี 19 synthetic T6/R1/R3 cases แยก proposed outcome จาก expected scanner disposition ยัง pending-owner-review Valid Facade/local-name calls อาจเป็น candidates; decorated ViewChild assertions ยังไม่ resolve exception ไม่มีการยก architecture detector เป็น semantic verdict

หลักฐานชุดนี้: sync/validate ผ่าน, npm test ใช้ existing digest-matching TypeScript 5.9.3 ผ่าน 54/54 ไม่มี failed/skipped, diff check ผ่าน และ git ls-files -- .agrimap-agent ว่าง ใช้ reference bytes จาก sibling Golden checkout เดิม ไม่รัน product scans ซ้ำ ไม่ติดตั้ง host หรือเผยแพร่ release ใหม่

### เอกสารทั้งชุด

ปรับ README, คู่มือผู้ใช้/ผู้ดูแล, runtime references และ generated skill/host guidance เป็นภาษาไทยตามแนว task-oriented ของ agrimap-agent-skills แยก chat/Terminal examples และย้ายรายละเอียด contract ไปหน้าอ้างอิง บันทึก editorial contract ใน DEVELOPMENT ให้การดูแลครั้งต่อไปใช้แนวเดียวกัน

การเปลี่ยนรอบ docs ไม่เปลี่ยน detector logic, operation grammar, schema, trust locks หรือ fixture reports การตรวจ docs ใช้ links/grammar/mirrors/packaging และ actual prose review; npm test เป็นหลักฐาน regression ของ package ไม่ใช่ product accuracy certification

### ชื่อ release ที่แสดง

แก้ GitHub release title และ release-notes heading ให้เป็น 0.1.1 ตามคำขอ ตรวจผ่าน API ว่า tag object v0.1.1 และ release assets คงเดิม เป็นการแก้ metadata ของ release เดิม ไม่ใช่ bump/tag publication ใหม่

## สิ่งที่เผยแพร่ใน 0.1.1 — 2026-10-14

Source/runtime release มี scan/explain/export, automated observation detectors 6 ตัว, boundary review 4 ตัว, all-lane classification และ catalog 21 กลุ่ม Detector IDs แยกจาก upstream Golden IDs/headings, tier/status และ content digests Version authority คือ package.json

M0/M1 foundations ผ่าน fixture tests M2 มี immutable Git blobs, compatible baselines, stable finding matching และ local relative TypeScript import/re-export resolution M3 มี unknown impact/manageability, proof obligations, catalog status และข้อเสนอ supporting read-only integration

Framework/C# semantics, owner-exception input, rename/edited-range matching และข้อสรุป behavior/public surface ลึกกว่านี้ยังไม่พร้อม การทำ milestone เหล่านี้ไม่เท่ากับ automate ทุก Golden rule

Golden ที่ใช้ freeze references คือ existing 4.11.0 checkout ที่ commit 55c526a05db323d9877010cd49a6471c00ab1d5f ส่วน V002 อ้าง commit 3c314c7a8fdc7c35ca41b4b161cb43824ed893fb แยกกัน Pin selected references 25 ไฟล์ ไม่มี upstream/cache edit หรือ silent fallback Parser เป็น existing TypeScript 5.9.3 ที่ตรวจ digest ก่อนโหลด ไม่มี dependency installation

## ผลตรวจเดิมก่อน release

ตรวจบน Windows / Node 26.7.0 ด้วย trusted TypeScript 5.9.3 ผล ณ implementation เดิมคือ 23 passed ไม่มี failed/skipped คำสั่งคือ npm run sync, npm run validate และ npm test โดยระบุ AGM_LINT_TYPESCRIPT ไม่มี product build/restore/scripts หรือ host installation test

ครอบคลุม target lanes/profiles, T6 syntax, provider/name/alias/re-export ambiguity, C#/SQL comment/string masking, missing/untrusted parser, source drift, deterministic output, duplicate/line-shift IDs, baseline compatibility, Git snapshots/no-write, ignored/untracked/generated/docs/records, export destination/junction rejection, identity-bound explain/export, exit semantics, schemas/redaction และ docs/grammar/mirrors/leakage

Application guards และ snapshots ยืนยันเฉพาะเงื่อนไขที่ทดสอบ ไม่ใช่ kernel isolation, hostile path-replacement protection, Linux/macOS coverage, whole-language lexical correctness, product-wide precision หรือ authenticated caller metadata Export อาศัย caller เก็บ protected roots ถูกต้อง; content hash ไม่ใช่ signature

## ผล scan จริงที่บันทึกไว้จากงานเดิม

งานเดิม scan 7 roots ในหน่วยความจำ ไม่ persist reports ใน product roots และแต่ละ root completed declared capabilities โดยไม่มี blocked/error rules ตัวเลขต่อไปนี้เป็น observations/review requirements ไม่ใช่ confirmed defects และ **ไม่ได้ scan ใหม่จากงานปรับ docs**

| Root อิง platform | Selected files | Observations / review requirements |
| --- | --- | --- |
| apps/web/agmwa-pro-ng | 117 | 346 |
| apps/web/agmwa-platform-ng | 415 | 949 |
| services/agmws-identity-netcore | 140 | 21 |
| jobs/agmbo-geoprocessing-netcore | 92 | 140 |
| standards/libraries/angular/agrimap-platform | 372 | 11 |
| standards/libraries/netcore/AgriMap.Platform | 186 | 186 |
| services/agmws-license-management-netcore | 205 | 30 |

| ตัวอย่างจาก V002 | ผลที่บันทึก / ขอบเขตข้อสรุป |
| --- | --- |
| analyze.component.ts / map-viewer.component.ts | Injection-shaped candidates ไม่ใช่ Store/API verdict; explicit any/non-null ใน map-viewer เป็น T6 syntax conflicts ผลแก้ยัง unknown |
| dashboard-api.store.ts | R3 call candidates และ T6 non-null conflicts ไม่ infer firstValueFrom/inject identity หรือ orchestration replacement ที่ปลอดภัย |
| OAuthUseCase.cs | Using-reference candidate นอก allowlist; redirect/HTML/controller contract ต้องตรวจแยก ไม่มี automatic split |
| GeoprocessingResultController.cs | Namespace-reference candidates; Presentation และ IActionResult ไม่ใช่ defect โดยตัวมันเอง |
| dynamic-lut public-api.ts | Public-boundary review ตาม scoped island/alias contracts ไม่ถือเป็น whole-library exemption หรือ automatic breaking change |
| LM_USER_Q.sql | ไม่พบ standalone declaration candidate เพราะใช้ CREATE OR ALTER; ไม่ certify procedure semantics |
| COMMIT/CLEANUP suffix และ reference/schema SQL | ไม่กล่าวหาจาก suffix โดยไม่มี owner/business evidence; excluded paths ไม่พิสูจน์ deployment classification |

เป็นผลจาก worktree ช่วงงานเดิม Evidence page นี้ไม่ใช่ retained production baseline ที่นำไปเทียบ current files ได้โดยตรง

## V002 acceptance และสิ่งที่ยังขาด

| Acceptance | หลักฐาน / ข้อจำกัด |
| --- | --- |
| AC-01 | All-lane fixtures และ inventory reconciliation; exclusions นับ subtree boundaries |
| AC-02 | Frozen source digests และ affected-rule gates; ยังไม่มี arbitrary owner-evidence ingestion หรือ full transitive authority proof |
| AC-03 | Candidate reproduction และ negative OAuth/job/island/suffix fixtures; business/owner gaps ยัง review-only |
| AC-04 | Same-contract Git/baseline tests; unmatched modified/renamed/refactored origin ยัง unknown |
| AC-05 | Local aliases/re-exports resolve ได้; external/framework/C# contexts ยังไม่เป็น semantic certainty |
| AC-06 | Export/contract/generated/signature boundaries ยัง review-only/not-implemented ไม่มี automatic breaking/hand-edit/duplication verdict |
| AC-07–08 | Deterministic serialization, runtime/binding/parser identity, drift/anchors/duplicates; ไม่รับประกัน rename stability |
| AC-09 | Health/execution/capability/disposition แยกกัน มี denominator และ exit 0/2/3; catalog ที่ยังไม่ทำแสดงครบ |
| AC-10 | Unknown effect/manageability และ proof obligations; static scanner ไม่พิสูจน์ behavior equivalence |
| AC-11 | Read-only scanner และ isolated snapshots; application-level ไม่ใช่ OS isolation |
| AC-12 | External destination/new-file/junction guards; caller honesty และ concurrent races ยังเป็นข้อจำกัด |
| AC-13 | Fixed observation/hashed anchors, schema-sensitive negatives และ retained IDs; relative paths อาจอ่อนไหวได้ |
| AC-14 | Upstream integration ยังเป็น supporting proposal ไม่แทนมาตรฐาน/lifecycle หรือแก้ routing เอง |
| DOC-01–04 | Maintainer scope, in-task Unreleased upkeep, no duplicate prompt/task และ no scan-side doc writes |
| DOC-05–07 | Task guides, grammar/mirror/negative fixtures และ allowlisted runtime ZIP ที่ไม่รวม maintainer/agent state |
| DOC-08–10 | แยก package/source/runtime identities; ไม่ใช้ source tests อ้าง installed host support หรือ server protection |

V002 ทั้งชุดยังไม่ independently certified การขยาย semantic/owner/public behavior analysis ต้องมี evidence และ focused admission cases เพิ่ม ไม่ขยาย verdict จาก lexical observations เดิม

## ประวัติ repository actions

Implementation แรกใช้ feature/golden-lint-v002 โดยไม่ publish ต่อมาคำสั่งเฉพาะอนุมัติ commit/push และ source/runtime release 0.1.1 บน main พร้อม tag v0.1.1 และ GitHub assets ไม่รวม npm publication, host install, CI wiring หรือ product deployment

V001 deletion เดิมไม่ถูกรวมใน release commits; V002 คงเดิม .agrimap-agent ทุกระดับ ignore และไม่แจกจ่าย งาน follow-up กฎ, host adapters และ docs รวมอยู่ในการเตรียม source 0.1.2 บน feature/golden-rule-correctness การ commit/push work branch แยกจากการ merge, tag หรือ GitHub release ไม่มี subagents ถูกส่งไปทำงาน

## การเผยแพร่ 0.1.2

คำสั่งผู้ขอรอบนี้อนุมัติ merge เข้า main และเผยแพร่ tag/release 0.1.2 พร้อม runtime ZIP, hosts ZIP และ SHA256SUMS ตรวจไฟล์ใน archives เทียบกับ candidate commit แบบ byte-for-byte และตรวจ metadata/digests บน GitHub หลัง upload ไม่เปลี่ยน source/parser trust locks หรือ assets/tag 0.1.1 เดิม Native host activation และ owner-confirmed product conformance ยังคงเป็นข้อจำกัดตาม Installation และ Rule mapping

## การเผยแพร่ 0.1.5

คำสั่งผู้ขออนุมัติ GitHub release/tags สำหรับงาน 0.1.5 รวม source commit/push, merge main, annotated v0.1.5 และ runtime/hosts ZIP พร้อม SHA256SUMS กระบวนการตรวจ byte/hash ของ archives เทียบ committed candidate และดาวน์โหลด assets กลับเพื่อตรวจ remote identity รายงานโครงการจริง/agent state และ V001 deletion เดิมไม่รวมใน release; native Gemini/Antigravity activation และ independent V002 certification ยังคงเป็นข้อจำกัด
