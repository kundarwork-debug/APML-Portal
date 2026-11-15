import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import PrivacyConsent from './PrivacyConsent'
import { getApmlDatabase } from '../lib/firebase'
import { Footer } from './ui/footer'
import { Component as HamburgerButton } from './ui/demo'
import { ChevronDown, Home, FileText, Users, Cloud, Images, ChartNoAxesCombined, CircleHelp, Calculator, Truck, Activity, MapPinned, BriefcaseBusiness, LifeBuoy, ExternalLink, Github, Mail, BookOpen, ShieldCheck, Scale, Gamepad2 } from 'lucide-react'

const links = [
 {to:'/',label:'Home',icon:Home},{to:'/editor',label:'Quotation Editor',icon:FileText},
 {to:'/local-rate',label:'Local Rate',icon:Calculator},{to:'/car-rate',label:'Car Rate',icon:Truck},
 {to:'/directory',label:'Branch Directory',icon:MapPinned},{to:'/field-officer',label:'Field Officers',icon:Users},
 {to:'/drive',label:'APML Drive',icon:Cloud},{to:'/gallery',label:'Gallery',icon:Images},
 {to:'/analytics',label:'Analytics',icon:ChartNoAxesCombined},{to:'/system-health',label:'System Health',icon:Activity},
 {to:'/apml-lite',label:'APML Lite',icon:BriefcaseBusiness},{to:'/about',label:'About',icon:CircleHelp}
]
function FloatingMascot({pagePath}){
 const [visible,setVisible]=useState(false)
 const [bubbleVisible,setBubbleVisible]=useState(false)
 const [typedText,setTypedText]=useState('')
 const [direction,setDirection]=useState('center')
 const [reaction,setReaction]=useState('')
 const [tipIndex,setTipIndex]=useState(0)
 const timers=useRef({type:null,hide:null,reaction:null})
 const typing=useRef(false)
 const token=useRef(0)
 const boops=useRef({count:0,last:0})
 const pageKey=(pagePath||'/').split('/').filter(Boolean).pop()||'index'
 const pageTips={
  index:['Welcome to APML Portal! Select any module below to get started. 🚀','Tip: Use the hamburger menu on top to quickly navigate anywhere.','All telemetry systems and personnel metrics are live and synced!','Need a quotation? Open the Quotation Editor, and your PDF is saved to the Drive automatically. 📄','Click my avatar anytime for another quick hint!'],
  editor:['💡 Pro Tip: Fill out quotation line items and click Preview A4 to generate an official PDF.','You can save your drafts locally right from this studio.','Freight calculations compute automatically based on your inputs.','Every PDF you download is also saved to Drive in the Quotation folder. 📁','Delete any charge line you do not need and totals update instantly.'],
  gallery:['💡 Tip: Select a folder category and click Upload Media to add photos or videos instantly.','Click any asset card to preview it in the full-screen lightbox.','Deleted items are safely archived into the Trash Archive.','You can select several photos or videos and upload them in one go. 📸','Views and downloads are counted for every media item.'],
  drive:['💡 Tip: Use Upload File to add documents, images and videos straight into the current folder.','Create folders with New Folder to keep your files organised.','Deleted files are routed to the Trash Archive for recovery.','Quotation PDFs from the editor land in the Quotation folder automatically. 📁'],
  directory:['💡 Tip: Use the search bar to look up branch HODs and direct phone contacts.','Click location pins to open exact addresses in Google Maps.','Search works on city, in-charge name, phone number or designation.','Use the hamburger menu to jump to any other module quickly.','Click my avatar anytime for another quick hint!'],
  'apml-lite':['💡 Tip: Enter volume dimensions to calculate CFT up to the 450 CFT ceiling limit.','Destination pricing and floor constraints compute automatically.','This calculator covers the Mumbai & Pune hub rates.','Enter a CFT volume between 1 and 450 to see the rate straight away.','Click my avatar anytime for another quick hint!'],
  'local-rate':['💡 Tip: Enter the volume in CFT to calculate the local shifting rate.','Rates update instantly as you change the values.','Double-check the volume, since it drives the whole estimate.','Use the hamburger menu to switch to the other calculators.','Click my avatar anytime for another quick hint!'],
  'car-rate':['💡 Tip: Type the vehicle model, for example Nexon, Creta or Brezza, to pick the car.','Enter the distance in KM to get the transport estimate.','Vehicle type and distance together decide the final rate.','Use the hamburger menu to switch to the other calculators.','Click my avatar anytime for another quick hint!'],
  'field-officer':['💡 Tip: Search by name, branch (MUM, PUN, AHMD), APM code, designation or phone.','Type a branch code like MUM or PUN to see its field officers.','Every field officer’s APM code is listed for quick reference.','Use the hamburger menu to jump to other modules.','Click my avatar anytime for another quick hint!'],
  about:['Hi! This page tells the story behind the APML Portal. 👋','Scroll down to see how the portal is built and what powers it.','Everything is synced in real-time with Firebase and Supabase.','Use the hamburger menu to explore the other modules.','Click my avatar anytime for another quick hint!']
 }
 const tips=pageTips[pageKey]||['Welcome to the APML Enterprise workspace! 💼','Everything is synced in real-time with Firebase and Supabase.','Use the hamburger menu to jump between modules.','Quotation PDFs are saved to the Drive automatically. 📁','Click my avatar anytime for another quick hint!']
 const isIndexPage=pageKey==='index'
 const directionNames=['up-left','up','up-right','left','center','right','down-left','down','down-right']
 const reactionNames=['blink','heart','sparkle','surprised','starry','blush','sleepy','dizzy','delighted']
 const position=(name,names)=>{const i=names.indexOf(name);return i<0?'50% 50%':((i%3)*50)+'% '+(Math.floor(i/3)*50)+'%'}
 const clearTimers=()=>{clearTimeout(timers.current.type);clearTimeout(timers.current.hide);clearTimeout(timers.current.reaction)}
 const showReaction=(name,duration=900)=>{
  clearTimeout(timers.current.reaction)
  setReaction(name)
  if(duration>0)timers.current.reaction=setTimeout(()=>setReaction(''),duration)
 }
 const playTip=(message,holdMs=5000)=>{
  if(!message)return
  clearTimeout(timers.current.type);clearTimeout(timers.current.hide)
  const currentToken=++token.current
  typing.current=true
  setTypedText('')
  setReaction('delighted')
  setBubbleVisible(true)
  let index=0
  const step=()=>{
   if(currentToken!==token.current)return
   if(index<message.length){
    setTypedText(message.slice(0,index+1))
    index++
    timers.current.type=setTimeout(step,30)
   }else{
    typing.current=false
    setReaction('')
    timers.current.hide=setTimeout(()=>{
     if(currentToken===token.current)setBubbleVisible(false)
    },holdMs)
   }
  }
  step()
 }
 useEffect(()=>{
  const update=()=>{
   const scrollY=window.scrollY||document.documentElement.scrollTop
   const scrollPosition=scrollY+window.innerHeight
   const footer=document.querySelector('.portal-site-footer')
   const bodyHeight=document.body.offsetHeight
   const footerHeight=footer?footer.offsetHeight:0
   const nearBottom=scrollPosition>(bodyHeight-footerHeight+20)
   setVisible(window.innerWidth>768&&!document.documentElement.classList.contains('is-native-apk')&&pageKey!=='404'&&pageKey!=='play'&&(!isIndexPage||scrollY>250)&&!nearBottom)
   if(nearBottom){clearTimeout(timers.current.hide);setBubbleVisible(false)}
  }
  update()
  window.addEventListener('scroll',update,{passive:true})
  window.addEventListener('resize',update)
  return()=>{window.removeEventListener('scroll',update);window.removeEventListener('resize',update)}
 },[pagePath,pageKey,isIndexPage])
 useEffect(()=>{
  if(!visible||!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return
  const sectors=['right','down-right','down','down-left','left','up-left','up','up-right']
  const aim=e=>{
   const el=document.querySelector('.apml-floating-mascot button')
   const rect=el?.getBoundingClientRect();if(!rect)return
   const dx=e.clientX-(rect.left+rect.width/2),dy=e.clientY-(rect.top+rect.height/2)
   if(Math.hypot(dx,dy)<70){setDirection('center');return}
   const sector=(Math.round(Math.atan2(dy,dx)/(Math.PI*2/8))+sectors.length)%sectors.length
   if(!reaction)setDirection(sectors[sector])
  }
  const reset=e=>{if(!e.relatedTarget)setDirection('center')}
  window.addEventListener('pointermove',aim,{passive:true})
  window.addEventListener('pointerout',reset,{passive:true})
  return()=>{window.removeEventListener('pointermove',aim);window.removeEventListener('pointerout',reset)}
 },[visible,reaction])
 useEffect(()=>{
  const initial=setTimeout(()=>{
   if(!typing.current&&!bubbleVisible&&(!isIndexPage||window.scrollY>250))playTip(tips[tipIndex % tips.length])
  },1000)
  return()=>clearTimeout(initial)
 },[pagePath])
 useEffect(()=>()=>{clearTimers();token.current++},[])
 const interact=()=>{
  if(typing.current)return
  const now=Date.now()
  boops.current.count=now-boops.current.last<1600?boops.current.count+1:1
  boops.current.last=now
  const count=boops.current.count
  const nextReaction=count>=4?'dizzy':['heart','sparkle','delighted'][(count-1)%3]
  if(count>=4)boops.current.count=0
  showReaction(nextReaction,900)
  const next=(tipIndex+1)%tips.length
  setTipIndex(next)
  playTip(tips[next])
 }
 if(!visible)return null
 return <div className="apml-floating-mascot">
  <div className="apml-floating-mascot-inner">
   <div className={'apml-floating-tip'+(bubbleVisible?' show':'')} role="status" aria-live="polite">
    <span>{typedText}</span><span className="apml-floating-cursor" aria-hidden="true">|</span>
   </div>
   <button type="button" aria-label="Click Wobnimo for another APML Portal tip" title="Click for a new message!" onClick={interact}>
    <span className="apml-floating-face" style={{backgroundPosition:position(direction,directionNames),opacity:reaction?0:1}}/>
    <span className="apml-floating-face apml-floating-reaction" style={{backgroundPosition:position(reaction,reactionNames),opacity:reaction?1:0}}/>
   </button>
  </div>
 </div>
}

export default function Shell(){
 const [menuOpen,setMenuOpen]=useState(false),[installEvent,setInstallEvent]=useState(null),[showInstall,setShowInstall]=useState(false)
 const location=useLocation()
 useLayoutEffect(()=>{window.scrollTo(0,0)},[location.pathname,location.search,location.hash])
 useEffect(()=>{
  setMenuOpen(false)
  const scrollPaginationToTop=(event)=>{
   if(event.target instanceof Element && event.target.closest('nav[class*="pagination"]')){
    window.requestAnimationFrame(()=>window.scrollTo(0,0))
   }
  }
  document.addEventListener('click',scrollPaginationToTop)
  return()=>document.removeEventListener('click',scrollPaginationToTop)
 },[location.pathname])
 useEffect(()=>{const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);if(!mobile||window.matchMedia('(display-mode: standalone)').matches)return;let timer;const ready=e=>{e.preventDefault();setInstallEvent(e);timer=window.setTimeout(()=>setShowInstall(true),5000)};const installed=()=>{setShowInstall(false);setInstallEvent(null)};window.addEventListener('beforeinstallprompt',ready);window.addEventListener('appinstalled',installed);return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('appinstalled',installed);window.clearTimeout(timer)}},[])
 async function installPortal(){if(!installEvent)return;await installEvent.prompt();await installEvent.userChoice;setShowInstall(false);setInstallEvent(null)}
 useEffect(()=>{
  if(!menuOpen)return
  const closeOnOutsideClick=(event)=>{
   const target=event.target
   if(target instanceof Element&&!target.closest('.portal-nav')&&!target.closest('.portal-menu-toggle'))setMenuOpen(false)
  }
  const closeOnEscape=(event)=>{if(event.key==='Escape')setMenuOpen(false)}
  document.addEventListener('click',closeOnOutsideClick)
  document.addEventListener('keydown',closeOnEscape)
  return()=>{
   document.removeEventListener('click',closeOnOutsideClick)
   document.removeEventListener('keydown',closeOnEscape)
  }
 },[menuOpen])
 useEffect(()=>{
  const hasConsent=()=>{try{const choice=JSON.parse(localStorage.getItem('apml-privacy-consent')||'null');return !!(choice&&choice.analytics===true)||localStorage.getItem('apml-analytics-consent')==='yes'}catch(_){return false}}
  const indiaDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  window.apmlHasAnalyticsConsent=hasConsent
  window.logDailyActivity=async(type)=>{if(!hasConsent())return;try{const db=await getApmlDatabase();await db.ref('analytics/daily_logs/'+indiaDate()+'/'+String(type).replace(/[^a-zA-Z0-9_-]/g,'')).transaction(value=>(Number(value)||0)+1)}catch(error){console.warn('APML daily analytics unavailable',error)}}
  const recordVisitor=()=>{if(!hasConsent())return;const today=indiaDate();try{if(localStorage.getItem('apml_last_visit_date')===today)return;localStorage.setItem('apml_last_visit_date',today)}catch(_){}window.logDailyActivity('visitors')}
  window.addEventListener('apml-analytics-consent-granted',recordVisitor);recordVisitor()
  return()=>window.removeEventListener('apml-analytics-consent-granted',recordVisitor)
 },[])
 useEffect(()=>{const src=import.meta.env.BASE_URL+'notify.js?v=21.46';if(document.querySelector('script[data-apml-notify]'))return;const script=document.createElement('script');script.src=src;script.async=true;script.dataset.apmlNotify='true';document.body.appendChild(script);return()=>script.remove()},[])
 const active=links.find(x=>x.to===location.pathname)?.label||(location.pathname==='/bug-report'?'Report an issue':'APML Workspace')
 return <div className="app-shell topnav-shell"><PrivacyConsent/>
  {showInstall&&installEvent&&<aside className="install-prompt"><div><strong>Install APML Portal</strong><span>Add the workspace to your phone for quick access.</span></div><button onClick={installPortal}>Install</button><button className="install-dismiss" onClick={()=>setShowInstall(false)} aria-label="Dismiss install prompt">×</button></aside>}
  <header className="portal-header"><div className="portal-header-inner">
   <Link to="/" className="portal-brand"><img className="apml-rotating-logo" src={import.meta.env.BASE_URL+'logo.svg'} alt="APML Portal"/><span><b>APML <i>Portal</i></b></span></Link>
   <nav id="portal-main-navigation" className={menuOpen?'portal-nav open':'portal-nav'} aria-label="Main navigation">{links.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==='/'}><Icon size={15}/><span>{label}</span></NavLink>)}<Link to="/bug-report" className="portal-nav-support"><LifeBuoy size={15}/> Support</Link></nav>
   <div className="portal-header-actions"><span className="portal-live"><i/> Operational</span><HamburgerButton open={menuOpen} onToggle={()=>setMenuOpen(v=>!v)}/></div>
  </div></header>
  <main className="page-content portal-page-content"><Outlet/></main>
  <FloatingMascot pagePath={location.pathname}/>
  <Footer
   className="portal-site-footer"
   brand={{
    name: 'APML Portal',
    description: 'An independent, unofficial employee utility workspace built to make selected APML work tasks simpler and more accessible.'
   }}
   socialLinks={[
    { name: 'GitHub', href: 'https://github.com/kundarwork-debug/APML-Portal' },
    { name: 'Email', href: 'mailto:Kundar.work@gmail.com' }
   ]}
   columns={[
    {
     title: 'Workspace',
     links: [
      { name: 'Quotation Editor', Icon: FileText, href: '/editor' },
      { name: 'APML Drive', Icon: Cloud, href: '/drive' },
      { name: 'Gallery', Icon: Images, href: '/gallery' },
      { name: 'Analytics', Icon: ChartNoAxesCombined, href: '/analytics' }
     ]
    },
    {
     title: 'Resources',
     links: [
      { name: 'Branch Directory', Icon: MapPinned, href: '/directory' },
      { name: 'Field Officers', Icon: Users, href: '/field-officer' },
      { name: 'Calculators', Icon: Calculator, href: '/local-rate' },
      { name: 'Report a Bug', Icon: LifeBuoy, href: '/bug-report' }
     ]
    },
    {
     title: 'Legal & About',
     links: [
      { name: 'About APML Portal', Icon: BookOpen, href: '/about' },
      { name: 'Privacy Policy', Icon: ShieldCheck, href: '/privacy' },
      { name: 'Terms & Conditions', Icon: Scale, href: '/terms' },
      { name: 'Cookies Policy', Icon: ShieldCheck, href: '/cookies' }
     ]
    },
    {
     title: 'Helpful Links',
     links: [
      { name: 'Play Now', href: '/play' }
     ]
    }
   ]}
   copyright={`${new Date().getFullYear()} APML Portal. Unofficial operations workspace.`}
  />
 </div>
}
