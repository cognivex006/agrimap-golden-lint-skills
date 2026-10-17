# เวอร์ชันและแหล่งอ้างอิง

[หน้าหลัก](../README.md) · [เริ่มใช้งาน](GETTING-STARTED.md) · [ติดตั้งตาม host](INSTALLATION.md)

[รุ่นล่าสุด](https://github.com/orchex006/agrimap-golden-lint-skills/releases/latest) · [Tags ทั้งหมด](https://github.com/orchex006/agrimap-golden-lint-skills/tags)

เลขเวอร์ชันใน source ไม่ได้ยืนยันว่า GitHub release, host installation หรือ cache ของ session ปัจจุบันได้เนื้อหาชุดนั้นแล้ว ตรวจ `package.json` ใน bundle ที่ host โหลดจริงทุกครั้ง

## Identity แต่ละตัว

| Identity | ค่าปัจจุบัน | หมายเหตุ |
| --- | --- | --- |
| Lint package | `0.1.6` | `package.json` เป็นเจ้าของเลขนี้; npm package เป็น private |
| Golden source | agrimap-agent-skills `5.0.2` | selected reference digests ต้องตรง `source-lock.json` |
| C# reader | Roslyn `4.11.0.0`, reader protocol `2`, .NET 8 runtime | ตรวจ SHA-256 ทุกไฟล์ตาม `csharp-parser-lock.json` |
| TypeScript parser | `5.9.3` | exact digest ของ `lib/typescript.js` |
| Report schema | `1` | แยกจาก package และ Golden version |
| Review schema | `1` | ผลทบทวนของคน แยกจาก canonical report |
| Specification | V002 | ข้อกำหนด ไม่ใช่เลข release |
| Node | 22 ขึ้นไป | ตรวจบน Windows / Node 26.7.0 |

## เลือกไฟล์ให้ตรงงาน

| แหล่ง | สิ่งที่มี | ใช้อย่างไร |
| --- | --- | --- |
| Release 0.1.6 / tag `v0.1.6` | operation `report`, รายงาน Markdown พร้อม prompt แก้ไข, implicit usings ของ C#, Cursor plugin | เลือก runtime/hosts ZIP และ SHA256SUMS ของรุ่นเดียวกันเมื่อเผยแพร่แล้ว |
| Release 0.1.5 / tag `v0.1.5` | Golden 5.0.2 naming FE/BE/SQL และ save/review workflow | runtime/hosts ZIP และ SHA256SUMS รุ่น 0.1.5 |
| Release 0.1.4 / tag `v0.1.4` | Roslyn C# rules ชุดแรกและ trusted reader bundle | ต้องมี .NET 8 runtime และ `--dotnet` |
| Release 0.1.3 / tag `v0.1.3` | installed identity manifests และรายงานรายไฟล์ | runtime/hosts ZIP รุ่น 0.1.3 |
| Release 0.1.2 / tag `v0.1.2` | host adapters ชุดแรกและ source gates | runtime หรือ hosts ZIP รุ่น 0.1.2 |
| Release 0.1.1 / tag `v0.1.1` | Node runner อย่างเดียว | runtime ZIP 28 ไฟล์ |
| GitHub source ZIP/tar หรือ clone | source รวมเอกสารผู้ดูแลและ tests | สำหรับพัฒนา package ไม่ใช่ runtime artifact |

Runtime ZIP ใช้กับ Node runner ผ่าน Terminal ส่วน hosts ZIP มี marketplace catalogs (Codex, Claude, Cursor), plugin bundles และ portable skill ไม่รวม maintainer files, tests, tools หรือ agent state ตรวจ checksum จาก release เดียวกันก่อนแตกลงโฟลเดอร์ว่าง

Runtime ZIP รุ่น 0.1.1 (`agrimap-golden-lint-skills-0.1.1-runtime.zip`) มี SHA-256:

```text
d502bd27cab4342e92ea39c4b2a3faf4b2e5ced74e6d40f95b75697c85f6ee15
```

## ตรวจ source identity ของ Golden

`checkout` เก็บ active Git commit/tree และ selected content identity ส่วน `installed` เก็บ package/content identity จาก `package.json` หรือ plugin/extension manifests ที่รองรับ โดยไม่สมมติว่าเป็น Git checkout ทั้งสองแบบตรวจ exact reference bytes และไม่สลับแหล่งสำรองโดยเงียบ

| รายการใน source-lock.json | Commit |
| --- | --- |
| Reference ที่ระบุใน V002 | `3c314c7a8fdc7c35ca41b4b161cb43824ed893fb` |
| Checkout ที่ใช้ freeze selected references | `1243bdb98f862528e0b52e32d60bbd67686ee5cc` (refresh ใน 0.1.5) |

Active checkout อาจเป็น commit อื่นได้ตาม provenance ที่รายงาน hash ที่ตรงยืนยันเพียง reference bytes ไม่ได้พิสูจน์ว่า detector แปลกฎถูกครบ การเปลี่ยน trust lock เป็นงานผู้ดูแลที่ต้องตรวจ source; `npm run sync` ไม่ refresh lock หรือ installed host package ให้

## Compatibility ของ 0.1.6

- Report schema ยังเป็น 1 อ่านรายงานเก่าได้ snapshot เพิ่ม `csharpProjects` และ inventory มี digest ของ `.csproj` แบบ optional
- Finding IDs ของ detector เดิมไม่เปลี่ยน คอลัมน์ของ NULL-02 เปลี่ยนไปชี้ที่ตัว `!` ส่วน ASYNC-02/ASYNC-03 อาจพบจุดเพิ่มในโครงการที่เปิด ImplicitUsings
- Analysis contract ต่างจาก 0.1.5 (scanner, C# reader protocol 2 และ compiler context) baseline ของ 0.1.5 จึงเป็น `not-comparable` ให้สร้าง baseline ใหม่ด้วย 0.1.6 ก่อนเริ่มแก้
- การเปลี่ยนรูปแบบ report.md ไม่มีผลต่อ analysis contract อีกต่อไป เพราะ renderer แยกออกจากโค้ดวิเคราะห์
- Portable skill ย้ายจาก `adapters/antigravity-ide/agm-lint` เป็น `plugins/agrimap-golden-lint-portable/skills/agm-lint` คำสั่ง `install-host.mjs antigravity-ide` ยังใช้ได้เหมือนเดิม
