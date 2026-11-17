import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Home, RotateCcw, Trophy, ShieldAlert, Gamepad2, Heart, X, Sparkles } from 'lucide-react'
import { getApmlDatabase } from '../lib/firebase'
import './NotFound.css'

const LOCAL_SCORES_KEY = 'apml_local_leaderboard'
const PILOT_KEY = 'apml_pilot_name'
const HIGH_SCORE_KEY = 'apml_breakout_high_score'

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
  const [running, setRunning] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [level, setLevel] = useState(1)
  const [highScore, setHighScore] = useState(() => Number(localStorage.getItem(HIGH_SCORE_KEY) || 0))
  const [pilot, setPilot] = useState(() => localStorage.getItem(PILOT_KEY) || '')
  const [leaderboard, setLeaderboard] = useState(readLocalScores)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const db = getApmlDatabase()
        const snapshot = await db.ref('arcade_scores').orderByChild('score').limitToLast(30).once('value')
        if (!alive) return
        const entries = []
        snapshot.forEach(child => {
          const value = child.val()
          if (value && typeof value === 'object') entries.push(value)
        })
        entries.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0))
        setLeaderboard(entries.length ? entries : readLocalScores())
        const best = Math.max(0, ...entries.map(item => Number(item.score) || 0))
        if (best) setHighScore(current => {
          const next = Math.max(current, best)
          localStorage.setItem(HIGH_SCORE_KEY, String(next))
          return next
        })
      } catch (error) {
        if (alive) setLeaderboard(readLocalScores())
        console.warn('APML scoreboard unavailable; using local scores.', error)
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const startGame = useCallback(() => {
    setScore(0)
    setLives(3)
    setLevel(1)
    setGameOver(false)
    setShowLeaderboard(false)
    setSaved(false)
    setToast('')
    setRunning(true)
  }, [])

  useEffect(() => {
    if (!running) return undefined
    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    let raf = 0
    let last = 0
    let width = 0
    let height = 0
    let currentScore = 0
    let currentLives = 3
    let currentLevel = 1
    let paddle = { x: 0, y: 0, width: 112, height: 12, targetX: 0 }
    let ball = { x: 0, y: 0, vx: 4, vy: -5, radius: 7, stuck: true }
    let bricks = []
    let particles = []
    let keys = {}
    let messageTimer = 0
    let ended = false

    const palette = ['#fb7185', '#f97316', '#fbbf24', '#34d399', '#38bdf8', '#a78bfa']
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      width = rect.width || window.innerWidth
      height = rect.height || Math.max(420, window.innerHeight * .62)
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      paddle.y = height - 42
      paddle.x = Math.max(paddle.width / 2, Math.min(width - paddle.width / 2, paddle.x || width / 2))
      paddle.targetX = paddle.x
      if (ball.stuck) { ball.x = paddle.x; ball.y = paddle.y - 18 }
    }
    const buildLevel = () => {
      const columns = Math.min(11, Math.max(6, Math.floor(width / 68)))
      const rows = Math.min(7, 3 + currentLevel)
      const gap = 7
      const brickWidth = Math.min(58, (width - 40 - gap * (columns - 1)) / columns)
      const total = columns * brickWidth + (columns - 1) * gap
      const startX = (width - total) / 2
      bricks = []
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          const tough = currentLevel > 1 && (row + col + currentLevel) % 5 === 0
          bricks.push({
            x: startX + col * (brickWidth + gap),
            y: 48 + row * 25,
            w: brickWidth,
            h: 17,
            color: palette[row % palette.length],
            hp: tough ? 2 : 1,
            maxHp: tough ? 2 : 1,
            alive: true
          })
        }
      }
    }
    const resetBall = () => {
      ball = { x: paddle.x, y: paddle.y - 18, vx: (Math.random() > .5 ? 1 : -1) * (3.3 + currentLevel * .25), vy: -(4.6 + currentLevel * .3), radius: 7, stuck: true }
    }
    const resizeAndBuild = () => { resize(); buildLevel(); resetBall() }
    resizeAndBuild()

    const movePointer = event => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      paddle.targetX = Math.max(paddle.width / 2, Math.min(width - paddle.width / 2, x))
      if (ball.stuck) { paddle.x = paddle.targetX; ball.x = paddle.x }
    }
    const touchMove = event => {
      if (event.touches?.[0]) {
        const rect = canvas.getBoundingClientRect()
        const x = event.touches[0].clientX - rect.left
        paddle.targetX = Math.max(paddle.width / 2, Math.min(width - paddle.width / 2, x))
        if (ball.stuck) { paddle.x = paddle.targetX; ball.x = paddle.x }
      }
    }
    const pointerDown = () => { if (ball.stuck) ball.stuck = false }
    const keyDown = event => {
      if (['ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault()
      keys[event.key.toLowerCase()] = true
      if (event.code === 'Space' && ball.stuck) ball.stuck = false
    }
    const keyUp = event => { keys[event.key.toLowerCase()] = false }
    const burst = (x, y, color) => {
      for (let i = 0; i < 7; i++) {
        const angle = Math.random() * Math.PI * 2
        const speed = 1 + Math.random() * 3
        particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 1, color })
      }
    }
    const loseBall = () => {
      currentLives -= 1
      setLives(currentLives)
      if (currentLives <= 0) {
        ended = true
        setGameOver(true)
        setRunning(false)
        return
      }
      resetBall()
      setToast('BALL LOST · ' + currentLives + ' LIVES LEFT')
      messageTimer = 100
    }
    const finishLevel = () => {
      currentLevel += 1
      setLevel(currentLevel)
      setToast('LEVEL ' + currentLevel + ' · NICE WORK!')
      messageTimer = 110
      buildLevel()
      resetBall()
    }
    const draw = time => {
      const dt = Math.min(2, (time - (last || time)) / 16.67 || 1)
      last = time
      ctx.clearRect(0, 0, width, height)
      const bg = ctx.createLinearGradient(0, 0, width, height)
      bg.addColorStop(0, '#111b30')
      bg.addColorStop(1, '#080d18')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, width, height)

      // Subtle arcade grid and ambient lights.
      ctx.strokeStyle = 'rgba(148,163,184,.055)'
      ctx.lineWidth = 1
      for (let x = 0; x < width; x += 36) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke() }
      for (let y = 0; y < height; y += 36) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke() }

      if (keys.arrowleft || keys.a) paddle.targetX -= 7 * dt
      if (keys.arrowright || keys.d) paddle.targetX += 7 * dt
      paddle.targetX = Math.max(paddle.width / 2, Math.min(width - paddle.width / 2, paddle.targetX))
      paddle.x += (paddle.targetX - paddle.x) * Math.min(1, .32 * dt)
      if (ball.stuck) { ball.x = paddle.x; ball.y = paddle.y - 18 }
      else {
        ball.x += ball.vx * dt
        ball.y += ball.vy * dt
        if (ball.x < ball.radius) { ball.x = ball.radius; ball.vx = Math.abs(ball.vx) }
        if (ball.x > width - ball.radius) { ball.x = width - ball.radius; ball.vx = -Math.abs(ball.vx) }
        if (ball.y < ball.radius) { ball.y = ball.radius; ball.vy = Math.abs(ball.vy) }
        if (ball.y > height + ball.radius) loseBall()

        // Paddle collision.
        if (ball.vy > 0 && ball.y + ball.radius >= paddle.y && ball.y - ball.radius <= paddle.y + paddle.height &&
          ball.x >= paddle.x - paddle.width / 2 && ball.x <= paddle.x + paddle.width / 2) {
          const hit = (ball.x - paddle.x) / (paddle.width / 2)
          const speed = Math.min(9.5, Math.hypot(ball.vx, ball.vy) + .12)
          const angle = hit * 1.05
          ball.vx = Math.sin(angle) * speed
          ball.vy = -Math.cos(angle) * speed
          ball.y = paddle.y - ball.radius - 1
        }

        // Brick collision.
        for (const brick of bricks) {
          if (!brick.alive) continue
          if (ball.x + ball.radius > brick.x && ball.x - ball.radius < brick.x + brick.w &&
              ball.y + ball.radius > brick.y && ball.y - ball.radius < brick.y + brick.h) {
            brick.hp -= 1
            if (brick.hp <= 0) {
              brick.alive = false
              currentScore += 10 * currentLevel
              setScore(currentScore)
              burst(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color)
              if (currentScore > Number(localStorage.getItem(HIGH_SCORE_KEY) || 0)) {
                localStorage.setItem(HIGH_SCORE_KEY, String(currentScore))
                setHighScore(currentScore)
              }
            } else {
              currentScore += 5 * currentLevel
              setScore(currentScore)
            }
            const overlapLeft = ball.x + ball.radius - brick.x
            const overlapRight = brick.x + brick.w - (ball.x - ball.radius)
            const overlapTop = ball.y + ball.radius - brick.y
            const overlapBottom = brick.y + brick.h - (ball.y - ball.radius)
            if (Math.min(overlapLeft, overlapRight) < Math.min(overlapTop, overlapBottom)) ball.vx *= -1
            else ball.vy *= -1
            break
          }
        }
        if (bricks.every(brick => !brick.alive)) finishLevel()
      }

      // Bricks.
      for (const brick of bricks) {
        if (!brick.alive) continue
        ctx.save()
        ctx.shadowColor = brick.color
        ctx.shadowBlur = 12
        ctx.fillStyle = brick.hp > 1 ? '#e2e8f0' : brick.color
        ctx.beginPath()
        ctx.roundRect(brick.x, brick.y, brick.w, brick.h, 5)
        ctx.fill()
        ctx.shadowBlur = 0
        ctx.fillStyle = 'rgba(255,255,255,.24)'
        ctx.fillRect(brick.x + 5, brick.y + 3, Math.max(4, brick.w - 10), 2)
        ctx.restore()
      }

      // Paddle.
      ctx.save()
      ctx.shadowColor = '#38bdf8'
      ctx.shadowBlur = 20
      const paddleGradient = ctx.createLinearGradient(paddle.x - paddle.width / 2, 0, paddle.x + paddle.width / 2, 0)
      paddleGradient.addColorStop(0, '#0ea5e9')
      paddleGradient.addColorStop(.5, '#e0f2fe')
      paddleGradient.addColorStop(1, '#0ea5e9')
      ctx.fillStyle = paddleGradient
      ctx.beginPath()
      ctx.roundRect(paddle.x - paddle.width / 2, paddle.y, paddle.width, paddle.height, 8)
      ctx.fill()
      ctx.restore()

      // Ball.
      ctx.save()
      ctx.shadowColor = '#fff'
      ctx.shadowBlur = 18
      const ballGradient = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.radius + 2)
      ballGradient.addColorStop(0, '#fff')
      ballGradient.addColorStop(1, '#7dd3fc')
      ctx.fillStyle = ballGradient
      ctx.beginPath()
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= .035 * dt
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.beginPath(); ctx.arc(p.x, p.y, 2.3, 0, Math.PI * 2); ctx.fill()
        if (p.life <= 0) particles.splice(i, 1)
      }
      ctx.globalAlpha = 1
      if (messageTimer > 0) {
        messageTimer -= dt
        ctx.fillStyle = '#e2e8f0'
        ctx.font = '800 12px system-ui'
        ctx.textAlign = 'center'
        ctx.fillText(toast, width / 2, height * .66)
      }
      if (ball.stuck) {
        ctx.fillStyle = 'rgba(226,232,240,.72)'
        ctx.font = '700 11px system-ui'
        ctx.textAlign = 'center'
        ctx.fillText('CLICK · TAP · OR PRESS SPACE TO LAUNCH', width / 2, height - 15)
      }
      if (!ended) raf = requestAnimationFrame(draw)
    }
    const onResize = () => { resize(); buildLevel() }
    window.addEventListener('resize', onResize)
    canvas.addEventListener('pointermove', movePointer)
    canvas.addEventListener('pointerdown', pointerDown)
    window.addEventListener('touchmove', touchMove, { passive: true })
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      canvas.removeEventListener('pointermove', movePointer)
      canvas.removeEventListener('pointerdown', pointerDown)
      window.removeEventListener('touchmove', touchMove)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
    }
  }, [running])

  const saveScore = async event => {
    event.preventDefault()
    if (saving || saved) return
    const callsign = pilot.trim().slice(0, 18) || 'Player'
    setSaving(true)
    const entry = { pilot: callsign, score, level, date: new Date().toLocaleDateString('en-GB'), timestamp: Date.now(), isoDate: new Date().toISOString(), game: 'neon-breakout' }
    const local = [...readLocalScores(), entry].sort((a, b) => Number(b.score) - Number(a.score)).slice(0, 30)
    localStorage.setItem(LOCAL_SCORES_KEY, JSON.stringify(local))
    localStorage.setItem(PILOT_KEY, callsign)
    setLeaderboard(local)
    try {
      const db = getApmlDatabase()
      await db.ref('arcade_scores').push(entry)
      const snapshot = await db.ref('arcade_scores').orderByChild('score').limitToLast(30).once('value')
      const globalEntries = []
      snapshot.forEach(child => globalEntries.push(child.val()))
      globalEntries.sort((a, b) => Number(b.score) - Number(a.score))
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
  }

  return (
    <main className="not-found-page">
      <div className="nf-background-glow" aria-hidden="true" />
      <section className="nf-content">
        <div className="nf-code" aria-label="Error 404"><span>4</span><span className="nf-code-spark">✦</span><span>4</span></div>
        <div className="nf-kicker"><ShieldAlert size={14}/> SIGNAL LOST · ERROR 404</div>
        <div className="nf-illustration" aria-hidden="true"><Gamepad2 size={54}/><Sparkles className="nf-sparkle" size={20}/></div>
        <h1>Oops! Wrong turn.</h1>
        <p>The page you're looking for has drifted out of reach. Head back to APML, or take a quick break with a little arcade classic.</p>
        <div className="nf-actions">
          <Link to="/" className="nf-primary"><Home size={16}/> Back to APML Home</Link>
          <button type="button" className="nf-secondary" onClick={() => window.history.back()}><ArrowLeft size={16}/> Go back</button>
        </div>
      </section>

      <section className="nf-game-section">
        <div className="nf-game-heading">
          <div>
            <span className="nf-game-label"><Sparkles size={14}/> APML ARCADE</span>
            <h2>Neon Breakout</h2>
            <p>Break every brick. Keep the ball in play. Beat your best score.</p>
          </div>
          <div className="nf-best-score"><Trophy size={16}/><span>PERSONAL BEST<strong>{highScore.toLocaleString()}</strong></span></div>
        </div>
        <div className="nf-game-panel">
          <div className="nf-game-preview" aria-hidden="true">
            <div className="nf-preview-bricks">{Array.from({ length: 24 }, (_, i) => <i key={i} />)}</div>
            <div className="nf-preview-ball" />
            <div className="nf-preview-paddle" />
          </div>
          <div className="nf-game-info">
            <strong>Ready to break out?</strong>
            <p>Move the paddle with your mouse, touch or arrow keys. Click, tap or press Space to launch the ball.</p>
            <button type="button" className="nf-start-button" onClick={startGame}><Gamepad2 size={17}/> Play Neon Breakout</button>
          </div>
        </div>
        <div className="nf-game-footer">
          <div className="nf-controls"><span><b>← →</b> Move</span><span><b>SPACE</b> Launch</span><span><b>TOUCH</b> Drag paddle</span></div>
          <button type="button" className="nf-leaderboard-button" onClick={() => setShowLeaderboard(true)}><Trophy size={14}/> View scoreboard</button>
        </div>
      </section>
      <p className="nf-signoff">APML PORTAL <span>·</span> EVEN A WRONG TURN CAN BE FUN.</p>

      {running && <div className="nf-game-overlay">
        <div className="nf-game-hud">
          <span>SCORE <b>{score.toLocaleString()}</b></span><i/>
          <span>BEST <b>{highScore.toLocaleString()}</b></span><i/>
          <span>LEVEL <b>{level}</b></span><i/>
          <span className="nf-lives"><Heart size={14}/><b>{lives}</b></span>
          <button type="button" onClick={() => { setRunning(false); setGameOver(false) }}><X size={15}/> Exit</button>
        </div>
        <canvas ref={canvasRef} aria-label="Neon Breakout game. Move the paddle with mouse, touch or arrow keys. Launch with click, tap or Space." />
        <div className="nf-overlay-hint">MOVE PADDLE · CLICK / TAP / SPACE TO LAUNCH</div>
      </div>}

      {(gameOver || showLeaderboard) && <div className="nf-modal-backdrop">
        <section className="nf-modal" aria-label="APML arcade scoreboard">
          <div className="nf-modal-head"><span><Trophy size={15}/> {showLeaderboard ? 'APML ARCADE RANKINGS' : 'GAME OVER'}</span><button type="button" onClick={() => { setShowLeaderboard(false); if (gameOver) closeScorecard() }} aria-label="Close"><X size={18}/></button></div>
          <h2>{showLeaderboard ? 'High Scores' : 'Nice try!'}</h2>
          <p>{showLeaderboard ? 'Top saved scores from APML players.' : 'That was a good run. Save your score to the APML scoreboard.'}</p>
          {!showLeaderboard && <div className="nf-result-score"><small>YOUR SCORE</small><strong>{score.toLocaleString()}</strong><span>LEVEL {level} · BEST {highScore.toLocaleString()}</span></div>}
          {!showLeaderboard && <form className="nf-save-form" onSubmit={saveScore}>
            <label htmlFor="apml-breakout-player">PLAYER NAME</label>
            <div><input id="apml-breakout-player" maxLength={18} value={pilot} onChange={event => setPilot(event.target.value)} placeholder="Enter your name"/><button type="submit" disabled={saving || saved}>{saving ? 'Saving…' : saved ? '✓ Saved' : 'Save score'}</button></div>
          </form>}
          <div className="nf-rank-list">
            {leaderboard.slice(0, 30).map((item, index) => <div className="nf-rank-row" key={(item.timestamp || item.date || 'score') + '-' + index}><b>#{index + 1}</b><span>{item.pilot || 'Player'}<small>LEVEL {item.level || 1}</small></span><strong>{Number(item.score || 0).toLocaleString()}</strong></div>)}
            {!leaderboard.length && <div className="nf-empty">No scores yet. Be the first on the board!</div>}
          </div>
          <div className="nf-modal-actions">
            {gameOver && <button type="button" className="nf-secondary" onClick={closeScorecard}>Exit</button>}
            {showLeaderboard && <button type="button" className="nf-secondary" onClick={() => setShowLeaderboard(false)}>Close</button>}
            {gameOver && <button type="button" className="nf-primary" onClick={startGame}><RotateCcw size={15}/> Play again</button>}
          </div>
        </section>
      </div>}
    </main>
  )
}
