import { moleSprite, hammerSprite } from '../game/sprites'

const MOLE_INFO = [
  ['normal', 'Normal Mole', 'Tap 1 = 1 pt'],
  ['stone', 'Stone Mole', 'Tap 2 = 2 pts'],
  ['metal', 'Metal Mole', 'Tap 3 = 3 pts'],
  ['golden', 'Golden Mole', 'Super fast! = 5 pts'],
  ['s1', '123 Mole', 'Tap in order 1→2→3'],
  ['sM', 'MOLE Mole', 'Tap M→O→L→E'],
  ['nurse', 'Nurse Mole', 'Heal / +time'],
  ['bomb', 'Bomb Mole', "Don't hit! -1 heart"],
  ['rabbit', 'Clock Rabbit', 'Hit it for +time!'],
]

const HAMMER_INFO = [
  ['bomb', 'Bomb Hammer', 'Hit any → cross blast (1 use)'],
  ['power', 'Power Hammer', 'One-shot anything (15 uses)'],
  ['chain', 'Golden Hammer', 'All moles turn gold · 3x3'],
  ['plate', 'Wooden Plate', 'Kill + seal hole · 3x4'],
  ['ice', 'Ice Hammer', 'Hit any → freeze all 2s'],
]

export default function HelpModal({ onClose }) {
  return (
    <div className="absolute inset-0 z-40 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl p-4 w-full max-h-[85%] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-center font-extrabold text-xl text-indigo-500 mb-1">How to Play</h2>
        <p className="text-center text-xs text-slate-500 mb-3">Whack moles for points — don't hit the bombs!</p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {MOLE_INFO.map(([app, name, desc]) => (
            <div key={app} className="bg-slate-50 rounded-xl p-1.5 text-center">
              <img src={moleSprite(app, 'up')} alt={name} className="w-12 h-12 mx-auto object-contain pixelated" />
              <div className="text-[11px] font-bold text-slate-700 leading-tight">{name}</div>
              <div className="text-[9px] text-slate-500 leading-tight">{desc}</div>
            </div>
          ))}
        </div>

        <h3 className="font-bold text-orange-500 text-sm mb-2">🔨 Special Items (every 10 combo)</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {HAMMER_INFO.map(([key, name, desc]) => (
            <div key={key} className="flex items-center gap-2 bg-orange-50 rounded-xl p-1.5">
              <img src={hammerSprite(key, 'idle')} alt={name} className="w-10 h-10 object-contain pixelated" />
              <div>
                <div className="text-[11px] font-bold text-slate-700 leading-tight">{name}</div>
                <div className="text-[9px] text-slate-500 leading-tight">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-indigo-50 rounded-xl p-2.5 text-[11px] text-slate-600 space-y-1 mb-3">
          <p>🔥 <b>Every 10 combo</b> = one special item!</p>
          <p>⏱ Late game enters <b>Fever Mode</b> — x2 score!</p>
        </div>

        <button onClick={onClose}
          className="w-full py-3 rounded-2xl bg-indigo-500 text-white font-bold shadow active:translate-y-0.5 transition-all">
          Got it!
        </button>
      </div>
    </div>
  )
}
