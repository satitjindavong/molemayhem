# 🐹 Mole Mayhem

เกมตีตัวตุ่นสไตล์ Cute Korean Pixel-art สร้างด้วย **React + Vite + Tailwind CSS**
พร้อมเสียงสังเคราะห์ Web Audio API และกราฟิกจาก sprite sheet จริง สร้างตาม
Game Design Document (`../design/MoleMayhemGDD.md`)

## เริ่มใช้งาน

```bash
cd game
npm install
npm run dev        # เปิด http://localhost:5173
npm run build      # สร้างไฟล์ production ที่ dist/
npm run preview    # ทดสอบไฟล์ที่ build แล้ว
```

## ฟีเจอร์ครบตาม GDD

- **3 โหมด**: Sleepy (ง่าย) / Naughty (กลาง) / Crazy (ยาก) — เวลา หัวใจ ความเร็ว ต่างกัน
- **4 Phase ต่อรอบ**: ง่าย → ท้าทาย → โกลาหล → **Fever Mode** (คะแนน x2, เฟรมสีรุ้ง, confetti)
- **ตุ่น 10 ประเภท**: ปกติ, หิน (2 ตี), โลหะ (3 ตี), ทอง, ระเบิด, พยาบาล, น้ำแข็ง, กระต่าย,
  ซีรีส์ 123 และ MOLE (ตีเรียงลำดับ)
- **ระบบคอมโบ**: ทุก ๆ 10 คอมโบ = ค้อนพิเศษ, ทุก ๆ 20 = +หัวใจ
- **ค้อนพิเศษ 4 แบบ** (แถวไอคอนด้านบน กด activate/deactivate):
  - 💣 **ค้อนระเบิด** — ตีตัวไหนก็ระเบิดกากบาท กวาดตุ่นรอบข้าง (ใช้ 1 ครั้ง)
  - 🔨 **ค้อนพลัง** — ทุบทุกอย่างตายทันที ตีกระต่ายไม่เสียแต้ม (ใช้ 10 ครั้ง)
  - 👑 **ค้อนเปลี่ยนทอง** — กดแล้วตุ่นบนจอเป็นทองหมดทันที (ใช้ 1 ครั้ง)
  - ❄️ **ค้อนน้ำแข็ง** — ตีแล้วแช่แข็งทั้งจอ 2 วิ หยุดเวลา (ใช้ 1 ครั้ง)
- **Effect**: แสงเขียว/แดงตอนหัวใจเพิ่ม-ลด, ภาพระเบิดตอนตีตุ่นระเบิด, "พลาด!" ตอนตีซีรีส์ผิดลำดับ
- **Leaderboard** แยกตามความยาก บันทึกใน `localStorage`
- **เสียงสังเคราะห์ล้วน** + BGM chiptune (เร่งจังหวะตอน Fever) พร้อมปุ่มปิดเสียง/ดนตรี

## โครงสร้างโค้ด

```
game/
├── public/
│   ├── sprites/        # เฟรมตุ่น/ค้อน ที่ตัดจาก sprite sheet (พื้นหลังโปร่งใส) + manifest.json
│   └── bg/             # ภาพต้นฉบับจาก /design/assets
├── src/
│   ├── game/
│   │   ├── config.js   # ⭐ ค่าปรับแต่งทั้งหมด (โหมด, phase, %สุ่ม, คอมโบ, ค้อน, เสียง)
│   │   ├── engine.js   # ตรรกะเกมทั้งหมด (framework-agnostic)
│   │   ├── audio.js    # Web Audio synthesizer
│   │   ├── sprites.js  # แม็พ appearance → ไฟล์ภาพ
│   │   └── storage.js  # localStorage (คะแนน + settings)
│   ├── components/     # Menu, GameScreen, HUD, Board, Countdown, GameOver, Leaderboard, HelpModal, Scene
│   ├── useGame.js      # React hook เชื่อม engine + เสียง + render loop (requestAnimationFrame)
│   └── App.jsx         # state machine: menu → countdown → playing → gameover
└── tools/
    ├── slice_sprites.py  # ตัด sprite sheet เป็นเฟรมโปร่งใส (Python + PIL + scipy)
    └── smoke.mjs         # ทดสอบตรรกะ engine แบบ headless (ไม่ต้องมี browser)
```

## การปรับแต่งค่าเกม

แก้ค่าทุกอย่างได้ที่ **`src/game/config.js`** ไฟล์เดียว ตามที่ GDD ข้อ 12 กำหนด:

| ต้องการปรับ | ตัวแปร |
|---|---|
| เปิด/ปิด sound & music เริ่มต้น | `AUDIO_DEFAULTS` |
| เวลา/หัวใจ/ความเร็ว/ความถี่ ของแต่ละโหมด | `DIFFICULTIES` |
| % ช่วงเวลา 1–4 + ความเร็ว + %สุ่มตุ่นแต่ละกลุ่ม | `PHASES` |
| จำนวนตีเพื่อได้คอมโบขั้น 1/2/3 (10/20/30) | `COMBO.milestones` |
| % การออกของค้อนพิเศษ + จำนวนครั้งใช้ | `HAMMERS` |
| คะแนน/จำนวนตี ของตุ่นแต่ละชนิด | `MOLE_TYPES`, `SERIES` |

## เครื่องมือ dev (ไม่จำเป็นต่อการเล่น)

```bash
python tools/slice_sprites.py   # ตัด sprite ใหม่ (ต้องมี Pillow + scipy)
npx esbuild tools/smoke.mjs --bundle --platform=node --format=esm --outfile=tools/_smoke.mjs && node tools/_smoke.mjs
```
