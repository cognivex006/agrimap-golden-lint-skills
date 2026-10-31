# ขอบเขตการตรวจ

<!-- GENERATED from assets/rules.json and assets/catalog.json by npm run sync -->

[Runtime contract](RUNTIME.md) · [กฎกับแหล่ง Golden](RULE-MAPPING.md) · [อ่านผลตรวจ](../../../docs/WORKFLOWS.md)

มี detector อัตโนมัติ 95 ตัวและ boundary review 4 ตัว คำว่า automated หมายถึง runner หาหลักฐานให้ ไม่ได้ยืนยัน architecture โดยอัตโนมัติ

## Detector ที่มี

| Detector | Lane | ความสามารถ | Evidence | Golden ID |
| --- | --- | --- | --- | --- |
| fe-explicit-any | fe-main | automated | syntax | T6 |
| fe-non-null | fe-main | automated | syntax | T6 |
| fe-store-await | fe-main | automated | syntax | R3 |
| fe-component-dependency | fe-main | automated | syntax | R1 |
| be-namespace-observation | be-main | automated | syntax | Namespaces, files, and naming |
| be-file-layout | be-main | automated | syntax | NS-01 |
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
| be-method-branches | be-main | automated | syntax | QUALITY-01 |
| be-parameter-count | be-main | automated | syntax | QUALITY-02 |
| be-nested-ternary | be-main | automated | syntax | QUALITY-03 |
| be-overload-adjacency | be-main | automated | syntax | ADV-01 |
| be-caller-info-argument | be-main | automated | syntax | ADV-04 |
| be-unused-local | be-main | automated | syntax | ADV-05 |
| be-dispose-suppress-finalize | be-main | automated | syntax | ADV-07 |
| be-constant-array-argument | be-main | automated | syntax | ADV-08 |
| be-generated-regex | be-main | automated | syntax | ADV-09 |
| fe-file-naming | fe-main | automated | syntax | N1/N2/N3 |
| fe-symbol-naming | fe-main | automated | syntax | N4/N5/N8/N9 |
| fe-library-file-naming | fe-library | automated | syntax | N-lib-1/N-lib-3 |
| be-member-naming | be-main | automated | syntax | Namespaces, files, and naming / ASYNC-02 |
| be-async-naming | be-main | automated | syntax | Namespaces, files, and naming / ASYNC-02 |
| be-library-member-naming | be-library | automated | syntax | Namespaces, files, and naming / ASYNC-02 |
| be-library-async-naming | be-library | automated | syntax | Namespaces, files, and naming / ASYNC-02 |
| be-library-type-naming | be-library | automated | syntax | Namespaces, files, and naming |
| be-library-dependency-naming | be-library | automated | syntax | Namespaces, files, and naming |
| be-library-file-layout | be-library | automated | syntax | NS-01 |
| be-library-overload-adjacency | be-library | automated | syntax | ADV-01 |
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
| be-sec-sql-injection | be-main | automated | text | Async, errors, data, and logs |
| be-library-sec-sql-injection | be-library | automated | text | Async, errors, data, and logs |
| sql-procedure-sec-sql-injection | sql-procedure | automated | text | none — SEC-01 security baseline |
| be-sec-code-injection | be-main | automated | text | none — SEC-02 security baseline |
| be-library-sec-code-injection | be-library | automated | text | none — SEC-02 security baseline |
| be-sec-ldap-injection | be-main | automated | text | none — SEC-03 security baseline |
| be-library-sec-ldap-injection | be-library | automated | text | none — SEC-03 security baseline |
| be-sec-path-traversal | be-main | automated | text | none — SEC-04 security baseline |
| be-library-sec-path-traversal | be-library | automated | text | none — SEC-04 security baseline |
| be-sec-missing-authorization | be-main | automated | text | CTL-03 |
| be-sec-error-detail-exposure | be-main | automated | text | Async, errors, data, and logs |
| be-library-sec-error-detail-exposure | be-library | automated | text | Async, errors, data, and logs |
| be-sec-sensitive-logging | be-main | automated | text | Async, errors, data, and logs |
| be-library-sec-sensitive-logging | be-library | automated | text | Async, errors, data, and logs |
| be-sec-weak-cryptography | be-main | automated | text | none — SEC-08 security baseline |
| be-library-sec-weak-cryptography | be-library | automated | text | none — SEC-08 security baseline |
| be-sec-token-validation | be-main | automated | text | none — SEC-09 security baseline |
| be-library-sec-token-validation | be-library | automated | text | none — SEC-09 security baseline |
| be-sec-token-issuance | be-main | automated | text | none — SEC-10 security baseline |
| be-library-sec-token-issuance | be-library | automated | text | none — SEC-10 security baseline |
| be-sec-tls-validation-bypass | be-main | automated | text | none — SEC-11 security baseline |
| be-library-sec-tls-validation-bypass | be-library | automated | text | none — SEC-11 security baseline |
| be-sec-unsafe-deserialization | be-main | automated | text | none — SEC-12 security baseline |
| be-library-sec-unsafe-deserialization | be-library | automated | text | none — SEC-12 security baseline |
| be-sec-permissive-cors | be-main | automated | text | none — SEC-13 security baseline |
| be-library-sec-permissive-cors | be-library | automated | text | none — SEC-13 security baseline |
| be-sec-method-override | be-main | automated | text | none — SEC-14 security baseline |
| be-library-sec-method-override | be-library | automated | text | none — SEC-14 security baseline |
| be-sec-open-redirect | be-main | automated | text | none — SEC-15 security baseline |
| be-library-sec-open-redirect | be-library | automated | text | none — SEC-15 security baseline |
| fe-sec-open-redirect | fe-main | automated | text | none — SEC-15 security baseline |
| fe-library-sec-open-redirect | fe-library | automated | text | none — SEC-15 security baseline |
| be-sec-sensitive-query-value | be-main | automated | text | none — SEC-16 security baseline |
| be-library-sec-sensitive-query-value | be-library | automated | text | none — SEC-16 security baseline |
| fe-sec-sensitive-query-value | fe-main | automated | text | none — SEC-16 security baseline |
| fe-library-sec-sensitive-query-value | fe-library | automated | text | none — SEC-16 security baseline |
| be-sec-sensitive-response-field | be-main | automated | text | none — SEC-17 security baseline |
| be-library-sec-sensitive-response-field | be-library | automated | text | none — SEC-17 security baseline |
| be-sec-unbounded-input | be-main | automated | text | none — SEC-18 security baseline |
| be-library-sec-unbounded-input | be-library | automated | text | none — SEC-18 security baseline |
| be-sec-security-headers | be-main | automated | text | none — SEC-19 security baseline |
| be-sec-insecure-cookie | be-main | automated | text | none — SEC-20 security baseline |
| be-library-sec-insecure-cookie | be-library | automated | text | none — SEC-20 security baseline |
| fe-sec-dom-xss-sink | fe-main | automated | text | none — SEC-21 security baseline |
| fe-library-sec-dom-xss-sink | fe-library | automated | text | none — SEC-21 security baseline |
| fe-sec-token-web-storage | fe-main | automated | text | none — SEC-22 security baseline |
| fe-library-sec-token-web-storage | fe-library | automated | text | none — SEC-22 security baseline |

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
| be-fixed-namespace | be-main | automated | be-namespace-observation, be-file-layout |
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
| be-method-complexity | be-main | automated | be-method-branches, be-parameter-count, be-nested-ternary |
| be-sonar-cognitive-complexity | be-main | not-implemented | — |
| be-sonar-remediation-notice | be-main | not-implemented | — |
| be-advisory-smells | be-main | automated | be-overload-adjacency, be-caller-info-argument, be-unused-local, be-dispose-suppress-finalize, be-constant-array-argument, be-generated-regex |
| be-advisory-semantic-smells | be-main | not-implemented | — |
| be-advisory-test-smells | be-main | not-implemented | — |
| be-member-names | be-main | automated | be-member-naming, be-async-naming |
| be-library-member-names | be-library | automated | be-library-member-naming, be-library-async-naming, be-library-type-naming, be-library-dependency-naming |
| be-library-file-layout | be-library | automated | be-library-file-layout |
| be-library-advisory-smells | be-library | automated | be-library-overload-adjacency |
| sql-procedure-naming | sql-procedure | automated | sql-procedure-naming |
| sql-table-naming | sql-table | automated | sql-table-naming |
| fe-hardcode-literals | fe-main | automated | fe-main-hardcode-must, fe-main-hardcode-should |
| fe-library-hardcode-literals | fe-library | automated | fe-library-hardcode-must, fe-library-hardcode-should |
| be-hardcode-literals | be-main | automated | be-main-hardcode-must, be-main-hardcode-should |
| be-library-hardcode-literals | be-library | automated | be-library-hardcode-must, be-library-hardcode-should |
| sql-procedure-hardcode-literals | sql-procedure | automated | sql-procedure-hardcode-should |
| sql-table-hardcode-literals | sql-table | automated | sql-table-hardcode-should |
| be-security-application | be-main | automated | be-sec-sql-injection, be-sec-code-injection, be-sec-ldap-injection, be-sec-path-traversal, be-sec-missing-authorization, be-sec-error-detail-exposure, be-sec-sensitive-logging, be-sec-weak-cryptography, be-sec-token-validation, be-sec-token-issuance, be-sec-tls-validation-bypass, be-sec-unsafe-deserialization, be-sec-permissive-cors, be-sec-method-override, be-sec-open-redirect, be-sec-sensitive-query-value, be-sec-sensitive-response-field, be-sec-unbounded-input, be-sec-security-headers, be-sec-insecure-cookie |
| be-library-security-application | be-library | automated | be-library-sec-sql-injection, be-library-sec-code-injection, be-library-sec-ldap-injection, be-library-sec-path-traversal, be-library-sec-error-detail-exposure, be-library-sec-sensitive-logging, be-library-sec-weak-cryptography, be-library-sec-token-validation, be-library-sec-token-issuance, be-library-sec-tls-validation-bypass, be-library-sec-unsafe-deserialization, be-library-sec-permissive-cors, be-library-sec-method-override, be-library-sec-open-redirect, be-library-sec-sensitive-query-value, be-library-sec-sensitive-response-field, be-library-sec-unbounded-input, be-library-sec-insecure-cookie |
| fe-security-application | fe-main | automated | fe-sec-open-redirect, fe-sec-sensitive-query-value, fe-sec-dom-xss-sink, fe-sec-token-web-storage |
| fe-library-security-application | fe-library | automated | fe-library-sec-open-redirect, fe-library-sec-sensitive-query-value, fe-library-sec-dom-xss-sink, fe-library-sec-token-web-storage |
| sql-procedure-security-application | sql-procedure | automated | sql-procedure-sec-sql-injection |
| be-security-dataflow | be-main | not-implemented | — |
| be-security-dependencies | be-main | not-implemented | — |
| be-security-deployment | be-main | not-implemented | — |

## สิ่งที่ยังต้องทบทวนด้วยหลักฐานเพิ่ม

ยังไม่มี full semantic dependency graph, R2/R4/R5 flow/lifecycle, new-code naming applicability ที่ต้องยืนยัน history, generated provenance, export compatibility, full async/signature contracts, cancellation, DI/logging, request-value semantics, capability duplication และ SQL DDL/message/index/relationship semantics

ดู exact scope/conflicts/exceptions ใน Rule mapping ก่อนอธิบายผล ขณะนี้ยังไม่มี owner-exception input และ independent real-product conformance corpus ชุด synthetic cases ยัง pending-owner-review จึงไม่ใช้ยืนยัน precision/recall
