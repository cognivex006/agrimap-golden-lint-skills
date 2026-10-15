# เลือกเวอร์ชันและแหล่งอ้างอิง

[หน้าหลัก](../README.md) · [เริ่มใช้งาน](GETTING-STARTED.md) · [ติดตั้งตาม host](INSTALLATION.md)

[Release 0.1.1](https://github.com/orchex006/agrimap-golden-lint-skills/releases/tag/v0.1.1) · [รุ่นล่าสุด](https://github.com/orchex006/agrimap-golden-lint-skills/releases/latest) · [Tags ทั้งหมด](https://github.com/orchex006/agrimap-golden-lint-skills/tags)

เลขเวอร์ชันใน source ไม่ได้ยืนยันว่า GitHub release, host installation หรือ cache ของ session ปัจจุบันได้เนื้อหาชุดนั้นแล้ว

## เลือกไฟล์ให้ตรงงาน

| แหล่ง | สิ่งที่มี | ใช้อย่างไร |
| --- | --- | --- |
| Release 0.1.1 / tag `v0.1.1` | Node runner และ runtime ZIP ตาม allowlist | ตรวจ checksum แล้วแตกลงโฟลเดอร์ว่าง รันจาก root ที่แตกไฟล์ |
| Source 0.1.2 / work branch | Host adapters, source-gate/conformance follow-up และเอกสารที่ปรับปรุง | พร้อมสำหรับตรวจและ push source; ยังไม่มี GitHub release/tag 0.1.2 |
| GitHub source ZIP/tar หรือ clone | Source รวมเอกสารผู้ดูแลและ tests | สำหรับอ่านหรือพัฒนา package; ต่างจาก runtime ZIP |

Runtime ZIP ชื่อ `agrimap-golden-lint-skills-0.1.1-runtime.zip` มี SHA-256:

```text
d502bd27cab4342e92ea39c4b2a3faf4b2e5ced74e6d40f95b75697c85f6ee15
```

ตรวจไฟล์และ checksum จาก release เดียวกัน Runtime ZIP เดิมมี 28 ไฟล์ ไม่รวม maintainer instructions, tests, tools และ `.agrimap-agent` ส่วน working copy มี runtime allowlist ที่พัฒนาต่อแล้ว จึงไม่ใช้จำนวนไฟล์ปัจจุบันแทนหลักฐานของ ZIP เดิม

Host adapters อยู่ใน source 0.1.2 และยังไม่มีใน published 0.1.1 ZIP/tag การเตรียม version/push source ยังไม่สร้าง release/tag 0.1.2 ไม่แทน tag/assets เดิม คู่มือติดตั้งแยก native validation ออกจาก activation ที่ยังไม่ทดสอบไว้ชัดเจน

## Version แต่ละตัวหมายถึงอะไร

| Identity | ค่า / ขอบเขต |
| --- | --- |
| Lint package | `0.1.2` ตาม package.json; source version แยกจาก published release 0.1.1; npm package เป็น private |
| Golden source | `agrimap-agent-skills` 4.11.0 พร้อม selected reference digests ที่ตรง lock |
| TypeScript parser | 5.9.3 และ exact digest ของ `lib/typescript.js` |
| Report schema | 1; แยกจาก package และ Golden version |
| Specification | V002; เป็นข้อกำหนด ไม่ใช่เลข release |
| Node runner | ประกาศ Node 22+; หลักฐานเดิมตรวจบน Windows / Node 26.7.0 |

## ตรวจ source identity

`checkout` เก็บ active Git commit/tree และ selected content identity ส่วน `installed` เก็บ package/content identity โดยไม่สมมติว่าเป็น Git checkout ทั้งสองแบบต้องตรวจ exact reference bytes ไม่สลับแหล่งสำรองโดยเงียบ ๆ

ใน source-lock.json บันทึกประวัติแยกกัน:

| รายการ | Commit |
| --- | --- |
| Reference ที่ระบุใน V002 | `3c314c7a8fdc7c35ca41b4b161cb43824ed893fb` |
| Checkout ที่ใช้ freeze selected references | `55c526a05db323d9877010cd49a6471c00ab1d5f` |

Active checkout อาจเป็น commit อื่นได้ตาม provenance ที่รายงาน การแยก commit identity จาก content digest ไม่ได้พิสูจน์ว่า detector เข้าใจกฎถูกครบ การเปลี่ยน trust lock ต้องผ่านงานตรวจ source ที่ได้รับมอบหมาย `npm run sync` ไม่ refresh lock หรือ installed host package ให้
