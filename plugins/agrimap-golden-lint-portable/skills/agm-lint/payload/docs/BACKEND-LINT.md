# ตรวจ backend ด้วย C# parser

[หน้าหลัก](../README.md) · [คู่มือคำสั่ง](USAGE.md) · [รายงานรายไฟล์](REPORTING.md)

กฎ C# ใช้ Microsoft Roslyn อ่าน syntax และ symbol ของ runtime ที่เชื่อถือได้ be-main (agmws/agmbo) มี 12 detectors และ be-library มี 4 detectors ด้านการตั้งชื่อ ทุกผลเป็น review-candidate เพื่อรักษา new/touched/legacy applicability และ public compatibility

## สิ่งที่ตรวจ

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
| be-member-naming | Naming | PascalCase ของ method/property/event/enum member ยกเว้น override และ explicit interface implementation |
| be-async-naming | ASYNC-02 | Method ที่คืน runtime Task แต่ไม่ลงท้าย Async |

กฎทั่วไปของ library ยังอยู่ใน boundary-review scope เดิม ชุดนี้ไม่ใช้ main-service namespace allowlist กับ AgriMap.Platform libraries

## เรียกใช้งาน

ใช้ existing .NET 8 runtime และระบุ absolute path ของ dotnet host ที่เชื่อถือ การ scan ไม่ติดตั้ง runtime หรือ build/restore project ให้

**PowerShell — authorized report write: บันทึกชุดรายงานใน .agrimap-agent ของโครงการ**

```powershell
$dotnetHost = (Get-Command dotnet).Source
node skills/agrimap-golden-lint-skills/scripts/agm-lint.mjs report --root '<backend-project-root>' --golden '<Golden-package-root>' --source-mode installed --dotnet $dotnetHost --authorize-output '<backend-project-root>/.agrimap-agent/reports/golden-lint'
```

TypeScript scopes ยังใช้ --typescript ตามเดิม Portfolio ที่มีทั้งสองภาษาให้ส่ง prerequisites ของทั้งสองชนิด path ของ dotnet ต้องอยู่นอก scanned/Golden roots และต้องเป็น host executable จริงที่ caller เชื่อถือ ไม่ใช่ไฟล์จาก product

## Trust และการอ่านอย่างเดียว

Package มี reader ที่ build ไว้แล้วกับ Microsoft Roslyn 4.11.0.0 และ MIT license ตรวจ exact SHA-256 ของไฟล์ทั้งหมดตาม csharp-parser-lock.json ก่อน execute Caller เลือก dotnet host อย่างชัดเจน; host digest และ trusted runtime metadata digests อยู่ใน analysisContract.csharp

Helper รับ selected source text ผ่าน stdin และคืนเฉพาะ locators, fixed case IDs และ hashes ไม่เปิด target project, MSBuild, target configs, analyzers, generators หรือ source assemblies และไม่ emit product assemblies Analysis ใช้ selected syntax trees กับ metadata ของ .NET runtime เท่านั้น ไม่มี target code execution

ปิด startup-hook/profiler injection settings และ runtime diagnostics ใน subprocess ใช้ cwd ของ packaged reader ไม่เขียน temp/cache ระหว่าง scan การ build reader เป็น maintainer command แยกจาก runtime เสมอ

อ้างอิงการใช้ syntax trees: [Microsoft Roslyn Syntax API](https://learn.microsoft.com/en-us/dotnet/csharp/roslyn-sdk/get-started/syntax-analysis)

## Implicit usings จาก .csproj

โครงการ .NET 6 ขึ้นไปส่วนใหญ่เปิด `<ImplicitUsings>enable</ImplicitUsings>` ทำให้ไฟล์ไม่มี `using System.Threading.Tasks;` ตั้งแต่ 0.1.6 runner อ่าน .csproj ที่ใกล้ไฟล์ที่สุดเป็นข้อความ (ไม่ evaluate MSBuild) ถ้าพบ property นี้แบบไม่มีเงื่อนไข จะเพิ่ม global usings มาตรฐานของ Microsoft.NET.Sdk (System, System.Collections.Generic, System.IO, System.Linq, System.Net.Http, System.Threading, System.Threading.Tasks) ให้เฉพาะไฟล์ของโครงการนั้น และตัด `<Using Remove="..."/>` ที่ระบุตรง ๆ ออก ผลคือ ASYNC-02/ASYNC-03 ตรวจ method และการเรียกที่คืน Task ได้จริงแทนการขึ้น ASYNC_SYMBOL_UNRESOLVED

แต่ละ .csproj ใช้ compilation แยกกัน global usings ของ service หนึ่งจึงไม่ปนกับอีก service ใน portfolio รายงานแสดงโครงการที่อ่านได้ในภาคผนวก (C# project context) และ digest ของ .csproj รวมอยู่ใน snapshot

## ขอบเขตที่ยังต้องเห็นในรายงาน

- ไม่ evaluate MSBuild, Directory.Build.props, `<Using Include>` items, package/project references, analyzers หรือ generators; ImplicitUsings ที่มีเงื่อนไขถือว่าไม่ทราบ ชื่อ Task ที่ยัง resolve ไม่ได้แสดง ASYNC_SYMBOL_UNRESOLVED ใน diagnostics ไม่ถือว่าปลอดภัยหรือเป็น Task จากชื่ออย่างเดียว
- ตำแหน่งของ `!` (NULL-02) ชี้ที่ตัว operator เอง จึงแยกจุดใน expression ที่ต่อกันอย่าง `a!.B!.C()!` ได้
- ไฟล์ที่มี conditional compilation เช่น #if ถูก blocked ด้วย CSHARP_CONDITIONAL_COMPILATION_CONTEXT_REQUIRED เพราะยังไม่มี build-symbol context ส่วน #nullable/#region ปกติยัง parse ได้
- Syntax errors แสดง error ตามไฟล์ ส่วนกฎ/ไฟล์อื่นยังประเมินได้ กรณีไม่มี host หรือ bundle drift จะ blocked ไม่ fallback กลับไป regex
- Missing prerequisites ทำให้ partial ตามจริง อย่าตีความ findings ว่างเป็นผ่าน
- CancellationToken propagation, signature migration, DI/logging/HTTP/JSON contracts, request precedence และ business/transaction semantics ยังไม่มี detector

ทุก finding อ้าง exact Golden entry และอยู่ในรายงานพร้อม file/line checklist และ prompt แก้ไขที่ส่งให้ `agm-be` ไม่มี autofix, product build/test หรือ SQL execution be-library ใช้ naming แบบ bounded โดยไม่บังคับ namespace allowlist ของ web service ดู [Naming lint](NAMING-LINT.md)

การตรวจค่าที่ฝังในโค้ด (secret, URL ของ environment, การเรียก external service ตรง, environment selector และ business limit) ใช้ tier ของ Golden และทะเบียนข้อยกเว้นที่จำข้ามรอบ — ดู [Hardcode lint](HARDCODE-LINT.md)
