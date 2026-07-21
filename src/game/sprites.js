// Maps mole appearances + hammer types to their sliced sprite frames.
// Frame columns available per mole: peek, half, up, happy, hit, burrow
// Frame columns per hammer: idle, swing, hit, shake, bomb
import manifest from '../../public/sprites/manifest.json'

const base = import.meta.env.BASE_URL // respects vite `base`

export function moleSprite(appearance, frame = 'up') {
  const set = manifest[appearance]
  if (!set) return ''
  const path = set[frame] || set.up || set.peek
  return base + path
}

export function hammerSprite(hammerKey, frame = 'idle') {
  // hammerKey: 'normal' | 'bomb' | 'power' | 'chain' | 'ice' | 'plate'
  if (hammerKey === 'plate') return PLATE.icon
  const set = manifest['h_' + hammerKey]
  if (!set) return ''
  return base + (set[frame] || set.idle)
}

// Wooden plate item + the closed-hole cover it leaves behind.
export const PLATE = {
  icon: base + 'sprites/plate_icon.png',
  closed: base + 'sprites/plate_closed.png',
}

export const BACKGROUNDS = {
  easy: base + 'bg/easy.png',
  medium: base + 'bg/medium.png',
  hard: base + 'bg/hard.png',
  menu: base + 'bg/menu.png',
  gameover: base + 'bg/gameover.png',
}

// Explosion / burst effect sprites (sliced from sprite_sheet_hammer2.png).
export const FX = {
  boom: base + 'sprites/fx_boom_big.png',
  cross: base + 'sprites/fx_cross.png',
  ice: base + 'sprites/fx_boom_ice.png',
  purple: base + 'sprites/fx_boom_purple.png',
}
