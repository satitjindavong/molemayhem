import { useCallback, useEffect, useRef, useState } from 'react'
import { GameEngine } from './game/engine'
import { SoundEngine } from './game/audio'
import { loadSettings, saveSettings } from './game/storage'
import { EFFECTS } from './game/config'

// Central game orchestration hook: owns the engine + sound + rAF loop and
// exposes a re-rendered snapshot plus imperative actions to the UI.
export function useGame() {
  const soundRef = useRef(null)
  const engineRef = useRef(null)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const countdownRef = useRef(null)

  const [settings, setSettings] = useState(() => loadSettings())
  const [screen, setScreen] = useState('menu') // menu | countdown | playing | gameover
  const [countdown, setCountdown] = useState(EFFECTS.countdownSeconds)
  const [snap, setSnap] = useState(null)
  const [, force] = useState(0)

  // Lazy-init engine + sound once.
  if (!soundRef.current) {
    soundRef.current = new SoundEngine({
      soundOn: settings.soundEffectsOn,
      musicOn: settings.musicOn,
    })
    engineRef.current = new GameEngine(soundRef.current)
  }

  const pushSnap = useCallback(() => setSnap(engineRef.current.snapshot()), [])

  // rAF loop. Cap only against long stalls (e.g. backgrounded tab); normal
  // jank up to ~500ms is still counted so the clock tracks real time and does
  // not drift slow when a frame is interrupted.
  const loop = useCallback((t) => {
    const dt = Math.min(500, t - (lastRef.current || t))
    lastRef.current = t
    const eng = engineRef.current
    eng.tick(dt)
    pushSnap()
    if (eng.status === 'gameover') {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = 0
      setScreen('gameover')
      return
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [pushSnap])

  const startLoop = useCallback(() => {
    lastRef.current = 0
    cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(loop)
  }, [loop])

  // --- actions ---------------------------------------------------------------
  const startGame = useCallback((difficultyKey) => {
    const snd = soundRef.current
    snd.resume()
    engineRef.current.reset(difficultyKey)
    engineRef.current.status = 'countdown'
    pushSnap()
    setScreen('countdown')
    setCountdown(EFFECTS.countdownSeconds)

    let n = EFFECTS.countdownSeconds
    snd.countdownBeep()
    clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      n -= 1
      if (n > 0) {
        setCountdown(n)
        snd.countdownBeep()
      } else {
        clearInterval(countdownRef.current)
        setCountdown(0)
        snd.resume() // ensure context is live before music/SFX resume
        snd.go()
        engineRef.current.status = 'playing'
        if (settings.musicOn) snd.startBGM()
        setScreen('playing')
        startLoop()
      }
    }, 800)
  }, [pushSnap, startLoop, settings.musicOn])

  const hit = useCallback((holeIndex) => {
    soundRef.current.resume()
    engineRef.current.hit(holeIndex)
    pushSnap()
  }, [pushSnap])

  const toggleHammer = useCallback((key) => {
    soundRef.current.resume()
    engineRef.current.toggleHammer(key)
    pushSnap()
  }, [pushSnap])

  const goMenu = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(countdownRef.current)
    soundRef.current.stopBGM()
    engineRef.current.status = 'idle'
    setScreen('menu')
  }, [])

  const replay = useCallback((difficultyKey) => {
    startGame(difficultyKey)
  }, [startGame])

  // --- settings --------------------------------------------------------------
  const toggleSound = useCallback(() => {
    setSettings((s) => {
      const next = { ...s, soundEffectsOn: !s.soundEffectsOn }
      soundRef.current.setSound(next.soundEffectsOn)
      saveSettings(next)
      return next
    })
  }, [])

  const toggleMusic = useCallback(() => {
    setSettings((s) => {
      const next = { ...s, musicOn: !s.musicOn }
      soundRef.current.setMusic(next.musicOn)
      if (next.musicOn && engineRef.current.status === 'playing') soundRef.current.startBGM()
      saveSettings(next)
      return next
    })
  }, [])

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current)
    clearInterval(countdownRef.current)
    soundRef.current?.stopBGM()
  }, [])

  // Debug/test handle: lets an automated driver seed engine state and re-render.
  // Only exposed in dev builds — stripped from the production bundle.
  useEffect(() => {
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      window.__mole = { engine: engineRef.current, sound: soundRef.current, render: pushSnap }
    }
  }, [pushSnap])

  return {
    screen, countdown, snap, settings,
    startGame, hit, toggleHammer, goMenu, replay,
    toggleSound, toggleMusic,
    force: () => force((v) => v + 1),
  }
}
