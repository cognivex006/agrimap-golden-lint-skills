# ตรวจ backend ด้วย C# parser

[หน้าหลัก](../README.md) · [คู่มือคำสั่ง](USAGE.md) · [รายงานรายไฟล์](REPORTING.md)

Release 0.1.4 เพิ่ม detector C# 9 ตัว และย้าย namespace detector เดิมจาก lexical matching เป็น Roslyn รวม 10 ตัวสำหรับ be-main ทั้ง agmws/agmbo ทุกผลเป็น review-candidate เพื่อรักษา new/touched/legacy applicability และ public compatibility

## สิ่งที่ตรวจในชุดแรก

| Detector | Golden | ขอบเขต |
| --- | --- | --- |
| be-namespace-observation | Namespaces, files, and naming | AST namespace และ ordinary using references; ไม่กล่าวหา alias/static using เป็น namespace โดยอัตโนมัติ |
| be-public-type-count | One public type per file | นับ explicit public types รวม nested และ delegate; flag declaration ตั้งแต่ตัวที่สองให้ทบทวน published contract |
| be-type-naming | Naming | Uppercase-initial/no-underscore type shape และ I + uppercase สำหรับ interface ไม่อ้างว่าตรวจ naming ทุกกรณี |
| be-dependency-naming | Naming | _camelCase ของ private readonly field ที่ AST แสดงการรับค่าจาก constructor parameter รวม primary constructor; ไม่เหมารวม state fields |
| be-role-naming | MUST naming and shape | Public top-level type กับ suffix RequestDto/ResponseDto/UseCase/Repository ตามโฟลเดอร์ ยกเว้น enum; ต้องยืนยันความรับผิดชอบจริง |
| be-repository-placement | REPO-01 | Repository-named public interface/implementation กับ Persistence/Interfaces หรือ Repositories ไม่ตัดสินความหมายของ model |
| be-null-forgiving | NULL-02 | Null-forgiving operator จริง ไม่จับ ! ใน comment/string หรือ logical negation |
| be-null-comparison | NULL-03 | Equality/inequality กับ null literal รวม parentheses; ต้องทบทวน overloaded operators ก่อนแก้ |
| be-empty-catch | ERR-04 | Catch block ที่ไม่มี statements ไม่อ้างว่าพิสูจน์ error handling ทุกชนิด |
| be-async-blocking | ASYNC-03 | Result, Wait/WaitAll/WaitAny, Task/ValueTask awaiter GetResult และ awaited Task.FromResult เฉพาะ symbols ของ runtime ที่ resolve ได้ |

กฎทั่วไปของ library ยังอยู่ใน boundary-review scope เดิม ชุดนี้ไม่ใช้ main-service namespace allowlist กับ AgriMap.Platform libraries

## เรียกใช้งาน

ใช้ existing .NET 8 runtime และระบุ absolute path ของ dotnet host ที่เชื่อถือ การ scan ไม่ติดตั้ง runtime หรือ build/restore project ให้

**PowerShell — อ่านอย่างเดียว:**

```powershell
$dotnetHost = (Get-Command dotnet).Source
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs scan --root '<backend-project-root>' --golden '<Golden-package-root>' --source-mode installed --dotnet $dotnetHost
```

TypeScript scopes ยังใช้ --typescript ตามเดิม Portfolio ที่มีทั้งสองภาษาให้ส่ง prerequisites ของทั้งสองชนิด path ของ dotnet ต้องอยู่นอก scanned/Golden roots และต้องเป็น host executable จริงที่ caller เชื่อถือ ไม่ใช่ไฟล์จาก product

## Trust และการอ่านอย่างเดียว

Package มี reader ที่ build ไว้แล้วกับ Microsoft Roslyn 4.11.0.0 และ MIT license ตรวจ exact SHA-256 ของไฟล์ทั้งหมดตาม csharp-parser-lock.json ก่อน execute Caller เลือก dotnet host อย่างชัดเจน; host digest และ trusted runtime metadata digests อยู่ใน analysisContract.csharp

Helper รับ selected source text ผ่าน stdin และคืนเฉพาะ locators, fixed case IDs และ hashes ไม่เปิด target project, MSBuild, target configs, analyzers, generators หรือ source assemblies และไม่ emit product assemblies Analysis ใช้ selected syntax trees กับ metadata ของ .NET runtime เท่านั้น ไม่มี target code execution

ปิด startup-hook/profiler injection settings และ runtime diagnostics ใน subprocess ใช้ cwd ของ packaged reader ไม่เขียน temp/cache ระหว่าง scan การ build reader เป็น maintainer command แยกจาก runtime เสมอ

อ้างอิงการใช้ syntax trees: [Microsoft Roslyn Syntax API](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/get-started/syntax-analysis)

## ขอบเขตที่ยังต้องเห็นในรายงาน

- ไม่โหลด implicit usings หรือ references ของ target project ชื่อ Task ที่ยัง resolve ไม่ได้แสดง ASYNC_SYMBOL_UNRESOLVED ใน diagnostics ไม่ถือว่าปลอดภัยหรือเป็น Task จากชื่ออย่างเดียว
- ไฟล์ที่มี conditional compilation เช่น #if ถูก blocked ด้วย CSHARP_CONDITIONAL_COMPILATION_CONTEXT_REQUIRED เพราะยังไม่มี build-symbol context ส่วน #nullable/#region ปกติยัง parse ได้
- Syntax errors แสดง error ตามไฟล์ ส่วนกฎ/ไฟล์อื่นยังประเมินได้ กรณีไม่มี host หรือ bundle drift จะ blocked ไม่ fallback กลับไป regex
- Missing prerequisites ทำให้ partial ตามจริง อย่าตีความ findings ว่างเป็นผ่าน
- CT propagation, Async suffix/signature migration, DI/logging/HTTP/JSON contracts, request precedence และ business/transaction semantics ยังไม่เพิ่มในชุดนี้

ทุก finding ต้องอ้าง exact Golden entry และใช้รายงานพร้อม file/line checklist ไม่มี autofix, product build/test หรือ SQL execution
