import { useState } from 'react'
import { NavLink, Link, Outlet, useLocation } from 'react-router-dom'
import { Menu, X, Search, ChevronRight, Home, FileText, Users, Cloud, Images, ChartNoAxesCombined, CircleHelp, ShieldCheck, ExternalLink } from 'lucide-react'
const links = [
  {to:'/',label:'Overview',icon:Home},
  {to:'/editor',label:'Quotation Editor',icon:FileText},
  {to:'/directory',label:'Branch Directory',icon:Users},
  {to:'/drive',label:'APML Drive',icon:Cloud},
  {to:'/gallery',label:'Gallery',icon:Images},
  {to:'/analytics',label:'Analytics',icon:ChartNoAxesCombined},
  {to:'/about',label:'About',icon:CircleHelp}
]
export default function Shell(){
  const [open,setOpen]=useState(false)
  const location=useLocation()
  const active=links.find(x=>x.to===location.pathname)?.label || 'APML Workspace'
  return <div className="app-shell">
    <aside className={`sidebar ${open?'sidebar-open':''}`}>
      <div className="brand"><img src="/logo.svg" alt="APML" /><div><strong>APML <span>Portal</span></strong><small>EMPLOYEE WORKSPACE</small></div><button className="icon-btn close-nav" onClick={()=>setOpen(false)} aria-label="Close menu"><X size={19}/></button></div>
      <div className="side-caption">WORKSPACE</div>
      <nav className="side-nav">{links.map(({to,label,icon:Icon})=><NavLink key={to} to={to} end={to==='/'} onClick={()=>setOpen(false)} className={({isActive})=>isActive?'nav-item active':'nav-item'}><Icon size={18}/><span>{label}</span>{to==='/'&&<span className="nav-dot"/>}</NavLink>)}</nav>
      <div className="side-bottom"><div className="help-card"><div className="help-icon"><ShieldCheck size={18}/></div><strong>Need a hand?</strong><p>Report an issue or share feedback with the portal team.</p><Link to="/bug-report" onClick={()=>setOpen(false)}>Get support <ChevronRight size={14}/></Link></div><div className="side-foot">Independent employee utility portal <span>•</span> v1.0</div></div>
    </aside>
    {open&&<button className="mobile-scrim" onClick={()=>setOpen(false)} aria-label="Close navigation"/>}
    <div className="main-column">
      <header className="topbar"><button className="icon-btn menu-btn" onClick={()=>setOpen(true)} aria-label="Open menu"><Menu size={20}/></button><div className="crumb"><span>APML Portal</span><ChevronRight size={14}/><strong>{active}</strong></div><div className="top-actions"><span className="status-pill"><i/> Portal workspace</span><Link className="top-link" to="/about">About <ExternalLink size={13}/></Link></div></header>
      <main className="page-content"><Outlet/></main>
      <footer className="footer"><span>© {new Date().getFullYear()} APML Portal</span><div><Link to="/about">About</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link></div></footer>
    </div>
  </div>
}