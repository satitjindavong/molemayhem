// Headless engine smoke test: runs full games at each difficulty, hammering
// randomly, and asserts invariants + basic behaviour. No browser required.
import { GameEngine } from '../src/game/engine.js'
import { DIFFICULTIES } from '../src/game/config.js'

const noop = new Proxy({}, { get: () => () => {} })

function playFull(diff, seed) {
  const eng = new GameEngine(noop)
  eng.reset(diff)
  eng.status = 'playing'
  let ticks = 0
  let hits = 0
  let maxScore = 0
  let equips = 0
  // deterministic-ish random via simple LCG so runs are reproducible
  let s = seed
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff
  const origRandom = Math.random
  Math.random = rnd

  while (eng.status === 'playing' && ticks < 20000) {
    eng.tick(50)
    ticks++
    // hit a hole occasionally (~3/sec — human-like, not a farming bot)
    if (rnd() < 0.15) {
      const h = (rnd() * 12) | 0
      eng.hit(h)
      hits++
    }
    if (eng.inventoryHammer && !eng.activeHammer && rnd() < 0.3) {
      eng.toggleHammer(eng.inventoryHammer); equips++
    }
    maxScore = Math.max(maxScore, eng.score)
    // invariants
    if (eng.lives < 0) throw new Error('lives went negative')
    if (eng.lives > eng.maxLives) throw new Error('lives exceeded max')
    if (eng.score < 0) throw new Error('score negative')
    if (eng.holes.length !== eng.cols * eng.rows) throw new Error('holes length changed')
    if (eng.combo < 0) throw new Error('combo negative')
  }
  Math.random = origRandom
  return { diff, ticks, hits, equips, score: eng.score, bestCombo: eng.bestCombo, lives: eng.lives, status: eng.status, timeLeft: eng.timeLeft.toFixed(1) }
}

let ok = true
for (const diff of Object.keys(DIFFICULTIES)) {
  for (let seed = 1; seed <= 3; seed++) {
    try {
      const r = playFull(diff, seed * 777)
      console.log(`✓ ${diff} seed${seed}:`, JSON.stringify(r))
      // Note: a game may legitimately not end within the tick cap if the player
      // farms nurse time bonuses; invariants (checked inside) are what matter.
    } catch (e) {
      console.error(`✗ ${diff} seed${seed} threw:`, e.stack)
      ok = false
    }
  }
}

// Targeted rule checks -------------------------------------------------------
function freshPlaying(diff = 'easy') {
  const e = new GameEngine(noop); e.reset(diff); e.status = 'playing'
  e.closed = new Set() // start fully open for deterministic seeding
  return e
}

// combo breaks on empty-hole tap
{
  const e = freshPlaying()
  e.combo = 5
  // ensure hole 0 empty
  e.holes[0] = null
  e.hit(0)
  if (e.combo !== 0) { console.error('✗ empty tap should reset combo'); ok = false }
  else console.log('✓ empty-hole tap resets combo')
}

// bomb with normal hammer costs a life + resets combo
{
  const e = freshPlaying()
  e.combo = 4; e.lives = 3
  e.holes[0] = e._createMole('bomb', 0)
  e.hit(0)
  if (e.lives !== 2 || e.combo !== 0) { console.error('✗ bomb penalty wrong', e.lives, e.combo); ok = false }
  else console.log('✓ bomb hit: -1 life, combo reset')
}

// stone needs 2 hits, awards 2
{
  const e = freshPlaying()
  const scoreBefore = e.score
  e.holes[0] = e._createMole('stone', 0)
  e.hit(0)
  if (e.score !== scoreBefore) { console.error('✗ stone 1st hit should not score'); ok = false }
  e.hit(0)
  if (e.score !== scoreBefore + 2) { console.error('✗ stone kill should give 2, got', e.score); ok = false }
  else console.log('✓ stone: 2 hits -> +2')
}

// series wrong order (default 'normal' mode): survivors become normal, combo resets
{
  const e = freshPlaying() // easy -> seriesMissMode 'normal'
  e.combo = 7
  ;['s1', 's2', 's3'].forEach((a, i) => {
    e.holes[i] = { id: 100 + i, hole: i, type: a, def: { score: [1,2,4][i], hits: 1, chain: [a] }, appearance: a, hp: 1, age: 0, life: 3000, state: 'up', dead: false, seriesId: 999, seriesKind: '123', seriesIndex: i }
  })
  e._seriesExpect['123'] = 0
  e.hit(2) // hit '3' first = wrong
  const survivors = e.holes.filter((m) => m && !m.dead)
  const allNormal = survivors.length === 3 && survivors.every((m) => m.type === 'normal' && m.seriesId == null)
  if (e.combo !== 0) { console.error('✗ series wrong-order should reset combo'); ok = false }
  else if (!allNormal) { console.error('✗ default miss mode: survivors should become normal moles', survivors.map((m) => m.type)); ok = false }
  else console.log('✓ series wrong-order (normal mode): combo reset + survivors -> normal')
}

// series wrong order 'flee' mode: whole set disappears
{
  const e = freshPlaying()
  e.difficulty = { ...e.difficulty, seriesMissMode: 'flee' }
  ;['s1', 's2', 's3'].forEach((a, i) => {
    e.holes[i] = { id: 300 + i, hole: i, type: a, def: { score: [1,2,4][i], hits: 1, chain: [a] }, appearance: a, hp: 1, age: 0, life: 3000, state: 'up', dead: false, seriesId: 777, seriesKind: '123', seriesIndex: i }
  })
  e._seriesExpect['123'] = 0
  e.hit(2)
  const alive = e.holes.filter((m) => m && !m.dead && m.seriesId === 777).length
  if (alive !== 0) { console.error('✗ flee mode: set should be gone', alive); ok = false }
  else console.log('✓ series wrong-order (flee mode): whole set flees')
}

// series correct order scores 1,2,4
{
  const e = freshPlaying()
  ;['s1', 's2', 's3'].forEach((a, i) => {
    e.holes[i] = { id: 200 + i, hole: i, type: a, def: { score: [1,2,4][i], hits: 1, chain: [a] }, appearance: a, hp: 1, age: 0, life: 3000, state: 'up', dead: false, seriesId: 888, seriesKind: '123', seriesIndex: i }
  })
  e._seriesExpect['123'] = 0
  const before = e.score
  e.hit(0); e.hit(1); e.hit(2)
  if (e.score !== before + 7) { console.error('✗ series ordered should give 7, got', e.score - before); ok = false }
  else console.log('✓ series 1->2->3 ordered: +7')
}

// TWO 123 sets up at once: order is by POSITION pooled across sets, so tapping
// 1(A),2(B),3(A) then 1(B),2(A),3(B) all scores with no foul.
{
  const e = freshPlaying()
  const mk = (id, hole, a, idx, sid) => ({
    id, hole, type: a, def: { score: [1, 2, 4][idx], hits: 1, chain: [a] },
    appearance: a, hp: 1, age: 0, life: 3000, state: 'up', dead: false,
    seriesId: sid, seriesKind: '123', seriesIndex: idx,
  })
  // set A in holes 0,1,2 ; set B in holes 3,4,5
  e.holes[0] = mk(401, 0, 's1', 0, 4001); e.holes[1] = mk(402, 1, 's2', 1, 4001); e.holes[2] = mk(403, 2, 's3', 2, 4001)
  e.holes[3] = mk(404, 3, 's1', 0, 4002); e.holes[4] = mk(405, 4, 's2', 1, 4002); e.holes[5] = mk(406, 5, 's3', 2, 4002)
  e._seriesExpect['123'] = 0
  e.combo = 0
  const before = e.score
  // interleave sets: 1(A)@0, 2(B)@4, 3(A)@2  -> full word, +7
  e.hit(0); e.hit(4); e.hit(2)
  const word1ok = e.score === before + 7 && e.combo === 3
  // remaining leftovers form another word: 1(B)@3, 2(A)@1, 3(B)@5 -> +7 more
  e.hit(3); e.hit(1); e.hit(5)
  const word2ok = e.score === before + 14 && e.combo === 6
  const noBroken = e.holes.every((m) => !m || m.dead)
  if (!word1ok) { console.error('✗ interleaved word 1 should score 7 & combo 3, got', e.score - before, e.combo); ok = false }
  else if (!word2ok) { console.error('✗ interleaved word 2 should reach +14 & combo 6, got', e.score - before, e.combo); ok = false }
  else if (!noBroken) { console.error('✗ both interleaved sets should be fully cleared'); ok = false }
  else console.log('✓ series cross-set: interleaved 1→2→3 across two sets scores +14, no foul')
}

// Cross-set still fouls on a genuine out-of-position tap (2 before 1)
{
  const e = freshPlaying()
  const mk = (id, hole, a, idx, sid) => ({
    id, hole, type: a, def: { score: [1, 2, 4][idx], hits: 1, chain: [a] },
    appearance: a, hp: 1, age: 0, life: 3000, state: 'up', dead: false,
    seriesId: sid, seriesKind: '123', seriesIndex: idx,
  })
  e.holes[0] = mk(501, 0, 's1', 0, 5001); e.holes[1] = mk(502, 1, 's2', 1, 5001); e.holes[2] = mk(503, 2, 's3', 2, 5001)
  e.holes[3] = mk(504, 3, 's1', 0, 5002); e.holes[4] = mk(505, 4, 's2', 1, 5002); e.holes[5] = mk(506, 5, 's3', 2, 5002)
  e._seriesExpect['123'] = 0
  e.combo = 5
  e.hit(0) // 1(A) ok, expected -> 1
  e.hit(2) // 3(A) while expecting position 1 -> foul: all '123' sets orphaned
  const anySeries = e.holes.some((m) => m && !m.dead && m.seriesKind === '123')
  if (e.combo !== 0) { console.error('✗ cross-set foul should reset combo'); ok = false }
  else if (anySeries) { console.error('✗ cross-set foul (normal mode) should orphan ALL 123 sets'); ok = false }
  else console.log('✓ series cross-set: out-of-position tap fouls and clears the whole 123 pool')
}

// nurse heals a heart only (no time bonus), keeps combo
{
  const e = freshPlaying()
  e.lives = 1; e.combo = 3
  e.holes[0] = e._createMole('nurse', 0)
  const timeBefore = e.timeLeft
  e.hit(0)
  if (e.lives !== 2) { console.error('✗ nurse should heal a heart', e.lives); ok = false }
  else if (e.timeLeft > timeBefore) { console.error('✗ nurse should NOT add time now', e.timeLeft - timeBefore); ok = false }
  else if (e.combo !== 4) { console.error('✗ nurse should keep/bump combo', e.combo); ok = false }
  else console.log('✓ nurse: heals heart, no time, combo kept')
}

// end-game heart bonus: remaining hearts * heartBonus added to score
{
  const e = freshPlaying()
  e.lives = 3
  const before = e.score
  e.timeLeft = 0.2
  for (let i = 0; i < 10; i++) e.tick(50)
  if (e.status !== 'gameover') { console.error('✗ should be game over'); ok = false }
  else if (e.heartBonus !== 3 * 5 || e.score !== before + 15) { console.error('✗ heart bonus should be 3*5=15', e.heartBonus, e.score - before); ok = false }
  else console.log('✓ end-game heart bonus: +15 (3 hearts x 5)')
}

// startClosed: medium closes 2 holes with planks at game start
{
  const e = new GameEngine(noop); e.reset('medium')
  if (e.closed.size !== 2) { console.error('✗ medium should start with 2 closed holes', e.closed.size); ok = false }
  else console.log('✓ startClosed: medium begins with 2 planks')
  const e2 = new GameEngine(noop); e2.reset('easy')
  if (e2.closed.size !== 0) { console.error('✗ easy should start with 0 closed holes', e2.closed.size); ok = false }
  else console.log('✓ startClosed: easy begins with 0 planks')
}

// golden mole is faster (shorter life)
{
  const e = freshPlaying()
  const g = e._createMole('golden', 0)
  const n = e._createMole('normal', 1)
  if (!(g.life < n.life)) { console.error('✗ golden should be faster', g.life, n.life); ok = false }
  else console.log('✓ golden life < normal life')
}

// game over when time runs out
{
  const e = freshPlaying()
  e.timeLeft = 0.4
  for (let i = 0; i < 20; i++) e.tick(50)
  if (e.status !== 'gameover') { console.error('✗ should game-over on time out', e.status); ok = false }
  else console.log('✓ game-over on time out')
}

// game over when lives hit 0
{
  const e = freshPlaying()
  e.lives = 1
  e.holes[0] = e._createMole('bomb', 0)
  e.hit(0)
  if (e.status !== 'gameover' || e.lives !== 0) { console.error('✗ should game-over at 0 lives', e.status, e.lives); ok = false }
  else console.log('✓ game-over at 0 lives')
}

// no golden-rush combo reward remains (removed)
{
  const e = freshPlaying()
  if (typeof e._startGoldenRush === 'function' || 'goldenRushLeft' in e) {
    console.error('✗ golden rush should be fully removed'); ok = false
  } else console.log('✓ golden rush removed')
}

// spawn burst puts multiple moles up at once
{
  const e = freshPlaying('hard')
  e._spawn()
  const up = e.holes.filter(Boolean).length
  if (up < 2) { console.error('✗ hard spawn burst should place >=2 moles, got', up); ok = false }
  else console.log('✓ spawn burst places multiple moles:', up)
}

// Clock rabbit: hitting it grants bonus time + keeps combo, never costs a life
{
  const e = freshPlaying()
  e.lives = 3; e.combo = 4
  const before = e.timeLeft
  e.holes[0] = e._createMole('rabbit', 0)
  e.hit(0)
  const gained = e.timeLeft - before
  if (e.lives !== 3) { console.error('✗ clock rabbit must not cost a life', e.lives); ok = false }
  else if (gained < 1.9 || gained > 2.1) { console.error('✗ clock rabbit should give ~2s, got', gained); ok = false }
  else if (e.combo !== 5) { console.error('✗ clock rabbit should keep/bump combo', e.combo); ok = false }
  else console.log('✓ clock rabbit: +2s, +combo, no life lost')
}

// Power hammer: one-hit-kills anything; rabbit gives no penalty; 10 uses
{
  const e = freshPlaying()
  e.inventoryHammer = 'power'; e.toggleHammer('power')
  if (e.activeHammerUses !== 15) { console.error('✗ power should have 15 uses', e.activeHammerUses); ok = false }
  // metal dies in one hit for full score
  e.holes[0] = e._createMole('metal', 0)
  const s0 = e.score
  e.hit(0)
  const dead0 = !e.holes[0] || e.holes[0].dead
  if (!dead0 || e.score !== s0 + 3) { console.error('✗ power should 1-shot metal for +3', e.score - s0); ok = false }
  else console.log('✓ power: metal 1-shot +3')
  // rabbit (clock): no life loss, grants time, keeps combo
  e.combo = 5; e.lives = 3
  const tb = e.timeLeft
  e.holes[1] = e._createMole('rabbit', 1)
  e.hit(1)
  if (e.lives !== 3 || e.timeLeft <= tb) { console.error('✗ power on clock rabbit should give time, no penalty', e.lives, e.timeLeft - tb); ok = false }
  else console.log('✓ power: clock rabbit -> +time, no penalty')
  if (e.activeHammerUses !== 13) { console.error('✗ power should have consumed 2 uses', e.activeHammerUses); ok = false }
  else console.log('✓ power: uses counted down (13 left)')
}

// Bomb blast on a partial series -> survivors become normal moles (no broken set)
{
  const e = freshPlaying()
  // 123 series across holes 0,1,2 ; bomb at hole 1 will catch member s2 only
  ;['s1', 's2', 's3'].forEach((a, i) => {
    e.holes[i] = { id: 700 + i, hole: i, type: a, def: { score: [1, 2, 4][i], hits: 1, chain: [a] }, appearance: a, hp: 1, age: 0, life: 5000, state: 'up', dead: false, seriesId: 555, seriesKind: '123', seriesIndex: i }
  })
  e._seriesExpect[555] = 0
  e.inventoryHammer = 'bomb'; e.toggleHammer('bomb')
  e.hit(1) // cross blast centred on the middle member
  const survivors = e.holes.filter((m) => m && !m.dead)
  const brokenSeries = survivors.some((m) => m.seriesId != null)
  if (brokenSeries) { console.error('✗ bomb should convert surviving series members to normal'); ok = false }
  else console.log('✓ bomb: surviving series members converted to normal (no broken series)')
}

// No heart reward at combo 20 (rule removed)
{
  const e = freshPlaying()
  e.lives = 1
  e.combo = 19
  e.holes[0] = e._createMole('normal', 0)
  e.hit(0) // -> combo 20
  if (e.lives !== 1) { console.error('✗ combo 20 should NOT grant a heart anymore', e.lives); ok = false }
  else console.log('✓ combo 20: no heart reward (removed)')
}

// Bomb hammer: hitting any mole cross-blasts neighbours; rabbits harmless; 1 use
{
  const e = freshPlaying()
  e.difficulty = { ...e.difficulty, bombBlast: 'cross' }
  e.inventoryHammer = 'bomb'; e.toggleHammer('bomb')
  // center normal at hole 4, neighbour normal at hole 1 (above), rabbit at 5
  e.holes[4] = e._createMole('normal', 4)
  e.holes[1] = e._createMole('normal', 1)
  e.holes[5] = e._createMole('rabbit', 5)
  e.lives = 3
  const s0 = e.score
  e.hit(4)
  const cleared = [4, 1, 5].every((i) => !e.holes[i] || e.holes[i].dead)
  if (!cleared) { console.error('✗ bomb cross should clear center+neighbours'); ok = false }
  else console.log('✓ bomb: cross-blast cleared center + neighbours')
  if (e.score !== s0 + 2) { console.error('✗ bomb should score 2 normals (=2), got', e.score - s0); ok = false }
  else console.log('✓ bomb: scored the two normals (+2)')
  if (e.lives !== 3) { console.error('✗ bomb blast on rabbit should not cost life', e.lives); ok = false }
  else console.log('✓ bomb: rabbit in blast, no life lost')
  if (e.inventoryHammer !== null && e.activeHammer !== null) { console.error('✗ bomb should be single-use'); ok = false }
  else console.log('✓ bomb: consumed (single use)')
}

// Bomb hammer 'square' blast (9 holes) also catches diagonal neighbours
{
  const e = freshPlaying() // easy, 3x3, bombBlast 'square'
  e.difficulty = { ...e.difficulty, bombBlast: 'square' }
  e.inventoryHammer = 'bomb'; e.toggleHammer('bomb')
  // center at 4, diagonal neighbour at 0 (r0,c0). Under 'cross' hole 0 survives.
  e.holes[4] = e._createMole('normal', 4)
  e.holes[0] = e._createMole('normal', 0)
  e.hit(4)
  const diagCleared = !e.holes[0] || e.holes[0].dead
  if (!diagCleared) { console.error('✗ square blast should clear diagonal neighbour (hole 0)'); ok = false }
  else console.log('✓ bomb: square blast cleared diagonal neighbour (9-cell)')
}

// Bomb hammer 'cross' blast leaves diagonal neighbours untouched
{
  const e = freshPlaying()
  e.difficulty = { ...e.difficulty, bombBlast: 'cross' }
  e.inventoryHammer = 'bomb'; e.toggleHammer('bomb')
  e.holes[4] = e._createMole('normal', 4)
  e.holes[0] = e._createMole('normal', 0) // diagonal — should survive a cross
  e.hit(4)
  const diagSurvives = e.holes[0] && !e.holes[0].dead
  if (!diagSurvives) { console.error('✗ cross blast should NOT clear diagonal neighbour (hole 0)'); ok = false }
  else console.log('✓ bomb: cross blast leaves diagonal neighbour intact')
}

// Golden (chain) hammer: activating turns all up moles gold, single use
{
  const e = freshPlaying()
  e.holes[0] = e._createMole('normal', 0)
  e.holes[3] = e._createMole('stone', 3)
  e.holes[7] = e._createMole('bomb', 7)
  e.inventoryHammer = 'chain'
  e.toggleHammer('chain')
  const golds = e.holes.filter((m) => m && m.type === 'golden').length
  // now fills EVERY open hole (empty ones too), not just the seeded moles
  if (golds !== e.cols * e.rows) { console.error('✗ golden hammer should fill all holes with gold, got', golds, 'of', e.cols * e.rows); ok = false }
  else console.log('✓ golden hammer: every open hole turned gold (' + golds + ')')
  if (e.inventoryHammer !== null || e.activeHammer !== null) { console.error('✗ golden hammer should consume on activate'); ok = false }
  else console.log('✓ golden hammer: consumed on activate')
}

// plate is withheld from the drop pool when too few holes remain open
{
  const e = freshPlaying('medium') // 3x4 (12 holes), plateMinOpenHoles=5
  // close holes so only 5 remain open (<= threshold) -> no plate
  for (let i = 0; i < 7; i++) e.closed.add(i)
  let plates = 0
  for (let i = 0; i < 300; i++) { e.inventoryHammer = null; e._rewardHammer(); if (e.inventoryHammer === 'plate') plates++ }
  if (plates !== 0) { console.error('✗ plate should be withheld when <=5 open holes, got', plates); ok = false }
  else console.log('✓ plate withheld when open holes <= threshold')
  // open them back up (7 open) -> plate can drop again
  e.closed.clear(); for (let i = 0; i < 5; i++) e.closed.add(i) // 7 open
  let plates2 = 0
  for (let i = 0; i < 300; i++) { e.inventoryHammer = null; e._rewardHammer(); if (e.inventoryHammer === 'plate') plates2++ }
  if (plates2 === 0) { console.error('✗ plate should drop again with 7 open holes'); ok = false }
  else console.log('✓ plate available again when enough holes open')
}

// combo reward at 10 gives a hammer
{
  const e = freshPlaying()
  e.combo = 9
  e.holes[0] = e._createMole('normal', 0)
  e.hit(0) // -> combo 10
  if (!e.inventoryHammer) { console.error('✗ combo 10 should grant hammer'); ok = false }
  else console.log('✓ combo 10 -> hammer:', e.inventoryHammer)
}

// Ice hammer works on a bomb (no life loss) and freezes the board
{
  const e = freshPlaying()
  e.lives = 3; e.combo = 4
  e.inventoryHammer = 'ice'; e.toggleHammer('ice')
  e.holes[0] = e._createMole('bomb', 0)
  e.hit(0)
  const frozen = e.freezeLeft > 0
  if (!frozen || e.lives !== 3) { console.error('✗ ice on bomb should freeze + no life loss', frozen, e.lives); ok = false }
  else console.log('✓ ice hammer on bomb: freeze + no penalty')
}

// Metal is disabled on easy: never spawns even in a metal-heavy phase
{
  const e = freshPlaying('easy')
  e.phase = { ...e.phase, weights: { metal: 90, normal: 10 } } // metal-heavy
  let metalSeen = 0
  for (let i = 0; i < 200; i++) { e.holes = new Array(9).fill(null); e.closed = new Set(); e._spawn(); if (e.holes.some((m) => m && m.type === 'metal')) metalSeen++ }
  if (metalSeen !== 0) { console.error('✗ easy should never spawn metal, saw', metalSeen); ok = false }
  else console.log('✓ metal disabled on easy (0 spawns)')
}

// Wooden plate: closes a hole, kills the mole, and no mole spawns there after
{
  const e = freshPlaying('medium') // 3x4
  e.holes[4] = e._createMole('metal', 4)
  e.inventoryHammer = 'plate'; e.toggleHammer('plate')
  e.hit(4)
  const closed = e.closed.has(4)
  const dead = !e.holes[4] || e.holes[4].dead
  if (!closed || !dead) { console.error('✗ plate should close hole + kill mole', closed, dead); ok = false }
  else console.log('✓ plate: closed hole + killed metal in one hit')
  if (e.inventoryHammer !== null && e.activeHammer !== null) { console.error('✗ plate should be single use'); ok = false }
  else console.log('✓ plate: consumed after use')
  // closed hole never appears in empties
  if (e._emptyHoles().includes(4)) { console.error('✗ closed hole should not be spawnable'); ok = false }
  else console.log('✓ closed hole excluded from spawns')
}

// Plate on an already-closed hole: no effect, not consumed
{
  const e = freshPlaying('medium')
  e.closed.add(2)
  e.inventoryHammer = 'plate'; e.toggleHammer('plate')
  e.hit(2)
  if (e.activeHammer !== 'plate' || e.inventoryHammer !== 'plate') { console.error('✗ plate on closed hole should not be consumed'); ok = false }
  else console.log('✓ plate on closed hole: no effect, not consumed')
}

// Drop pool by board size: 3x4 -> plate (not chain); 3x3 -> chain (not plate)
{
  const seen = { chain: 0, plate: 0 }
  const e4 = freshPlaying('medium')
  for (let i = 0; i < 200; i++) { e4.inventoryHammer = null; e4._rewardHammer(); if (e4.inventoryHammer === 'plate') seen.plate++; if (e4.inventoryHammer === 'chain') seen.chain++ }
  if (seen.plate === 0 || seen.chain !== 0) { console.error('✗ 3x4 pool should include plate not chain', seen); ok = false }
  else console.log('✓ 3x4 drop pool: plate yes, chain no')
  const seen3 = { chain: 0, plate: 0 }
  const e3 = freshPlaying('easy')
  for (let i = 0; i < 200; i++) { e3.inventoryHammer = null; e3._rewardHammer(); if (e3.inventoryHammer === 'plate') seen3.plate++; if (e3.inventoryHammer === 'chain') seen3.chain++ }
  if (seen3.chain === 0 || seen3.plate !== 0) { console.error('✗ 3x3 pool should include chain not plate', seen3); ok = false }
  else console.log('✓ 3x3 drop pool: chain yes, plate no')
}

console.log(ok ? '\nALL CHECKS PASSED ✅' : '\nSOME CHECKS FAILED ❌')
process.exit(ok ? 0 : 1)
