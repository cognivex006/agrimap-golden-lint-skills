# AgriMap Golden Lint Skills 0.1.5

[รุ่นล่าสุด](https://github.com/orchex006/agrimap-golden-lint-skills/releases/latest) · [Tags รุ่นก่อน](https://github.com/orchex006/agrimap-golden-lint-skills/tags) · [เลือกเวอร์ชันและ source](docs/VERSIONS.md)

สกิลสำหรับให้ Agent ช่วยตรวจโค้ด AgriMap เทียบกับ Golden พร้อมบอกตำแหน่ง หลักฐาน และจุดที่ต้องทบทวน ใช้ประกอบการ review และวางขอบเขตงานแก้ไข โดย Golden มาจาก [agrimap-agent-skills](https://github.com/orchex006/agrimap-agent-skills)

**เริ่มที่ [Getting Started](docs/GETTING-STARTED.md)** — เตรียมแหล่ง Golden แล้วทดลองตรวจหนึ่งโครงการ

## เลือกอ่านตามสิ่งที่ต้องการ

| ต้องการ | ไปที่ |
| --- | --- |
| เตรียมเครื่องและทดลองครั้งแรก | [Getting Started](docs/GETTING-STARTED.md) |
| เพิ่มสกิลให้ Codex, Claude, Gemini หรือ Antigravity | [ติดตั้งตาม host](docs/INSTALLATION.md) |
| เลือก scan, explain หรือ export | [คู่มือคำสั่ง](docs/USAGE.md) |
| คัดลอกโจทย์ไปใช้กับงานจริง | [ชุดคำสั่งตัวอย่าง](docs/COMMAND-COOKBOOK.md) |
| อ่านผล เปรียบเทียบรุ่น และส่งงานให้เจ้าของโค้ด | [Workflow](docs/WORKFLOWS.md) |
| ดูทุกไฟล์/บรรทัดที่พบประเด็นและติดตามผลทบทวน | [รายงานแบบรายไฟล์](docs/REPORTING.md) |
| ใช้กฎ C# ชุดแรกและเตรียม .NET parser | [Backend lint](docs/BACKEND-LINT.md) |
| คำสั่งไม่ขึ้น / ตรวจได้บางส่วน / export ไม่ผ่าน | [Troubleshooting](docs/TROUBLESHOOTING.md) |
| เลือกรุ่นให้ตรงกับ Golden และ parser | [เวอร์ชันและไฟล์แจกจ่าย](docs/VERSIONS.md) |
| พัฒนาหรือแจกจ่าย package นี้ | [คู่มือผู้ดูแลใน source](https://github.com/orchex006/agrimap-golden-lint-skills/blob/main/docs/MAINTAINING.md) |

## ทดลองหนึ่งคำสั่ง

หาก host โหลดสกิลแล้ว พิมพ์ **ในช่องสนทนา Agent** เช่น Codex:

```text
$agm-lint ช่วยตรวจโครงการนี้เทียบกับ Golden โดยใช้ source และ parser ที่ระบุ สรุปผลพร้อมตำแหน่งไฟล์และจุดที่ต้องทบทวน ยังไม่แก้โค้ด
```

ระบุ path ของโครงการ, package `agrimap-agent-skills`, source mode และ TypeScript parser ตาม [ขั้นตอนเริ่มต้น](docs/GETTING-STARTED.md) ด้วย ดูชื่อเรียกของ host อื่นใน [คู่มือติดตั้ง](docs/INSTALLATION.md)

หากใช้ Node runner โดยตรง ให้เปิด **Terminal ที่ root ของ lint package** แล้วแทนค่าระหว่าง `<...>` ด้วย path จริง:

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan --root '<product-root>' --golden '<golden-package-root>' --source-mode checkout --typescript '<trusted-typescript.js>'
```

ถ้าขอบเขตเป็น C# backend ให้เพิ่ม --dotnet ตาม [Backend lint](docs/BACKEND-LINT.md); ไม่จำเป็นต้องส่ง TypeScript parser เมื่อไม่มี TypeScript scope

สิ่งที่ควรได้: รายงาน JSON พร้อมขอบเขตที่ตรวจได้ ผลตรวจ และข้อจำกัด อ่าน `scanStatus` และ `coverage` ก่อนดูจำนวน findings

## ตรวจอะไรได้บ้าง

| งาน | สิ่งที่มีตอนนี้ |
| --- | --- |
| FE main | ตรวจ syntax ของ T6 และหาจุดทบทวน R1/R3 |
| BE main / job | Release 0.1.4 มี Roslyn detectors 10 ตัว: namespace, type/naming/placement, nullable, catch และ resolved Task checks |
| Service SQL | หาจุดทบทวนรูปแบบประกาศ procedure |
| FE/BE library, SQL table/messages | ระบุขอบเขตที่ต้องตรวจ contract และหลักฐานเพิ่มเติม |

Release 0.1.5 มี detector อัตโนมัติ 26 ตัวและ boundary review 4 ตัว ครอบคลุมบางส่วนของ catalog 30 กลุ่ม ดู [ขอบเขตการตรวจ](skills/agrimap-golden-lint-skills/references/COVERAGE.md) และ [กฎกับแหล่งอ้างอิง](skills/agrimap-golden-lint-skills/references/RULE-MAPPING.md)

`review-candidate` คือจุดให้ตรวจต่อ ไม่ใช่ defect ที่ยืนยันแล้ว เช่น inject Facade ที่ถูกต้องยังอาจสร้าง candidate ได้ ชุดตัวอย่าง conformance ยังรอเจ้าของมาตรฐานทบทวน

## เลือกใช้รุ่นไหน

[Release 0.1.4](https://github.com/orchex006/agrimap-golden-lint-skills/releases/tag/v0.1.4) เพิ่ม C# parser และกฎชุดแรก ดู prerequisites และตัวอย่าง --dotnet ใน [Backend lint](docs/BACKEND-LINT.md) ต้องมี .NET 8 runtime ที่เชื่อถือได้อยู่แล้ว

[Release 0.1.3](https://github.com/orchex006/agrimap-golden-lint-skills/releases/tag/v0.1.3) รองรับ identity จาก installed plugin/extension manifests และมีรายงานรายไฟล์จาก template รวม Node runner, host adapters และ source dependency gates เลือก runtime ZIP สำหรับ Terminal หรือ hosts ZIP สำหรับติดตั้งสกิลตาม host การเผยแพร่ bundle ไม่ได้ยืนยัน native installation/activation ทุก host ดูผลตรวจใน [Installation](docs/INSTALLATION.md) และไฟล์แจกจ่ายใน [Versions](docs/VERSIONS.md)

## ขอบเขตที่ควรรู้

- `scan` อ่านไฟล์และส่งผลออก stdout; `explain` ใช้รายงานเดิม
- `export` เขียนไฟล์ใหม่ภายนอก roots; `save` เก็บชุดรายงานที่ได้รับอนุญาตเฉพาะ .agrimap-agent/reports/golden-lint โดย scan ยังอ่านอย่างเดียว
- ผลตรวจและข้อเสนอไม่อนุมัติให้แก้ product code, รัน SQL, ติดตั้ง dependency หรือ deploy
- Golden ยังมีเจ้าของอยู่ที่ `agrimap-agent-skills`; lint ไม่สร้างมาตรฐานอีกชุด

สำหรับรายละเอียด identity, baseline และการป้องกันการเขียนไฟล์ อ่าน [Runtime contract](skills/agrimap-golden-lint-skills/references/RUNTIME.md) ส่วนตัวอย่างรายงานอยู่ที่ [Examples](examples/README.md)

Repository: [orchex006/agrimap-golden-lint-skills](https://github.com/orchex006/agrimap-golden-lint-skills) · [Changelog](CHANGELOG.md)

## Release 0.1.5

เพิ่ม [Naming lint](docs/NAMING-LINT.md) แยก FE app/library, BE และ SQL พร้อม [รายงานและสมุดติดตามการแก้](docs/REPORTING.md) ใน .agrimap-agent/reports/golden-lint ใช้ Golden 5.0.2 ที่ผ่าน selected digest gates [Release 0.1.5](https://github.com/orchex006/agrimap-golden-lint-skills/releases/tag/v0.1.5) มี runtime/hosts ZIP และ SHA256SUMS การแจก bundle ไม่ได้ยืนยัน native activation ทุก host
