# AgriMap Golden Lint 0.1.6

[รุ่นล่าสุด](https://github.com/orchex006/agrimap-golden-lint-skills/releases/latest) · [Tags](https://github.com/orchex006/agrimap-golden-lint-skills/tags) · [Changelog](CHANGELOG.md)

สกิลสำหรับ Agent ที่ตรวจโค้ด AgriMap เทียบกับ Golden ของ [agrimap-agent-skills](https://github.com/orchex006/agrimap-agent-skills) แล้วส่งรายงาน Markdown ที่บอกทุกไฟล์/บรรทัด กฎที่เกี่ยวข้อง ลำดับที่ควรแก้ และ **prompt สำหรับแก้ไขรายกฎ** ที่ส่งต่อให้ `agm-be`, `agm-fe` หรือ `agm-sql` ได้ทันที ตัว lint ไม่แก้โค้ดเอง

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
| คำสั่งไม่ผ่าน ตรวจได้บางส่วน หรือผลไม่ตรงคาด | [Troubleshooting](docs/TROUBLESHOOTING.md) |
| รุ่น, Golden, parser และไฟล์แจกจ่าย | [Versions](docs/VERSIONS.md) |
| พัฒนา package นี้ | [คู่มือผู้ดูแล (source repository)](https://github.com/orchex006/agrimap-golden-lint-skills/blob/main/docs/MAINTAINING.md) |

## ตรวจอะไรได้บ้าง

| Lane | ความสามารถ |
| --- | --- |
| BE main (`agmws-*`, `agmbo-*`) | Roslyn 12 detectors: namespace, public type ต่อไฟล์, naming ของ type/member/dependency/role, Async suffix, null-forgiving `!`, `== null`, catch ว่าง, sync-over-async และ fake async |
| BE library (AgriMap.Platform) | naming ของ type/member/dependency/Async และ boundary review ของ public surface |
| FE app (`agmwa-*`) | T6 (`any`, non-null), R1/R3 candidates และ naming ของไฟล์/symbol |
| FE library (@agrimap/*) | naming ของไฟล์/class และ boundary review ของ public-api |
| SQL | CREATE OR ALTER, naming ของ procedure/table/column/constraint/index และ boundary review ของ DDL/messages |

รวม detector อัตโนมัติ 26 ตัวและ boundary review 4 ตัว ครอบคลุมบางส่วนของ catalog 30 กลุ่ม ดูสถานะครบใน [Coverage](skills/agrimap-golden-lint-skills/references/COVERAGE.md) และแหล่งกฎใน [Rule mapping](skills/agrimap-golden-lint-skills/references/RULE-MAPPING.md)

ผลส่วนใหญ่เป็น `review-candidate` คือจุดที่ต้องยืนยันก่อนแก้ ไม่ใช่ bug ที่พิสูจน์แล้ว รายงานจึงจัดลำดับตามความเสี่ยงในการแก้ และ prompt ทุกชุดสั่งให้ข้ามจุดที่กระทบ public API, JSON/route หรือ database contract

## ใช้ Node runner โดยตรง

เปิด **Terminal ที่ root ของ package นี้** แล้วแทนค่า `<...>`

**PowerShell — authorized report write: บันทึกชุดรายงานใน .agrimap-agent ของโครงการ**

```powershell
$dotnet = (Get-Command dotnet).Source
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs report --root '<project-root>' --golden '<golden-package-root>' --source-mode installed --dotnet $dotnet --authorize-output '<project-root>/.agrimap-agent/reports/golden-lint'
```

ใช้ `scan --format summary` เมื่อต้องการผลแบบไม่เขียนไฟล์ใด ๆ ดูทุกตัวเลือกใน [Usage](docs/USAGE.md)

## ขอบเขตที่ควรรู้

- `scan` อ่านอย่างเดียว; `report` เขียนได้เฉพาะชุดรายงานใหม่ใน `.agrimap-agent/reports/golden-lint` ตาม path ที่ผู้เรียกระบุ
- ไม่ build/restore/install, ไม่ execute scripts ของโครงการ, ไม่เชื่อมฐานข้อมูล และไม่แก้ Golden
- Findings และ prompt เป็นข้อเสนอ ไม่อนุมัติการแก้โค้ด, commit, merge หรือ deploy
- Golden มีเจ้าของคือ agrimap-agent-skills; lint ไม่สร้างมาตรฐานชุดใหม่

รายละเอียด identity, baseline และการป้องกันการเขียนไฟล์อยู่ใน [Runtime contract](skills/agrimap-golden-lint-skills/references/RUNTIME.md) ตัวอย่างรายงานอยู่ที่ [Examples](examples/README.md)

## มีอะไรใหม่ใน 0.1.6

- คำสั่ง `report` ทำ scan → บันทึกรายงาน Markdown ใน `.agrimap-agent` → พิมพ์สรุปพร้อมใช้ในขั้นเดียว แทนการเก็บ JSON ใน Temp
- `report.md` ออกแบบใหม่ให้อ่านง่าย: สรุปรายกฎ ลำดับที่ควรแก้ prompt แก้ไขรายกฎ ดัชนีไฟล์ และ checklist ทุก finding
- C# อ่าน `ImplicitUsings` จาก .csproj จึงตรวจ Async suffix และ sync-over-async ในโครงการ .NET 8 ได้ครบขึ้น และชี้คอลัมน์ของ `!` ที่ต่อกันได้ถูกตัว
- รองรับ Cursor ผ่าน `.cursor-plugin` และ portable skill `agm-lint` ที่ใช้ร่วมกับ Antigravity IDE

Repository: [orchex006/agrimap-golden-lint-skills](https://github.com/orchex006/agrimap-golden-lint-skills)
