# อ่านผล เปรียบเทียบ และส่งต่องาน

[หน้าหลัก](../README.md) · [คู่มือคำสั่ง](USAGE.md) · [ขอบเขตการตรวจ](../skills/agrimap-golden-lint-skills/references/COVERAGE.md)

เริ่มจากเลือก scope → scan → ตรวจ coverage/source → อ่านหลักฐาน → ส่งต่อข้อเสนอให้เจ้าของโค้ด ไม่จำเป็นต้อง export ทุกครั้ง

## 1. เก็บผลให้ใช้อ้างอิงต่อได้

`scan` ส่ง canonical report ออก stdout โดยไม่บันทึกไฟล์ให้ เก็บ report ทั้งก้อนในหน่วยความจำของ host หรือปลายทางภายนอกที่อนุญาต เก็บ `reportId` และ `findingId` สำหรับ `explain` ด้วย

หากต้องการใช้ explain/export ผ่าน Terminal ให้ห่อรายงานเป็น [envelope](../examples/README.md) พร้อมทุก scanned/Golden root เดิม คำสั่งทั้งสองใช้หลักฐานชุดเดิม ไม่มี hidden rescan

## 2. แยกสิ่งที่พบออกจากสิ่งที่พิสูจน์แล้ว

| Disposition | อ่านอย่างไร |
| --- | --- |
| `violation` | พบ syntax ที่ขัดกับกฎในขอบเขตที่ detector ประเมินได้ ผลกระทบของการแก้ยังไม่ทราบ |
| `review-candidate` | มีจุดให้ทบทวน ต้องเพิ่มหลักฐานเรื่อง symbol, ownership, applicability หรือ contract |
| `accepted-exception` | ค่าที่ schema รองรับ แต่ runner ปัจจุบันยังไม่ ingest owner exception เพื่อสรุปให้อัตโนมัติ |

ก่อนสรุป candidate เปิด [กฎกับแหล่งอ้างอิง](../skills/agrimap-golden-lint-skills/references/RULE-MAPPING.md) แล้วอ่าน exact entry, checklist, manifests, normalized contract และ conflict guidance จาก Golden ที่ตรวจแล้ว ดู `authority.sourceDependencies` และ diagnostics ประกอบ จากนั้นตรวจ active code, consumers และ owner evidence ที่ตรงขอบเขต

ตัวอย่าง: ชื่อ `inject(Facade)` ที่ถูกต้องอาจยังสร้าง R1 candidate ได้ ส่วน ViewChild ที่มี decorator ยังต้อง resolve Angular identity และ static option hash ตรงช่วยยืนยัน reference bytes แต่ไม่ได้พิสูจน์ว่า detector แปลกฎถูกทุกกรณี

## 3. เปรียบเทียบกับฐานเดิม

ใช้ `--baseline` กับ canonical report JSON หรือ `--base-ref` กับ Git ref เลือกอย่างใดอย่างหนึ่ง ส่วน `--target-ref` ใช้เมื่อต้องการตรวจ committed blobs แทน working tree

| ผลเปรียบเทียบ | ความหมาย |
| --- | --- |
| `comparable` | analysis contract ตรงและ baseline ตรวจครบ ใช้จับ finding เดิมได้ |
| `not-comparable` | rules/source/parser/runtime หรือ baseline health ต่างกัน ที่มาจึงยัง unknown |
| `pre-existing` | จับ finding เดิมได้ แม้มีการเพิ่มบรรทัดหรือ comment รอบนอก |
| `introduced` | พบในไฟล์ path ใหม่ภายใต้ contract เดียวกัน |
| `unknown` | หลักฐานยังแยกไม่ได้ว่าเป็นของเดิมหรือเกิดจากงานนี้ |

ไฟล์ที่แก้ไม่ได้แปลว่า findings ทุกจุดเพิ่งเกิด finding ใหม่ในไฟล์ที่เปลี่ยนอาจยัง unknown การ rename/refactor และ edited-range matching ยังไม่รองรับ ผลปัจจุบันจะคงครบ ไม่ซ่อนเพราะ baseline

## 4. ตรวจกรณีที่มี contract เดิม

Library facade/store islands, public aliases, OAuth redirect/HTML และ job ที่เปิด HTTP ต้องใช้หลักฐาน owner/deployed contract ที่ตรงกรณี ไม่สรุปจากชื่อหรือ signature อย่างเดียว

SQL ต้องแยก naming จาก business semantics เรื่อง seed, index, cascade, replace semantics และข้อความ error ต้องตรวจ owner/schema/caller evidence การยกเว้น reference/schema/docs SQL เป็นขอบเขตของ classifier ไม่ใช่หลักฐานว่าไฟล์นั้นไม่ใช้ deploy

## 5. ส่งต่อข้อเสนอแก้ไข

บอกตำแหน่ง กฎที่อ้าง ข้อเท็จจริงที่พบ สิ่งที่ยังไม่ทราบ และหลักฐานที่จะใช้ยืนยันก่อนแก้ แยกสองคำถาม:

- **Impact:** แก้แล้วกระทบอะไร — `no-effect-proven`, `internal-effect`, `external-effect` หรือ `unknown`
- **Manageability:** คุมความเสี่ยงได้หรือยัง — `manageable`, `unmanageable-with-current-evidence` หรือ `unknown`

ปัจจุบัน static detectors เริ่มทั้งสองค่าที่ unknown การบอกว่า no-effect ต้องพิสูจน์ behavior/public/wire/data observables ที่เกี่ยวข้อง การ build/test ผ่านหรือ diff เล็กอย่างเดียวไม่พอ แนบ consumers, equivalence obligations และ containment/rollback ตามจริง

ข้อเสนอคือข้อมูลประกอบการอนุมัติงานแก้ใน workflow เดิมของเจ้าของโครงการ สกิล lint เป็นตัวช่วยอ่านอย่างเดียว ไม่แทน lane skill หรือเริ่ม lifecycle อีกชุด การเชื่อม routing upstream ยังเป็นข้อเสนอแยกต่างหาก
