# ตรวจช่องโหว่ application ตาม OWASP

[หน้าหลัก](../README.md) · [คู่มือคำสั่ง](USAGE.md) · [อ่านผลและแก้ไข](WORKFLOWS.md) · [Hardcode lint](HARDCODE-LINT.md)

`agm-lint` ตรวจรูปแบบโค้ดที่เป็นช่องโหว่ระดับ application ตาม OWASP Top 10:2021 และ CWE ใน lane ที่รองรับทุก lane — `agmws-*`, `agmbo-*`, AgriMap.Platform, `agmwa-*`, `@agrimap/*` และ SQL procedure หน้านี้ช่วยให้รู้ว่าแต่ละ class หาอะไร ผลแบบใดต้องตัดสินเอง และแก้อย่างไรให้ผู้เรียกที่ถูกต้องได้ response เดิม

กฎเขียนจากชื่อ API และรูปร่างของค่า ไม่ผูกกับ route, host หรือ field ของโครงการใด จึงใช้ได้กับทุก application ใน lane เดียวกัน Runner อ่านอย่างเดียว ไม่ execute โค้ด ไม่ยิง request และไม่แก้ไฟล์

## ตรวจอะไร

ตาราง class เป็น canonical อยู่ที่ [security-classes.json](../skills/agrimap-golden-lint-skills/assets/security-classes.json) คอลัมน์ Golden ระบุกฎของ agrimap-agent-skills ที่บอกเรื่องเดียวกัน ถ้าไม่มี class นั้นเป็น package security baseline (`SHOULD`) ไม่ใช่ Golden verdict

| Class | OWASP 2021 | CWE หลัก | สิ่งที่พบ | Golden | Lane |
| --- | --- | --- | --- | --- | --- |
| `SEC-01` | A03 Injection | CWE-89 | SQL literal ที่ต่อด้วย interpolation, `+` หรือ `string.Format`; `FromSqlRaw`/`ExecuteSqlRaw` ที่รับ command จากตัวแปร; `EXEC(@sql)`, `EXEC('...' + @x)`, `sp_executesql` บน text ที่ต่อค่า | C#: Async, errors, data, and logs | BE, library, SQL |
| `SEC-02` | A03 Injection | CWE-78, CWE-94, CWE-470 | `Process.Start`/`ProcessStartInfo` ที่ค่าไม่ใช่ literal, Roslyn scripting, `DataTable.Compute` และ `Type.GetType` จากค่าที่รับมา | — | BE, library |
| `SEC-03` | A03 Injection | CWE-90 | LDAP filter (`sAMAccountName=`, `uid=`, `mail=` ฯลฯ) ที่ต่อค่า | — | BE, library |
| `SEC-04` | A01 Access Control | CWE-22 | file API หรือ `Path.Combine` ที่รับชื่อไฟล์/path โดย member ไม่มี `GetFullPath` + `StartsWith` หรือ `GetFileName` | — | BE, library |
| `SEC-05` | A01 Access Control | CWE-862, CWE-306, CWE-489 | controller ที่ไม่มี `[Authorize]` ระดับ class และมี action ไม่มี `[Authorize]`, minimal API ที่ไม่มี `RequireAuthorization`, route หรือชื่อ action ที่เป็น fake/mock/test/debug/bypass และ `[AllowAnonymous]` ที่ต้องยืนยัน | CTL-03 | BE |
| `SEC-06` | A04 Insecure Design | CWE-209, CWE-497 | `ex.Message`, `StackTrace`, `InnerException` ใน `return`, `BadRequest(...)`, `AppException` หรือ field error และ developer exception page ที่ไม่ครอบด้วย `IsDevelopment()` | C#: Async, errors, data, and logs | BE, library |
| `SEC-07` | A09 Logging Failures | CWE-532 | logging call หรือ message template ที่มี password, token, secret, API key, cookie, OTP, เลขบัตร หรือเลขประจำตัว และการ log request headers | C#: Async, errors, data, and logs | BE, library |
| `SEC-08` | A02 Cryptographic Failures | CWE-327, CWE-326, CWE-338 | MD5/SHA-1, DES/3DES/RC2, ECB, RSA/DSA ต่ำกว่า 2048 bit, signing key literal สั้นกว่า 256 bit และ `System.Random` ใน member ที่จัดการค่าลับ | — | BE, library |
| `SEC-09` | A07 Authentication Failures | CWE-347, CWE-287 | `ValidateIssuer/Audience/Lifetime/IssuerSigningKey = false`, `RequireSignedTokens = false`, custom `SignatureValidator`, `RequireHttpsMetadata = false` และการ decode token โดยไม่ validate | — | BE, library |
| `SEC-10` | A07 Authentication Failures | CWE-613, CWE-294 | การสร้าง JWT ที่ไม่มี `jti` หรือไม่มีวันหมดอายุ | — | BE, library |
| `SEC-11` | A02 Cryptographic Failures | CWE-295 | certificate validation callback ที่ยอมทุก certificate, `DangerousAcceptAnyServerCertificateValidator`, ปิด revocation และ pin TLS/SSL รุ่นเก่า | — | BE, library |
| `SEC-12` | A08 Integrity Failures | CWE-502 | `BinaryFormatter` และ serializer ตระกูลเดียวกัน, `TypeNameHandling` ที่ไม่ใช่ `None` | — | BE, library |
| `SEC-13` | A05 Misconfiguration | CWE-942 | `AllowAnyOrigin()` (critical เมื่อคู่ `AllowCredentials()`), origin check ที่คืน `true` เสมอ และ origin `*` | — | BE, library |
| `SEC-14` | A05 Misconfiguration | CWE-650 | `UseHttpMethodOverride()` และการอ่าน `X-HTTP-Method-Override` หรือ `_method` | — | BE, library |
| `SEC-15` | A01 Access Control | CWE-601 | `Redirect(...)` ที่ปลายทางไม่ใช่ literal และไม่มี `Url.IsLocalUrl`; ฝั่ง browser `location.href`/`window.open` จาก returnUrl หรือ query | — | BE, library, FE |
| `SEC-16` | A04 Insecure Design | CWE-598 | password, token, secret, OTP หรือเลขประจำตัวใน `[FromQuery]`, query string ของ URL literal, `params` หรือ `HttpParams` | — | BE, library, FE |
| `SEC-17` | A01 Access Control | CWE-200, CWE-359 | response DTO ที่มี field password/hash/salt/secret (high) หรือ email, เบอร์โทร, เลขประจำตัว, วันเกิด (medium) | — | BE, library |
| `SEC-18` | A04 Insecure Design | CWE-770, CWE-1284 | ค่า paging/size (`PageSize`, `RowsPerPage`, `FirstRow`, `Take` ฯลฯ) ใน request DTO หรือ `[FromQuery]` ที่ไม่มี `[Range]` และค่าแบบ floating-point | — | BE, library |
| `SEC-19` | A05 Misconfiguration | CWE-319, CWE-693, CWE-525 | host pipeline (`Program.cs`) ที่ไม่เห็น HSTS, `X-Content-Type-Options` หรือ `Cache-Control` และไม่เรียก security-headers middleware | — | BE |
| `SEC-20` | A05 Misconfiguration | CWE-614, CWE-1004, CWE-1275 | cookie ที่ `HttpOnly = false`, `Secure = false`, `SameAsRequest` หรือ `SameSite=None` โดยไม่มี Secure | — | BE, library |
| `SEC-21` | A03 Injection | CWE-79 | `bypassSecurityTrust*`, `innerHTML`/`outerHTML` ที่รับค่าไม่ใช่ literal, `insertAdjacentHTML`, `document.write`, `eval`, `new Function`, timer ที่รับ string และ `[innerHTML]` ใน inline template (low) | — | FE, FE library |
| `SEC-22` | A07 Authentication Failures | CWE-922 | `localStorage`/`sessionStorage.setItem` ที่ key เป็น token, jwt, auth, session หรือ credential | — | FE, FE library |

ทุกผลเป็น `review-candidate` ระดับ evidence `text` และมี `severity` (critical/high/medium/low) ใน finding ส่วน authority มี `securityStandard` ที่บอก OWASP category, CWE และ `goldenBacking` (`golden-rule` หรือ `none`) โดย `resultStatus` เป็น `not-imported` เสมอ เพราะ lint ไม่นำเข้าและไม่อ้างผลสแกนของ scanner อื่น

## จากรายงาน scanner สู่กฎ

รายงาน VA/Web scan ทั่วไปปนสิ่งที่เป็นโค้ดกับสิ่งที่เป็น server หรือ network ตารางนี้คัดเฉพาะหมวดที่ scanner แนะนำหรือบังคับแก้ และบอกว่าหมวดใดตรวจจากโค้ดได้

| หมวดที่ scanner รายงาน | ตรวจจากโค้ด | Class |
| --- | --- | --- |
| Access Control: Authorization Bypass / Missing Authentication | ได้ | `SEC-05` (รวม endpoint fake/test/bypass ที่ควรลบ) |
| SQL Injection | ได้ | `SEC-01` |
| Server-Side Script / Command Injection | ได้ | `SEC-02` |
| LDAP Injection | ได้ | `SEC-03` |
| Dangerous File Inclusion / Path Traversal | ได้ | `SEC-04` |
| Poor Error Handling / Server Error Message | ได้ | `SEC-06` |
| Cross-Site Scripting (Reflected, DOM) | ได้บางส่วน | `SEC-21` ฝั่ง Angular; reflected XSS ใน API JSON ป้องกันที่ output encoding ของ client |
| Privacy Violation: HTTP GET (ค่าลับใน URL) | ได้ | `SEC-16` |
| Privacy Violation: Email / National ID Disclosure | ได้ | `SEC-17` จากชื่อ field ไม่ใช่จาก pattern ของค่า |
| JSON Web Token: Missing Protection Claims | ได้ | `SEC-10` |
| Weak Cryptographic Signature: Insufficient Key Size | ได้ | `SEC-08`, `SEC-10` |
| Often Misused: HTTP Method Override | ได้ | `SEC-14` |
| Denial of Service: Parse Double / ค่า input ไม่มีขอบเขต | ได้ | `SEC-18` |
| Insecure Transport: HSTS not Set / Insecure Content-Type / Cache Management | ได้บางส่วน | `SEC-19` (ยืนยันกับ gateway) |
| Insecure Transport: Missing Public Key Pinning | ไม่รับ | HPKP ถูก browser เลิกรองรับและเสี่ยงล็อกผู้ใช้; ใช้ HSTS แทน |
| HTTP Request Smuggling, Unpatched Application, Internal IP / banner ใน proxy | ไม่ได้ | เป็น server/proxy/gateway อยู่ใน catalog `be-security-deployment` |
| TLS cipher, SSH/FTP, ICMP, umask, OS/package CVE, database port เปิด | ไม่ได้ | เป็น infrastructure ไม่ใช่ application |
| Vulnerable components (A06) | ไม่ได้ | ต้องใช้ SCA/advisory database อยู่ใน catalog `be-security-dependencies` |

หมวดที่ไม่ได้ตรวจจากโค้ดยังต้องแก้ แต่ต้องตรวจที่ server, container, gateway หรือเครื่องมือ SCA ไม่ใช่ใน lint

ผลของ scanner อาจผิดได้ เช่น field ที่ชื่อ `FunctionID` ถูกมองว่าเป็นเลขประจำตัวเพราะรูปร่างของค่า `SEC-17` จึงดูชื่อ field ที่ระบุชัดเท่านั้น และยังเป็น candidate ที่ต้องยืนยัน

## แก้โดยไม่เปลี่ยน response ของผู้เรียกที่ถูกต้อง

ทุก class มี `responseContract` ที่ติดไปกับ report card และ prompt แก้ไข หลักคือ request ที่ถูกต้องและมีสิทธิ์ต้องได้ status, body และ wire names เดิม เปลี่ยนผลได้เฉพาะ request ที่เป็นอันตราย ผิดรูปแบบ หรือไม่มีสิทธิ์ Prompt ทุกชุดของ security สั่งให้เขียน regression test ของ request ที่ถูกต้องก่อนแก้ และย้ายจุดที่ต้องเปลี่ยน response ของผู้เรียกที่ถูกต้องไปกลุ่ม B พร้อมแผน migration

วิธีแก้บางแบบที่พบบ่อยในรายงาน scanner ทำให้ผู้ใช้จริงใช้งานไม่ได้ จึงไม่ใช้:

| วิธีที่ไม่ใช้ | ปัญหา | ใช้แทน |
| --- | --- | --- |
| ปฏิเสธหรือตัด `'`, `;`, `--` ออกจาก input | ชื่อและข้อความจริงมีอักขระเหล่านี้ และ blacklist ยังข้ามได้ | parameter หรือ allow-list ของ identifier (`SEC-01`) |
| ปฏิเสธ input ที่ “มี script” | ข้อความปกติถูกปฏิเสธ และ encoding อื่นยังผ่าน | output encoding / Angular sanitization (`SEC-21`) |
| เข้ารหัสหรือ mask email/เลขประจำตัวให้ทุกผู้เรียก | เจ้าของข้อมูลและเจ้าหน้าที่ที่มีสิทธิ์ได้ค่าผิด | authorization ระดับ record และแยก projection (`SEC-17`) |
| เปลี่ยนชื่อ query field เช่น `Username` เป็นชื่ออื่น | ค่ายังอยู่ใน URL และ log | ย้ายไป body/header แบบ migration (`SEC-16`) |
| clamp ค่า paging แบบเงียบ | ผู้เรียกได้ข้อมูลไม่ครบโดยไม่รู้ตัว | `[Range]` จากค่าที่ใช้จริงมากที่สุด และ validation error เดิม (`SEC-18`) |
| `Cache-Control: no-store` ทุก response | public asset เช่น map tile ช้าลงมาก | no-store เฉพาะ response ที่ยืนยันตัวตนหรือมีข้อมูลส่วนบุคคล (`SEC-19`) |
| เพิ่ม `[Authorize]` ทุก endpoint ทันที | login, refresh token และ health ใช้ไม่ได้ | ทำรายการ endpoint public ก่อน แล้วใส่ `[AllowAnonymous]` เฉพาะรายการ (`SEC-05`) |

## อ่านผล

Findings ของ security อยู่ในตารางรายกฎตามปกติ แต่ละ card มีบรรทัด `Security SEC-xx · OWASP · CWE` และ `Response contract:` ส่วน tag ของกฎคือ `SEC-xx` จึงกรองได้ทั้งใน report.md และ review.json ค่าจริงของ literal ไม่ถูกคัดลอกลง observation หรือ prompt รายงานเก็บเพียงชื่อ API, หมวดของค่า (เช่น “password”) และ digest

ใช้ `review.json` บันทึกข้อสรุปตามปกติ: `exception` เมื่อ gateway หรือ shared middleware ดูแลแล้ว หรือ endpoint public โดยเจตนา และ `needs-evidence` เมื่อยังไม่รู้แหล่งที่มาของค่า ดูขั้นตอนที่ [Workflows](WORKFLOWS.md)

## ขอบเขตที่ยังต้องใช้คนทบทวน

- เป็น lexical match ต่อไฟล์ ไม่มี data-flow หรือ taint analysis จึงไม่รู้ว่าค่ามาจากผู้ใช้จริงหรือจาก constant และไม่พิสูจน์ว่าโจมตีได้
- ไม่ resolve ข้ามไฟล์: base controller ที่มี `[Authorize]`, fallback policy ใน `Program.cs`, shared middleware และ header ที่ gateway ตั้งต้องตรวจเอง
- ไฟล์ `.html` ของ Angular ไม่ถูกเลือก จึงไม่ตรวจ binding ใน template ภายนอก
- ไม่ตรวจ object-level authorization (IDOR), mass assignment, CSRF, SSRF, file upload content และ rate limiting ซึ่งอยู่ใน catalog `be-security-dataflow` แบบ not-implemented
- ไม่มีผลใดหมายความว่า application ปลอดภัย การไม่พบ finding ไม่ใช่หลักฐานว่าไม่มีช่องโหว่ และไม่แทน penetration test หรือ scanner ของหน่วยงาน
