# Changelog

## Unreleased

## 0.1.8 - 2026-10-18

- Fix prompts now name one `hotfix/golden-<rule>` branch per rule, cut from the latest `develop`, and refuse to work on develop/main or a dirty tree; branch type and base live in `assets/remediation.json` (`delivery`).
- Every prompt requires a read-only impact analysis before editing and classifies each location as fixable, not fixed (contract or Golden exception) or missing evidence. Rules marked cross-service (renames, Async suffix, namespace, SQL/FE naming, libraries) must search other services, apps and libraries, state the change sequence and stop for user confirmation; local rules such as NULL-03 only check callers in the project.
- Locations without clear evidence must not be changed; each rule now lists the evidence required before a fix and concrete investigation steps.
- Add `review-update`: after decisions are recorded in the bundle's review.json, it re-renders report.md, review.md, summary.md and index.md so fixed, not-fixed and needs-evidence items are shown and leave the fix prompts. `report --baseline` carries those decisions into the next bundle by Finding ID.
## 0.1.7 - 2026-10-17

- Restructure `report.md` to remove repetition: merge the summary and fix plan into one overview whose rule table links each rule to its prompts, give each rule one card (Golden entry, the observation stated once, copy-ready prompts) in the same order, shorten the checklist to one line per finding without repeating observation text, and move entry digests into the appendix rule table. On a 308-finding project report.md drops from 170 KB to about 110 KB with every finding kept.
- Render `review.md` as one compact row per finding with full text only for recorded reviews (215 KB to about 26 KB on the same project); `export --review` keeps reviewer evidence in full.
- Fix prompts reference the baseline `report.json` relative to the project root.

## 0.1.6 - 2026-10-17

- Add the `report` operation: one read-only scan that saves a new Markdown report bundle under `<root>/.agrimap-agent/reports/golden-lint/<report-id>/`, maintains a derived `index.md` and `.gitignore`, reuses byte-identical re-runs and prints a chat-ready summary; authorization names only that reports directory.
- Add `scan --format summary` for a read-only Markdown summary without writing files.
- Redesign `report.md`: per-rule summary with fix risk and target skill, a "where to start" plan, copy-ready fix prompts per rule for agm-be/agm-fe/agm-sql (batched by whole files, max 40 findings), a compact file index, one checkbox line per finding and an appendix for provenance, rule diagnostics, catalog and limitations.
- Move Markdown rendering to `scripts/render.mjs` and per-detector guidance to `assets/remediation.json`, outside the analysis contract, so report wording no longer makes baselines incomparable.
- C# reader protocol 2: read the nearest `.csproj` as text for an unconditional `ImplicitUsings` property and compile each project separately, so ASYNC-02/ASYNC-03 resolve `Task` in .NET 8 projects; locate NULL-02 at the `!` operator so chained suppressions get distinct columns. Existing finding IDs are unchanged.
- Drop the 26 Roslyn culture satellite DLLs (`cs/` … `zh-Hant/`) from the C# reader bundle: the reader emits diagnostic IDs and fixed case codes, never localized compiler messages. `tools/build-csharp.mjs` now stages only the two locked Roslyn DLLs and regenerates the whole output, so `deps.json` no longer lists resources. Reader and Roslyn DLL bytes are unchanged; each host bundle shrinks from about 32 MB to 26 MB and findings are identical.
- Add Cursor support via `.cursor-plugin/marketplace.json` and a portable `agm-lint` plugin whose folder name matches the skill name; the same folder replaces `adapters/antigravity-ide` and `install-host.mjs` accepts `cursor` and `agent-skills`.
- Generate the canonical and portable SKILL.md from one text with an explicit prerequisite, default-workflow and chat-output contract.
- Rewrite user documentation for 0.1.6 and correct stale version references.

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
