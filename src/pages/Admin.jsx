import { useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Activity, LockKeyhole, LogIn, ShieldCheck, ArrowLeft, RefreshCw } from 'lucide-react'
import { useApmlAdminAuth } from '../lib/firebaseAuth'
import './Admin.css'

export default function Admin(){
 const {admin,userEmail,loading,signIn,signOut}=useApmlAdminAuth()
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const location=useLocation()
 const child=location.pathname!=='/admin' && location.pathname!=='/admin/'
 const login=async()=>{setBusy(true);setError('');try{await signIn()}catch(e){setError(e.message||'Could not start administrator sign-in.');setBusy(false)}}
 if(loading)return <main className="admin-gate"><div className="admin-gate-card"><RefreshCw className="admin-spin"/><h1>Checking administrator access</h1><p>Verifying your secure session…</p></div></main>
 if(!admin)return <main className="admin-gate"><div className="admin-gate-card"><span className="admin-lock"><LockKeyhole size={25}/></span><span className="admin-kicker">APML PORTAL · RESTRICTED AREA</span><h1>Administrator access</h1><p>This area contains private portal analytics and quality reports. Sign in with an approved administrator Google account to continue.</p><button className="admin-login" onClick={login} disabled={busy}><LogIn size={17}/>{busy?'Connecting…':'Continue with Google'}</button>{error&&<p className="admin-error">{error}</p>}<Link to="/" className="admin-back">← Back to portal</Link></div></main>
 return <main className="admin-page">
  <header className="admin-top"><div><span className="admin-kicker"><ShieldCheck size={14}/> SECURE WORKSPACE</span><h1>Admin console</h1><p>Manage private portal tools and reports.</p></div><div className="admin-session"><span>{userEmail}</span><button onClick={signOut}>Sign out</button></div></header>
  {!child?<AdminHome/>:<div className="admin-child"><Link to="/admin" className="admin-back-link"><ArrowLeft size={15}/> Admin dashboard</Link><Outlet/></div>}
 </main>
}
export function AdminHome(){
 return <section className="admin-tools"><Link to="/admin/quality-monitor" className="admin-tool-card"><span className="admin-tool-icon quality"><ShieldCheck size={22}/></span><span className="admin-tool-copy"><b>Quality Monitor</b><small>Build checks, dependency security, live links and Lighthouse audits.</small><em>Open quality monitor →</em></span></Link></section>
}
