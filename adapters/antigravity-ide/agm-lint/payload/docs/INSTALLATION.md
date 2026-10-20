# ติดตั้งสกิลให้ตรง host

[หน้าหลัก](../README.md) · [ทดลองครั้งแรก](GETTING-STARTED.md) · [แก้ปัญหา](TROUBLESHOOTING.md)

เลือกเฉพาะ host ที่ใช้ แล้วเปิด session ใหม่หลังติดตั้ง หากต้องการใช้ Node runner อย่างเดียว ข้ามหน้านี้ไป [Getting Started](GETTING-STARTED.md) ได้

## ก่อนติดตั้ง

Host adapters มีตั้งแต่ 0.1.2; release **0.1.5** เพิ่ม naming และรายงานติดตามแก้ไข สำหรับ Codex และ Claude ใช้ชื่อ GitHub repository ในคำสั่งด้านล่างได้ทันที ส่วน host ที่ใช้ bundle directory ให้เลือก source checkout รุ่นที่ต้องการ เช่น tag v0.1.5 หรือ hosts ZIP จาก [Versions](VERSIONS.md) ซึ่งมี catalogs, plugins และ IDE payload ครบ layout เดียวกัน ZIP/tag v0.1.1 เดิมไม่มี adapters เหล่านี้ ตรวจ checksum ก่อนแตก ZIP และเก็บ directory ไว้ตลอดเวลาที่ใช้เป็น local source

เตรียม CLI/application ของ host ที่ลงชื่อเข้าใช้แล้ว, Node 22+, แหล่ง Golden 5.0.2 ที่ตรง source lock และ trusted TypeScript 5.9.3 เมื่อใช้ syntax rules การติดตั้งเปลี่ยน plugin/extension/skill state ของ host; การ scan เป็นการอ่านอย่างเดียว

ตัวอย่างด้านล่างเป็น **คำสั่ง Terminal / PowerShell สำหรับติดตั้ง** Codex/Claude ใช้ GitHub source โดยตรง การทดลอง source ในเครื่องแยกไว้ในหัวข้อ ติดตั้งจาก local source ด้านล่าง

## Codex

```powershell
codex plugin marketplace add cognivex006/agrimap-golden-lint-skills
codex plugin add agrimap-golden-lint-skills@agrimap-golden-lint-skills
```

เพิ่ม marketplace แล้วต้องเพิ่ม plugin ด้วย เปิด session ใหม่และเรียก `$agm-lint` หรือชื่อที่ host แสดง ตรวจ grammar ด้วย Codex CLI 0.162.1 แล้ว แต่ยังไม่ได้ติดตั้งใน profile จริง

รูปแบบอ้างจาก [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins) การส่งเข้ารายการสาธารณะหรือเผยแพร่ระดับ workspace เป็นงานอีกส่วนหนึ่ง

## Claude Code

```powershell
claude plugin marketplace add cognivex006/agrimap-golden-lint-skills
claude plugin install agrimap-golden-lint-skills@agrimap-golden-lint-skills
```

เปิด session ใหม่และเรียก `/agrimap-golden-lint-skills:agm-lint` ตามชื่อที่ host แสดง Native manifest validation ด้วย Claude Code 2.1.212 ผ่านแล้ว ส่วน authenticated Agent session ยังไม่ได้ทดสอบ

ดู [Claude marketplace installation](https://code.claude.com/docs/en/plugin-marketplaces)

## ติดตั้งจาก local source

ใช้เมื่อต้องการ source ที่เพิ่งแก้ในเครื่องหรือ pin ด้วย hosts ZIP ที่ตรวจ checksum แล้ว เปิด Terminal ที่ root ซึ่งมี `.agents/plugins/marketplace.json` และ `.claude-plugin/marketplace.json` แล้วเลือก host เดียว:

**Codex — ติดตั้งจาก directory ปัจจุบัน:**

```powershell
codex plugin marketplace add .
codex plugin add agrimap-golden-lint-skills@agrimap-golden-lint-skills
```

**Claude Code — ติดตั้งจาก directory ปัจจุบัน:**

```powershell
claude plugin marketplace add .
claude plugin install agrimap-golden-lint-skills@agrimap-golden-lint-skills
```

ถ้าชื่อ marketplace เดิมชี้ source อื่นอยู่ ให้ตรวจ registration/help ของ host ก่อน ไม่ถือว่า add ซ้ำเปลี่ยน source/cache สำเร็จ

## Gemini CLI

```powershell
gemini extensions install ./plugins/agrimap-golden-lint-skills
gemini extensions list
```

เปิด Terminal ที่ root ของ source checkout หรือ hosts ZIP ที่แตกแล้ว จากนั้นเปิด session ใหม่ extension มี `agm-lint` และ `GEMINI-RUNTIME.md` ใช้ขั้นตอน consent ตาม host ปกติ เครื่องที่ใช้ตรวจ package นี้ไม่มี Gemini CLI จึงตรวจเพียงโครงสร้างและ bundle runner

ดู [Gemini extension reference](https://geminicli.com/docs/extensions/reference/)

## Antigravity CLI

```powershell
agy plugin install ./plugins/agrimap-golden-lint-antigravity
agy plugin list
```

เปิด Terminal ที่ root ของ source checkout หรือ hosts ZIP ที่แตกแล้ว ใช้ dedicated bundle ที่มี minimal `plugin.json` เลข scanner version อยู่ใน `package.json` นี่เป็น local/custom plugin route ยังไม่ได้ยืนยันการอยู่ใน curated marketplace เครื่องที่ใช้ตรวจไม่มี `agy` จึงยังไม่ผ่าน native installation test

ดู [Antigravity plugins](https://antigravity.google/docs/plugins)

## Antigravity IDE

ติดตั้งทั้งโฟลเดอร์ `adapters/antigravity-ide/agm-lint` พร้อม payload ลงใน skill parent ที่มีอยู่แล้ว เช่น `~/.gemini/config/skills/` หรือ `<workspace>/.agents/skills/` อย่าคัดลอกเฉพาะ `SKILL.md` เพราะ runner อยู่ใน payload

ตัวช่วยใน source checkout รับ **ปลายทางใหม่** ที่ระบุชัดเจน คำสั่งนี้เขียนไฟล์ติดตั้ง:

```powershell
node tools/install-host.mjs antigravity-ide --to '<absolute-existing-skill-parent>/agm-lint'
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
| Codex | CLI grammar, bundle structure และ runner; สถานะ profile ตรวจแยกจาก package | การโหลดใน Agent session ใหม่หลังอัปเดต |
| Claude Code | Native manifest validation และ runner | Authenticated Agent session |
| Gemini CLI | Structure และ runner | Native CLI install/activation |
| Antigravity CLI | Structure และ runner | Native CLI install/activation |
| Antigravity IDE | Copy helper และ runner fixtures | IDE activation |

Bundles มีเฉพาะ runtime allowlist ไม่รวม `.agrimap-agent`, tests, tools หรือ maintainer instructions และไม่ลง hooks, MCP server, background process หรือ product bootstrap ให้ ข้อความว่า bundle ตรวจผ่านไม่เท่ากับติดตั้งใช้งานจริงผ่านทุก host

## รุ่น local 0.1.5 และการอัปเดต

Release ปัจจุบันเป็น 0.1.5 ใช้ GitHub marketplace instructions ด้านบน หรือเลือก local-source เมื่อต้องการ checkout ที่กำหนด ตรวจ marketplace source ก่อน update; อย่าเขียนทับ cache ด้วยมือ หากเปลี่ยน registration เป็น local จะผูกกับ checkout นี้จนเปลี่ยนกลับ

Codex ใช้ plugin marketplace upgrade และ plugin add; Claude ใช้ plugin marketplace update และ plugin install/update ตาม CLI help ของรุ่นที่ติดตั้ง หลังติดตั้งตรวจ package.json และ manifest เป็น 0.1.5 แล้วเปิด session ใหม่ Session เดิมอาจยังถือ skill metadata เก่า

Gemini ใช้ gemini-extension.json + skills directory ตาม [official extension reference](https://geminicli.com/docs/extensions/reference/) และ Antigravity ใช้ plugin.json + skills ตาม [official plugin reference](https://www.antigravity.google/docs/plugins?tab=cli) ตรวจแหล่งเหล่านี้สำหรับรุ่น host ปัจจุบัน ทั้งคู่ใช้ runner และ report template เดียวกับ Codex/Claude; ถ้าไม่มี native CLI ต้องระบุว่า activation ยังไม่ได้ทดสอบ ไม่อ้างว่าเป็น Codex-only
