import { Heart, Clock, Home, Snowflake } from 'lucide-react'

export default function HUD({ snap, onMenu }) {
  const { score, timeLeft, totalTime, lives, maxLives, combo, fever, frozen } = snap
  const timePct = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100))
  const mins = Math.floor(timeLeft / 60)
  const secs = Math.floor(timeLeft % 60)
  const lowTime = timeLeft <= 10

  return (
    <div className="w-full px-3 pt-11 pb-1 space-y-1.5">
      {/* top row: home, score, combo badge (replaces the old P1 slot) */}
      <div className="flex items-center justify-between gap-2">
        <button onClick={onMenu}
          className="w-9 h-9 rounded-full bg-white/80 grid place-items-center text-slate-600 shadow active:scale-95 shrink-0">
          <Home size={18} />
        </button>
        <div className="flex-1 text-center">
          <div className="text-3xl font-extrabold text-white leading-none tabular-nums"
            style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.35)' }}>{score}</div>
        </div>
        <div className="w-16 flex justify-end shrink-0">
          {combo > 1 && <ComboBadge combo={combo} fever={fever} />}
        </div>
      </div>

      {/* time bar */}
      <div className="flex items-center gap-2">
        {frozen ? <Snowflake size={16} className="text-sky-300 animate-spin" /> : <Clock size={16} className="text-white" />}
        <div className="flex-1 h-3 rounded-full bg-black/30 overflow-hidden">
          <div className={`h-full rounded-full transition-[width] duration-200 ${lowTime ? 'bg-red-500 animate-pulse' : frozen ? 'bg-sky-400' : 'bg-gradient-to-r from-lime-400 to-emerald-500'}`}
            style={{ width: `${timePct}%` }} />
        </div>
        <span className="text-white font-bold text-sm tabular-nums w-10 text-right"
          style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.4)' }}>
          {mins}:{secs.toString().padStart(2, '0')}
        </span>
      </div>

      {/* lives */}
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxLives }).map((_, i) => (
          <Heart key={i} size={20}
            className={i < lives ? 'text-rose-500 fill-rose-500' : 'text-white/40 fill-white/20'} />
        ))}
        {fever && (
          <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-white bg-gradient-to-r from-pink-500 to-yellow-400 animate-pulse shadow">
            🔥 FEVER x2
          </span>
        )}
      </div>
    </div>
  )
}

// Prominent combo indicator, sitting where the old P1 badge was.
function ComboBadge({ combo, fever }) {
  const hot = combo >= 10
  return (
    <div
      className={`px-2.5 py-1 rounded-2xl shadow-lg border-b-2 text-center leading-none ${
        hot || fever
          ? 'bg-gradient-to-b from-orange-400 to-pink-500 border-pink-700'
          : 'bg-gradient-to-b from-sky-400 to-indigo-500 border-indigo-700'
      }`}
      style={{ transform: hot ? 'scale(1.08)' : 'none' }}
    >
      <div className="text-[9px] font-bold text-white/90 tracking-widest">COMBO</div>
      <div className="text-xl font-extrabold text-white tabular-nums leading-none"
        style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.35)' }}>
        ×{combo}
      </div>
    </div>
  )
}
