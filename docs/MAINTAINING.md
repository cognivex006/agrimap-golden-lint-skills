# ดูแลและพัฒนา skill package

<!-- AGM-MAINTAINER-ONLY -->

[หน้าหลัก](../README.md) · [วิธีพัฒนา](../DEVELOPMENT.md) · [หลักฐานการตรวจ](IMPLEMENTATION.md)

หน้านี้สำหรับผู้ดูแล source ผู้ใช้ทั่วไปเริ่มจาก Getting Started และไม่ต้องรัน lifecycle commands เพื่อ scan

## แผนที่ source

| ตำแหน่ง | เจ้าของเนื้อหา / ผู้ใช้ต่อ |
| --- | --- |
| config/operations.json | operation grammar และ options; sync สร้าง SKILL/operations mirror |
| config/hosts.json | host identity, layout และ metadata ของ bundles |
| config/distribution.json | runtime allowlist; ใช้ตรวจการแจกจ่ายและ packaged links |
| skills/agrimap-golden-lint-skills/assets/rules.json | detector admission, Golden bindings และ per-rule sourceDependencies |
| assets/catalog.json ภายใต้ skill | สถานะทุก rule family; ใช้ใน coverage และ reports |
| assets/source-lock.json / parser-lock.json | trust ของ selected Golden references และ parser |
| scripts/scanner.mjs ภายใต้ skill | read-only scanner และ common source dependencies |
| scripts/agm-lint.mjs ภายใต้ skill | operation runner และ export writer ที่แยกจาก scan |
| schemas / references/RUNTIME.md | report fields, identity และ semantics |
| assets/report-template.md / docs/REPORTING.md | Canonical Markdown layout และ workflow รายงานรายไฟล์; renderer อยู่ scripts/contracts.mjs |
| references/RULE-MAPPING.md | การแปลกฎ ขอบเขต และหลักฐานที่ยังขาด |
| docs / examples | คู่มือผู้ใช้ ผู้ดูแล และตัวอย่างรายงาน |
| tools/sync.mjs / tools/host-adapters.mjs | ต้นฉบับ prose และโครงสร้าง generated adapters |
| plugins / adapters / marketplace manifests | generated outputs ไม่แก้โดยตรง |
| package.json | version authority ของ lint package |
| .agrimap-agent | local development state; ignore และไม่แจกจ่าย |

## แก้ไขและตรวจให้พอดี

**Terminal จาก root ของ package — เขียน generated files ใน source checkout:**

```powershell
npm run sync
npm run validate
```

sync สร้าง mirrors และ host payloads จาก canonical inputs ไม่ refresh Golden trust locks ไม่เปลี่ยน product/upstream และไม่ติดตั้ง host ให้ validate ตรวจ links, grammar, schemas, coverage consistency, pinned dependencies และ generated mirrors

| งานที่เปลี่ยน | ตรวจอะไร |
| --- | --- |
| เอกสาร | อ่าน prose, links, command examples, runtime packaging และ mirrors |
| ตัวอย่างคำสั่ง / generator prose | รัน documentation และ host packaging fixtures ที่เกี่ยวข้อง |
| Runtime/rule/safety | รัน regression และ adversarial tests ตาม contract |
| เปลี่ยนหลายส่วนของ package | รัน npm test ตาม DEVELOPMENT ก่อนปิดงาน |

**Terminal — ทดสอบด้วย parser ที่มีอยู่แล้วและตรง digest:**

```powershell
$env:AGM_LINT_TYPESCRIPT = '<absolute-trusted-typescript.js>'
npm test
```

AGM_LINT_GOLDEN เลือก fixture source ได้; ค่าเริ่มต้นคือ sibling agrimap-agent-skills การตั้งค่า test ไม่เท่ากับติดตั้ง dependency Missing parser ทำให้ syntax tests skipped และต้องรายงานตามจริง

## ทบทวน conformance cases

`tests/fixtures/conformance/fe-cases.json` มี 19 synthetic T6/R1/R3 cases แยก proposed Golden outcome จาก expected scanner disposition สถานะยัง pending-owner-review

ให้เจ้าของมาตรฐานทบทวน outcomes แล้วเพิ่ม sanitized real cases พร้อม provenance และ exact exception scope ก่อนสรุป product precision/recall การผ่าน tests อย่างเดียวไม่ทำให้ case เป็น owner-confirmed และจำนวน candidates ไม่เท่ากับจำนวน defects

## เตรียมแจกจ่าย

ตรวจ allowlist, generated self-contained links และ instruction leakage Runtime ไม่รวม AGENTS, DEVELOPMENT, source-only maintainer guides, tests, tools หรือ agent state Source archive ที่ GitHub สร้างอัตโนมัติเป็นคนละรูปแบบกับ runtime artifact

Version bump, commit/push, tag, publication และการติดตั้ง profile จริงต้องมีคำสั่งที่อนุมัติการกระทำนั้น เก็บหลักฐาน host-native validation แยกจาก actual install/activation ดู [Installation](INSTALLATION.md) และ [Versions](VERSIONS.md)

## ก่อนส่งงาน

อัปเดต docs ที่เกี่ยวข้องและ Unreleased หนึ่งรายการที่มีสาระ ตรวจ diff และ `.agrimap-agent` ไม่ถูก track สรุป changes, checks, limitations และ repository actions ให้ผู้ใช้เห็นข้อเท็จจริงตรงกัน รายละเอียด editorial contract อยู่ใน DEVELOPMENT

Identity tests ครอบคลุม installed manifests ที่ไม่มี root package.json, metadata conflicts/malformed inputs, versionless plugin และ source drift ส่วน reporting tests ตรวจ every finding, partial/empty diagnostics, Git context และ Markdown escaping ไม่ถือว่าการเพิ่มรายงานเพิ่ม coverage ของ detector

## Build C# reader แบบ offline

สำหรับ maintainer ที่ได้รับมอบหมายเท่านั้น ใช้ dotnet host และ Roslyn directory ที่มีอยู่และผ่านการตรวจแล้ว คำสั่งนี้ build package-owned helper, เขียน runtime bundle และอัปเดตเฉพาะ parser lock ของ helper ไม่แตะ Golden source lock หรือ product:

```powershell
node tools/build-csharp.mjs --dotnet '<absolute-dotnet-host>' --roslyn '<inspected-Roslyn-bincore-directory>'
```

Tool ปฏิเสธ Roslyn DLL bytes ที่ต่างจาก dependency lock เดิม Build ใช้ local reference assemblies และ NuGet.Config ที่ไม่มี package sources ไม่โหลด parent Directory.Build props/targets Intermediate output อยู่ใน ignored .agrimap-agent/runtime และไม่แจกจ่าย Source-file digests อยู่ใน parser lock ด้วย validate จะปฏิเสธ source ที่เปลี่ยนโดยยังไม่ rebuild reader อย่าเรียก build จาก scan

หลัง build ใช้ sync/validate และตั้ง AGM_LINT_DOTNET เป็น existing trusted absolute host คู่กับ AGM_LINT_TYPESCRIPT ก่อน npm test Runtime mirrors รองรับ DLL bytes โดยตรงและ hash validation ตรวจว่าตรงต้นฉบับ ไม่ decode DLL เป็น UTF-8
