# First scan

For users running the local source runner. [Home](../README.md) · [Usage](USAGE.md) · [Troubleshooting](TROUBLESHOOTING.md).

Use Node 22+ (validated here with 26.7.0), this source checkout and an existing agrimap-agent-skills 4.11.0 package. Select checkout or installed mode explicitly. The upstream package root contains package.json and skills/agrimap-agent-skills. A version label alone is insufficient; exact reference bytes must match the local source lock. No scan installs or refreshes anything.

For TypeScript syntax rules select an existing trusted lib/typescript.js matching TypeScript 5.9.3 and its locked digest. Missing/mismatched parser blocks only syntax rules. Do not execute product npm scripts to recover. Recovery is a separate authorized maintainer/adoption task.

Terminal example (PowerShell; read-only; placeholders):

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan --root '<product-root>' --golden '<golden-package-root>' --source-mode checkout --typescript '<trusted-typescript.js>'
```

Expect canonical JSON with reportId, scanStatus, provenance, coverage, rules, files, findings and limitations. Read coverage before findings. A root can be the portfolio or a conventionally named AgriMap app/service/job/library workspace; arbitrary renamed layouts are excluded and require a future reviewed classifier change.

Only manual source use is available. A host may adopt SKILL.md using its own authorized process; no installation command or verified ChatGPT/Codex plugin support is claimed. Conditional chat examples are in the cookbook.
