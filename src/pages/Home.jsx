import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUpRight, Pencil, Grid2X2, Activity, FileText, Cloud, Images, MapPinned, Users, Calculator, Truck, ChevronRight } from 'lucide-react'
import { modules } from '../data/modules'
import { getApmlPresenceServices } from '../lib/firebase'

const homeTools = [
  { id:'editor', title:'Quotation Drafting Studio', description:'Create official quotations with freight formulas, GST calculations and A4 PDF preview.', label:'Documentation', tags:['A4 PDF Export','Freight Matrix','GST Calculation'], image:'https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/color/pencil-dynamic-color.png', wide:true },
  { id:'drive', title:'APML Cloud Drive', description:'Organise assets into folders and manage documents, media and web files.', label:'Storage Hub', tags:['Direct Links','Folder Tree','Downloads'], image:'https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/color/folder-dynamic-color.png', wide:true },
  { id:'gallery', title:'Packing Standards Gallery', description:'Visual packaging standards and operational video references.', label:'Media Assets', tags:['Fleet Logistics','Cloud Sync'], image:'https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/color/picture-dynamic-color.png' },
  { id:'directory', title:'Hub & Branch Directory', description:'Find nationwide warehouse hubs, branch details and contacts.', label:'Directory', tags:['Pan-India Hubs','Map Pins'], image:'https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/color/location-dynamic-color.png' },
  { id:'field-officer', title:'Field Officer Directory WCRO', description:'Browse field officers and regional coverage with direct contact details.', label:'Directory', tags:['WCRO Region','WhatsApp'], image:'https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/color/boy-dynamic-color.png' },
  { id:'apml-lite', title:'APML Lite Rate Calculator', description:'Quick CFT volume calculations with floor constraints.', label:'Volume Pricing', tags:['450 CFT Limit','Base Floor'], image:'https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/color/calculator-dynamic-color.png' },
  { id:'car-rate', title:'Car Rate Calculator', description:'Vehicle transport rate estimation with distance-based formulas.', label:'Vehicle Freight', tags:['Model Detection','600 KM Base'], image:'https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/color/map-pin-dynamic-color.png' },
  { id:'local-rate', title:'APML Local Rate', description:'Intra-city relocation rate calculations with SOP budget rates.', label:'Local Shifting', tags:['Intra-City','SOP Guidelines'], image:'https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/color/bag-dynamic-color.png' }
]
const directions=['up-left','up','up-right','left','center','right','down-left','down','down-right']
const gaze=['right','down-right','down','down-left','left','up-left','up','up-right']
const reactions=['heart','sparkle','delighted','dizzy']
const spritePos=(index)=>`${(index%3)*50}% ${Math.floor(index/3)*50}%`

function HeroMascot({name,editingName,nameDraft,setNameDraft,onEditName,onSaveName,onCancelEdit}){
 const [direction,setDirection]=useState('center')
 const [reaction,setReaction]=useState('')
 const [bubble,setBubble]=useState(false)
 const timer=useRef()
 const reactionTimer=useRef()
 const button=useRef()
 useEffect(()=>{
  if(!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return
  const move=e=>{
   const rect=button.current?.getBoundingClientRect(); if(!rect)return
   const dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2)
   if(Math.hypot(dx,dy)<70){setDirection('center');return}
   const angle=Math.atan2(dy,dx),sector=Math.round(angle/(Math.PI*2/8))
   setDirection(gaze[(sector+8)%8])
  }
  window.addEventListener('pointermove',move,{passive:true})
  return()=>window.removeEventListener('pointermove',move)
 },[])
 const greeting=(()=>{
  const hour=new Date().getHours()
  if(hour>=5&&hour<12)return 'Good morning'
  if(hour>=12&&hour<17)return 'Good afternoon'
  if(hour>=17&&hour<21)return 'Good evening'
  return 'Good night'
 })()
 const boop=()=>{
  const next=reactions[Math.floor(Math.random()*3)]
  setReaction(next);setBubble(true)
  clearTimeout(timer.current);clearTimeout(reactionTimer.current)
  reactionTimer.current=setTimeout(()=>setReaction(''),850)
  timer.current=setTimeout(()=>{if(!editingName)setBubble(false)},10000)
 }
 useEffect(()=>{
  setBubble(true)
  timer.current=setTimeout(()=>{if(!editingName)setBubble(false)},10000)
 },[])
 useEffect(()=>{if(editingName){clearTimeout(timer.current);setBubble(true)}},[editingName])
 useEffect(()=>()=>{clearTimeout(timer.current);clearTimeout(reactionTimer.current)},[])
 return <div className="apml-mascot-stage">
  <div className="apml-mascot-halo"/>
  <button ref={button} className="apml-hero-mascot" onClick={boop} aria-label="Interact with Wobnimo">
   <span className="apml-mascot-squash">
    <span className="apml-mascot-sprite directions" style={{backgroundPosition:spritePos(directions.indexOf(direction)),opacity:reaction?0:1}}/>
    <span className="apml-mascot-sprite reactions" style={{backgroundPosition:spritePos(reactions.indexOf(reaction)),opacity:reaction?1:0}}/>
   </span>
  </button>
  {bubble&&<div className="apml-hero-mascot-bubble apml-welcome-bubble">
   <span className="apml-welcome-hey">{greeting}! 👋</span>
   {editingName?<form className="apml-mascot-name-form" onSubmit={onSaveName}>
    <label className="sr-only" htmlFor="apml-mascot-name">Your name</label>
    <input id="apml-mascot-name" autoFocus maxLength={32} value={nameDraft} onChange={event=>setNameDraft(event.target.value)} placeholder="Enter your name"/>
    <button type="submit">Save</button>
    <button type="button" className="apml-mascot-name-cancel" onClick={onCancelEdit}>Cancel</button>
   </form>:<div className="apml-welcome-bubble-line">
    <span>Welcome back, </span>
    {name?<button type="button" className="apml-welcome-name" onClick={onEditName}>{name}</button>:<strong>there</strong>}
    {!name&&<button type="button" className="apml-welcome-pencil" onClick={onEditName} aria-label="Add your name" title="Add your name"><Pencil size={12}/></button>}
   </div>}
  </div>}
 </div>
}
function OperationalTelemetry(){
 const [counts,setCounts]=useState({users:0,pdf:0,media:0})
 const [hasBeenViewed,setHasBeenViewed]=useState(false)
 const [countUpReady,setCountUpReady]=useState(false)
 const sectionRef=useRef(null)
 const countRefs=useRef({})
 const countUps=useRef({})
 const latestCounts=useRef(counts)
 latestCounts.current=counts

 // Match the legacy homepage: load CountUp.js only after 20% of this card is visible.
 useEffect(()=>{
  const element=sectionRef.current
  if(!element||!('IntersectionObserver' in window))return
  const observer=new IntersectionObserver(entries=>{
   if(entries.some(entry=>entry.isIntersecting)){
    setHasBeenViewed(true)
    observer.disconnect()
   }
  },{threshold:0.2})
  observer.observe(element)
  return()=>observer.disconnect()
 },[])

 useEffect(()=>{
  if(!hasBeenViewed)return
  let cancelled=false
  const existing=window.countUp?.CountUp
  if(existing){setCountUpReady(true);return}
  const script=document.createElement('script')
  script.src='https://cdnjs.cloudflare.com/ajax/libs/countup.js/2.8.0/countUp.umd.js'
  script.async=true
  script.onload=()=>{if(!cancelled&&window.countUp?.CountUp)setCountUpReady(true)}
  script.onerror=()=>console.warn('APML CountUp animation library could not load; showing live values without animation.')
  document.head.appendChild(script)
  return()=>{cancelled=true}
 },[hasBeenViewed])

 useEffect(()=>{
  if(!hasBeenViewed)return
  const values=[['users',counts.users],['pdf',counts.pdf],['media',counts.media]]
  values.forEach(([key,value])=>{
   const element=countRefs.current[key]
   if(!element)return
   const formatted=Number(value||0).toLocaleString('en-IN')
   const CountUp=window.countUp?.CountUp
   if(countUpReady&&CountUp){
    if(!countUps.current[key]){
     const counter=new CountUp(element,Number(value)||0,{duration:1.2,useGrouping:true,separator:',',decimal:'.'})
     if(counter.error){element.textContent=formatted;return}
     countUps.current[key]=counter
     counter.start()
    }else{
     countUps.current[key].update(Number(value)||0)
    }
   }else{
    element.textContent=formatted
   }
  })
 },[counts,hasBeenViewed,countUpReady])

 useEffect(()=>{
  let active=true,db=null,refs=[]
  const start=async()=>{
   try{
    const services=await getApmlPresenceServices();db=services.database
    if(!active)return
    const listen=(path,key,transform=snap=>Number(snap.val())||0)=>{
     const ref=db.ref(path);refs.push(ref)
     ref.on('value',snap=>{if(active)setCounts(prev=>({...prev,[key]:transform(snap)}))},error=>console.warn('APML homepage telemetry:',path,error))
    }
    const presenceRef=db.ref('analytics/active_sessions');refs.push(presenceRef)
    presenceRef.on('value',snap=>{
     const cutoff=Date.now()-90000
     const online=Object.values(snap.val()||{}).filter(session=>session?.online===true&&typeof session.timestamp==='number'&&Number.isFinite(session.timestamp)&&session.timestamp>=cutoff).length
     if(active)setCounts(prev=>({...prev,users:online}))
    },error=>console.warn('APML live presence count unavailable',error))
    let dailyPdfTotal=0,lifetimePdfTotal=0
    const publishPdfTotal=()=>{if(active)setCounts(prev=>({...prev,pdf:Math.max(dailyPdfTotal,lifetimePdfTotal)}))}
    const dailyRef=db.ref('analytics/pdf_generation/daily');refs.push(dailyRef)
    dailyRef.on('value',snap=>{dailyPdfTotal=Object.values(snap.val()||{}).reduce((total,value)=>total+(Number(value)||0),0);publishPdfTotal()},error=>console.warn('APML daily PDF telemetry unavailable',error))
    const lifetimeRef=db.ref('analytics/pdf_generation/lifetime');refs.push(lifetimeRef)
    lifetimeRef.on('value',snap=>{lifetimePdfTotal=Number(snap.val())||0;publishPdfTotal()},error=>console.warn('APML lifetime PDF telemetry unavailable',error))
    listen('analytics/media_downloads/lifetime','media')
   }catch(error){console.warn('APML homepage telemetry could not connect',error)}
  }
  start()
  return()=>{active=false;refs.forEach(ref=>ref.off?.('value')??ref.off?.())}
 },[])

 return <Link to="/analytics" className="legacy-telemetry-link" aria-label="Open detailed portal analytics">
  <section className="legacy-telemetry" ref={sectionRef}>
   <div>
    <div className="legacy-telemetry-head"><div><h2><Activity size={21}/> Portal activity <ArrowUpRight size={17} className="legacy-telemetry-open"/></h2><p>A live snapshot of usage across APML Portal tools and services.</p></div><span><i/> All operational systems monitored</span></div>
    <div className="legacy-telemetry-stats">
     <div><small>Live Active Sessions</small><strong ref={element=>{countRefs.current.users=element}}>0</strong><em>Total people online</em></div>
     <div><small>PDF Generated</small><strong ref={element=>{countRefs.current.pdf=element}}>0</strong><em>Quotation documents created</em></div>
     <div><small>Media Downloads</small><strong ref={element=>{countRefs.current.media=element}}>0</strong><em>Downloads from Drive and Gallery</em></div>
    </div>
   </div>
  </section>
 </Link>
}
export default function Home(){
 const [query,setQuery]=useState('')
 const [hubReady,setHubReady]=useState(false)
 const [welcomeName,setWelcomeName]=useState(()=>{try{return localStorage.getItem('apml-welcome-name')||''}catch(_){return ''}})
 const [nameDraft,setNameDraft]=useState(()=>{try{return localStorage.getItem('apml-welcome-name')||''}catch(_){return ''}})
 const [editingName,setEditingName]=useState(false)
 const saveWelcomeName=event=>{
  event?.preventDefault()
  const clean=nameDraft.trim().replace(/\s+/g,' ').slice(0,32)
  setWelcomeName(clean)
  setNameDraft(clean)
  try{if(clean)localStorage.setItem('apml-welcome-name',clean);else localStorage.removeItem('apml-welcome-name')}catch(_){}
  setEditingName(false)
 }
 const revealRoot=useRef(null)
 useEffect(()=>{const timer=window.setTimeout(()=>setHubReady(true),420);return()=>window.clearTimeout(timer)},[])
 useEffect(()=>{
  const root=revealRoot.current
  if(!root)return
  const nodes=root.querySelectorAll('.apml-reveal')
  if(!('IntersectionObserver' in window)){nodes.forEach(node=>node.classList.add('is-visible'));return}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}),{threshold:0.12,rootMargin:'0px 0px -36px 0px'})
  nodes.forEach(node=>observer.observe(node))
  return()=>observer.disconnect()
 },[hubReady])
 const filtered=useMemo(()=>homeTools.filter(t=>(t.title+' '+t.description+' '+t.tags.join(' ')).toLowerCase().includes(query.toLowerCase())),[query])
 const activeCount=homeTools.filter(t=>modules.some(m=>m.id===t.id)).length
 return <div ref={revealRoot} className={"home-page legacy-home "+(hubReady?"hub-ready":"hub-loading")}>
  <section className="legacy-hero apml-reveal is-visible" aria-labelledby="homeHeroTitle">
   <HeroMascot name={welcomeName} editingName={editingName} nameDraft={nameDraft} setNameDraft={setNameDraft}
    onEditName={()=>{setNameDraft(welcomeName);setEditingName(true)}}
    onSaveName={saveWelcomeName}
    onCancelEdit={()=>{setNameDraft(welcomeName);setEditingName(false)}}/>
   <p className="legacy-eyebrow"><i/> APML PORTAL</p>
   <h1 id="homeHeroTitle">The workday,<br/><span>made simpler.</span></h1>
   <p className="legacy-hero-description">A connected workspace for the tools, information and everyday operations your team relies on.</p>
   <a className="legacy-hero-action" href="#workspace">Explore workspace <ArrowDown size={18}/></a>
   <p className="legacy-hero-note">One portal for all solutions.</p>
  </section>
  <section className="home-storyset-band apml-reveal" aria-label="APML Portal workspace illustration">
   <div className="home-storyset-copy">
    <span className="home-storyset-kicker">ONE CONNECTED WORKSPACE</span>
    <h2>Find what you need.<br/><span>Keep work moving.</span></h2>
    <p>Tools, documents and operational information — together in one place.</p>
   </div>
   <div className="home-storyset-art">
    <img src="https://stories.freepiklabs.com/storage/35385/Web-search-01.svg" alt="Illustration of a person exploring information online" loading="lazy"/>
    <a href="https://storyset.com/online" target="_blank" rel="noopener noreferrer">Online illustrations by Storyset</a>
   </div>
  </section>
  <section className="legacy-workspace apml-reveal" id="workspace">
   <div className="legacy-section-bar"><div><h2><Grid2X2 size={21}/> Operational workspace</h2><p>Everything you need to keep daily operations moving.</p></div><span>{activeCount} Active Tools</span></div>
   {!hubReady?<div className="apml-skeleton-grid" role="status" aria-label="Loading workspace tools">{[0,1,2,3,4,5].map(item=><div className="apml-skeleton-card" key={item}><span className="apml-skeleton-icon"/><span className="apml-skeleton-line long"/><span className="apml-skeleton-line"/><span className="apml-skeleton-line short"/></div>)}</div>:<div className="legacy-tool-grid">{filtered.map((tool,i)=><Link key={tool.id} to={modules.find(m=>m.id===tool.id)?.path||'/'} className={"legacy-tool-card apml-reveal bento-"+tool.id+(tool.wide?" wide":"")} style={{'--tool-delay':`${i*45}ms`}}>
    <div><div className="legacy-card-head"><img src={tool.image} alt="" loading="lazy"/><span>{tool.label}</span></div><h3>{tool.title}</h3><p>{tool.description}</p><div className="legacy-tags">{tool.tags.map(tag=><small key={tag}>{tag}</small>)}</div></div>
    <div className="legacy-card-footer"><span>✦ Interactive Tool</span><b>Launch <ArrowUpRight size={18}/></b></div>
   </Link>)}</div>}
   {hubReady&&filtered.length===0&&<p className="legacy-empty">No tools match your search.</p>}
  </section>
  <div className="apml-reveal"><OperationalTelemetry/></div>
 </div>
}

