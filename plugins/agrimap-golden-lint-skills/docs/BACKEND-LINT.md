# ตรวจ backend ด้วย C# parser

[หน้าหลัก](../README.md) · [คู่มือคำสั่ง](USAGE.md) · [รายงานรายไฟล์](REPORTING.md)

กฎ C# ใช้ Microsoft Roslyn อ่าน syntax และ symbol ของ runtime ที่เชื่อถือได้ be-main (agmws/agmbo) มี 22 detectors และ be-library มี 6 detectors (ตั้งชื่อ, NS-01 และ ADV-01) ทุกผลเป็น review-candidate เพื่อรักษา new/touched/legacy applicability และ public compatibility

## สิ่งที่ตรวจ

| Detector | Golden | ขอบเขต |
| --- | --- | --- |
| be-namespace-observation | Namespaces, files, and naming | AST namespace และ ordinary using references; ไม่กล่าวหา alias/static using เป็น namespace โดยอัตโนมัติ |
| be-file-layout | NS-01 | using ต้องอยู่ก่อน namespace และมีบรรทัดว่างหนึ่งบรรทัดระหว่าง using, `namespace Name;` และ type; ไม่ตรวจ spacing เมื่อมี assembly attributes |
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
| be-method-branches | QUALITY-01 | if/else-if มากกว่า 7 ต่อ function scope รวม nested; ไม่ใช่คะแนน S3776 |
| be-parameter-count | QUALITY-02 | Parameters มากกว่า 7 ของ method/constructor/local function (เกี่ยวกับ S107) |
| be-nested-ternary | QUALITY-03 | Ternary ซ้อน รวมใน anonymous-object member (เกี่ยวกับ S3358) |
| be-overload-adjacency | ADV-01 (advisory) | Overloads ชื่อเดียวกันที่ถูกคั่นด้วย member อื่นใน type เดียวกัน (เกี่ยวกับ S4136) |
| be-caller-info-argument | ADV-04 (advisory) | ส่ง paramName เองให้ ArgumentNullException/ArgumentException/ArgumentOutOfRangeException guards (เกี่ยวกับ S3236) |
| be-unused-local | ADV-05 (advisory) | Local declaration ที่ไม่ถูกอ้างอีกใน block ไม่รวม using declaration และ `_` (เกี่ยวกับ S1481) |
| be-dispose-suppress-finalize | ADV-07 (advisory) | Dispose() ของ class ที่ระบุ IDisposable ตรง ๆ ไม่ sealed หรือมี finalizer แต่ไม่เรียก GC.SuppressFinalize (เกี่ยวกับ CA1816) |
| be-constant-array-argument | ADV-08 (advisory) | สร้าง array ที่ทุก element เป็น literal, typeof หรือ nameof แล้วส่งเป็น argument ตรง ๆ (เกี่ยวกับ CA1861) ไม่รวม attribute, collection expression และ const identifier |
| be-generated-regex | ADV-09 (advisory) | Regex.IsMatch/Match/Replace/Split และ new Regex ที่ pattern เป็น string literal (เกี่ยวกับ SYSLIB1045) ไม่ตรวจ timeout ของ S6444 และไม่ resolve TargetFramework |

สามกฎ QUALITY เป็น lint candidate ตาม Golden ไม่ใช่ผลสแกน SonarQube รายงานแสดง Sonar key ที่เกี่ยวข้องพร้อม `ไม่ได้นำเข้า` และไม่สรุปว่า Quality Gate ผ่านหรือไม่ผ่าน คะแนน S3776 และการแจ้งผู้ขอ (QUALITY-04) ตรวจจาก AST ไม่ได้ prompt แก้ไขจึงสั่ง agent ให้ทำตาม notice contract ใน sonarqube-remediation.md ของ Golden ก่อนและหลังแก้ ดู [Rule mapping](../skills/agrimap-golden-lint-skills/references/RULE-MAPPING.md#sonarqube-aligned-bindings-ใน-0112)

กฎ ADV เป็น advisory ตาม QUALITY-05 ของ Golden: ทีมตกลงว่าแก้หรือไม่แก้ก็ได้ รายงานจึงเรียงไว้ท้ายตาราง ติดป้าย advisory และระบุว่าค่าเริ่มต้นคือ recommendation prompt แก้ใช้เมื่อผู้ขอสั่งแก้และหลักฐานพิสูจน์ว่าไม่เปลี่ยน behavior/contract เท่านั้น ถ้าไม่แก้ให้บันทึก exception ใน review.json ADV-08/09 ตรวจด้วย syntax เท่านั้น จึงอาจพลาด const pattern หรือ array ที่สร้างจากค่าคงที่ที่ประกาศแยก และ ADV-08 ใน test assert อยู่ใน Tests/ ที่ไม่ได้ scan ADV-02 (static candidates), ADV-03 (redundant cast) ต้องใช้ type ของโครงการเต็มรูปแบบ และ ADV-06 (xUnit2032) อยู่ใน Tests/ ที่ไม่ได้ scan จึงเป็น not-implemented

AgriMap.Platform libraries ใช้ be-library-file-layout (NS-01 จาก reader เดียวกัน และ block namespace ซึ่งต้องคงชื่อ namespace ที่ publish แล้ว) และ be-library-overload-adjacency (ADV-01 advisory) เพิ่มจาก naming กฎทั่วไปของ library ยังอยู่ใน boundary-review scope เดิม ชุดนี้ไม่ใช้ main-service namespace allowlist กับ libraries และ ADV-04/05/07 ยังตรวจเฉพาะ be-main

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
