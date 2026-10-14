# Source maintenance map

<!-- AGM-MAINTAINER-ONLY -->

For explicitly assigned contributors. [Home](../README.md) · [Development](../DEVELOPMENT.md) · [Maintainer scope](../AGENTS.md). Excluded from runtime artifacts.

| Canonical owner | Generated/consumer surface |
| --- | --- |
| config/operations.json | SKILL operation prose and assets/operations.json |
| assets/rules.json and assets/catalog.json | references/COVERAGE.md; scanner and full catalog capability declarations |
| assets/source-lock.json and parser-lock.json | Verified runtime handshake; never automatically refreshed |
| schemas/ and references/RUNTIME.md | JSON report/state and output semantics |
| package.json | Independent package version |
| README/docs/examples | Task-oriented user narratives and sanitized examples |
| config/distribution.json | Runtime allowlist validation; no archive builder yet |

Use npm run sync for mirrors, npm run validate for source/runtime links and contracts, npm test for fixtures. Set AGM_LINT_TYPESCRIPT to an already trusted module for parser tests; missing prerequisites are skipped explicitly. Admission requires exact normative source/tier/status evidence and adversarial fixtures, not regex confidence. Complete in-task docs/changelog maintenance and factual closeout as specified in DEVELOPMENT.
