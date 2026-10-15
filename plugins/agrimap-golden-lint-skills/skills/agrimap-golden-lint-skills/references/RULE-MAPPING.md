# กฎที่ตรวจและแหล่ง Golden

[Runtime contract](RUNTIME.md) · [Coverage](COVERAGE.md) · [Workflow](../../../docs/WORKFLOWS.md)

หน้านี้ผูก detector กับ exact source และอธิบายสิ่งที่ runner สรุปได้ เป็นการตีความของผู้ดูแล lint จาก Golden 4.11.0 ที่ pin ไว้ ยังรอ owner conformance review ไม่แทนกฎต้นฉบับ

## เปิด source ก่อนตัดสินผล

Path ด้านล่างอิง `skills/agrimap-agent-skills/` ของ Golden package ที่ caller ระบุ เปิด bytes จากแหล่งที่ตรวจ identity แล้ว ไม่ใช้หน้านี้แทน normative entry

ทุก binding ใช้ conflict-resolution.md, pattern-status.md, checklists/README.md, root Golden manifest, collection manifest, lane checklist และ exact entry ภายใต้ references/patterns/ มี collection/entry และ additional sourceDependencies ใน assets/rules.json ของ lint

FE เพิ่ม frontend.md/gencode-api.md; BE เพิ่ม backend.md/csharp.md; SQL ใช้ sql.md Reports บันทึก digests ใน authority.sourceDependencies และบล็อกกฎที่ dependency หาย/drift พร้อม SOURCE_DEPENDENCY_UNVERIFIED:<path> นี่เป็น direct dependency map ไม่ใช่ complete transitive authority proof Routing/classifier และ source identity เป็นหลักฐานอีกส่วนหนึ่ง

## ลำดับการพิจารณา

1. Owner-approved behavior ที่ตรงงานนี้
2. Active code/tests/schemas/callers และ deployed compatibility
3. Current normalized Golden guidance
4. Legacy evidence เฉพาะ scope ที่ประกาศและผ่าน conflict resolution

โครงสร้างเดิมที่ปะปนไม่แทน Golden สำหรับ new work แต่ structural precedence ไม่ให้สิทธิ์เปลี่ยน deployed behavior/public contract Owner/project evidence ที่ขาดยัง unknown Runner ยังไม่รับ owner exception records โดยอัตโนมัติ MUST มีผลใน scope ที่พิสูจน์แล้ว; FREE ไม่เป็น violation

FE-main เป็น current/curated ส่วน BE-main raw examples เป็น legacy-compatible กฎ namespace ใช้ maintained csharp.md เป็น current contract SQL collection เป็น mixed และ declaration observation ใช้ normalized sql.md ไม่ใช่ raw SQL ใดก็ได้ Library ต้องเทียบ published surface/version จริง

## Detector mapping

ทุกแถวเป็น MUST binding ชื่อ detector เป็นของ lint ส่วน Golden ID/section เป็นของ upstream Entry ในตารางอิง references/patterns/

| Detector / Golden ID | Exact entry / section | กฎและ scope | Exception / หลักฐานที่ต้องเพิ่ม | ผลสูงสุดตอนนี้ |
| --- | --- | --- | --- | --- |
| fe-explicit-any / T6 | golden/frontend-main/008-3-typesafe-t6-forbidden.ts | ห้าม explicit any ใน selected handwritten fe-main TypeScript; ตรวจ AST AnyKeyword | Exclude generated/tests/library; owner override ยังไม่ ingest เก็บ new/touched/legacy observations แยกจาก origin | Syntax conflict; ไม่ครอบคลุม implicit any หรือ T6 ทั้งหมด |
| fe-non-null / T6 | golden/frontend-main/008-3-typesafe-t6-forbidden.ts | ห้าม assertion ยกเว้น Angular ViewChild static:true; scope เหมือนแถว any | Expression/undecorated definite assignment ตรวจได้ ส่วน decorated property ต้อง resolve decorator/options/Angular identity Alias หรือชื่ออย่างเดียวไม่ prove exception | Undecorated syntax conflict; decorated เป็น review candidate ไม่ auto accept exception |
| fe-component-dependency / R1 | golden/frontend-main/002-2-architecture-rules.md, R1 | Component ใน features/shared ห้าม inject Store/generated API ตรง ต้อง resolve inject/token และ responsibility | providers: [Store] ทำได้; trivial local service pattern ทำได้ตาม conflict/lifecycle scope; library ใช้ contract ของตน | Injection-shaped candidate รวม valid Facade/local-name calls ไม่ใช่ defect count Constructor/namespace coverage ยังไม่ครบ |
| fe-store-await / R3 | golden/frontend-main/002-2-architecture-rules.md, R3 | Pure synchronous state/selectors/mutators; domain *.store.ts เป็นเพียง locator | ต้องพิสูจน์ store ownership, call identities และ owner scope; trivial-view exception ไม่อนุญาต async store | Async และ selected call/alias candidates ไม่ใช่ semantic verdict |
| be-namespace-observation / Namespaces, files, and naming | csharp.md, section ที่ระบุ | Roslyn namespace root/allowlist/file-scoped รวม missing namespace ของ declared types และ ordinary using | Main profile เท่านั้น Alias/static using ไม่เป็น namespace verdict; #if ไม่มี context จะ blocked รักษา deployed contracts | AST candidates, revision 2; ไม่ใช่ full project verdict |
| sql-procedure-declaration / Output artifact contract | sql.md, section ที่ระบุ | Created/edited procedure outputs ใช้ CREATE OR ALTER PROCEDURE; selected service SQL | ตรวจ deployment/history ก่อนใช้กับ legacy; raw-immutable evidence คงเดิม Suffix/business exception ต้องมี owner evidence แยก | Text candidate ไม่พิสูจน์ edit scope/deployment role |
| fe-library-public-surface / 3. Public API Contract | golden/frontend-libraries/003-3-public-api-contract.md | รักษา direct/wildcard/aliased exports ตรวจ consumers/version | รักษา facade islands ของ dynamic-lut, agrimap-component request/import-layer และ dynamic-dashboard; public change ต้องมี approved compatibility/version scope | Boundary review เท่านั้น ไม่มี export-graph/breaking verdict |
| be-library-contract / MUST — the public surface is the contract | checklists/backend-libraries.md, section ที่ระบุ | Published API/active source เป็น contract; intentional change ใช้ additive-first | ตรวจ version, consumers และ feature completeness ไม่ย้าย API นอก scope | Boundary review ไม่มี semantic compatibility verdict |
| sql-table-contract / DDL contract | sql.md, DDL contract | New table artifacts ตาม normalized layout/ID/audit/constraints | Existing ID retyping, FK/cascade และ data changes ต้องมี owner/schema scope; ไม่มี DB connection/execution | Boundary review ไม่ใช่ DDL correctness verdict |
| sql-message-contract / Message collection gate | sql.md, section ที่ระบุ | Canonical messages.sql registry, idempotent inserts และ code meanings ที่ reconcile แล้ว | Code เดียวความหมายต่าง/ไม่ทราบต้องมี owner decision; พิสูจน์ external registry ownership และ deployed semantics | Boundary review ไม่ได้ validate message/data semantics |

## Conformance ที่มีและที่ยังขาด

Source checkout มี `tests/fixtures/conformance/fe-cases.json` จำนวน 19 synthetic cases สถานะ pending-owner-review แยก proposed Golden outcome จาก expected scanner disposition ให้ตรวจสอบการตีความได้

ครอบคลุม any/unknown/text, assertion, ViewChild static options/alias/collision, Facade/Store/API injection shapes, providers, pure/async stores, RxJS alias, generated output และ library-shaped island fixture ตัวอย่าง library พิสูจน์ lane exclusion เท่านั้น ไม่ยืนยัน approval ของการเปลี่ยน library จริง

Candidate counts กับ forbidden-pattern counts เป็นคนละค่า Valid Facade call ยังสร้าง candidate ได้ Cases เหล่านี้บอก bounded behavior และ noise ที่รู้จัก ไม่ใช่ independent product corpus, measured false-positive/false-negative rates หรือ owner-confirmed exceptions

ก่อนยืนยัน architectural accuracy ให้ owner review outcomes เพิ่ม sanitized real examples พร้อม provenance/exact exception scope พิสูจน์ framework/symbol/ownership และวัดทั้ง missed cases กับ false accusations ระหว่างหลักฐานไม่ครบ R1/R3 และ decorated T6 ยังคงเป็น review candidates ส่วน catalog families อื่นมีสถานะตาม Coverage

## Backend syntax bindings ใน source 0.1.4

กฎต่อไปนี้เป็น normalized-maintained-contract / MUST ของ be-main จาก csharp.md และ backend-main checklist ทุกตัวต้องมี verified Golden dependencies, trusted --dotnet host, locked Roslyn reader และ parseable/context-supported source อ่าน [ขอบเขตและ trust plan](../../../docs/BACKEND-LINT.md)

| Detector | Golden ID / exact entry | สิ่งที่ตรวจ / ขอบเขต |
| --- | --- | --- |
| be-public-type-count | Namespaces, files, and naming / csharp.md | Explicit public declarations ตั้งแต่ตัวที่สอง รวม nested/delegate; compatibility ยังต้อง owner review |
| be-type-naming | Namespaces, files, and naming / csharp.md | Uppercase-initial/no-underscore type shape และ interface I + uppercase; ไม่ได้ตรวจทุก member naming |
| be-dependency-naming | Namespaces, files, and naming / csharp.md | _camelCase ของ private readonly fields ที่ constructor/primary-constructor parameter assignment พิสูจน์ได้จาก AST ไม่เหมารวม state |
| be-role-naming | MUST — naming and shape / checklists/backend-main.md | Top-level public DTO/use-case/repository suffix ตาม folder-shaped applicability, ไม่รวม enum; responsibility ยังต้อง review |
| be-repository-placement | REPO-01 / csharp.md | Repository-named interface/implementation กับ prescribed folders ไม่ infer model meaning |
| be-null-forgiving | NULL-02 / csharp.md | Null-forgiving syntax จริง ไม่ใช่ logical ! หรือ text; null behavior ยัง unknown |
| be-null-comparison | NULL-03 / csharp.md | ==/!= กับ null literal รวม parentheses; overloaded operator behavior ต้องทบทวน |
| be-empty-catch | ERR-04 / csharp.md | Catch ที่ไม่มี statements ไม่อ้างว่าตรวจ swallowed exceptions ทั้งหมด |
| be-async-blocking | ASYNC-03 / csharp.md | Runtime-resolved Task/ValueTask Result/Wait/awaiter GetResult และ awaited Task.FromResult; unknown symbols เป็น diagnostics |

ผลทุกข้อยัง review-candidate/unknown applicability ไม่มี autofix Scope library และ CT/Async suffix/DI/logging/request/transaction contracts ยังไม่ขยายโดยอาศัย syntax ชุดนี้
