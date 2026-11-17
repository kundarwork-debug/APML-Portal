import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Home, Sparkles } from 'lucide-react'
import './NotFound.css'

const DIRECTION_NAMES = ['up-left', 'up', 'up-right', 'left', 'center', 'right', 'down-left', 'down', 'down-right']
const REACTIONS = ['heart', 'sparkle', 'delighted', 'dizzy']
const REACTION_NAMES = ['blink', 'heart', 'sparkle', 'surprised', 'starry', 'blush', 'sleepy', 'dizzy', 'delighted']

function spritePosition(name, names) {
  const index = names.indexOf(name)
  if (index < 0) return '50% 50%'
  return `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`
}

export default function NotFound() {
  const [direction, setDirection] = useState('center')
  const [reaction, setReaction] = useState('')
  const [boopCount, setBoopCount] = useState(0)

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined

    const sectors = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right']
    const sectorSize = Math.PI * 2 / sectors.length

    const trackPointer = event => {
      const mascot = document.querySelector('.nf-mascot-button')
      const rect = mascot?.getBoundingClientRect()
      if (!rect) return

      const dx = event.clientX - (rect.left + rect.width / 2)
      const dy = event.clientY - (rect.top + rect.height / 2)

      if (Math.hypot(dx, dy) < 70) {
        setDirection('center')
        return
      }

      const sector = (Math.round(Math.atan2(dy, dx) / sectorSize) + sectors.length) % sectors.length
      setDirection(sectors[sector])
    }

    const resetPointer = event => {
      if (!event.relatedTarget) setDirection('center')
    }

    window.addEventListener('pointermove', trackPointer, { passive: true })
    window.addEventListener('pointerout', resetPointer, { passive: true })
    return () => {
      window.removeEventListener('pointermove', trackPointer)
      window.removeEventListener('pointerout', resetPointer)
    }
  }, [])

  useEffect(() => {
    if (!reaction) return undefined
    const timer = window.setTimeout(() => setReaction(''), 1000)
    return () => window.clearTimeout(timer)
  }, [reaction])

  const boop = () => {
    const nextCount = boopCount + 1
    setBoopCount(nextCount >= 4 ? 0 : nextCount)
    setReaction(nextCount >= 4 ? 'dizzy' : REACTIONS[(nextCount - 1) % 3])
  }

  return (
    <main className="not-found-page">
      <div className="nf-background-glow" aria-hidden="true" />
      <section className="nf-content">
        <div className="nf-mascot-wrap">
          <span className="nf-mascot-halo" aria-hidden="true" />
          <button className="nf-mascot-button" type="button" onClick={boop} aria-label="Boop the APML mascot">
            <span
              className="nf-mascot-sprite nf-mascot-directions"
              style={{ backgroundPosition: spritePosition(direction, DIRECTION_NAMES), opacity: reaction ? 0 : 1 }}
            />
            <span
              className="nf-mascot-sprite nf-mascot-reactions"
              style={{ backgroundPosition: spritePosition(reaction, REACTION_NAMES), opacity: reaction ? 1 : 0 }}
            />
          </button>
        </div>

        <div className="nf-code" aria-label="Error 404">
          404<span className="nf-code-spark"><Sparkles size={27} /></span>
        </div>
        <span className="nf-kicker">PAGE NOT FOUND</span>
        <h1>Looks like we took a wrong turn.</h1>
        <p>The page you’re looking for may have moved, been removed, or never existed. Our mascot is keeping an eye out for it.</p>

        <div className="nf-actions">
          <Link className="nf-primary" to="/"><Home size={16} /> Back to APML Home</Link>
          <button className="nf-secondary" type="button" onClick={() => window.history.back()}><ArrowLeft size={16} /> Go back</button>
        </div>
        <p className="nf-hint">Psst… move your cursor around. The mascot is watching.</p>
      </section>
      <footer className="nf-signoff">APML PORTAL <span>•</span> HERE TO HELP</footer>
    </main>
  )
}
