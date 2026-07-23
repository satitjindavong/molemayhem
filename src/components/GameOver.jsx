import { useEffect, useState } from 'react'
import { RotateCcw, Home } from 'lucide-react'
import { qualifies, submitScore } from '../game/storage'
import { LEADERBOARD, DIFFICULTIES } from '../game/config'
import { BACKGROUNDS } from '../game/sprites'
import Leaderboard from './Leaderboard'

export default function GameOver({ snap, onReplay, onMenu }) {
  const { score, bestCombo, difficultyKey, lives, heartBonus } = snap
  const [rank, setRank] = useState(null) // null = checking, -1 = didn't qualify
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [entry, setEntry] = useState(null)

  // Check the (possibly online) board once on mount.
  useEffect(() => {
    let alive = true
    qualifies(difficultyKey, score).then((r) => {
      if (!alive) return
      setRank(r)
      if (r < 0) setSaved(true) // not a high score -> jump straight to leaderboard
    })
    return () => { alive = false }
  }, [difficultyKey, score])

  const reason = lives <= 0 ? 'Out of Hearts!' : "Time's Up!"

  const handleSave = async () => {
    const finalName = name.trim() || 'PLAYER'
    setSaving(true)
    await submitScore(difficultyKey, finalName, score, bestCombo)
    setEntry({ difficultyKey, score, name: finalName })
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="relative w-full h-full flex flex-col p-4 overflow-hidden bg-indigo-950">
      {/* graveyard game-over background */}
      <div className="absolute inset-0" style={{
        backgroundImage: `url(${BACKGROUNDS.gameover})`, backgroundSize: 'cover', backgroundPosition: 'center',
      }} />
      <div className="absolute inset-0 bg-black/35" />

      <div className="relative z-10 text-center pt-3">
        <h1 className="text-4xl font-extrabold text-white drop-shadow" style={{ textShadow: '3px 3px 0 rgba(0,0,0,0.25)' }}>GAME OVER</h1>
        <p className="text-white/80 font-bold text-sm mt-1">{reason} · {DIFFICULTIES[difficultyKey].label}</p>
      </div>

      <div className="relative z-10 my-3 bg-white/90 rounded-3xl p-4 shadow-xl text-center">
        <p className="text-slate-500 font-bold text-sm">Your Score</p>
        <p className="text-6xl font-extrabold text-indigo-500 leading-tight tabular-nums">{score}</p>
        {heartBonus > 0 && (
          <p className="text-rose-400 font-bold text-xs">❤️ Hearts bonus +{heartBonus}</p>
        )}
        <p className="text-orange-500 font-bold text-sm">🔥 Best Combo x{bestCombo}</p>
      </div>

      {/* checking rank against the (online) board */}
      {rank === null && (
        <div className="relative z-10 text-center mb-3 text-white/80 font-bold text-sm animate-pulse">
          Checking leaderboard…
        </div>
      )}

      {/* name entry when qualifying */}
      {rank > 0 && !saved && (
        <div className="relative z-10 bg-yellow-300 rounded-3xl p-4 shadow-xl text-center mb-3 animate-[pop-up_.4s_ease]">
          <p className="font-extrabold text-amber-800">🎉 Top {LEADERBOARD.maxEntries}! (#{rank})</p>
          <p className="text-xs text-amber-700 mb-2">Enter your name</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, LEADERBOARD.maxNameLength))}
              maxLength={LEADERBOARD.maxNameLength}
              placeholder="Player name"
              autoFocus
              disabled={saving}
              className="flex-1 px-3 py-2 rounded-xl border-2 border-amber-400 font-bold text-slate-700 outline-none focus:border-amber-600 disabled:opacity-60"
            />
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-xl bg-amber-500 text-white font-bold shadow active:translate-y-0.5 disabled:opacity-60">
              {saving ? '…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {saved && (
        <div className="relative z-10 flex-1 min-h-0 mb-3">
          <Leaderboard highlight={entry} />
        </div>
      )}

      <div className="relative z-10 flex gap-2">
        <button onClick={() => onReplay(difficultyKey)}
          className="flex-1 py-3 rounded-2xl bg-emerald-400 border-b-4 border-emerald-600 text-white font-bold shadow-lg flex items-center justify-center gap-2 active:translate-y-1 active:border-b-0 transition-all">
          <RotateCcw size={20} /> Play Again
        </button>
        <button onClick={onMenu}
          className="px-5 py-3 rounded-2xl bg-white/90 border-b-4 border-black/10 text-slate-600 font-bold shadow-lg flex items-center justify-center active:translate-y-1 active:border-b-0 transition-all">
          <Home size={20} />
        </button>
      </div>
    </div>
  )
}
