import {useEffect,useRef,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {ArrowUpRight,Code2,Heart,BriefcaseBusiness,Globe,Layers,Cloud,Shield,FolderTree,Workflow,Rocket,ExternalLink,Smartphone} from 'lucide-react'
import './InfoPage.css'

const sponsorUrl='https://kundarwork-debug.github.io/sponsor/support.html'
const lottieUrl='https://lottie.host/81e9bbae-7cd3-41aa-b736-624121d9a09e/uBNKC93rkX.json'

export default function InfoPage(){
 const [support,setSupport]=useState(false),[seconds,setSeconds]=useState(5)
 const clickCount=useRef(0),clickTimer=useRef(null)
 const navigate=useNavigate()
 useEffect(()=>{
  if(document.querySelector('script[data-apml-lottie]'))return
  const script=document.createElement('script')
  script.src='https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js'
  script.async=true
  script.dataset.apmlLottie='true'
  document.head.appendChild(script)
 },[])
 useEffect(()=>{
  if(!support)return
  setSeconds(5)
  const end=Date.now()+5000
  const timer=setInterval(()=>setSeconds(Math.max(0,Math.ceil((end-Date.now())/1000))),200)
  const redirect=setTimeout(()=>{window.open(sponsorUrl,'_blank','noopener,noreferrer');setSupport(false)},5000)
  return()=>{clearInterval(timer);clearTimeout(redirect)}
 },[support])
 useEffect(()=>()=>clearTimeout(clickTimer.current),[])
 const onLottieClick=()=>{
  clickCount.current++
  clearTimeout(clickTimer.current)
  if(clickCount.current>=3){clickCount.current=0;navigate('/play');return}
  clickTimer.current=setTimeout(()=>{clickCount.current=0},650)
 }
 const repoGroups=[
  {icon:Globe,title:'React pages',desc:'The screens and tools people use across the portal.',files:['src/pages/','Home.jsx','Editor.jsx','Drive.jsx','Gallery.jsx','Analytics.jsx']},
  {icon:Layers,title:'Shared experience',desc:'Reusable layout, routing, styles and privacy controls.',files:['src/components/','Shell.jsx','PrivacyConsent.jsx','src/styles.css']},
  {icon:Cloud,title:'Service integrations',desc:'API endpoints and connected service workflows.',files:['api/','system-health.js','public/notify.js','Firebase','Cloudinary']},
  {icon:Smartphone,title:'Assets & PWA',desc:'Brand identity and installable web-app configuration.',files:['public/logo.svg','manifest.webmanifest','sw.js','PWA icons']},
  {icon:Workflow,title:'Build & deployment',desc:'Automated React validation and Vercel publishing.',files:['.github/workflows/','vite.config.js','Vercel deployment']},
  {icon:Shield,title:'Policies & support',desc:'Privacy, terms, cookies and issue reporting.',files:['PolicyPage.jsx','BugReport.jsx','PrivacyConsent.jsx']}
 ]
 return <main className="about-shell">
  <div className="about-container">
   <section className="about-hero" aria-labelledby="aboutTitle">
    <div className="hero-copy">
     <span className="eyebrow">A little about me</span>
     <h1 id="aboutTitle">Prasad <span>Kundar.</span></h1>
     <p className="hero-lead">I’m a BDO at APML, and I built this project with a simple goal: make everyday work easier through useful tools, thoughtful automation, and technology that solves real problems.</p>
     <div className="hero-meta">
      <span className="meta-chip"><BriefcaseBusiness size={17}/> BDO · APML</span>
      <span className="meta-chip"><Code2 size={17}/> Builder &amp; problem solver</span>
     </div>
     <div className="hero-actions">
      <a className="about-btn about-btn-primary" href="https://github.com/kundarwork-debug" target="_blank" rel="noopener noreferrer"><Code2 size={16}/> Explore GitHub <ArrowUpRight size={16}/></a>
      <button className="about-btn about-btn-light" type="button" onClick={()=>setSupport(true)}><Heart size={16}/> Support the work</button>
     </div>
    </div>
    <div className="hero-art" aria-label="Animated illustration">
     <div className="art-glow"/><div className="art-orbit"/>
     <div id="lottieClickTrigger" title="A little hidden surprise" onClick={onLottieClick} role="button" tabIndex={0} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onLottieClick()}}}>
      <lottie-player src={lottieUrl} background="transparent" speed="1" loop autoplay/>
     </div>
    </div>
   </section>

   <section aria-labelledby="focusTitle">
    <div className="section-intro">
     <div><div className="section-kicker">What I enjoy building</div><h2 id="focusTitle">Turning ideas into useful tools.</h2></div>
     <p>From small workflow improvements to complete digital experiences, the focus is always on making technology practical and approachable.</p>
    </div>
    <div className="focus-grid">
     <article className="focus-card"><div className="focus-icon"><span className="material-symbols-outlined">smart_toy</span></div><h3>AI &amp; Automation</h3><p>Exploring ways to reduce repetitive work and make everyday processes smarter.</p></article>
     <article className="focus-card"><div className="focus-icon"><span className="material-symbols-outlined">language</span></div><h3>Web Experiences</h3><p>Building clean, responsive websites and tools designed around real user needs.</p></article>
     <article className="focus-card"><div className="focus-icon"><span className="material-symbols-outlined">rocket_launch</span></div><h3>Product Building</h3><p>Taking ideas from a first concept to useful digital products and SaaS-style experiences.</p></article>
    </div>
   </section>

   <section aria-labelledby="repoMapTitle">
    <div className="section-intro">
     <div><div className="section-kicker">Behind the scenes</div><h2 id="repoMapTitle">A look inside the repository.</h2></div>
     <p>How the main parts of APML Portal are grouped and work together—from the pages you use to shared code and supporting services.</p>
    </div>
    <div className="repo-map-shell">
     <div className="repo-map-root">
      <span className="repo-map-root-icon"><span className="material-symbols-outlined">account_tree</span></span>
      <span className="repo-map-root-copy"><strong>APML-Portal</strong><small>APML Portal · React GitHub repository</small></span>
      <a className="repo-map-root-link" href="https://github.com/kundarwork-debug/APML-Portal" target="_blank" rel="noopener noreferrer">View repo ↗</a>
     </div>
     <div className="repo-map-grid">
      {repoGroups.map(g=><article className="repo-map-card" key={g.title}>
       <div className="repo-map-card-head"><span className="repo-map-icon"><g.icon size={19}/></span><h3>{g.title}</h3></div>
       <p>{g.desc}</p><div className="repo-map-files">{g.files.map(f=><code key={f}>{f}</code>)}</div>
      </article>)}
     </div>
     <p className="repo-map-foot">A simplified map of the current React repository—not a live dependency or deployment diagram.</p>
    </div>
   </section>

   <section aria-labelledby="projectsTitle">
    <div className="section-intro">
     <div><div className="section-kicker">More things I've made</div><h2 id="projectsTitle">Other projects to check out.</h2></div>
     <p>A few more ideas and experiences I'm working on beyond APML Portal.</p>
    </div>
    <article className="project-card">
     <div className="project-card-copy">
      <img className="project-logo" src={import.meta.env.BASE_URL+'other/logo.svg'} alt="For You logo" width="56" height="56"/>
      <div><h3>For You</h3><p>A little corner for thoughtful messages, greetings, and moments worth sharing.</p></div>
     </div>
     <a className="about-btn about-btn-primary project-link" href="https://4r-you.vercel.app/" target="_blank" rel="noopener noreferrer"><ExternalLink size={15}/> Visit project</a>
    </article>
   </section>

   <section className="about-bottom" aria-labelledby="connectTitle">
    <div className="about-bottom-copy"><h2 id="connectTitle">Have an idea worth building?</h2><p>Explore my work on GitHub or support the ongoing development of this project. Every bit of encouragement helps keep it moving.</p></div>
    <button className="about-btn" type="button" onClick={()=>setSupport(true)}><Heart size={16}/> Support this project</button>
   </section>
  </div>
  {support&&<div className="redirect-modal-overlay active" role="dialog" aria-modal="true" aria-labelledby="redirectTitle" onClick={e=>{if(e.target===e.currentTarget)setSupport(false)}}>
   <div className="redirect-modal-card">
    <h3 className="redirect-title" id="redirectTitle">Taking you to the support page…</h3>
    <div className="loading-track"><div className="loading-fill" style={{width:((5-seconds)*20)+'%',transition:'width 200ms linear'}}/></div>
    <div className="redirect-countdown">Redirecting in {seconds}s…</div>
    <button type="button" className="btn-skip" onClick={()=>{window.open(sponsorUrl,'_blank','noopener,noreferrer');setSupport(false)}}>Continue now</button>
   </div>
  </div>}
 </main>
}
