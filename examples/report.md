# รายงานตรวจ AgriMap Golden

Report ID: `1a44049d5c1ba66acf0883fd4a4eb2cd25ffdc2a715e1941d3598b66919c87ca`

## สรุปผล

Scan: **completed** — 2 violations / 3 review candidates / 0 accepted exceptions

เลือก 4 จาก 4 inventory records; excluded 0; ไฟล์ที่มี finding 4; findings ทั้งหมด 5

กฎ blocked 0; error 0; comparison not-requested

ชนิดหลักฐาน: not-recorded 5

Excluded subtrees นับเป็น boundary records ไม่ใช่จำนวนไฟล์ภายใน ไฟล์ที่ไม่มี finding อาจอยู่ภายใต้ coverage ที่ยังไม่ทำหรือกฎที่ถูกบล็อก

ยังสรุปว่าผ่าน Golden ทั้งหมดไม่ได้ จำนวน review candidates คือจุดให้ทบทวน ไม่ใช่จำนวน runtime bugs ที่ยืนยันแล้ว

## แหล่งอ้างอิงและ snapshot

| รายการ | ค่า |
| --- | --- |
| Scanner | 0.1.1 |
| Target mode | working-tree-including-untracked |
| Target branch | — |
| Target HEAD / immutable commit | — |
| Git dirty / input drift | — / false |
| Snapshot content identity | bd5dc8ef65567a1d2b0ff4131f6294106a3580b211fdc181cac0437f48187aee |
| Golden source mode | installed |
| Golden package / version | agrimap-agent-skills / 4.11.0 |
| Golden identity source / verified | — / — |
| Golden active commit | — |
| Golden selected content identity | 356da4b8770afbb0078e84e77265d0313e525c3cff80223a9f9c9d350f9077cb |
| Baseline report ID | — |

Working-tree HEAD ใช้อ้างอิง Git เท่านั้น ไม่ได้แปลว่า file bytes มาจาก committed snapshot ใช้ content identity และ input drift ร่วมกัน

## สถานะกฎและ diagnostics

| Detector / Golden ID | Capability | Execution | Evaluated / applicable / failed | Diagnostics |
| --- | --- | --- | --- | --- |
| fe-explicit-any / T6 | automated | evaluated | 1 / 1 / 0 | — |
| fe-non-null / T6 | automated | evaluated | 1 / 1 / 0 | — |
| fe-store-await / R3 | automated | not-applicable | 0 / 0 / 0 | — |
| fe-component-dependency / R1 | automated | evaluated | 1 / 1 / 0 | — |
| be-namespace-observation / Namespaces, files, and naming | automated | evaluated | 1 / 1 / 0 | — |
| sql-procedure-declaration / Output artifact contract | automated | evaluated | 1 / 1 / 0 | — |
| fe-library-public-surface / 3. Public API Contract | review-only | evaluated | 1 / 1 / 0 | — |
| be-library-contract / MUST — the public surface is the contract | review-only | not-applicable | 0 / 0 / 0 | — |
| sql-table-contract / DDL contract | review-only | not-applicable | 0 / 0 / 0 | — |
| sql-message-contract / Message collection gate | review-only | not-applicable | 0 / 0 / 0 | — |

### Source diagnostics

ไม่พบ source diagnostic ในรายงานนี้

## ดัชนีไฟล์ที่พบประเด็น

| ไฟล์ | Violations | Review candidates | Accepted exceptions | รายการทั้งหมด |
| --- | --- | --- | --- | --- |
| apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts | 2 | 0 | 0 | [F001](#f001) 1:21, [F002](#f002) 1:35 |
| services/agmws-fixture-netcore/Src/Application/UseCases/Demo.cs | 0 | 1 | 0 | [F003](#f003) 1:1 |
| services/agmws-fixture-netcore/sql/DEMO/procedure/DEMO\_Q.sql | 0 | 1 | 0 | [F004](#f004) 1:1 |
| standards/libraries/angular/agrimap-platform/projects/dynamic-lut/src/public-api.ts | 0 | 1 | 0 | [F005](#f005) 1:1 |

## รายละเอียดครบทุก finding

### F001

| รายการ | รายละเอียด |
| --- | --- |
| ไฟล์:บรรทัด:คอลัมน์ | apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts:1:21 |
| Finding ID | b4945eed4d37f7114bcce63c5364651ed2bc9be6bde8cf0c963236044c14e9ef |
| ผล / applicability | violation / applicable |
| ชนิดหลักฐาน | not-recorded |
| Detector / evidence | fe-explicit-any / syntax (ต้องการ syntax) |
| Golden ID / tier / status | T6 / MUST / current |
| Exact Golden entry / digest | references/patterns/golden/frontend-main/008-3-typesafe-t6-forbidden.ts / 87594b1d0ebed048fc75c62e4b64b59d99e1aa9e79df2f0136cc86484dc34628 |
| สิ่งที่ตรวจพบ | Explicit any type token conflicts with T6. Inspect actual values and narrowing before replacing it. |
| รูปแบบหรือ contract ที่ต้องเทียบ | T6: ใช้ type ที่ระบุชัด หรือ unknown แล้ว narrow แทน explicit any |
| Symbol resolution | not-requested |
| Confidence / เหตุผล | high / Parsed explicit syntax and pinned applicable source; impact remains unknown. |
| Origin / code scope | unknown / unknown |
| Impact / manageability | unknown / unknown |
| ข้อเสนอ | Investigate this exact declaration and its callers; propose the smallest owner-reviewed correction only after resolving applicability and compatibility. |
| หลักฐานที่ยังขาด | Resolve applicable owner exceptions<br>Identify behavior/public/wire/data consumers<br>Prove observables and null/async/error semantics<br>Define containment and rollback |
| คำถามที่ยังไม่ทราบ | What is the approved ownership and consumer scope? |
| Owner / exception evidence | 0 / 0 |

### F002

| รายการ | รายละเอียด |
| --- | --- |
| ไฟล์:บรรทัด:คอลัมน์ | apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts:1:35 |
| Finding ID | 8da7c7604c6408400252013848f02ac8f245d96df37bdac62bc53785f3eca361 |
| ผล / applicability | violation / applicable |
| ชนิดหลักฐาน | not-recorded |
| Detector / evidence | fe-non-null / syntax (ต้องการ syntax) |
| Golden ID / tier / status | T6 / MUST / current |
| Exact Golden entry / digest | references/patterns/golden/frontend-main/008-3-typesafe-t6-forbidden.ts / 87594b1d0ebed048fc75c62e4b64b59d99e1aa9e79df2f0136cc86484dc34628 |
| สิ่งที่ตรวจพบ | Non-null assertion conflicts with T6; null-path and consumer behavior remain unproven. |
| รูปแบบหรือ contract ที่ต้องเทียบ | T6: หลีกเลี่ยง assertion; ViewChild static:true ต้อง resolve Angular identity และขอบเขตข้อยกเว้นก่อน |
| Symbol resolution | not-requested |
| Confidence / เหตุผล | high / Parsed explicit syntax and pinned applicable source; impact remains unknown. |
| Origin / code scope | unknown / unknown |
| Impact / manageability | unknown / unknown |
| ข้อเสนอ | Investigate this exact declaration and its callers; propose the smallest owner-reviewed correction only after resolving applicability and compatibility. |
| หลักฐานที่ยังขาด | Resolve applicable owner exceptions<br>Identify behavior/public/wire/data consumers<br>Prove observables and null/async/error semantics<br>Define containment and rollback |
| คำถามที่ยังไม่ทราบ | What is the approved ownership and consumer scope? |
| Owner / exception evidence | 0 / 0 |

### F003

| รายการ | รายละเอียด |
| --- | --- |
| ไฟล์:บรรทัด:คอลัมน์ | services/agmws-fixture-netcore/Src/Application/UseCases/Demo.cs:1:1 |
| Finding ID | 5880119430bccac9d96f8739a675be3efc3e28021df39d6799e22f2ff029418e |
| ผล / applicability | review-candidate / unknown |
| ชนิดหลักฐาน | not-recorded |
| Detector / evidence | be-namespace-observation / text (ต้องการ text) |
| Golden ID / tier / status | Namespaces, files, and naming / MUST / current |
| Exact Golden entry / digest | references/patterns/csharp.md / dc23a87886e57d072fca0420931096d3d76bfb9aedfbfec134e448eef67f07e9 |
| สิ่งที่ตรวจพบ | Namespace-shaped declaration differs from the fixed namespace/file-scoped contract. Confirm conditional compilation, namespace syntax and deployed ownership with a C\# parser before declaring a violation. |
| รูปแบบหรือ contract ที่ต้องเทียบ | ใช้ fixed namespace allowlist และ file-scoped declaration ตาม csharp.md; subfolder ไม่ขยาย namespace โดยอัตโนมัติ |
| Symbol resolution | not-requested |
| Confidence / เหตุผล | limited / Observation only; semantic/owner/applicability evidence is incomplete. |
| Origin / code scope | unknown / unknown |
| Impact / manageability | unknown / unknown |
| ข้อเสนอ | Investigate this exact declaration and its callers; propose the smallest owner-reviewed correction only after resolving applicability and compatibility. |
| หลักฐานที่ยังขาด | Resolve applicable owner exceptions<br>Identify behavior/public/wire/data consumers<br>Prove observables and null/async/error semantics<br>Define containment and rollback |
| คำถามที่ยังไม่ทราบ | What is the approved ownership and consumer scope? |
| Owner / exception evidence | 0 / 0 |

### F004

| รายการ | รายละเอียด |
| --- | --- |
| ไฟล์:บรรทัด:คอลัมน์ | services/agmws-fixture-netcore/sql/DEMO/procedure/DEMO\_Q.sql:1:1 |
| Finding ID | 400b25de2e83fa3d12dced36faa1763be48db0d16368df5664526dd449935a81 |
| ผล / applicability | review-candidate / unknown |
| ชนิดหลักฐาน | not-recorded |
| Detector / evidence | sql-procedure-declaration / text (ต้องการ text) |
| Golden ID / tier / status | Output artifact contract / MUST / current |
| Exact Golden entry / digest | references/patterns/sql.md / d64064e575079b73fd8588092af3109046f3a00bd37ebbe251615f29c840ad20 |
| สิ่งที่ตรวจพบ | Standalone procedure declaration candidate. The CREATE OR ALTER rule governs created/edited outputs; current history, deployment role and SQL parsing must establish applicability. No suffix/business semantics are inferred. |
| รูปแบบหรือ contract ที่ต้องเทียบ | Procedure outputs ที่สร้างหรือแก้ใช้ CREATE OR ALTER PROCEDURE; ต้องยืนยัน deployment/history scope ก่อน |
| Symbol resolution | not-requested |
| Confidence / เหตุผล | limited / Observation only; semantic/owner/applicability evidence is incomplete. |
| Origin / code scope | unknown / unknown |
| Impact / manageability | unknown / unknown |
| ข้อเสนอ | Investigate this exact declaration and its callers; propose the smallest owner-reviewed correction only after resolving applicability and compatibility. |
| หลักฐานที่ยังขาด | Resolve applicable owner exceptions<br>Identify behavior/public/wire/data consumers<br>Prove observables and null/async/error semantics<br>Define containment and rollback |
| คำถามที่ยังไม่ทราบ | What is the approved ownership and consumer scope? |
| Owner / exception evidence | 0 / 0 |

### F005

| รายการ | รายละเอียด |
| --- | --- |
| ไฟล์:บรรทัด:คอลัมน์ | standards/libraries/angular/agrimap-platform/projects/dynamic-lut/src/public-api.ts:1:1 |
| Finding ID | 8eaca77d77544d5419b906da80832e8a5c875a9b2147f9f1189df3d3d233445a |
| ผล / applicability | review-candidate / unknown |
| ชนิดหลักฐาน | not-recorded |
| Detector / evidence | fe-library-public-surface / text (ต้องการ contract-review) |
| Golden ID / tier / status | 3. Public API Contract / MUST / current |
| Exact Golden entry / digest | references/patterns/golden/frontend-libraries/003-3-public-api-contract.md / 1e04d0f399bb27ce94b4ca94faebb5549b5d16b6c5554c04287ea53e7b783a1f |
| สิ่งที่ตรวจพบ | Contract boundary located. Obtain public surface, actual consumers, owner approval/exception scope and behavior evidence. This is a review requirement, not a defect. |
| รูปแบบหรือ contract ที่ต้องเทียบ | รักษา direct/wildcard/aliased public exports และ approved islands; ตรวจ actual consumers และ version |
| Symbol resolution | not-requested |
| Confidence / เหตุผล | limited / Observation only; semantic/owner/applicability evidence is incomplete. |
| Origin / code scope | unknown / unknown |
| Impact / manageability | unknown / unknown |
| ข้อเสนอ | Investigate this exact declaration and its callers; propose the smallest owner-reviewed correction only after resolving applicability and compatibility. |
| หลักฐานที่ยังขาด | Resolve applicable owner exceptions<br>Identify behavior/public/wire/data consumers<br>Prove observables and null/async/error semantics<br>Define containment and rollback |
| คำถามที่ยังไม่ทราบ | What is the approved ownership and consumer scope? |
| Owner / exception evidence | 0 / 0 |

## ความสามารถทั้งหมดใน catalog

| Family | Lane | Capability | Selected lane files | ข้อจำกัด |
| --- | --- | --- | --- | --- |
| fe-component-dependencies | fe-main | automated | 1 | Injection-shaped candidates; framework/ownership resolution incomplete. |
| fe-store-purity | fe-main | automated | 1 | Await/async and selected call candidates; no full flow equivalence. |
| fe-t6-types | fe-main | automated | 1 | Explicit syntax; decorated assertions need exception resolution. |
| fe-facade-flow-lifecycle | fe-main | not-implemented | 1 | R2/R4/R5 orchestration, signals, conversion, subscriptions and trivial-view exceptions need semantic/contract review. |
| fe-new-code-naming | fe-main | not-implemented | 1 | Selectors/file/handler naming needs new/touched entity applicability. |
| fe-generated-provenance | fe-main | not-implemented | 1 | Boundaries classified; generator drift/hand-edit provenance not asserted. |
| fe-library-public-contract | fe-library | review-only | 1 | Export/alias and approved facade/store islands require owner/consumer review, never automatic breaking-change classification. |
| fe-library-naming | fe-library | not-implemented | 1 | New no-suffix/selector naming and legacy exceptions need entity history. |
| fe-library-feature-contracts | fe-library | not-implemented | 1 | Service-first behavior, README/Playground and generated boundaries need owned contracts. |
| be-fixed-namespace | be-main | automated | 1 | Lexical declaration/reference candidates; conditional compilation unresolved. |
| be-type-and-async-shape | be-main | not-implemented | 1 | Public type counts, new Async/Task names, sync-over-async and empty catch need C\# parser/semantic context. |
| be-boundaries-and-http-jobs | be-main | not-implemented | 1 | DTO/Domain/persistence, thin triggers/controllers and OAuth/HTTP response contracts need owner evidence. |
| be-runtime-contracts | be-main | not-implemented | 1 | Cancellation, identity/request precedence, DI, logs and response/error behavior need semantic/contract review. |
| be-library-published-contract | be-library | review-only | 0 | Source boundary located; actual published graph and consumers require review. |
| be-library-structure-overlap | be-library | not-implemented | 0 | C\# structure and similar signatures do not prove duplicate capability. |
| be-library-request-and-feature-contracts | be-library | not-implemented | 0 | Request priority, compatibility and README/Playground/tests need owned evidence. |
| sql-procedure-output | sql-procedure | automated | 1 | Lexical declaration candidate; new/touched deployment role unresolved. |
| sql-table-ddl | sql-table | review-only | 0 | Location classified; object-per-file/DDL/section/schema constraints require owner-schema review. |
| sql-message-guards | sql-messages | review-only | 0 | File located; guards/codes/meaning not automatically validated. |
| sql-business-compatibility | sql-procedure | not-implemented | 1 | Suffix exceptions, results/errors/transactions and table/message reconciliation need owner evidence. |
| sql-table-data-semantics | sql-table | not-implemented | 0 | ID migration, indexes, cascade, seeds and relationships are never inferred from signatures. |

## รายการติดตาม

- [ ] [F001](#f001) apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts:1:21 — ทบทวน scope/exception/consumers และบันทึกข้อสรุปโดยอ้าง Finding ID
- [ ] [F002](#f002) apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts:1:35 — ทบทวน scope/exception/consumers และบันทึกข้อสรุปโดยอ้าง Finding ID
- [ ] [F003](#f003) services/agmws-fixture-netcore/Src/Application/UseCases/Demo.cs:1:1 — ทบทวน scope/exception/consumers และบันทึกข้อสรุปโดยอ้าง Finding ID
- [ ] [F004](#f004) services/agmws-fixture-netcore/sql/DEMO/procedure/DEMO\_Q.sql:1:1 — ทบทวน scope/exception/consumers และบันทึกข้อสรุปโดยอ้าง Finding ID
- [ ] [F005](#f005) standards/libraries/angular/agrimap-platform/projects/dynamic-lut/src/public-api.ts:1:1 — ทบทวน scope/exception/consumers และบันทึกข้อสรุปโดยอ้าง Finding ID

## ผลทบทวนเพิ่มเติม

ยังไม่มีผลทบทวนด้วยมือในข้อมูล scanner ชุดนี้ Agent/owner บันทึกเพิ่มในสำเนาสำหรับทบทวนโดยแยกจากผลอัตโนมัติ ใช้รูปแบบต่อไปนี้ทุกจุด และไม่แก้ canonical JSON เดิมเพื่อใส่ผลทบทวน

| Review ID | ไฟล์:บรรทัด | Golden entry / ID | สิ่งที่พบ / รูปแบบที่ควรเป็น | หลักฐานและข้อยกเว้น | สถานะ / ผู้ทบทวน |
| --- | --- | --- | --- | --- | --- |
| ยังไม่มีรายการ | — | — | — | — | ยังไม่ทบทวน |

## ข้อจำกัดและหลักฐานที่ยังขาด

- Only local relative TypeScript imports/re-exports resolve; external framework, tsconfig aliases and C\# semantic contexts remain unavailable. Architecture candidates require owner review.
- No owner exception input is implemented; decorated assertions and legacy/public boundaries remain review candidates.
- Other catalog families are review-only or not implemented; full catalog automation is not claimed.
- No-effect and manageability require behavioral/consumer evidence; all remediation assessments start unknown.
- Excluded subtrees are counted as boundary records, not enumerated files. Working-tree untracked selected files are included; ignored files outside excluded subtrees are also included.
- Lexical C\#/SQL observations are candidates; preprocessor/raw-string/nested-comment edge cases require a real language parser.

ผลตรวจไม่อนุมัติการแก้โค้ด ประเมิน consumers, behavior/public/wire/data contracts และขอบเขต rollback ก่อนเสนอการแก้ทุกครั้ง
