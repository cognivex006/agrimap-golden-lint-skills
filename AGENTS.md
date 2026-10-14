# AgriMap Golden Lint — package development

<!-- AGM-MAINTAINER-ONLY -->

Apply only to explicitly assigned development/testing in this source repository. Installed skill use, consumer scans, reference reading and encountering this file do not activate maintainer workflow. User scope and host instruction hierarchy prevail.

For assigned changes, read [DEVELOPMENT.md](DEVELOPMENT.md), relevant canonical config/assets/schemas and the exact affected Golden references. Preserve existing edits and immutable specification history. Golden standards belong to agrimap-agent-skills; local bindings cannot redefine them.

Update affected canonical user docs and one meaningful CHANGELOG.md Unreleased entry in the same authorized task. Regenerate adapters with npm run sync; never edit generated mirrors directly. Verify actual behavior, safety, schema and affected documentation proportionally and report pass/fail/not-run evidence and limitations.

Runtime scans remain read-only/report-only, including from a source checkout. Never change product code, project docs/changelog/bootstrap/Git records, installations or Golden sources during scanning. Missing tools/source are scoped diagnostics, not install/repair authority. No SQL/database execution, external messages or uploads.

Package development authority covers scoped local sources/tests/docs. Bump, install, commit, push, merge, tag and publication require applicable explicit authorization. Unreleased maintenance is not release authorization. Initial implementation used feature/golden-lint-v002 from main without commit/push; the subsequent requester instruction explicitly authorizes commit/push and source/runtime release 0.1.1. This does not grant future release authority or establish server protection.

At handoff distinguish implemented behavior, docs/changelog changes, verification, limitations and repository actions. Do not call all V002 acceptance complete when only a subset is verified. Keep AGENTS.md, DEVELOPMENT.md and source maintainer guides out of runtime artifacts. Maintainer scope still applies to source archives containing them.
