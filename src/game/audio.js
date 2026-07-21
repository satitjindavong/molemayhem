// ============================================================================
//  Mole Mayhem — Web Audio Synthesizer (GDD section 10)
//  All sound is generated programmatically; no external audio files.
// ============================================================================

const NOTE = {
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.0, A3: 220.0, B3: 246.94,
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, C6: 1046.5,
}

export class SoundEngine {
  constructor({ soundOn = true, musicOn = true, volume = 0.6 } = {}) {
    this.ctx = null
    this.master = null
    this.sfxGain = null
    this.musicGain = null
    this.soundOn = soundOn
    this.musicOn = musicOn
    this.volume = volume
    this._bgmTimer = null
    this._bgmStep = 0
    this._feverTempo = false
  }

  _ensure() {
    if (this.ctx) return
    const AC = window.AudioContext || window.webkitAudioContext
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.volume
    this.master.connect(this.ctx.destination)
    this.sfxGain = this.ctx.createGain()
    this.sfxGain.gain.value = 1
    this.sfxGain.connect(this.master)
    this.musicGain = this.ctx.createGain()
    this.musicGain.gain.value = 0.35
    this.musicGain.connect(this.master)
  }

  // Must be called from a user gesture to unlock audio on mobile browsers.
  // Always calls resume() (no-op when already running) so a context that was
  // auto-suspended between games is reliably reactivated on replay.
  resume() {
    this._ensure()
    if (this.ctx.state !== 'running') {
      this.ctx.resume().catch(() => {})
    }
  }

  setSound(on) { this.soundOn = on }
  setMusic(on) {
    this.musicOn = on
    if (!on) this.stopBGM()
  }

  // --- low-level helpers ------------------------------------------------------
  _tone(freq, { type = 'sine', dur = 0.12, gain = 0.3, when = 0, slideTo = null, attack = 0.005 } = {}) {
    if (!this.soundOn) return
    this._ensure()
    const t0 = this.ctx.currentTime + when
    // Guard against non-finite scheduling values (Web Audio throws otherwise).
    if (![freq, t0, dur, gain].every(Number.isFinite) || freq <= 0) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo && Number.isFinite(slideTo) && slideTo > 0) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(Math.max(gain, 0.0002), t0 + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.sfxGain)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  _noise({ dur = 0.3, gain = 0.4, when = 0, filterType = 'lowpass', freq = 800, q = 1 } = {}) {
    if (!this.soundOn) return
    this._ensure()
    const t0 = this.ctx.currentTime + when
    if (![t0, dur, gain, freq].every(Number.isFinite)) return
    const frames = Math.floor(this.ctx.sampleRate * dur)
    const buffer = this.ctx.createBuffer(1, frames, this.ctx.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1
    const src = this.ctx.createBufferSource()
    src.buffer = buffer
    const filter = this.ctx.createBiquadFilter()
    filter.type = filterType
    filter.frequency.value = freq
    filter.Q.value = q
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(gain, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(filter).connect(g).connect(this.sfxGain)
    src.start(t0)
    src.stop(t0 + dur)
  }

  _chord(freqs, opts = {}) { freqs.forEach((f) => this._tone(f, opts)) }
  _arp(freqs, { step = 0.06, ...opts } = {}) {
    freqs.forEach((f, i) => this._tone(f, { ...opts, when: (opts.when || 0) + i * step }))
  }

  // --- game SFX ---------------------------------------------------------------
  hit() { this._tone(880, { type: 'sine', dur: 0.1, gain: 0.35 }) }

  hitStone() {
    this._noise({ dur: 0.18, gain: 0.5, filterType: 'lowpass', freq: 500, q: 2 })
    this._tone(140, { type: 'square', dur: 0.12, gain: 0.25, slideTo: 80 })
  }

  hitMetal() {
    this._chord([1200, 1800, 2500], { type: 'square', dur: 0.18, gain: 0.12 })
    this._noise({ dur: 0.15, gain: 0.25, filterType: 'bandpass', freq: 3000, q: 6 })
  }

  // Per-hit musical notes so a completed series plays its chord in sequence.
  //   123  -> C major : 1=C, 2=E, 3=G
  //   MOLE -> G7       : M=G, O=B, L=D, E=F
  static SERIES_NOTES = {
    '123': [NOTE.C4, NOTE.E4, NOTE.G4],
    MOLE: [NOTE.G4, NOTE.B4, NOTE.D5, NOTE.F5],
  }

  seriesNote(kind, index) {
    const notes = SoundEngine.SERIES_NOTES[kind]
    if (!notes) return
    this._tone(notes[index], { type: 'triangle', dur: 0.3, gain: 0.3 })
  }

  seriesComplete() {
    this._arp([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], { type: 'triangle', step: 0.07, dur: 0.2, gain: 0.28 })
  }

  nurse() {
    this._tone(NOTE.E5, { type: 'sine', dur: 0.12, gain: 0.3 })
    this._tone(NOTE.A5, { type: 'sine', dur: 0.2, gain: 0.3, when: 0.09 })
  }

  golden() {
    this._arp([NOTE.E5, NOTE.G5, NOTE.C6], { type: 'triangle', step: 0.05, dur: 0.15, gain: 0.25 })
  }

  bomb() {
    this._noise({ dur: 0.5, gain: 0.6, filterType: 'lowpass', freq: 400, q: 1 })
    this._tone(90, { type: 'sawtooth', dur: 0.45, gain: 0.4, slideTo: 40 })
  }

  miss() { this._tone(320, { type: 'sawtooth', dur: 0.25, gain: 0.22, slideTo: 90 }) }

  // Distinct "wrong!" buzzer for breaking a series order.
  seriesFail() {
    this._tone(180, { type: 'square', dur: 0.16, gain: 0.28, slideTo: 120 })
    this._tone(150, { type: 'square', dur: 0.22, gain: 0.28, slideTo: 90, when: 0.14 })
    this._noise({ dur: 0.18, gain: 0.15, filterType: 'bandpass', freq: 900, q: 2, when: 0.02 })
  }

  combo() { this._tone(NOTE.B5, { type: 'triangle', dur: 0.08, gain: 0.2 }) }

  reward() { this._arp([NOTE.C5, NOTE.G5, NOTE.C6, NOTE.E5], { type: 'square', step: 0.05, dur: 0.14, gain: 0.22 }) }

  goldenRush() {
    this._arp([NOTE.C4, NOTE.E4, NOTE.G4, NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6],
      { type: 'square', step: 0.06, dur: 0.2, gain: 0.24 })
  }

  freeze() {
    this._arp([NOTE.C6, NOTE.G5, NOTE.E5, NOTE.C5], { type: 'sine', step: 0.04, dur: 0.4, gain: 0.18 })
  }

  // Wooden "thunk" when a plate closes a hole.
  plate() {
    this._tone(240, { type: 'triangle', dur: 0.12, gain: 0.3, slideTo: 120 })
    this._noise({ dur: 0.1, gain: 0.2, filterType: 'lowpass', freq: 600, q: 1 })
  }

  countdownBeep() { this._tone(NOTE.A4, { type: 'square', dur: 0.15, gain: 0.25 }) }
  go() { this._tone(NOTE.A5, { type: 'square', dur: 0.35, gain: 0.3 }) }

  gameover() {
    this._arp([NOTE.G4, NOTE.E4, NOTE.C4, NOTE.G3], { type: 'triangle', step: 0.18, dur: 0.35, gain: 0.25 })
  }

  // --- chiptune background music ---------------------------------------------
  // Simple 8-bit loop: bassline + arpeggio. Fever mode plays at 1.5x tempo.
  startBGM() {
    if (!this.musicOn) return
    this._ensure()
    this.stopBGM()
    this._bgmStep = 0
    const bass = [NOTE.C3, NOTE.C3, NOTE.G3, NOTE.A3, NOTE.F3, NOTE.F3, NOTE.G3, NOTE.G3]
    const lead = [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.E5, NOTE.F5, NOTE.A5, NOTE.G5, NOTE.E5]
    const tick = () => {
      if (!this.musicOn) return
      const s = this._bgmStep % 8
      // bass every step, lead on odd for a lively feel
      this._playMusicNote(bass[s], 'square', 0.18, 0.16)
      if (s % 2 === 0) this._playMusicNote(lead[s], 'triangle', 0.14, 0.1)
      this._bgmStep++
      const stepMs = (this._feverTempo ? 150 : 225)
      this._bgmTimer = setTimeout(tick, stepMs)
    }
    tick()
  }

  _playMusicNote(freq, type, dur, gain) {
    const t0 = this.ctx.currentTime
    if (![freq, t0, dur, gain].every(Number.isFinite) || freq <= 0) return
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.musicGain)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  setFeverTempo(on) { this._feverTempo = on }

  stopBGM() {
    if (this._bgmTimer) { clearTimeout(this._bgmTimer); this._bgmTimer = null }
  }
}
