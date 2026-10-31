# AgriMap Golden Lint 0.1.16

[รุ่นล่าสุด](https://github.com/cognivex006/agrimap-golden-lint-skills/releases/latest) · [Tags](https://github.com/cognivex006/agrimap-golden-lint-skills/tags) · [Changelog](CHANGELOG.md)

สกิลสำหรับ Agent ที่ตรวจโค้ด AgriMap เทียบกับ Golden ของ [agrimap-agent-skills](https://github.com/cognivex006/agrimap-agent-skills) แล้วส่งรายงาน Markdown ที่บอกทุกไฟล์/บรรทัด กฎที่เกี่ยวข้อง ลำดับที่ควรแก้ และ **prompt สำหรับแก้ไขรายกฎ** ที่ส่งต่อให้ `agm-be`, `agm-fe` หรือ `agm-sql` ได้ทันที ตัว lint ไม่แก้โค้ดเอง

ใช้ได้กับ Codex, Claude Code, Cursor, Gemini CLI และ Antigravity (CLI/IDE) ด้วย runner และรายงานชุดเดียวกัน

## ได้อะไรจากการตรวจหนึ่งครั้ง

| ผลลัพธ์ | อยู่ที่ไหน |
| --- | --- |
| สรุปในช่องสนทนา: จำนวนจุดต่อกฎ ไฟล์ที่พบมาก และ prompt ที่ควรเริ่ม | stdout ของคำสั่ง `report` ซึ่ง Agent วางให้ตามรูปแบบเดียวกันทุก host |
| รายงานเต็ม `report.md`: ทุก finding พร้อม checkbox, ดัชนีไฟล์, วิธีแก้รายกฎ และ prompt แก้ไข | `<project>/.agrimap-agent/reports/golden-lint/<report-id>/` |
| ประวัติทุกรอบสำหรับเทียบก่อน/หลังแก้ | `<project>/.agrimap-agent/reports/golden-lint/index.md` |
| หลักฐาน canonical และสมุดทบทวน | `report.json`, `envelope.json`, `review.json`, `review.md` ในชุดรายงานเดียวกัน |

ชุดรายงานมี `.gitignore` ของตัวเอง จึงไม่ถูกเพิ่มเข้า Git ของโครงการ และไม่มีการแก้ไฟล์อื่นของ product

## เริ่มใช้งาน

1. ติดตั้งสกิลตาม host ใน [Installation](docs/INSTALLATION.md) และติดตั้ง agrimap-agent-skills 5.0.2 ไว้เป็นแหล่ง Golden
2. เปิด session ใหม่ แล้วพิมพ์ **ในช่องสนทนา Agent** (ตัวอย่าง Codex):

```text
$agm-lint ตรวจโครงการ D:\work\agmws-sample-netcore เทียบ Golden แล้วบันทึกรายงานใน .agrimap-agent ยังไม่แก้โค้ด
```

3. อ่านสรุป เปิด `report.md` แล้วคัดลอก prompt ชุดแรก (ความเสี่ยงต่ำ) ไปให้สกิลของ lane นั้นแก้
4. หลังแก้ ให้สั่งตรวจอีกครั้งพร้อม baseline ของรอบก่อน เพื่อดูว่าจุดใดหายและมีจุดใหม่หรือไม่

รายละเอียดทีละขั้นอยู่ใน [Getting Started](docs/GETTING-STARTED.md) ชื่อเรียกสกิลของแต่ละ host อยู่ใน [Installation](docs/INSTALLATION.md)

## เลือกอ่านตามงาน

| ต้องการ | ไปที่ |
| --- | --- |
| เตรียมเครื่องและตรวจครั้งแรก | [Getting Started](docs/GETTING-STARTED.md) |
| ติดตั้งให้ Codex, Claude Code, Cursor, Gemini หรือ Antigravity | [Installation](docs/INSTALLATION.md) |
| ความหมายของทุก operation และ option | [Usage](docs/USAGE.md) |
| โจทย์และคำสั่งพร้อมคัดลอก | [Command cookbook](docs/COMMAND-COOKBOOK.md) |
| อ่านผล แก้ตาม prompt และตรวจซ้ำ | [Workflows](docs/WORKFLOWS.md) |
| โครงสร้างรายงานและชุดไฟล์ใน .agrimap-agent | [Reporting](docs/REPORTING.md) |
| กฎ C# และการเตรียม .NET | [Backend lint](docs/BACKEND-LINT.md) |
| กฎตั้งชื่อ FE/BE/SQL | [Naming lint](docs/NAMING-LINT.md) |
| hardcode, secret, URL และ config ที่ฝังในโค้ด | [Hardcode lint](docs/HARDCODE-LINT.md) |
| ช่องโหว่ application ตาม OWASP Top 10 และวิธีแก้ที่ไม่เปลี่ยน response | [Security lint](docs/SECURITY-LINT.md) |
| คำสั่งไม่ผ่าน ตรวจได้บางส่วน หรือผลไม่ตรงคาด | [Troubleshooting](docs/TROUBLESHOOTING.md) |
| รุ่น, Golden, parser และไฟล์แจกจ่าย | [Versions](docs/VERSIONS.md) |
| พัฒนา package นี้ | [คู่มือผู้ดูแล (source repository)](https://github.com/cognivex006/agrimap-golden-lint-skills/blob/main/docs/MAINTAINING.md) |

## ตรวจอะไรได้บ้าง

| Lane | ความสามารถ |
| --- | --- |
| BE main (`agmws-*`, `agmbo-*`) | Roslyn 22 detectors: namespace และลำดับ using/namespace (NS-01), public type ต่อไฟล์, naming ของ type/member/dependency/role, Async suffix, null-forgiving `!`, `== null`, catch ว่าง, sync-over-async และ fake async |
| BE library (AgriMap.Platform) | naming ของ type/member/dependency/Async, ลำดับ using/namespace (NS-01), overload ไม่อยู่ติดกัน (ADV-01) และ boundary review ของ public surface |
| FE app (`agmwa-*`) | T6 (`any`, non-null), R1/R3 candidates และ naming ของไฟล์/symbol |
| FE library (@agrimap/*) | naming ของไฟล์/class และ boundary review ของ public-api |
| SQL | CREATE OR ALTER, naming ของ procedure/table/column/constraint/index และ boundary review ของ DDL/messages |

รวม detector อัตโนมัติ 95 ตัว (security 47 ตัว, hardcode 10 ตัว, SonarQube-aligned 10 ตัว) และ boundary review 4 ตัว ครอบคลุมบางส่วนของ catalog 52 กลุ่ม ดูสถานะครบใน [Coverage](skills/agrimap-golden-lint-skills/references/COVERAGE.md) และแหล่งกฎใน [Rule mapping](skills/agrimap-golden-lint-skills/references/RULE-MAPPING.md)

การตรวจ hardcode ทำงานทุก lane ที่รองรับ (FE, BE, libraries และ SQL) ตาม tier ของ Golden — `MUST` ต้องทบทวนก่อนถือว่าผ่าน, `SHOULD` ใช้ต่อได้แต่ต้องบันทึกเหตุผล และ `FREE` ไม่เป็น violation ดูรายละเอียดที่ [Hardcode lint](docs/HARDCODE-LINT.md)

ผลส่วนใหญ่เป็น `review-candidate` คือจุดที่ต้องยืนยันก่อนแก้ ไม่ใช่ bug ที่พิสูจน์แล้ว รายงานจึงจัดลำดับตามความเสี่ยงในการแก้ และ prompt ทุกชุดสั่งให้ข้ามจุดที่กระทบ public API, JSON/route หรือ database contract

ตั้งแต่ 0.1.15 การตรวจช่องโหว่ application ทำงานทุก lane ด้วย 22 class ตาม OWASP Top 10:2021 และ CWE ผลทุกตัวเป็น review candidate และ prompt แก้ทุกชุดบังคับให้ผู้เรียกที่ถูกต้องได้ response เดิม ดูที่ [Security lint](docs/SECURITY-LINT.md)

## ใช้ Node runner โดยตรง

เปิด **Terminal ที่ root ของ package นี้** แล้วแทนค่า `<...>`

**PowerShell — authorized report write: บันทึกชุดรายงานใน .agrimap-agent ของโครงการ**

```powershell
$dotnet = (Get-Command dotnet).Source
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs report --root '<project-root>' --golden '<golden-package-root>' --source-mode installed --dotnet $dotnet --authorize-output '<project-root>/.agrimap-agent/reports/golden-lint'
```

ใช้ `scan --format summary` เมื่อต้องการผลแบบไม่เขียนไฟล์ใด ๆ ดูทุกตัวเลือกใน [Usage](docs/USAGE.md)

## ขอบเขตที่ควรรู้

- `scan` อ่านอย่างเดียว; `report` เขียนได้เฉพาะชุดรายงานใหม่ใน `.agrimap-agent/reports/golden-lint` ตาม path ที่ผู้เรียกระบุ และ `review-update` เขียนใหม่ได้เฉพาะ Markdown ของชุดรายงานนั้น
- `governance-update` และ `policy-update` เขียนได้เฉพาะทะเบียนที่ผู้เรียกระบุ path ตรงทุกตัวอักษร โดยไม่แตะไฟล์อื่น
- ไม่ build/restore/install, ไม่ execute scripts ของโครงการ, ไม่เชื่อมฐานข้อมูล และไม่แก้ Golden
- Findings และ prompt เป็นข้อเสนอ ไม่อนุมัติการแก้โค้ด, commit, merge หรือ deploy
- Golden มีเจ้าของคือ agrimap-agent-skills; lint ไม่สร้างมาตรฐานชุดใหม่

รายละเอียด identity, baseline และการป้องกันการเขียนไฟล์อยู่ใน [Runtime contract](skills/agrimap-golden-lint-skills/references/RUNTIME.md) ตัวอย่างรายงานอยู่ที่ [Examples](examples/README.md)

## ความสามารถใน 0.1.16

- คำสั่ง `report` ตรวจและบันทึกรายงาน Markdown พร้อมสรุปในขั้นเดียว
- รายงานมีสรุปรายกฎ ลำดับที่ควรแก้ prompt แก้ไข ดัชนีไฟล์ และ checklist ทุก finding
- Prompt กำหนด hotfix branch รายกฎ วิเคราะห์ผลกระทบและหลักฐานก่อนแก้ พร้อมตรวจ callers หรือ services/apps/libraries ที่เกี่ยวข้อง
- บันทึกข้อสรุปใน `review.json` แล้วใช้ `review-update` อัปเดตรายงาน; `report --baseline` ยกข้อสรุปเดิมมาให้อัตโนมัติ
- C# รองรับ `ImplicitUsings` จาก .csproj และใช้ portable skill `agm-lint` ร่วมกับ Cursor และ Antigravity IDE ได้
- ตรวจ hardcode literal แยกเป็น 7 class (`HC-SECRET`, `HC-ENVURL`, `HC-PROXYBYPASS`, `HC-EXTURL`, `HC-CONFIG`, `HC-MAGIC`, `HC-SQL`) ตาม tier ของ Golden โดยไม่เขียนค่า secret ลงรายงานหรือทะเบียน
- จำข้อสรุป “ตกลงไม่แก้” ในทะเบียน `.agrimap-agent/reports/golden-lint/hardcode-policy.json` แบบ append-only แล้วไม่ถามจุดเดิมซ้ำ จนกว่าค่าจะเปลี่ยน ไฟล์ย้าย หรือหมด `reviewAfter`
- ตรวจ C# ตามกฎ SonarQube ของ Golden: QUALITY-01..03 (if/else-if เกิน 7, parameters เกิน 7, ternary ซ้อน) และ advisory smells ของ QUALITY-05 (overload ไม่อยู่ติดกัน, ส่ง paramName ให้ guard เอง, local ที่ไม่ได้ใช้, Dispose ไม่เรียก GC.SuppressFinalize, array คงที่ที่ส่งเป็น argument, Regex ที่ควรใช้ GeneratedRegex) โดยแยกจากผลสแกน SonarQube จริง
- ตรวจช่องโหว่ application ตาม OWASP Top 10:2021 เป็น 22 class (SEC-01..SEC-22) ทุก lane พร้อม response contract ที่ให้ผู้เรียกที่ถูกต้องได้ response เดิม และแยกหมวดที่เป็น server/gateway ไว้ใน catalog
- ตรวจลำดับ using/namespace ตาม NS-01 (using หลัง namespace, บรรทัดว่างระหว่างส่วน, block namespace ของ library) และ overload ไม่อยู่ติดกัน (ADV-01) ใน AgriMap.Platform ด้วย

Repository: [cognivex006/agrimap-golden-lint-skills](https://github.com/cognivex006/agrimap-golden-lint-skills)

## ตรวจเงื่อนไข third party ก่อนตัดสินใจ

0.1.10 เพิ่มทะเบียนหลักฐาน Terms of Use / Terms of Service / Policy / Rules / licenses สำหรับ dependencies, libraries, third party และ SaaS พร้อม gate และ Owner decisions ใน JSON, report.md และ summary.md อ่าน [ขั้นตอน governance](docs/REPORTING.md#third-party-governance) ก่อนใช้

ต้องศึกษาเงื่อนไขจริงและบริบทการใช้ ไม่อนุมานความถูกต้องจากชื่อ license หรือ tests ผ่าน หากยังไม่มีทะเบียน scan แสดง needs-review (exit 3); ข้อขัดเงื่อนไข high/critical ที่ผู้ทบทวนยืนยันแสดง blocked (exit 4) แม้ Owner เลือกไม่แก้ ทะเบียนอ่านซ้ำอัตโนมัติโดยไม่ต้องส่ง baseline และแก้ย้อนหลังด้วยประวัติแบบต่อท้าย ไม่เปลี่ยน Golden coverage

## ตรวจ hardcode ก่อนปล่อยงาน

0.1.11 เพิ่มการตรวจค่าที่ฝังตรงในโค้ด — secret, URL ของ environment, การเรียก external map service ตรง, environment selector, business limit และ host/database name ใน SQL — พร้อม tier ตาม Golden และทะเบียนข้อยกเว้นที่จำได้ข้ามรอบ อ่าน [Hardcode lint](docs/HARDCODE-LINT.md) ก่อนตีความผล

ค่า secret ไม่ถูกเขียนลง report, ledger, prompt หรือ index ทุกรณี ระบบเก็บเพียงรูป mask และ digest ส่วนจุดที่ทีมยืนยันว่าไม่แก้จะถูกบันทึกใน `<root>/.agrimap-agent/reports/golden-lint/hardcode-policy.json` แล้วไม่ถามซ้ำจนกว่าค่าจะเปลี่ยน ไฟล์ย้าย หรือหมด `reviewAfter`; ถ้ามีรายการหมดอายุ scan แสดง needs-review (exit 3) ดูขั้นตอนที่ [Reporting](docs/REPORTING.md#hardcode-decisions)

## กฎ SonarQube และ advisory smells

0.1.16 ตรวจ C# ตาม QUALITY-01..05 และ NS-01 ของ Golden 5.0.8 ทุกผลเป็น lint candidate ไม่ใช่ผลสแกน SonarQube และไม่สรุปว่า Quality Gate ผ่านหรือไม่ผ่าน กฎ ADV (QUALITY-05) เป็น smell ที่ทีมตกลงว่าแก้หรือไม่แก้ก็ได้ รายงานจึงเรียงไว้ท้ายและติดป้าย advisory ค่าเริ่มต้นคือข้อแนะนำ prompt แก้ใช้เมื่อผู้ขอสั่งแก้เท่านั้น อ่าน [Backend lint](docs/BACKEND-LINT.md)

ใช้ Golden agrimap-agent-skills 5.0.7 หรือ 5.0.8 ได้ทุกกฎ ตั้งแต่ 0.1.16 รุ่นของ Golden ที่ไม่ตรง lock ไม่บล็อกกฎอีกต่อไป (แสดงเป็น `SOURCE_VERSION_MISMATCH`) กฎจะ blocked เฉพาะเมื่อไฟล์ reference ที่กฎพึ่งเปลี่ยนจากที่ตรวจไว้ เช่น Golden 5.0.6 หรือเก่ากว่าทำให้กฎ backend เป็น blocked พร้อม `SOURCE_MISSING_OR_DRIFT`
