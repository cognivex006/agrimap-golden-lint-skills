# Prompt Result V001 — agrimap-golden-lint-skills

Requester: 006006
Date: 2026-10-14 (Asia/Bangkok)
Status: specification for a new repository; implementation has not started
Reference baseline: agrimap-agent-skills 4.11.0

## Problem / End State

AgriMap already has a strong folder structure across Angular applications, .NET services and jobs, and shared libraries. The remaining quality problem is inconsistent patterns inside code written at different times and by different models. Create a separate agrimap-golden-lint-skills package that inspects those patterns against the applicable agrimap-agent-skills Golden contracts, reports every finding, and proposes a safe path to correction. It must not block work or edit product code.

The final tool must classify the target before applying a rule, explain each finding with source evidence, distinguish proven no-effect changes from changes with impact, and split risks that can be managed from risks that cannot yet be managed. For a manageable change confined inside the affected component or service, recommend that the owner approve a scoped correction. A proposed correction is never approval to perform it.

## Evidence and limits of this intake

The read-only inventory found 4 Angular applications under apps/web, 19 agmws services, 4 agmbo jobs, and 11 packaged Angular libraries under standards/libraries/angular/agrimap-platform/projects. standards/libraries/netcore/AgriMap.Platform contains the shared .NET library, tests, and Playground. Recognizable src/app, Src/Application, Src/Infrastructure, Src/Presentation, projects/<lib>/src/public-api.ts, and sql/<domain>/table|procedure layouts support the conclusion that the folder foundation is generally strong. This intake sampled code and searched broad signatures; it is not an exhaustive defect count.

Representative candidate findings to reproduce during implementation:

- FE main: apps/web/agmwa-pro-ng/src/app/features/analyze/analyze.component.ts:28 injects WorkspaceStore directly; apps/web/agmwa-platform-ng/src/app/features/map-viewer/map-viewer.component.ts:80 injects MapViewerStore directly. Compare with FE-main R1, while preserving existing behavior.
- FE main: apps/web/agmwa-platform-ng/src/app/domain/data-management/dashboard-api/dashboard-api.store.ts:11 and :31 inject an API and use firstValueFrom in a store. Other form-management stores show similar signatures. Compare with R2/R3 and inspect actual flow before suggesting a refactor.
- FE main: apps/web/agmwa-platform-ng/src/app/features/map-viewer/map-viewer.component.ts:62 uses any and :109 uses non-null assertion. The Golden T6 rule applies, but a safe replacement needs real type and null-path evidence.
- BE main: services/agmws-identity-netcore/Src/Application/UseCases/OAuthUseCase.cs:1 and :23 use Application.Models, outside the fixed namespace allowlist. The same use case uses IActionResult and Controller types for OAuth flows; assess redirect and HTML contract effects before suggesting a split.
- BE main/job: jobs/agmbo-geoprocessing-netcore/Src/Presentation/Controllers/GeoprocessingResultController.cs:23 returns IActionResult. The job exposes an HTTP endpoint, so do not treat the mere existence of Presentation as a defect. Inspect its host and response contract before assigning severity.
- FE library: standards/libraries/angular/agrimap-platform/projects/dynamic-lut/src/public-api.ts:7-13 exports facade, store, generated API and an aliased environment token. These are published contracts. Existing facade/store islands are approved exceptions; do not flag them just because new library behavior is service-first.
- SQL: services/agmws-license-management-netcore/sql/LM/procedure/LM_USER_Q.sql:34 uses CREATE OR ALTER PROCEDURE correctly. Product SQL also has nested license-import procedures named LM_LICENSE_IMPORT_COMMIT and LM_LICENSE_IMPORT_CLEANUP; the allowed action-suffix rule does not establish their business classification. Do not call them violations until owner evidence resolves it. SQL under docs/system-reference/sources and legacy/schema paths is reference or migration material, not automatically new product SQL.

Authoritative references in the 4.11.0 source package:

- skills/agrimap-agent-skills/skills/agrimap-agent-skills/references/skill-routing.md
- references/patterns/checklists/README.md and the five target checklists: frontend-main, frontend-libraries, backend-main, backend-libraries, sql
- references/patterns/frontend.md, backend.md, csharp.md, sql.md, conflict-resolution.md, pattern-status.md
- references/patterns/gencode-api.md when generated API boundaries are checked
- references/patterns/golden/manifest.json and each selected collection manifest.json and entry
- references/patterns/golden/frontend-main/002-2-architecture-rules.md and 008-3-typesafe-t6-forbidden.ts
- references/patterns/golden/frontend-libraries/003-3-public-api-contract.md and 005-5-naming-in-libraries.md
- references/patterns/golden/backend-libraries/013-1-extensions-request-value-normalize.md when request values are checked

Paths in the preceding reference list after the first line are relative to skills/agrimap-agent-skills/skills/agrimap-agent-skills/. The active source package and installed package may differ; record their version and hashes, and do not silently substitute one for the other.

## Authorized Inputs

The requester authorized a design and prompt/spec for a future skill at skills/agrimap-golden-lint-skills. Read-only inspection of apps/web/**, services/**, jobs/**, standards/libraries/** and relevant agrimap-agent-skills references is in scope. The requester confirmed the report policy: report all findings without blocking; propose a correction for proven no-effect cases; for impactful cases explain the risk, split manageable from unmanageable, and recommend owner approval for manageable internal changes.

## Scope and non-goals

Build the new package and its skill entrypoint, rule catalog, deterministic inspection commands, fixtures, and user-facing report format after the new repository exists. Keep the rule source in agrimap-agent-skills; the lint package consumes a versioned, traceable contract and does not create an independent competing Golden standard.

Initial inspection targets:

| Target kind | Product paths | Pattern source |
| --- | --- | --- |
| fe-main | apps/web/agmwa-*/src/app | frontend-main checklist, frontend.md, gencode-api.md |
| fe-library | standards/libraries/angular/agrimap-platform/projects/<lib> | frontend-libraries checklist and each public-api.ts |
| be-main / agmws | services/agmws-*/Src | backend-main checklist, backend.md, csharp.md |
| be-main / agmbo | jobs/agmbo-*/Src | backend-main checklist with agmbo profile and actual host evidence |
| be-library | standards/libraries/netcore/AgriMap.Platform/AgriMap.Platform/Src | backend-libraries checklist and active published API |
| sql-table / sql-procedure | actual product SQL under services/agmws-*/sql | sql.md, sql checklist, selected entry status and owner schema |

Classification is per file or symbol, not only by repository name. A .sql file inside a service follows SQL rules. Angular files under projects/<lib> follow library rules. Playground, generated code, migrations, archived docs, fixtures, bin/obj/dist/node_modules and owner reference copies are identified separately, with explicit coverage/exclusion counts. Never scan excluded material as product code by accident. Do not inspect or modify infra/database as part of this initial target set.

Non-goals: product refactors, automatic fixes, database execution or schema synchronization, release actions, CI failure gates, version publication, silent AGENTS/bootstrap changes, and a second approval workflow. Do not install external tools as a side effect of a read-only scan.

## Constraints and rule authority

1. Use the same lane/profile detection and one-operation routing semantics as agrimap-agent-skills. The lint package is a supporting read-only capability and does not replace agm-fe, agm-be, agm-sql, agm-analyze, agm-qa, or agm-exec. If integration changes are needed, propose the exact assets/skill-routing.json change in agrimap-agent-skills and generate adapters through its existing sync workflow in a separately authorized implementation.
2. For each rule, retain its ID, target kind, tier (MUST/SHOULD/FREE), authority status (current/verified/legacy-compatible/unverified/missing-owner-example), evidence mode, exact reference entry, package version and hash. The checklist routes to the entry; open the named entry before asserting MUST compliance. Read conflict-resolution.md before using any golden entry.
3. Apply owner-approved current requirements and deployed behavior/public/data contracts before structural suggestions. Current Golden structure governs new code, while known legacy defects must not be copied. An existing mismatch is reported with compatibility impact; it is never silently rewritten. FREE-tier logic is not a lint violation.
4. If package versions, manifest hashes, project contract, parser result, or exception scope conflict, downgrade the finding to needs-review/unknown and state the conflict. Never turn a regex hit into a proven architectural defect without checking syntax and context.
5. Run read-only. No writes to scanned repositories, no autofix, no SQL DDL/DML/EXEC, no external messages, and no commands that mutate build or generated outputs. The report artifact may be written only where the future user explicitly requests it.
6. Report all findings. Do not set a failing exit code for pattern findings or hide pre-existing debt behind a baseline. Offer filtering for new/changed code as a view only; preserve the complete report. A tool failure may have a distinct operational exit code, never conflated with lint findings.

## Initial rule catalog to implement

| Lane | Deterministic candidates | Contextual review candidates and exceptions |
| --- | --- | --- |
| FE main | component direct Store/generated API injection; store injection/async/subscribe/effect; explicit any and non-null assertion with documented exception; new selector/file/handler naming; hand edits to generated files | facade orchestration and return shape, signal-only UI data flow, subscription lifecycle, generated response conversion, trivial view without facade/store |
| FE library | new component naming and agrimap- selector; public-api export graph and changed exported symbol/alias; generated output boundary | service-first new behavior, approved existing facade/store islands, public API compatibility across consumers, README/Playground completeness for a new feature |
| BE main | fixed namespace allowlist and file-scoped namespace; one public type per file; new async name/Task patterns; clear sync-over-async and empty catch signatures | thin controller/job trigger, DTO/Domain/persistence placement by meaning, cancellation propagation, auth identity and request precedence, response/error contract, scoped DI, structured logging; preserve OAuth redirect and job HTTP host exceptions where proven |
| BE library | published surface changes, fixed C# structure, duplicate platform capability signatures | request-value normalization and priority with DTO/form/body exceptions, active package-version compatibility, README/Playground/test completeness |
| SQL | product artifact location and object-per-file for new SQL; schema/object declaration; CREATE OR ALTER PROCEDURE on touched procedures; named DDL sections and message insert guard where applicable | object semantics, suffix exceptions, table ID migrations, indexes, cascade, seed IDs, data/result/error compatibility, procedure-to-table and message-code reconciliation |

Prefer TypeScript compiler/ESLint AST and C# Roslyn or equivalent syntax-aware analysis for claims about injected symbols, exports, methods, namespaces and attributes. Use the existing SQL static contract tools where suitable, but inspect their actual scope and known regex limitations; never claim they prove SQL behavior. Keep a separate classification for rules that require human review. The first implementation should contain a small high-confidence set with real positive and negative fixtures, then expand only when a rule's precision is demonstrated.

## Finding and remediation contract

Every finding must include: stable finding ID and rule ID; path and line/symbol; target kind/profile; observed code evidence; exact Golden source/version/status/tier; confidence; why it conflicts; whether it is existing or introduced; affected consumers/contracts; proposed smallest change or required investigation; impact scope; manageability; verification needed; and owner decision needed. Also report scan coverage, skipped paths, rule-pack drift, and counts by lane/status. Output human-readable Markdown and machine-readable JSON with a documented schema. Redact secrets and personal data from excerpts.

Impact scope is one of:

- no-effect-proven: behavior, public API, wire/data contract and relevant consumers are proven unchanged by a specific proposed correction. Show the evidence and a narrow verification plan; propose the correction without editing.
- internal-effect: effect exists but remains within the proven ownership boundary. Explain the effect and rollback/test route.
- external-effect: exported API, cross-service, UI user flow, persistence, schema, deployed endpoint, or other consumer may change. Name each affected boundary and the evidence still required.
- unknown: impact cannot yet be established. Never label this no-effect.

Risk manageability is independent: manageable, unmanageable-with-current-evidence, or unknown. A manageable internal-effect proposal includes a concrete containment and verification plan and recommends owner approval for that exact scope. An external-effect proposal explains owner and consumer coordination; do not recommend immediate correction from lint alone. An unmanageable or unknown risk states the missing evidence or decision and asks a targeted question. All categories remain report-only.

Do not claim that compilation, tests, or a clean diff alone proves no effect. Check callers, exported surfaces, routes, DTOs, SQL result/transaction/error behavior, and runtime semantics relevant to the candidate. Never generate a broad replacement patch from one signature.

## Main Assignment

Main owns the future package design, evidence collection, implementation, tests, report examples, and integration proposal. First freeze the rule-source contract for agrimap-agent-skills 4.11.0, inspect the active package and target repositories, classify initial rules by precision, implement a read-only scanner and stable report schema, then exercise it against representative positive/negative fixtures and selected real paths. Record rule coverage and known blind spots. Keep the current requester policy report-only at every interface.

The current deliverable is this prompt/spec only. Do not begin creating the new skill package, product fixes, integration edits, CI wiring, or publication from this document alone.

## Subagent Assignments

None. Main owns all work unless a later requester instruction explicitly delegates it.

## Acceptance Criteria

1. The new skill distinguishes fe-main, fe-library, be-main agmws/agmbo, be-library and SQL in service repositories on representative fixtures, and explains excluded/generated/reference material.
2. Every active rule has a traceable 4.11.0 Golden source, tier, authority status, evidence mode and tested detector. Legacy-compatible entries cannot become universal code-fix templates. A Golden version/hash mismatch is visible.
3. The sample FE store/component, BE namespace, library public-api and SQL cases above produce accurate findings or explicit needs-review outcomes. Valid library islands, OAuth/HTTP job behavior and reference SQL do not become false high-confidence defects.
4. Full scans report all findings and return success when pattern findings exist. No product, database, generated code, repository state or CI configuration is mutated by scanning.
5. Every proposed remediation states impact and manageability separately. Proven no-effect cases get a narrow correction proposal; manageable internal effects get a reviewable approval recommendation; unmanageable/unknown risks get evidence requests.
6. JSON and Markdown reports are deterministic for identical inputs, include source/version provenance and coverage, and redact sensitive values.
7. Package tests cover both violation and compliant fixtures for each automated rule, cross-lane routing, legacy exclusions, public API aliases, Golden drift, report-only exit behavior, and no-write behavior. Run only checks needed to verify these boundaries.
8. Integration with agrimap-agent-skills is documented as a supporting read-only capability with no new authority or competing rule owner. Any source-package routing change is scoped and reviewed separately.

## Questions to resolve before expanding uncertain rules

- Are LM_LICENSE_IMPORT_COMMIT and LM_LICENSE_IMPORT_CLEANUP approved procedure-name exceptions, and are there other operations outside the _I/_U/_D/_Q/_CHECK_Q set? Until confirmed, report them as naming review candidates only.
- Which service SQL copies under docs/system-reference/sources or schema are authoritative deployment inputs, and which are archival or migration references? Classify by repository evidence; do not infer from the .sql extension alone.
- Which existing OAuth controller/use-case and agmbo HTTP endpoint contracts are intentionally different from the new-code C# templates? Preserve active behavior and ask only when a proposed correction would change it.
- How will the new repository pin or discover agrimap-agent-skills versions across hosts? Choose an explicit manifest/version handshake during implementation; never rely on a hard-coded local cache path.

These questions do not block the high-confidence report-only rules or this spec. A rule that depends on an unanswered question must say needs-review and must not issue a definitive violation.

## Deviation and Handoff Contract

Keep this V001 file immutable. Later substantive requester-backed changes create V002 with the source and change summary; a clarification or approval alone does not. The future implementer may choose equivalent internal libraries and parser architecture, but must preserve target routing, source authority, read-only/report-only operation, risk classification and acceptance criteria. Bring material scope, public-contract, data, security, or publication changes back to the requester with concrete evidence. Do not treat this prompt as permission to fix product code or to deploy SQL.
