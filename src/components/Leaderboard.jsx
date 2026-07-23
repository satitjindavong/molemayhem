import { useState, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { DIFFICULTIES, LEADERBOARD } from '../game/config'
import { loadScores, resetScores, leaderboardSource } from '../game/storage'

const MEDAL = ['🥇', '🥈', '🥉']

export default function Leaderboard({ onBack, highlight }) {
  const [tab, setTab] = useState(highlight?.difficultyKey || 'easy')
  const [version, setVersion] = useState(0) // bump to re-read after a reset
  const [confirming, setConfirming] = useState(false)
  const [scores, setScores] = useState(null) // null = still loading
  const [source, setSource] = useState(null) // 'online' | 'local'
  const list = scores?.[tab] || []

  useEffect(() => {
    let alive = true
    setScores(null)
    loadScores().then((s) => {
      if (!alive) return
      setScores(s)
      setSource(leaderboardSource())
    })
    return () => { alive = false }
  }, [version])

  const doReset = async () => {
    await resetScores(tab)
    setConfirming(false)
    setVersion((v) => v + 1)
  }

  return (
    <div key={version} className="w-full h-full flex flex-col bg-white/85 backdrop-blur rounded-3xl p-3 shadow-xl border-2 border-white">
      <h2 className="text-center font-extrabold text-xl text-indigo-500 mb-0.5">🏆 Leaderboard</h2>
      <p className="text-center text-[10px] text-slate-400 mb-1.5">
        Top {LEADERBOARD.maxEntries}
        {LEADERBOARD.resetPeriod === 'monthly' && ' · resets monthly'}
        {source === 'online' && ' · 🌐 Global'}
        {source === 'local' && ' · 📱 This device'}
      </p>
      <div className="flex gap-1 mb-2">
        {Object.values(DIFFICULTIES).map((d) => (
          <button key={d.key} onClick={() => { setTab(d.key); setConfirming(false) }}
            className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-colors ${tab === d.key ? 'bg-indigo-500 text-white' : 'bg-indigo-100 text-indigo-400'}`}>
            {d.label.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {scores === null && (
          <p className="text-center text-slate-400 text-sm mt-8 animate-pulse">Loading…</p>
        )}
        {scores !== null && list.length === 0 && (
          <p className="text-center text-slate-400 text-sm mt-8">No scores yet<br />Be the first!</p>
        )}
        {list.map((e, i) => {
          const isMe = highlight && highlight.difficultyKey === tab &&
            highlight.score === e.score && highlight.name === e.name
          return (
            <div key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isMe ? 'bg-yellow-200 ring-2 ring-yellow-400' : 'bg-white'} shadow-sm`}>
              <span className="w-6 text-center font-bold">{MEDAL[i] || i + 1}</span>
              <span className="flex-1 font-bold text-slate-700 truncate">{e.name}</span>
              {e.combo ? <span className="text-[10px] text-orange-400 font-bold">x{e.combo}</span> : null}
              <span className="font-extrabold text-indigo-500 tabular-nums">{e.score}</span>
            </div>
          )
        })}
      </div>

      {/* reset scores for the current level — hidden unless enabled in config */}
      {LEADERBOARD.showResetButton && (confirming ? (
        <div className="mt-2 flex items-center gap-2 bg-red-50 rounded-2xl p-2">
          <span className="flex-1 text-xs font-bold text-red-500 pl-1">Reset {DIFFICULTIES[tab].label.split(' ')[0]} scores?</span>
          <button onClick={doReset}
            className="px-3 py-1.5 rounded-xl bg-red-500 text-white text-xs font-bold shadow active:translate-y-0.5">
            Reset
          </button>
          <button onClick={() => setConfirming(false)}
            className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-600 text-xs font-bold active:translate-y-0.5">
            Cancel
          </button>
        </div>
      ) : (
        list.length > 0 && (
          <button onClick={() => setConfirming(true)}
            className="mt-2 w-full py-2 rounded-2xl bg-red-100 text-red-500 font-bold text-sm shadow flex items-center justify-center gap-1.5 active:translate-y-0.5 transition-all">
            <Trash2 size={16} /> Reset this level
          </button>
        )
      ))}

      {onBack && (
        <button onClick={onBack}
          className="mt-2 w-full py-2.5 rounded-2xl bg-indigo-500 text-white font-bold shadow active:translate-y-0.5 transition-all">
          ← Back
        </button>
      )}
    </div>
  )
}
