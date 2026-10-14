# Implementation and verification evidence

<!-- AGM-MAINTAINER-ONLY -->

For maintainers reviewing the V002 implementation. [Development](../DEVELOPMENT.md) · [Source map](MAINTAINING.md) · [User entry](../README.md). This source-only record is excluded from runtime artifacts. It describes implementation/release verification, not universal conformance certification.

## Delivered behavior

Source/runtime package 0.1.1 provides scan/explain/export, six admitted automated observation detectors, four review-only boundary detectors, all-lane classification and an explicit 21-family initial catalog. Active detector IDs are separate from exact upstream Golden IDs/headings, tier/status and content digests. Version authority remains package.json; the release was explicitly authorized after initial local implementation.

M0/M1 foundations are implemented and fixture-tested. M2 includes immutable Git blobs, compatible baseline reports, stable finding matching and local relative TypeScript import/re-export resolution. M3 includes independent unknown impact/manageability, scoped proof obligations, a full catalog status matrix and a supporting read-only upstream integration proposal. This does not mean every possible rule is automated: framework/C# semantics, owner-exception input, rename/edited-range matching and deeper behavior/public-surface conclusions remain explicit unsupported capabilities.

Golden source was selected explicitly from the existing local 4.11.0 checkout at 55c526a05db323d9877010cd49a6471c00ab1d5f. V002's reference commit 3c314c7a8fdc7c35ca41b4b161cb43824ed893fb is separately retained. Twenty-five selected upstream references were content-pinned; no upstream/cache edit or silent source fallback occurred. The existing TypeScript 5.9.3 module is digest-verified before loading; no dependency installation occurred.

## Verification environment and checks

Windows, Node 26.7.0, explicit existing trusted TypeScript 5.9.3. The source runner and npm wrappers were checked locally; supported-host installation/publication was not tested. Automated fixture results: 23 passed, zero failed/skipped. Relevant commands are npm run sync, npm run validate and npm test with AGM_LINT_TYPESCRIPT set to the already available parser. Fixture Golden bytes use the existing sibling upstream checkout, or AGM_LINT_GOLDEN. No product scripts/build/restore were invoked.

Tests cover every target lane/profile; T6 positive/negative syntax; provider/name/alias/re-export ambiguity; lexical C#/SQL strings/comments; missing/untrusted parsers; source drift; deterministic JSON/Markdown; duplicate/line-shift IDs; comparable/incompatible baselines; immutable Git index/ref/no-write snapshots; ignored/untracked/generated/docs/package records; export path/existing-file/junction rejection; retained identity explain/export; exit semantics; schema/redaction contradictions; source/runtime links and maintainer leakage; grammar/chat/write labels; stale mirrors/orphan guides; duplicate/finalized changelog negatives.

The application-level guards and fixture snapshots establish behavior under the tested conditions. They do not establish kernel write isolation, resistance to hostile concurrent path replacement, Linux/macOS behavior, whole-language lexical correctness, production-wide precision or authenticated caller metadata. Export relies on a trusted caller honestly retaining all original protected roots in its local envelope; a report content hash is not a signature.

## Real read-only intake reproduction

Seven existing target roots were scanned in memory, without persisting reports in product roots. Each completed its declared capabilities with no blocked/error rule. Counts are observations and review requirements, not proven production defect totals.

| Root relative to platform | Selected product files | Observations/review requirements |
| --- | --- | --- |
| apps/web/agmwa-pro-ng | 117 | 346 |
| apps/web/agmwa-platform-ng | 415 | 949 |
| services/agmws-identity-netcore | 140 | 21 |
| jobs/agmbo-geoprocessing-netcore | 92 | 140 |
| standards/libraries/angular/agrimap-platform | 372 | 11 |
| standards/libraries/netcore/AgriMap.Platform | 186 | 186 |
| services/agmws-license-management-netcore | 205 | 30 |

V002 representative outcomes were re-resolved by current path:

- analyze.component.ts and map-viewer.component.ts produced injection-shaped review candidates, without a definitive Store/API assertion. Map-viewer explicit any/non-null syntax produced T6 conflicts; remediation effect remains unknown.
- dashboard-api.store.ts produced R3 call-shaped review candidates and T6 non-null conflicts. The runner does not infer firstValueFrom/inject identity or safe orchestration replacement from spelling alone.
- OAuthUseCase.cs produced an out-of-allowlist using-reference candidate. OAuth redirect/HTML/controller behavior remains a separate contract question; no automatic DTO/controller split is proposed.
- GeoprocessingResultController.cs produced namespace-reference candidates. Its Presentation tier and IActionResult are not themselves classified as defects.
- dynamic-lut public-api.ts produced a public-boundary review requirement. The exact owner-approved facade/store islands are preserved as upstream conflict-resolution evidence, without granting a whole-library exemption or declaring its aliases breaking.
- No standalone declaration candidate was emitted for LM_USER_Q.sql. Existing CREATE OR ALTER is consistent with that bounded lexical observation; full procedure semantics are not certified. COMMIT/CLEANUP suffixes are not accused without owner/business evidence. Reference/schema SQL is excluded as declared, not proven archival/deployment classification.

These are scope-limited observations from current worktree inputs. Reports have stable identities when normalized inputs match; this evidence page is a maintenance summary rather than a retained production baseline.

## Acceptance mapping and limits

| V002 acceptance | Evidence / remaining limitation |
| --- | --- |
| AC-01 | All-lane fixtures and reconciled inventory; excluded subtrees counted as boundary records rather than enumerated contents. |
| AC-02 | Exact frozen references and affected-rule drift blocking; full arbitrary owner evidence ingestion not implemented. |
| AC-03 | Real candidate outcomes above plus negative OAuth/HTTP/island/suffix fixtures; unresolved owner/business questions stay review-only. |
| AC-04 | Same-contract Git/baseline comparison tests; modified unmatched/renamed/refactored attribution stays unknown. |
| AC-05 | Local aliases/re-exports resolved; external/framework/C# contexts unavailable and never asserted as semantic certainty. |
| AC-06 | Export boundaries and signature/generated families explicitly review-only/not implemented; no automatic breaking/hand-edit/duplication conclusion. |
| AC-07–08 | Deterministic serialization, runtime/binding/parser identities, observed drift, normalized anchors/duplicates; arbitrary rename stability not promised. |
| AC-09 | Independent health/execution/capability/disposition, denominator checks and 0/2/3 exits; unimplemented catalog visible. |
| AC-10 | Unknown effect/manageability plus proof obligations; no-effect without equivalence is rejected. Actual behavior equivalence is not proven by this static scanner. |
| AC-11 | Read-only scanner imports and isolated snapshots of ignored/untracked/generated/Git/docs/records; application-level limits stated. |
| AC-12 | External new-path/existing-file/junction guards and scoped missing prerequisites; caller envelope trust and concurrent filesystem races remain limitations. |
| AC-13 | Fixed observations/hashed anchors instead of raw values; schema-sensitive-pattern negatives and retained report/finding IDs. Paths remain relative locators and can themselves be sensitive. |
| AC-14 | Supporting upstream registry integration proposed only; no competing standard, lifecycle, installation or routing write. |
| DOC-01–04 | Substantive scoped AGENTS/DEVELOPMENT, Unreleased maintenance, no duplicate prompt/task or automatic scan-side doc writes. |
| DOC-05–07 | Distinct task guides, actual registry grammar and generated adapter checks; negative link/anchor/grammar/mirror/leakage/orphan fixtures. The 0.1.1 runtime ZIP uses the validated distribution allowlist and excludes maintainer/agent state. |
| DOC-08–10 | Independent package version, factual checks/limits and explicit source/runtime release scope; no host installation/protection claims. |

All V002 acceptance is not independently certified. The declared implementation is usable within its documented coverage; expanding semantic/owner/public behavior analysis requires matching evidence and focused admission fixtures, not broadening conclusions from existing lexical observations.

## Repository and documentation closeout

Source changes include config, skills runtime/assets, schemas, tools, fixtures and sanitized report examples. Canonical README, AGENTS, DEVELOPMENT, user task guides, MAINTAINING, this evidence page and CHANGELOG were created; SKILL, operations mirror and coverage were regenerated. The explicitly requested 0.1.1 release finalizes its changelog entry; Unreleased remains available for future maintenance.

Initial implementation used feature/golden-lint-v002 without publication. A subsequent explicit request authorizes commit/push and source/runtime release 0.1.1 on main with tag v0.1.1 and GitHub assets. No npm/host installation, CI wiring or product deployment is included. The pre-existing local V001 deletion is excluded from release commits, preserving its historical Git content; V002 is retained unchanged. All .agrimap-agent state remains ignored and excluded. No subagents were dispatched.
