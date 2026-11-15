import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Home, Play, RotateCcw, Trophy, Zap } from 'lucide-react'
import './NotFound.css'

export default function NotFound(){
 const canvasRef=useRef(null)
 const [running,setRunning]=useState(false)
 const [score,setScore]=useState(0)
 const [lives,setLives]=useState(5)
 const [highScore,setHighScore]=useState(()=>Number(localStorage.getItem('apml-arcade-high-score')||0))
 const [showScores,setShowScores]=useState(false)
 const [finished,setFinished]=useState(false)

 useEffect(()=>{
  if(!running)return
  const canvas=canvasRef.current
  const ctx=canvas?.getContext('2d')
  if(!canvas||!ctx)return
  const state={w:0,h:0,player:{x:0,y:0},bullets:[],rocks:[],stars:[],score:0,lives:5,last:0,spawn:0,fire:0,keys:new Set()}
  let raf=0
  const resize=()=>{
   const rect=canvas.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2)
   state.w=rect.width;state.h=rect.height
   canvas.width=Math.round(rect.width*dpr);canvas.height=Math.round(rect.height*dpr)
   ctx.setTransform(dpr,0,0,dpr,0,0)
   state.player.x=state.player.x||rect.width/2;state.player.y=rect.height-72
   if(!state.stars.length)state.stars=Array.from({length:70},()=>({x:Math.random()*rect.width,y:Math.random()*rect.height,s:Math.random()*1.7+.3,v:Math.random()*.55+.15}))
  }
  resize()
  const move=e=>{const r=canvas.getBoundingClientRect();state.player.x=Math.max(18,Math.min(state.w-18,e.clientX-r.left));state.player.y=Math.max(60,Math.min(state.h-25,e.clientY-r.top))}
  const fire=()=>{const now=performance.now();if(now-state.fire<180)return;state.fire=now;state.bullets.push({x:state.player.x,y:state.player.y-18,v:8})}
  const down=e=>{move(e);fire()}
  const keydown=e=>{if(e.code==='Space'){e.preventDefault();fire()}state.keys.add(e.code)}
  const keyup=e=>state.keys.delete(e.code)
  canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerdown',down)
  window.addEventListener('keydown',keydown);window.addEventListener('keyup',keyup)
  const draw=(now)=>{
   const dt=Math.min((now-state.last)/16.67||1,2);state.last=now
   ctx.clearRect(0,0,state.w,state.h)
   const bg=ctx.createRadialGradient(state.w*.5,state.h*.2,10,state.w*.5,state.h*.2,state.w*.8)
   bg.addColorStop(0,'rgba(185,28,28,.12)');bg.addColorStop(1,'rgba(7,13,27,0)')
   ctx.fillStyle='#090e1b';ctx.fillRect(0,0,state.w,state.h);ctx.fillStyle=bg;ctx.fillRect(0,0,state.w,state.h)
   for(const star of state.stars){star.y+=star.v*dt;if(star.y>state.h)star.y=0;ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillRect(star.x,star.y,star.s,star.s)}
   if(state.keys.has('ArrowLeft')||state.keys.has('KeyA'))state.player.x-=5*dt
   if(state.keys.has('ArrowRight')||state.keys.has('KeyD'))state.player.x+=5*dt
   if(state.keys.has('ArrowUp')||state.keys.has('KeyW'))state.player.y-=5*dt
   if(state.keys.has('ArrowDown')||state.keys.has('KeyS'))state.player.y+=5*dt
   state.player.x=Math.max(18,Math.min(state.w-18,state.player.x));state.player.y=Math.max(58,Math.min(state.h-25,state.player.y))
   if(state.keys.has('Space'))fire()
   state.spawn+=dt
   if(state.spawn>Math.max(18,52-state.score*.12)){state.spawn=0;const r=12+Math.random()*17;state.rocks.push({x:30+Math.random()*(state.w-60),y:-r,r,v:1.4+Math.random()*1.3+state.score*.012,a:Math.random()*6})}
   state.bullets=state.bullets.filter(b=>b.y>-15)
   state.bullets.forEach(b=>{b.y-=b.v*dt;ctx.fillStyle='#fbbf24';ctx.shadowColor='#f97316';ctx.shadowBlur=12;ctx.fillRect(b.x-2,b.y-8,4,13);ctx.shadowBlur=0})
   for(let i=state.rocks.length-1;i>=0;i--){const r=state.rocks[i];r.y+=r.v*dt;r.a+=.012*dt
    ctx.save();ctx.translate(r.x,r.y);ctx.rotate(r.a);ctx.beginPath()
    for(let p=0;p<9;p++){const angle=p*Math.PI*2/9,rad=r.r*(.78+((p*7)%4)*.07);const x=Math.cos(angle)*rad,y=Math.sin(angle)*rad;p?ctx.lineTo(x,y):ctx.moveTo(x,y)}
    ctx.closePath();ctx.fillStyle='#64748b';ctx.strokeStyle='#cbd5e1';ctx.lineWidth=1.5;ctx.fill();ctx.stroke();ctx.restore()
    if(Math.hypot(r.x-state.player.x,r.y-state.player.y)<r.r+13){state.rocks.splice(i,1);state.lives--;setLives(state.lives);if(state.lives<=0){setRunning(false);setFinished(true);return}}
    else if(r.y>state.h+20){state.rocks.splice(i,1);continue}
    for(let j=state.bullets.length-1;j>=0;j--){const b=state.bullets[j];if(Math.hypot(r.x-b.x,r.y-b.y)<r.r+5){state.rocks.splice(i,1);state.bullets.splice(j,1);state.score+=10;setScore(state.score);if(state.score>Number(localStorage.getItem('apml-arcade-high-score')||0)){localStorage.setItem('apml-arcade-high-score',String(state.score));setHighScore(state.score)}break}}
   }
   ctx.save();ctx.translate(state.player.x,state.player.y)
   ctx.beginPath();ctx.moveTo(0,-19);ctx.lineTo(15,15);ctx.lineTo(0,9);ctx.lineTo(-15,15);ctx.closePath();ctx.fillStyle='#ef4444';ctx.shadowColor='#ef4444';ctx.shadowBlur=16;ctx.fill();ctx.shadowBlur=0
   ctx.beginPath();ctx.arc(0,-3,4,0,Math.PI*2);ctx.fillStyle='#e0f2fe';ctx.fill()
   ctx.beginPath();ctx.moveTo(-5,13);ctx.lineTo(0,24+Math.random()*5);ctx.lineTo(5,13);ctx.fillStyle='#fb923c';ctx.fill();ctx.restore()
   raf=requestAnimationFrame(draw)
  }
  raf=requestAnimationFrame(draw)
  return()=>{cancelAnimationFrame(raf);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerdown',down);window.removeEventListener('keydown',keydown);window.removeEventListener('keyup',keyup)}
 },[running])

 const start=()=>{setScore(0);setLives(5);setFinished(false);setShowScores(false);setRunning(true)}
 return <div className="not-found-page">
  <div className="nf-ambient" aria-hidden="true"/><div className="nf-grid" aria-hidden="true"/>
  <section className="nf-stage">
   <div className="nf-orbit" aria-hidden="true"><div className="nf-planet"><span>✦</span></div><i className="nf-orbit-ring"/></div>
   <div className="nf-content">
    <div className="nf-kicker"><span className="nf-live-dot"/> SIGNAL LOST · APML PORTAL</div>
    <h1 className="nf-code">404</h1>
    <h2>{running?'Asteroid defence mission':'This destination is off the map'}</h2>
    <p>{running?'Move your pointer or finger to pilot. Tap or press Space to fire. Protect the planet for as long as you can.':'The page you’re looking for doesn’t exist or may have moved. Head back to the portal, or launch the optional asteroid-defence mission.'}</p>
    {running?<div className="nf-game-wrap">
      <div className="nf-scoreboard"><span>Score <b>{score}</b></span><span>High <b>{highScore}</b></span><span>Lives <b>{lives}</b></span><button onClick={()=>{setRunning(false);setFinished(true)}}>Close game</button></div>
      <canvas ref={canvasRef} className="nf-game-canvas" aria-label="Asteroid defence game. Move pointer to steer and tap to shoot."/>
      <div className="nf-game-hint">MOVE TO STEER · TAP / SPACE TO FIRE</div>
     </div>:showScores?<div className="nf-score-card"><Trophy size={22}/><strong>Arcade record</strong><span>{highScore} points</span><button onClick={()=>setShowScores(false)}>Back</button></div>:finished?<div className="nf-score-card"><Trophy size={22}/><strong>Mission ended</strong><span>Your score: {score} · Best: {highScore}</span><button onClick={start}><RotateCcw size={15}/> Play again</button></div>:<div className="nf-hints"><span><b>Move</b> Pointer or finger</span><span><b>Fire</b> Tap or click</span><span><b>Goal</b> Protect the planet</span></div>}
    {!running&&!showScores&&<div className="nf-actions">
      <button className="nf-primary" onClick={start}><Play size={16} fill="currentColor"/> Launch Mini Game</button>
      <button className="nf-secondary" onClick={()=>setShowScores(true)}><Trophy size={16}/> Check Scores</button>
      <Link className="nf-secondary" to="/"><Home size={16}/> Home Hub</Link>
      <button className="nf-secondary" onClick={()=>window.history.back()}><ArrowLeft size={16}/> Return</button>
     </div>}
    <div className="nf-footnote"><Zap size={13}/> A little detour from the APML mission.</div>
   </div>
  </section>
 </div>
}
