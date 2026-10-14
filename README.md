# AgriMap Golden Lint Skills

Read-only observations against pinned AgriMap Golden references, with provenance, explicit coverage and owner-review handoff. The scanner reports syntax conflicts and review candidates; corrections always require a separate owner-approved task.

Private working package **0.1.0**. The Node runner is implemented; no terminal executable named agm-lint, automatic installer, registered upstream route or published plugin is provided. Source adoption is manual and host support is unverified. Golden remains owned by agrimap-agent-skills.

First run from this source checkout with Node 22+ and an existing explicitly selected Golden package 4.11.0. Terminal example (PowerShell; replace all placeholders; read-only, JSON to stdout):

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan --root '<product-root>' --golden '<golden-package-root>' --source-mode checkout --typescript '<trusted-typescript.js>'
```

The trusted parser must match the pinned TypeScript 5.9.3 bytes. It is optional for non-TypeScript scopes; required syntax rules become visibly blocked without it. No dependencies are installed. Exit 0 includes findings; exit 3 means partial analysis; exit 2 means preflight/invocation failure. Zero findings never means universal compliance.

- [Getting started](docs/GETTING-STARTED.md): prerequisites and first scan.
- [Usage](docs/USAGE.md): actual runner grammar and output.
- [Workflows](docs/WORKFLOWS.md): comparison and owner handoff.
- [Command cookbook](docs/COMMAND-COOKBOOK.md): terminal and conditional Agent-chat examples.
- [Troubleshooting](docs/TROUBLESHOOTING.md): source/parser/partial/export failures.
- [Versions](docs/VERSIONS.md): independent version and availability boundaries.
- [Runtime contract](skills/agrimap-golden-lint-skills/references/RUNTIME.md) and [coverage](skills/agrimap-golden-lint-skills/references/COVERAGE.md): canonical implementation limits.
- [Example envelope](examples/README.md): retain reports without a hidden rescan.

Scans never write product, Golden, package records/docs/changelog, caches or Git state. Export requires an explicit new external destination. No autofix, SQL execution, fail-on-findings CI gate, uploads or publication occurs.
