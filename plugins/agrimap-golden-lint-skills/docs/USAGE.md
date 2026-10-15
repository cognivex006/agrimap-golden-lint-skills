# คู่มือคำสั่ง

[หน้าหลัก](../README.md) · [เริ่มใช้งาน](GETTING-STARTED.md) · [ตัวอย่างพร้อมใช้](COMMAND-COOKBOOK.md)

เลือกคำสั่งตามงานที่ต้องการ มี 3 operation ใน Node runner:

| ต้องการ | คำสั่ง | ผลที่ได้ |
| --- | --- | --- |
| ตรวจไฟล์ในขอบเขตที่เลือก | `scan` | รายงาน JSON ทาง stdout |
| อธิบาย finding จากรายงานเดิม | `explain` | finding ที่ตรง report/finding identity |
| ส่งออกรายงานเดิม | `export` | ไฟล์ JSON หรือ Markdown ที่ปลายทางใหม่ |

ชื่อและ options อ้างจาก [operation registry](../config/operations.json) ทุก option ต้องมีค่า ไม่รองรับ `--fix`, `--strict`, install, update หรือ release ใน runner นี้

## scan — ตรวจโครงการ

เปิด Terminal ที่ root ของ lint package ใช้ `node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan` ตามด้วย options:

| Option | จำเป็น | ความหมาย |
| --- | --- | --- |
| `--root` | ใช่ | โฟลเดอร์โครงการหรือ portfolio ที่จะตรวจ |
| `--golden` | ใช่ | root ของ package `agrimap-agent-skills` |
| `--source-mode` | ใช่ | `checkout` หรือ `installed` |
| `--typescript` | เมื่อใช้ TypeScript syntax rules | path ของ parser ที่ตรง version/digest |
| `--dotnet` | เมื่อใช้ C# main-service rules | absolute path ของ existing trusted dotnet host; packaged Roslyn reader ใช้ .NET 8 runtime |
| `--baseline` | ไม่ | canonical report JSON ที่เก็บไว้ก่อนหน้า |
| `--base-ref` | ไม่ | Git commit ref สำหรับเปรียบเทียบ แทน `--baseline` |
| `--target-ref` | ไม่ | Git commit ref เป้าหมาย แทน working tree |

Path สัมพัทธ์อิง Terminal cwd; root/source ต้องมีอยู่จริง ค่าเริ่มต้นอ่าน working tree รวม untracked และ ignored files ที่ไม่อยู่ในกลุ่มยกเว้น ไม่มี staged-only mode ใช้ `--baseline` กับ `--base-ref` พร้อมกันไม่ได้

Git refs ต้อง resolve ได้จากเครื่องนี้ scanner อ่าน blobs ในหน่วยความจำ ไม่ fetch หรือเปลี่ยน index/refs/worktree รายละเอียดการระบุที่มาของผลตรวจอยู่ใน [Workflow](WORKFLOWS.md)

## explain — อ่าน finding เดิม

| Option | จำเป็น | ความหมาย |
| --- | --- | --- |
| `--report` | ใช่ | ไฟล์ envelope ที่มี canonical report และ protected roots |
| `--report-id` | ใช่ | `reportId` ของรายงานเดิม |
| `--finding-id` | ใช่ | `findingId` ที่ต้องการอธิบาย |

รายงานและ IDs ต้องผ่านการตรวจ identity ก่อน คำสั่งนี้ไม่ scan ใหม่ แม้ source ปัจจุบันจะเปลี่ยนแล้ว ดู [รูปแบบ envelope](../examples/README.md)

## export — เขียนไฟล์รายงาน

| Option | จำเป็น | ความหมาย |
| --- | --- | --- |
| `--report` | ใช่ | envelope ของรายงานเดิม |
| `--report-id` | ใช่ | ID ที่ตรงกับ payload |
| `--to` | ใช่ | absolute path ของไฟล์ใหม่ภายนอกทุก scanned/Golden root |
| `--authorize-output` | ใช่ | ยืนยัน path เดียวกับ `--to` ทุกตัวอักษร |
| `--format` | ไม่ | `json` หรือ `markdown`; ค่าเริ่มต้น `markdown` |

โฟลเดอร์แม่ต้องมีอยู่แล้ว ไม่เขียนทับไฟล์เดิมและไม่ยอมรับ path indirection ผู้เรียกต้องเก็บ protected roots ให้ครบจากการ scan เดิม การ redirect stdout ผ่าน shell ก็เป็นการเขียนไฟล์อีกแบบหนึ่งและต้องมีปลายทางที่อนุญาตเช่นกัน

## อ่าน exit code ให้ตรง

| Exit | ความหมาย | ทำอะไรต่อ |
| --- | --- | --- |
| `0` | ตรวจครบตาม coverage ที่ประกาศแล้ว อาจมี findings | อ่าน disposition และหลักฐาน |
| `2` | options, identity หรือ preflight ไม่ผ่าน | ตรวจคำสั่งและข้อมูลต้นทาง |
| `3` | ตรวจได้บางส่วน มีกฎ blocked/error หรือพบ input drift | อ่าน diagnostics และส่วนที่ยังขาด |

Findings ไม่ทำให้ scan fail CI โดยลำพัง แยกสถานะการทำงานของ scanner ออกจากข้อสรุปว่าโค้ดตรง Golden หรือไม่เสมอ รายละเอียดรูปแบบผลตรวจอยู่ใน [Runtime contract](../skills/agrimap-golden-lint-skills/references/RUNTIME.md)

Markdown export ใช้ [report template และคู่มือรายงาน](REPORTING.md) มีดัชนีไฟล์ รายละเอียดทุก finding, source/rule diagnostics และ checklist ไม่มีการตัดผลเหลือเฉพาะตัวอย่าง
