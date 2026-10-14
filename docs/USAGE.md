# Runner usage

For users choosing operations. [Home](../README.md) · [First scan](GETTING-STARTED.md) · [Workflows](WORKFLOWS.md). Exact options/defaults belong to [operation registry](../config/operations.json); identities and state semantics belong to [runtime contract](../skills/agrimap-golden-lint-skills/references/RUNTIME.md).

Invoke node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs followed by scan, explain or export. Every option takes a value. Unknown/repeated/missing options are rejected with exit 2; there is no strict, fix, install, update or release action.

Scan requires --root, --golden and --source-mode checkout|installed. Optional --typescript selects the trusted parser; --baseline selects a previously retained canonical report JSON. --base-ref selects an immutable Git comparison base instead of --baseline; --target-ref selects an immutable target instead of the default working tree. Paths resolve from terminal cwd. Root/source must exist. Output is stdout JSON; working-tree scope includes untracked files and non-excluded ignored files. There is no staged-only mode. Git refs resolve locally without fetching or writing index/refs/worktrees.

Explain requires --report, --report-id and --finding-id. Export requires --report, --report-id, --to and --authorize-output; --format json|markdown defaults to markdown. They use the local envelope described in [examples](../examples/README.md), not a rescan. An ID must match the validated existing payload.

Export --to must be an absolute new file outside all original scanned and Golden roots; --authorize-output repeats that exact path as caller authorization. A parent must already exist. Existing files and path indirection are rejected. Scans never create report/scratch/cache files. Shell redirection separately writes and needs an authorized external destination; it is not a safe default scan example.

Exit 0: completed declared coverage even with violations/review candidates. Exit 2: fatal/preflight failure or invalid invocation. Exit 3: partial evidence from blocked/error analysis or observed drift. findings alone never fail CI. Review-only boundaries are investigated, not treated as confirmed defects.
