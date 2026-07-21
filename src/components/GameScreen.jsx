import { useMemo } from 'react'
import HUD from './HUD'
import Board from './Board'
import Scene from './Scene'
import HammerBar from './HammerBar'
import { DIFFICULTIES } from '../game/config'

export default function GameScreen({ snap, onHit, onToggleHammer, onMenu }) {
  const theme = DIFFICULTIES[snap.difficultyKey]?.theme

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* themed scene background */}
      <Scene bg={snap.difficultyKey} theme={theme} dim={0.04} />

      {/* fever rainbow frame */}
      {snap.fever && <div className="absolute inset-0 z-30 pointer-events-none animate-rainbow rounded-[1.7rem]" />}
      {snap.fever && <Confetti />}

      {/* freeze tint */}
      {snap.frozen && <div className="absolute inset-0 z-20 pointer-events-none bg-sky-300/25 backdrop-blur-[1px]" />}

      {/* heart gain/loss + miss screen flash */}
      <FlashOverlay flash={snap.flash} />

      <div className="relative z-10 w-full h-full flex flex-col">
        <HUD snap={snap} onMenu={onMenu} />
        <HammerBar
          inventoryHammer={snap.inventoryHammer}
          activeHammer={snap.activeHammer}
          activeHammerUses={snap.activeHammerUses}
          boardRows={snap.rows}
          onToggle={onToggleHammer}
        />
        <div className="flex-1 flex items-center justify-center px-3 pb-3 min-h-0">
          <Board holes={snap.holes} effects={snap.effects} onHit={onHit} frozen={snap.frozen} cols={snap.cols} closed={snap.closed} />
        </div>
      </div>
    </div>
  )
}

const FLASH_STYLE = {
  heal: 'rgba(34,197,94,0.55)',
  damage: 'rgba(239,68,68,0.6)',
  miss: 'rgba(249,115,22,0.5)',
  freeze: 'rgba(56,189,248,0.5)',
}
function FlashOverlay({ flash }) {
  if (!flash) return null
  const color = FLASH_STYLE[flash.type] || 'rgba(255,255,255,0.4)'
  return (
    <div key={flash.id} className="absolute inset-0 z-40 pointer-events-none"
      style={{
        background: `radial-gradient(ellipse at center, transparent 45%, ${color} 100%)`,
        animation: 'flash-pulse 0.55s ease-out forwards',
      }} />
  )
}

const CONFETTI_COLORS = ['#ff6b6b', '#feca57', '#48dbfb', '#ff9ff3', '#1dd1a1', '#f368e0']
function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 26 }).map((_, i) => ({
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      dur: `${1.6 + Math.random() * 1.4}s`,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size: 5 + Math.random() * 6,
    })), [])
  return (
    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
      {pieces.map((p, i) => (
        <span key={i} className="absolute rounded-sm"
          style={{
            left: p.left, top: '-5%', width: p.size, height: p.size, background: p.color,
            animation: `confetti-fall ${p.dur} linear ${p.delay} infinite`,
          }} />
      ))}
    </div>
  )
}
