// ============================================================================
//  Mole Mayhem — Game Engine (framework-agnostic, dt-driven)
//  Owns all gameplay state & rules. React mirrors `snapshot()` each frame.
// ============================================================================
import {
  DIFFICULTIES, PHASES, MOLE_TYPES, SERIES, COMBO, HAMMERS, HAMMER_POOL, EFFECTS, GRID,
} from './config'

let _uid = 1
const uid = () => _uid++
const rand = (a, b) => a + Math.random() * (b - a)
const choice = (arr) => arr[(Math.random() * arr.length) | 0]

function weightedPick(weights) {
  const entries = Object.entries(weights)
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = Math.random() * total
  for (const [k, w] of entries) {
    if ((r -= w) <= 0) return k
  }
  return entries[0][0]
}

export class GameEngine {
  constructor(sound) {
    this.sound = sound
    this.reset('easy')
    this.status = 'idle'
  }

  reset(difficultyKey) {
    const d = DIFFICULTIES[difficultyKey]
    this.difficultyKey = difficultyKey
    this.difficulty = d
    this.timeLeft = d.timeLimit
    this.totalTime = d.timeLimit
    this.lives = d.startingLives
    this.maxLives = d.startingLives
    this.score = 0
    this.combo = 0
    this.bestCombo = 0
    // board size can differ per difficulty (3x3 or 3x4)
    this.cols = GRID.cols
    this.rows = d.boardRows || GRID.rows
    this.holes = new Array(this.cols * this.rows).fill(null)
    this.closed = new Set() // holes permanently closed by a wooden plate
    // randomly close `startClosed` holes with planks at the start of the game
    const nStart = Math.min(d.startClosed || 0, this.holes.length - 1)
    const shuffled = [...this.holes.keys()].sort(() => Math.random() - 0.5)
    for (let i = 0; i < nStart; i++) this.closed.add(shuffled[i])
    this.heartBonus = 0
    this.spawnAccum = 0
    this.nextSpawnIn = 600
    this.freezeLeft = 0
    this.inventoryHammer = null
    this.activeHammer = null
    this.activeHammerUses = 0
    this.effects = []
    this.flash = null // {type:'heal'|'damage'|'miss', ttl}
    this.phase = PHASES[0]
    this.fever = false
    this.sound?.setFeverTempo(false) // reset BGM tempo (was stuck fast on replay)
    this.status = 'countdown'
    this._seriesExpect = {} // seriesKind -> next expected position (pooled across sets)
  }

  // ---------------------------------------------------------------------------
  //  Snapshot for rendering
  // ---------------------------------------------------------------------------
  snapshot() {
    return {
      status: this.status,
      difficultyKey: this.difficultyKey,
      timeLeft: Math.max(0, this.timeLeft),
      totalTime: this.totalTime,
      lives: this.lives,
      maxLives: this.maxLives,
      score: this.score,
      combo: this.combo,
      bestCombo: this.bestCombo,
      holes: this.holes,
      closed: this.closed,
      cols: this.cols,
      rows: this.rows,
      phase: this.phase,
      fever: this.fever,
      frozen: this.freezeLeft > 0,
      inventoryHammer: this.inventoryHammer,
      activeHammer: this.activeHammer,
      activeHammerUses: this.activeHammerUses,
      effects: this.effects,
      flash: this.flash,
      heartBonus: this.heartBonus,
    }
  }

  // ---------------------------------------------------------------------------
  //  Main loop
  // ---------------------------------------------------------------------------
  tick(dt) {
    if (this.status !== 'playing') return
    // Effects fade regardless of freeze.
    this._advanceEffects(dt)

    if (this.freezeLeft > 0) {
      this.freezeLeft -= dt
      if (this.freezeLeft <= 0) this._unfreeze()
      return // clock, spawns & mole aging are paused while frozen
    }

    // Game clock
    this.timeLeft -= dt / 1000
    this._updatePhase()

    if (this.timeLeft <= 0) {
      this.timeLeft = 0
      return this._gameOver()
    }

    // Mole aging / expiry
    this._ageMoles(dt)

    // Spawning
    this.spawnAccum += dt
    if (this.spawnAccum >= this.nextSpawnIn) {
      this.spawnAccum = 0
      this._spawn()
      const [mn, mx] = this.difficulty.spawnInterval
      this.nextSpawnIn = rand(mn, mx) / this.phase.spawnRateMult
    }
  }

  _advanceEffects(dt) {
    if (this.flash) {
      this.flash.ttl -= dt
      if (this.flash.ttl <= 0) this.flash = null
    }
    if (this.effects.length === 0) return
    this.effects = this.effects.filter((e) => (e.ttl -= dt) > 0)
  }

  _setFlash(type, ttl = 550) { this.flash = { type, ttl, id: uid() } }

  _ageMoles(dt) {
    for (let i = 0; i < this.holes.length; i++) {
      const m = this.holes[i]
      if (!m) continue
      m.age += dt
      if (m.dead) {
        if (m.age >= m.removeAt) this.holes[i] = null
        continue
      }
      if (m.age >= m.life) {
        // Natural escape — no combo penalty (GDD note). Series escapes as a group.
        if (m.seriesId) this._removeSeries(m.seriesId, 'burrow')
        else this._retire(m, 'burrow')
      }
    }
  }

  _updatePhase() {
    const elapsed = 1 - this.timeLeft / this.totalTime
    let ph = PHASES[0]
    for (const p of PHASES) if (elapsed >= p.pctStart) ph = p
    if (ph !== this.phase) {
      this.phase = ph
      const nowFever = !!ph.fever
      if (nowFever !== this.fever) {
        this.fever = nowFever
        this.sound?.setFeverTempo(nowFever)
      }
    }
  }

  // ---------------------------------------------------------------------------
  //  Spawning
  // ---------------------------------------------------------------------------
  _emptyHoles() {
    const out = []
    for (let i = 0; i < this.holes.length; i++) {
      if (!this.holes[i] && !this.closed.has(i)) out.push(i)
    }
    return out
  }

  // Phase spawn weights with any types this difficulty disables removed.
  _spawnWeights() {
    const disabled = this.difficulty.disabledTypes
    if (!disabled || disabled.length === 0) return this.phase.weights
    const w = { ...this.phase.weights }
    for (const t of disabled) delete w[t]
    if (Object.keys(w).length === 0) w.normal = 1 // never leave weights empty
    return w
  }

  _baseLife(type) {
    let life = this.difficulty.spawnLife / this.phase.speedMult
    if (MOLE_TYPES[type]?.fastMultiplier) life *= MOLE_TYPES[type].fastMultiplier
    return life
  }

  _createMole(type, hole, extra = {}) {
    const def = MOLE_TYPES[type] || { score: 0, hits: 1, chain: [type] }
    return {
      id: uid(), hole, type, def,
      appearance: def.chain[0],
      hp: def.hits,
      age: 0,
      life: this._baseLife(type),
      state: 'up',
      dead: false,
      ...extra,
    }
  }

  _spawn() {
    if (this._emptyHoles().length === 0) return

    // A spawn tick may pop several moles at once (per difficulty spawnBurst).
    const [bmin, bmax] = this.difficulty.spawnBurst || [1, 1]
    const burst = Math.round(rand(bmin, bmax + 0.49))
    const rabbitRate = this.difficulty.rabbitRate ?? 0.03
    for (let n = 0; n < burst; n++) {
      const empties = this._emptyHoles()
      if (empties.length === 0) return
      // Clock rabbit spawns on its own configurable roll (not phase weights).
      let kind = Math.random() < rabbitRate ? 'rabbit' : weightedPick(this._spawnWeights())
      if (kind === 'series') {
        // Only attempt a series if there is room; otherwise spawn a single mole.
        if (empties.length >= 3) { this._spawnSeries(empties); continue }
      }
      const single = kind === 'series' ? 'normal' : kind
      const hole = choice(empties)
      this.holes[hole] = this._createMole(single, hole)
    }
  }

  _spawnSeries(empties) {
    // Prefer MOLE (4) when possible, else 123 (3).
    let kind = '123'
    if (empties.length >= 4 && Math.random() < 0.5) kind = 'MOLE'
    const def = SERIES[kind]
    if (empties.length < def.members.length) return
    const holes = [...empties].sort(() => Math.random() - 0.5).slice(0, def.members.length)
    const seriesId = uid()
    // Progression is tracked per series KIND (pooled across all sets on the
    // board). Only start a fresh count when no set of this kind is currently up
    // — a new set spawning mid-word just joins the existing pool.
    if (this._liveSeriesCount(kind) === 0) this._seriesExpect[kind] = 0
    const life = this.difficulty.spawnLife / this.phase.speedMult
    def.members.forEach((appearance, idx) => {
      const hole = holes[idx]
      this.holes[hole] = {
        id: uid(), hole, type: appearance, def: { score: def.scores[idx], hits: 1, chain: [appearance] },
        appearance, hp: 1, age: 0, life, state: 'up', dead: false,
        seriesId, seriesKind: kind, seriesIndex: idx,
      }
    })
  }

  // ---------------------------------------------------------------------------
  //  Effects & particles
  // ---------------------------------------------------------------------------
  _fx(hole, text, kind = 'score', fx = null) {
    this.effects.push({ id: uid(), hole, text, kind, fx, ttl: fx ? 650 : 800 })
  }

  // ---------------------------------------------------------------------------
  //  Hitting
  // ---------------------------------------------------------------------------
  hit(holeIndex) {
    if (this.status !== 'playing') return
    this._lastStrikeLanded = false

    // Closed holes are inert. A plate tapped on a closed hole does nothing and
    // is NOT consumed; a normal tap on a closed hole is simply ignored.
    if (this.closed.has(holeIndex)) {
      if (this.activeHammer === 'plate') this.sound?.miss()
      return
    }

    const mole = this.holes[holeIndex]
    const hammer = this.activeHammer

    // Frozen board: tapping a frozen mole grants time; nothing else reacts.
    if (this.freezeLeft > 0) {
      if (mole && mole.frozen && !mole.dead) {
        this.timeLeft += EFFECTS.iceTimeBonusPerHit
        this._fx(holeIndex, `+${EFFECTS.iceTimeBonusPerHit}s`, 'time')
        this._retire(mole, 'hit')
        this.sound?.freeze()
        this._bumpCombo(1)
      }
      return
    }

    // Wooden plate works on ANY hole (mole or empty): closes it.
    if (hammer === 'plate') return this._plateStrike(holeIndex, mole)

    if (!mole || mole.dead) {
      // A hammer flagged keepCombo (Power Hammer) never punishes a whiff on an
      // empty hole: no combo break, no miss buzzer, no use spent.
      if (hammer && HAMMERS[hammer]?.keepCombo) return
      // Empty hole tap -> combo break (GDD combo rule 1)
      if (this.combo > 0) this._fx(holeIndex, '✗', 'miss')
      this._breakCombo()
      this.sound?.miss()
      return
    }

    // Power / Bomb / Ice hammers override normal resolution entirely.
    if (hammer === 'power') return this._powerSmash(mole)
    if (hammer === 'bomb') return this._bombSmash(mole)
    if (hammer === 'ice') return this._iceSmash(mole)

    switch (true) {
      case !!mole.seriesId:
        this._hitSeries(mole); break
      case mole.type === 'bomb':
        this._hitBomb(mole); break
      case mole.type === 'rabbit':
        this._hitRabbit(mole); break
      case mole.type === 'nurse':
        this._hitNurse(mole); break
      case mole.type === 'golden':
        this._killMole(mole, mole.def.score); this.sound?.golden(); break
      case mole.type === 'rainbow':
        this._killMole(mole, mole.def.score); this.sound?.golden(); break
      case mole.type === 'stone' || mole.type === 'metal':
        this._hitArmored(mole); break
      default:
        this._hitNormal(mole)
    }
  }

  _hitNormal(mole) {
    this._killMole(mole, mole.def.score)
    this.sound?.hit()
    this._maybeConsumeAfterNormalStrike()
  }

  _hitArmored(mole) {
    mole.hp -= 1
    if (mole.hp <= 0) {
      this._killMole(mole, mole.def.score)
      this.sound?.hit()
    } else {
      // Crack a layer: change appearance, shake, no score, combo preserved.
      mole.appearance = mole.def.chain[mole.def.chain.length - mole.hp]
      mole.state = 'shake'
      setTimeout(() => { if (!mole.dead) mole.state = 'up' }, 400)
      if (mole.type === 'metal') this.sound?.hitMetal()
      else this.sound?.hitStone()
    }
    this._maybeConsumeAfterNormalStrike()
  }

  _hitSeries(mole) {
    const { seriesKind, seriesIndex } = mole
    const def = SERIES[seriesKind]

    // Order is checked by POSITION within the word, pooled across every set of
    // this kind on the board. So with two 123 sets up you may tap 1️⃣ from set A,
    // 2️⃣ from set B, 3️⃣ from set A and still score — you just have to keep the
    // 1→2→3 (or M→O→L→E) order regardless of which set each mole belongs to.
    const expected = this._seriesExpect[seriesKind] ?? 0
    if (seriesIndex === expected) {
      const pts = def.scores[seriesIndex]
      this._killMole(mole, pts)
      this.sound?.seriesNote(seriesKind, seriesIndex)
      const next = expected + 1
      if (next >= def.members.length) {
        // A full word (0..n-1) finished — its members may have come from
        // different sets. Reward the jingle and start the next word at 0.
        this.sound?.seriesComplete()
        this._seriesExpect[seriesKind] = 0
      } else {
        this._seriesExpect[seriesKind] = next
      }
      this._maybeConsumeAfterNormalStrike()
    } else {
      // Wrong position -> combo resets + loud feedback. Because the progression
      // is shared across all sets of this kind, a foul breaks the whole pool.
      // What happens to those moles is configurable per difficulty: 'flee' =
      // all disappear, 'normal' (default) = they turn into plain normal moles.
      const mode = this.difficulty.seriesMissMode || 'normal'
      this._fx(mole.hole, 'MISS!', 'miss')
      if (mode === 'flee') {
        this._removeSeriesKind(seriesKind, 'burrow')
      } else {
        this._orphanSeriesKindToNormal(seriesKind)
      }
      // Whether an out-of-order series tap resets the combo is per-difficulty
      // (`seriesMissBreaksCombo`). Sleepy/easy is forgiving (keeps combo);
      // the harder levels break it. Undefined defaults to breaking.
      if (this.difficulty.seriesMissBreaksCombo !== false) this._breakCombo()
      this._setFlash('miss')
      this.sound?.seriesFail()
    }
  }

  // Count live (not-dead) series moles of a given kind currently on the board.
  _liveSeriesCount(kind) {
    let n = 0
    for (const m of this.holes) if (m && m.seriesKind === kind && !m.dead) n++
    return n
  }

  _hitBomb(mole) {
    // Normal hammer on a bomb: lose a heart, combo reset.
    this._retire(mole, 'explode')
    this.sound?.bomb()
    this._fx(mole.hole, '', 'boom', 'boom') // orange explosion sprite
    this._loseLife(EFFECTS.bombLifePenalty)
    this._breakCombo()
  }

  // --- Special-hammer strikes -------------------------------------------------

  // Power Hammer: one-hit-kill ANY mole for full score; bombs & rabbits die
  // harmlessly (no life loss, no combo break). 10 uses. It always plays the
  // single power-hammer smash sound (`hitMetal`) no matter what it strikes —
  // the rabbit/nurse gameplay effects still apply, just with their own chime
  // suppressed so the hammer sounds consistent.
  _powerSmash(mole) {
    switch (mole.type) {
      case 'bomb':
        // defused: no explosion — the bomb just dodges back down the hole.
        this._retire(mole, 'burrow'); this.sound?.hitMetal(); break
      case 'rabbit':
        this._hitRabbit(mole, true); this.sound?.hitMetal(); break // +time, hammer sound
      case 'nurse':
        this._hitNurse(mole, true); this.sound?.hitMetal(); break // heal, hammer sound
      default: {
        // normal / stone / metal / golden / series member -> full score kill
        const sid = mole.seriesId
        this._killMole(mole, mole.def.score)
        this.sound?.hitMetal()
        // don't leave a broken series behind
        if (sid != null) this._orphanSeriesToNormal(sid)
      }
    }
    this._consumeHammer()
  }

  // Ice Hammer: hitting ANY mole (bomb / rabbit / nurse included) freezes the
  // whole board for a moment. The struck mole is destroyed without penalty
  // (scoreable ones still score, nurse still gives its bonus). Single use.
  _iceSmash(mole) {
    switch (mole.type) {
      case 'bomb':
        this._retire(mole, 'explode'); break
      case 'rabbit':
        this._hitRabbit(mole); break // clock rabbit -> bonus time
      case 'nurse':
        this._hitNurse(mole); break
      default: {
        const sid = mole.seriesId
        this._killMole(mole, mole.def.score)
        if (sid != null) this._orphanSeriesToNormal(sid)
      }
    }
    this._consumeHammer()
    this._triggerFreeze()
  }

  // Wooden Plate: taps a hole to close it permanently (no more moles there).
  // Any mole in that hole dies instantly with no penalty (bomb/rabbit/metal/
  // stone included); scoreable moles still give points. Single use — but a
  // plate tapped on an already-closed hole was handled earlier (no consume).
  _plateStrike(holeIndex, mole) {
    if (mole && !mole.dead) {
      if (!mole.def.harmful && mole.def.score > 0) {
        this._applyScore(mole.def.score, holeIndex)
        this._bumpCombo(1)
      }
      const sid = mole.seriesId
      this._retire(mole, 'hit')
      if (sid != null) this._orphanSeriesToNormal(sid)
    }
    this.closed.add(holeIndex)
    this.sound?.plate()
    this._consumeHammer()
  }

  // Any surviving members of a single series set (after some were destroyed out
  // of order, e.g. by a bomb blast or power hammer) revert to plain normal moles
  // so the player is never left with an un-completable "broken" series.
  _orphanSeriesToNormal(seriesId) {
    if (seriesId == null) return
    let kind = null
    this.holes.forEach((m) => {
      if (m && m.seriesId === seriesId && !m.dead) {
        kind = m.seriesKind
        m.type = 'normal'
        m.appearance = 'normal'
        m.def = MOLE_TYPES.normal
        m.hp = 1
        m.seriesId = undefined
        m.seriesKind = undefined
        m.seriesIndex = undefined
      }
    })
    // if that emptied the pool for this kind, reset its pooled progression
    if (kind && this._liveSeriesCount(kind) === 0) delete this._seriesExpect[kind]
  }

  // Convert EVERY live set of a kind to normal moles (used on a foul, since the
  // 1→2→3 progression is pooled across all sets of the kind).
  _orphanSeriesKindToNormal(kind) {
    this.holes.forEach((m) => {
      if (m && m.seriesKind === kind && !m.dead) {
        m.type = 'normal'
        m.appearance = 'normal'
        m.def = MOLE_TYPES.normal
        m.hp = 1
        m.seriesId = undefined
        m.seriesKind = undefined
        m.seriesIndex = undefined
      }
    })
    delete this._seriesExpect[kind]
  }

  // Make every live set of a kind flee/burrow (foul in 'flee' mode).
  _removeSeriesKind(kind, exit) {
    this.holes.forEach((m) => {
      if (m && m.seriesKind === kind && !m.dead) this._retire(m, exit)
    })
    delete this._seriesExpect[kind]
  }

  // Neighbour offsets [dr,dc] for the two configurable bomb blast shapes.
  //   'cross'  -> centre + up/down/left/right   (5 holes)
  //   'square' -> centre + all 8 neighbours     (9 holes)
  static BLAST_OFFSETS = {
    cross: [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]],
    square: [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1], [0, 0], [0, 1],
      [1, -1], [1, 0], [1, 1],
    ],
  }

  // Bomb Hammer: hitting ANY mole triggers a blast whose shape is configurable
  // per difficulty (`bombBlast`: 'cross' or 'square'). Every mole caught is
  // destroyed; scoreable ones give points, bombs & rabbits are cleared
  // harmlessly. Single use.
  _bombSmash(mole) {
    this.sound?.bomb()
    const cols = this.cols
    const rows = this.rows
    const r = Math.floor(mole.hole / cols)
    const c = mole.hole % cols
    const shape = this.difficulty.bombBlast || EFFECTS.bombBlastDefault || 'cross'
    const offsets = GameEngine.BLAST_OFFSETS[shape] || GameEngine.BLAST_OFFSETS.cross
    let gained = 0
    const hitSeries = new Set()
    offsets.forEach(([dr, dc]) => {
      const nr = r + dr
      const nc = c + dc
      if (nr < 0 || nc < 0 || nr >= rows || nc >= cols) return
      const idx = nr * cols + nc
      // explosion burst on every affected hole (big cross sprite at the centre)
      this._fx(idx, '', 'boom', dr === 0 && dc === 0 ? 'cross' : 'boom')
      const nm = this.holes[idx]
      if (!nm || nm.dead) return
      if (nm.def.harmful) {
        this._retire(nm, 'explode') // bombs & rabbits cleared, no penalty
      } else {
        if (nm.seriesId != null) hitSeries.add(nm.seriesId)
        gained += nm.def.score
        if (nm.def.score > 0) this._bumpCombo(1)
        this._killMole(nm, nm.def.score, true)
      }
    })
    // any series partly caught in the blast: survivors become normal moles
    hitSeries.forEach((sid) => this._orphanSeriesToNormal(sid))
    if (gained) this._applyScore(gained, mole.hole)
    this._consumeHammer()
  }

  // Clock Rabbit: hitting it grants bonus time and keeps the combo alive.
  // `silent` suppresses its chime (used by the power hammer, which plays its
  // own single smash sound instead).
  _hitRabbit(mole, silent = false) {
    this._retire(mole, 'hit')
    this.timeLeft += EFFECTS.rabbitTimeBonus
    this._fx(mole.hole, `+${EFFECTS.rabbitTimeBonus}s`, 'time')
    if (!silent) this.sound?.nurse()
    this._setFlash('heal')
    this._bumpCombo(1)
  }

  // Nurse mole: restores a heart (no time bonus). If already full, no effect.
  // `silent` suppresses its chime (see _hitRabbit).
  _hitNurse(mole, silent = false) {
    this._retire(mole, 'hit')
    if (!silent) this.sound?.nurse()
    if (this.lives < this.maxLives) {
      this.lives += 1
      this._fx(mole.hole, '❤️+1', 'heal')
      this._setFlash('heal')
    }
    this._bumpCombo(1) // nurse keeps combo alive (GDD combo list)
  }

  // ---------------------------------------------------------------------------
  //  Kill / retire helpers
  // ---------------------------------------------------------------------------
  _killMole(mole, points, silent = false) {
    this._lastStrikeLanded = true
    if (!silent) this._applyScore(points, mole.hole)
    if (points > 0 && !silent) this._bumpCombo(1)
    this._retire(mole, 'hit')
  }

  _applyScore(points, hole) {
    if (points <= 0) return
    const mult = this.phase.scoreMult || 1
    const gained = points * mult
    this.score += gained
    this._fx(hole, `+${gained}`, mult > 1 ? 'feverscore' : 'score')
  }

  _retire(mole, exit) {
    mole.dead = true
    mole.state = exit === 'burrow' ? 'burrow' : 'hit'
    mole.removeAt = mole.age + (exit === 'explode' ? 200 : 350)
  }

  // Retire a whole spawned set together (natural group escape on timeout).
  _removeSeries(seriesId, exit) {
    let kind = null
    this.holes.forEach((m) => {
      if (m && m.seriesId === seriesId && !m.dead) { kind = m.seriesKind; this._retire(m, exit) }
    })
    // reset pooled progression only if no other set of this kind is still up
    if (kind && this._liveSeriesCount(kind) === 0) delete this._seriesExpect[kind]
  }

  // ---------------------------------------------------------------------------
  //  Combo & rewards
  // ---------------------------------------------------------------------------
  _bumpCombo(n) {
    for (let i = 0; i < n; i++) {
      this.combo += 1
      this.bestCombo = Math.max(this.bestCombo, this.combo)
      this._checkComboRewards()
    }
    if (this.combo > 1) this.sound?.combo()
  }

  _breakCombo() { this.combo = 0 }

  _checkComboRewards() {
    const c = this.combo
    const { hammer, rainbow } = COMBO.milestones
    if (hammer > 0 && c % hammer === 0) this._rewardHammer()
    if (rainbow > 0 && c % rainbow === 0) this._spawnRainbow()
  }

  // Combo reward: pop a Rainbow Mole (worth MOLE_TYPES.rainbow.score) in a
  // random open hole. Behaves like a normal mole otherwise.
  _spawnRainbow() {
    const empties = this._emptyHoles()
    if (empties.length === 0) return
    const hole = choice(empties)
    this.holes[hole] = this._createMole('rainbow', hole)
    this.sound?.reward()
    this._fx(hole, '🌈', 'rush')
  }

  _rewardHammer() {
    // Drop pool depends on board size: 3x3 offers the Golden hammer, 3x4 offers
    // the wooden Plate — but the Plate is withheld when too few holes remain
    // open (so the board can't be sealed down to almost nothing).
    const pool = [...HAMMER_POOL.base]
    if (this.rows >= 4) {
      const openHoles = this.holes.length - this.closed.size
      if (openHoles > HAMMER_POOL.plateMinOpenHoles) pool.push(HAMMER_POOL.board3x4)
    } else {
      pool.push(HAMMER_POOL.board3x3)
    }
    const key = weightedPick(
      Object.fromEntries(pool.map((k) => [k, HAMMERS[k].dropWeight])),
    )
    this.inventoryHammer = key
    this.sound?.reward()
    this._fx(1, '🔨', 'reward')
  }

  // ---------------------------------------------------------------------------
  //  Hammers
  // ---------------------------------------------------------------------------
  // Toggle a hammer on/off from the top hammer bar. Only the owned hammer can
  // be activated; tapping the active one deactivates it (without consuming).
  // "instant" hammers (Golden) fire their effect immediately on activation.
  toggleHammer(key) {
    if (key !== this.inventoryHammer) return

    if (HAMMERS[key].instant) {
      if (key === 'chain') this._goldenHammer()
      this.inventoryHammer = null
      this.activeHammer = null
      this.activeHammerUses = 0
      return
    }

    if (this.activeHammer === key) {
      this.activeHammer = null
      this.activeHammerUses = 0
    } else {
      this.activeHammer = key
      this.activeHammerUses = HAMMERS[key].uses
      this.sound?.reward()
    }
  }

  // Golden Hammer: instantly turns every mole currently up into a golden mole.
  // Golden Hammer: a golden mole pops up in EVERY open hole (holes with a mole
  // turn golden; empty holes get a fresh golden mole). Closed / dying holes are
  // left alone. Generous life so the player can cash them all in.
  _goldenHammer() {
    this.sound?.goldenRush?.()
    let turned = 0
    for (let i = 0; i < this.holes.length; i++) {
      if (this.closed.has(i)) continue
      if (this.holes[i] && this.holes[i].dead) continue
      this.holes[i] = this._createMole('golden', i, {
        life: this.difficulty.spawnLife, // full life (override golden's fast decay)
      })
      turned++
    }
    if (turned) this._fx(1, '👑 GOLD!', 'rush')
  }

  _maybeConsumeAfterNormalStrike() {
    // Power hammer consumes on each armored strike (handled in _hitArmored);
    // for other hammers a use is spent per landed strike.
    if (!this.activeHammer) return
    if (this.activeHammer === 'power' || this.activeHammer === 'bomb' ||
        this.activeHammer === 'chain' || this.activeHammer === 'ice') {
      // these are consumed by their specific handlers
      return
    }
  }

  _consumeHammer() {
    if (!this.activeHammer) return
    this.activeHammerUses -= 1
    if (this.activeHammerUses <= 0) {
      // Fully used up -> remove from inventory too.
      if (this.inventoryHammer === this.activeHammer) this.inventoryHammer = null
      this.activeHammer = null
      this.activeHammerUses = 0
    }
  }

  _triggerFreeze() {
    this.freezeLeft = EFFECTS.iceFreezeDuration
    this.sound?.freeze()
    this.holes.forEach((m) => {
      if (m && !m.dead) { m.frozen = true; m.prevAppearance = m.appearance; m.appearance = 'ice' }
    })
    this._fx(1, '❄️ FREEZE', 'rush')
    this._setFlash('freeze', 500)
  }

  _unfreeze() {
    this.freezeLeft = 0
    this.holes.forEach((m) => {
      if (m && m.frozen && !m.dead) { m.frozen = false; m.appearance = m.prevAppearance || m.appearance }
    })
  }

  // ---------------------------------------------------------------------------
  //  Lives & game over
  // ---------------------------------------------------------------------------
  _loseLife(n) {
    this.lives -= n
    this._setFlash('damage')
    if (this.lives <= 0) {
      this.lives = 0
      this._gameOver()
    }
  }

  _gameOver() {
    if (this.status === 'gameover') return
    // bonus: remaining hearts are worth points (added before high-score check)
    this.heartBonus = this.lives * (EFFECTS.heartBonus || 0)
    this.score += this.heartBonus
    this.status = 'gameover'
    this.sound?.stopBGM()
    this.sound?.gameover()
  }

  // reset lastStrike flag before each hit (used by ice hammer proc)
  beginHit() { this._lastStrikeLanded = false }
}
