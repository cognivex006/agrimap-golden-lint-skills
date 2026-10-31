# กฎที่ตรวจและแหล่ง Golden

[Runtime contract](RUNTIME.md) · [Coverage](COVERAGE.md) · [Workflow](../../../docs/WORKFLOWS.md)

หน้านี้ผูก detector กับ exact source และอธิบายสิ่งที่ runner สรุปได้ เป็นการตีความของผู้ดูแล lint จาก Golden 5.0.2 ที่ pin ไว้ (V002 เดิมอ้าง 4.11.0) ยังรอ owner conformance review ไม่แทนกฎต้นฉบับ

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
| be-file-layout, be-library-file-layout / NS-01 | csharp.md, Namespaces, files, and naming (NS-01) และ checklist ของ lane | using ที่อยู่หลัง namespace (`using-after-namespace`), บรรทัดว่างไม่ใช่หนึ่งบรรทัดระหว่าง using/namespace/type แบบ file-scoped (`section-spacing`) และ block namespace ของ library (`block-namespace`; main รายงานผ่าน be-namespace-observation) | ไม่ตรวจ spacing เมื่อมี assembly attributes; comment/region/attribute นับเป็นต้น section; generated และ top-level Program.cs ไม่มี namespace จึงไม่ถูกตรวจ ต้องยืนยันว่าย้าย using ออกจาก namespace แล้ว name resolution ไม่เปลี่ยน | AST candidates, revision 1 |
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

## SonarQube-aligned bindings ใน 0.1.12

QUALITY-01..04 มาจาก csharp.md และ references/sonarqube-remediation.md ของ Golden 5.0.4 (QUALITY-04 และ notice contract เริ่มมีใน 5.0.4) Sonar key เป็นบริบทของกฎที่เกี่ยวข้องเท่านั้น ผลทุกข้อเป็น lint candidate ตาม Golden ไม่ใช่ผลสแกน SonarQube และ `externalAnalyzer.resultStatus` เป็น `not-imported` เสมอ

| Sonar key (default severity) | Golden ID | Detector | Evidence | สิ่งที่ตรวจ / ขอบเขต |
| --- | --- | --- | --- | --- |
| csharpsquid:S3776 (Critical) — related, not equivalent | QUALITY-01 | be-method-branches | syntax | if/else-if รวม nested มากกว่า 7 ต่อ function scope; else เปล่าไม่นับ local function/lambda/accessor แยก scope ไม่คำนวณคะแนน S3776 |
| csharpsquid:S107 (Major) | QUALITY-02 | be-parameter-count | syntax | Parameters มากกว่า 7 ของ method/constructor/operator/local function ไม่รวม override, explicit interface implementation, extern, primary constructor และ record positional parameters |
| csharpsquid:S3358 (Major) | QUALITY-03 | be-nested-ternary | syntax | Conditional expression ที่ซ้อนใน conditional อื่น รวมใน anonymous-object member หยุดที่ขอบเขต lambda ไม่นับ `??`/`?.` |
| — | QUALITY-01 (S3776 gate) | — (not-implemented) | — | ต้องใช้ analyzer และ Quality Profile จริง รายงานเป็น unknown ไม่ใช่ผ่าน |
| — | QUALITY-04 | — (not-implemented) | — | การแจ้งผู้ขอเป็นพฤติกรรมของ executor พิสูจน์จาก AST ไม่ได้ ส่งต่อเป็นข้อบังคับใน remediation prompt ของสามกฎข้างบน |

เพดาน 7 เป็นกฎทีม ไม่ได้อ่าน threshold จาก Quality Profile

### Advisory smells (QUALITY-05)

ADV-01..07 อยู่ในหัวข้อ Advisory code smells ของ references/sonarqube-remediation.md ตั้งแต่ Golden 5.0.5 และ ADV-08/09 ตั้งแต่ 5.0.7 (ADV-10..14 ที่เพิ่มใน 5.0.8 ยังไม่มี detector) ทีมตกลงว่าเป็น smell ที่แก้หรือไม่แก้ก็ได้ binding จึงเป็น tier SHOULD, remediation guide มี `advisory: true` รายงานเรียงไว้หลังกฎอื่น และ prompt ระบุว่าค่าเริ่มต้นคือ recommendation ใช้แก้เมื่อผู้ขอสั่งเท่านั้น

| Sonar key (default severity) | Golden ID | Detector | Evidence | สิ่งที่ตรวจ / ขอบเขต |
| --- | --- | --- | --- | --- |
| csharpsquid:S4136 (Minor) | ADV-01 | be-overload-adjacency, be-library-overload-adjacency | syntax | Methods ชื่อเดียวกันใน type declaration เดียวที่ถูกคั่นด้วย member อื่น รายงานครั้งเดียวที่ overload แรก ไม่เทียบ partial ข้ามไฟล์, constructors และ explicit interface implementations |
| external_roslyn:CA1822, csharpsquid:S2325 | ADV-02 | — (not-implemented) | — | ต้องรู้ instance members ที่สืบทอดมา, interface/override และการเรียกผ่าน reflection |
| csharpsquid:S1905 | ADV-03 | — (not-implemented) | — | ต้องรู้ type ที่ประกาศจริงของ expression ซึ่ง reader มีแค่ runtime metadata |
| csharpsquid:S3236 (Minor) | ADV-04 | be-caller-info-argument | syntax | paramName ที่ส่งเองให้ runtime guards ของ ArgumentNullException/ArgumentException/ArgumentOutOfRangeException รวม named `paramName:` |
| csharpsquid:S1481 (Minor) | ADV-05 | be-unused-local | syntax | Local declaration ที่ไม่ถูกอ้างอีกใน block ไม่รวม using declaration, `_`, pattern/out variables และ dead store |
| external_roslyn:xUnit2032 | ADV-06 | — (not-implemented) | — | อยู่ใน Tests/ ซึ่งไม่อยู่ใน declared product layout |
| external_roslyn:CA1816 (Info) | ADV-07 | be-dispose-suppress-finalize | syntax | Dispose() ของ class ที่ระบุ IDisposable ตรง ๆ ไม่ sealed หรือมี finalizer และไม่เรียก GC.SuppressFinalize ไม่ resolve disposable ที่สืบทอดมา |
| external_roslyn:CA1861 (Info) | ADV-08 | be-constant-array-argument | syntax | Array creation ที่ทุก element เป็น literal (รวมเลขติดลบ), typeof หรือ nameof และเป็น argument ของ call/constructor ไม่รวม attribute arguments, collection expressions, const identifiers และ Tests/ |
| external_roslyn:SYSLIB1045 (Info) | ADV-09 | be-generated-regex | syntax | Regex static call (IsMatch, Match, Matches, Replace, Split, Count, Enumerate*) หรือ new Regex ที่ pattern (ตามตำแหน่งหรือชื่อ `pattern:`) เป็น string literal ระบุจากชื่อ type `Regex`; ไม่ resolve const pattern, `new(...)` แบบ target-typed หรือ .NET 7+ และไม่ตรวจ S6444 |

## Naming bindings ใน 0.1.5

อ่าน [Naming lint](../../../docs/NAMING-LINT.md) ประกอบ exact frontend-main/013-8-naming-patterns.md (N1–N5/N8–N9), frontend-libraries/005-5-naming-in-libraries.md (N-lib), csharp.md (PascalCase/ASYNC-02) และ sql.md (output/naming) ทั้งหมด pin ใน source-lock 5.0.2 ผลเป็น candidates/unknown applicability เพราะ entity history, owner exceptions และ consumers ยังต้องพิสูจน์ ไม่สร้างกฎ camelCase ทุก C# local/parameter หรืออนุมาน business behavior จากชื่อ

## Hardcode bindings ใน 0.1.11

อ่าน [Hardcode lint](../../../docs/HARDCODE-LINT.md) และ canonical class table `assets/hardcode-classes.json` ประกอบ binding เหล่านี้เป็น lexical observation จาก literal ที่ parse ได้ (minimumEvidenceLevel `text`, observationKind `text-observation`) ใช้ tier ของ Golden โดยตรง: MUST เป็น `violation` เฉพาะ `HC-SECRET`/`HC-ENVURL` ส่วน `HC-PROXYBYPASS` และ class อื่นเป็น review-candidate; SHOULD ใช้ต่อได้แต่ต้องบันทึกเหตุผล และ FREE ไม่เป็น violation

หนึ่ง detector ผูกกับหนึ่ง tier bucket จึงรายงาน authority tier ที่ตรงกับ class ที่ emit ได้เสมอ ส่วน class จริงอยู่ใน finding แต่ละตัว

| Detector | Golden ID / exact entry | Class ที่ผูก | Lane |
| --- | --- | --- | --- |
| fe-main-hardcode-must | MUST — never hard-code an environment or service endpoint / references/service-url-matrix.md | HC-SECRET, HC-ENVURL, HC-PROXYBYPASS, HC-EXTURL | fe-main |
| fe-main-hardcode-should | SHOULD — shared constants live in the shared/constants home / golden/frontend-main/013-8-naming-patterns.md | HC-MAGIC | fe-main |
| fe-library-hardcode-must | MUST — never hard-code an environment or service endpoint / references/service-url-matrix.md | HC-SECRET, HC-ENVURL, HC-PROXYBYPASS, HC-EXTURL | fe-library |
| fe-library-hardcode-should | SHOULD — library constants follow the naming and constant-home contract / golden/frontend-libraries/005-5-naming-in-libraries.md | HC-MAGIC | fe-library |
| be-main-hardcode-must | MUST — never hard-code an environment or service endpoint / references/service-url-matrix.md | HC-SECRET, HC-ENVURL, HC-PROXYBYPASS, HC-EXTURL | be-main |
| be-main-hardcode-should | SHOULD — centralize defaults once (REQ-03) / references/patterns/csharp.md | HC-CONFIG, HC-MAGIC | be-main |
| be-library-hardcode-must | MUST — never hard-code an environment or service endpoint / references/service-url-matrix.md | HC-SECRET, HC-ENVURL, HC-PROXYBYPASS, HC-EXTURL | be-library |
| be-library-hardcode-should | SHOULD — centralize defaults once (REQ-03) / references/patterns/csharp.md | HC-CONFIG, HC-MAGIC | be-library |
| sql-procedure-hardcode-should | SHOULD — no host, link or database literal inside SQL / references/patterns/sql.md | HC-SQL | sql-procedure |
| sql-table-hardcode-should | SHOULD — no host, link or database literal inside SQL / references/patterns/sql.md | HC-SQL | sql-table |

HC-PROXYBYPASS อ้าง Proxies ของ service-url-matrix.md (external map/layer/geocoding ต้องผ่าน arcgis-proxy) และ HC-ENVURL อ้าง Application URL matrix; HC-CONFIG อ้าง REQ-03 ของ csharp.md; HC-SQL อ้างข้อกำหนด host/link/database ของ sql.md ส่วน HC-MAGIC อ้าง shared/constants contract ใน frontend.md/backend.md ทั้งหมด pin ใน source-lock 5.0.2

ค่า secret ไม่ถูกคัดลอกลง observation ทุกรายงาน เก็บเพียง mask และ digest ผลทุก class นอก `HC-SECRET`/`HC-ENVURL` ยัง review-candidate/unknown applicability ไม่มี autofix ไม่ execute ปลายทาง และไม่ยืนยันว่า proxy route หรือ key มีอยู่จริง

## Security bindings ใน 0.1.15

อ่าน [Security lint](../../../docs/SECURITY-LINT.md) และ canonical class table `assets/security-classes.json` ประกอบ หนึ่ง detector ผูกหนึ่ง class ต่อหนึ่ง lane (`<lane>-sec-<slug>`) เป็น lexical observation (minimumEvidenceLevel `text`, observationKind `text-observation`) และเป็น review-candidate ทุกตัว authority มี `securityStandard` (OWASP Top 10:2021, CWE, `goldenBacking`, `resultStatus: not-imported`) และ finding มี `security` (class, owasp, cwe, severity)

Tier เป็น `MUST` เฉพาะ class ที่ Golden ระบุเรื่องเดียวกัน ส่วน class อื่นมี `goldenRuleId` เป็น `none — SEC-xx security baseline`, tier `SHOULD` และ `sourceStatusBasis: external-security-standard` จึงเป็น package security baseline ไม่ใช่ Golden verdict ทุก binding ยัง pin lane baseline (csharp.md, frontend.md หรือ sql.md) ใน source-lock เพื่อให้ blocked เมื่อ Golden drift เหมือนกฎอื่น

| Class | Golden ID / exact entry | Lane |
| --- | --- | --- |
| SEC-01 SQL text assembled from values | Async, errors, data, and logs / references/patterns/csharp.md (stored-procedure parameters); SQL lane ไม่มีกฎ Golden | be-main, be-library, sql-procedure |
| SEC-05 Endpoint without authorization | CTL-03 / references/patterns/csharp.md (standard class attributes รวม `[Authorize]`) | be-main |
| SEC-06 Exception detail sent to the caller | Async, errors, data, and logs / references/patterns/csharp.md (keep internal detail out of user-facing messages) | be-main, be-library |
| SEC-07 Credential or personal value in logs | Async, errors, data, and logs / references/patterns/csharp.md (never log secrets, tokens, cookies or personal data) | be-main, be-library |
| SEC-02..04, SEC-08..18, SEC-20 | ไม่มีกฎ Golden โดยตรง (baseline, SHOULD) | be-main, be-library (SEC-15/16 รวม fe-main, fe-library) |
| SEC-19 Host security headers | ไม่มีกฎ Golden โดยตรง (baseline, SHOULD) | be-main |
| SEC-21, SEC-22 | ไม่มีกฎ Golden โดยตรง (baseline, SHOULD) | fe-main, fe-library |

Observations ใช้ข้อความจาก vocabulary คงที่ (ชื่อ API และหมวดของค่า) ไม่คัดลอก code หรือ literal ไม่มี data-flow, taint หรือ cross-file resolution และไม่อ่าน Angular `.html` templates หมวด deployment (request smuggling, unpatched server, TLS cipher, proxy banner/internal IP), A06 components และ data-flow families (IDOR, mass assignment, CSRF, SSRF, upload, rate limiting) อยู่ใน catalog แบบ not-implemented Public-Key-Pins ไม่ถูกนำมาเป็นกฎเพราะ browser เลิกรองรับ
