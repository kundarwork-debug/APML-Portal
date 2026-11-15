import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Gamepad2, Heart, Home, Play, RotateCcw, Shield, Sparkles, Trophy, X, Zap } from 'lucide-react'
import { getApmlDatabase } from '../lib/firebase'
import './NotFound.css'

const HIGH_KEY = 'apml-arcade-high-score'
const NAME_KEY = 'apml_pilot_name'

export default function NotFound() {
  const canvasRef = useRef(null)
  const [mode, setMode] = useState('hub')
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(5)
  const [level, setLevel] = useState(1)
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem(HIGH_KEY) || 0))
  const [globalHigh, setGlobalHigh] = useState(0)
  const [entries, setEntries] = useState([])
  const [pilot, setPilot] = useState(() => localStorage.getItem(NAME_KEY) || '')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [lastRun, setLastRun] = useState({ score: 0, level: 1 })
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true)
    try {
      const db = await getApmlDatabase()
      const snapshot = await db.ref('arcade_scores').orderByChild('score').limitToLast(30).once('value')
      const rows = []
      snapshot.forEach(child => rows.push({ id: child.key, ...child.val() }))
      rows.sort((a, b) => Number(b.score || 0) - Number(a.score || 0))
      setEntries(rows)
      setGlobalHigh(rows.reduce((best, row) => Math.max(best, Number(row.score) || 0), 0))
    } catch (error) {
      console.warn('APML arcade leaderboard unavailable:', error)
      setMessage('Global scoreboard is temporarily unavailable. Your local record is still saved on this device.')
    } finally {
      setLeaderboardLoading(false)
    }
  }, [])

  useEffect(() => { loadLeaderboard() }, [loadLeaderboard])

  const startGame = () => {
    setScore(0); setLives(5); setLevel(1); setLastRun({ score: 0, level: 1 }); setMessage(''); setMode('playing')
  }

  const finishGame = useCallback((finalScore, finalLevel) => {
    setLastRun({ score: finalScore, level: finalLevel })
    setMode('debrief')
  }, [])

  useEffect(() => {
    if (mode !== 'playing') return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const game = {
      width: 0, height: 0, player: { x: 0, y: 0 }, bullets: [], rocks: [], particles: [], powerups: [],
      stars: [], keys: new Set(), score: 0, lives: 5, level: 1, lastTime: 0, spawn: 0, fire: 0,
      shieldUntil: 0, rapidUntil: 0, boss: false, bossSpawnedAt: 0, active: true, pointerDown: false
    }
    let frame = 0
    let lastUiUpdate = 0

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      game.width = window.innerWidth; game.height = window.innerHeight
      canvas.width = Math.round(game.width * dpr); canvas.height = Math.round(game.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!game.player.x) { game.player.x = game.width / 2; game.player.y = game.height * .72 }
      game.stars = Array.from({ length: 105 }, () => ({ x: Math.random() * game.width, y: Math.random() * game.height, size: Math.random() * 1.7 + .25, speed: Math.random() * .55 + .12 }))
    }
    resize()
    window.addEventListener('resize', resize)

    const move = (event) => {
      game.player.x = Math.max(18, Math.min(game.width - 18, event.clientX))
      game.player.y = Math.max(80, Math.min(game.height - 28, event.clientY))
    }
    const fire = () => {
      const now = performance.now()
      if (now - game.fire < (now < game.rapidUntil ? 100 : 230)) return
      game.fire = now
      game.bullets.push({ x: game.player.x, y: game.player.y - 19, speed: 11 })
    }
    const pointerDown = (event) => { move(event); game.pointerDown = true; fire() }
    const pointerUp = () => { game.pointerDown = false }
    const keyDown = (event) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(event.code)) event.preventDefault()
      game.keys.add(event.code)
      if (event.code === 'Space') fire()
      if (event.code === 'Escape') { game.active = false; finishGame(game.score, game.level) }
    }
    const keyUp = (event) => game.keys.delete(event.code)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerdown', pointerDown)
    window.addEventListener('pointerup', pointerUp)
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)

    const spawnRock = (boss = false) => {
      const side = Math.floor(Math.random() * 4)
      const margin = boss ? 65 : 30
      let x = side === 1 ? game.width + margin : side === 3 ? -margin : Math.random() * game.width
      let y = side === 0 ? -margin : side === 2 ? game.height + margin : Math.random() * game.height
      const targetX = game.width / 2, targetY = game.height * .48
      const angle = Math.atan2(targetY - y, targetX - x)
      const radius = boss ? Math.min(54, Math.max(38, game.width * .045)) : 12 + Math.random() * 13
      const hp = boss ? 8 + Math.floor(game.level / 2) : 1
      game.rocks.push({ x, y, vx: Math.cos(angle) * (boss ? 1.05 : 1.1 + Math.random() * .8 + game.level * .12), vy: Math.sin(angle) * (boss ? 1.05 : 1.1 + Math.random() * .8 + game.level * .12), radius, rotation: 0, spin: (Math.random() - .5) * .04, hp, maxHp: hp, boss, points: Array.from({ length: boss ? 12 : 8 }, () => .76 + Math.random() * .42) })
      if (boss) game.boss = true
    }
    const burst = (x, y, color = '#fb923c', count = 18) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2, speed = Math.random() * 4 + 1
        game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color, radius: Math.random() * 3 + 1 })
      }
    }
    const loseLife = () => {
      if (performance.now() < game.shieldUntil) return
      game.lives -= 1
      setLives(game.lives)
      if (game.lives <= 0) {
        game.active = false
        finishGame(game.score, game.level)
      }
    }

    const draw = (now) => {
      if (!game.active) return
      const dt = Math.min((now - game.lastTime) / 16.67 || 1, 2)
      game.lastTime = now
      ctx.clearRect(0, 0, game.width, game.height)
      ctx.fillStyle = '#080d19'; ctx.fillRect(0, 0, game.width, game.height)
      const glow = ctx.createRadialGradient(game.width * .5, game.height * .36, 10, game.width * .5, game.height * .36, game.width * .72)
      glow.addColorStop(0, 'rgba(185,28,28,.2)'); glow.addColorStop(1, 'rgba(8,13,25,0)')
      ctx.fillStyle = glow; ctx.fillRect(0, 0, game.width, game.height)
      ctx.strokeStyle = 'rgba(248,113,113,.055)'; ctx.lineWidth = 1
      for (let x = 0; x < game.width; x += 54) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, game.height); ctx.stroke() }
      for (let y = 0; y < game.height; y += 54) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(game.width, y); ctx.stroke() }
      game.stars.forEach(star => { star.y += star.speed * dt; if (star.y > game.height) star.y = 0; ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(star.x, star.y, star.size, star.size) })

      if (game.keys.has('ArrowLeft') || game.keys.has('KeyA')) game.player.x -= 6 * dt
      if (game.keys.has('ArrowRight') || game.keys.has('KeyD')) game.player.x += 6 * dt
      if (game.keys.has('ArrowUp') || game.keys.has('KeyW')) game.player.y -= 6 * dt
      if (game.keys.has('ArrowDown') || game.keys.has('KeyS')) game.player.y += 6 * dt
      if (game.keys.has('Space') || game.pointerDown) fire()
      game.player.x = Math.max(18, Math.min(game.width - 18, game.player.x))
      game.player.y = Math.max(75, Math.min(game.height - 25, game.player.y))

      game.spawn += dt
      const spawnEvery = Math.max(17, 64 - game.level * 3)
      if (game.spawn > spawnEvery && !game.boss) { game.spawn = 0; spawnRock() }
      if (game.level >= 5 && game.level % 5 === 0 && game.bossSpawnedAt !== game.level && !game.boss) {
        game.bossSpawnedAt = game.level
        spawnRock(true)
      }

      game.bullets = game.bullets.filter(b => b.y > -20)
      game.bullets.forEach(b => { b.y -= b.speed * dt; ctx.save(); ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 12; ctx.fillStyle = '#bae6fd'; ctx.fillRect(b.x - 2, b.y - 8, 4, 14); ctx.restore() })

      for (let i = game.rocks.length - 1; i >= 0; i--) {
        const rock = game.rocks[i]
        rock.x += rock.vx * dt; rock.y += rock.vy * dt; rock.rotation += rock.spin * dt
        ctx.save(); ctx.translate(rock.x, rock.y); ctx.rotate(rock.rotation); ctx.beginPath()
        rock.points.forEach((factor, index) => { const angle = index * Math.PI * 2 / rock.points.length; const x = Math.cos(angle) * rock.radius * factor, y = Math.sin(angle) * rock.radius * factor; index ? ctx.lineTo(x, y) : ctx.moveTo(x, y) })
        ctx.closePath()
        const gradient = ctx.createRadialGradient(-rock.radius * .25, -rock.radius * .3, 2, 0, 0, rock.radius)
        gradient.addColorStop(0, rock.boss ? '#fed7aa' : '#94a3b8'); gradient.addColorStop(.48, rock.boss ? '#ea580c' : '#475569'); gradient.addColorStop(1, '#0f172a')
        ctx.fillStyle = gradient; ctx.fill(); ctx.strokeStyle = rock.boss ? '#fbbf24' : '#cbd5e1'; ctx.lineWidth = rock.boss ? 3 : 1.2; ctx.shadowColor = rock.boss ? '#f97316' : '#64748b'; ctx.shadowBlur = rock.boss ? 24 : 8; ctx.stroke(); ctx.restore()
        if (rock.boss) {
          ctx.fillStyle = '#1e293b'; ctx.fillRect(rock.x - 48, rock.y - rock.radius - 18, 96, 6)
          ctx.fillStyle = '#f97316'; ctx.fillRect(rock.x - 48, rock.y - rock.radius - 18, 96 * rock.hp / rock.maxHp, 6)
          ctx.fillStyle = '#fff'; ctx.font = '800 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('OVERLORD', rock.x, rock.y - rock.radius - 23)
        }
        if (Math.hypot(rock.x - game.player.x, rock.y - game.player.y) < rock.radius + 13) {
          burst(rock.x, rock.y); game.rocks.splice(i, 1); if (rock.boss) game.boss = false; loseLife(); continue
        }
        let destroyed = false
        for (let j = game.bullets.length - 1; j >= 0; j--) {
          const bullet = game.bullets[j]
          if (Math.hypot(rock.x - bullet.x, rock.y - bullet.y) < rock.radius + 5) {
            game.bullets.splice(j, 1); rock.hp -= 1; burst(bullet.x, bullet.y, '#7dd3fc', 5)
            if (rock.hp <= 0) {
              burst(rock.x, rock.y, rock.boss ? '#fbbf24' : '#fb923c', rock.boss ? 42 : 20)
              game.score += rock.boss ? 250 : 10
              if (Math.random() < .13) game.powerups.push({ x: rock.x, y: rock.y, type: ['shield','rapid','repair'][Math.floor(Math.random() * 3)], life: 700 })
              if (rock.boss) { game.boss = false; game.score += 100 }
              destroyed = true
            }
            break
          }
        }
        if (destroyed) { game.rocks.splice(i, 1); continue }
        if (rock.y > game.height + 70 || rock.x < -100 || rock.x > game.width + 100) {
          game.rocks.splice(i, 1); if (rock.boss) game.boss = false; loseLife()
        }
      }

      for (let i = game.powerups.length - 1; i >= 0; i--) {
        const item = game.powerups[i]; item.y += 1.15 * dt; item.life -= dt
        const colors = { shield: '#38bdf8', rapid: '#c084fc', repair: '#4ade80' }
        ctx.save(); ctx.beginPath(); ctx.arc(item.x, item.y, 12, 0, Math.PI * 2); ctx.fillStyle = colors[item.type]; ctx.shadowColor = colors[item.type]; ctx.shadowBlur = 18; ctx.fill(); ctx.fillStyle = '#0f172a'; ctx.font = '900 11px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(item.type === 'shield' ? 'S' : item.type === 'rapid' ? 'R' : '+', item.x, item.y); ctx.restore()
        if (Math.hypot(item.x - game.player.x, item.y - game.player.y) < 27) {
          if (item.type === 'shield') game.shieldUntil = now + 9000
          if (item.type === 'rapid') game.rapidUntil = now + 9000
          if (item.type === 'repair') { game.lives = Math.min(5, game.lives + 1); setLives(game.lives) }
          game.powerups.splice(i, 1)
        } else if (item.life <= 0 || item.y > game.height + 30) game.powerups.splice(i, 1)
      }

      game.particles = game.particles.filter(p => p.life > 0)
      game.particles.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= .025 * dt; ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1 })

      if (now < game.shieldUntil) { ctx.beginPath(); ctx.arc(game.player.x, game.player.y, 27, 0, Math.PI * 2); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowBlur = 0 }
      ctx.save(); ctx.translate(game.player.x, game.player.y)
      ctx.beginPath(); ctx.moveTo(0, -19); ctx.lineTo(15, 15); ctx.lineTo(0, 9); ctx.lineTo(-15, 15); ctx.closePath(); ctx.fillStyle = '#ef4444'; ctx.shadowColor = '#ef4444'; ctx.shadowBlur = 18; ctx.fill(); ctx.shadowBlur = 0
      ctx.beginPath(); ctx.arc(0, -3, 4, 0, Math.PI * 2); ctx.fillStyle = '#e0f2fe'; ctx.fill()
      ctx.beginPath(); ctx.moveTo(-5, 13); ctx.lineTo(0, 25 + Math.random() * 5); ctx.lineTo(5, 13); ctx.fillStyle = '#fb923c'; ctx.fill(); ctx.restore()

      const nextLevel = Math.floor(game.score / 250) + 1
      if (nextLevel > game.level) { game.level = nextLevel; setLevel(nextLevel) }
      if (now - lastUiUpdate > 130) {
        lastUiUpdate = now
        setScore(game.score)
        if (game.score > Number(localStorage.getItem(HIGH_KEY) || 0)) {
          localStorage.setItem(HIGH_KEY, String(game.score)); setHighScore(game.score)
        }
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerdown', pointerDown)
      window.removeEventListener('pointerup', pointerUp)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
    }
  }, [mode, finishGame])

  const saveScore = async (event) => {
    event.preventDefault()
    if (saving) return
    const callsign = pilot.trim().slice(0, 18) || 'Pilot'
    setSaving(true); setMessage('')
    localStorage.setItem(NAME_KEY, callsign)
    const payload = { pilot: callsign, score: lastRun.score, level: lastRun.level, timestamp: Date.now(), isoDate: new Date().toISOString(), date: new Date().toLocaleDateString('en-GB') }
    try {
      const db = await getApmlDatabase()
      await db.ref('arcade_scores').push(payload)
      setMessage('Score saved to the global APML scoreboard.')
      await loadLeaderboard()
    } catch (error) {
      console.warn('Unable to save APML arcade score:', error)
      setMessage('Could not save globally. Your personal high score remains saved on this device.')
    } finally { setSaving(false) }
  }

  const formatDate = (row) => {
    const date = row.timestamp ? new Date(row.timestamp) : row.isoDate ? new Date(row.isoDate) : null
    return date && !Number.isNaN(date.getTime()) ? date.toLocaleDateString('en-GB') : row.date || '—'
  }

  return <div className={`not-found-page ${mode === 'playing' ? 'nf-playing' : ''}`}>
    <div className="nf-ambient" aria-hidden="true"/><div className="nf-grid" aria-hidden="true"/>
    {mode === 'playing' ? <>
      <canvas ref={canvasRef} className="nf-game-canvas" aria-label="Asteroid defence game. Move your pointer or finger to steer and tap or press Space to fire."/>
      <div className="nf-arcade-top">
        <div><small>SCORE</small><b>{score.toLocaleString()}</b></div><i/>
        <div><small>HIGH</small><b>{Math.max(highScore, globalHigh).toLocaleString()}</b></div><i/>
        <div><small>LEVEL</small><b>{level}</b></div><i/>
        <div className="nf-lives"><small>LIVES</small><b><Heart size={14} fill="currentColor"/> {lives}</b></div>
        <button onClick={() => finishGame(score, level)} aria-label="Close mission"><X size={15}/> Close</button>
      </div>
      <div className="nf-live-hint">MOVE TO STEER <span>·</span> TAP / CLICK / SPACE TO FIRE</div>
    </> : <section className="nf-stage">
      <div className="nf-orbit" aria-hidden="true"><div className="nf-planet"><span>✦</span><i/></div><i className="nf-orbit-ring"/><i className="nf-orbit-ring nf-orbit-ring-two"/></div>
      <div className="nf-content">
        <div className="nf-kicker"><span className="nf-live-dot"/> SIGNAL LOST · APML PORTAL</div>
        <h1 className="nf-code">404</h1>
        <h2>{mode === 'leaderboard' ? 'APML Global Scoreboard' : mode === 'debrief' ? 'Mission debrief' : 'This destination is off the map'}</h2>
        <p>{mode === 'hub' ? 'The page you’re looking for doesn’t exist or may have moved. Head back to the portal, or launch the optional asteroid-defence mission.' : mode === 'leaderboard' ? 'The top pilots defending the APML universe. Can you make the leaderboard?' : 'The mission has ended. Your run is recorded locally; save it to the global scoreboard if you want to share your result.'}</p>
        {mode === 'hub' ? <>
          <div className="nf-mascot" aria-hidden="true"><div className="nf-mascot-screen"><Sparkles size={28}/><span>APML</span><small>CRT-01</small></div><div className="nf-mascot-base"/></div>
          <div className="nf-hints"><span><b>Move</b> Pointer or finger</span><span><b>Fire</b> Tap or click</span><span><b>Goal</b> Protect the planet</span></div>
          <div className="nf-actions">
            <button className="nf-primary" onClick={startGame}><Play size={16} fill="currentColor"/> Launch Mini Game</button>
            <button className="nf-secondary" onClick={() => setMode('leaderboard')}><Trophy size={16}/> Check Scores</button>
            <Link className="nf-secondary" to="/"><Home size={16}/> Home Hub</Link>
            <button className="nf-secondary" onClick={() => window.history.back()}><ArrowLeft size={16}/> Return</button>
          </div>
        </> : mode === 'leaderboard' ? <>
          <div className="nf-leaderboard">
            <div className="nf-leaderboard-head"><span>RANK · PILOT</span><span>SCORE</span></div>
            {leaderboardLoading ? <div className="nf-empty">Syncing global scoreboard…</div> : entries.length ? entries.map((row, index) => <div className={`nf-rank-row ${index < 3 ? 'is-top' : ''}`} key={row.id || index}><span><b>#{index + 1}</b><strong>{String(row.pilot || 'Pilot').slice(0, 18)}</strong><small>LVL {row.level || 1} · {formatDate(row)}</small></span><em>{Number(row.score || 0).toLocaleString()}</em></div>) : <div className="nf-empty">No global scores yet. Be the first pilot!</div>}
          </div>
          <div className="nf-actions"><button className="nf-primary" onClick={startGame}><Play size={16}/> Play mission</button><button className="nf-secondary" onClick={() => setMode('hub')}><ArrowLeft size={16}/> Back to 404</button></div>
        </> : <>
          <div className="nf-result-grid"><div><small>FINAL SCORE</small><strong>{lastRun.score.toLocaleString()}</strong></div><div><small>WAVE LEVEL</small><strong>{lastRun.level}</strong></div><div><small>PERSONAL BEST</small><strong>{highScore.toLocaleString()}</strong></div></div>
          <form className="nf-save-form" onSubmit={saveScore}><input value={pilot} onChange={e => setPilot(e.target.value)} maxLength={18} placeholder="Enter pilot callsign…" aria-label="Pilot callsign"/><button type="submit" disabled={saving}><Zap size={15}/>{saving ? 'Saving…' : 'Save score'}</button></form>
          {message && <div className="nf-status" role="status">{message}</div>}
          <div className="nf-actions"><button className="nf-primary" onClick={startGame}><RotateCcw size={16}/> Play again</button><button className="nf-secondary" onClick={() => setMode('leaderboard')}><Trophy size={16}/> View scores</button><button className="nf-secondary" onClick={() => setMode('hub')}><Home size={16}/> 404 hub</button></div>
        </>}
        <div className="nf-footnote"><Gamepad2 size={13}/> A little detour from the APML mission.</div>
      </div>
    </section>}
  </div>
}
