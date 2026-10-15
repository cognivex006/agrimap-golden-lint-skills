# ติดตั้งสกิลให้ตรง host

[หน้าหลัก](../README.md) · [ทดลองครั้งแรก](GETTING-STARTED.md) · [แก้ปัญหา](TROUBLESHOOTING.md)

เลือกเฉพาะ host ที่ใช้ แล้วเปิด session ใหม่หลังติดตั้ง หากต้องการใช้ Node runner อย่างเดียว ข้ามหน้านี้ไป [Getting Started](GETTING-STARTED.md) ได้

## ก่อนติดตั้ง

Host adapters อยู่ใน **release 0.1.2** เลือก source checkout ที่ tag v0.1.2 หรือ hosts ZIP จาก [Versions](VERSIONS.md) ซึ่งมี marketplace catalogs, plugins และ IDE payload ครบ layout เดียวกับ checkout ส่วน ZIP/tag v0.1.1 เดิมไม่มี adapters เหล่านี้ ตรวจ checksum ก่อนแตกไฟล์ไปยังโฟลเดอร์ว่างและเก็บโฟลเดอร์นี้ไว้ตลอดเวลาที่ host ใช้เป็น local source

เตรียม CLI/application ของ host ที่ลงชื่อเข้าใช้แล้ว, Node 22+, แหล่ง Golden 4.11.0 ที่ตรง source lock และ trusted TypeScript 5.9.3 เมื่อใช้ syntax rules การติดตั้งเปลี่ยน plugin/extension/skill state ของ host; การ scan เป็นการอ่านอย่างเดียว

ตัวอย่างทั้งหมดด้านล่างเป็น **คำสั่ง Terminal / PowerShell สำหรับติดตั้ง** แทน `<checkout-root>` ด้วย absolute path ของ lint checkout หรือ root ที่แตก hosts ZIP ไม่ใช่ path ของโครงการ product

## Codex

```powershell
codex plugin marketplace add '<checkout-root>'
codex plugin add agrimap-golden-lint-skills@agrimap-golden-lint-skills
```

เพิ่ม marketplace แล้วต้องเพิ่ม plugin ด้วย เปิด session ใหม่และเรียก `$agm-lint` หรือชื่อที่ host แสดง ตรวจ grammar ด้วย Codex CLI 0.162.1 แล้ว แต่ยังไม่ได้ติดตั้งใน profile จริง

รูปแบบอ้างจาก [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins) การส่งเข้ารายการสาธารณะหรือเผยแพร่ระดับ workspace เป็นงานอีกส่วนหนึ่ง

## Claude Code

```powershell
claude plugin marketplace add '<checkout-root>'
claude plugin install agrimap-golden-lint-skills@agrimap-golden-lint-skills
```

เปิด session ใหม่และเรียก `/agrimap-golden-lint-skills:agm-lint` ตามชื่อที่ host แสดง Native manifest validation ด้วย Claude Code 2.1.212 ผ่านแล้ว ส่วน authenticated Agent session ยังไม่ได้ทดสอบ

ดู [Claude marketplace installation](https://code.claude.com/docs/en/plugin-marketplaces)

## Gemini CLI

```powershell
gemini extensions install '<checkout-root>/plugins/agrimap-golden-lint-skills'
gemini extensions list
```

เปิด session ใหม่ extension มี `agm-lint` และ `GEMINI-RUNTIME.md` ใช้ขั้นตอน consent ตาม host ปกติ เครื่องที่ใช้ตรวจ package นี้ไม่มี Gemini CLI จึงตรวจเพียงโครงสร้างและ bundle runner

ดู [Gemini extension reference](https://geminicli.com/docs/extensions/reference/)

## Antigravity CLI

```powershell
agy plugin install '<checkout-root>/plugins/agrimap-golden-lint-antigravity'
agy plugin list
```

ใช้ dedicated bundle ที่มี minimal `plugin.json` เลข scanner version อยู่ใน `package.json` นี่เป็น local/custom plugin route ยังไม่ได้ยืนยันการอยู่ใน curated marketplace เครื่องที่ใช้ตรวจไม่มี `agy` จึงยังไม่ผ่าน native installation test

ดู [Antigravity plugins](https://antigravity.google/docs/plugins)

## Antigravity IDE

ติดตั้งทั้งโฟลเดอร์ `adapters/antigravity-ide/agm-lint` พร้อม payload ลงใน skill parent ที่มีอยู่แล้ว เช่น `~/.gemini/config/skills/` หรือ `<workspace>/.agents/skills/` อย่าคัดลอกเฉพาะ `SKILL.md` เพราะ runner อยู่ใน payload

ตัวช่วยใน source checkout รับ **ปลายทางใหม่** ที่ระบุชัดเจน คำสั่งนี้เขียนไฟล์ติดตั้ง:

```powershell
node tools/install-host.mjs antigravity-ide --to '<absolute-existing-skill-parent>/agm-lint' --authorize-output '<absolute-existing-skill-parent>/agm-lint'
```

หากปลายทางมีอยู่แล้วจะปฏิเสธ ไม่เขียนทับ ไม่เปลี่ยน settings/profile อื่น และปฏิเสธ path indirection การ copy และ bundle runner ผ่าน isolated fixtures แล้ว; IDE activation ยังไม่ได้ทดสอบ

## ทดลองหลังติดตั้ง

พิมพ์ **ในช่องสนทนา Agent** โดยใช้ชื่อเรียกของ host:

```text
ช่วยใช้ agm-lint ตรวจโครงการที่ระบุ โดยใช้ Golden source, source mode และ parser ที่เตรียมไว้ สรุป findings พร้อมหลักฐาน ยังไม่แก้ไฟล์
```

Agent ต้องหา runner จาก directory ของสกิลที่โหลด ไม่ใช่ product cwd หรือ cache path ที่เดาเอง ดูชื่อ arguments และผลที่ควรได้ใน [Usage](USAGE.md)

## เช็กสถานะให้ตรงกับหลักฐาน

| Host | ผ่านการตรวจอะไรแล้ว | ยังไม่ได้ยืนยันอะไร |
| --- | --- | --- |
| Codex | CLI grammar, bundle structure และ runner | การติดตั้งใน profile และ Agent session จริง |
| Claude Code | Native manifest validation และ runner | Authenticated Agent session |
| Gemini CLI | Structure และ runner | Native CLI install/activation |
| Antigravity CLI | Structure และ runner | Native CLI install/activation |
| Antigravity IDE | Copy helper และ runner fixtures | IDE activation |

Bundles มีเฉพาะ runtime allowlist ไม่รวม `.agrimap-agent`, tests, tools หรือ maintainer instructions และไม่ลง hooks, MCP server, background process หรือ product bootstrap ให้ ข้อความว่า bundle ตรวจผ่านไม่เท่ากับติดตั้งใช้งานจริงผ่านทุก host
