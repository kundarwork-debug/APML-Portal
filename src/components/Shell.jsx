import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Footer } from './ui/footer'
import VisitorAnalyticsTracker from './VisitorAnalyticsTracker'
import { getApmlPresenceServices } from '../lib/firebase'
import { ChevronDown, Home, FileText, Users, Cloud, Images, LockKeyhole, CircleHelp, Calculator, Truck, Activity, MapPinned, BriefcaseBusiness, LifeBuoy, ExternalLink, Github, Mail, BookOpen, ShieldCheck, Scale, Search, X, ArrowRight } from 'lucide-react'

const links = [
 {to:'/',label:'Home',icon:Home},{to:'/editor',label:'Quotation Editor',icon:FileText},
 {to:'/directory',label:'Branch Directory',icon:MapPinned},{to:'/field-officer',label:'Field Officers',icon:Users},
 {to:'/drive',label:'APML Drive',icon:Cloud},{to:'/gallery',label:'Gallery',icon:Images},
 {to:'/local-rate',label:'Local Rate',icon:Calculator},{to:'/car-rate',label:'Car Rate',icon:Truck},
 {to:'/apml-lite',label:'APML Lite',icon:BriefcaseBusiness},
 {to:'/system-health',label:'System Health',icon:Activity},{to:'/admin',label:'Admin',icon:LockKeyhole},
 {to:'/about',label:'About',icon:CircleHelp}
]
function FloatingMascot({pagePath}){
 const [visible,setVisible]=useState(false)
 const [bubbleVisible,setBubbleVisible]=useState(false)
 const [typedText,setTypedText]=useState('')
 const pinnedRef=useRef(false)
 const [isSpeaking,setIsSpeaking]=useState(false)
 const [direction,setDirection]=useState('center')
 const [reaction,setReaction]=useState('')
 const [tipIndex,setTipIndex]=useState(0)
 const timers=useRef({type:null,hide:null,reaction:null})
 const typing=useRef(false)
 const token=useRef(0)
 const boops=useRef({count:0,last:0})
 const pageKey=(pagePath||'/').split('/').filter(Boolean).pop()||'index'
 const pageTips={
  index:['Welcome to APML Portal! Select any module below to get started. 🚀','Tip: Press Ctrl + K to quickly search pages and tools.','All telemetry systems and personnel metrics are live and synced!','Need a quotation? Open the Quotation Editor, and your PDF is saved to the Drive automatically. 📄','Click my avatar anytime for another quick hint!'],
  editor:['💡 Pro Tip: Fill out quotation line items and click Preview A4 to generate an official PDF.','You can save your drafts locally right from this studio.','Freight calculations compute automatically based on your inputs.','Every PDF you download is also saved to Drive in the Quotation folder. 📁','Delete any charge line you do not need and totals update instantly.'],
  gallery:['💡 Tip: Select a folder category and click Upload Media to add photos or videos instantly.','Click any asset card to preview it in the full-screen lightbox.','Deleted items are safely archived into the Trash Archive.','You can select several photos or videos and upload them in one go. 📸','Views and downloads are counted for every media item.'],
  drive:['💡 Tip: Use Upload File to add documents, images and videos straight into the current folder.','Create folders with New Folder to keep your files organised.','Deleted files are routed to the Trash Archive for recovery.','Quotation PDFs from the editor land in the Quotation folder automatically. 📁'],
  directory:['💡 Tip: Use the search bar to look up branch HODs and direct phone contacts.','Click location pins to open exact addresses in Google Maps.','Search works on city, in-charge name, phone number or designation.','Use the hamburger menu to jump to any other module quickly.','Click my avatar anytime for another quick hint!'],
  'apml-lite':['💡 Tip: Enter volume dimensions to calculate CFT up to the 450 CFT ceiling limit.','Destination pricing and floor constraints compute automatically.','This calculator covers the Mumbai & Pune hub rates.','Enter a CFT volume between 1 and 450 to see the rate straight away.','Click my avatar anytime for another quick hint!'],
  'local-rate':['💡 Tip: Enter the volume in CFT to calculate the local shifting rate.','Rates update instantly as you change the values.','Double-check the volume, since it drives the whole estimate.','Press Ctrl + K to switch to the other calculators.','Click my avatar anytime for another quick hint!'],
  'car-rate':['💡 Tip: Type the vehicle model, for example Nexon, Creta or Brezza, to pick the car.','Enter the distance in KM to get the transport estimate.','Vehicle type and distance together decide the final rate.','Press Ctrl + K to switch to the other calculators.','Click my avatar anytime for another quick hint!'],
  'field-officer':['💡 Tip: Search by name, branch (MUM, PUN, AHMD), APM code, designation or phone.','Type a branch code like MUM or PUN to see its field officers.','Every field officer’s APM code is listed for quick reference.','Use the hamburger menu to jump to other modules.','Click my avatar anytime for another quick hint!'],
  about:['Hi! This page tells the story behind the APML Portal. 👋','Scroll down to see how the portal is built and what powers it.','Everything is synced in real-time with Firebase.','Press Ctrl + K to explore the other modules.','Click my avatar anytime for another quick hint!']
 }
 const tips=pageTips[pageKey]||['Welcome to the APML Enterprise workspace! 💼','Everything is synced in real-time with Firebase.','Press Ctrl + K to jump between modules.','Quotation PDFs are saved to the Drive automatically. 📁','Click my avatar anytime for another quick hint!']
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
  setIsSpeaking(true)
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
    setIsSpeaking(false)
    setReaction('')
    timers.current.hide=setTimeout(()=>{
     if(currentToken===token.current&&!pinnedRef.current)setBubbleVisible(false)
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
   if(nearBottom){
    clearTimeout(timers.current.hide)
    if(!pinnedRef.current)setBubbleVisible(false)
   }else if(pinnedRef.current){
    setBubbleVisible(true)
   }
  }
  update()
  window.addEventListener('scroll',update,{passive:true})
  window.addEventListener('resize',update)
  return()=>{window.removeEventListener('scroll',update);window.removeEventListener('resize',update)}
 },[pagePath,pageKey,isIndexPage])
 useEffect(()=>{
  if(!visible||isSpeaking||!window.matchMedia('(hover: hover) and (pointer: fine)').matches)return
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
 },[visible,reaction,isSpeaking])
 useEffect(()=>{
  const initial=setTimeout(()=>{
   if(!typing.current&&!bubbleVisible&&(!isIndexPage||window.scrollY>250))playTip(tips[tipIndex % tips.length])
  },1000)
  return()=>clearTimeout(initial)
 },[pagePath])
 useEffect(()=>{
  const api={
   pin(message){
    const text=String(message||'')
    if(!text)return
    clearTimers()
    token.current++
    pinnedRef.current=true
    typing.current=false
    setIsSpeaking(false)
    setReaction('')
    setTypedText(text)
    setBubbleVisible(true)
   },
   unpin(){
    pinnedRef.current=false
    clearTimers()
    token.current++
    typing.current=false
    setIsSpeaking(false)
    setBubbleVisible(false)
   },
   say(message,options){
    pinnedRef.current=false
    playTip(String(message||''),Number(options?.hold)||5000)
   }
  }
  window.APMLMascot=api
  return()=>{
   if(window.APMLMascot===api)delete window.APMLMascot
  }
 },[])
 useEffect(()=>()=>{clearTimers();token.current++},[])
 const interact=()=>{
  if(pinnedRef.current)return

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
 return <div className={'apml-floating-mascot'+(visible?' is-visible':' is-hidden')+(isSpeaking?' is-speaking':'')}>
  <div className="apml-floating-mascot-inner">
   <div className={'apml-floating-tip'+(bubbleVisible?' show':'')} role="status" aria-live="polite">
    <span>{typedText}</span><span className="apml-floating-cursor" aria-hidden="true">|</span>
   </div>
   <button id="supportAvatarBtn" type="button" aria-label="Click Wobnimo for another APML Portal tip" title="Click for a new message!" onClick={interact}>
    <span className="apml-floating-face" style={{backgroundPosition:position(direction,directionNames),opacity:reaction?0:1}}/>
    <span className="apml-floating-face apml-floating-reaction" style={{backgroundPosition:position(reaction,reactionNames),opacity:reaction?1:0}}/>
   </button>
  </div>
 </div>
}

export default function Shell(){
 const [installEvent,setInstallEvent]=useState(null),[showInstall,setShowInstall]=useState(false)
 const [darkTheme,setDarkTheme]=useState(()=>{try{return localStorage.getItem('apml-theme')==='dark'}catch(_){return false}})
 const [paletteOpen,setPaletteOpen]=useState(false),[paletteQuery,setPaletteQuery]=useState(''),[paletteIndex,setPaletteIndex]=useState(0)
 const paletteInput=useRef(null)
 const navigate=useNavigate()
 const paletteItems=useMemo(()=>links.filter(item=>(item.label+' '+item.to).toLowerCase().includes(paletteQuery.trim().toLowerCase())),[paletteQuery])
 useEffect(()=>{
  if(window.APMNotify)return
  const src=import.meta.env.BASE_URL+'notify.js?v=21.47'
  const existing=[...document.scripts].find(script=>script.src===new URL(src,window.location.href).href)
  if(existing)return
  const script=document.createElement('script')
  script.src=src
  script.async=true
  script.onerror=()=>console.warn('APML Telegram notification script could not be loaded')
  document.head.appendChild(script)
 },[])
 useEffect(()=>{
  const onKeyDown=event=>{
   if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();setPaletteOpen(true);return}
   if(event.key==='Escape'&&paletteOpen){event.preventDefault();setPaletteOpen(false);setPaletteQuery('')}
   if(!paletteOpen||!paletteItems.length)return
   if(event.key==='ArrowDown'){event.preventDefault();setPaletteIndex(index=>(index+1)%paletteItems.length)}
   if(event.key==='ArrowUp'){event.preventDefault();setPaletteIndex(index=>(index-1+paletteItems.length)%paletteItems.length)}
   if(event.key==='Enter'){event.preventDefault();const item=paletteItems[paletteIndex];if(item){navigate(item.to);setPaletteOpen(false);setPaletteQuery('')}}
  }
  window.addEventListener('keydown',onKeyDown)
  return()=>window.removeEventListener('keydown',onKeyDown)
 },[paletteOpen,paletteItems,paletteIndex,navigate])
 useEffect(()=>{if(paletteOpen){setPaletteIndex(0);window.requestAnimationFrame(()=>paletteInput.current?.focus())}},[paletteOpen])
 const location=useLocation()
 useEffect(()=>{
  let active=true,db=null,connectionRef=null,ownRef=null,heartbeat=null,connected=false,connectionHandler=null
  const start=async()=>{
   try{
    const presence=await getApmlPresenceServices()
    if(!active)return
    db=presence.database
    let sessionId
    try{sessionId=sessionStorage.getItem('apml_presence_session')}catch(_){}
    if(!sessionId){sessionId=window.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);try{sessionStorage.setItem('apml_presence_session',sessionId)}catch(_){}}
    ownRef=db.ref('presence/'+presence.user.uid+'/'+sessionId)
    connectionRef=db.ref('.info/connected')
    const publish=async()=>{
     try{
      await ownRef.onDisconnect().remove()
      await ownRef.set({online:true,timestamp:Date.now()})
     }catch(error){console.warn('APML live presence could not be published',error)}
    }
    connectionHandler=snap=>{
     if(!active)return
     connected=snap.val()===true
     if(connected)publish()
    }
    connectionRef.on('value',connectionHandler,error=>console.warn('APML live connection status unavailable',error))
    heartbeat=window.setInterval(()=>{
     if(active&&connected)ownRef?.update({online:true,timestamp:Date.now()}).catch(error=>console.warn('APML presence heartbeat failed',error))
    },30000)
   }catch(error){console.warn('APML live presence unavailable',error)}
  }
  start()
  return()=>{
   active=false
   if(heartbeat)window.clearInterval(heartbeat)
   connected=false
   if(connectionHandler)connectionRef?.off?.('value',connectionHandler)
   if(ownRef){ownRef.onDisconnect().cancel().catch(()=>{});ownRef.remove().catch(()=>{})}
  }
 },[])
 useEffect(()=>{
  const theme=darkTheme?'dark':'light'
  document.documentElement.dataset.theme=theme
  document.documentElement.style.colorScheme=theme
  try{localStorage.setItem('apml-theme',theme)}catch(_){}
 },[darkTheme])
 useLayoutEffect(()=>{window.scrollTo(0,0)},[location.pathname,location.search,location.hash])
 useEffect(()=>{
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
 const active=links.find(x=>x.to===location.pathname)?.label||(location.pathname==='/bug-report'?'Report an issue':'APML Workspace')
 return <div className="app-shell topnav-shell">
  {showInstall&&installEvent&&<aside className="install-prompt"><div><strong>Install APML Portal</strong><span>Add the workspace to your phone for quick access.</span></div><button onClick={installPortal}>Install</button><button className="install-dismiss" onClick={()=>setShowInstall(false)} aria-label="Dismiss install prompt">×</button></aside>}
  <VisitorAnalyticsTracker />
  <header className="portal-header"><div className="portal-header-inner">
   <Link to="/" className="portal-brand"><img className="apml-rotating-logo" src={import.meta.env.BASE_URL+'logo.svg'} alt="APML Portal"/><span><b>APML <i>Portal</i></b></span></Link>
   <div className="portal-header-actions"><button type="button" className="apml-command-trigger" onClick={()=>setPaletteOpen(true)} aria-label="Search pages and tools"><Search size={16}/><span>Search anything...</span><kbd>Ctrl K</kbd></button><label className="apml-theme-switch" title={darkTheme?"Switch to light theme":"Switch to dark theme"} aria-label="Toggle dark theme"><input type="checkbox" checked={darkTheme} onChange={e=>setDarkTheme(e.target.checked)} aria-label="Enable dark theme"/><span className="apml-theme-slider" aria-hidden="true"><span className="apml-theme-thumb-icon">{darkTheme?"☾":"☀"}</span></span></label></div>
  </div></header> 
  {paletteOpen&&<div className="apml-command-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget){setPaletteOpen(false);setPaletteQuery('')}}}>
   <section className="apml-command-dialog" role="dialog" aria-modal="true" aria-label="Search APML Portal">
    <div className="apml-command-input-wrap"><Search size={19}/><input ref={paletteInput} value={paletteQuery} onChange={event=>{setPaletteQuery(event.target.value);setPaletteIndex(0)}} placeholder="Search pages, tools and sections..." aria-label="Search pages and tools"/><kbd>ESC</kbd><button type="button" onClick={()=>{setPaletteOpen(false);setPaletteQuery('')}} aria-label="Close search"><X size={18}/></button></div>
    <div className="apml-command-results"><p className="apml-command-caption">{paletteItems.length?'PAGES & TOOLS':'NO MATCHES'}</p>
     {paletteItems.map((item,index)=>{const Icon=item.icon;return <button type="button" key={item.to} className={index===paletteIndex?'is-active':''} onMouseEnter={()=>setPaletteIndex(index)} onClick={()=>{navigate(item.to);setPaletteOpen(false);setPaletteQuery('')}}><span className="apml-command-item-icon"><Icon size={17}/></span><span><strong>{item.label}</strong><small>{item.to==='/'?'Your workspace':item.to.replace('/','').replaceAll('-',' ')}</small></span><ArrowRight size={16}/></button>})}
    </div><footer><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to open</span><span><kbd>ESC</kbd> to close</span></footer>
   </section>
  </div>}
  <main className="page-content portal-page-content"><div key={location.pathname} className="apml-page-transition"><Outlet/></div></main>
  {location.pathname!=="/about"&&<FloatingMascot pagePath={location.pathname}/>}
  <Footer
   className="portal-site-footer"
   brand={{
    name: 'APML Portal',
    description: 'An independent, unofficial employee utility workspace built to make selected APML work tasks simpler and more accessible.'
   }}
   socialLinks={[
    { name: 'WhatsApp', href: 'https://wa.me/919910579530' },
    { name: 'GitHub', href: 'https://github.com/kundarwork-debug/APML-Portal' },
    { name: 'Gmail', href: 'mailto:kundar.work@gmail.com' }
   ]}
   columns={[
    {
     title: 'Workspace',
     links: [
      { name: 'Quotation Editor', Icon: FileText, href: '/editor' },
      { name: 'APML Drive', Icon: Cloud, href: '/drive' },
      { name: 'Gallery', Icon: Images, href: '/gallery' },
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
      { name: 'Admin', Icon: LockKeyhole, href: '/admin' },
     ]
    }
   ]}
   copyright={`${new Date().getFullYear()} APML Portal. Unofficial operations workspace.`}
  />
 </div>
}

