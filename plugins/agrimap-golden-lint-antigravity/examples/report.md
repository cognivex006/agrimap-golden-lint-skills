# รายงานตรวจ AgriMap Golden

| รายการ | ค่า |
| --- | --- |
| โครงการ | `agrimap-portfolio-fixture` |
| สถานะ scan | **completed** · กฎ blocked 0 · error 0 |
| Branch / HEAD | — / — |
| Scanner / Golden | 0.1.1 / agrimap-agent-skills 4.11.0 |
| เทียบ baseline | ไม่ได้ขอ |
| Report ID | `1a44049d5c1ba66acf0883fd4a4eb2cd25ffdc2a715e1941d3598b66919c87ca` |

## สรุปและลำดับการแก้

พบ **5 จุดใน 4 ไฟล์** (2 violations / 3 review candidates / 0 accepted exceptions) · เลือกตรวจ 4 จาก 4 inventory records (excluded 0)

ชนิดหลักฐาน: not-recorded 5

| ลำดับ | กฎ | สิ่งที่ตรวจ | จุด | ไฟล์ | ความเสี่ยง | สกิล | Prompt |
| --- | --- | --- | ---: | ---: | --- | --- | --- |
| 1 | create-or-alter | Procedure ใช้ CREATE OR ALTER | 1 | 1 | ต่ำ | `agm-sql` | P1 |
| 2 | namespace | Namespace คงที่และ file-scoped | 1 | 1 | กลาง | `agm-be` | P2 |
| 3 | T6-any | ห้าม explicit any | 1 | 1 | กลาง | `agm-fe` | P3 |
| 4 | T6-non-null | หลีกเลี่ยง non-null assertion | 1 | 1 | กลาง | `agm-fe` | P4 |
| 5 | lib-public-api | ขอบเขต public-api ของ FE library | 1 | 1 | ทบทวน | `agm-fe` | — |

**วิธีใช้รายงานนี้**

1. ทำตามลำดับในตาราง: เปิดการ์ดของกฎในหัวข้อ “แก้ทีละกฎ” แล้วคัดลอก prompt ทีละชุดไปให้สกิลที่ระบุ
2. Build/test ให้ผ่านก่อนไป prompt ถัดไป กลุ่มความเสี่ยงสูง (rename/ย้าย type) ต้องตรวจ consumers, JSON/route และ public contract ก่อนเสมอ
3. จุดที่เป็น legacy หรือ public contract ให้บันทึกเป็น exception ใน review.json แทนการแก้
4. หลังแก้แต่ละรอบ ให้รัน report ใหม่พร้อม `--baseline` ชี้ report.json ของรอบนี้ เพื่อดูว่าจุดใดหาย จุดใดเกิดใหม่

**ก่อนยืนยัน finding ใดว่าต้องแก้** ต้องมีหลักฐาน: Resolve applicable owner exceptions · Identify behavior/public/wire/data consumers · Prove observables and null/async/error semantics · Define containment and rollback ทุก finding เริ่มที่ impact และ manageability = unknown

คำที่ใช้: violation = syntax ขัดกฎในขอบเขตที่พิสูจน์ได้ · review-candidate = จุดที่ต้องยืนยันก่อนแก้ · blocked = ตรวจไม่ได้เพราะ prerequisite ขาด · ความเสี่ยง = ความเสี่ยงทั่วไปของการแก้กฎนั้น ไม่ใช่ verdict ของแต่ละจุด

ยังสรุปว่าผ่าน Golden ทั้งหมดไม่ได้ จำนวน review candidates คือจุดให้ทบทวน ไม่ใช่จำนวน runtime bugs ที่ยืนยันแล้ว ผล completed หมายถึงทำความสามารถที่ประกาศครบ ไม่ใช่ระบบถูกต้องทั้งหมด

## แก้ทีละกฎ

การ์ดหนึ่งใบต่อกฎ เรียงตามตารางข้างบน แต่ละ prompt ครบในตัว คัดลอกไปวางในช่องสนทนาของ Agent ที่ติดตั้ง agrimap-agent-skills ได้ทันที (เช่น Codex `$agm-be`, Claude Code `/agrimap-agent-skills:agm-be`, Cursor `/agm-be`) Prompt เป็นข้อเสนอ ไม่อนุมัติ commit, merge หรือ deploy

### 1 · create-or-alter — Procedure ใช้ CREATE OR ALTER

**1 จุด · 1 ไฟล์ · ความเสี่ยงต่ำ · สกิล `agm-sql`**

Golden Output artifact contract (MUST) ใน `references/patterns/sql.md` · evidence text · confidence limited

สิ่งที่ตรวจพบ: Standalone procedure declaration candidate. The CREATE OR ALTER rule governs created/edited outputs; current history, deployment role and SQL parsing must establish applicability. No suffix/business semantics are inferred.

#### P1 · 1 จุดใน 1 ไฟล์

```text
ใช้สกิล agm-sql แก้ create-or-alter — Procedure ใช้ CREATE OR ALTER ตาม Golden ของ agrimap-agent-skills
โครงการ: agrimap-portfolio-fixture
ที่มา: agm-lint report 1a44049d5c1b · 1 จุดใน 1 ไฟล์
Golden: references/patterns/sql.md · Output artifact contract · MUST

ตำแหน่งที่ต้องตรวจและแก้ (บรรทัดจากรายงาน เปิดไฟล์จริงก่อนแก้):
- services/agmws-fixture-netcore/sql/DEMO/procedure/DEMO_Q.sql: 1

รูปแบบที่ควรเป็น: Procedure outputs ที่สร้างหรือแก้ใช้ CREATE OR ALTER PROCEDURE; ต้องยืนยัน deployment/history scope ก่อน
วิธีแก้:
- เปลี่ยน CREATE PROCEDURE เป็น CREATE OR ALTER PROCEDURE ในไฟล์ที่อยู่ในขอบเขตงาน
- ไม่ execute SQL และไม่แก้ไฟล์ history/migration ที่ deploy แล้ว

ข้อกำหนด:
- อ่าน Golden entry ข้างบนก่อน แล้วแก้เฉพาะตำแหน่งที่ระบุและสิ่งที่จำเป็นให้ build ผ่าน ไม่ refactor ส่วนอื่น
- จุดที่กระทบ public API, JSON/wire name, route, template binding หรือ database contract หรือเข้าข่ายข้อยกเว้นของ Golden ให้ข้ามและรายงานพร้อมเหตุผล
- ตรวจหลังแก้: ตรวจ diff แบบ static; deploy ผ่าน pipeline ปกติของโครงการเท่านั้น
- สรุปไฟล์ที่แก้ จุดที่ข้ามพร้อมเหตุผล และผลตรวจ ยังไม่ commit/push
- เมื่อแก้เสร็จ ให้รัน agm-lint report ใหม่โดยใช้ --baseline report.json ของรายงานนี้ เพื่อยืนยันว่าจุดที่แก้หายไปและไม่มี finding ใหม่
```

### 2 · namespace — Namespace คงที่และ file-scoped

**1 จุด · 1 ไฟล์ · ความเสี่ยงกลาง · สกิล `agm-be`**

Golden Namespaces, files, and naming (MUST) ใน `references/patterns/csharp.md` · evidence text · confidence limited

สิ่งที่ตรวจพบ: Namespace-shaped declaration differs from the fixed namespace/file-scoped contract. Confirm conditional compilation, namespace syntax and deployed ownership with a C# parser before declaring a violation.

#### P2 · 1 จุดใน 1 ไฟล์

```text
ใช้สกิล agm-be แก้ namespace — Namespace คงที่และ file-scoped ตาม Golden ของ agrimap-agent-skills
โครงการ: agrimap-portfolio-fixture
ที่มา: agm-lint report 1a44049d5c1b · 1 จุดใน 1 ไฟล์
Golden: references/patterns/csharp.md · Namespaces, files, and naming · MUST

ตำแหน่งที่ต้องตรวจและแก้ (บรรทัดจากรายงาน เปิดไฟล์จริงก่อนแก้):
- services/agmws-fixture-netcore/Src/Application/UseCases/Demo.cs: 1

รูปแบบที่ควรเป็น: ใช้ fixed namespace allowlist และ file-scoped declaration ตาม csharp.md; subfolder ไม่ขยาย namespace โดยอัตโนมัติ
วิธีแก้:
- namespace-declaration: เปลี่ยนเป็น file-scoped namespace ตาม allowlist ของ layer นั้น
- namespace-reference: ปรับ using ให้ชี้ namespace ที่อยู่ใน allowlist หลังแก้ declaration ต้นทาง
- ห้ามใช้ using alias เพื่อเลี่ยงกฎ

ข้อกำหนด:
- อ่าน Golden entry ข้างบนก่อน แล้วแก้เฉพาะตำแหน่งที่ระบุและสิ่งที่จำเป็นให้ build ผ่าน ไม่ refactor ส่วนอื่น
- จุดที่กระทบ public API, JSON/wire name, route, template binding หรือ database contract หรือเข้าข่ายข้อยกเว้นของ Golden ให้ข้ามและรายงานพร้อมเหตุผล
- ตรวจหลังแก้: dotnet build; ตรวจ reflection/serialization ที่อ้าง namespace เป็น string
- สรุปไฟล์ที่แก้ จุดที่ข้ามพร้อมเหตุผล และผลตรวจ ยังไม่ commit/push
- เมื่อแก้เสร็จ ให้รัน agm-lint report ใหม่โดยใช้ --baseline report.json ของรายงานนี้ เพื่อยืนยันว่าจุดที่แก้หายไปและไม่มี finding ใหม่
```

### 3 · T6-any — ห้าม explicit any

**1 จุด · 1 ไฟล์ · ความเสี่ยงกลาง · สกิล `agm-fe`**

Golden T6 (MUST) ใน `references/patterns/golden/frontend-main/008-3-typesafe-t6-forbidden.ts` · evidence syntax · confidence high

สิ่งที่ตรวจพบ: Explicit any type token conflicts with T6. Inspect actual values and narrowing before replacing it.

#### P3 · 1 จุดใน 1 ไฟล์

```text
ใช้สกิล agm-fe แก้ T6-any — ห้าม explicit any ตาม Golden ของ agrimap-agent-skills
โครงการ: agrimap-portfolio-fixture
ที่มา: agm-lint report 1a44049d5c1b · 1 จุดใน 1 ไฟล์
Golden: references/patterns/golden/frontend-main/008-3-typesafe-t6-forbidden.ts · T6 · MUST

ตำแหน่งที่ต้องตรวจและแก้ (บรรทัดจากรายงาน เปิดไฟล์จริงก่อนแก้):
- apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts: 1

รูปแบบที่ควรเป็น: T6: ใช้ type ที่ระบุชัด หรือ unknown แล้ว narrow แทน explicit any
วิธีแก้:
- ใช้ type จาก generated API/domain model ที่มีอยู่
- ถ้าไม่รู้ shape ให้ใช้ unknown แล้ว narrow ด้วย type guard

ข้อกำหนด:
- อ่าน Golden entry ข้างบนก่อน แล้วแก้เฉพาะตำแหน่งที่ระบุและสิ่งที่จำเป็นให้ build ผ่าน ไม่ refactor ส่วนอื่น
- จุดที่กระทบ public API, JSON/wire name, route, template binding หรือ database contract หรือเข้าข่ายข้อยกเว้นของ Golden ให้ข้ามและรายงานพร้อมเหตุผล
- ตรวจหลังแก้: ng build / tsc --noEmit ผ่าน; ทดสอบหน้าที่ใช้ค่านั้น
- สรุปไฟล์ที่แก้ จุดที่ข้ามพร้อมเหตุผล และผลตรวจ ยังไม่ commit/push
- เมื่อแก้เสร็จ ให้รัน agm-lint report ใหม่โดยใช้ --baseline report.json ของรายงานนี้ เพื่อยืนยันว่าจุดที่แก้หายไปและไม่มี finding ใหม่
```

### 4 · T6-non-null — หลีกเลี่ยง non-null assertion

**1 จุด · 1 ไฟล์ · ความเสี่ยงกลาง · สกิล `agm-fe`**

Golden T6 (MUST) ใน `references/patterns/golden/frontend-main/008-3-typesafe-t6-forbidden.ts` · evidence syntax · confidence high

สิ่งที่ตรวจพบ: Non-null assertion conflicts with T6; null-path and consumer behavior remain unproven.

#### P4 · 1 จุดใน 1 ไฟล์

```text
ใช้สกิล agm-fe แก้ T6-non-null — หลีกเลี่ยง non-null assertion ตาม Golden ของ agrimap-agent-skills
โครงการ: agrimap-portfolio-fixture
ที่มา: agm-lint report 1a44049d5c1b · 1 จุดใน 1 ไฟล์
Golden: references/patterns/golden/frontend-main/008-3-typesafe-t6-forbidden.ts · T6 · MUST

ตำแหน่งที่ต้องตรวจและแก้ (บรรทัดจากรายงาน เปิดไฟล์จริงก่อนแก้):
- apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts: 1

รูปแบบที่ควรเป็น: T6: หลีกเลี่ยง assertion; ViewChild static:true ต้อง resolve Angular identity และขอบเขตข้อยกเว้นก่อน
วิธีแก้:
- จัดการกรณี null/undefined ด้วย guard, optional chaining หรือค่าเริ่มต้นที่ถูกต้อง
- ViewChild static:true ที่เป็นข้อยกเว้นตาม Golden ให้คงไว้และบันทึกเหตุผล

ข้อกำหนด:
- อ่าน Golden entry ข้างบนก่อน แล้วแก้เฉพาะตำแหน่งที่ระบุและสิ่งที่จำเป็นให้ build ผ่าน ไม่ refactor ส่วนอื่น
- จุดที่กระทบ public API, JSON/wire name, route, template binding หรือ database contract หรือเข้าข่ายข้อยกเว้นของ Golden ให้ข้ามและรายงานพร้อมเหตุผล
- ตรวจหลังแก้: ng build / tsc --noEmit ผ่าน; ทดสอบ lifecycle ของ component
- สรุปไฟล์ที่แก้ จุดที่ข้ามพร้อมเหตุผล และผลตรวจ ยังไม่ commit/push
- เมื่อแก้เสร็จ ให้รัน agm-lint report ใหม่โดยใช้ --baseline report.json ของรายงานนี้ เพื่อยืนยันว่าจุดที่แก้หายไปและไม่มี finding ใหม่
```

### 5 · lib-public-api — ขอบเขต public-api ของ FE library

**1 จุด · 1 ไฟล์ · ความเสี่ยงทบทวน · สกิล `agm-fe`**

Golden 3. Public API Contract (MUST) ใน `references/patterns/golden/frontend-libraries/003-3-public-api-contract.md` · evidence text · confidence limited

สิ่งที่ตรวจพบ: Contract boundary located. Obtain public surface, actual consumers, owner approval/exception scope and behavior evidence. This is a review requirement, not a defect.

ไม่มี prompt เพราะเป็น boundary review ที่เจ้าของ contract ต้องตัดสิน รูปแบบที่ต้องเทียบ: รักษา direct/wildcard/aliased public exports และ approved islands; ตรวจ actual consumers และ version
- ระบุ exports และ consumers จริงของ public-api.ts
- ไม่แก้โค้ดจาก boundary นี้โดยตรง

ไฟล์: `standards/libraries/angular/agrimap-platform/projects/dynamic-lut/src/public-api.ts`

## ดัชนีไฟล์ที่พบประเด็น

| ไฟล์ | จุด | ตำแหน่ง (บรรทัด กฎ) | Findings |
| --- | ---: | --- | --- |
| `apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts` | 2 | 1 T6-any · 1 T6-non-null | F001–F002 |
| `services/agmws-fixture-netcore/Src/Application/UseCases/Demo.cs` | 1 | 1 namespace | F003 |
| `services/agmws-fixture-netcore/sql/DEMO/procedure/DEMO_Q.sql` | 1 | 1 create-or-alter | F004 |
| `standards/libraries/angular/agrimap-platform/projects/dynamic-lut/src/public-api.ts` | 1 | 1 lib-public-api | F005 |

## Checklist ทุก finding

หนึ่งบรรทัดต่อ finding: ลำดับ · บรรทัด:คอลัมน์ · กฎ · Finding ID ความหมายของแต่ละกฎอยู่ในการ์ดของ “แก้ทีละกฎ” Checkbox ใช้ติดตามในสำเนานี้ได้ แต่ไม่เปลี่ยนผลของ scanner F001 เป็นเลขอ่านง่ายภายในรายงานเดียว เมื่อเทียบข้ามรอบให้ใช้ Finding ID

### `apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts`

- [ ] F001 · L1:21 · T6-any · violation · `b4945eed4d37f7114bcce63c5364651ed2bc9be6bde8cf0c963236044c14e9ef`
- [ ] F002 · L1:35 · T6-non-null · violation · `8da7c7604c6408400252013848f02ac8f245d96df37bdac62bc53785f3eca361`

### `services/agmws-fixture-netcore/Src/Application/UseCases/Demo.cs`

- [ ] F003 · L1:1 · namespace · `5880119430bccac9d96f8739a675be3efc3e28021df39d6799e22f2ff029418e`

### `services/agmws-fixture-netcore/sql/DEMO/procedure/DEMO_Q.sql`

- [ ] F004 · L1:1 · create-or-alter · `400b25de2e83fa3d12dced36faa1763be48db0d16368df5664526dd449935a81`

### `standards/libraries/angular/agrimap-platform/projects/dynamic-lut/src/public-api.ts`

- [ ] F005 · L1:1 · lib-public-api · `8eaca77d77544d5419b906da80832e8a5c875a9b2147f9f1189df3d3d233445a`

## ผลทบทวนเพิ่มเติม

ยังไม่มีผลทบทวนด้วยมือในข้อมูล scanner ชุดนี้ บันทึกผลใน review.json ของชุดรายงาน หรือเพิ่มในสำเนานี้โดยแยกจากผลอัตโนมัติ ไม่แก้ canonical JSON เดิมเพื่อใส่ผลทบทวน

| Review ID | ไฟล์:บรรทัด | Golden entry / ID | สิ่งที่พบ / รูปแบบที่ควรเป็น | หลักฐานและข้อยกเว้น | สถานะ / ผู้ทบทวน |
| --- | --- | --- | --- | --- | --- |
| ยังไม่มีรายการ | — | — | — | — | ยังไม่ทบทวน |

## ภาคผนวก

### แหล่งอ้างอิงและ snapshot

| รายการ | ค่า |
| --- | --- |
| Scanner | 0.1.1 |
| Target mode | working-tree-including-untracked |
| Target branch | — |
| Target HEAD / immutable commit | — |
| Git dirty / input drift | — / false |
| Snapshot content identity | bd5dc8ef65567a1d2b0ff4131f6294106a3580b211fdc181cac0437f48187aee |
| C# project context | — |
| Golden source mode | installed |
| Golden package / version | agrimap-agent-skills / 4.11.0 |
| Golden identity source / verified | — / — |
| Golden active commit | — |
| Golden selected content identity | 356da4b8770afbb0078e84e77265d0313e525c3cff80223a9f9c9d350f9077cb |
| Baseline report ID | — |

Working-tree HEAD ใช้อ้างอิง Git เท่านั้น ไม่ได้แปลว่า file bytes มาจาก committed snapshot ใช้ content identity และ input drift ร่วมกัน

### สถานะกฎและ diagnostics

| Detector / Golden ID | Capability | Execution | Evaluated / applicable / failed | Golden entry / digest | Diagnostics |
| --- | --- | --- | --- | --- | --- |
| fe-explicit-any / T6 | automated | evaluated | 1 / 1 / 0 | references/patterns/golden/frontend-main/008-3-typesafe-t6-forbidden.ts<br>`87594b1d0ebed048fc75c62e4b64b59d99e1aa9e79df2f0136cc86484dc34628` | — |
| fe-non-null / T6 | automated | evaluated | 1 / 1 / 0 | references/patterns/golden/frontend-main/008-3-typesafe-t6-forbidden.ts<br>`87594b1d0ebed048fc75c62e4b64b59d99e1aa9e79df2f0136cc86484dc34628` | — |
| fe-store-await / R3 | automated | not-applicable | 0 / 0 / 0 | references/patterns/golden/frontend-main/002-2-architecture-rules.md<br>`f78c25640aa21432f92eed3f5eb0f83597d0363d77b45d8d79196de62d364061` | — |
| fe-component-dependency / R1 | automated | evaluated | 1 / 1 / 0 | references/patterns/golden/frontend-main/002-2-architecture-rules.md<br>`f78c25640aa21432f92eed3f5eb0f83597d0363d77b45d8d79196de62d364061` | — |
| be-namespace-observation / Namespaces, files, and naming | automated | evaluated | 1 / 1 / 0 | references/patterns/csharp.md<br>`dc23a87886e57d072fca0420931096d3d76bfb9aedfbfec134e448eef67f07e9` | — |
| sql-procedure-declaration / Output artifact contract | automated | evaluated | 1 / 1 / 0 | references/patterns/sql.md<br>`d64064e575079b73fd8588092af3109046f3a00bd37ebbe251615f29c840ad20` | — |
| fe-library-public-surface / 3. Public API Contract | review-only | evaluated | 1 / 1 / 0 | references/patterns/golden/frontend-libraries/003-3-public-api-contract.md<br>`1e04d0f399bb27ce94b4ca94faebb5549b5d16b6c5554c04287ea53e7b783a1f` | — |
| be-library-contract / MUST — the public surface is the contract | review-only | not-applicable | 0 / 0 / 0 | references/patterns/checklists/backend-libraries.md<br>`4615a6949d8571fbfcd2af2c64c805dd02f2e9dac43bbd8ef2e24e28d5d9290e` | — |
| sql-table-contract / DDL contract | review-only | not-applicable | 0 / 0 / 0 | references/patterns/sql.md<br>`d64064e575079b73fd8588092af3109046f3a00bd37ebbe251615f29c840ad20` | — |
| sql-message-contract / Message collection gate | review-only | not-applicable | 0 / 0 / 0 | references/patterns/sql.md<br>`d64064e575079b73fd8588092af3109046f3a00bd37ebbe251615f29c840ad20` | — |

### Source diagnostics

ไม่พบ source diagnostic ในรายงานนี้

### ความสามารถทั้งหมดใน catalog

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
| be-type-and-async-shape | be-main | not-implemented | 1 | Public type counts, new Async/Task names, sync-over-async and empty catch need C# parser/semantic context. |
| be-boundaries-and-http-jobs | be-main | not-implemented | 1 | DTO/Domain/persistence, thin triggers/controllers and OAuth/HTTP response contracts need owner evidence. |
| be-runtime-contracts | be-main | not-implemented | 1 | Cancellation, identity/request precedence, DI, logs and response/error behavior need semantic/contract review. |
| be-library-published-contract | be-library | review-only | 0 | Source boundary located; actual published graph and consumers require review. |
| be-library-structure-overlap | be-library | not-implemented | 0 | C# structure and similar signatures do not prove duplicate capability. |
| be-library-request-and-feature-contracts | be-library | not-implemented | 0 | Request priority, compatibility and README/Playground/tests need owned evidence. |
| sql-procedure-output | sql-procedure | automated | 1 | Lexical declaration candidate; new/touched deployment role unresolved. |
| sql-table-ddl | sql-table | review-only | 0 | Location classified; object-per-file/DDL/section/schema constraints require owner-schema review. |
| sql-message-guards | sql-messages | review-only | 0 | File located; guards/codes/meaning not automatically validated. |
| sql-business-compatibility | sql-procedure | not-implemented | 1 | Suffix exceptions, results/errors/transactions and table/message reconciliation need owner evidence. |
| sql-table-data-semantics | sql-table | not-implemented | 0 | ID migration, indexes, cascade, seeds and relationships are never inferred from signatures. |

### ข้อจำกัดและหลักฐานที่ยังขาด

- Only local relative TypeScript imports/re-exports resolve; external framework, tsconfig aliases and C# semantic contexts remain unavailable. Architecture candidates require owner review.
- No owner exception input is implemented; decorated assertions and legacy/public boundaries remain review candidates.
- Other catalog families are review-only or not implemented; full catalog automation is not claimed.
- No-effect and manageability require behavioral/consumer evidence; all remediation assessments start unknown.
- Excluded subtrees are counted as boundary records, not enumerated files. Working-tree untracked selected files are included; ignored files outside excluded subtrees are also included.
- Lexical C#/SQL observations are candidates; preprocessor/raw-string/nested-comment edge cases require a real language parser.

ผลตรวจไม่อนุมัติการแก้โค้ด ประเมิน consumers, behavior/public/wire/data contracts และขอบเขต rollback ก่อนเสนอการแก้ทุกครั้ง
