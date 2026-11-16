import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Home, Rocket, RotateCcw, ShieldAlert, Sparkles } from 'lucide-react'

export default function NotFound() {
  const canvasRef = useRef(null)
  const [running, setRunning] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let frame = 0
    let raf = 0
    let lastShot = 0
    let lastSpawn = 0
    let lastTime = 0
    let points = 0
    let health = 3
    let shipX = 0
    let targetX = 0
    let shipY = 0
    let invulnerableUntil = 0
    const shots = []
    const rocks = []
    const particles = []
    const stars = Array.from({ length: 75 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.5 + .3, speed: Math.random() * .18 + .04 }))
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      shipY = rect.height - 48
      if (!shipX) shipX = rect.width / 2
      targetX = Math.max(20, Math.min(rect.width - 20, targetX || shipX))
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const pointer = (event) => {
      const rect = canvas.getBoundingClientRect()
      targetX = Math.max(18, Math.min(rect.width - 18, event.clientX - rect.left))
    }
    const keydown = (event) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd', ' '].includes(event.key)) event.preventDefault()
      if (event.key === 'ArrowLeft' || event.key === 'a') targetX -= 34
      if (event.key === 'ArrowRight' || event.key === 'd') targetX += 34
    }
    canvas.addEventListener('pointermove', pointer)
    window.addEventListener('keydown', keydown)

    const drawShip = (x, y) => {
      ctx.save()
      ctx.translate(x, y)
      ctx.shadowColor = '#fb6b52'
      ctx.shadowBlur = 18
      ctx.fillStyle = '#f8fafc'
      ctx.beginPath()
      ctx.moveTo(0, -19); ctx.lineTo(13, 13); ctx.lineTo(0, 7); ctx.lineTo(-13, 13)
      ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath(); ctx.moveTo(-5, 12); ctx.lineTo(0, 23 + Math.random() * 5); ctx.lineTo(5, 12); ctx.fill()
      ctx.restore()
    }
    const burst = (x, y) => {
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2
        const speed = Math.random() * 2.8 + .5
        particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1, radius: Math.random() * 2.5 + 1 })
      }
    }
    const spawnRock = (w) => {
      const radius = 12 + Math.random() * 15
      rocks.push({ x: radius + Math.random() * (w - radius * 2), y: -radius, r: radius, speed: 1.1 + Math.random() * 1.2 + points / 250, spin: (Math.random() - .5) * .08, angle: Math.random() * 6, sides: 7 + Math.floor(Math.random() * 3) })
    }

    const loop = (time) => {
      const rect = canvas.getBoundingClientRect()
      const w = rect.width, h = rect.height
      const dt = Math.min(2, (time - (lastTime || time)) / 16.67 || 1)
      lastTime = time
      ctx.clearRect(0, 0, w, h)
      const bg = ctx.createLinearGradient(0, 0, w, h)
      bg.addColorStop(0, '#101827'); bg.addColorStop(1, '#1b1825')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
      stars.forEach(star => {
        star.y += star.speed * dt
        if (star.y > 1) star.y = 0
        ctx.globalAlpha = .35 + star.r / 3
        ctx.fillStyle = '#dbeafe'
        ctx.beginPath(); ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2); ctx.fill()
      })
      ctx.globalAlpha = 1

      shipX += (targetX - shipX) * .16 * dt
      if (time - lastShot > 390) {
        shots.push({ x: shipX, y: shipY - 15 })
        lastShot = time
      }
      if (time - lastSpawn > Math.max(360, 1050 - points * 2)) {
        spawnRock(w); lastSpawn = time
      }

      shots.forEach((shot, i) => {
        shot.y -= 7 * dt
        ctx.fillStyle = '#7dd3fc'; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 12
        ctx.fillRect(shot.x - 2, shot.y - 8, 4, 13)
        ctx.shadowBlur = 0
        if (shot.y < -20) shots.splice(i, 1)
      })

      rocks.forEach((rock, i) => {
        rock.y += rock.speed * dt
        rock.angle += rock.spin * dt
        ctx.save(); ctx.translate(rock.x, rock.y); ctx.rotate(rock.angle)
        ctx.beginPath()
        for (let n = 0; n < rock.sides; n++) {
          const angle = n / rock.sides * Math.PI * 2
          const radius = rock.r * (.78 + .22 * Math.sin(n * 13.7 + i))
          const x = Math.cos(angle) * radius, y = Math.sin(angle) * radius
          if (!n) ctx.moveTo(x, y); else ctx.lineTo(x, y)
        }
        ctx.closePath()
        const gradient = ctx.createRadialGradient(-5, -7, 2, 0, 0, rock.r)
        gradient.addColorStop(0, '#fca58a'); gradient.addColorStop(.55, '#c64d43'); gradient.addColorStop(1, '#542b3c')
        ctx.fillStyle = gradient; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 13; ctx.fill()
        ctx.strokeStyle = '#fb9276'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore()

        for (let j = shots.length - 1; j >= 0; j--) {
          if (Math.hypot(rock.x - shots[j].x, rock.y - shots[j].y) < rock.r + 5) {
            burst(rock.x, rock.y); rocks.splice(i, 1); shots.splice(j, 1)
            points += 10; setScore(points); break
          }
        }
        if (rocks[i] && rock.y > h + rock.r) {
          rocks.splice(i, 1)
          if (time > invulnerableUntil) { health--; setLives(health); invulnerableUntil = time + 800 }
        }
        if (rocks[i] && Math.hypot(rock.x - shipX, rock.y - shipY) < rock.r + 13 && time > invulnerableUntil) {
          burst(shipX, shipY); rocks.splice(i, 1); health--; setLives(health); invulnerableUntil = time + 900
        }
      })

      particles.forEach((p, i) => {
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= .035 * dt
        ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = '#fb923c'
        ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill()
        if (p.life <= 0) particles.splice(i, 1)
      })
      ctx.globalAlpha = 1
      if (time < invulnerableUntil && Math.floor(time / 90) % 2 === 0) ctx.globalAlpha = .3
      drawShip(shipX, shipY); ctx.globalAlpha = 1

      if (health <= 0) { setGameOver(true); setRunning(false); return }
      raf = requestAnimationFrame(loop)
    }

    if (running) raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      canvas.removeEventListener('pointermove', pointer)
      window.removeEventListener('keydown', keydown)
    }
  }, [running])

  const startGame = () => { setScore(0); setLives(3); setGameOver(false); setRunning(true) }

  return <main className="not-found-page">
    <section className="not-found-intro">
      <div className="not-found-code"><span>4</span><span className="not-found-orbit">✦</span><span>4</span></div>
      <div className="not-found-kicker"><ShieldAlert size={15}/> SIGNAL LOST · ERROR 404</div>
      <h1>Looks like you drifted <span>off course.</span></h1>
      <p>The page you're looking for isn't in this sector. The good news? You can help defend the APML station while you're here.</p>
      <div className="not-found-actions">
        <Link to="/" className="not-found-home"><Home size={17}/> Back to APML Home</Link>
        <button type="button" className="not-found-retry" onClick={() => window.history.back()}><ArrowLeft size={16}/> Go back</button>
      </div>
    </section>
    <section className="not-found-game">
      <div className="not-found-game-head">
        <div><span className="not-found-kicker"><Rocket size={14}/> MINI DEFENSE MISSION</span><h2>Protect the APML station</h2><p>Move your ship to intercept incoming asteroids.</p></div>
        <div className="not-found-stats"><span>SCORE <b>{score}</b></span><span>HULL <b>{'♥'.repeat(lives)}{'♡'.repeat(3-lives)}</b></span></div>
      </div>
      <div className="not-found-canvas-wrap">
        <canvas ref={canvasRef} aria-label="Asteroid defense mini game. Move the ship with your pointer or arrow keys."/>
        {!running && <div className="not-found-game-overlay"><div className="not-found-overlay-icon"><Sparkles size={24}/></div><strong>{gameOver ? 'Station lost' : 'Ready for launch?'}</strong><p>{gameOver ? `You scored ${score} points. Give it another run.` : 'Your ship auto-fires. Move left and right to destroy asteroids.'}</p><button onClick={startGame}><Rocket size={16}/>{gameOver ? 'Play again' : 'Start mission'}</button></div>}
      </div>
      <div className="not-found-game-foot"><span>DESKTOP: MOVE MOUSE OR USE ← →</span><span>MOBILE: DRAG ACROSS THE ARENA</span></div>
    </section>
    <p className="not-found-signoff">APML PORTAL <span>·</span> LOST IN SPACE, NOT FOR LONG.</p>
  </main>
}
