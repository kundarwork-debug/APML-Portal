import { useEffect, useState } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import PrivacyConsent from './PrivacyConsent'
import { Menu, X, ChevronRight, Home, FileText, Users, Cloud, Images, ChartNoAxesCombined, CircleHelp, ShieldCheck, Calculator, Truck, Activity, MapPinned, BriefcaseBusiness, LifeBuoy, ExternalLink } from 'lucide-react'

const links = [
  {to:'/',label:'Overview',icon:Home},
  {to:'/editor',label:'Quotation Editor',icon:FileText},
  {to:'/local-rate',label:'Local Rate Calculator',icon:Calculator},
  {to:'/car-rate',label:'Car Rate Calculator',icon:Truck},
  {to:'/directory',label:'Branch Directory',icon:MapPinned},
  {to:'/field-officer',label:'Field Officer Directory',icon:Users},
  {to:'/drive',label:'APML Drive',icon:Cloud},
  {to:'/gallery',label:'Standards & Gallery',icon:Images},
  {to:'/analytics',label:'Analytics',icon:ChartNoAxesCombined},
  {to:'/system-health',label:'System Health',icon:Activity},
  {to:'/apml-lite',label:'APML Lite',icon:BriefcaseBusiness},
  {to:'/about',label:'About',icon:CircleHelp}
]

export default function Shell(){
  const [open,setOpen]=useState(false)
  const [installEvent,setInstallEvent]=useState(null)
  const [showInstall,setShowInstall]=useState(false)
  useEffect(()=>{const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);if(!mobile||window.matchMedia('(display-mode: standalone)').matches)return;let timer;const ready=e=>{e.preventDefault();setInstallEvent(e);timer=window.setTimeout(()=>setShowInstall(true),5000)};const installed=()=>{setShowInstall(false);setInstallEvent(null)};window.addEventListener('beforeinstallprompt',ready);window.addEventListener('appinstalled',installed);return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('appinstalled',installed);window.clearTimeout(timer)}},[])
  async function installPortal(){if(!installEvent)return;await installEvent.prompt();await installEvent.userChoice;setShowInstall(false);setInstallEvent(null)}

  useEffect(()=>{
    const config={apiKey:'AIzaSyDgJ6uRCABWxAHOU1bIY4VuA-nQ0zM3aF8',authDomain:'apml-portal.firebaseapp.com',databaseURL:'https://apml-portal-default-rtdb.firebaseio.com',projectId:'apml-portal',storageBucket:'apml-portal.firebasestorage.app',messagingSenderId:'479017159240',appId:'1:479017159240:web:0853422718e6195b74a67d'};
    const hasConsent=()=>{
      try{const choice=JSON.parse(localStorage.getItem('apml-privacy-consent')||'null');return !!(choice&&choice.analytics===true)||localStorage.getItem('apml-analytics-consent')==='yes'}catch(_){return false}
    };
    const indiaDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    const loadSdk=async(src,ready)=>{if(ready())return;let el=[...document.scripts].find(x=>x.src===src);if(!el){el=document.createElement('script');el.src=src;document.head.appendChild(el)}await new Promise((resolve,reject)=>{el.addEventListener('load',resolve,{once:true});el.addEventListener('error',reject,{once:true})});if(!ready())throw Error('Firebase SDK unavailable')};
    const getDb=async()=>{await loadSdk('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',()=>!!window.firebase?.apps);await loadSdk('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',()=>!!window.firebase?.database);if(!window.firebase.apps.length)window.firebase.initializeApp(config);return window.firebase.database()};
    window.apmlHasAnalyticsConsent=hasConsent;
    window.logDailyActivity=async(type)=>{
      if(!hasConsent())return;
      try{const db=await getDb();await db.ref('analytics/daily_logs/'+indiaDate()+'/'+String(type).replace(/[^a-zA-Z0-9_-]/g,'')).transaction(value=>(Number(value)||0)+1)}catch(error){console.warn('APML daily analytics unavailable',error)}
    };
    const recordVisitor=()=>{
      if(!hasConsent())return;
      const today=indiaDate();
      try{if(localStorage.getItem('apml_last_visit_date')===today)return;localStorage.setItem('apml_last_visit_date',today)}catch(_){}
      window.logDailyActivity('visitors');
    };
    window.addEventListener('apml-analytics-consent-granted',recordVisitor);
    recordVisitor();
    return()=>window.removeEventListener('apml-analytics-consent-granted',recordVisitor);
  },[])

  useEffect(()=>{
    const src = import.meta.env.BASE_URL + 'notify.js?v=21.46';
    if (document.querySelector('script[data-apml-notify]')) return;
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.dataset.apmlNotify = 'true';
    document.body.appendChild(script);
    return ()=>{ script.remove(); };
  },[])

  const location=useLocation()
  const active=links.find(x=>x.to===location.pathname)?.label || (location.pathname==='/bug-report'?'Report an issue':'APML Workspace')
  return <div className="app-shell">
    <PrivacyConsent/>
    <aside className={`sidebar ${open?'sidebar-open':''}`}>
      <div className="brand"><img src={import.meta.env.BASE_URL + "logo.svg"} alt="APML" /><div><strong>APML <span>Portal</span></strong><small>EMPLOYEE WORKSPACE</small></div><button className="icon-btn close-nav" onClick={()=>setOpen(false)} aria-label="Close menu"><X size={19}/></button></div>
      <div className="side-caption">WORKSPACE</div>
      <nav className="side-nav">{links.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==='/'} onClick={()=>setOpen(false)} className={({isActive})=>isActive?'nav-item active':'nav-item'}><Icon size={18}/><span>{label}</span>{to==='/'&&<span className="nav-dot"/>}</NavLink>)}</nav>
      <div className="side-bottom"><div className="help-card"><div className="help-icon"><LifeBuoy size={18}/></div><strong>Need a hand?</strong><p>Report an issue or share feedback with the portal team.</p><Link to="/bug-report" onClick={()=>setOpen(false)}>Get support <ChevronRight size={14}/></Link></div><div className="side-foot">Independent employee utility portal <span>•</span> React rebuild</div></div>
    </aside>
    {open&&<button className="mobile-scrim" onClick={()=>setOpen(false)} aria-label="Close navigation"/>}
    {showInstall&&installEvent&&<aside className="install-prompt"><div><strong>Install APML Portal</strong><span>Add the workspace to your phone for quick access.</span></div><button onClick={installPortal}>Install</button><button className="install-dismiss" onClick={()=>setShowInstall(false)} aria-label="Dismiss install prompt">×</button></aside>}

    <div className="main-column">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={()=>setOpen(true)} aria-label="Open menu"><Menu size={20}/></button><div className="crumb"><span>APML Portal</span><ChevronRight size={14}/><strong>{active}</strong></div><div className="top-actions"><span className="status-pill"><i/> Portal workspace</span><Link className="top-link" to="/about">About <ExternalLink size={13}/></Link></div></header>
      <main className="page-content"><Outlet/></main>
      <footer className="footer"><span>© {new Date().getFullYear()} APML Portal</span><div><Link to="/about">About</Link><Link to="/bug-report">Support</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div></footer>
    </div>
  </div>
}