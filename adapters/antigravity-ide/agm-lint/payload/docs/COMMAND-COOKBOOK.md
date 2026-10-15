# ชุดคำสั่งสำหรับงานจริง

[หน้าหลัก](../README.md) · [คู่มือคำสั่ง](USAGE.md) · [แก้ปัญหา](TROUBLESHOOTING.md)

เลือกตัวอย่างให้ตรงงาน แทน `<...>` ด้วยค่าจริง ก่อนใช้ต้องมี [prerequisites](GETTING-STARTED.md) ครบ ตัวอย่างในเอกสารไม่ใช่คำสั่งให้ Agent ติดตั้งหรือแก้โค้ดทันที

## พิมพ์ในช่องสนทนา Agent

ใช้เมื่อ host โหลด [adapter](INSTALLATION.md) แล้ว ตัวอย่างนี้ใช้รูปแบบ Codex `$agm-lint`; Claude ใช้ `/agrimap-golden-lint-skills:agm-lint` ส่วน host อื่นใช้ชื่อที่ host แสดง

| ต้องการ | โจทย์ตัวอย่าง |
| --- | --- |
| ตรวจหนึ่งโครงการ | `$agm-lint ตรวจ <product-root> โดยใช้ Golden <golden-package-root>, mode checkout และ parser <trusted-typescript.js> สรุป scope, findings และข้อจำกัด ยังไม่แก้โค้ด` |
| อธิบาย finding | `$agm-lint อธิบาย <finding-id> จากรายงาน <report-id> ที่เก็บไว้ อ้าง exact Golden entry และบอกหลักฐานที่ยังขาด` |
| แยกงานเก่ากับงานนี้ | `$agm-lint ตรวจ <product-root> เทียบกับ baseline ที่ระบุ คงผลปัจจุบันไว้ครบและแยก origin ตามหลักฐาน` |
| เตรียมข้อเสนอให้เจ้าของโค้ด | `$agm-lint จากรายงานเดิม สรุป consumers, impact, manageability และสิ่งที่ต้องพิสูจน์ก่อนแก้` |
| ส่งออกรายงาน | `$agm-lint ส่งออกรายงาน <report-id> ไปยังไฟล์ใหม่ <absolute-external-path> โดยอนุญาตเขียนเฉพาะปลายทางนี้` |

Host ต้องเก็บรายงานและ IDs เดิมให้ใช้อ้างอิงได้ การเรียก explain/export ไม่ scan เพิ่ม การใช้ชื่อสกิลในเอกสารไม่ได้ยืนยันว่า host นั้นผ่าน end-to-end activation test แล้ว

## ตรวจครั้งแรกผ่าน Terminal

เปิด **PowerShell ที่ root ของ lint package** คำสั่งนี้อ่านอย่างเดียวและส่ง JSON ออก stdout:

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan --root '<product-root>' --golden '<golden-package-root>' --source-mode checkout --typescript '<trusted-typescript.js>'
```

สิ่งที่ควรได้: reportId, coverage, per-rule status และ findings ถ้า source/parser ไม่พร้อมให้อ่าน diagnostics ก่อน ไม่รัน product npm scripts เพื่อซ่อมระหว่าง scan

## ใช้แหล่ง Golden ที่ติดตั้งแล้วและ baseline เดิม

**PowerShell — อ่านอย่างเดียว:**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan --root '<product-root>' --golden '<golden-package-root>' --source-mode installed --typescript '<trusted-typescript.js>' --baseline '<canonical-baseline.json>'
```

Baseline ต้องเป็น canonical report JSON ที่เข้ากันได้ ผลปัจจุบันคงครบพร้อม comparable/not-comparable และ origin ตามหลักฐาน

## เปรียบเทียบ committed snapshots

**PowerShell — อ่านอย่างเดียว:**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan --root '<product-root>' --golden '<golden-package-root>' --source-mode checkout --typescript '<trusted-typescript.js>' --base-ref '<base-ref>' --target-ref '<target-ref>'
```

Refs ต้องมีในเครื่องแล้ว จะได้ commit/tree identity ของ snapshots ไม่รวม untracked/working changes ของเป้าหมาย `--target-ref` การ rename หรือ unmatched finding ในไฟล์ที่เปลี่ยนยังอาจเป็น unknown

## อธิบาย finding เดิม

**PowerShell — อ่านอย่างเดียว:**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs explain --report '<envelope.json>' --report-id '<report-id>' --finding-id '<finding-id>'
```

ใช้ [envelope](../examples/README.md) และ IDs จากผลเดิม หาก ID ไม่ตรงจะหยุดโดยไม่ scan ใหม่

## ส่งออก Markdown

**PowerShell — เขียนไฟล์ใหม่ภายนอกที่อนุญาต (authorized external write):**

```powershell
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs export --report '<envelope.json>' --report-id '<report-id>' --to '<absolute-new-external-report.md>' --authorize-output '<absolute-new-external-report.md>' --format markdown
```

ปลายทางต้องอยู่นอกทุก scanned/Golden root มีโฟลเดอร์แม่แล้ว และยังไม่มีไฟล์ชื่อนั้น หากต้องการ JSON เปลี่ยน `--format` เป็น `json` ไม่เปลี่ยน ID หรือ protected roots เพื่อเลี่ยงการตรวจ
