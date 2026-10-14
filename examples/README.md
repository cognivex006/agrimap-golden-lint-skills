# Retained report examples

For users retaining stdout evidence. [Home](../README.md) · [Usage](../docs/USAGE.md) · [Runtime contract](../skills/agrimap-golden-lint-skills/references/RUNTIME.md).

The example report is a sanitized fixture result, not production defect evidence. It validates under report schema 1. Generate fixture outputs only in authorized source maintenance; runtime scan never writes these examples.

Inspect [canonical fixture JSON](report.json), its [Markdown rendering](report.md), and the [report schema](../schemas/report.schema.json). This example is a completed declared scan with review candidates and violations, never a universal compliance or remediation-safety claim.

For explain/export, retain the report with local caller-controlled transport metadata:

```json
{
  "report": "replace this placeholder with the full canonical report object",
  "protectedRoots": ["<absolute-original-product-root>", "<absolute-original-Golden-root>"]
}
```

This is a structural template, not a runnable/valid envelope until replaced. Absolute roots are outside canonical report bytes; the host must preserve every original scanned/protected root. A report hash proves content identity, not caller honesty or authenticity. Runtime examples contain no raw source values or real personal data.
