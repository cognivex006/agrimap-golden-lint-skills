# Declared coverage

<!-- GENERATED from assets/rules.json by npm run sync -->

[Runtime contract](RUNTIME.md). Six automated observation detectors; automation does not imply definitive architectural proof.

| Detector | Lane | Capability | Evidence | Golden ID |
| --- | --- | --- | --- | --- |
| fe-explicit-any | fe-main | automated | syntax | T6 |
| fe-non-null | fe-main | automated | syntax | T6 |
| fe-store-await | fe-main | automated | syntax | R3 |
| fe-component-dependency | fe-main | automated | syntax | R1 |
| be-namespace-observation | be-main | automated | text | Namespaces, files, and naming |
| sql-procedure-declaration | sql-procedure | automated | text | Output artifact contract |
| fe-library-public-surface | fe-library | review-only | contract-review | 3. Public API Contract |
| be-library-contract | be-library | review-only | contract-review | MUST — the public surface is the contract |
| sql-table-contract | sql-table | review-only | contract-review | DDL contract |
| sql-message-contract | sql-messages | review-only | contract-review | Message collection gate |

Not implemented: full semantic dependency graph, R2/R4/R5 flow/lifecycle, naming/new-code scope rules, generated provenance, export-graph compatibility, async Task conventions, public-type counts, cancellation, DI/logging, request-value semantics, capability duplication, SQL DDL/message/index/relationship semantics. These families remain an explicit manual owner review backlog.

## Full initial catalog

Canonical status: assets/catalog.json; every JSON report includes these families.

| Family | Lane | Status | Limits |
| --- | --- | --- | --- |
| fe-component-dependencies | fe-main | automated | Injection-shaped candidates; framework/ownership resolution incomplete. |
| fe-store-purity | fe-main | automated | Await/async and selected call candidates; no full flow equivalence. |
| fe-t6-types | fe-main | automated | Explicit syntax; decorated assertions need exception resolution. |
| fe-facade-flow-lifecycle | fe-main | not-implemented | R2/R4/R5 orchestration, signals, conversion, subscriptions and trivial-view exceptions need semantic/contract review. |
| fe-new-code-naming | fe-main | not-implemented | Selectors/file/handler naming needs new/touched entity applicability. |
| fe-generated-provenance | fe-main | not-implemented | Boundaries classified; generator drift/hand-edit provenance not asserted. |
| fe-library-public-contract | fe-library | review-only | Export/alias and approved facade/store islands require owner/consumer review, never automatic breaking-change classification. |
| fe-library-naming | fe-library | not-implemented | New no-suffix/selector naming and legacy exceptions need entity history. |
| fe-library-feature-contracts | fe-library | not-implemented | Service-first behavior, README/Playground and generated boundaries need owned contracts. |
| be-fixed-namespace | be-main | automated | Lexical declaration/reference candidates; conditional compilation unresolved. |
| be-type-and-async-shape | be-main | not-implemented | Public type counts, new Async/Task names, sync-over-async and empty catch need C# parser/semantic context. |
| be-boundaries-and-http-jobs | be-main | not-implemented | DTO/Domain/persistence, thin triggers/controllers and OAuth/HTTP response contracts need owner evidence. |
| be-runtime-contracts | be-main | not-implemented | Cancellation, identity/request precedence, DI, logs and response/error behavior need semantic/contract review. |
| be-library-published-contract | be-library | review-only | Source boundary located; actual published graph and consumers require review. |
| be-library-structure-overlap | be-library | not-implemented | C# structure and similar signatures do not prove duplicate capability. |
| be-library-request-and-feature-contracts | be-library | not-implemented | Request priority, compatibility and README/Playground/tests need owned evidence. |
| sql-procedure-output | sql-procedure | automated | Lexical declaration candidate; new/touched deployment role unresolved. |
| sql-table-ddl | sql-table | review-only | Location classified; object-per-file/DDL/section/schema constraints require owner-schema review. |
| sql-message-guards | sql-messages | review-only | File located; guards/codes/meaning not automatically validated. |
| sql-business-compatibility | sql-procedure | not-implemented | Suffix exceptions, results/errors/transactions and table/message reconciliation need owner evidence. |
| sql-table-data-semantics | sql-table | not-implemented | ID migration, indexes, cascade, seeds and relationships are never inferred from signatures. |
