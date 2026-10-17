# เริ่มใช้งาน AgriMap Golden Lint

[หน้าหลัก](../README.md) · [ติดตั้งตาม host](INSTALLATION.md) · [แก้ปัญหา](TROUBLESHOOTING.md)

หน้านี้พาตรวจหนึ่งโครงการจนได้รายงานใน `.agrimap-agent` และ prompt แก้ไขชุดแรก ใช้เวลาประมาณ 10 นาทีเมื่อมี prerequisites ครบ

## 1. เตรียมสิ่งที่ต้องมี

| สิ่งที่ต้องมี | ใช้ทำอะไร | ตรวจอย่างไร |
| --- | --- | --- |
| Node 22 ขึ้นไป | รัน runner | `node --version` |
| Host ที่ติดตั้งสกิล agm-lint | สั่งงานผ่านช่องสนทนา | ดู [Installation](INSTALLATION.md) |
| agrimap-agent-skills 5.0.2 | แหล่ง Golden; ไฟล์อ้างอิงที่เลือกต้องตรง source lock | ติดตั้งใน host เดียวกัน หรือมี Git checkout |
| .NET 8 runtime ที่มีอยู่แล้ว | ใช้กับกฎ C# ผ่าน `--dotnet` | `dotnet --list-runtimes` มี `Microsoft.NETCore.App 8.*` |
| TypeScript 5.9.3 ที่มีอยู่แล้ว | ใช้กับกฎ TypeScript ผ่าน `--typescript` | `node_modules/typescript/lib/typescript.js` ของโครงการ FE |

ส่งเฉพาะ parser ที่ขอบเขตต้องใช้ โครงการ backend อย่างเดียวไม่ต้องมี TypeScript และไม่ต้องมี package.json การ scan ไม่ติดตั้งหรือซ่อม prerequisites ให้ ถ้าขาด กฎที่เกี่ยวข้องจะเป็น `blocked` พร้อม diagnostic

### เลือก source mode ของ Golden

| Mode | ใช้เมื่อ | Root ที่ส่งใน `--golden` |
| --- | --- | --- |
| `installed` | ใช้ agrimap-agent-skills ที่ host ติดตั้งไว้ | directory ของ plugin ที่มี `skills/agrimap-agent-skills/` และ manifest เช่น `.codex-plugin/plugin.json` |
| `checkout` | ใช้ Git checkout ของ agrimap-agent-skills | root ของ repository ที่มี `package.json` |

Agent จะใช้ path ที่ผู้ใช้ระบุก่อน ถ้าไม่ระบุจะใช้ agrimap-agent-skills ที่ host โหลดอยู่ และบอกในสรุปว่าใช้แหล่งใด

## 2. ตรวจผ่านช่องสนทนา Agent

เปิด session ใหม่หลังติดตั้ง แล้วพิมพ์ **ในช่องสนทนา Agent** (ใช้ชื่อเรียกของ host ตาม [Installation](INSTALLATION.md)):

```text
$agm-lint ตรวจโครงการ D:\work\agmws-sample-netcore เทียบ Golden แล้วบันทึกรายงานใน .agrimap-agent ยังไม่แก้โค้ด
```

Agent จะรัน operation `report` ซึ่ง scan แบบอ่านอย่างเดียว บันทึกชุดรายงานใหม่ แล้ววางสรุปที่มีหัวตารางครบ เช่น

```text
## ผลตรวจ AgriMap Golden — agmws-sample-netcore

สถานะ completed · พบ 308 จุดใน 50 ไฟล์ · เลือกตรวจ 141 จาก 165 inventory records ...

| กฎ      | สิ่งที่ตรวจ                          | จุด | ไฟล์ | ความเสี่ยงแก้ |
| NULL-03 | ใช้ is null / is not null แทน == null |  50 |   16 | ต่ำ          |
| ...
```

ตามด้วยไฟล์ที่พบมากที่สุด prompt ที่ควรเริ่ม และ path ของ `report.md`

## 3. ตรวจผ่าน Terminal

เปิด **PowerShell ที่ root ของ lint package** (source checkout หรือ runtime ZIP ที่แตกแล้ว)

**PowerShell — authorized report write: บันทึกชุดรายงานใน .agrimap-agent ของโครงการ**

```powershell
$dotnet = (Get-Command dotnet).Source
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs report --root 'D:\work\agmws-sample-netcore' --golden '<golden-package-root>' --source-mode installed --dotnet $dotnet --authorize-output 'D:\work\agmws-sample-netcore\.agrimap-agent\reports\golden-lint'
```

`--authorize-output` ต้องเป็น `<root>/.agrimap-agent/reports/golden-lint` ของโครงการเดียวกันเท่านั้น คำสั่งจะสร้าง directory ใหม่ชื่อ report ID และไม่เขียนทับชุดเดิม

ถ้าห้ามเขียนไฟล์ใด ๆ ให้ใช้แบบอ่านอย่างเดียว ผลเป็นสรุปเดียวกันแต่ไม่มีชุดรายงาน:

**PowerShell — อ่านอย่างเดียว:**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan --root 'D:\work\agmws-sample-netcore' --golden '<golden-package-root>' --source-mode installed --dotnet $dotnet --format summary
```

## 4. อ่านผลครั้งแรก

| ดูอะไร | ความหมาย |
| --- | --- |
| สถานะ `completed` / `partial` | completed = ทุกกฎที่เกี่ยวข้องรันครบ; partial = มีกฎ blocked/error ต้องอ่าน diagnostics ก่อน |
| ตารางรายกฎ | จำนวนจุดและไฟล์ต่อกฎ เรียงจากความเสี่ยงในการแก้ต่ำไปสูง |
| ไฟล์ที่พบมากที่สุด | จุดเริ่มต้นที่ได้ผลมากที่สุด; รายการครบอยู่ใน report.md |
| Prompt สำหรับแก้ไข | อยู่ในการ์ดของแต่ละกฎใน report.md คัดลอกไปให้ `agm-be`/`agm-fe`/`agm-sql` ทีละชุด |

Exit code ของ runner: `0` ตรวจครบ (แม้มี findings), `3` ตรวจได้บางส่วน, `2` คำสั่งหรือ prerequisite ไม่ผ่าน ผลว่างไม่ได้แปลว่าผ่าน Golden ทุกข้อ เพราะบางกลุ่มกฎยังเป็น review-only หรือ not-implemented

## ทำอะไรต่อ

- แก้ตาม prompt และตรวจซ้ำพร้อม baseline: [Workflows](WORKFLOWS.md)
- เข้าใจโครงสร้าง report.md และไฟล์ในชุดรายงาน: [Reporting](REPORTING.md)
- เตรียม .NET และอ่านข้อจำกัดของกฎ C#: [Backend lint](BACKEND-LINT.md)
- ใช้ runtime ZIP: ตรวจ SHA-256 ตาม [Versions](VERSIONS.md) ก่อนแตกลงโฟลเดอร์ว่าง แล้วรันคำสั่งเดียวกันจาก root ที่แตกไฟล์ ไม่ต้องรัน `npm run sync`
