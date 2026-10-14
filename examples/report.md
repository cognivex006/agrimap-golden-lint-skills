# AgriMap Golden lint report

Report: `364293fcf66dc1c8fabe561760120531b5c3877c5c405584fc65eb5f5956a62a`

Scan: **completed**. Selected 4/4 files; excluded 0.

Completed and zero findings do not establish universal compliance.

## Coverage

| Detector | Capability | Execution | Evaluated / applicable |
| --- | --- | --- | --- |
| fe-explicit-any | automated | evaluated | 1 / 1 |
| fe-non-null | automated | evaluated | 1 / 1 |
| fe-store-await | automated | not-applicable | 0 / 0 |
| fe-component-dependency | automated | evaluated | 1 / 1 |
| be-namespace-observation | automated | evaluated | 1 / 1 |
| sql-procedure-declaration | automated | evaluated | 1 / 1 |
| fe-library-public-surface | review-only | evaluated | 1 / 1 |
| be-library-contract | review-only | not-applicable | 0 / 0 |
| sql-table-contract | review-only | not-applicable | 0 / 0 |
| sql-message-contract | review-only | not-applicable | 0 / 0 |

## Findings

### b4945eed4d37f7114bcce63c5364651ed2bc9be6bde8cf0c963236044c14e9ef

`apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts`:1 — violation

Explicit any type token conflicts with T6. Inspect actual values and narrowing before replacing it.

Golden: T6; references/patterns/golden/frontend-main/008-3-typesafe-t6-forbidden.ts; current/MUST.

Origin: unknown; code scope: unknown; impact: unknown; manageability: unknown.

Investigate this exact declaration and its callers; propose the smallest owner-reviewed correction only after resolving applicability and compatibility.

Owner review and consumer/behavior evidence are required before any correction.

### 8da7c7604c6408400252013848f02ac8f245d96df37bdac62bc53785f3eca361

`apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts`:1 — violation

Non-null assertion conflicts with T6; null-path and consumer behavior remain unproven.

Golden: T6; references/patterns/golden/frontend-main/008-3-typesafe-t6-forbidden.ts; current/MUST.

Origin: unknown; code scope: unknown; impact: unknown; manageability: unknown.

Investigate this exact declaration and its callers; propose the smallest owner-reviewed correction only after resolving applicability and compatibility.

Owner review and consumer/behavior evidence are required before any correction.

### 5880119430bccac9d96f8739a675be3efc3e28021df39d6799e22f2ff029418e

`services/agmws-fixture-netcore/Src/Application/UseCases/Demo.cs`:1 — review-candidate

Namespace-shaped declaration differs from the fixed namespace/file-scoped contract. Confirm conditional compilation, namespace syntax and deployed ownership with a C# parser before declaring a violation.

Golden: Namespaces, files, and naming; references/patterns/csharp.md; current/MUST.

Origin: unknown; code scope: unknown; impact: unknown; manageability: unknown.

Investigate this exact declaration and its callers; propose the smallest owner-reviewed correction only after resolving applicability and compatibility.

Owner review and consumer/behavior evidence are required before any correction.

### 400b25de2e83fa3d12dced36faa1763be48db0d16368df5664526dd449935a81

`services/agmws-fixture-netcore/sql/DEMO/procedure/DEMO_Q.sql`:1 — review-candidate

Standalone procedure declaration candidate. The CREATE OR ALTER rule governs created/edited outputs; current history, deployment role and SQL parsing must establish applicability. No suffix/business semantics are inferred.

Golden: Output artifact contract; references/patterns/sql.md; current/MUST.

Origin: unknown; code scope: unknown; impact: unknown; manageability: unknown.

Investigate this exact declaration and its callers; propose the smallest owner-reviewed correction only after resolving applicability and compatibility.

Owner review and consumer/behavior evidence are required before any correction.

### 8eaca77d77544d5419b906da80832e8a5c875a9b2147f9f1189df3d3d233445a

`standards/libraries/angular/agrimap-platform/projects/dynamic-lut/src/public-api.ts`:1 — review-candidate

Contract boundary located. Obtain public surface, actual consumers, owner approval/exception scope and behavior evidence. This is a review requirement, not a defect.

Golden: 3. Public API Contract; references/patterns/golden/frontend-libraries/003-3-public-api-contract.md; current/MUST.

Origin: unknown; code scope: unknown; impact: unknown; manageability: unknown.

Investigate this exact declaration and its callers; propose the smallest owner-reviewed correction only after resolving applicability and compatibility.

Owner review and consumer/behavior evidence are required before any correction.

## Initial catalog capabilities

| Family | Capability | Selected lane files |
| --- | --- | --- |
| fe-component-dependencies | automated | 1 |
| fe-store-purity | automated | 1 |
| fe-t6-types | automated | 1 |
| fe-facade-flow-lifecycle | not-implemented | 1 |
| fe-new-code-naming | not-implemented | 1 |
| fe-generated-provenance | not-implemented | 1 |
| fe-library-public-contract | review-only | 1 |
| fe-library-naming | not-implemented | 1 |
| fe-library-feature-contracts | not-implemented | 1 |
| be-fixed-namespace | automated | 1 |
| be-type-and-async-shape | not-implemented | 1 |
| be-boundaries-and-http-jobs | not-implemented | 1 |
| be-runtime-contracts | not-implemented | 1 |
| be-library-published-contract | review-only | 0 |
| be-library-structure-overlap | not-implemented | 0 |
| be-library-request-and-feature-contracts | not-implemented | 0 |
| sql-procedure-output | automated | 1 |
| sql-table-ddl | review-only | 0 |
| sql-message-guards | review-only | 0 |
| sql-business-compatibility | not-implemented | 1 |
| sql-table-data-semantics | not-implemented | 0 |

## Limitations

- Only local relative TypeScript imports/re-exports resolve; external framework, tsconfig aliases and C# semantic contexts remain unavailable. Architecture candidates require owner review.
- No owner exception input is implemented; decorated assertions and legacy/public boundaries remain review candidates.
- Other catalog families are review-only or not implemented; full catalog automation is not claimed.
- No-effect and manageability require behavioral/consumer evidence; all remediation assessments start unknown.
- Excluded subtrees are counted as boundary records, not enumerated files. Working-tree untracked selected files are included; ignored files outside excluded subtrees are also included.
- Lexical C#/SQL observations are candidates; preprocessor/raw-string/nested-comment edge cases require a real language parser.
