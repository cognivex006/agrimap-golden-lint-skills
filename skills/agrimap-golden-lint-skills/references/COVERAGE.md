# ขอบเขตการตรวจ

<!-- GENERATED from assets/rules.json and assets/catalog.json by npm run sync -->

[Runtime contract](RUNTIME.md) · [กฎกับแหล่ง Golden](RULE-MAPPING.md) · [อ่านผลตรวจ](../../../docs/WORKFLOWS.md)

มี detector อัตโนมัติ 36 ตัวและ boundary review 4 ตัว คำว่า automated หมายถึง runner หาหลักฐานให้ ไม่ได้ยืนยัน architecture โดยอัตโนมัติ

## Detector ที่มี

| Detector | Lane | ความสามารถ | Evidence | Golden ID |
| --- | --- | --- | --- | --- |
| fe-explicit-any | fe-main | automated | syntax | T6 |
| fe-non-null | fe-main | automated | syntax | T6 |
| fe-store-await | fe-main | automated | syntax | R3 |
| fe-component-dependency | fe-main | automated | syntax | R1 |
| be-namespace-observation | be-main | automated | syntax | Namespaces, files, and naming |
| sql-procedure-declaration | sql-procedure | automated | text | Output artifact contract |
| fe-library-public-surface | fe-library | review-only | contract-review | 3. Public API Contract |
| be-library-contract | be-library | review-only | contract-review | MUST — the public surface is the contract |
| sql-table-contract | sql-table | review-only | contract-review | DDL contract |
| sql-message-contract | sql-messages | review-only | contract-review | Message collection gate |
| be-public-type-count | be-main | automated | syntax | Namespaces, files, and naming |
| be-type-naming | be-main | automated | syntax | Namespaces, files, and naming |
| be-dependency-naming | be-main | automated | syntax | Namespaces, files, and naming |
| be-role-naming | be-main | automated | syntax | MUST — naming and shape |
| be-repository-placement | be-main | automated | syntax | REPO-01 |
| be-null-forgiving | be-main | automated | syntax | NULL-02 |
| be-null-comparison | be-main | automated | syntax | NULL-03 |
| be-empty-catch | be-main | automated | syntax | ERR-04 |
| be-async-blocking | be-main | automated | semantic | ASYNC-03 |
| fe-file-naming | fe-main | automated | syntax | N1/N2/N3 |
| fe-symbol-naming | fe-main | automated | syntax | N4/N5/N8/N9 |
| fe-library-file-naming | fe-library | automated | syntax | N-lib-1/N-lib-3 |
| be-member-naming | be-main | automated | syntax | Namespaces, files, and naming / ASYNC-02 |
| be-async-naming | be-main | automated | syntax | Namespaces, files, and naming / ASYNC-02 |
| be-library-member-naming | be-library | automated | syntax | Namespaces, files, and naming / ASYNC-02 |
| be-library-async-naming | be-library | automated | syntax | Namespaces, files, and naming / ASYNC-02 |
| be-library-type-naming | be-library | automated | syntax | Namespaces, files, and naming |
| be-library-dependency-naming | be-library | automated | syntax | Namespaces, files, and naming |
| sql-procedure-naming | sql-procedure | automated | text | Output artifact contract / naming |
| sql-table-naming | sql-table | automated | text | Output artifact contract / naming |
| fe-main-hardcode-must | fe-main | automated | text | MUST — never hard-code an environment or service endpoint |
| fe-main-hardcode-should | fe-main | automated | text | SHOULD — shared constants live in the shared/constants home |
| fe-library-hardcode-must | fe-library | automated | text | MUST — never hard-code an environment or service endpoint |
| fe-library-hardcode-should | fe-library | automated | text | SHOULD — library constants follow the naming and constant-home contract |
| be-main-hardcode-must | be-main | automated | text | MUST — never hard-code an environment or service endpoint |
| be-main-hardcode-should | be-main | automated | text | SHOULD — centralize defaults once (REQ-03) |
| be-library-hardcode-must | be-library | automated | text | MUST — never hard-code an environment or service endpoint |
| be-library-hardcode-should | be-library | automated | text | SHOULD — centralize defaults once (REQ-03) |
| sql-procedure-hardcode-should | sql-procedure | automated | text | SHOULD — no host, link or database literal inside SQL |
| sql-table-hardcode-should | sql-table | automated | text | SHOULD — no host, link or database literal inside SQL |

T6 ตรวจ explicit syntax ส่วน decorated assertions ต้อง resolve exception R1/R3 เป็น review candidates แม้พบ syntax/name ที่ตรง pattern BE main/library ใช้ Roslyn detectors ตาม catalog ตาม [Backend lint](../../../docs/BACKEND-LINT.md) และ --dotnet; ผลยังเป็น candidates Library/table/messages detectors ระบุขอบเขตให้ตรวจ contract ไม่ใช่ defect verdict

## อ่านสถานะอย่างไร

| สถานะ | ความหมาย |
| --- | --- |
| automated | มี observation detector ตาม evidence level และ prerequisites ที่ระบุ |
| review-only | มี boundary locator ต้องเพิ่ม consumer/owner/contract evidence |
| not-implemented | ยังไม่มีการตรวจ family นี้ ไม่ใช่ตรวจแล้วผ่าน |

## Catalog ทั้งหมด

Canonical status มาจาก assets/catalog.json และปรากฏในรายงานทุกครั้ง Selected lane counts ให้บริบท ไม่ใช่จำนวนไฟล์ที่ family ที่ยังไม่ทำประเมินแล้ว อ่านข้อจำกัดราย family ใน catalog note ของ JSON report

| Family | Lane | สถานะ | Detector |
| --- | --- | --- | --- |
| fe-component-dependencies | fe-main | automated | fe-component-dependency |
| fe-store-purity | fe-main | automated | fe-store-await |
| fe-t6-types | fe-main | automated | fe-explicit-any, fe-non-null |
| fe-facade-flow-lifecycle | fe-main | not-implemented | — |
| fe-new-code-naming | fe-main | automated | fe-file-naming, fe-symbol-naming |
| fe-generated-provenance | fe-main | not-implemented | — |
| fe-library-public-contract | fe-library | review-only | fe-library-public-surface |
| fe-library-naming | fe-library | automated | fe-library-file-naming |
| fe-library-feature-contracts | fe-library | not-implemented | — |
| be-fixed-namespace | be-main | automated | be-namespace-observation |
| be-type-and-async-shape | be-main | not-implemented | — |
| be-boundaries-and-http-jobs | be-main | not-implemented | — |
| be-runtime-contracts | be-main | not-implemented | — |
| be-library-published-contract | be-library | review-only | be-library-contract |
| be-library-structure-overlap | be-library | not-implemented | — |
| be-library-request-and-feature-contracts | be-library | not-implemented | — |
| sql-procedure-output | sql-procedure | automated | sql-procedure-declaration |
| sql-table-ddl | sql-table | review-only | sql-table-contract |
| sql-message-guards | sql-messages | review-only | sql-message-contract |
| sql-business-compatibility | sql-procedure | not-implemented | — |
| sql-table-data-semantics | sql-table | not-implemented | — |
| be-type-structure | be-main | automated | be-public-type-count, be-type-naming, be-dependency-naming, be-role-naming |
| be-repository-placement | be-main | automated | be-repository-placement |
| be-nullable-syntax | be-main | automated | be-null-forgiving, be-null-comparison |
| be-empty-catch | be-main | automated | be-empty-catch |
| be-task-blocking | be-main | automated | be-async-blocking |
| be-member-names | be-main | automated | be-member-naming, be-async-naming |
| be-library-member-names | be-library | automated | be-library-member-naming, be-library-async-naming, be-library-type-naming, be-library-dependency-naming |
| sql-procedure-naming | sql-procedure | automated | sql-procedure-naming |
| sql-table-naming | sql-table | automated | sql-table-naming |
| fe-hardcode-literals | fe-main | automated | fe-main-hardcode-must, fe-main-hardcode-should |
| fe-library-hardcode-literals | fe-library | automated | fe-library-hardcode-must, fe-library-hardcode-should |
| be-hardcode-literals | be-main | automated | be-main-hardcode-must, be-main-hardcode-should |
| be-library-hardcode-literals | be-library | automated | be-library-hardcode-must, be-library-hardcode-should |
| sql-procedure-hardcode-literals | sql-procedure | automated | sql-procedure-hardcode-should |
| sql-table-hardcode-literals | sql-table | automated | sql-table-hardcode-should |

## สิ่งที่ยังต้องทบทวนด้วยหลักฐานเพิ่ม

ยังไม่มี full semantic dependency graph, R2/R4/R5 flow/lifecycle, new-code naming applicability ที่ต้องยืนยัน history, generated provenance, export compatibility, full async/signature contracts, cancellation, DI/logging, request-value semantics, capability duplication และ SQL DDL/message/index/relationship semantics

ดู exact scope/conflicts/exceptions ใน Rule mapping ก่อนอธิบายผล ขณะนี้ยังไม่มี owner-exception input และ independent real-product conformance corpus ชุด synthetic cases ยัง pending-owner-review จึงไม่ใช้ยืนยัน precision/recall
