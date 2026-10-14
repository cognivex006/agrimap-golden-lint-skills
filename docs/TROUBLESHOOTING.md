# Diagnose bounded failures

For users reading runner diagnostics. [Home](../README.md) · [Usage](USAGE.md) · [Versions](VERSIONS.md).

| Symptom | Read-only evidence/check | Effect and recovery |
| --- | --- | --- |
| SOURCE_MISSING_OR_DRIFT | Compare exact supplied source files/digests with source-lock.json | Affected rules blocked; request an inspected source selection/refresh separately. Never rehash merely to pass. |
| SOURCE_PACKAGE_IDENTITY_MISMATCH | Read source package.json and selected source mode | Definitive source authority unavailable; correct caller path or separately review a compatibility change. |
| PARSER_MISSING/UNTRUSTED_CONTENT | Compare explicit parser bytes/version with parser-lock.json | Syntax coverage partial; choose already trusted content or authorize separate dependency adoption. |
| PARSE_ERROR | Inspect the named file with its actual language tooling | File/rule partial; no target build or repairs are executed. |
| INPUT_DRIFT | Compare the before/after inventories; stop concurrent edits | Preserve valid observations as stale; request a new explicit scan. |
| Baseline not-comparable | Compare analysis contracts and baseline health | Origin unknown; use compatible retained evidence or request a new scan. |
| OUTPUT_UNSAFE_OR_EXISTS | Check original roots, destination parent and existing file | No overwrite; choose a new explicitly authorized external path. |
| INVALID_REPORT/ID mismatch | Validate original canonical payload and envelope IDs | Explain/export fail without rescan; obtain the correct existing report. |
| All files excluded | Inspect coverage and declared layout | No universal compliance claim; specify the supported root or authorize classifier work. |

No diagnostic grants installs, target script execution, database work, release, upstream edits or product fixes. Application-level path/write guards do not constitute an OS sandbox against hostile concurrent processes.
