# คู่มือคำสั่ง

[หน้าหลัก](../README.md) · [เริ่มใช้งาน](GETTING-STARTED.md) · [ชุดคำสั่งพร้อมใช้](COMMAND-COOKBOOK.md)

Runner คือ `skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs` มี 7 operations ชื่อและ options มาจาก [operation registry](../config/operations.json) ทุก option ต้องมีค่า ไม่มี `--fix`, `--strict`, install หรือ release

| ต้องการ | Operation | เขียนไฟล์ | ผลที่ได้ |
| --- | --- | --- | --- |
| ตรวจและเก็บรายงาน (แนะนำ) | `report` | ชุดรายงานใหม่ใน `.agrimap-agent/reports/golden-lint/` | สรุป Markdown ทาง stdout + ชุดรายงาน |
| ตรวจแบบอ่านอย่างเดียว | `scan` | ไม่เขียน | JSON หรือสรุป Markdown ทาง stdout |
| อธิบาย finding เดิม | `explain` | ไม่เขียน | finding ที่ตรง report/finding ID |
| ตรวจบันทึกทบทวน | `review-check` | ไม่เขียน | ผลตรวจ review.json |
| อัปเดตรายงานตามข้อสรุป | `review-update` | report.md, review.md, summary.md ของชุดนั้น | JSON สถานะทบทวน |
| ส่งออกรายงานเดิม | `export` | ไฟล์ใหม่ภายนอกทุก root | Markdown หรือ JSON |
| เก็บรายงานเดิมเป็นชุด | `save` | ชุดรายงานใหม่ตาม report ID ที่ระบุ | JSON ผลการบันทึก |

## report — ตรวจและบันทึกรายงาน

ใช้ options ชุดเดียวกับ scan บวก `--authorize-output`:

| Option | จำเป็น | ความหมาย |
| --- | --- | --- |
| `--root` | ใช่ | โฟลเดอร์โครงการหรือ portfolio ที่จะตรวจ |
| `--golden` | ใช่ | root ของ agrimap-agent-skills (ดู [source mode](GETTING-STARTED.md)) |
| `--source-mode` | ใช่ | `installed` หรือ `checkout` |
| `--authorize-output` | ใช่ | ต้องเป็น `<root>/.agrimap-agent/reports/golden-lint` ของ root เดียวกัน |
| `--dotnet` | เมื่อมี C# | absolute path ของ dotnet ที่มีอยู่แล้ว ต้องมี .NET 8 runtime |
| `--typescript` | เมื่อมี TypeScript | path ของ `lib/typescript.js` 5.9.3 ที่ตรง digest |
| `--baseline` | ไม่ | report.json ของรอบก่อน เพื่อแยก finding เดิม/ใหม่ และยกข้อสรุปจาก review.json ข้าง ๆ มาตาม Finding ID |
| `--base-ref` / `--target-ref` | ไม่ | Git refs สำหรับเทียบ committed snapshots แทน working tree |
| `--format` | ไม่ | `markdown` (ค่าเริ่มต้น) หรือ `json` สำหรับ automation |

ผลลัพธ์:

- ชุดรายงานใหม่ `<root>/.agrimap-agent/reports/golden-lint/<report-id>/` ดูไฟล์ทั้งหมดใน [Reporting](REPORTING.md)
- `index.md` ใน `golden-lint/` สร้างใหม่ทุกครั้ง และ `.gitignore` (`*`) ถ้ายังไม่มี
- stdout เป็นสรุป Markdown เดียวกับ `summary.md` ตามด้วย path ของชุดรายงาน

ถ้า report ID ซ้ำกับชุดที่มีอยู่และเนื้อหาตรงกันทุก byte จะใช้ชุดเดิม (`existing`) ไม่สร้างซ้ำ ถ้าไม่ตรงกันจะหยุดด้วย `OUTPUT_UNSAFE_OR_EXISTS` ครั้งแรกที่สร้าง `.agrimap-agent` ในโครงการ inventory จะเพิ่ม boundary record หนึ่งรายการ report ID ของรอบถัดไปจึงต่างจากรอบแรกแม้โค้ดไม่เปลี่ยน

## scan — ตรวจแบบอ่านอย่างเดียว

Options เหมือน report แต่ไม่มี `--authorize-output` และ `--format` รับ `json` (ค่าเริ่มต้น, canonical report) หรือ `summary` (สรุป Markdown โดยไม่เขียนไฟล์)

ค่าเริ่มต้นอ่าน working tree รวม untracked และ ignored files ที่ไม่อยู่ในกลุ่มยกเว้น ไม่มี staged-only mode ใช้ `--baseline` กับ `--base-ref` พร้อมกันไม่ได้ `--target-ref` อ่าน committed blobs ในหน่วยความจำ ไม่ fetch และไม่เปลี่ยน index/refs/worktree Path สัมพัทธ์อิง cwd ของ Terminal

การ redirect stdout ไปไฟล์เป็นการเขียนไฟล์แยกจาก runner ที่ผู้เรียกต้องรับผิดชอบเอง ใช้ `report` แทนเมื่อต้องการเก็บผล

## explain — อ่าน finding เดิม

| Option | ความหมาย |
| --- | --- |
| `--report` | `envelope.json` ของชุดรายงาน |
| `--report-id` | report ID ของชุดนั้น |
| `--finding-id` | Finding ID จาก report.md |

ไม่ scan ใหม่ แม้ source ปัจจุบันเปลี่ยนแล้ว Envelope และ IDs ต้องผ่านการตรวจ identity ก่อน

## export — ส่งออกไฟล์ใหม่

| Option | ความหมาย |
| --- | --- |
| `--report` / `--report-id` | envelope และ report ID ของรายงานเดิม |
| `--to` | absolute path ของไฟล์ใหม่ภายนอกทุก scanned/Golden root |
| `--authorize-output` | path เดียวกับ `--to` ทุกตัวอักษร |
| `--format` | `markdown` (ค่าเริ่มต้น) หรือ `json` |
| `--review` | review.json เพื่อแนบผลทบทวน (เฉพาะ markdown) |

โฟลเดอร์แม่ต้องมีอยู่แล้ว ไม่เขียนทับไฟล์เดิม และปฏิเสธ path ที่ผ่าน junction/symlink

## review-update — อัปเดตรายงานตามข้อสรุป

| Option | ความหมาย |
| --- | --- |
| `--report` / `--report-id` | envelope.json และ report ID ของชุดรายงาน |
| `--review` | review.json **ของชุดรายงานนั้น** ที่บันทึกข้อสรุปแล้ว |
| `--authorize-output` | absolute path ของ directory ชุดรายงาน (`<root>/.agrimap-agent/reports/golden-lint/<report-id>`) |

เขียนใหม่เฉพาะ report.md, review.md, summary.md และ index.md ผ่าน temp file ไม่แตะ report.json, envelope.json หรือ review.json ปฏิเสธเมื่อ review ที่ส่งมาไม่ตรงกับ review.json ในชุด (`REVIEW_NOT_IN_BUNDLE`) หรือชุดรายงานไม่ตรงกับ envelope (`REPORT_BUNDLE_MISMATCH`)

## save และ review-check

`save` สร้างชุดรายงานจาก envelope ที่มีอยู่แล้ว โดย `--authorize-output` ต้องเป็น `<workspace>/.agrimap-agent/reports/golden-lint/<report-id>` ตรงทุกตัวอักษร ใช้เมื่อมีรายงานจาก `scan` อยู่แล้ว กรณีทั่วไปให้ใช้ `report`

`review-check` ตรวจ review.json เทียบ report: Finding IDs, status, reviewer/reason/evidence และข้อความอ่อนไหว ไม่แก้ผลของ scanner ดูขั้นตอนใน [Reporting](REPORTING.md)

## Exit code

| Exit | ความหมาย | ทำอะไรต่อ |
| --- | --- | --- |
| `0` | ทำงานครบตามความสามารถที่ประกาศ อาจมี findings | อ่านผลและ prompt |
| `2` | options, identity, authorization หรือ preflight ไม่ผ่าน | อ่าน `diagnostic` ใน JSON ที่ stdout และดู [Troubleshooting](TROUBLESHOOTING.md) |
| `3` | ตรวจได้บางส่วน มีกฎ blocked/error หรือ input drift | อ่าน diagnostics ก่อนสรุป; report ยังบันทึกชุดรายงานให้ |

Findings ไม่ทำให้ exit code เปลี่ยน แยกสถานะการทำงานของ runner ออกจากข้อสรุปว่าโค้ดตรง Golden หรือไม่เสมอ รายละเอียด contract อยู่ใน [Runtime contract](../skills/agrimap-golden-lint-skills/references/RUNTIME.md)
