# Practical commands

For users who already have prerequisites. [Home](../README.md) · [Usage](USAGE.md) · [Troubleshooting](TROUBLESHOOTING.md). All angle-bracket values are placeholders.

Terminal example (PowerShell; implemented scan, read-only, JSON stdout):

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan --root '<product-root>' --golden '<golden-package-root>' --source-mode installed --typescript '<trusted-typescript.js>' --baseline '<canonical-baseline.json>'
```

Requires an existing installed source with locked bytes and compatible baseline. Expect complete current results plus comparable/not-comparable attribution; failed prerequisites return bounded partial diagnostics without installs.

Terminal example (PowerShell; implemented immutable Git comparison, read-only):

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan --root '<product-root>' --golden '<golden-package-root>' --source-mode checkout --typescript '<trusted-typescript.js>' --base-ref '<base-ref>' --target-ref '<target-ref>'
```

Requires locally available Git commit refs. Expect resolved commit/tree identities and all current findings; unmatched edited entities remain unknown. Missing refs fail without fetch or worktree creation.

Terminal example (PowerShell; implemented explain, read-only):

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs explain --report '<envelope.json>' --report-id '<report-id>' --finding-id '<finding-id>'
```

Requires an existing validated envelope and identities. Expect one original finding. Missing IDs fail; no fresh scan is triggered.

Terminal example (PowerShell; implemented export, explicitly authorized external write):

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs export --report '<envelope.json>' --report-id '<report-id>' --to '<absolute-new-external-report.md>' --authorize-output '<absolute-new-external-report.md>' --format markdown
```

Requires all original protected roots recorded by the trusted caller and a new path with existing parent. Expect a deterministic Markdown file. Rejected paths require a different explicitly authorized external destination, not overwrite/inside-target repair.

Agent-chat examples — proposed host adoption, not terminal commands or verified installed availability:

```text
$agm-lint scan this project using the selected Golden source
$agm-lint explain <finding-id> from <report-id>
$agm-lint export <report-id> to <authorized-external-path>
```

These require a host that has explicitly adopted the skill and retained its report. Missing adoption is a separate setup task; reading this guide does not authorize installing anything.
