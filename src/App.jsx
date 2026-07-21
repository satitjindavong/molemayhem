import PhoneFrame from './components/PhoneFrame'
import Menu from './components/Menu'
import Countdown from './components/Countdown'
import GameScreen from './components/GameScreen'
import GameOver from './components/GameOver'
import { useGame } from './useGame'

export default function App() {
  const g = useGame()

  return (
    <PhoneFrame>
      {g.screen === 'menu' && (
        <Menu
          onStart={g.startGame}
          settings={g.settings}
          onToggleSound={g.toggleSound}
          onToggleMusic={g.toggleMusic}
        />
      )}

      {g.screen === 'countdown' && g.snap && (
        <Countdown value={g.countdown} difficultyKey={g.snap.difficultyKey} />
      )}

      {g.screen === 'playing' && g.snap && (
        <GameScreen snap={g.snap} onHit={g.hit} onToggleHammer={g.toggleHammer} onMenu={g.goMenu} />
      )}

      {g.screen === 'gameover' && g.snap && (
        <GameOver snap={g.snap} onReplay={g.replay} onMenu={g.goMenu} />
      )}
    </PhoneFrame>
  )
}
