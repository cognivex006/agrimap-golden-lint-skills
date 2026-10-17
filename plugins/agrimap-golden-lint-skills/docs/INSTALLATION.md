# ติดตั้งสกิลตาม host

[หน้าหลัก](../README.md) · [เริ่มใช้งาน](GETTING-STARTED.md) · [แก้ปัญหา](TROUBLESHOOTING.md)

เลือกเฉพาะ host ที่ใช้ ติดตั้งแล้วเปิด session ใหม่ทุกครั้ง หากจะใช้ Node runner ผ่าน Terminal อย่างเดียว ข้ามหน้านี้ไป [Getting Started](GETTING-STARTED.md) ได้

## สรุปทุก host

| Host | วิธีติดตั้ง | เรียกใช้ในแชท | Bundle ที่ใช้ |
| --- | --- | --- | --- |
| Codex | GitHub marketplace | `$agm-lint` | `plugins/agrimap-golden-lint-skills` |
| Claude Code | GitHub marketplace | `/agrimap-golden-lint-skills:agm-lint` | `plugins/agrimap-golden-lint-skills` |
| Cursor | Plugin จาก GitHub หรือ copy skill | `/agm-lint` | `plugins/agrimap-golden-lint-portable` |
| Gemini CLI | extension จาก directory | ตามชื่อที่ CLI แสดง | `plugins/agrimap-golden-lint-skills` |
| Antigravity CLI | plugin จาก directory | ตามชื่อที่ CLI แสดง | `plugins/agrimap-golden-lint-antigravity` |
| Antigravity IDE / Agent Skills อื่น | copy skill folder | ตามชื่อที่ IDE แสดง | `plugins/agrimap-golden-lint-portable/skills/agm-lint` |

ทุก bundle มี runner, report template, กฎ และเอกสารผู้ใช้ชุดเดียวกัน ไม่รวม tests, tools, maintainer instructions หรือ `.agrimap-agent` และไม่ลง hooks, MCP server หรือ background process

## ก่อนติดตั้ง

- CLI/application ของ host ที่ลงชื่อเข้าใช้แล้ว และ Node 22+
- agrimap-agent-skills 5.0.2 สำหรับเป็นแหล่ง Golden
- ถ้าติดตั้งจาก directory ให้ใช้ source checkout รุ่นที่ต้องการ (เช่น tag `v0.1.7`) หรือ hosts ZIP ที่ตรวจ SHA-256 แล้วตาม [Versions](VERSIONS.md) และเก็บ directory นั้นไว้ตลอดเวลาที่ใช้

การติดตั้งเปลี่ยน plugin/skill state ของ host เท่านั้น การ scan ไม่ติดตั้งอะไรเพิ่ม คำสั่งด้านล่างทั้งหมดรันใน **Terminal / PowerShell**

## Codex

```powershell
codex plugin marketplace add orchex006/agrimap-golden-lint-skills
codex plugin add agrimap-golden-lint-skills@agrimap-golden-lint-skills
```

ต้องรันทั้งสองคำสั่ง แล้วเปิด session ใหม่และเรียก `$agm-lint` รูปแบบ manifest อ้างจาก [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins)

## Claude Code

```powershell
claude plugin marketplace add orchex006/agrimap-golden-lint-skills
claude plugin install agrimap-golden-lint-skills@agrimap-golden-lint-skills
```

เปิด session ใหม่และเรียก `/agrimap-golden-lint-skills:agm-lint` ดู [Claude marketplace installation](https://code.claude.com/docs/en/plugin-marketplaces)

## Cursor

Cursor กำหนดให้ชื่อ skill ตรงกับชื่อโฟลเดอร์ จึงใช้ portable bundle ที่โฟลเดอร์ชื่อ `agm-lint` เลือกหนึ่งวิธี:

**วิธีที่ 1 — Plugin จาก GitHub:** เปิด Cursor → Customize → Plugins แล้วเลือก **From GitHub Repository** ใส่ `https://github.com/orchex006/agrimap-golden-lint-skills` Repository มี `.cursor-plugin/marketplace.json` ที่ชี้ไปยัง `plugins/agrimap-golden-lint-portable` ทีมที่ใช้ team marketplace เพิ่ม repository เดียวกันเป็น marketplace แล้วติดตั้ง plugin ได้

**วิธีที่ 2 — Copy skill เข้าโฟลเดอร์ skills:** ใช้ได้ทั้งระดับผู้ใช้ (`~/.cursor/skills/`) และระดับโครงการ (`<workspace>/.cursor/skills/`) คำสั่งนี้รันจาก source checkout และเขียนเฉพาะ directory ใหม่ที่ระบุ:

```powershell
node tools/install-host.mjs cursor --to "$HOME\.cursor\skills\agm-lint"
```

ถ้าใช้ hosts ZIP ให้คัดลอกทั้งโฟลเดอร์ `plugins/agrimap-golden-lint-portable/skills/agm-lint` (รวม `payload/`) ไปที่ปลายทางเดียวกัน อย่าคัดลอกเฉพาะ SKILL.md เพราะ runner อยู่ใน payload

เปิด Agent chat ใหม่ พิมพ์ `/` แล้วเลือก `agm-lint` ดู [Cursor skills](https://cursor.com/docs/skills) และ [Cursor plugins reference](https://cursor.com/docs/reference/plugins)

## Gemini CLI

```powershell
gemini extensions install ./plugins/agrimap-golden-lint-skills
gemini extensions list
```

รันจาก root ของ source checkout หรือ hosts ZIP ที่แตกแล้ว extension มี `agm-lint` และ `GEMINI-RUNTIME.md` ดู [Gemini extension reference](https://geminicli.com/docs/extensions/reference/)

## Antigravity CLI

```powershell
agy plugin install ./plugins/agrimap-golden-lint-antigravity
agy plugin list
```

ใช้ bundle เฉพาะที่มี `plugin.json` แบบ minimal ตาม manifest ของ Antigravity เลข version อยู่ใน `package.json` ของ bundle ดู [Antigravity plugins](https://antigravity.google/docs/plugins)

## Antigravity IDE และ host ที่รองรับ Agent Skills

คัดลอกโฟลเดอร์ `plugins/agrimap-golden-lint-portable/skills/agm-lint` ทั้งโฟลเดอร์ไปยัง skills directory ที่มีอยู่แล้ว เช่น `~/.gemini/config/skills/` หรือ `<workspace>/.agents/skills/` จาก source checkout ใช้ตัวช่วยที่เขียนเฉพาะปลายทางใหม่:

```powershell
node tools/install-host.mjs antigravity-ide --to '<absolute-existing-skills-directory>/agm-lint'
```

ใช้ host `agent-skills` แทน `antigravity-ide` สำหรับ host อื่นที่อ่าน `.agents/skills` ตัวช่วยปฏิเสธปลายทางที่มีอยู่แล้ว ปลายทางที่ไม่ได้ชื่อ `agm-lint` และ path ที่ผ่าน junction/symlink ไม่แก้ settings อื่นของ profile

## ติดตั้งจาก source ในเครื่อง

ใช้เมื่อต้องการทดลอง working copy เปิด Terminal ที่ root ซึ่งมี `.agents/plugins/marketplace.json` และ `.claude-plugin/marketplace.json`

**Codex:**

```powershell
codex plugin marketplace add .
codex plugin add agrimap-golden-lint-skills@agrimap-golden-lint-skills
```

**Claude Code:**

```powershell
claude plugin marketplace add .
claude plugin install agrimap-golden-lint-skills@agrimap-golden-lint-skills
```

ถ้าชื่อ marketplace เดิมชี้ source อื่นอยู่ ให้ตรวจ registration ด้วยคำสั่ง list/help ของ host ก่อน การ add ซ้ำไม่ได้รับประกันว่า source หรือ cache เปลี่ยน และ registration แบบ local จะผูกกับ checkout นี้จนเปลี่ยนกลับ

## ทดลองหลังติดตั้ง

พิมพ์ **ในช่องสนทนา Agent**:

```text
ใช้ agm-lint ตรวจโครงการ <project-root> เทียบ Golden แล้วบันทึกรายงานใน .agrimap-agent ยังไม่แก้โค้ด
```

ผลที่ควรได้คือสรุปที่มีตารางรายกฎ ไฟล์ที่พบมากที่สุด และ path ของ `report.md` หาก Agent ตอบว่าไม่พบ runner ให้ตรวจว่าคัดลอกโฟลเดอร์ครบรวม `payload/` (Cursor/IDE) หรือ plugin ติดตั้งสำเร็จ (Codex/Claude)

## อัปเดตเป็นรุ่นใหม่

Codex ใช้ `codex plugin marketplace upgrade` แล้ว `codex plugin add` ส่วน Claude ใช้ `claude plugin marketplace update` แล้ว `claude plugin update` หรือ `install` ตาม help ของรุ่นที่ติดตั้ง Cursor แบบ plugin อัปเดตจากหน้า Plugins แบบ copy ให้ลบโฟลเดอร์ `agm-lint` เดิมด้วยตนเองแล้วติดตั้งใหม่ ตรวจว่า `package.json` ใน bundle เป็น 0.1.7 แล้วเปิด session ใหม่ เพราะ session เดิมอาจยังถือ skill metadata เก่า อย่าเขียนทับ cache ของ host ด้วยมือ

## สถานะการตรวจของแต่ละ host

| Host | ตรวจแล้ว | ยังไม่ได้ยืนยัน |
| --- | --- | --- |
| Codex | CLI grammar, bundle structure และ runner | การโหลดใน session ใหม่หลังอัปเดตเป็น 0.1.7 |
| Claude Code | Native manifest validation และ runner | Authenticated Agent session กับ 0.1.7 |
| Cursor | Manifest ตาม Cursor plugins reference, ชื่อ skill = ชื่อโฟลเดอร์ และ runner จาก portable payload | การติดตั้งและเรียกใช้ใน Cursor จริง |
| Gemini CLI | Structure และ runner | Native install/activation |
| Antigravity CLI / IDE | Structure, copy helper และ runner | Native install/activation |

Bundle ที่ตรวจผ่านไม่ได้แปลว่าติดตั้งและใช้งานจริงผ่านทุก host ให้รายงานผลตามตารางนี้
