// ============================================================================
//  Mole Mayhem — Central Configuration (GDD section 12)
//  Every gameplay value the designer may want to tune lives here.
// ============================================================================

// --- Sound / Music defaults ---------------------------------------------------
export const AUDIO_DEFAULTS = {
  soundEffectsOn: true, // default เปิด/ปิด sound effect
  musicOn: true, // default เปิด/ปิด เสียงดนตรี
  masterVolume: 0.6,
}

// --- Board --------------------------------------------------------------------
// GRID is the maximum board; each difficulty picks its own row count via
// `boardRows` below (3 = 3x3 grid, 4 = 3x4 grid).
export const GRID = { cols: 3, rows: 4, holes: 12 }

// --- Mole type catalogue ------------------------------------------------------
// score = points on a full kill. hits = number of taps to destroy.
// appearance chain = which sprite the mole shows as it loses HP.
export const MOLE_TYPES = {
  normal: { score: 1, hits: 1, chain: ['normal'], harmful: false },
  stone: { score: 2, hits: 2, chain: ['stone', 'normal'], harmful: false },
  metal: { score: 3, hits: 3, chain: ['metal', 'stone', 'normal'], harmful: false },
  golden: { score: 5, hits: 1, chain: ['golden'], harmful: false, fastMultiplier: 0.5 },
  bomb: { score: 0, hits: 1, chain: ['bomb'], harmful: true },
  nurse: { score: 0, hits: 1, chain: ['nurse'], harmful: false, healer: true },
  // Clock Rabbit: a friendly time bonus (hit it for +seconds). No longer harmful.
  rabbit: { score: 0, hits: 1, chain: ['rabbit'], harmful: false, timeGift: true },
  ice: { score: 0, hits: 1, chain: ['ice'], harmful: false },
  // Rainbow Mole: behaves like a normal mole but worth a big bonus. Appears as a
  // combo reward (see COMBO.milestones.rainbow). Score is tunable here.
  rainbow: { score: 50, hits: 1, chain: ['rainbow'], harmful: false },
}

// Series moles (123 / MOLE). Score is per correctly-ordered hit.
export const SERIES = {
  '123': { members: ['s1', 's2', 's3'], scores: [2, 4, 8] },
  MOLE: { members: ['sM', 'sO', 'sL', 'sE'], scores: [2, 4, 8, 16] },
}

// --- Difficulty presets -------------------------------------------------------
// spawnLife = ms a mole stays up. spawnInterval = [min,max] ms between spawns.
export const DIFFICULTIES = {
  easy: {
    key: 'easy',
    label: 'Sleepy Mole',
    sub: 'ง่าย',
    boardRows: 3, // 3x3 board (ปรับ 3 หรือ 4 ได้)
    disabledTypes: ['metal'], // ตุ่นชนิดที่ไม่ให้เกิดในด่านนี้
    timeLimit: 60, // seconds
    spawnLife: 3000,
    startingLives: 5,
    spawnInterval: [800, 1200],
    spawnBurst: [1, 2], // moles spawned per spawn tick (min..max)
    rabbitRate: 0.02, // โอกาสเกิดกระต่ายนาฬิกา (เพิ่มเวลา) ต่อการเกิด 1 ตัว
    seriesMissMode: 'normal', // ตี Series ผิดลำดับ: 'normal'=กลายเป็นตุ่นธรรมดา, 'flee'=หายหมด
    seriesMissBreaksCombo: false, // ตี Series ผิดลำดับทำให้คอมโบหลุดไหม (Sleepy = ไม่หลุด)
    startClosed: 0, // จำนวนหลุมที่ถูกปิดด้วยไม้กระดานตอนเริ่มเกม (0-4)
    bombBlast: 'square', // รูปแบบระเบิดค้อนระเบิด: 'cross'=กากบาท(5 ช่อง), 'square'=รอบตัว(9 ช่อง)
    background: 'bg/easy.jpg',
    theme: 'flower',
  },
  medium: {
    key: 'medium',
    label: 'Naughty Mole',
    sub: 'ปานกลาง',
    boardRows: 4, // 3x4 board
    disabledTypes: ['metal'],
    timeLimit: 60,
    spawnLife: 2800,
    startingLives: 4,
    spawnInterval: [700, 1100],
    spawnBurst: [2, 3],
    rabbitRate: 0.02,
    seriesMissMode: 'normal',
    seriesMissBreaksCombo: true, // Naughty = ตีผิดลำดับคอมโบหลุด
    startClosed: 2,
    bombBlast: 'square', // 9 ช่อง
    background: 'bg/medium.jpg',
    theme: 'desert',
  },
  hard: {
    key: 'hard',
    label: 'Crazy Mole',
    sub: 'ยาก',
    boardRows: 4, // 3x4 board
    timeLimit: 60,
    spawnLife: 2500,
    startingLives: 3,
    spawnInterval: [600, 1000],
    spawnBurst: [2, 4],
    rabbitRate: 0.02,
    seriesMissMode: 'normal',
    seriesMissBreaksCombo: true, // Crazy = ตีผิดลำดับคอมโบหลุด
    startClosed: 0,
    bombBlast: 'cross', // 5 ช่อง (กากบาท) — ด่านยากยังเป็นแบบเดิม
    background: 'bg/hard.jpg',
    theme: 'graveyard',
  },
}

// --- Round phases (by % of time REMAINING elapsed) ---------------------------
// pct = fraction of total time that has ELAPSED at which this phase begins.
// weights = relative spawn probability for each spawn "kind".
// speedMult = multiplies mole life shrink (higher = shorter life).
// spawnRateMult = multiplies spawn frequency (higher = more frequent).
export const PHASES = [
  {
    id: 1,
    name: 'ง่ายสร้างความมั่นใจ',
    pctStart: 0.0,
    speedMult: 1.0,
    spawnRateMult: 1.0,
    scoreMult: 1,
    weights: { normal: 86, nurse: 4, golden: 10 },
  },
  {
    id: 2,
    name: 'เริ่มท้าทาย',
    pctStart: 0.2,
    speedMult: 1.0,
    spawnRateMult: 1.0,
    scoreMult: 1,
    weights: { normal: 40, stone: 15, bomb: 15, golden: 8, series: 20, nurse: 2 },
  },
  {
    id: 3,
    name: 'ความโกลาหล',
    pctStart: 0.5,
    speedMult: 1.1,
    spawnRateMult: 1.0,
    scoreMult: 1,
    weights: { normal: 33, stone: 15, metal: 15, bomb: 18, series: 17, nurse: 2 },
  },
  {
    id: 4,
    name: 'Fever Mode',
    pctStart: 0.8,
    speedMult: 1.1,
    spawnRateMult: 1.5,
    scoreMult: 2,
    fever: true,
    weights: { golden: 40, normal: 20, stone: 10, metal: 15, bomb: 15 },
  },
]

// --- Combo system -------------------------------------------------------------
// Only reward: a special hammer every `hammer` combo. (No heart bonus.)
export const COMBO = {
  milestones: {
    hammer: 10, // จำนวนตีเพื่อได้ ค้อนพิเศษ (ทุก ๆ 10 คอมโบ)
    rainbow: 40, // ทุก ๆ กี่คอมโบ จะมีตุ่นสายรุ้งโผล่ (คะแนนตุ่นสายรุ้ง = MOLE_TYPES.rainbow.score)
  },
}

// --- Special hammers ----------------------------------------------------------
// dropWeight = relative chance of receiving this hammer at the 10-combo reward.
export const HAMMERS = {
  bomb: {
    key: 'bomb',
    label: 'ค้อนระเบิด',
    sub: 'Bomb Hammer',
    uses: 1,
    instant: false,
    dropWeight: 25,
    sprite: 'h_bomb',
  },
  power: {
    key: 'power',
    label: 'ค้อนพลังทลายศิลา',
    sub: 'Power Hammer',
    uses: 15, // จำนวนครั้งที่ใช้ได้ (ปรับได้ที่นี่)
    instant: false,
    dropWeight: 25,
    keepCombo: true, // ไม่ทำให้คอมโบหลุดทุกกรณี (ทุบหลุมว่าง/ตุ่นได้หมด)
    sprite: 'h_power',
  },
  chain: {
    key: 'chain',
    label: 'ค้อนเปลี่ยนทอง',
    sub: 'Golden Hammer',
    uses: 1,
    instant: true, // effect fires the moment it is activated
    dropWeight: 25,
    sprite: 'h_chain',
  },
  ice: {
    key: 'ice',
    label: 'ค้อนน้ำแข็ง',
    sub: 'Ice Hammer',
    uses: 1,
    instant: false,
    dropWeight: 25,
    sprite: 'h_ice',
  },
  // แผ่นไม้ปิดหลุม — สุ่มได้เฉพาะด่านกระดาน 3x4 (แทนค้อนเปลี่ยนทอง)
  plate: {
    key: 'plate',
    label: 'แผ่นไม้ปิดหลุม',
    sub: 'Wooden Plate',
    uses: 1,
    instant: false,
    dropWeight: 25,
    sprite: 'plate_icon',
  },
}

// ค้อน/ไอเทมที่สุ่มได้จากคอมโบ แยกตามขนาดกระดาน:
//   กระดาน 3x3 → ค้อนเปลี่ยนทอง (chain) ; กระดาน 3x4 → แผ่นไม้ปิดหลุม (plate)
export const HAMMER_POOL = {
  base: ['bomb', 'power', 'ice'],
  board3x3: 'chain',
  board3x4: 'plate',
  // จะไม่สุ่มได้ไม้กระดาน (plate) ถ้าจำนวนหลุมที่ยังเปิดอยู่ <= ค่านี้
  // (กันไม่ให้ปิดหลุมจนเหลือหลุมเปิดน้อยเกินไป) — ปรับได้
  plateMinOpenHoles: 5,
}

// --- Effect tuning ------------------------------------------------------------
export const EFFECTS = {
  iceFreezeDuration: 2000, // ms
  iceTimeBonusPerHit: 1, // seconds added when hitting during ice hammer proc
  bombLifePenalty: 1, // hearts lost when hitting a bomb
  bombBlastDefault: 'cross', // รูปแบบระเบิดค้อนระเบิด default ถ้าด่านไม่กำหนด
  rabbitTimeBonus: 2, // วินาทีที่ได้เพิ่มเมื่อตีกระต่ายนาฬิกา (ปรับได้)
  heartBonus: 5, // คะแนนโบนัสต่อหัวใจที่เหลือ 1 ดวง ตอนจบเกม (ปรับได้)
  countdownSeconds: 3, // 3..2..1..GO
}

export const LEADERBOARD = {
  maxEntries: 20, // เก็บกี่อันดับต่อด่าน (Top 20)
  maxNameLength: 10,
  showResetButton: false, // แสดงปุ่ม "Reset this level" ใน Leaderboard ไหม (ซ่อนไว้)
  // ล้างคะแนนอัตโนมัติตามรอบ: 'monthly' = รีเซ็ตวันที่ 1 ของทุกเดือน, 'none' = ไม่ล้าง
  resetPeriod: 'monthly',
  storageKey: 'moleMayhem.highscores.v1',
  periodKey: 'moleMayhem.period.v1', // เก็บ stamp รอบเดือนล่าสุด (ใช้ตรวจว่าถึงรอบรีเซ็ตหรือยัง)
  settingsKey: 'moleMayhem.settings.v1',
}
