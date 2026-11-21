import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, AlertTriangle, CloudOff, RefreshCw, Globe, Server, Database, Wifi, Package, Smartphone } from 'lucide-react'
import './SystemHealth.css'

const WORKER_HEALTH='https://apml-drive-api.kundar-work.workers.dev/health'
const FIREBASE_HEALTH='https://apml-portal-default-rtdb.firebaseio.com/analytics/daily_logs.json?shallow=true'
const assets=[import.meta.env.BASE_URL+'logo.svg',import.meta.env.BASE_URL+'other/logo.svg',import.meta.env.BASE_URL+'notify.js',import.meta.env.BASE_URL+'manifest.webmanifest',import.meta.env.BASE_URL+'pwa-192.svg',import.meta.env.BASE_URL+'pwa-512.svg',import.meta.env.BASE_URL+'sw.js']
const services=[
 {id:'portal',name:'Portal frontend',icon:Globe,detail:'Testing this page and static site assets.'},
 {id:'api',name:'Cloudflare Worker',icon:Server,detail:'Checking the APML Cloudflare Worker health route.'},
 {id:'firebase',name:'Firebase database',icon:Database,detail:'Checking access to the analytics daily-log path.'},
 {id:'browser',name:'Browser connection',icon:Wifi,detail:'Checking this device network state.'},
 {id:'assets',name:'Portal static assets',icon:Package,detail:'Testing the bundled public logo and notification script.'},
 {id:'pwa',name:'PWA service worker',icon:Smartphone,detail:'Checking service-worker registration.'}
]
const label=s=>s==='operational'?'Operational':s==='degraded'?'Degraded':s==='offline'?'Offline':'Checking'
export default function SystemHealth(){
 const [status,setStatus]=useState(Object.fromEntries(services.map(s=>[s.id,{status:'checking',value:'Checking',message:s.detail}])))
 const [overall,setOverall]=useState('checking'),[checked,setChecked]=useState('—'),[busy,setBusy]=useState(false),[history,setHistory]=useState([])
 const [uptime]=useState(Date.now())
 const update=(id,next)=>setStatus(old=>({...old,[id]:next}))
 const refresh=useCallback(async()=>{
  setBusy(true);let workerOk=false,firebaseOk=false,assetFailed=0,workerMs=0
  try{
   const start=performance.now(),response=await fetch(WORKER_HEALTH+'?ts='+Date.now(),{cache:'no-store'});workerMs=Math.round(performance.now()-start)
   if(!response.ok)throw new Error('Cloudflare Worker returned HTTP '+response.status)
   const data=await response.json();workerOk=data.ok!==false
   update('api',{status:workerOk?'operational':'degraded',value:workerMs+' ms',message:'Worker health endpoint responded'+(data.version?' · '+data.version:'')+'.'})
   setHistory(h=>[workerMs,...h].slice(0,24))
  }catch(e){update('api',{status:'offline',value:'Unavailable',message:e.message||'Worker health check failed.'})}
  try{
   const start=performance.now(),response=await fetch(FIREBASE_HEALTH+'&ts='+Date.now(),{cache:'no-store'});const elapsed=Math.round(performance.now()-start)
   if(!response.ok)throw new Error('Firebase returned HTTP '+response.status)
   await response.json();firebaseOk=true;update('firebase',{status:'operational',value:elapsed+' ms',message:'Firebase analytics daily-log endpoint responded.'})
  }catch(e){update('firebase',{status:'degraded',value:'Unavailable',message:e.message||'Firebase check failed.'})}
  const assetResults=await Promise.all(assets.map(async path=>{try{const t=performance.now(),r=await fetch(path,{method:'HEAD',cache:'no-store'});return{ok:r.ok,ms:Math.round(performance.now()-t)}}catch{return{ok:false,ms:0}}}))
  assetFailed=assetResults.filter(x=>!x.ok).length
  update('assets',{status:assetFailed?'degraded':'operational',value:assetFailed?assetFailed+' failed':'All available',message:assetFailed?assetFailed+' of '+assets.length+' public assets could not be reached.':'All tested public assets responded.'})
  update('portal',{status:'operational',value:'Online',message:'This React page is loaded and responding.'})
  update('browser',{status:navigator.onLine?'operational':'offline',value:navigator.onLine?'Online':'Offline',message:'Browser network connectivity.'})
  let sw='Not registered',swStatus='degraded'
  if('serviceWorker' in navigator){try{const regs=await navigator.serviceWorker.getRegistrations();sw=regs.length?(navigator.serviceWorker.controller?'Active':'Registered'):'Not registered';swStatus=regs.length?'operational':'degraded'}catch(e){sw='Unavailable'}}
  update('pwa',{status:swStatus,value:sw,message:swStatus==='operational'?'Network-only service worker is registered; this app does not currently cache pages for offline use.':'Service-worker registration is not available in this browser.'})
  const overallStatus=!navigator.onLine?'offline':!workerOk||!firebaseOk||assetFailed?'degraded':'operational'
  setOverall(overallStatus);setChecked(new Date().toLocaleTimeString('en-IN'));setBusy(false)
 },[])
 useEffect(()=>{refresh();const id=setInterval(()=>refresh(),30000);return()=>clearInterval(id)},[refresh])
 const max=Math.max(1,...history)
 const OverallIcon=overall==='operational'?CheckCircle2:overall==='degraded'?AlertTriangle:overall==='offline'?CloudOff:Activity
 const browser=useMemo(()=>{const ua=navigator.userAgent;return /Edg\//.test(ua)?'Edge':/Chrome\//.test(ua)?'Chrome':/Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)?'Safari':'Browser'},[])
 return <div className="health-page">
  <header className="health-heading"><div><span className="health-kicker"><Activity size={14}/> OPERATIONS</span><h1>System health</h1><p>A live overview of the portal and its connected infrastructure.</p></div><div className="health-controls"><span>Auto-refresh · 30 sec</span><button onClick={refresh} disabled={busy}><RefreshCw size={16} className={busy?'spin':''}/> {busy?'Checking…':'Refresh now'}</button></div></header>
  <section className={'health-overall '+overall}><div className="health-overall-icon"><OverallIcon size={25}/></div><div className="health-overall-copy"><strong>{overall==='checking'?'Checking systems…':overall==='operational'?'All monitored services operational':overall==='degraded'?'Some services need attention':'Connection unavailable'}</strong><span>{overall==='operational'?'The static portal, Worker and Firebase checks are responding normally.':'Review the service cards below for the latest check results.'}</span></div><b>{label(overall)}</b></section>
  <section className="health-grid">{services.map(s=>{const Icon=s.icon;const item=status[s.id];return <article className={'health-service '+item.status} key={s.id}><div className="health-service-top"><span><Icon size={19}/></span><strong>{s.name}</strong><i/></div><div className="health-service-meta"><span>{s.id==='api'||s.id==='firebase'||s.id==='assets'?'Response / state':'Status'}</span><b>{item.value}</b></div><p>{item.message}</p></article>})}</section>
  <section className="health-bottom"><article className="health-panel"><h2>Worker response history</h2><div className="health-bars">{history.length?history.slice().reverse().map((v,i)=><i key={i} style={{height:Math.max(5,Math.round(v/max*52))+'px'}} title={v+' ms'}/>):<span>Waiting for the first check.</span>}</div><small>{history.length?'Latest Worker response: '+history[0]+' ms · '+history.length+' checks in this session':'Waiting for the first check.'}</small></article><article className="health-panel"><h2>Runtime details</h2><div className="health-info"><span>Last checked</span><b>{checked}</b></div><div className="health-info"><span>Page uptime</span><b>{Math.floor((Date.now()-uptime)/60000)} min</b></div><div className="health-info"><span>Browser</span><b>{browser}</b></div><div className="health-info"><span>Service refresh</span><b>30 seconds</b></div></article></section>
  <p className="health-disclaimer"><strong>Monitoring scope:</strong> Checks report availability from this browser. Firebase status verifies the analytics daily-log read path only. The PWA service worker is not yet migrated. This page does not inspect server CPU, memory, private credentials or employee data.</p>
 </div>
}
