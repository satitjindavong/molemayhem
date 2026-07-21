import { useState } from 'react'
import { Volume2, VolumeX, Music, Music2, Trophy, HelpCircle, Play } from 'lucide-react'
import { DIFFICULTIES } from '../game/config'
import { moleSprite } from '../game/sprites'
import Scene from './Scene'
import Leaderboard from './Leaderboard'
import HelpModal from './HelpModal'

// six different mole types shown bouncing in the menu centre
const SHOWCASE = ['normal', 'stone', 'metal', 'golden', 'nurse', 'rabbit']

function MoleShowcase() {
  return (
    <div className="grid grid-cols-3 gap-x-4 gap-y-2 w-[74%] max-w-[260px]">
      {SHOWCASE.map((m, i) => (
        <div key={m} className="relative aspect-square flex items-end justify-center">
          <div className="absolute bottom-1 w-[62%] h-2.5 rounded-[50%] bg-amber-900/40 blur-[1px]" />
          <img
            src={moleSprite(m, 'up')}
            alt={m}
            className="relative w-[88%] object-contain pixelated"
            style={{
              transformOrigin: 'bottom center',
              animation: `hop 1.1s ease-in-out ${i * 0.15}s infinite`,
              filter: 'drop-shadow(0 3px 2px rgba(0,0,0,0.28))',
            }}
          />
        </div>
      ))}
    </div>
  )
}

const DIFF_STYLE = {
  easy: 'from-emerald-200 to-green-300 border-emerald-400 text-emerald-900',
  medium: 'from-amber-200 to-orange-300 border-orange-400 text-orange-900',
  hard: 'from-fuchsia-200 to-purple-300 border-purple-400 text-purple-900',
}

export default function Menu({ onStart, settings, onToggleSound, onToggleMusic }) {
  const [view, setView] = useState('main') // main | difficulty | leaderboard | help

  return (
    <div className="w-full h-full relative flex flex-col items-center overflow-hidden">
      <Scene bg="menu" theme="flower" />

      {/* sound toggles */}
      <div className="absolute top-3 right-3 z-20 flex gap-2">
        <IconToggle on={settings.soundEffectsOn} onClick={onToggleSound}
          On={Volume2} Off={VolumeX} />
        <IconToggle on={settings.musicOn} onClick={onToggleMusic}
          On={Music} Off={Music2} />
      </div>

      {/* bouncing mole showcase filling the empty centre (main view only) */}
      {view === 'main' && (
        <div className="absolute inset-x-0 top-[45%] -translate-y-1/2 z-10 flex justify-center pointer-events-none">
          <MoleShowcase />
        </div>
      )}

      <div className="relative z-10 w-full h-full flex flex-col items-center px-6">
        {/* title is baked into main_menu.png — leave the top area clear */}
        <div className="flex-1" />

        {view === 'main' && (
          <div className="w-full max-w-xs mb-[16%] flex flex-col gap-3 animate-[fadeIn_.3s_ease]">
            <MenuButton onClick={() => setView('difficulty')}
              color="from-rose-200 to-pink-300" text="text-rose-700" border="border-rose-300">
              <Play size={22} /> START GAME
            </MenuButton>
            <MenuButton onClick={() => setView('leaderboard')}
              color="from-sky-200 to-indigo-300" text="text-indigo-700" border="border-indigo-300">
              <Trophy size={22} /> LEADERBOARD
            </MenuButton>
            <MenuButton onClick={() => setView('help')}
              color="from-emerald-200 to-teal-300" text="text-emerald-800" border="border-emerald-300">
              <HelpCircle size={22} /> HELP
            </MenuButton>
          </div>
        )}

        {view === 'difficulty' && (
          <div className="w-full max-w-xs mb-[12%] flex flex-col gap-3 animate-[fadeIn_.3s_ease]">
            <p className="text-center font-extrabold text-slate-700 drop-shadow text-lg">Select Difficulty</p>
            {Object.values(DIFFICULTIES).map((d) => (
              <button key={d.key} onClick={() => onStart(d.key)}
                className={`w-full py-4 px-5 rounded-2xl bg-gradient-to-b ${DIFF_STYLE[d.key]} border-b-4 shadow-lg active:translate-y-1 active:border-b-0 transition-all`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xl font-extrabold">{d.label}</span>
                  <div className="flex items-center gap-3 text-base font-bold whitespace-nowrap">
                    <span>⏱ {d.timeLimit}s</span>
                    <span>❤️ {d.startingLives}</span>
                  </div>
                </div>
              </button>
            ))}
            <BackButton onClick={() => setView('main')} />
          </div>
        )}

        {view === 'leaderboard' && (
          <div className="w-full flex-1 min-h-0 mb-[8%]">
            <Leaderboard onBack={() => setView('main')} />
          </div>
        )}
      </div>

      {view === 'help' && <HelpModal onClose={() => setView('main')} />}
    </div>
  )
}

function MenuButton({ children, onClick, color, text = 'text-white', border = 'border-black/10' }) {
  return (
    <button onClick={onClick}
      className={`w-full py-3.5 rounded-2xl bg-gradient-to-b ${color} border-b-4 ${border} ${text} font-extrabold text-lg shadow-lg flex items-center justify-center gap-2 active:translate-y-1 active:border-b-0 transition-all`}>
      {children}
    </button>
  )
}

function BackButton({ onClick }) {
  return (
    <button onClick={onClick}
      className="w-full py-2.5 rounded-2xl bg-white/80 border-b-4 border-black/10 text-slate-600 font-bold shadow active:translate-y-1 active:border-b-0 transition-all">
      ← Back
    </button>
  )
}

function IconToggle({ on, onClick, On, Off }) {
  return (
    <button onClick={onClick}
      className={`w-10 h-10 rounded-full grid place-items-center shadow-md transition-colors ${on ? 'bg-white/90 text-indigo-500' : 'bg-slate-400/70 text-white'}`}>
      {on ? <On size={20} /> : <Off size={20} />}
    </button>
  )
}
