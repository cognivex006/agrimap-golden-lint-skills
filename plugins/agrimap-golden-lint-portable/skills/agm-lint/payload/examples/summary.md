## ผลตรวจ AgriMap Golden — agrimap-portfolio-fixture

สถานะ **completed** · พบ **5 จุดใน 4 ไฟล์** · เลือกตรวจ 4 จาก 4 inventory records (excluded 0) · กฎ blocked 0 · error 0 · comparison not-requested

Third-party governance: **not-assessed** (legacy report)

| กฎ | สิ่งที่ตรวจ | จุด | ไฟล์ | ความเสี่ยงแก้ | ผลกระทบ |
| --- | --- | ---: | ---: | --- | --- |
| create-or-alter | Procedure ใช้ CREATE OR ALTER | 1 | 1 | ต่ำ | ภายใน service |
| namespace | Namespace คงที่และ file-scoped | 1 | 1 | กลาง | อาจข้าม service |
| T6-any | ห้าม explicit any | 1 | 1 | กลาง | ภายใน service |
| T6-non-null | หลีกเลี่ยง non-null assertion | 1 | 1 | กลาง | ภายใน service |
| lib-public-api | ขอบเขต public-api ของ FE library | 1 | 1 | ทบทวน | อาจข้าม service |

**ไฟล์ที่พบมากที่สุด** (4 จาก 4 ไฟล์ — รายการครบอยู่ใน report.md)

| ไฟล์ | จุด | ตำแหน่ง (บรรทัด กฎ) |
| --- | ---: | --- |
| `apps/web/agmwa-fixture-ng/src/app/features/demo/demo.component.ts` | 2 | 1 T6-any · 1 T6-non-null |
| `services/agmws-fixture-netcore/Src/Application/UseCases/Demo.cs` | 1 | 1 namespace |
| `services/agmws-fixture-netcore/sql/DEMO/procedure/DEMO_Q.sql` | 1 | 1 create-or-alter |
| `standards/libraries/angular/agrimap-platform/projects/dynamic-lut/src/public-api.ts` | 1 | 1 lib-public-api |

**Prompt สำหรับแก้ไข:** มี 4 prompt เมื่อสร้างชุดรายงานด้วย operation report (สรุปนี้ไม่ได้เขียนไฟล์)

Findings ทั้งหมดเป็นจุดให้ทบทวนตามหลักฐาน ไม่ใช่ bug ที่ยืนยันแล้ว และรายงานนี้ไม่อนุมัติการแก้โค้ด
