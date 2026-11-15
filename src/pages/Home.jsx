import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUpRight, Grid2X2, Activity, FileText, Cloud, Images, MapPinned, Users, Calculator, Truck, ChevronRight } from 'lucide-react'
import { modules } from '../data/modules'
import { getApmlDatabase } from '../lib/firebase'

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

function HeroMascot(){
 const [direction,setDirection]=useState('center')
 const [reaction,setReaction]=useState('')
 const [bubble,setBubble]=useState(false)
 const timer=useRef()
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
 const boop=()=>{const next=reactions[Math.floor(Math.random()*3)];setReaction(next);setBubble(true);clearTimeout(timer.current);timer.current=setTimeout(()=>{setReaction('');setBubble(false)},850)}
 useEffect(()=>()=>clearTimeout(timer.current),[])
 return <div className="apml-mascot-stage"><div className="apml-mascot-halo"/><button ref={button} className="apml-hero-mascot" onClick={boop} aria-label="Interact with Wobnimo"><span className="apml-mascot-squash"><span className="apml-mascot-sprite directions" style={{backgroundPosition:spritePos(directions.indexOf(direction)),opacity:reaction?0:1}}/><span className="apml-mascot-sprite reactions" style={{backgroundPosition:spritePos(reactions.indexOf(reaction)),opacity:reaction?1:0}}/></span></button>{bubble&&<span className="apml-hero-mascot-bubble">Hey there! 👋</span>}</div>
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
    db=await getApmlDatabase()
    if(!active)return
    const listen=(path,key,transform=snap=>Number(snap.val())||0)=>{
     const ref=db.ref(path);refs.push(ref)
     ref.on('value',snap=>{if(active)setCounts(prev=>({...prev,[key]:transform(snap)}))},error=>console.warn('APML homepage telemetry:',path,error))
    }
    listen('presence','users',snap=>snap.numChildren()||1)
    listen('analytics/totalPdfDownloads','pdf')
    listen('analytics/totalMediaDownloads','media')
    const startPresence=()=>{
     try{
      if(!window.apmlHasAnalyticsConsent?.())return
      let id
      try{id=sessionStorage.getItem('apml_presence_session')}catch(_){}
      if(!id){id='user_'+Math.random().toString(36).slice(2,9);try{sessionStorage.setItem('apml_presence_session',id)}catch(_){}}
      const own=db.ref('presence/'+id)
      db.ref('.info/connected').on('value',snap=>{
       if(snap.val()===true){own.onDisconnect().remove();own.set({online:true,timestamp:Date.now()})}
      })
     }catch(error){console.warn('APML presence unavailable',error)}
    }
    startPresence()
    window.addEventListener('apml-analytics-consent-granted',startPresence)
    refs.push({off:()=>window.removeEventListener('apml-analytics-consent-granted',startPresence)})
   }catch(error){console.warn('APML homepage telemetry could not connect',error)}
  }
  start()
  return()=>{active=false;refs.forEach(ref=>ref.off?.('value')??ref.off?.())}
 },[])

 return <section className="legacy-telemetry" ref={sectionRef}>
  <Link to="/analytics">
   <div className="legacy-telemetry-head"><div><h2><Activity size={21}/> Operational telemetry &amp; impact</h2><p>Live enterprise statistics across Western Central Regional Office &amp; nationwide hubs.</p></div><span><i/> All operational systems monitored</span></div>
   <div className="legacy-telemetry-stats">
    <div><small>Live Active Personnel</small><strong ref={element=>{countRefs.current.users=element}}>0</strong><em>Concurrent field officers &amp; HODs · Online</em></div>
    <div><small>PDF Quotations Drafted</small><strong ref={element=>{countRefs.current.pdf=element}}>0</strong><em>Exact Container &amp; Maxcare</em></div>
    <div><small>Cloud Files &amp; Media Downloads</small><strong ref={element=>{countRefs.current.media=element}}>0</strong><em>Drive &amp; gallery archives</em></div>
   </div>
  </Link>
 </section>
}
export default function Home(){
 const [query,setQuery]=useState('')
 const filtered=useMemo(()=>homeTools.filter(t=>(t.title+' '+t.description+' '+t.tags.join(' ')).toLowerCase().includes(query.toLowerCase())),[query])
 const activeCount=homeTools.filter(t=>modules.some(m=>m.id===t.id)).length
 return <div className="home-page legacy-home">
  <section className="legacy-hero" aria-labelledby="homeHeroTitle">
   <HeroMascot/>
   <p className="legacy-eyebrow"><i/> APML PORTAL</p>
   <h1 id="homeHeroTitle">The workday,<br/><span>made simpler.</span></h1>
   <p className="legacy-hero-description">A connected workspace for the tools, information and everyday operations your team relies on.</p>
   <a className="legacy-hero-action" href="#workspace">Explore workspace <ArrowDown size={18}/></a>
   <p className="legacy-hero-note">One portal for all solutions.</p>
  </section>
  <section className="legacy-workspace" id="workspace">
   <div className="legacy-section-bar"><div><h2><Grid2X2 size={21}/> Operational workspace</h2><p>Everything you need to keep daily operations moving.</p></div><span>{activeCount} Active Tools</span></div>
   <div className="legacy-tool-grid">{filtered.map((tool,i)=><Link key={tool.id} to={modules.find(m=>m.id===tool.id)?.path||'/'} className={`legacy-tool-card ${tool.wide?'wide':''}`} style={{'--tool-delay':`${i*45}ms`}}>
    <div><div className="legacy-card-head"><img src={tool.image} alt="" loading="lazy"/><span>{tool.label}</span></div><h3>{tool.title}</h3><p>{tool.description}</p><div className="legacy-tags">{tool.tags.map(tag=><small key={tag}>{tag}</small>)}</div></div>
    <div className="legacy-card-footer"><span>✦ Interactive Tool</span><b>Launch <ArrowUpRight size={18}/></b></div>
   </Link>)}</div>
   {filtered.length===0&&<p className="legacy-empty">No tools match your search.</p>}
  </section>
  <OperationalTelemetry/>
 </div>
}
