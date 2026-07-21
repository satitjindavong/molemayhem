// localStorage persistence for high scores (per difficulty) and settings.
import { LEADERBOARD, AUDIO_DEFAULTS, DIFFICULTIES } from './config'

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

export function loadScores() {
  return { ...emptyBoard(), ...readJSON(LEADERBOARD.storageKey, {}) }
}

// Returns { rank, scores } where rank is 1-based (or -1 if not top).
export function qualifies(difficultyKey, score) {
  const board = loadScores()
  const list = board[difficultyKey] || []
  if (score <= 0) return -1
  if (list.length < LEADERBOARD.maxEntries) return list.filter((e) => e.score >= score).length + 1
  const worst = list[list.length - 1]
  return score > worst.score ? list.filter((e) => e.score >= score).length + 1 : -1
}

export function submitScore(difficultyKey, name, score, combo) {
  const board = loadScores()
  const list = board[difficultyKey] || []
  list.push({ name: name.slice(0, LEADERBOARD.maxNameLength) || 'PLAYER', score, combo, date: Date.now() })
  list.sort((a, b) => b.score - a.score)
  board[difficultyKey] = list.slice(0, LEADERBOARD.maxEntries)
  writeJSON(LEADERBOARD.storageKey, board)
  return board
}

// Clear all high scores for one difficulty (leaderboard reset button).
export function resetScores(difficultyKey) {
  const board = loadScores()
  board[difficultyKey] = []
  writeJSON(LEADERBOARD.storageKey, board)
  return board
}

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
