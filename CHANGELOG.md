# Changelog

## Unreleased

## 0.1.13 - 2026-10-29

- Refresh the Golden source lock to agrimap-agent-skills 5.0.6 (main `a8cc565`), which changes csharp.md, the backend checklists, sonarqube-remediation.md (ADV-08/09, no detector yet) and skill-routing. Installed Golden 5.0.5 or older drifts on those files and blocks backend rules.
- Add NS-01 file-layout detectors `be-file-layout` (be-main) and `be-library-file-layout` (be-library, same reader output). They flag a using directive after the namespace, which compiles and was previously reported as clean, and anything other than exactly one blank line between the using block, the file-scoped namespace and the first type. Libraries also report block namespaces, keeping the published name. Header comments, regions and attributes start a section, and spacing is skipped when assembly attributes are present. The Roslyn reader is rebuilt with the same Roslyn 4.11.0.0 and protocol 2.
- Run ADV-01 overload adjacency on AgriMap.Platform libraries as `be-library-overload-adjacency` (advisory, recommend first). ADV-04/05/07 stay be-main only.
- Both bind to NS-01 sections that already existed in Golden 5.0.5 (`csharp.md` and the lane checklists).
- Correct the remaining repository owner URLs to `cognivex006` and republish the existing version tags with corrected identities; keep each version's scanner and trust locks unchanged.

## 0.1.12 - 2026-10-28

- Add Roslyn syntax detectors for Golden QUALITY-01..03: `be-method-branches` (more than seven `if`/`else if` per function scope, nested included, bare `else` excluded, local functions/lambdas scoped separately), `be-parameter-count` (more than seven parameters on methods, constructors and local functions; overrides, explicit interface implementations and extern excluded) and `be-nested-ternary` (nested conditional expressions, including anonymous-object members). All remain review candidates.
- Record the related SonarQube rule (S3776, S107, S3358) and default severity per binding as optional `authority.externalAnalyzer` with `resultStatus: not-imported`; reports and prompts state that findings are Golden lint candidates, not SonarQube results, and never claim a Quality Gate outcome. Report schema 1 stays backward compatible.
- Catalog the S3776 score/Quality Profile check and the QUALITY-04 requester notice as not-implemented. Prompts for the three QUALITY rules now carry the notice contract from Golden `sonarqube-remediation.md`, including completed-work rework and SonarQube rescan status.
- Refresh the Golden source lock, adding `references/sonarqube-remediation.md` (QUALITY-04 from 5.0.4). It pins agrimap-agent-skills 5.0.5 (main `7085fc5`), which adds QUALITY-05 to csharp.md, backend-main.md and sonarqube-remediation.md. Installed Golden 5.0.4 or older drifts on the backend files and blocks backend rules.
- Add QUALITY-05 advisory smell detectors (tier SHOULD, review candidates): `be-overload-adjacency` (ADV-01, S4136), `be-caller-info-argument` (ADV-04, S3236, runtime guard APIs only), `be-unused-local` (ADV-05, S1481) and `be-dispose-suppress-finalize` (ADV-07, CA1816). Reports sort advisory rules last and tag them `advisory`; cards and prompts state that the default is a recommendation and fixes apply only when the requester asks and evidence proves no behavior or contract change.
- Catalog ADV-02 (CA1822/S2325), ADV-03 (S1905) and ADV-06 (xUnit2032) as not-implemented: they need full target semantics or live under unscanned Tests/. `externalAnalyzer.ruleKey` now also accepts `external_roslyn:` keys.

## 0.1.11 - 2026-10-26

- Add evidence-bounded hardcode literal detection across FE, BE, library and SQL lanes as seven classes (`HC-SECRET`, `HC-ENVURL`, `HC-PROXYBYPASS`, `HC-EXTURL`, `HC-CONFIG`, `HC-MAGIC`, `HC-SQL`) with the Golden `MUST`/`SHOULD`/`FREE` tiers; credential-shaped values are never written and only a masked form and a digest are recorded.
- Add an append-only hardcode policy ledger with an explicitly authorized `policy-update` writer and subject-based recall, so an accepted exception is not asked again until the normalized value, file path or `reviewAfter` changes; expired items surface as needs-review (exit 3).
- Integrate hardcode decisions into canonical JSON, Markdown reports, summaries, indexes and fix prompts; add the hardcode policy schema and keep read-only scans, exit codes and Golden authority unchanged.
- Add `docs/HARDCODE-LINT.md` with the class table, silence list and skip-memory behavior, and extend the USAGE, REPORTING, WORKFLOWS, TROUBLESHOOTING, COMMAND-COOKBOOK and VERSIONS guidance for the hardcode lane.

## 0.1.10 - 2026-10-21

- Add evidence-based third-party terms/license/policy governance with scoped severe-conflict gates, append-only owner decisions, automatic local recall, reopening and expiry/snapshot review; preserve read-only scans and separate Golden authority.
- Integrate governance into canonical JSON, Markdown reports, summaries, indexes and fix prompts; add an explicitly authorized ledger writer and exit codes for review-required and blocked work.
- Correct the unpublished candidate version from 0.1.20 to 0.1.10 at the owner's request and prepare source/runtime/host bundles with checksums; host installation remains separate.

## 0.1.9 - 2026-10-20

- Migrate repository, installation links and generated host metadata to `cognivex006/agrimap-golden-lint-skills`, preserving existing Git history and tags. Scanner behavior and schemas are unchanged.

## 0.1.5 - 2026-10-16

- Add Golden 5.0.2-gated FE app/library, C# member/Task and SQL naming candidates, with explicit legacy/public-contract limits and adversarial cases.
- Add authorized .agrimap-agent report bundles, human-readable remediation guidance, editable ID-bound reviews and validated commentary export; keep scan read-only and canonical verdicts unchanged.
- Synchronize 0.1.5 host bundles for Codex, Claude, Gemini and Antigravity and correct installation guidance; native activation evidence is reported separately.

## 0.1.4 - 2026-10-15

- Add nine additional backend detectors and a Roslyn-backed namespace check: public types, bounded naming/placement, nullable syntax, empty catches and resolved runtime Task blocking/fake async. Ship a digest-locked reader, explicit trusted --dotnet host input, conditional/parse diagnostics, binary-safe host mirrors and evidence-calibrated reports; retain candidate-only applicability and no product build/execution.

## 0.1.3 - 2026-10-15

- Accept verified installed Golden plugin/extension manifests without root package.json while blocking malformed/conflicting identities and preserving pinned reference gates.
- Add a canonical Markdown report template with complete file/finding indexes, rule/source diagnostics, evidence/contracts, working-tree Git context, observation kinds, review checklists and separate manual-review slots.

- Use concrete GitHub marketplace commands for Codex/Claude installation, matching agrimap-agent-skills; separate local-source instructions and use paths relative to the extracted bundle root.

## 0.1.2 - 2026-10-15

- Publish source/runtime and self-contained host bundles with SHA-256 checksums under release `0.1.2` and annotated tag `v0.1.2`.
- Rewrite maintained documentation and generated skill/host guidance in Thai with the task-oriented navigation, chat/terminal examples and editorial conventions of agrimap-agent-skills; preserve coverage, authority and published-versus-Unreleased distinctions.

- Shorten the existing 0.1.1 GitHub release title and release-notes heading to `0.1.1`.

- Gate admitted rules on declared normalized-contract and common authority dependencies, retain dependency digests and scoped drift diagnostics, and document rule-to-source interpretations with 19 synthetic T6/R1/R3 conformance cases pending owner review. Architecture candidates remain unproven; this does not certify product accuracy.

- Add generated Codex/Claude marketplace plugins, a Gemini extension and dedicated Antigravity CLI/IDE bundles with self-contained allowlisted runtime files, installation guidance, an IDE copy helper and host packaging tests. Host-native Gemini/Antigravity activation remains unverified.

## 0.1.1 - 2026-10-14

- Exclude all `.agrimap-agent/` local state from Git at every directory depth and document the pre-delivery tracking check.
- Add the private read-only lint runner, six bounded observation detectors, all-lane classification, digest-pinned Golden/TypeScript handshake, local relative import/re-export resolution, canonical reports, immutable Git/baseline-report attribution and identity-bound explain/export.
- Add explicit partial-scan/coverage and unknown-impact contracts, application-level no-write/export guards, isolated safety/detector/docs fixtures, generated runtime adapters and task-oriented guides with maintainer-only scope.
- Publish the initial GitHub source/runtime release with an allowlisted ZIP and checksum; keep text/report bytes LF across hosts.

Full framework/C# semantic analysis, owner-exception ingestion, rename/edited-range matching and full catalog automation remain unimplemented. This release does not establish installed host-plugin support.
