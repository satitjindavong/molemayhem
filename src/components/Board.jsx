import { moleSprite, FX, PLATE } from '../game/sprites'

export default function Board({ holes, effects, onHit, frozen, cols = 3, closed }) {
  return (
    <div className="relative w-full">
      <div className="grid gap-x-2 gap-y-1"
        style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {holes.map((mole, i) => (
          <Hole key={i} index={i} mole={mole} onHit={onHit} frozen={frozen}
            closed={closed?.has(i)}
            holeEffects={effects.filter((e) => e.hole === i)} />
        ))}
      </div>
    </div>
  )
}

function Hole({ index, mole, onHit, frozen, holeEffects, closed }) {
  const handle = (e) => {
    e.preventDefault()
    onHit(index)
  }
  return (
    <button
      onPointerDown={handle}
      className="relative aspect-[3/4] w-full touch-none focus:outline-none"
    >
      {closed ? (
        /* hole permanently covered by a wooden plate */
        <div className="absolute left-1/2 -translate-x-1/2 bottom-[4%] w-[86%]">
          <img src={PLATE.closed} alt="closed" draggable={false}
            className="w-full object-contain pixelated"
            style={{ filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.4))' }} />
        </div>
      ) : (
        <>
          {/* dirt hole */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-[6%] w-[78%] h-[26%]">
            <div className="w-full h-full rounded-[50%] bg-gradient-to-b from-amber-900/80 to-amber-950 shadow-[inset_0_6px_10px_rgba(0,0,0,0.6)]" />
            <div className="absolute inset-x-[8%] top-[35%] h-[45%] rounded-[50%] bg-black/50" />
          </div>

          {/* mole rising from hole — keyed by mole.id so each mole gets its own
              element (prevents a finished hit animation sticking to the next mole) */}
          <div className="absolute inset-0 overflow-hidden flex items-end justify-center">
            {mole && <MoleView key={mole.id} mole={mole} frozen={frozen} />}
          </div>
        </>
      )}

      {/* floating effect text / explosion bursts (may stack) */}
      {holeEffects.map((e) => <Fx key={e.id} effect={e} />)}
    </button>
  )
}

function MoleView({ mole, frozen }) {
  const frame = mole.dead
    ? (mole.state === 'burrow' ? 'burrow' : 'hit')
    : 'up'
  const cls = mole.dead
    ? (mole.state === 'burrow' ? 'animate-burrow' : 'animate-hit-spin')
    : (mole.state === 'shake' ? 'animate-shake' : 'animate-pop-up')

  return (
    <div className={`w-[92%] mb-[8%] ${cls}`} style={{ willChange: 'transform' }}>
      <img
        src={moleSprite(mole.appearance, frame)}
        alt={mole.appearance}
        draggable={false}
        className={`w-full h-full object-contain pixelated select-none ${frozen ? 'saturate-150' : ''}`}
        style={{ filter: 'drop-shadow(0 4px 3px rgba(0,0,0,0.35))' }}
      />
    </div>
  )
}

const FX_STYLE = {
  score: 'text-yellow-300',
  feverscore: 'text-pink-300 text-2xl',
  time: 'text-sky-300',
  heal: 'text-rose-300',
  miss: 'text-orange-200 text-2xl',
  boom: 'text-3xl',
  reward: 'text-2xl',
  rush: 'text-yellow-200',
}

function Fx({ effect }) {
  // Image-based explosion bursts (bomb / defuser cross / freeze).
  if (effect.fx) {
    return (
      <div className="absolute inset-0 grid place-items-center pointer-events-none z-30">
        <img src={FX[effect.fx]} alt="" draggable={false}
          className="w-[150%] max-w-none object-contain"
          style={{ animation: 'boom-pop 0.6s ease-out forwards' }} />
      </div>
    )
  }
  return (
    <div
      className={`absolute left-1/2 top-[15%] -translate-x-1/2 font-extrabold text-xl pointer-events-none animate-float-up whitespace-nowrap z-20 ${FX_STYLE[effect.kind] || 'text-white'}`}
      style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.5)' }}
    >
      {effect.text}
    </div>
  )
}
