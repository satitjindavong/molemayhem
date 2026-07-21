import { useMemo } from 'react'
import { BACKGROUNDS } from '../game/sprites'

// Renders an illustrated stage/menu background (from design assets) plus a
// light layer of drifting particles for motion. Falls back to a pastel
// gradient if no image key is given.
const GRADIENTS = {
  flower: 'linear-gradient(to bottom, #bae6fd 0%, #d9f99d 55%, #86efac 100%)',
  desert: 'linear-gradient(to bottom, #fde68a 0%, #fdba74 60%, #fb923c 100%)',
  graveyard: 'linear-gradient(to bottom, #312e81 0%, #4c1d95 55%, #2e1065 100%)',
}

const PARTICLES = {
  flower: ['🌸', '🌼', '✨'],
  desert: ['✨', '🌟', '💫'],
  graveyard: ['✨', '❄️', '🔹'],
}

// Preload & keep decoded background images alive so returning to the menu (or
// switching stages) never shows a blank/black background while it re-decodes.
const _bgCache = []
if (typeof window !== 'undefined') {
  Object.values(BACKGROUNDS).forEach((src) => {
    const img = new Image()
    img.src = src
    _bgCache.push(img) // hold a reference so it isn't garbage-collected
  })
}

export default function Scene({ bg, theme = 'flower', dim = 0, children }) {
  const image = bg ? BACKGROUNDS[bg] : null
  const particles = useMemo(() => {
    const set = PARTICLES[theme] || PARTICLES.flower
    return Array.from({ length: 9 }).map((_, i) => ({
      e: set[i % set.length],
      left: `${(i * 37 + 6) % 96}%`,
      size: 10 + (i % 3) * 6,
      dur: 7 + (i % 5) * 2,
      delay: -(i * 1.7),
      drift: (i % 2 ? 1 : -1) * (6 + (i % 3) * 4),
    }))
  }, [theme])

  // Always paint the pastel gradient as a base layer so the screen is never
  // blank if the (large) background image is slow to decode or drops from cache.
  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ background: GRADIENTS[theme] || GRADIENTS.flower }}
    >
      {image && (
        <div
          className="absolute inset-0"
          style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
        />
      )}
      {/* drifting sparkle/petal particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p, i) => (
          <span key={i} className="absolute opacity-70"
            style={{
              left: p.left,
              bottom: '-8%',
              fontSize: p.size,
              ['--drift']: `${p.drift}px`,
              animation: `rise ${p.dur}s linear ${p.delay}s infinite`,
            }}>
            {p.e}
          </span>
        ))}
      </div>
      {dim > 0 && <div className="absolute inset-0 bg-black" style={{ opacity: dim }} />}
      {children}
    </div>
  )
}
