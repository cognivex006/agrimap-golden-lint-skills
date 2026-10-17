# Runtime contract

[หน้าหลัก](../../../README.md) · [Usage](../../../docs/USAGE.md) · [Coverage](COVERAGE.md) · [Rule mapping](RULE-MAPPING.md)

หน้านี้อธิบาย contract ของ Agent และ Node runner ใช้ดูรายละเอียดเมื่อคู่มือผู้ใช้ยังตอบไม่พอ ไม่อนุมัติให้แก้โค้ดหรือเปลี่ยนระบบปลายทาง

## Operations และ scope

Runner คือ `skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs` ชื่อ operation/options มาจาก config/operations.json และ assets mirror ทุก option รับค่า ไม่มี boolean switches, strict หรือ autofix

`scan --root <product-root> --golden <upstream-package-root> --source-mode checkout|installed` ส่ง canonical JSON ออก stdout (`--format json`) หรือสรุป Markdown (`--format summary`) โดยไม่เขียนไฟล์ เพิ่ม `--typescript`, `--dotnet`, `--baseline`, `--base-ref` หรือ `--target-ref` ได้ตาม Usage

`report` ใช้ options เดียวกับ scan บวก `--authorize-output <root>/.agrimap-agent/reports/golden-lint` ทำ scan เดียวกันทุกประการ แล้วบันทึกชุดรายงานและพิมพ์สรุป Markdown (หรือ JSON เมื่อ `--format json`) ดูหัวข้อ One-step report ด้านล่าง

ค่าเริ่มต้นอ่าน working tree รวม untracked และ ignored files ที่ไม่ถูกยกเว้น Root อาจเป็น portfolio หรือ conventionally named app/service/job/library workspace Classifier ใช้ path/layout ที่ประกาศ ไม่ใช้ชื่อ namespace หรือข้อความอย่างเดียว layout ที่ไม่รองรับถูก excluded พร้อมเหตุผล

Directory exclusions นับเป็น subtree boundary records ไม่ enumerate เนื้อหา และไม่ traverse infra/database Generated, tests, fixtures, reference/schema/docs copies และ bin/obj/dist/node_modules ถูกแยกตาม classifier; generated files ไม่ใช่ handwritten targets ของ initial scope

## Golden source และ dependency gates

Caller ระบุ source path และ mode เอง ไม่มี hard-coded cache location Package root ต้องมี package.json และ skills/agrimap-agent-skills Version/name ต้องตรง lock; checkout ใช้ root package.json และต้องอ่าน commit/tree ได้ ส่วน installed mode รองรับ package.json, .codex-plugin/plugin.json, .claude-plugin/plugin.json, gemini-extension.json และ versioned plugin.json โดยไม่สมมติ Git identity ถ้า metadata ที่มีอยู่เสียหรือขัดกันให้บล็อก ไม่ข้ามไปใช้ไฟล์อื่นแทน Versionless minimal plugin.json ใช้ร่วมกับแหล่งที่ยืนยัน version ได้ แต่ใช้เดี่ยว ๆ ไม่พอ โปรเจกต์ product ไม่ต้องมี package.json เพื่อให้ตรวจ backend ได้

source-lock.json เก็บ SHA-256 ของ exact selected references แยก expected reference commit, inspected checkout และ active source identity Common authority dependencies รวม conflict resolution, pattern status, checklist tiers, root/collection manifests และ lane checklist แต่ละ binding เพิ่ม normalized-contract dependencies ไว้ใน assets/rules.json

Reports เก็บ individual digests ใน authority.sourceDependencies Missing/drifted references บล็อกเฉพาะกฎที่พึ่งพา พร้อม SOURCE_DEPENDENCY_UNVERIFIED:<path> เช่น frontend.md/gencode-api.md drift บล็อก FE โดย BE/SQL ที่มี source ครบยังทำงานได้ Dependencies เหล่านี้เป็น direct declarations ไม่ใช่ proof ว่า resolve authority graph ครบทุกลิงก์

การ refresh trust locks ต้องเป็นงานผู้ดูแลที่ตรวจ source แล้ว sync ไม่เปลี่ยน trust เอง hash ตรงยืนยันเพียง reference bytes ไม่ใช่ความถูกต้องของ detector interpretation ดู exact entry, conflict/exception และหลักฐาน owner/project ตาม Rule mapping ก่อนตัดสิน candidate

## TypeScript และ evidence level

โหลดเฉพาะ TypeScript 5.9.3 จาก caller-selected path ที่ตรง exact digest ก่อน require ไม่โหลด target tsconfig, plugins, scripts, framework declarations หรือ dependencies ของ product ไม่ build/restore/install หรือ execute SQL

In-memory program resolve เฉพาะ local relative import/re-export จาก selected files ไม่ emit ไฟล์ Findings แยก local declaration resolution ออกจาก framework identity; tsconfig aliases, external framework และ full C# project semantic context ยังไม่พร้อม

| Detector | ข้อสรุปสูงสุดที่มีตอนนี้ |
| --- | --- |
| T6 explicit any / undecorated non-null | Syntax conflict ในขอบเขตที่เลือก ไม่พิสูจน์ผลของการแก้ |
| T6 decorated property | Review candidate; ต้อง resolve Angular ViewChild และ static:true ไม่ดูชื่อ decorator อย่างเดียว |
| R1 component dependency | Injection-shaped candidate รวม valid Facade/local-name calls ไม่ใช่ Store/API defect count |
| R3 store purity | Async syntax และ inject/firstValueFrom/subscribe/effect-shaped calls/aliases เป็น candidates ยังไม่พิสูจน์ ownership/flow |
| BE main C# | Roslyn-backed namespace/type/naming/placement/null/catch candidates และ trusted runtime Task symbol checks ตาม Backend lint; ไม่ใช่ full project semantic verdict |
| SQL procedure | Lexical declaration candidate ไม่ตัดสิน deployment/history/business meaning |
| Library/table/messages boundaries | ข้อกำหนดให้ review ไม่ใช่ defect ที่ยืนยันแล้ว |

SQL masking เป็น conservative lexical check ไม่รองรับ nested-comment semantics ทั้งหมด ส่วน C# syntax ใช้ Roslyn และ block conditional compilation ที่ไม่มี context Synthetic conformance cases ยัง pending owner review

## Canonical output และ identities

JSON/Markdown เป็น UTF-8/LF, ordinal sorting และ relative product paths ไม่มี timestamps, duration หรือ random IDs Canonical serialization sort object keys แบบ recursive เก็บ array order ใช้ JSON สอง spaces และ LF

`reportId = SHA256(canonical(payload))` โดย payload คือทุก report field ยกเว้น reportId Snapshot identity ครอบคลุม ordered inventory และ selected byte digests Analysis contract รวม runtime code digests, binding/catalog/source/parser/config identities ดังนั้น implementation เปลี่ยนแม้เลข package เดิมก็ไม่ถือเป็น analyzer เดิมโดยเงียบ ๆ package.json เป็น version authority; detector revision 1 เป็น finding-anchor contract แยกต่างหาก

Finding IDs hash detector/revision, relative path, hashed declaration anchor, normalized token fingerprint และ duplicate occurrence Comment/line shift นอก evidence ไม่เปลี่ยน ID แต่การแทรก anchor ซ้ำอาจเลื่อน occurrence ของตัวถัดไป Rename/refactor หรือเปลี่ยน detector contract อาจจับคู่เดิมไม่ได้

Before/after inventory/source rechecks เปิดเผย observed input drift แต่ไม่ใช่ OS atomic snapshot และจับ change-and-revert ระหว่างอ่านไม่ได้

## Baseline และ Git snapshots

`--baseline` รับ canonical report JSON; `--base-ref` scan immutable Git blobs เป็นฐานด้วย analysis contract เดียวกัน ใช้ทั้งสองพร้อมกันไม่ได้ `--target-ref` เลือก committed blobs แทน working tree จึงไม่รวม staged/untracked/working changes

Git refs resolve ในเครื่องเท่านั้น ไม่มี fetch/clone/index/ref/branch/worktree writes Missing ref fail ชัดเจน Rename matching และ edited-range semantic attribution ยังไม่มี

Comparison ใช้ baseline ที่ completed และ analysis contract ตรงเท่านั้น จับ finding ใน modified file ได้เป็น pre-existing; unmatched finding ใน modified file ยัง unknown ไฟล์ path ใหม่อาจเป็น introduced ตาม contract เดียวกัน Baseline ไม่ซ่อนผลปัจจุบันและ partial/incompatible evidence ไม่ทำให้ origin กลายเป็นข้อเท็จจริง

## Explain/export และ caller envelope

`explain --report <envelope.json> --report-id <id> --finding-id <id>` อ่าน finding เดิม ส่วน `export --report <envelope.json> --report-id <id> --to <absolute-new-file> --authorize-output <same-absolute-new-file> [--format json|markdown]` เขียนรายงานเดิม ค่าเริ่มต้น export เป็น markdown ไม่มี hidden rescan

Envelope คือ `{ "report": <canonical report>, "protectedRoots": [<all scanned roots>, <Golden root>] }` Absolute roots เป็น local transport metadata นอก canonical output Host ต้องเก็บ roots เดิมครบและถูกต้อง report hash ไม่ authenticate envelope

Export ปฏิเสธไฟล์เดิม, inside-root destination, parent ที่ไม่มีอยู่ และ path indirection Roots ต้องมีอยู่จริง scan ไม่ persist report; การเก็บ output โดย host หรือ shell redirection เป็นการเขียนแยกที่ต้องมี destination authority ตามขอบเขต

## สถานะและ coverage

| สถานะ | ความหมาย |
| --- | --- |
| Exit 0 / completed | ทำ declared capabilities ครบ แม้มี findings ไม่ใช่ universal compliance |
| Exit 2 | invalid/fatal invocation |
| Exit 3 / partial | มีกฎ blocked/error หรือ observed drift พร้อมคงผลที่ได้ |
| review-only | หาขอบเขตให้ review ไม่ได้พิสูจน์ defect |
| not-applicable | denominator เป็นศูนย์ ไม่มีไฟล์ที่ตรงกฎนั้น |
| not-implemented | capability ที่ยังไม่ทำ ไม่ใช่ตรวจแล้วไม่พบปัญหา |

assets/catalog.json เป็นเจ้าของสถานะของทุก rule family ทุก JSON/Markdown report แสดง automated/review-only/not-implemented แยกจาก admitted rule execution Selected lane counts ให้บริบท ไม่อ้างว่า family ที่ยังไม่ทำประเมินไฟล์เหล่านั้นแล้ว

## Impact และ manageability

Impact: no-effect-proven / internal-effect / external-effect / unknown ส่วน manageability: manageable / unmanageable-with-current-evidence / unknown Static detectors ปัจจุบันเริ่มทั้งคู่ที่ unknown

Proof ต้องรวม observables, consumers, public/wire/data/behavior contracts, exceptions, verification และ containment/rollback Build/test ผ่านหรือ diff เล็กไม่พอ ข้อเสนอแก้ใช้ approval workflow เดิมของ owner

## การรักษาข้อมูลและการอ่านอย่างเดียว

Observations ใช้ fixed text, hashed anchors/fingerprints ไม่สะท้อน raw source values, identifiers, parameters หรือ secrets Relative paths ยังเป็น locators ที่อาจอ่อนไหวได้ Caller เลือกปลายทาง private ตามงาน ไม่มี arbitrary source excerpts; review import แยกจาก canonical findings Baseline/report ที่ไม่เชื่อถือถูก validate ไม่ execute

Scanner import เฉพาะ read APIs; export writer แยกใน command module Git subprocesses ปิด optional locks และ filesystem monitoring ไม่เขียน target/Golden/package/installation/Git state, intermediate cache, docs/changelog หรือ project records

Fixtures ตรวจ ignored/untracked/generated/docs/records และ junction/symlink cases นี่เป็น application-level guard ไม่ใช่ kernel sandbox และไม่อ้างการป้องกัน hostile concurrent path replacement หรือ OS race ทุกกรณี

## การใช้ร่วมกับสกิลหลัก

การเพิ่ม supporting read-only capability ใน upstream routing ยังเป็นข้อเสนอสำหรับงานแยก Lint ไม่สร้าง Golden owner ใหม่ ไม่แทน lane skills และไม่เพิ่ม lifecycle ของ product จากการ scan

## รายงาน Markdown

assets/report-template.md เป็น canonical layout ดู [Reporting](../../../docs/REPORTING.md) scripts/render.mjs แสดง summary รายกฎ, ลำดับที่ควรแก้, prompt แก้ไขรายกฎ, ดัชนีไฟล์, รายละเอียดครบทุก finding (หนึ่ง checkbox ต่อ finding), คำแนะนำรายกฎ และภาคผนวก provenance/rules/diagnostics/catalog/limitations ไม่ truncate findings ใน report.md และ escape untrusted Markdown labels; prompt bodies เป็น literal fenced text ที่ตัด backticks/control characters

ตั้งแต่ 0.1.6 renderer และ assets/remediation.json (tag, title, risk, skill, expected, approach, verify ต่อ detector) อยู่นอก runtimeContentDigest การเปลี่ยนถ้อยคำหรือ layout จึงไม่ทำให้ baseline เป็น not-comparable Risk เป็นความเสี่ยงทั่วไปของการแก้กฎ ไม่ใช่ disposition ของ finding Prompt แบ่งชุดละไม่เกิน 40 findings โดยเก็บไฟล์เดียวกันไว้ในชุดเดียว และไม่สร้าง prompt ให้ review-only bindings Chat summary แสดงสูงสุด 10 ไฟล์พร้อมบอกจำนวนไฟล์ทั้งหมดเสมอ

Schema 1 คงเดิมโดยเพิ่ม optional provenance identitySource/identitySources/identityVerified, snapshot headCommit/branch/gitDirty และ finding observationKind เพื่อรองรับรายงานเก่า HEAD ใช้เป็น context ของ working tree ไม่ใช่ commit ที่อ้างว่า scan เฉพาะ blobs; content identity ยังเป็นหลักฐาน file bytes

## C# reader

อ่าน [Backend lint](../../../docs/BACKEND-LINT.md) Runtime ต้องมี trusted absolute --dotnet host ภายนอก product/Golden roots และ existing .NET 8 runtime Bundled reader และ Roslyn assemblies (ไม่มี culture resources) ถูกตรวจ exact hashes ทั้งชุดก่อน execute ไม่มี build/restore/MSBuild/config/analyzers/generators ของ target

Reader protocol 2 (0.1.6) รับ `project` และ `globalUsings` ต่อไฟล์: scanner หา .csproj ที่ใกล้ที่สุดใน inventory (ถ้ามีหลายไฟล์ระดับเดียวกันถือว่าไม่ทราบ) อ่านเป็นข้อความเฉพาะ unconditional `<ImplicitUsings>enable|true</ImplicitUsings>` และ `<Using Remove>` แบบตรง แล้วส่ง SDK default global usings Reader สร้าง compilation แยกต่อ project และตรวจว่าทุก namespace segment เป็น identifier ที่ถูกต้อง .csproj ไม่ถูก selected แต่มี digest ใน inventory และ `snapshot.csharpProjects` บันทึก path/implicitUsings NULL-02 locate ที่ operator token ส่วน finding identity (anchor/fingerprint) คงเดิม

Selected source texts ผ่าน stdin; reader parse syntax และใช้ metadata จาก trusted .NET runtime สำหรับ Task checks เท่านั้น คืน fixed cases/locators/hashes ไม่คืน raw code/values Caller-selected host digest, bundle digest และ runtime metadata digests เป็น analysisContract.csharp Unresolved Task-shaped sites เป็น diagnostics ไม่ใช่ safety proof Bundle/host เปลี่ยนที่สังเกตได้หลัง scan ทำให้ inputDrift

ทุก C# finding เป็น candidate/unknown applicability ต้องพิสูจน์ new/touched/legacy, public compatibility และ owner exceptions Namespace detector revision 2 ใช้ parsed declaration anchors; schema 1 และ report IDs เดิมยังอ่านได้แต่ analysis contracts ต่างเวอร์ชันไม่ comparable

## Report bundles

scan อ่านและ stdout เท่านั้น การเขียนมีสองทางที่ผู้เรียกต้องระบุ authorization เอง:

| Operation | Authorization | เขียนอะไร |
| --- | --- | --- |
| save | `<workspace>/.agrimap-agent/reports/golden-lint/<report-id>` ตรงทุกตัวอักษร | ชุดรายงานใหม่จาก envelope ที่มีอยู่ |
| report | `<root>/.agrimap-agent/reports/golden-lint` ของ scanned root เดียวกัน | ชุดรายงานใหม่, `index.md` และ `.gitignore` ของ directory นั้น |

ชุดรายงานมี report.json/report.md/summary.md/envelope.json/review.json/review.md/README.md และ .gitignore สร้างด้วย exclusive create ไม่ overwrite ตรวจทุก ancestor ว่าไม่เป็น junction/symlink ก่อนสร้าง และปฏิเสธเมื่อ Golden protected root ซ้อนปลายทาง

### One-step report ใน 0.1.6

report ID รู้หลัง scan เท่านั้น authorization ของ report จึงระบุ reports directory ที่ lint เป็นเจ้าของแทน report-id directory Protected roots คือ realpath ของ `--root` และ `--golden` ตามลำดับเดียวกับ envelope ถ้ามี directory ของ report ID อยู่แล้วและ report.json ตรงทุก byte จะใช้ชุดเดิม (`existing`) ถ้าไม่ตรงจะหยุดด้วย OUTPUT_UNSAFE_OR_EXISTS `index.md` เป็น derived navigation ที่สร้างจากชุดรายงานบนดิสก์และแทนที่แบบ atomic rename; เวลาใน index มาจาก mtime ของ directory ไม่อยู่ใน canonical report การบันทึกครั้งแรกสร้าง `.agrimap-agent` ซึ่งเป็น excluded-subtree record ของ inventory ดังนั้น report ID ของรอบถัดไปจะต่างจากรอบแรกหนึ่งครั้ง

review-check validate IDs/status/evidence และ secret patterns; export --review รับเฉพาะ Markdown พร้อม input digest และ noncanonical commentary ไม่เปลี่ยน disposition/applicability/ownerEvidence และไม่ rescan อ่าน [Reporting](../../../docs/REPORTING.md) และ [Naming lint](../../../docs/NAMING-LINT.md)

Golden selected lock เป็น 5.0.2; historical reference commit ของ V002 คงเดิม Catalog จำนวนจริงอ่านจาก assets/catalog.json
