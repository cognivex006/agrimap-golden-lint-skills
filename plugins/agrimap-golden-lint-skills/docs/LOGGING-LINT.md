# ตรวจ logging ให้ monitor ตอบได้ว่าอะไรพัง

[หน้าหลัก](../README.md) · [Backend lint](BACKEND-LINT.md) · [อ่านผลและแก้ไข](WORKFLOWS.md) · [Security lint](SECURITY-LINT.md)

ตัวเลขบน dashboard เช่น ERROR lines หรือจำนวน HTTP 500 จะช่วยตัดสินใจได้ก็ต่อเมื่อ log ทุกบรรทัดเป็นรูปแบบเดียวกัน และ "ระบบปฏิเสธคำขอตามกติกา" ไม่ถูกเขียนออกมาเหมือน "ระบบพัง" หน้านี้อธิบายกฎที่ `agm-lint` ใช้หาโค้ดที่ทำให้ตัวเลขเหล่านี้คลาดเคลื่อน วิธีอ่านผล และหลักใช้ดุลยพินิจว่าจุดไหนควรแก้

Runner อ่านอย่างเดียว ไม่แก้โค้ดของ service และไม่เปลี่ยน log ที่ระบบเขียนอยู่ ทุกผลเป็น review candidate

## ปัญหาที่กฎชุดนี้ช่วยหา

| อาการบน monitor | ต้นเหตุในโค้ดที่ตรวจได้ |
| --- | --- |
| ERROR สูงทั้งที่ระบบทำงานถูก เช่นกรอก PIN ผิดหรือหาไฟล์ไม่พบ | log message ที่ประกอบจาก exception (LOG-02) และ exception ที่ถูกเขียนเป็นข้อความแทน argument (LOG-01) |
| ข้อความใน log มี `{Action}` ค้างอยู่ | template ที่ placeholder ไม่มี argument (LOG-01, LOG-02) |
| log ปน JSON กับข้อความธรรมดา ค้นด้วย field ไม่เจอ | `Console.Write*` ที่ข้าม logger (OBS-01) |
| event เดียวกันขึ้นสองครั้ง | ลงทะเบียน NLog สองทาง (OBS-02) |
| HTTP 500 สูงทั้งที่เป็น input ผิดของผู้เรียก | `AppException(500, "<code ของ input ผิด>")` (OBS-03) และ server bug ที่ map เป็น 400 ในทางกลับกัน (ERR-03) |

## กฎที่ตรวจ

| Tag | Tier | Lane | ตรวจอะไร |
| --- | --- | --- | --- |
| LOG-01 | MUST (Golden) | be-main, be-library | จำนวน `{Placeholder}` ไม่ตรงกับ argument, exception ที่ส่งหลัง template และ `ex.Message`/`ex.ToString()` ที่ log โดยไม่ส่ง exception object |
| LOG-02 | MUST (Golden) | be-main, be-library | message ที่ต่อด้วย `+`, `$"..."` หรือ `string.Format` |
| ERR-03 | MUST (Golden) | be-main | NullReferenceException หรือ IndexOutOfRangeException ที่ map เป็น 400 |
| OBS-01 | SHOULD (baseline) | be-main, be-library | `Console.Write`, `Console.WriteLine`, `Console.Error.Write*` ที่ข้าม NLog |
| OBS-02 | SHOULD (baseline) | be-main | ไฟล์เดียวที่เรียกทั้ง `AddNLog`/`AddNLogWeb` และ `UseNLog` |
| OBS-03 | SHOULD (baseline) | be-main, be-library | `new AppException(500, "<code>")` ที่ code เป็นรูปแบบของ input ผิด หาไม่พบ หรือสถานะไม่ถูกต้อง เช่น `*_required`, `invalid_*`, `*_must_be_*`, `*_not_found`, `*_inactive`, `*_already_exists` |

OBS เป็น package observability baseline เพราะ Golden ของ agrimap-agent-skills ยังไม่มีกฎเรื่องนี้ ผลจึงเป็นข้อแนะนำที่ทีมใช้ดุลยพินิจ ไม่ใช่ Golden verdict ถ้า Golden เพิ่มกฎเรื่องเดียวกันภายหลัง binding จะย้ายไปอ้างกฎนั้นและเปลี่ยน tier ตาม

กฎทุกตัวตรวจจากข้อความโค้ดหลังตัด comment และ string ออก ไม่ต้องใช้ `--dotnet` และไม่ resolve type จริง ดูขอบเขตเชิงเทคนิคใน [Rule mapping](../skills/agrimap-golden-lint-skills/references/RULE-MAPPING.md#logging-และ-error-mapping-bindings)

## หลักแยกประเภทผลลัพธ์

ถ้าอยากให้ตัวเลขตอบได้ ต้องแยกผลของ request ออกเป็นประเภทก่อน แล้วเลือก level และ status ตามประเภท ตารางนี้เป็นเกณฑ์ที่คำแนะนำในรายงานใช้

| ประเภท | ตัวอย่าง | Level ที่ควรเป็น | Status | อ่านตัวเลขอย่างไร |
| --- | --- | --- | --- | --- |
| ปฏิเสธตามกติกา | PIN ผิด, หาไฟล์ไม่พบ, input ไม่ครบ, SP `THROW 50001` ในส่วน Validate | Information หรือ Warning ไม่มี stack trace | 4xx | ตัวเลขทางธุรกิจ เช่น PIN ผิดกี่ครั้ง ไม่ใช่ปัญหาของระบบ |
| ผู้เรียกยกเลิก | ผู้ใช้ปิดหน้าหรือเปลี่ยนหน้า ระหว่างรอ | Information | ไม่ต้องตอบ | ไม่ต้องกังวล |
| ระบบภายนอกล้ม | queue ต่อไม่ได้, API ภายนอกตอบ 403, HttpClient timeout | Error พร้อมชื่อระบบปลายทาง | 502, 503 หรือ 504 | alert เมื่ออัตราสูงหรือเกิดต่อเนื่อง |
| ข้อบกพร่องของระบบ | NullReferenceException, exception ที่ไม่มีใครจัดการ | Error พร้อม exception | 500 | เป้าหมายคือ 0 ทุกครั้งที่เกิดต้องหาสาเหตุ |

เมื่อแยกได้แบบนี้ คำถามอย่าง "PIN ผิดกี่ครั้ง" ตอบได้จาก error code ใน log โดยตรง และกล่อง 500 บน dashboard จะหมายถึงข้อบกพร่องจริง

## อ่านตัวเลข status code

| Status | ควรสนใจเมื่อ |
| --- | --- |
| 2xx, 304 | ปกติ ใช้ดูปริมาณงาน |
| 401, 403 | พุ่งผิดปกติ หรือมาจาก path ที่ไม่ควรต้อง login |
| 404 | path ซ้ำ ๆ ที่มีค่าผิดรูป เช่น `/undefined/` ซึ่งมักเป็น bug ฝั่ง FE |
| 408 | ต้องแยกก่อนว่าผู้เรียกยกเลิกเองหรือรอปลายทางจนหมดเวลา ถ้ายังแยกไม่ได้ ตัวเลขนี้ยังตัดสินอะไรไม่ได้ |
| 5xx | ทุกครั้ง หลังย้าย error ของผู้เรียกไปเป็น 4xx แล้ว 500 ควรใกล้ 0 |

## ใช้ดุลยพินิจว่าจะแก้หรือไม่

การแก้แต่ละกฎกระทบระบบต่างกัน รายงานจึงระบุความเสี่ยงไว้ทุกกฎ

| ความเสี่ยงแก้ | กฎ | สิ่งที่เปลี่ยน | ควรตรวจก่อน |
| --- | --- | --- | --- |
| ต่ำ | LOG-01, LOG-02, OBS-01 | เฉพาะรูปแบบ log | dashboard หรือ alert ที่ค้นข้อความเดิมแบบตรงตัว |
| กลาง | OBS-02 | การลงทะเบียน logger | config ของแต่ละ environment ยังถูกโหลดตัวเดิม |
| สูง | OBS-03, ERR-03 | status ที่ client ได้รับ | FE interceptor, gateway และ client อื่นที่พึ่ง status เดิม |

ลำดับที่แนะนำคือแก้กลุ่มความเสี่ยงต่ำก่อน เพราะทำให้ log เป็นรูปแบบเดียวกันโดยไม่เปลี่ยน response แล้วจึงพิจารณา OBS-02 และ OBS-03 ทีละ endpoint จุดที่แก้ซ้ำกันหลาย service มักมาจาก project template กลางหรือ AgriMap.Platform ให้แก้ที่เจ้าของแล้ว sync ตาม ERR-05

จุดที่ทีมตัดสินว่าไม่แก้ เช่น code ที่ดูเหมือน input ผิดแต่จริงเป็นความผิดพลาดภายใน ให้บันทึกสถานะ `exception` พร้อมเหตุผลใน `review.json` แล้ว `review-update` ตาม [Workflows](WORKFLOWS.md) รายงานรอบถัดไปที่ใช้ `--baseline` จะยกข้อสรุปมาให้ ไม่ถามจุดเดิมซ้ำ

## สิ่งที่กฎชุดนี้ยังไม่ตรวจ

- level ของ log ตามประเภทผลลัพธ์ เช่น action filter ที่ log ทุก AppException เป็น Error รวม 4xx
- การ map ผลของ stored procedure เป็น 500 ทุกกรณี โดยไม่แยก `THROW 50001` ที่เป็นการตรวจตามกติกา
- `catch` ที่ log Error แล้วทำงานต่อ ซึ่งต้องรู้ว่าผลสุดท้ายของ request สำเร็จหรือไม่
- รูปแบบใน `nlog*.config`, filter ของ Alloy และ query ของ dashboard

เรื่องเหล่านี้ต้องการกฎใน Golden หรือข้อมูล runtime ก่อน จึงยังเป็นงานที่ต้องตรวจด้วยคน การไม่มี finding ไม่ได้แปลว่า logging ของระบบสอดคล้องกันแล้ว
