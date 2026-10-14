# Developing the lint package

<!-- AGM-MAINTAINER-ONLY -->

For assigned source maintainers. Read [AGENTS.md](AGENTS.md), [source map](docs/MAINTAINING.md), and the canonical [runtime contract](skills/agrimap-golden-lint-skills/references/RUNTIME.md). See [implementation evidence](docs/IMPLEMENTATION.md) for the current acceptance scope. Consumer use does not activate this workflow.

## Authority and branches

Inspect branch/upstream and dirty paths first; preserve unrelated changes. Do not stash/reset, clone or create a worktree to bypass conflicts. Synchronize only when authorized. The intended future topology is feature/* and fix/* from develop into develop, then develop or optional release/* into main; urgent hotfix/* from main must reconcile into develop. These are conventions, not evidence those branches/protections exist. Initial work was explicitly assigned on feature/golden-lint-v002 from main with no commit/push. Confirm future policy changes rather than creating develop silently.

All `.agrimap-agent/` directories are local state and are excluded by the root `.gitignore`, including nested directories. Never force-add their contents. Before delivery, verify that `git ls-files -- .agrimap-agent` is empty and no agent-state paths appear in the staged changes.

Local source/test/docs work does not authorize commit/push/merge/release, database changes, runtime dependency installs, product changes or upstream routing edits. No upstream historical permissions transfer here. package.json alone owns package version. Source/runtime release 0.1.1 was explicitly authorized after the initial local implementation; npm publication and host installation are separate. Specification V002, Golden 4.11.0 and report schema 1 are separate identities.

## Canonical sources and regeneration

Operations belong to config/operations.json; distribution to config/distribution.json; detector admission to assets/rules.json and full catalog status to assets/catalog.json; trust to assets/source-lock.json and parser-lock.json; report fields to schemas/ and runtime reference. npm run sync generates SKILL.md, the operations mirror and coverage tables only. It never modifies trust locks, target projects, upstream or installed packages. No package builder, plugin installer, CI or release automation is supplied.

## Documentation and changelog duty

For every substantive authorized package change assess and update affected docs and a meaningful Unreleased entry before closing, without another reminder. This is synchronous source maintenance. Runtime scans and ordinary discussion never update docs/history. Honor a requester-restricted write boundary and disclose necessary omitted documentation.

Operation changes update registry, Usage/Cookbook, examples, adapters and command tests. Rule changes update bindings, exact source references, coverage, positive/negative/adversarial fixtures and compatibility notes. State/identity/safety changes update schemas/runtime contract, Workflows/Troubleshooting, examples and safety tests. Distribution changes update its allowlist and packaged-link/leakage checks. Workflow changes update this guide and AGENTS within maintainer scope.

Use one ## Unreleased section. Describe meaningful actual behavior, not aspirational capabilities. Do not duplicate an entry on retry or create another Prompt Result. Preserve release history; never finalize a date/version, bump or publish without authorization.

## Rule admission and trust

Read conflict-resolution, root/collection manifests, checklist and exact normative entry. Distinguish upstream IDs from detector IDs, current normalized contracts from raw legacy evidence. Match manifest entry digests before admission. Preserve owner exceptions and deployed contracts; unknown evidence becomes review-only/candidate. FREE choices cannot become violations.

Every automated rule needs positive, negative and adversarial fixtures, deterministic evidence, prerequisite diagnostics and documented precision limits. Adding semantic dependencies needs a reviewed trust and symbol-resolution plan. Runtime must never execute arbitrary target scripts/configuration. A source/parser lock refresh is an explicit inspected maintainer change, never automatic repair. Record expected and inspected revisions independently.

## Verification and closeout

Run npm run sync, npm run validate and npm test after relevant changes. Tests use isolated temporary fixtures outside product roots, with snapshots of ignored/untracked/generated/package files; verification-only fixture writes are not runtime permission. Golden fixture bytes require an existing checkout selected by AGM_LINT_GOLDEN (default sibling agrimap-agent-skills); missing source is a test prerequisite failure. Parser tests use an explicitly selected existing trusted TypeScript path via AGM_LINT_TYPESCRIPT. Without it parser cases are reported skipped, never passed. No npm install is needed by this package.

Review changed narrative for evidence and limits; automated checks cannot prove every sentence. Check git diff and report changed sources/docs, Unreleased note, actual commands/results, remaining V002 acceptance gaps and repository actions. Do not claim installed/released host support from a source SKILL file or source-only tests.
