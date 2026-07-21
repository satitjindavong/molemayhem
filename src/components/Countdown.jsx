import Scene from './Scene'
import { DIFFICULTIES } from '../game/config'

export default function Countdown({ value, difficultyKey }) {
  const theme = DIFFICULTIES[difficultyKey]?.theme
  return (
    <div className="relative w-full h-full overflow-hidden">
      <Scene bg={difficultyKey} theme={theme} dim={0.35} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div key={value} className="text-white font-extrabold animate-[pop-up_.4s_ease] text-center"
          style={{ textShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
          {value > 0
            ? <span className="text-[8rem] leading-none">{value}</span>
            : <span className="text-6xl text-yellow-300">GO!</span>}
          <p className="text-lg font-bold mt-2 opacity-80">Get Ready!</p>
        </div>
      </div>
    </div>
  )
}
