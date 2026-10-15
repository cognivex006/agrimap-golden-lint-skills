# พัฒนาและดูแล lint package

<!-- AGM-MAINTAINER-ONLY -->

[ข้อกำหนดผู้ดูแล](AGENTS.md) · [แผนที่ source](docs/MAINTAINING.md) · [หลักฐานการตรวจ](docs/IMPLEMENTATION.md)

หน้านี้ใช้เมื่อต้องแก้ source ของ package ผู้ใช้ที่เรียก scan ไม่ต้องเริ่ม workflow พัฒนา อ่าน [Runtime contract](skills/agrimap-golden-lint-skills/references/RUNTIME.md) ก่อนเปลี่ยนพฤติกรรมของ runner

## Branch และขอบเขตสิทธิ์

ตรวจ branch/upstream และ dirty paths ก่อน รักษางานเดิม ไม่ stash/reset, clone หรือสร้าง worktree เพื่อหลบ conflict นโยบายที่ยืนยันใน workspace นี้ใช้ main เป็น integration/stable branch และ work branch แบบ feature/* หรือ hotfix/*; ตรวจ policy ปัจจุบันก่อนทำ Git actions อย่าสร้าง develop จากแผน topology เดิมที่ยังไม่ได้ใช้

Local source/test/docs work ไม่อนุมัติ commit/push/merge/release, dependency installation, product changes, database work หรือ upstream routing edits สิทธิ์จาก repository ต้นแบบไม่ย้ายตามเอกสารมา

ทุก `.agrimap-agent/` เป็น local state ที่ ignore ทุกระดับ ห้าม force-add ก่อนส่งงานตรวจ `git ls-files -- .agrimap-agent` ให้ไม่มีไฟล์ และ staged diff ต้องไม่มี agent state

## เอกสารต้องอ่านเป็นชุดเดียวกัน

ใช้แนวเดียวกับ agrimap-agent-skills: ภาษาไทยสำหรับคำอธิบาย เก็บชื่อคำสั่ง ฟิลด์ paths และ enum เป็นภาษาเดิม เริ่มจากงานของผู้อ่านและผลที่ควรได้ก่อนรายละเอียดภายใน

| หน้า | หน้าที่ |
| --- | --- |
| README | อธิบายประโยชน์ เลือกอ่านตามงาน และทดลองหนึ่งคำสั่ง |
| Getting Started / Installation | prerequisites, ขั้นตอนแรก และการติดตั้งเฉพาะ host |
| Usage / Cookbook | ความหมายคำสั่งและตัวอย่างที่คัดลอกไปแทนค่าได้ |
| Workflows / Troubleshooting | อ่านผล ตัดสินใจขั้นถัดไป และแก้ตาม diagnostics |
| Versions | แยก published release, working copy, Golden, parser และ schema |
| Runtime / Rule Mapping / Coverage | contract เชิงเทคนิค แหล่งกฎ และความสามารถจริง |
| Maintaining / Implementation | canonical owners, verification และหลักฐานย้อนหลัง |

ทุกหน้ามีชื่อที่บอกงานและ navigation ไปหน้าที่เกี่ยวข้อง แยก **ช่องสนทนา Agent** ออกจาก **Terminal / PowerShell** ให้ชัด ตัวอย่างเขียนไฟล์หรือติดตั้งต้องบอกผลของคำสั่งไว้ใกล้ code block

เก็บข้อจำกัดไว้ในตำแหน่งที่ช่วยตัดสินใจ ไม่เปิดทุกหน้าด้วยข้อความห้ามซ้ำ ๆ และไม่ซ่อนข้อจำกัดที่ทำให้ผู้ใช้เข้าใจ coverage หรือ availability ผิด ไม่คัดลอก release/SQL/installation behavior ของ upstream ที่ lint ไม่มี

## Canonical source และ generated copies

Operations อยู่ config/operations.json; runtime allowlist อยู่ config/distribution.json; host layout/identity อยู่ config/hosts.json; detector bindings/catalog และ trust locks อยู่ใน assets; report fields อยู่ schemas และ runtime reference ดู [แผนที่เต็ม](docs/MAINTAINING.md)

npm run sync สร้าง SKILL.md, operations/coverage mirrors, marketplace manifests และ host bundles ห้ามแก้ plugins/ หรือ adapters/ โดยตรง sync ไม่แก้ trust locks, product, upstream หรือ installed profiles ตัวช่วย IDE copy เป็นคำสั่งติดตั้งแยก ไม่ถูกเรียกจาก scan ไม่มี CI/release automation ใน package นี้

## ดูแล docs และ changelog ในงานเดียวกัน

เมื่อแก้ package อย่างมีสาระ ให้อัปเดต docs ที่ได้รับผลและ Unreleased โดยไม่รอการเตือนอีกครั้ง Runtime scan และคำถามทั่วไปไม่แก้ docs/history หากผู้ขอจำกัด write boundary ให้แจ้งเอกสารที่จำเป็นแต่แก้ไม่ได้

| สิ่งที่เปลี่ยน | สิ่งที่ต้องทบทวนพร้อมกัน |
| --- | --- |
| Operation | registry, Usage/Cookbook, examples, adapters และ command checks |
| Rule | bindings, exact source, coverage, positive/negative/adversarial cases และ compatibility |
| Identity/safety/state | schemas/runtime, Workflows/Troubleshooting และ safety fixtures |
| Distribution | allowlist, packaged links และ instruction leakage |
| Workflow | DEVELOPMENT และ AGENTS ในขอบเขตผู้ดูแล |

ใช้ ## Unreleased เดียว เขียน changelog เป็นภาษาอังกฤษตาม convention ของ source package ต้นแบบ บอกสิ่งที่เกิดจริง ไม่เพิ่มรายการซ้ำเมื่อ retry และไม่สร้าง Prompt Result ใหม่เพื่อบันทึกงานเดิม รักษา release history; ไม่ finalize วัน/version, bump หรือ publish หากไม่มีคำสั่ง

## รับกฎเข้า scanner

อ่าน conflict-resolution, root/collection manifests, checklist และ exact entry แยก Golden ID จาก detector ID และแยก current normalized contract จาก raw legacy evidence ตรวจ entry digest กับ manifest ก่อนรับกฎ

รักษา owner exceptions และ deployed/public contracts สิ่งที่ยังพิสูจน์ไม่ได้เป็น candidate/review-only FREE ไม่เป็น violation กฎอัตโนมัติต้องมี positive/negative/adversarial fixtures, deterministic evidence, prerequisite diagnostics และ precision limits

การเพิ่ม semantic dependency ต้องมีแผน trust/symbol resolution ที่ตรวจแล้ว ห้าม execute arbitrary target scripts/configs การ refresh source/parser lock เป็นงานดูแลที่ได้รับมอบหมายและตรวจ source โดยตรง เก็บ expected reference กับ inspected revision แยกกัน

## ตรวจและส่งงาน

รัน npm run sync, npm run validate และ npm test ตามการเปลี่ยนแปลง Tests ใช้ isolated temp fixtures นอก product roots การเขียน fixture เพื่อ verification ไม่ให้สิทธิ์ runtime เขียนไฟล์

Golden fixtures ใช้ checkout ที่มีอยู่จาก AGM_LINT_GOLDEN หรือ sibling agrimap-agent-skills หากไม่มีเป็น prerequisite failure Parser tests ใช้ AGM_LINT_TYPESCRIPT ที่ชี้ trusted module อยู่แล้ว หากไม่มีต้องรายงาน skipped ตามจริง ไม่ต้อง npm install สำหรับ package นี้

ตรวจ diff และเนื้อหาจริงด้วย ไม่ใช้ผล validator แทนการอ่าน prose สรุปสิ่งที่แก้ docs/changelog, actual checks, V002 acceptance ที่ยังไม่ครบ และ Git/release actions ที่ทำจริง Version authority คือ package.json; V002, Golden 4.11.0 และ schema 1 เป็นคนละ identity
