# เลือกเวอร์ชันและแหล่งอ้างอิง

[หน้าหลัก](../README.md) · [เริ่มใช้งาน](GETTING-STARTED.md) · [ติดตั้งตาม host](INSTALLATION.md)

[Release 0.1.5](https://github.com/orchex006/agrimap-golden-lint-skills/releases/tag/v0.1.5) · [รุ่นล่าสุด](https://github.com/orchex006/agrimap-golden-lint-skills/releases/latest) · [Tags ทั้งหมด](https://github.com/orchex006/agrimap-golden-lint-skills/tags)

เลขเวอร์ชันใน source ไม่ได้ยืนยันว่า GitHub release, host installation หรือ cache ของ session ปัจจุบันได้เนื้อหาชุดนั้นแล้ว

## เลือกไฟล์ให้ตรงงาน

| แหล่ง | สิ่งที่มี | ใช้อย่างไร |
| --- | --- | --- |
| Release 0.1.5 / tag `v0.1.5` | Golden 5.0.2 naming FE/BE/SQL และ report save/review workflow | เลือก runtime/hosts ZIP และ SHA256SUMS รุ่น 0.1.5 |
| Release 0.1.1 / tag `v0.1.1` | Node runner และ runtime ZIP ตาม allowlist | ตรวจ checksum แล้วแตกลงโฟลเดอร์ว่าง รันจาก root ที่แตกไฟล์ |
| Release 0.1.4 / tag `v0.1.4` | Roslyn-backed C# first-set rules และ trusted parser bundle | เลือก runtime/hosts ZIP และ SHA256SUMS รุ่น 0.1.4; ต้องมี existing .NET 8 runtime และ --dotnet |
| Release 0.1.3 / tag `v0.1.3` | Installed identity manifests และรายงานแบบรายไฟล์พร้อม template | เลือก runtime/hosts ZIP รุ่น 0.1.3 และ SHA256SUMS จาก release เดียวกัน |
| Release 0.1.2 / tag `v0.1.2` | Node runner, host adapters, source-gate/conformance follow-up และเอกสารที่ปรับปรุง | เลือก runtime ZIP หรือ hosts ZIP จาก release เดียวกัน ตรวจ SHA256SUMS ก่อนใช้ |
| GitHub source ZIP/tar หรือ clone | Source รวมเอกสารผู้ดูแลและ tests | สำหรับอ่านหรือพัฒนา package; ต่างจาก runtime ZIP |

Runtime ZIP ชื่อ `agrimap-golden-lint-skills-0.1.1-runtime.zip` มี SHA-256:

```text
d502bd27cab4342e92ea39c4b2a3faf4b2e5ced74e6d40f95b75697c85f6ee15
```

ตรวจไฟล์และ checksum จาก release เดียวกัน Runtime ZIP เดิมมี 28 ไฟล์ ไม่รวม maintainer instructions, tests, tools และ `.agrimap-agent` ส่วน working copy มี runtime allowlist ที่พัฒนาต่อแล้ว จึงไม่ใช้จำนวนไฟล์ปัจจุบันแทนหลักฐานของ ZIP เดิม

Release 0.1.4 แจก `agrimap-golden-lint-skills-0.1.4-runtime.zip` สำหรับ Node runner และ `agrimap-golden-lint-skills-0.1.4-hosts.zip` สำหรับ host integrations พร้อม `SHA256SUMS` ของทั้งสองไฟล์ Hosts ZIP มี marketplace catalogs, shared/Antigravity plugins และ IDE skill directory; ไม่รวม maintainer files, tests, tools หรือ agent state รุ่น 0.1.1 และ assets เดิมคงเดิม คู่มือติดตั้งแยก native validation ออกจาก activation ที่ยังไม่ทดสอบไว้ชัดเจน

## Version แต่ละตัวหมายถึงอะไร

| Identity | ค่า / ขอบเขต |
| --- | --- |
| Lint package | `0.1.5` / tag `v0.1.5`; npm package เป็น private |
| Golden source | `agrimap-agent-skills` 5.0.2 พร้อม selected reference digests ที่ตรง lock |
| C# parser | Microsoft Roslyn 4.11.0.0 ที่ pin bytes; package-owned reader protocol 1, .NET 8 runtime; แยก identity จาก Golden 5.0.2 |
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
| Checkout ที่ใช้ freeze selected references | `1243bdb98f862528e0b52e32d60bbd67686ee5cc` (refresh สำหรับ 0.1.5; reference ดั้งเดิมใน V002 ไม่เปลี่ยน) |

Active checkout อาจเป็น commit อื่นได้ตาม provenance ที่รายงาน การแยก commit identity จาก content digest ไม่ได้พิสูจน์ว่า detector เข้าใจกฎถูกครบ การเปลี่ยน trust lock ต้องผ่านงานตรวจ source ที่ได้รับมอบหมาย `npm run sync` ไม่ refresh lock หรือ installed host package ให้

ตั้งแต่ 0.1.3 installed mode ยืนยัน identity จาก plugin/extension manifests ที่รองรับได้ แม้ไม่มี root package.json โดยยังตรวจ reference hashes และบล็อก metadata ที่เสีย/ขัดกัน JSON schema ยังคง 1 พร้อม optional provenance/snapshot/observationKind fields และรองรับรายงานเก่า

## Compatibility ของ 0.1.5

เพิ่ม naming และ report save/review operations; report schema ยังคง 1 อ่าน reports เก่าได้สำหรับ detector IDs ที่รองรับ แต่ analysis contract ต่างจาก 0.1.4 จึงไม่เปรียบเทียบ origin อย่างเงียบ ๆ Review schema แยกจาก canonical report; owner review ไม่เปลี่ยน automated verdict
