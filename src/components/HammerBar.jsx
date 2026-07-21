import { HAMMERS } from '../game/config'
import { hammerSprite } from '../game/sprites'

// Top row of the 4 special items. The one the player owns is highlighted and
// tappable to activate/deactivate; others are shown locked/greyed. The 3rd slot
// is the Golden hammer on 3x3 boards, or the wooden Plate on 3x4 boards.
export default function HammerBar({ inventoryHammer, activeHammer, activeHammerUses, boardRows, onToggle }) {
  const order = ['bomb', 'power', boardRows >= 4 ? 'plate' : 'chain', 'ice']
  return (
    <div className="w-full flex items-center justify-center gap-2 px-3">
      {order.map((key) => {
        const owned = inventoryHammer === key
        const active = activeHammer === key
        return (
          <button
            key={key}
            disabled={!owned}
            onClick={() => owned && onToggle(key)}
            className={[
              'relative flex-1 max-w-[68px] aspect-square rounded-2xl grid place-items-center transition-all',
              active
                ? 'bg-gradient-to-b from-orange-300 to-amber-400 ring-4 ring-orange-500 scale-105 shadow-lg'
                : owned
                  ? 'bg-white/85 ring-2 ring-amber-400 shadow-md animate-bounce'
                  : 'bg-black/25 ring-1 ring-white/20',
            ].join(' ')}
          >
            <img
              src={hammerSprite(key, active ? 'swing' : 'idle')}
              alt={HAMMERS[key].sub}
              className={`w-[78%] h-[78%] object-contain pixelated ${owned ? '' : 'opacity-30 grayscale'}`}
            />
            {active && (
              <span className="absolute -top-1.5 -right-1.5 bg-orange-600 text-white text-[11px] font-extrabold rounded-full w-6 h-6 grid place-items-center shadow">
                ×{activeHammerUses}
              </span>
            )}
            {!owned && !active && (
              <span className="absolute inset-0 grid place-items-center text-white/40 text-lg">🔒</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
