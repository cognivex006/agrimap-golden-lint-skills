# เวอร์ชันและแหล่งอ้างอิง

[หน้าหลัก](../README.md) · [เริ่มใช้งาน](GETTING-STARTED.md) · [ติดตั้งตาม host](INSTALLATION.md)

[รุ่นล่าสุด](https://github.com/cognivex006/agrimap-golden-lint-skills/releases/latest) · [Tags ทั้งหมด](https://github.com/cognivex006/agrimap-golden-lint-skills/tags)

เลขเวอร์ชันใน source ไม่ได้ยืนยันว่า GitHub release, host installation หรือ cache ของ session ปัจจุบันได้เนื้อหาชุดนั้นแล้ว ตรวจ `package.json` ใน bundle ที่ host โหลดจริงทุกครั้ง

## Identity แต่ละตัว

| Identity | ค่าปัจจุบัน | หมายเหตุ |
| --- | --- | --- |
| Lint package | `0.1.9` | `package.json` เป็นเจ้าของเลขนี้; npm package เป็น private |
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
| Release 0.1.9 / tag `v0.1.9` | รุ่นที่เผยแพร่บน repository นี้ พร้อมรายงาน Markdown, prompt แก้ไข และ review-update | runtime/hosts ZIP และ SHA256SUMS ของรุ่นเดียวกัน |
| GitHub source ZIP/tar หรือ clone | source รวมเอกสารผู้ดูแลและ tests | สำหรับพัฒนา package ไม่ใช่ runtime artifact |

Runtime ZIP ใช้กับ Node runner ผ่าน Terminal ส่วน hosts ZIP มี marketplace catalogs (Codex, Claude, Cursor), plugin bundles และ portable skill ไม่รวม maintainer files, tests, tools หรือ agent state ตรวจ checksum จาก release เดียวกันก่อนแตกลงโฟลเดอร์ว่าง

## ตรวจ source identity ของ Golden

`checkout` เก็บ active Git commit/tree และ selected content identity ส่วน `installed` เก็บ package/content identity จาก `package.json` หรือ plugin/extension manifests ที่รองรับ โดยไม่สมมติว่าเป็น Git checkout ทั้งสองแบบตรวจ exact reference bytes และไม่สลับแหล่งสำรองโดยเงียบ

| รายการใน source-lock.json | Commit |
| --- | --- |
| Reference ที่ระบุใน V002 | `3c314c7a8fdc7c35ca41b4b161cb43824ed893fb` |
| Checkout ที่ใช้ freeze selected references | `1243bdb98f862528e0b52e32d60bbd67686ee5cc` (refresh ใน 0.1.5) |

Active checkout อาจเป็น commit อื่นได้ตาม provenance ที่รายงาน hash ที่ตรงยืนยันเพียง reference bytes ไม่ได้พิสูจน์ว่า detector แปลกฎถูกครบ การเปลี่ยน trust lock เป็นงานผู้ดูแลที่ต้องตรวจ source; `npm run sync` ไม่ refresh lock หรือ installed host package ให้

## Compatibility ของ 0.1.9

- Report schema และ review schema ใช้รุ่น `1`
- Scanner version อยู่ใน analysis contract ให้สร้าง baseline ด้วย 0.1.9 เพื่อเปรียบเทียบแบบ comparable
- การยกข้อสรุปจาก `review.json` ใช้ Finding ID และยกข้อสรุปเดิมมาได้เมื่อ ID ตรงกัน
- Branch type/base ของ prompt อยู่ใน `assets/remediation.json` (`delivery`) ค่าเริ่มต้นคือ hotfix จาก develop
- Portable skill อยู่ที่ `plugins/agrimap-golden-lint-portable/skills/agm-lint` ใช้กับ Cursor และ Agent Skills hosts ได้
