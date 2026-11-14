import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowDown, ArrowUpRight, Grid2X2, Activity, FileText, Cloud, Images, MapPinned, Users, Calculator, Truck, ChevronRight } from 'lucide-react'
import { modules } from '../data/modules'

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
function FloatingMascot(){
 const [visible,setVisible]=useState(false)
 const [tip,setTip]=useState(false)
 const [direction,setDirection]=useState('center')
 const [reaction,setReaction]=useState('')
 const [tipIndex,setTipIndex]=useState(0)
 const timer=useRef(null)
 const tips=['Welcome to APML Portal! Select any module below to get started. 🚀','Use the navigation menu above to quickly move around the portal.','Need a quotation? Open the Quotation Editor to create an A4 PDF.','I’m here if you need a quick pointer around the workspace.']
 const directionNames=['up-left','up','up-right','left','center','right','down-left','down','down-right']
 const reactionNames=['blink','heart','sparkle','surprised','starry','blush','sleepy','dizzy','delighted']
 const position=(name,names)=>{const i=names.indexOf(name);return `${(i%3)*50}% ${Math.floor(i/3)*50}%`}
 useEffect(()=>{
  const update=()=>{
   const footer=document.querySelector('.portal-site-footer')
   const footerNear=footer&&footer.getBoundingClientRect().top<window.innerHeight+80
   setVisible(window.innerWidth>768&&window.scrollY>180&&!footerNear)
  }
  update()
  window.addEventListener('scroll',update,{passive:true})
  window.addEventListener('resize',update)
  return()=>{window.removeEventListener('scroll',update);window.removeEventListener('resize',update)}
 },[])
 useEffect(()=>{
  if(!visible||!window.matchMedia('(hover:hover) and (pointer:fine)').matches)return
  const aim=e=>{
   const el=document.querySelector('.apml-floating-mascot button')
   const rect=el?.getBoundingClientRect();if(!rect)return
   const dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2)
   if(Math.hypot(dx,dy)<65){setDirection('center');return}
   const sector=Math.round(Math.atan2(dy,dx)/(Math.PI*2/8))
   const clockwise=['right','down-right','down','down-left','left','up-left','up','up-right']
   setDirection(clockwise[(sector+8)%8])
  }
  window.addEventListener('pointermove',aim,{passive:true})
  return()=>window.removeEventListener('pointermove',aim)
 },[visible])
 useEffect(()=>()=>clearTimeout(timer.current),[])
 const interact=()=>{
  clearTimeout(timer.current)
  setTipIndex(i=>(i+1)%tips.length)
  setTip(true)
  setReaction(current=>{const next=reactionNames[(reactionNames.indexOf(current)+1)%reactionNames.length];return next})
  timer.current=setTimeout(()=>setReaction(''),650)
 }
 if(!visible)return null
 return <div className="apml-floating-mascot">
  {tip&&<div className="apml-floating-tip" role="status">{tips[tipIndex]}<button type="button" className="apml-floating-tip-close" aria-label="Close tip" onClick={()=>setTip(false)}>×</button></div>}
  <button type="button" aria-label="Interact with Wobnimo assistant" onClick={interact}>
   <span className="apml-floating-face" style={{backgroundPosition:position(direction,directionNames),opacity:reaction?0:1}}/>
   <span className="apml-floating-face apml-floating-reaction" style={{backgroundPosition:position(reaction,reactionNames),opacity:reaction?1:0}}/>
  </button>
 </div>
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
   <div className="legacy-section-bar"><div><h2><Grid2X2 size={21}/> Your workspace</h2><p>Everything you need to keep daily operations moving.</p></div><span>{activeCount} Active Tools</span></div>
   <div className="legacy-tool-grid">{filtered.map((tool,i)=><Link key={tool.id} to={modules.find(m=>m.id===tool.id)?.path||'/'} className={`legacy-tool-card ${tool.wide?'wide':''}`} style={{'--tool-delay':`${i*45}ms`}}>
    <div><div className="legacy-card-head"><img src={tool.image} alt="" loading="lazy"/><span>{tool.label}</span></div><h3>{tool.title}</h3><p>{tool.description}</p><div className="legacy-tags">{tool.tags.map(tag=><small key={tag}>{tag}</small>)}</div></div>
    <div className="legacy-card-footer"><span>✦ Interactive Tool</span><b>Launch <ArrowUpRight size={18}/></b></div>
   </Link>)}</div>
   {filtered.length===0&&<p className="legacy-empty">No tools match your search.</p>}
  </section>
  <section className="legacy-telemetry"><Link to="/analytics"><div className="legacy-telemetry-head"><div><h2><Activity size={21}/> Operational telemetry &amp; impact</h2><p>Live enterprise statistics across regional offices and nationwide hubs.</p></div><span><i/> All systems monitored</span></div><div className="legacy-telemetry-stats"><div><small>Live Active Personnel</small><strong>—</strong><em>Concurrent field officers &amp; HODs</em></div><div><small>PDF Quotations Drafted</small><strong>—</strong><em>Exact Container &amp; Maxcare</em></div><div><small>Cloud Files &amp; Media Downloads</small><strong>—</strong><em>Drive &amp; gallery archives</em></div></div></Link></section>
  <FloatingMascot/>
 </div>
}
