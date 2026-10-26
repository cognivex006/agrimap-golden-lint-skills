# ตรวจ hardcode literal, secret และ config

[หน้าหลัก](../README.md) · [คู่มือคำสั่ง](USAGE.md) · [อ่านผลและแก้ไข](WORKFLOWS.md)

`agm-lint` ตรวจค่าที่เขียนฝังตรงในโค้ด (hardcode) ในทุก lane ที่รองรับ — `agmwa-*`, `agmws-*`, `agmbo-*`, libraries และ SQL — แยกจาก detectors ที่ตรวจ naming หรือ syntax การตรวจนี้เป็น lexical observation: runner อ่าน literal ที่ parse ได้เท่านั้น ไม่ execute โค้ด ไม่เชื่อมต่อปลายทาง และไม่ยืนยัน applicability จาก syntax เพียงอย่างเดียว

## ตรวจอะไร

ตาราง class เป็น canonical อยู่ที่ [hardcode-classes.json](../skills/agrimap-golden-lint-skills/assets/hardcode-classes.json) และ tier ใช้คำของ Golden (`MUST` / `SHOULD` / `FREE`)

| Class | สิ่งที่พบ | Tier | Disposition | Lane |
| --- | --- | --- | --- | --- |
| `HC-SECRET` | ข้อความที่รูปร่างเป็น credential เช่น private key block, AWS access key id, JWT, connection string ที่มี `User ID=`/`Password=`, `AccountKey=`, `api_key=`/`client_secret=`/`password=`/`token=` ที่มีค่าจริง และ `Bearer <token>` | MUST | `violation` | FE, BE, SQL |
| `HC-ENVURL` | host ของ environment หรือ service ที่เขียนลงโค้ด เช่น `agrimap-api.cdg.co.th`, `*.svc.cluster.local` | MUST | `violation` | FE, BE |
| `HC-PROXYBYPASS` | การเรียก external map/layer/geocoding service ตรง เช่น `services.arcgis.com/.../MapServer`, `google.com/maps/@?api=1&map_action=pano`, `*.arcgisonline.com`, `*.openstreetmap.org` | MUST | `review-candidate` | FE, BE |
| `HC-EXTURL` | absolute URL ภายนอกที่เหลือ (vendor, partner, endpoint สำหรับทดสอบ) | MUST | `review-candidate` | FE, BE |
| `HC-CONFIG` | environment selector ที่เทียบเป็น literal เฉพาะ `Development`, `Inhouse`, `K8s.dev`, `Staging`, `Production` และมีความยาวตั้งแต่ 8 ตัวอักษร | SHOULD | `review-candidate` | BE |
| `HC-MAGIC` | business limit ที่ฝังเป็นตัวเลข โดยชื่อตัวแปรต้องมี `max`, `min`, `limit`, `threshold`, `capacity`, `pageSize`, `batchSize`, `total` หรือ `quota` และค่าตั้งแต่ 3 หลักขึ้นไป | SHOULD | `review-candidate` | FE, BE |
| `HC-SQL` | host, link หรือชื่อ database ที่ฝังใน SQL (`[database].[dbo].`) และ URL ที่อยู่ใน SQL | SHOULD | `review-candidate` | SQL |

`violation` ใช้เฉพาะจุดที่ Golden ระบุตรงและ syntax ไม่กำกวม คลาสอื่นเป็น `review-candidate` เพราะ applicability (ของใหม่ / แตะเดิม / legacy / test scaffold / config-of-record) พิสูจน์จาก syntax ไม่ได้ และ `FREE` ไม่เคยเป็น violation

## อะไรที่ไม่รายงาน

- ไฟล์ config-of-record: `environment*.ts`, ไฟล์ใน directory `environments/` และ `*.d.ts`
- host สำหรับพัฒนาและ schema: `localhost`, `127.0.0.1`, `0.0.0.0`, `[::1]`, `*.w3.org`, `*.json-schema.org`, `*.schemas.microsoft.com`, `*.purl.org`, `*.xml.org`, `*.openxmlformats.org`, `*.ietf.org`, `example.com`, `example.org`
- ค่าที่เป็น placeholder เช่น `https://${host}/api/v1`
- ค่าที่อยู่ใน comment (runner แยก comment ออกจาก literal ในรอบเดียว จึงไม่ตีความค่าที่ comment ไว้เป็น finding)
- ไฟล์ใน `tests`, `fixtures`, reference, docs และ generated ซึ่ง classifier ตัดออกจาก scope ตั้งแต่ต้น
- ชื่อตัวแปรที่สื่อเวลา (`timeout`, `delay`, `interval`, `ttl`, `retry`, `second`, `minute`, `hour`) สำหรับ `HC-MAGIC` — ค่าเหล่านี้ตั้งใจไม่อยู่ในขอบเขต

## Secret ไม่ถูกเขียนลงรายงาน

ค่าใดที่จัดเป็น `HC-SECRET` จะไม่ถูกคัดลอกลง report, ledger, prompt หรือ index ไม่ว่ากรณีใด ระบบเก็บได้เฉพาะชื่อ shape เช่น `<masked:aws-access-key-id>`, ค่า URL แบบปิด query และลบ userinfo (`https://api.partner.co.th/x?<query-masked> (userinfo removed)`) และ digest ที่ใช้เทียบ identity เท่านั้น ถ้าพบ secret ให้ย้ายไป secret store หรือ environment configuration ของโครงการ และอย่าใส่ค่าจริงในไฟล์ที่ส่งต่อให้ผู้อื่น

## อ่านผล

รายงานแสดงผลรวมในหัวข้อ “Hardcode decisions และข้อยกเว้นที่บันทึกไว้” พร้อมบรรทัดสรุปในแชท ค่าที่ไม่มีข้อสรุปจะอยู่ในตารางรายกฎตามปกติ และ prompt แก้ไขจะครอบคลุมเฉพาะ finding ที่ยังไม่มีข้อสรุป

การอ่านค่า tier ให้ตรงความหมายของ Golden:

| Tier | อ่านอย่างไร |
| --- | --- |
| `MUST` | ต้องทบทวนและยืนยันก่อนถือว่าจุดนั้นผ่าน; ถ้าเป็น `violation` ต้องแก้หรือบันทึกข้อสรุป |
| `SHOULD` | ใช้แบบเดิมได้ แต่ต้องมีเหตุผลและหลักฐานที่บันทึกไว้ |
| `FREE` | เลือกได้เอง ไม่เป็น violation และไม่ถูกนับเป็นจุดที่ต้องแก้ |

ถ้าไม่บันทึกข้อสรุปไว้ จุดเดิมจะถูกถามซ้ำทุกรอบ ซึ่งเป็นพฤติกรรมที่ถูกต้อง — runner ไม่มีสิทธิ์ถือว่าความเงียบของผู้ใช้คือการยอมรับ

## ตกลงไม่แก้จุดไหน ทำอย่างไร

ทะเบียนข้อสรุปอยู่ที่ `<root>/.agrimap-agent/reports/golden-lint/hardcode-policy.json` เป็น append-only และ scan อ่านเองอัตโนมัติทุกครั้งโดยไม่ต้องส่ง baseline ดูขั้นตอนและ schema ที่ [Reporting](REPORTING.md#hardcode-decisions) และ [hardcode-policy.schema.json](../schemas/hardcode-policy.schema.json)

ทะเบียนจำ “subject” ไม่ใช่ “บรรทัด” โดย subject อ้างจาก class, ค่าที่ normalize แล้ว และ path ของไฟล์ จุดเดิมจะถูกถามใหม่เมื่อ

- ค่าที่ normalize แล้วเปลี่ยน (เปลี่ยน host, เปลี่ยน endpoint, เปลี่ยนตัวเลข limit)
- ไฟล์ย้าย path
- หมดอายุ `reviewAfter` ที่บันทึกไว้
- มี decision `reopen` ใหม่ทับ subject นั้น

การเปลี่ยน commit หรือ snapshot identity ของโครงการไม่เปิดทุกจุดใหม่ เพราะใช้เป็นหลักฐานประกอบเท่านั้น และ Git snapshot แบบ immutable ไม่มีทะเบียนให้อ่าน จึงรายงาน `not-assessed`

## ขอบเขตที่ยังต้องใช้คนทบทวน

- เป็น lexical observation จาก literal ที่ parse ได้ ไม่ได้พิสูจน์ว่าเป็นของใหม่ ของเดิม หรืออยู่ในเส้นทางที่ทำงานจริง
- ไม่ได้พิสูจน์ว่า proxy route หรือ gateway key มีอยู่จริงใน environment นั้น จึงต้องยืนยัน route และ consumer ก่อนย้าย call site
- ไม่ได้อ่าน configuration pipeline ของโครงการ จึงไม่ยืนยันว่า key ที่ถูกต้องมีให้ใช้แล้ว
- ไม่ได้ตัดสิน business semantics ของ `HC-MAGIC` และ `HC-SQL` ว่า limit หรือชื่อ object นั้นถูกต้องหรือเป็น legacy evidence
- ไม่แทนที่ governance ของ third party: URL ที่ผ่าน proxy ยังต้องดูเงื่อนไขการใช้งานของบริการปลายทางตาม [Reporting](REPORTING.md#third-party-governance)
