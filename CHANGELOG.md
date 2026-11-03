# Changelog

## Unreleased

- Add lexical advisory detectors for Golden 5.0.13 in the new `scripts/advisory.mjs`: `be-char-string-overload` (ADV-11, CA1866/CA1865: one-character string literal passed to StartsWith, EndsWith, IndexOf, LastIndexOf, Contains or Split, skipping non-Ordinal comparisons), `fe-regexp-exec` / `fe-library-regexp-exec` (ADV-15, S6594: `match` with a non-global regex literal) and `fe-concise-char-class` / `fe-library-concise-char-class` (ADV-16, S6353: `[A-Za-z0-9_]` or `[0-9]` in regex literals without i/u/v). All are SHOULD advisory review candidates; the catalog adds `fe-advisory-smells` and `fe-library-advisory-smells`, and the runtime digest covers `advisory.mjs`.
- Estimate SonarQube S3776 Cognitive Complexity in the Roslyn reader: `be-complexity-review` scores each method, constructor, accessor and local function with the Sonar increments (if, ternary, switch, loops and catch add 1 plus nesting; else-if, else, goto and each change of `&&`/`||` add 1; lambdas nest, local functions score alone) and reports scores above the Sonar default 15 with the score in the observation. Before this, `be-method-branches` only counted if/else-if, so a method such as one with 6 nested decisions and a switch expression scoring 18 produced no finding. The catalog family `be-sonar-cognitive-complexity` is now automated; the report notice says the score is an estimate and the project Quality Profile stays authoritative. Remediation cards point to the QUALITY-01 before/after example in csharp.md.
- Accept the inspected 5.0.14 working-copy Golden reference digests as compatible while retaining the 5.0.12 source lock and prior digests.

- Surface the unimplemented SonarQube S3776 check in backend Markdown reports and summaries even when no finding exists; zero blocked/error counts do not imply a Cognitive Complexity or Quality Gate pass.

## 0.1.19 - 2026-11-02

- Refresh the Golden source lock to agrimap-agent-skills 5.0.12 (main `723039e`). Only csharp.md changed among the pinned references: it adds ERR-06, ERR-07 and QUALITY-06. The 5.0.9 digest of csharp.md, which 5.0.10 and 5.0.11 still carry, moves to `compatibleDigests`, so Golden 5.0.7 through 5.0.12 run every rule. On Golden before 5.0.12 the three new detectors still run, but the Golden text they cite is not in that release.
- Add lexical detectors for the new Golden rules in `scripts/logging.mjs`: `be-reserved-exception` (ERR-06, SonarQube S112: `throw new` of NullReferenceException, IndexOutOfRangeException, Exception, SystemException or ApplicationException, including `?? throw`), `be-argument-param-name` (ERR-07, S3928/CA2208: `Argument*Exception` whose paramName is a string literal, or `nameof` of a name missing from the nearest declared parameter list) and `be-redundant-jump` (QUALITY-06, S3626: a bare `continue;` ending a loop body, or `return;` ending a void/Task method or the last catch/finally of a try that ends one). All three are be-main review candidates at tier MUST; the catalog adds `be-exception-construction` and `be-redundant-jump`.
- SEC-20 now also flags each `CookieOptions` initializer that does not set `Secure` and `HttpOnly` to a literal (SonarQube S2092/S3330), such as `Secure = Policy.RequireSecureCookies(config)` or a delete call without flags. An app-level `CookieSecurePolicy.Always` in the same file covers `Secure`. The SEC-20 detector revision rises to 2.
- Add security class SEC-23 regex backtracking (A04, CWE-1333, SonarQube S5852) for be-main, be-library, fe-main and fe-library: `^\s*` under the multiline flag, adjacent overlapping whitespace quantifiers and nested quantifiers, in C# `Regex` constructors, static helpers and `[GeneratedRegex]`, and in TypeScript regex literals and `new RegExp`. The class table now has 23 classes. Golden SEC-24 (`.dockerignore` for `COPY . .`, S6470) has no detector: Dockerfiles and Node scripts such as `Scripts/*.mjs` are outside the declared product layout.

## 0.1.18 - 2026-11-02

- Add lexical detectors for the Golden structured-logging and error-mapping rules in csharp.md: `be-log-template` / `be-library-log-template` (LOG-01: constant templates whose placeholder count differs from their arguments, exceptions passed after the template, and `ex.Message`/`ex.ToString()` logged without the exception object), `be-log-composition` / `be-library-log-composition` (LOG-02: messages built by concatenation, interpolation or `string.Format`, noting exception text and placeholders left without an argument) and `be-error-status` (ERR-03: NullReferenceException or IndexOutOfRangeException mapped to HTTP 400). All five are review candidates at tier MUST, run without the Roslyn reader and live in the new `scripts/logging.mjs`, which reuses the security lane lexer. Logging calls are matched by receiver and method name (ILogger, AgriMap.Platform LoggerExtensions, static `Log`), not by resolved type. The catalog adds `be-structured-logging`, `be-error-status` and `be-library-structured-logging`; the analysis contract's runtime digest now covers `logging.mjs`.
- Add the OBS observability baseline (SHOULD, no Golden rule yet) to `scripts/logging.mjs`: `be-obs-console-write` / `be-library-obs-console-write` (OBS-01: `Console.Write*` that bypasses the NLog JSON layout, noting serialized payloads and stack traces that span several lines), `be-obs-nlog-duplicate` (OBS-02: one file registering NLog through both `AddNLog`/`AddNLogWeb` and `UseNLog`) and `be-obs-input-as-500` / `be-library-obs-input-as-500` (OBS-03: `AppException(500, "<code>")` whose literal snake_case code names a caller-input, lookup or state outcome; codes about configuration are excluded). Bindings use `goldenRuleId: none — OBS-xx observability baseline` and `sourceStatusBasis: package-observability-baseline`; the catalog adds `be-observability-baseline` and `be-library-observability-baseline`.
- Mark OBS remediation guidance with `judgment: true`: report cards and fix prompts state that the rule has no Golden backing, that the team weighs monitoring value against the stated change risk, and that a finding left unfixed is recorded as `exception` in review.json. Add `docs/LOGGING-LINT.md` (outcome classification, how to read status-code counts, change risk per rule and what the rules do not check), link it from README, BACKEND-LINT, WORKFLOWS, RULE-MAPPING and the generated SKILL text, and include it in the runtime distribution.

## 0.1.17 - 2026-11-01

- Refresh the Golden source lock to agrimap-agent-skills 5.0.9 (main `e3fee8c`). Ten references changed: csharp.md, frontend.md, sql.md and every lane checklist add links to the new authoring-side `security-baseline.md` (SEC-01..22, same classes and tiers as the lint security lane), and skill-routing.json/md add sql-context-pack 3.5.1 guidance. None of it changes what the existing detectors check. `compatibleDigests` now keeps the reviewed 5.0.7 and 5.0.8 digests, so Golden 5.0.7, 5.0.8 and 5.0.9 all run every rule.
- `security-baseline.md` is not pinned yet, and SEC classes without a Golden rule keep `goldenRuleId: none — SEC-xx security baseline`.

## 0.1.16 - 2026-10-31

- Stop blocking every applicable rule when the Golden package version differs from the lock. A different release of agrimap-agent-skills is accepted with identity status `version-mismatch` and the non-blocking diagnostic `SOURCE_VERSION_MISMATCH:<version>`; per-file reference digests still decide which rules run. Wrong package names, invalid metadata and manifests that disagree on the version (`SOURCE_IDENTITY_CONFLICT`) still block. Provenance adds optional `versionMatched`, and the report shows the active and locked Golden versions together.
- Refresh the Golden source lock to agrimap-agent-skills 5.0.8 (main `f926908`). Five references changed (skill-routing.json/md, both backend checklists and sonarqube-remediation.md); the 5.0.8 edits cover the ADV safe-fix tier, new ADV-10..14 guidance and SQL context-migrate routing, and do not change what the existing detectors check. The new `compatibleDigests` map keeps the reviewed 5.0.7 digests of those files, so Golden 5.0.7 and 5.0.8 both run every rule. ADV-10..14 detectors are not implemented.

## 0.1.15 - 2026-10-31

- Add an OWASP Top 10:2021 application-security lane: 22 classes (`SEC-01`..`SEC-22`, canonical table `assets/security-classes.json`) bound as 47 lexical detectors across be-main, be-library, fe-main, fe-library and sql-procedure. It covers SQL/command/LDAP composition, path containment, missing authorization and test/bypass endpoints, exception detail in responses, sensitive logging, weak cryptography, token validation and issuance, TLS bypass, unsafe deserialization, permissive CORS, method override, open redirect, credentials in query strings, secret/personal response fields, unbounded paging, host security headers, insecure cookies, Angular DOM XSS sinks and tokens in Web Storage. Every finding is a review candidate with a severity; observations name APIs and value categories only and never copy code or literals.
- Bind tier `MUST` only where Golden states the same rule (CTL-03, and the data-access, error-detail and logging rules in csharp.md). Other classes are a package security baseline (`SHOULD`, `sourceStatusBasis: external-security-standard`), not a Golden verdict. Report schema 1 adds optional `finding.security` and `authority.securityStandard` (`resultStatus: not-imported`); the analysis contract adds `securityClassDigest`.
- Carry a per-class response contract into report cards and fix prompts: legitimate, authorized requests keep status, body and wire names, prompts require a legitimate-request regression test, and guidance rejects fixes that break real users (character blacklists, masking personal fields for every caller, renaming query fields, silent clamping, blanket `no-store`, HPKP).
- Catalog deployment-owned scanner findings (request smuggling, unpatched servers, TLS ciphers, proxy banners), A06 vulnerable components and data-flow families (IDOR, mass assignment, CSRF, SSRF, uploads, rate limiting) as not-implemented. Add `docs/SECURITY-LINT.md` with the class table, a scanner-category mapping and the fixes that are not used, and update README, WORKFLOWS, VERSIONS, RULE-MAPPING and the generated SKILL text.

## 0.1.14 - 2026-10-29

- Add QUALITY-05 advisory detectors `be-constant-array-argument` (ADV-08, CA1861: inline arrays of literals, typeof or nameof passed as arguments; attributes excluded) and `be-generated-regex` (ADV-09, SYSLIB1045: Regex static calls or new Regex with a string-literal pattern). Both are syntax-only review candidates, recommend first; const identifiers, target framework and the S6444 timeout hotspot are not assessed.
- Refresh the Golden source lock to agrimap-agent-skills 5.0.7 (main `d310a34`), which adds ADV-08/09 to sonarqube-remediation.md. Installed Golden 5.0.6 or older drifts on that file and blocks backend rules.

## 0.1.13 - 2026-10-29

- Refresh the Golden source lock to agrimap-agent-skills 5.0.6 (main `fc6ba8b`), which changes csharp.md, the backend checklists and skill-routing. Installed Golden 5.0.5 or older drifts on those files and blocks backend rules.
- Add NS-01 file-layout detectors `be-file-layout` (be-main) and `be-library-file-layout` (be-library, same reader output). They flag a using directive after the namespace, which compiles and was previously reported as clean, and anything other than exactly one blank line between the using block, the file-scoped namespace and the first type. Libraries also report block namespaces, keeping the published name. Header comments, regions and attributes start a section, and spacing is skipped when assembly attributes are present. The Roslyn reader is rebuilt with the same Roslyn 4.11.0.0 and protocol 2.
- Run ADV-01 overload adjacency on AgriMap.Platform libraries as `be-library-overload-adjacency` (advisory, recommend first). ADV-04/05/07 stay be-main only.
- Both bind to NS-01 sections that already existed in Golden 5.0.5 (`csharp.md` and the lane checklists).
- Correct the remaining repository owner URLs to `cognivex006` and republish the existing version tags with corrected identities; keep each version's scanner and trust locks unchanged.

## 0.1.12 - 2026-10-28

- Add Roslyn syntax detectors for Golden QUALITY-01..03: `be-method-branches` (more than seven `if`/`else if` per function scope, nested included, bare `else` excluded, local functions/lambdas scoped separately), `be-parameter-count` (more than seven parameters on methods, constructors and local functions; overrides, explicit interface implementations and extern excluded) and `be-nested-ternary` (nested conditional expressions, including anonymous-object members). All remain review candidates.
- Record the related SonarQube rule (S3776, S107, S3358) and default severity per binding as optional `authority.externalAnalyzer` with `resultStatus: not-imported`; reports and prompts state that findings are Golden lint candidates, not SonarQube results, and never claim a Quality Gate outcome. Report schema 1 stays backward compatible.
- Catalog the S3776 score/Quality Profile check and the QUALITY-04 requester notice as not-implemented. Prompts for the three QUALITY rules now carry the notice contract from Golden `sonarqube-remediation.md`, including completed-work rework and SonarQube rescan status.
- Refresh the Golden source lock, adding `references/sonarqube-remediation.md` (QUALITY-04 from 5.0.4). It pins agrimap-agent-skills 5.0.5 (main `7085fc5`), which adds QUALITY-05 to csharp.md, backend-main.md and sonarqube-remediation.md. Installed Golden 5.0.4 or older drifts on the backend files and blocks backend rules.
- Add QUALITY-05 advisory smell detectors (tier SHOULD, review candidates): `be-overload-adjacency` (ADV-01, S4136), `be-caller-info-argument` (ADV-04, S3236, runtime guard APIs only), `be-unused-local` (ADV-05, S1481) and `be-dispose-suppress-finalize` (ADV-07, CA1816). Reports sort advisory rules last and tag them `advisory`; cards and prompts state that the default is a recommendation and fixes apply only when the requester asks and evidence proves no behavior or contract change.
- Catalog ADV-02 (CA1822/S2325), ADV-03 (S1905) and ADV-06 (xUnit2032) as not-implemented: they need full target semantics or live under unscanned Tests/. `externalAnalyzer.ruleKey` now also accepts `external_roslyn:` keys.

## 0.1.11 - 2026-10-26

- Add evidence-bounded hardcode literal detection across FE, BE, library and SQL lanes as seven classes (`HC-SECRET`, `HC-ENVURL`, `HC-PROXYBYPASS`, `HC-EXTURL`, `HC-CONFIG`, `HC-MAGIC`, `HC-SQL`) with the Golden `MUST`/`SHOULD`/`FREE` tiers; credential-shaped values are never written and only a masked form and a digest are recorded.
- Add an append-only hardcode policy ledger with an explicitly authorized `policy-update` writer and subject-based recall, so an accepted exception is not asked again until the normalized value, file path or `reviewAfter` changes; expired items surface as needs-review (exit 3).
- Integrate hardcode decisions into canonical JSON, Markdown reports, summaries, indexes and fix prompts; add the hardcode policy schema and keep read-only scans, exit codes and Golden authority unchanged.
- Add `docs/HARDCODE-LINT.md` with the class table, silence list and skip-memory behavior, and extend the USAGE, REPORTING, WORKFLOWS, TROUBLESHOOTING, COMMAND-COOKBOOK and VERSIONS guidance for the hardcode lane.

## 0.1.10 - 2026-10-21

- Add evidence-based third-party terms/license/policy governance with scoped severe-conflict gates, append-only owner decisions, automatic local recall, reopening and expiry/snapshot review; preserve read-only scans and separate Golden authority.
- Integrate governance into canonical JSON, Markdown reports, summaries, indexes and fix prompts; add an explicitly authorized ledger writer and exit codes for review-required and blocked work.
- Correct the unpublished candidate version from 0.1.20 to 0.1.10 at the owner's request and prepare source/runtime/host bundles with checksums; host installation remains separate.

## 0.1.9 - 2026-10-20

- Migrate repository, installation links and generated host metadata to `cognivex006/agrimap-golden-lint-skills`, preserving existing Git history and tags. Scanner behavior and schemas are unchanged.

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
