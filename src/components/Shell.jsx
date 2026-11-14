import { useEffect, useState } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import PrivacyConsent from './PrivacyConsent'
import { Menu, X, ChevronDown, Home, FileText, Users, Cloud, Images, ChartNoAxesCombined, CircleHelp, Calculator, Truck, Activity, MapPinned, BriefcaseBusiness, LifeBuoy, ExternalLink } from 'lucide-react'

const links = [
 {to:'/',label:'Home',icon:Home},{to:'/editor',label:'Quotation Editor',icon:FileText},
 {to:'/local-rate',label:'Local Rate',icon:Calculator},{to:'/car-rate',label:'Car Rate',icon:Truck},
 {to:'/directory',label:'Branch Directory',icon:MapPinned},{to:'/field-officer',label:'Field Officers',icon:Users},
 {to:'/drive',label:'APML Drive',icon:Cloud},{to:'/gallery',label:'Gallery',icon:Images},
 {to:'/analytics',label:'Analytics',icon:ChartNoAxesCombined},{to:'/system-health',label:'System Health',icon:Activity},
 {to:'/apml-lite',label:'APML Lite',icon:BriefcaseBusiness},{to:'/about',label:'About',icon:CircleHelp}
]
export default function Shell(){
 const [menuOpen,setMenuOpen]=useState(false),[installEvent,setInstallEvent]=useState(null),[showInstall,setShowInstall]=useState(false)
 const location=useLocation()
 useEffect(()=>{setMenuOpen(false)},[location.pathname])
 useEffect(()=>{const mobile=/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);if(!mobile||window.matchMedia('(display-mode: standalone)').matches)return;let timer;const ready=e=>{e.preventDefault();setInstallEvent(e);timer=window.setTimeout(()=>setShowInstall(true),5000)};const installed=()=>{setShowInstall(false);setInstallEvent(null)};window.addEventListener('beforeinstallprompt',ready);window.addEventListener('appinstalled',installed);return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('appinstalled',installed);window.clearTimeout(timer)}},[])
 async function installPortal(){if(!installEvent)return;await installEvent.prompt();await installEvent.userChoice;setShowInstall(false);setInstallEvent(null)}
 useEffect(()=>{
  const config={apiKey:'AIzaSyDgJ6uRCABWxAHOU1bIY4VuA-nQ0zM3aF8',authDomain:'apml-portal.firebaseapp.com',databaseURL:'https://apml-portal-default-rtdb.firebaseio.com',projectId:'apml-portal',storageBucket:'apml-portal.firebasestorage.app',messagingSenderId:'479017159240',appId:'1:479017159240:web:0853422718e6195b74a67d'}
  const hasConsent=()=>{try{const choice=JSON.parse(localStorage.getItem('apml-privacy-consent')||'null');return !!(choice&&choice.analytics===true)||localStorage.getItem('apml-analytics-consent')==='yes'}catch(_){return false}}
  const indiaDate=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  const loadSdk=async(src,ready)=>{if(ready())return;let el=[...document.scripts].find(x=>x.src===src);if(!el){el=document.createElement('script');el.src=src;document.head.appendChild(el)}await new Promise((resolve,reject)=>{el.addEventListener('load',resolve,{once:true});el.addEventListener('error',reject,{once:true})});if(!ready())throw Error('Firebase SDK unavailable')}
  const getDb=async()=>{await loadSdk('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',()=>!!window.firebase?.apps);await loadSdk('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',()=>!!window.firebase?.database);if(!window.firebase.apps.length)window.firebase.initializeApp(config);return window.firebase.database()}
  window.apmlHasAnalyticsConsent=hasConsent
  window.logDailyActivity=async(type)=>{if(!hasConsent())return;try{const db=await getDb();await db.ref('analytics/daily_logs/'+indiaDate()+'/'+String(type).replace(/[^a-zA-Z0-9_-]/g,'')).transaction(value=>(Number(value)||0)+1)}catch(error){console.warn('APML daily analytics unavailable',error)}}
  const recordVisitor=()=>{if(!hasConsent())return;const today=indiaDate();try{if(localStorage.getItem('apml_last_visit_date')===today)return;localStorage.setItem('apml_last_visit_date',today)}catch(_){}window.logDailyActivity('visitors')}
  window.addEventListener('apml-analytics-consent-granted',recordVisitor);recordVisitor()
  return()=>window.removeEventListener('apml-analytics-consent-granted',recordVisitor)
 },[])
 useEffect(()=>{const src=import.meta.env.BASE_URL+'notify.js?v=21.46';if(document.querySelector('script[data-apml-notify]'))return;const script=document.createElement('script');script.src=src;script.async=true;script.dataset.apmlNotify='true';document.body.appendChild(script);return()=>script.remove()},[])
 const active=links.find(x=>x.to===location.pathname)?.label||(location.pathname==='/bug-report'?'Report an issue':'APML Workspace')
 return <div className="app-shell topnav-shell"><PrivacyConsent/>
  {showInstall&&installEvent&&<aside className="install-prompt"><div><strong>Install APML Portal</strong><span>Add the workspace to your phone for quick access.</span></div><button onClick={installPortal}>Install</button><button className="install-dismiss" onClick={()=>setShowInstall(false)} aria-label="Dismiss install prompt">×</button></aside>}
  <header className="portal-header"><div className="portal-header-inner">
   <Link to="/" className="portal-brand"><img src={import.meta.env.BASE_URL+'logo.svg'} alt="APML Portal"/><span><b>APML <i>Portal</i></b><small>EMPLOYEE WORKSPACE</small></span></Link>
   <nav id="portal-main-navigation" className={menuOpen?'portal-nav open':'portal-nav'} aria-label="Main navigation">{links.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==='/'}><Icon size={15}/><span>{label}</span></NavLink>)}<Link to="/bug-report" className="portal-nav-support"><LifeBuoy size={15}/> Support</Link></nav>
   <div className="portal-header-actions"><span className="portal-live"><i/> Operational</span><button type="button" className="portal-menu-toggle" onClick={()=>setMenuOpen(v=>!v)} aria-expanded={menuOpen} aria-controls="portal-main-navigation" aria-label={menuOpen?'Close navigation':'Open navigation'}>{menuOpen?<X size={21}/>:<Menu size={21}/>}</button></div>
  </div></header>
  <main className="page-content portal-page-content"><Outlet/></main>
  <footer className="site-footer portal-site-footer">
   <div className="footer-grid-layout">
    <div className="footer-left-col">
     <div className="footer-brand-group"><div className="footer-logo-box"><img src={import.meta.env.BASE_URL+'logo.svg'} alt="APML Portal" className="rotating-logo"/></div><div><div className="footer-title">APML<span> Portal</span></div><div className="footer-subtitle">Independent Employee Utility Portal</div></div></div>
     <p className="footer-desc">APML Portal is an independent, unofficial utility website built primarily to help APML employees with selected work tasks. It is not an official company website.</p>
     <div className="footer-contact-details"><a href="mailto:Kundar.work@gmail.com">Kundar.work@gmail.com</a><a href="tel:+919910579530">+91 99105 79530</a></div>
    </div>
    <div className="footer-right-col"><div className="footer-links-heading">Links</div><div className="footer-links-list"><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms &amp; Conditions</Link><Link to="/cookies">Cookies &amp; Storage Policy</Link><Link to="/bug-report" className="footer-bug-link">Report a Bug</Link></div></div>
   </div>
   <div className="footer-mobile-links" aria-label="Footer navigation">
    <div className="footer-mobile-link-group"><div className="footer-links-heading">Resources</div><div className="footer-links-list"><Link to="/directory">Directory</Link><Link to="/drive">Cloud Drive</Link><Link to="/gallery">Gallery</Link><Link to="/car-rate">Car Rate Calculator</Link><Link to="/local-rate">Local Rate Calculator</Link><Link to="/field-officer">Field Officer</Link></div></div>
    <div className="footer-mobile-link-group"><div className="footer-links-heading">Legal</div><div className="footer-links-list"><Link to="/privacy">Privacy Policy</Link><Link to="/terms">Terms &amp; Conditions</Link><Link to="/cookies">Cookies &amp; Storage Policy</Link></div></div>
   </div>
   <div className="footer-divider"></div>
   <div className="footer-bottom-row"><div className="footer-copyright">© {new Date().getFullYear()} APML Portal. Unofficial operations workspace.</div><div className="footer-actions-group"><a href="https://github.com/kundarwork-debug" className="footer-author-pill" target="_blank" rel="noreferrer" title="About Developer"><img src="https://github.com/kundarwork-debug.png" alt="" className="footer-avatar"/><span>Prasad Kundar</span></a></div></div>
  </footer>
 </div>
}
