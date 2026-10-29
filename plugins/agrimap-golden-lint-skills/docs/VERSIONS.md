# เวอร์ชันและแหล่งอ้างอิง

[หน้าหลัก](../README.md) · [เริ่มใช้งาน](GETTING-STARTED.md) · [ติดตั้งตาม host](INSTALLATION.md)

[รุ่นล่าสุด](https://github.com/cognivex006/agrimap-golden-lint-skills/releases/latest) · [Tags ทั้งหมด](https://github.com/cognivex006/agrimap-golden-lint-skills/tags)

เลขเวอร์ชันใน source ไม่ได้ยืนยันว่า GitHub release, host installation หรือ cache ของ session ปัจจุบันได้เนื้อหาชุดนั้นแล้ว ตรวจ `package.json` ใน bundle ที่ host โหลดจริงทุกครั้ง

## Identity แต่ละตัว

| Identity | ค่าปัจจุบัน | หมายเหตุ |
| --- | --- | --- |
| Lint package | `0.1.14` | `package.json` เป็นเจ้าของเลขนี้; npm package เป็น private |
| Golden source | agrimap-agent-skills `5.0.7` | selected reference digests ต้องตรง `source-lock.json`; QUALITY-04 และ sonarqube-remediation.md เริ่มมีใน 5.0.4, QUALITY-05 advisory smells ใน 5.0.5, review ของ NS-01/ADV-01 ใน 5.0.6, ADV-08/09 ใน 5.0.7 |
| C# reader | Roslyn `4.11.0.0`, reader protocol `2`, .NET 8 runtime | ตรวจ SHA-256 ทุกไฟล์ตาม `csharp-parser-lock.json` |
| TypeScript parser | `5.9.3` | exact digest ของ `lib/typescript.js` |
| Report schema | `1` | แยกจาก package และ Golden version |
| Review schema | `1` | ผลทบทวนของคน แยกจาก canonical report |
| Specification | V002 | ข้อกำหนด ไม่ใช่เลข release |
| Node | 22 ขึ้นไป | ตรวจบน Windows / Node 26.7.0 |

## เลือกไฟล์ให้ตรงงาน

| แหล่ง | สิ่งที่มี | ใช้อย่างไร |
| --- | --- | --- |
| Release 0.1.14 / tag `v0.1.14` | รุ่นที่เผยแพร่บน repository นี้ เพิ่ม advisory ADV-08/09 ผูก Golden 5.0.7 | runtime/hosts ZIP และ SHA256SUMS ของรุ่นเดียวกัน |
| GitHub source ZIP/tar หรือ clone | source รวมเอกสารผู้ดูแลและ tests | สำหรับพัฒนา package ไม่ใช่ runtime artifact |

Runtime ZIP ใช้กับ Node runner ผ่าน Terminal ส่วน hosts ZIP มี marketplace catalogs (Codex, Claude, Cursor), plugin bundles และ portable skill ไม่รวม maintainer files, tests, tools หรือ agent state ตรวจ checksum จาก release เดียวกันก่อนแตกลงโฟลเดอร์ว่าง

Tags `v0.1.1`–`v0.1.9` เผยแพร่ใหม่เพื่อแก้ชื่อเจ้าของ repository เป็น `cognivex006` โดยคงเลขรุ่นและ scanner ของแต่ละรุ่น Commit ของ tags และ checksum ของ release assets เปลี่ยนจากชุดเดิม ให้ดาวน์โหลดพร้อม SHA256SUMS ชุดใหม่

## ตรวจ source identity ของ Golden

`checkout` เก็บ active Git commit/tree และ selected content identity ส่วน `installed` เก็บ package/content identity จาก `package.json` หรือ plugin/extension manifests ที่รองรับ โดยไม่สมมติว่าเป็น Git checkout ทั้งสองแบบตรวจ exact reference bytes และไม่สลับแหล่งสำรองโดยเงียบ

| รายการใน source-lock.json | Commit |
| --- | --- |
| Reference ที่ระบุใน V002 | `3c314c7a8fdc7c35ca41b4b161cb43824ed893fb` |
| Checkout ที่ใช้ freeze selected references | `d310a34bcd87f5011b7c3706b655ae1303841dd7` (main ของ 5.0.7 ตั้งแต่ 0.1.14; ก่อนหน้า `fc6ba8b` ใน 0.1.13, `7085fc5` ใน 0.1.12 และ `1243bdb` ตั้งแต่ 0.1.5) |

Golden 5.0.6 หรือเก่ากว่ามี sonarqube-remediation.md (และรุ่นก่อน 5.0.6 รวม csharp.md, backend checklists และ skill-routing) ไม่ตรง lock นี้ กฎ backend จึงเป็น blocked พร้อม `SOURCE_MISSING_OR_DRIFT` ให้ใช้ Golden 5.0.7

Active checkout อาจเป็น commit อื่นได้ตาม provenance ที่รายงาน hash ที่ตรงยืนยันเพียง reference bytes ไม่ได้พิสูจน์ว่า detector แปลกฎถูกครบ การเปลี่ยน trust lock เป็นงานผู้ดูแลที่ต้องตรวจ source; `npm run sync` ไม่ refresh lock หรือ installed host package ให้

## Compatibility ของ 0.1.9

- Report schema และ review schema ใช้รุ่น `1`
- Scanner version อยู่ใน analysis contract ให้สร้าง baseline ด้วย 0.1.9 เพื่อเปรียบเทียบแบบ comparable
- การยกข้อสรุปจาก `review.json` ใช้ Finding ID และยกข้อสรุปเดิมมาได้เมื่อ ID ตรงกัน
- Branch type/base ของ prompt อยู่ใน `assets/remediation.json` (`delivery`) ค่าเริ่มต้นคือ hotfix จาก develop
- Portable skill อยู่ที่ `plugins/agrimap-golden-lint-portable/skills/agm-lint` ใช้กับ Cursor และ Agent Skills hosts ได้

## Release 0.1.10

Owner แก้เลขรุ่นจาก candidate 0.1.20 เป็น 0.1.10 และอนุมัติเผยแพร่ source/runtime/host bundles ใช้ tag `v0.1.10` พร้อม runtime ZIP, hosts ZIP และ SHA256SUMS ของรุ่นเดียวกัน การเผยแพร่ไม่อัปเดต installation หรือ cache ของ host อัตโนมัติ

Report schema 1 เพิ่ม optional governance; review schema 1 คงเดิม เพิ่ม governance ledger schema 1 ซึ่งไม่ใช่ Golden verdict รายงานเก่าอ่านได้แต่แสดง not-assessed Scanner version เปลี่ยนจึงเทียบ baseline ข้ามรุ่นแบบ comparable ไม่ได้ ส่วน governance recall ใช้ทะเบียนที่ path คงที่โดยไม่อาศัย finding IDs

## Release 0.1.11

Owner อนุมัติเผยแพร่ source/runtime/host bundles ใช้ tag `v0.1.11` พร้อม runtime ZIP, hosts ZIP และ SHA256SUMS ของรุ่นเดียวกัน การเผยแพร่ไม่อัปเดต installation หรือ cache ของ host อัตโนมัติ

รุ่นนี้เพิ่มการตรวจ hardcode literal ทุก lane ที่รองรับ (FE, BE, libraries และ SQL) เป็น 7 class ตาม tier ของ Golden (`MUST` / `SHOULD` / `FREE`) พร้อมทะเบียนข้อสรุป “ตกลงไม่แก้” แบบ append-only ที่ `<root>/.agrimap-agent/reports/golden-lint/hardcode-policy.json` อ่าน [Hardcode lint](HARDCODE-LINT.md) และ [Reporting](REPORTING.md#hardcode-decisions)

Report schema 1 เพิ่ม optional `hardcodePolicy`; review schema 1 คงเดิม และเพิ่ม hardcode policy ledger schema 1 ซึ่งไม่ใช่ Golden verdict รายงานเก่าอ่านได้แต่แสดง hardcode เป็น not-assessed Scanner version เปลี่ยนจึงเทียบ baseline ข้ามรุ่นแบบ comparable ไม่ได้ ส่วนการจำข้อสรุป hardcode ใช้ subject ที่อ้าง class, ค่าที่ normalize แล้ว และ path ของไฟล์ โดยไม่อาศัย finding IDs

ถ้าทะเบียนมีรายการที่หมด `reviewAfter` หรือต้องทบทวนใหม่ scan แสดง needs-review (exit 3) และค่า secret ไม่ถูกเขียนลง report, ledger, prompt หรือ index ทุกรณี

## Release 0.1.14

Owner อนุมัติเผยแพร่ source/runtime/host bundles ใช้ tag `v0.1.14` พร้อม runtime ZIP, hosts ZIP และ SHA256SUMS ของรุ่นเดียวกัน การเผยแพร่ไม่อัปเดต installation หรือ cache ของ host อัตโนมัติ

รุ่นนี้เพิ่ม advisory detectors `be-constant-array-argument` (ADV-08, CA1861) และ `be-generated-regex` (ADV-09, SYSLIB1045) และ pin lock เป็น Golden 5.0.7 ซึ่งเพิ่ม ADV-08/09 ใน sonarqube-remediation.md ต้องใช้ Golden 5.0.7 อ่าน [Backend lint](BACKEND-LINT.md)

Report และ review schema 1 คงเดิม C# reader rebuild ด้วย Roslyn 4.11.0.0 และ protocol 2 เดิม Scanner version เปลี่ยนจึงเทียบ baseline ข้ามรุ่นแบบ comparable ไม่ได้

## Release 0.1.13

Owner อนุมัติเผยแพร่ source/runtime/host bundles ใช้ tag `v0.1.13` พร้อม runtime ZIP, hosts ZIP และ SHA256SUMS ของรุ่นเดียวกัน การเผยแพร่ไม่อัปเดต installation หรือ cache ของ host อัตโนมัติ

รุ่นนี้เพิ่ม `be-file-layout` และ `be-library-file-layout` (NS-01: using หลัง namespace, บรรทัดว่างระหว่าง using/namespace/type และ block namespace ของ library) กับ `be-library-overload-adjacency` (ADV-01 advisory) และ pin lock เป็น Golden 5.0.6 ซึ่งแก้ csharp.md, backend checklists และ skill-routing ต้องใช้ Golden 5.0.6 อ่าน [Backend lint](BACKEND-LINT.md)

Report และ review schema 1 คงเดิม C# reader rebuild ด้วย Roslyn 4.11.0.0 และ protocol 2 เดิม Scanner version เปลี่ยนจึงเทียบ baseline ข้ามรุ่นแบบ comparable ไม่ได้

## Release 0.1.12

Owner อนุมัติเผยแพร่ source/runtime/host bundles ใช้ tag `v0.1.12` พร้อม runtime ZIP, hosts ZIP และ SHA256SUMS ของรุ่นเดียวกัน การเผยแพร่ไม่อัปเดต installation หรือ cache ของ host อัตโนมัติ

รุ่นนี้เพิ่ม Roslyn detectors 7 ตัวตามกฎ SonarQube ของ Golden 5.0.5: QUALITY-01..03 และ advisory smells ADV-01/04/05/07 ของ QUALITY-05 ส่วน ADV-02/03/06 เป็น not-implemented ต้องใช้ Golden 5.0.5 เพราะ lock ผูก csharp.md, backend-main.md และ sonarqube-remediation.md ของรุ่นนั้น อ่าน [Backend lint](BACKEND-LINT.md)

Report schema 1 เพิ่ม optional `authority.externalAnalyzer` (`resultStatus` เป็น `not-imported` เสมอ) และรับ ruleKey แบบ `csharpsquid:` หรือ `external_roslyn:`; review schema 1 คงเดิม C# reader rebuild ด้วย Roslyn 4.11.0.0 และ protocol 2 เดิม Scanner version เปลี่ยนจึงเทียบ baseline ข้ามรุ่นแบบ comparable ไม่ได้
