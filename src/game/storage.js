// Leaderboard persistence.
//
// Scores live in a shared Supabase table when configured (see supabase.js),
// otherwise they fall back to per-device localStorage. Settings always stay
// local. Leaderboard functions are async because the online backend is.
import { LEADERBOARD, AUDIO_DEFAULTS, DIFFICULTIES } from './config'
import { supabase } from './supabase'

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage unavailable / private mode — ignore */
  }
}

const emptyBoard = () =>
  Object.fromEntries(Object.keys(DIFFICULTIES).map((k) => [k, []]))

// The period a score belongs to. 'monthly' -> 'YYYY-MM' so each calendar month
// is its own leaderboard (auto-resets on the 1st); 'none' -> a single eternal
// board keyed 'all'. We always store + filter by this stamp.
function periodStamp() {
  if (LEADERBOARD.resetPeriod === 'monthly') {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return 'all'
}

const cleanName = (name) =>
  (name || '').toString().slice(0, LEADERBOARD.maxNameLength) || 'PLAYER'

// --- localStorage fallback (per-device) -------------------------------------
function localLoad() {
  // When storing locally, wipe the board the first time we roll into a new
  // period (the Supabase path gets this for free via the period filter).
  const period = periodStamp()
  if (readJSON(LEADERBOARD.periodKey, null) !== period) {
    writeJSON(LEADERBOARD.storageKey, emptyBoard())
    writeJSON(LEADERBOARD.periodKey, period)
  }
  return { ...emptyBoard(), ...readJSON(LEADERBOARD.storageKey, {}) }
}

function localSubmit(difficultyKey, name, score, combo) {
  const board = localLoad()
  const list = board[difficultyKey] || []
  list.push({ name: cleanName(name), score, combo, date: Date.now() })
  list.sort((a, b) => b.score - a.score)
  board[difficultyKey] = list.slice(0, LEADERBOARD.maxEntries)
  writeJSON(LEADERBOARD.storageKey, board)
  return board
}

// --- public API (async) -----------------------------------------------------
export async function loadScores() {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('scores')
        .select('difficulty,name,score,combo')
        .eq('period', periodStamp())
        .order('score', { ascending: false })
        .order('created_at', { ascending: true }) // ties: earlier achiever ranks higher
      if (error) throw error
      const board = emptyBoard()
      for (const row of data) {
        (board[row.difficulty] ||= []).push(row)
      }
      for (const k of Object.keys(board)) board[k] = board[k].slice(0, LEADERBOARD.maxEntries)
      return board
    } catch {
      /* network/backend error -> fall back to local */
    }
  }
  return localLoad()
}

// Returns { rank } as a 1-based position, or -1 if the score doesn't make the
// board. Async because it consults the (possibly online) board.
export async function qualifies(difficultyKey, score) {
  if (score <= 0) return -1
  const board = await loadScores()
  const list = board[difficultyKey] || []
  if (list.length < LEADERBOARD.maxEntries) return list.filter((e) => e.score >= score).length + 1
  const worst = list[list.length - 1]
  return score > worst.score ? list.filter((e) => e.score >= score).length + 1 : -1
}

export async function submitScore(difficultyKey, name, score, combo) {
  if (supabase) {
    try {
      const { error } = await supabase.from('scores').insert({
        period: periodStamp(),
        difficulty: difficultyKey,
        name: cleanName(name),
        score,
        combo: combo || 0,
      })
      if (error) throw error
      return await loadScores()
    } catch {
      /* fall back to local so the score isn't lost */
    }
  }
  return localSubmit(difficultyKey, name, score, combo)
}

// Clear this period's scores for one difficulty (only used if the reset button
// is enabled in config). Online delete affects the shared board for everyone.
export async function resetScores(difficultyKey) {
  if (supabase) {
    try {
      const { error } = await supabase
        .from('scores')
        .delete()
        .eq('period', periodStamp())
        .eq('difficulty', difficultyKey)
      if (error) throw error
      return await loadScores()
    } catch {
      /* fall through to local */
    }
  }
  const board = localLoad()
  board[difficultyKey] = []
  writeJSON(LEADERBOARD.storageKey, board)
  return board
}

// --- settings (always local) ------------------------------------------------
export function loadSettings() {
  return {
    soundEffectsOn: AUDIO_DEFAULTS.soundEffectsOn,
    musicOn: AUDIO_DEFAULTS.musicOn,
    ...readJSON(LEADERBOARD.settingsKey, {}),
  }
}

export function saveSettings(settings) {
  writeJSON(LEADERBOARD.settingsKey, settings)
}
