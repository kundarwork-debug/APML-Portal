import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Home, Rocket, RotateCcw, ShieldAlert, Trophy, Zap, Heart, X } from 'lucide-react'
import { getApmlDatabase } from '../lib/firebase'

const LOCAL_SCORES_KEY = 'apml_local_leaderboard'
const PILOT_KEY = 'apml_pilot_name'
const HIGH_SCORE_KEY = 'apml_global_highest_score'

function readLocalScores() {
  try {
    const value = JSON.parse(localStorage.getItem(LOCAL_SCORES_KEY) || '[]')
    return Array.isArray(value) ? value : []
  } catch {
    return []
  }
}

export default function NotFound() {
  const canvasRef = useRef(null)
  const fireRef = useRef(null)
  const mascotRef = useRef(null)
  const statsRef = useRef({ score: 0, lives: 5, level: 1 })
  const [running, setRunning] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(5)
  const [level, setLevel] = useState(1)
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem(HIGH_SCORE_KEY) || 0))
  const [pilot, setPilot] = useState(() => localStorage.getItem(PILOT_KEY) || '')
  const [leaderboard, setLeaderboard] = useState(readLocalScores)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState('')
  const [showLeaderboard, setShowLeaderboard] = useState(false)

  useEffect(() => {
    let alive = true
    getApmlDatabase().then(db => {
      db.ref('arcade_scores').orderByChild('score').limitToLast(30).once('value').then(snapshot => {
        if (!alive) return
        const entries = []
        snapshot.forEach(child => entries.push(child.val()))
        entries.sort((a, b) => (b.score || 0) - (a.score || 0))
        setLeaderboard(entries.length ? entries : readLocalScores())
        const best = Math.max(0, ...entries.map(item => Number(item.score) || 0))
        if (best) setHighScore(current => {
          const next = Math.max(current, best)
          localStorage.setItem(HIGH_SCORE_KEY, String(next))
          return next
        })
      })
    }).catch(() => {})
    return () => { alive = false }
  }, [])

  const startGame = useCallback(() => {
    statsRef.current = { score: 0, lives: 5, level: 1 }
    setScore(0)
    setLives(5)
    setLevel(1)
    setGameOver(false)
    setSaved(false)
    setRunning(true)
  }, [])

  useEffect(() => {
    if (!running) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    let raf = 0
    let lastTime = 0
    let lastSpawn = 0
    let lastToast = 0
    let shipX = window.innerWidth / 2
    let shipY = window.innerHeight * .68
    let targetX = shipX
    let targetY = shipY
    let angle = -Math.PI / 2
    let shieldUntil = 0
    let rapidUntil = 0
    let bossSpawnedAt = 0
    let bossActive = false
    const missiles = []
    const asteroids = []
    const particles = []
    const powerUps = []
    const stars = Array.from({ length: 130 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.7 + .3, speed: Math.random() * .12 + .025 }))

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = window.innerWidth
      const h = window.innerHeight
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = w + 'px'
      canvas.style.height = h + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    window.addEventListener('resize', resize)

    const move = event => {
      targetX = event.clientX
      targetY = event.clientY
    }
    const touchMove = event => {
      if (event.touches?.[0]) {
        targetX = event.touches[0].clientX
        targetY = event.touches[0].clientY
      }
    }
    const fireMissile = () => {
      const now = performance.now()
      if (now - (fireMissile.lastShot || 0) < (now < rapidUntil ? 115 : 260)) return
      fireMissile.lastShot = now
      missiles.push({ x: shipX + Math.cos(angle) * 15, y: shipY + Math.sin(angle) * 15, vx: Math.cos(angle) * 12, vy: Math.sin(angle) * 12, life: 90, r: 3 })
    }
    fireRef.current = fireMissile
    const pointerDown = event => { if (event.button === 0) fireMissile() }
    const keydown = event => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(event.key)) event.preventDefault()
      if (event.code === 'Space') fireMissile()
      const step = 34
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') targetX -= step
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') targetX += step
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') targetY -= step
      if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') targetY += step
      if (event.key === 'Escape') setRunning(false)
    }
    window.addEventListener('pointermove', move)
    canvas.addEventListener('pointerdown', pointerDown)
    window.addEventListener('touchmove', touchMove, { passive: true })
    window.addEventListener('keydown', keydown)

    const toastMessage = message => {
      if (performance.now() - lastToast < 700) return
      lastToast = performance.now()
      setToast(message)
    }
    const burst = (x, y, color = '#fb923c', count = 18) => {
      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const speed = Math.random() * 4 + .5
        particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1, color, r: Math.random() * 3 + 1 })
      }
    }
    const spawnAsteroid = (boss = false) => {
      const w = window.innerWidth, h = window.innerHeight
      const side = Math.floor(Math.random() * 4)
      const margin = boss ? 70 : 28
      const x = side === 1 ? w + margin : side === 3 ? -margin : Math.random() * w
      const y = side === 0 ? -margin : side === 2 ? h + margin : Math.random() * h
      const targetAngle = Math.atan2(shipY - y, shipX - x)
      const speed = boss ? 1.05 + statsRef.current.level * .035 : (1.05 + Math.random() * 1.25) * (1 + (statsRef.current.level - 1) * .12)
      const radius = boss ? Math.min(54, Math.max(38, Math.min(w, h) * .065)) : 13 + Math.random() * 17
      const sides = boss ? 11 : 7 + Math.floor(Math.random() * 4)
      asteroids.push({ x, y, vx: Math.cos(targetAngle) * speed, vy: Math.sin(targetAngle) * speed, r: radius, sides, angle: Math.random() * 6, spin: (Math.random() - .5) * .045, boss, hp: boss ? 10 + Math.floor(statsRef.current.level / 2) : 1, maxHp: boss ? 10 + Math.floor(statsRef.current.level / 2) : 1 })
      if (boss) { bossActive = true; bossSpawnedAt = statsRef.current.level; toastMessage('BOSS INBOUND · LEVEL ' + statsRef.current.level) }
    }
    const addPoints = (points, x, y, color) => {
      const nextScore = statsRef.current.score + points
      const nextLevel = Math.floor(nextScore / 250) + 1
      statsRef.current.score = nextScore
      setScore(nextScore)
      if (nextScore > Number(localStorage.getItem(HIGH_SCORE_KEY) || 0)) {
        setHighScore(nextScore)
        localStorage.setItem(HIGH_SCORE_KEY, String(nextScore))
      }
      burst(x, y, color || '#fb923c', 22)
      if (nextLevel > statsRef.current.level) {
        statsRef.current.level = nextLevel
        setLevel(nextLevel)
        toastMessage('LEVEL ' + nextLevel + ' · THREAT LEVEL INCREASED')
      }
    }
    const loseLife = () => {
      if (performance.now() < shieldUntil) { toastMessage('SHIELD ABSORBED THE IMPACT'); return }
      const next = statsRef.current.lives - 1
      statsRef.current.lives = next
      setLives(next)
      if (next <= 0) {
        setRunning(false)
        setGameOver(true)
        burst(shipX, shipY, '#ef4444', 45)
      } else {
        shieldUntil = performance.now() + 900
        toastMessage('LIFELINE LOST · ' + next + ' REMAINING')
      }
    }

    const drawShip = () => {
      ctx.save()
      ctx.translate(shipX, shipY)
      ctx.rotate(angle + Math.PI / 2)
      ctx.shadowColor = '#fb6b52'
      ctx.shadowBlur = 20
      ctx.fillStyle = '#f8fafc'
      ctx.beginPath()
      ctx.moveTo(0, -20); ctx.lineTo(14, 15); ctx.lineTo(0, 8); ctx.lineTo(-14, 15)
      ctx.closePath(); ctx.fill()
      ctx.fillStyle = '#ef4444'
      ctx.beginPath(); ctx.moveTo(-6, 14); ctx.lineTo(0, 25 + Math.random() * 5); ctx.lineTo(6, 14); ctx.fill()
      ctx.restore()
    }

    const loop = time => {
      const w = window.innerWidth, h = window.innerHeight
      const dt = Math.min(2.2, (time - (lastTime || time)) / 16.67 || 1)
      lastTime = time
      ctx.clearRect(0, 0, w, h)
      const bg = ctx.createRadialGradient(w * .5, h * .4, 10, w * .5, h * .5, Math.max(w, h))
      bg.addColorStop(0, '#172337'); bg.addColorStop(1, '#080d17')
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)
      stars.forEach(star => {
        star.y += star.speed * dt
        if (star.y > 1) star.y = 0
        ctx.globalAlpha = .35 + star.r / 3
        ctx.fillStyle = '#dbeafe'
        ctx.beginPath(); ctx.arc(star.x * w, star.y * h, star.r, 0, Math.PI * 2); ctx.fill()
      })
      ctx.globalAlpha = 1
      shipX += (Math.max(22, Math.min(w - 22, targetX)) - shipX) * .18 * dt
      shipY += (Math.max(80, Math.min(h - 28, targetY)) - shipY) * .18 * dt
      const nearest = asteroids.reduce((best, item) => {
        const d = Math.hypot(item.x - shipX, item.y - shipY)
        return !best || d < best.d ? { item, d } : best
      }, null)
      if (nearest) angle = Math.atan2(nearest.item.y - shipY, nearest.item.x - shipX)
      const levelNow = statsRef.current.level
      const spawnDelay = Math.max(430, 1350 - (levelNow - 1) * 85)
      if (!bossActive && levelNow >= 5 && levelNow % 5 === 0 && bossSpawnedAt !== levelNow) spawnAsteroid(true)
      if (!bossActive && time - lastSpawn > spawnDelay) { spawnAsteroid(false); lastSpawn = time }

      for (let i = missiles.length - 1; i >= 0; i--) {
        const m = missiles[i]
        m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt
        ctx.fillStyle = '#7dd3fc'; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 14
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
        if (m.life <= 0 || m.x < -50 || m.x > w + 50 || m.y < -50 || m.y > h + 50) missiles.splice(i, 1)
      }
      for (let i = asteroids.length - 1; i >= 0; i--) {
        const a = asteroids[i]
        a.x += a.vx * dt; a.y += a.vy * dt; a.angle += a.spin * dt
        ctx.save(); ctx.translate(a.x, a.y); ctx.rotate(a.angle)
        ctx.beginPath()
        for (let n = 0; n < a.sides; n++) {
          const ang = n / a.sides * Math.PI * 2
          const radius = a.r * (.78 + .22 * Math.sin(n * 13.7 + i))
          if (!n) ctx.moveTo(Math.cos(ang) * radius, Math.sin(ang) * radius)
          else ctx.lineTo(Math.cos(ang) * radius, Math.sin(ang) * radius)
        }
        ctx.closePath()
        const gradient = ctx.createRadialGradient(-a.r * .25, -a.r * .3, 2, 0, 0, a.r)
        gradient.addColorStop(0, a.boss ? '#fef3c7' : '#fca58a')
        gradient.addColorStop(.5, a.boss ? '#f97316' : '#c64d43')
        gradient.addColorStop(1, '#2b2036')
        ctx.fillStyle = gradient; ctx.shadowColor = a.boss ? '#f97316' : '#ef4444'; ctx.shadowBlur = a.boss ? 24 : 13; ctx.fill()
        ctx.strokeStyle = a.boss ? '#fbbf24' : '#fb9276'; ctx.lineWidth = 1.4; ctx.stroke()
        ctx.restore()
        if (a.boss) {
          ctx.fillStyle = '#fde68a'; ctx.font = '800 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('ASTEROID OVERLORD', a.x, a.y - a.r - 17)
          ctx.fillStyle = '#334155'; ctx.fillRect(a.x - 28, a.y - a.r - 11, 56, 4)
          ctx.fillStyle = '#f97316'; ctx.fillRect(a.x - 28, a.y - a.r - 11, 56 * (a.hp / a.maxHp), 4)
        }
        if (Math.hypot(a.x - shipX, a.y - shipY) < a.r + 13 && time > shieldUntil) {
          asteroids.splice(i, 1); burst(a.x, a.y); loseLife(); continue
        }
        let destroyed = false
        for (let j = missiles.length - 1; j >= 0; j--) {
          if (Math.hypot(a.x - missiles[j].x, a.y - missiles[j].y) < a.r + 5) {
            missiles.splice(j, 1)
            a.hp -= 1
            if (a.hp <= 0) {
              asteroids.splice(i, 1)
              if (a.boss) { bossActive = false; addPoints(250, a.x, a.y, '#fbbf24'); powerUps.push({ x: a.x, y: a.y, type: 'repair', life: 900 }); toastMessage('BOSS DESTROYED · BONUS SECURED') }
              else { addPoints(10, a.x, a.y); if (a.r > 24) { for (let n = 0; n < 2; n++) asteroids.push({ x: a.x, y: a.y, vx: (Math.random() - .5) * 4, vy: (Math.random() - .5) * 4, r: a.r * .52, sides: 7, angle: 0, spin: .03, boss: false, hp: 1, maxHp: 1 }) } }
              destroyed = true
            }
            break
          }
        }
        if (destroyed) continue
        if (a.x < -100 || a.x > w + 100 || a.y < -100 || a.y > h + 100) {
          asteroids.splice(i, 1)
          if (a.boss) bossActive = false
        }
      }
      for (let i = powerUps.length - 1; i >= 0; i--) {
        const p = powerUps[i]; p.y += 1.15 * dt; p.life -= dt
        const color = p.type === 'shield' ? '#38bdf8' : p.type === 'rapid' ? '#a78bfa' : '#4ade80'
        ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 15
        ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0
        ctx.fillStyle = '#101827'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(p.type === 'shield' ? 'S' : p.type === 'rapid' ? 'R' : '+', p.x, p.y + 4)
        if (Math.hypot(p.x - shipX, p.y - shipY) < 27) {
          if (p.type === 'shield') { shieldUntil = time + 5000; toastMessage('SHIELD ACTIVE') }
          else if (p.type === 'rapid') { rapidUntil = time + 5000; toastMessage('RAPID FIRE ACTIVE') }
          else { statsRef.current.lives = Math.min(5, statsRef.current.lives + 1); setLives(statsRef.current.lives); toastMessage('REPAIR KIT · +1 LIFE') }
          burst(p.x, p.y, color, 12); powerUps.splice(i, 1)
        } else if (p.life <= 0 || p.y > h + 30) powerUps.splice(i, 1)
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= .035 * dt
        ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
        if (p.life <= 0) particles.splice(i, 1)
      }
      ctx.globalAlpha = 1
      if (time < shieldUntil) { ctx.beginPath(); ctx.arc(shipX, shipY, 28, 0, Math.PI * 2); ctx.strokeStyle = '#38bdf8'; ctx.lineWidth = 2; ctx.shadowColor = '#38bdf8'; ctx.shadowBlur = 18; ctx.stroke(); ctx.shadowBlur = 0 }
      if (time < rapidUntil) { ctx.fillStyle = '#c4b5fd'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('RAPID', shipX, shipY + 35) }
      drawShip()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
      canvas.removeEventListener('pointerdown', pointerDown)
      fireRef.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('touchmove', touchMove)
      window.removeEventListener('keydown', keydown)
    }
  }, [running])

  const saveScore = async event => {
    event.preventDefault()
    if (saving || saved) return
    const callsign = pilot.trim().slice(0, 18) || 'Pilot'
    setSaving(true)
    const entry = { pilot: callsign, score, level, date: new Date().toLocaleDateString('en-GB'), timestamp: Date.now(), isoDate: new Date().toISOString() }
    const local = [...readLocalScores(), entry].sort((a, b) => b.score - a.score).slice(0, 30)
    localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(local))
    localStorage.setItem(PILOT_KEY, callsign)
    setLeaderboard(local)
    try {
      const db = await getApmlDatabase()
      await db.ref('arcade_scores').push(entry)
      const snapshot = await db.ref('arcade_scores').orderByChild('score').limitToLast(30).once('value')
      const globalEntries = []
      snapshot.forEach(child => globalEntries.push(child.val()))
      globalEntries.sort((a, b) => (b.score || 0) - (a.score || 0))
      setLeaderboard(globalEntries)
    } catch {
      setLeaderboard(local)
    }
    setSaving(false)
    setSaved(true)
  }

  const closeScorecard = () => {
    setGameOver(false)
    setRunning(false)
    setScore(0)
    setLives(5)
    setLevel(1)
    statsRef.current = { score: 0, lives: 5, level: 1 }
  }

  return (
    <main className="not-found-page">
      <section className="not-found-intro">
        <div className="not-found-code"><span>4</span><span className="not-found-orbit">✦</span><span>4</span></div>
        <div className="not-found-kicker"><ShieldAlert size={15}/> SIGNAL LOST · ERROR 404</div>
        <div className="apml-crt-mascot" ref={mascotRef} role="img" aria-label="APML friendly CRT mascot" />
        <h1>Looks like you drifted <span>off course.</span></h1>
        <p>The page you're looking for isn't in this sector. You can help defend the APML station while you're here.</p>
        <div className="not-found-actions">
          <Link to="/" className="not-found-home"><Home size={17}/> Back to APML Home</Link>
          <button type="button" className="not-found-retry" onClick={() => window.history.back()}><ArrowLeft size={16}/> Go back</button>
        </div>
      </section>

      <section className="not-found-game">
        <div className="not-found-game-head">
          <div><span className="not-found-kicker"><Rocket size={14}/> APML SPACE DEFENSE</span><h2>Defend the station</h2><p>Steer your ship, destroy incoming asteroids and collect power-ups.</p></div>
          <div className="not-found-stats"><span>BEST <b>{highScore.toLocaleString()}</b></span><span>TOP PILOT <b>{leaderboard[0]?.pilot || '—'}</b></span></div>
        </div>
        <div className="not-found-launch-card">
          <div className="not-found-launch-art"><Rocket size={38}/><span>✦</span></div>
          <div><strong>Ready for launch?</strong><p>Move to steer. Click or tap to fire, or press Space. Reach level 5 to face the Overlord.</p></div>
          <button type="button" onClick={startGame}><Rocket size={16}/> Start mission</button>
        </div>
        <div className="not-found-leaderboard-preview">
          <div><Trophy size={16}/><strong>APML Pilot Rankings</strong></div>
          {leaderboard.length ? leaderboard.slice(0, 3).map((item, index) => <span key={(item.timestamp || item.date || 'score') + '-' + index}>#{index + 1} {item.pilot || 'Pilot'} · {(item.score || 0).toLocaleString()} pts</span>) : <small>No saved scores found yet.</small>}
          <button type="button" className="apml-view-scores" onClick={() => setShowLeaderboard(true)}>View full scoreboard <ArrowLeft size={13}/></button>
        </div>
      </section>
      <p className="not-found-signoff">APML PORTAL <span>·</span> LOST IN SPACE, NOT FOR LONG.</p>

      {running && <div className="apml-arcade-live">
        <canvas ref={canvasRef} aria-label="APML asteroid arcade. Move your ship with the mouse, touch or arrow keys."/>
        <div className="apml-arcade-scoreboard">
          <span>SCORE <b>{score.toLocaleString()}</b></span><i/><span>HIGH <b>{highScore.toLocaleString()}</b></span><i/><span>LVL <b>{level}</b></span><i/><span className="apml-arcade-lives"><Heart size={14}/><b>{lives}</b></span>
          <button type="button" onClick={() => setRunning(false)} aria-label="Quit mission"><X size={15}/> Quit</button>
        </div>
        {toast && <div className="apml-arcade-toast">{toast}</div>}
        <button type="button" className="apml-mobile-fire" onPointerDown={event => event.stopPropagation()} onClick={() => fireRef.current?.()}>FIRE <Zap size={17}/></button>
        <div className="apml-arcade-hint">MOVE TO STEER · CLICK / TAP OR SPACE TO FIRE · ESC TO QUIT</div>
      </div>}

      {(gameOver || showLeaderboard) && <div className="apml-scorecard-backdrop">
        <section className="apml-scorecard" aria-label="Mission scorecard">
          <div className="apml-scorecard-head"><span><Trophy size={15}/> {showLeaderboard ? 'GLOBAL RANKINGS' : 'MISSION DEBRIEF'}</span><button type="button" onClick={() => { setShowLeaderboard(false); if (gameOver) closeScorecard() }} aria-label="Close scorecard"><X size={18}/></button></div>
          <h2>{showLeaderboard ? 'APML Scoreboard' : 'Defense Over'}</h2>
          <p className="apml-scorecard-sub">{showLeaderboard ? 'The top saved pilot scores from APML arcade.' : 'Your run has ended. Record your score among APML pilots.'}</p>
          {!showLeaderboard && <div className="apml-final-stats"><div><small>FINAL SCORE</small><strong>{score.toLocaleString()}</strong></div><div><small>LEVEL REACHED</small><strong>{level}</strong></div><div><small>BEST SCORE</small><strong>{highScore.toLocaleString()}</strong></div></div>}
          {!showLeaderboard && <form className="apml-score-save" onSubmit={saveScore}>
            <label htmlFor="apml-pilot-name">PILOT CALLSIGN</label>
            <input id="apml-pilot-name" maxLength={18} value={pilot} onChange={event => setPilot(event.target.value)} placeholder="Enter your name" />
            <button type="submit" disabled={saving || saved}>{saving ? 'Saving score…' : saved ? '✓ Score saved' : 'Save score'}</button>
          </form>}
          <div className="apml-score-rank-head"><strong><Trophy size={15}/> APML SCOREBOARD</strong><span>TOP 30</span></div>
          <div className="apml-score-rank-list">{leaderboard.slice(0, 30).map((item, index) => <div className={index < 3 ? 'apml-rank-row top' : 'apml-rank-row'} key={(item.timestamp || item.date || 'entry') + '-' + index}><b>#{index + 1}</b><span>{item.pilot || 'Pilot'} <small>LVL {item.level || 1}</small></span><strong>{Number(item.score || 0).toLocaleString()}</strong></div>)}</div>
          <div className="apml-scorecard-actions">{gameOver && <button type="button" className="secondary" onClick={closeScorecard}>Exit</button>}{showLeaderboard && <button type="button" className="secondary" onClick={() => setShowLeaderboard(false)}>Close</button>}{gameOver && <button type="button" onClick={startGame}><RotateCcw size={15}/> Play again</button>}</div>
        </section>
      </div>}
    </main>
  )
}
