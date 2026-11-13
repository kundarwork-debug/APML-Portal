import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, CheckCircle2, AlertTriangle, CloudOff, RefreshCw, Globe, Server, Database, Wifi, Package, Smartphone, Clock3 } from 'lucide-react'
import './SystemHealth.css'

const assets=['/core/common.css','/core/common.js','/core/visitor-tracker.js']
const services=[
  {id:'portal',name:'Portal frontend',icon:Globe,detail:'Testing this page and shared assets.'},
  {id:'api',name:'Vercel API',icon:Server,detail:'Checking serverless function availability.'},
  {id:'firebase',name:'Firebase database',icon:Database,detail:'Checking the analytics daily-log read path.'},
  {id:'browser',name:'Browser connection',icon:Wifi,detail:'Checking whether this device is online.'},
  {id:'assets',name:'Core portal assets',icon:Package,detail:'Testing shared CSS, JavaScript and visitor tracker.'},
  {id:'pwa',name:'PWA service worker',icon:Smartphone,detail:'Checking registration and active controller.'}
]
const label=s=>s==='operational'?'Operational':s==='degraded'?'Degraded':s==='offline'?'Offline':'Checking'
export default function SystemHealth(){
 const [status,setStatus]=useState(Object.fromEntries(services.map(s=>[s.id,{status:'checking',value:'Checking',message:s.detail}])))
 const [overall,setOverall]=useState('checking'),[checked,setChecked]=useState('—'),[busy,setBusy]=useState(false),[history,setHistory]=useState([])
 const [uptime]=useState(Date.now())
 const update=(id,next)=>setStatus(old=>({...old,[id]:next}))
 const refresh=useCallback(async()=>{
  setBusy(true)
  try{
   const start=performance.now()
   const response=await fetch('/api/system-health?ts='+Date.now(),{cache:'no-store'})
   const elapsed=Math.round(performance.now()-start)
   if(!response.ok)throw new Error('Health endpoint returned HTTP '+response.status)
   const data=await response.json()
   update('api',{status:'operational',value:elapsed+' ms',message:'Health endpoint responded successfully.'})
   const db=(data.checks||[]).find(x=>x.id==='firebase')
   if(db)update('firebase',{status:db.status,value:(db.latencyMs??0)+' ms',message:db.message||'Analytics daily-log read path responded.'})
   const assetResults=await Promise.all(assets.map(async path=>{try{const t=performance.now();const r=await fetch(path,{method:'HEAD',cache:'no-store'});return {ok:r.ok,ms:Math.round(performance.now()-t)}}catch{return {ok:false,ms:0}}}))
   const failed=assetResults.filter(x=>!x.ok).length
   update('assets',{status:failed?'degraded':'operational',value:failed?failed+' failed':'All available',message:failed?failed+' of '+assets.length+' core assets could not be reached.':'All tested shared assets responded.'})
   update('portal',{status:'operational',value:'Online',message:'This page is loaded and responding.'})
   update('browser',{status:navigator.onLine?'operational':'offline',value:navigator.onLine?'Online':'Offline',message:'Browser network connectivity.'})
   let sw='Not supported',swStatus='degraded'
   if('serviceWorker' in navigator){const regs=await navigator.serviceWorker.getRegistrations();sw=regs.length?(navigator.serviceWorker.controller?'Active':'Registered'):'Not registered';swStatus=regs.length?'operational':'degraded'}
   update('pwa',{status:swStatus,value:sw,message:'Service worker registration and controller state.'})
   const overallStatus=!navigator.onLine?'offline':(data.overall==='degraded'||failed||swStatus==='degraded')?'degraded':'operational'
   setOverall(overallStatus);setHistory(h=>[elapsed,...h].slice(0,24))
  }catch(e){
   update('api',{status:'offline',value:'Unavailable',message:e.message||'Health endpoint could not be reached.'})
   update('firebase',{status:'degraded',value:'Not checked',message:'Backend health endpoint did not return a result.'})
   update('assets',{status:'degraded',value:'Not checked',message:'Could not complete asset checks.'})
   update('portal',{status:'operational',value:'Loaded',message:'React application is running in this browser.'})
   update('browser',{status:navigator.onLine?'operational':'offline',value:navigator.onLine?'Online':'Offline',message:'Browser network connectivity.'})
   setOverall(navigator.onLine?'degraded':'offline')
  }finally{setChecked(new Date().toLocaleTimeString('en-IN'));setBusy(false)}
 },[])
 useEffect(()=>{refresh();const id=setInterval(()=>refresh(),30000);return()=>clearInterval(id)},[])
 const max=Math.max(1,...history)
 const OverallIcon=overall==='operational'?CheckCircle2:overall==='degraded'?AlertTriangle:overall==='offline'?CloudOff:Activity
 const browser=useMemo(()=>{const ua=navigator.userAgent;return /Edg\//.test(ua)?'Edge':/Chrome\//.test(ua)?'Chrome':/Firefox\//.test(ua)?'Firefox':/Safari\//.test(ua)?'Safari':'Browser'},[])
 return <div className="health-page">
  <header className="health-heading"><div><span className="health-kicker"><Activity size={14}/> OPERATIONS</span><h1>System health</h1><p>A live overview of the portal, API and connected infrastructure.</p></div><div className="health-controls"><span>Auto-refresh · 30 sec</span><button onClick={refresh} disabled={busy}><RefreshCw size={16} className={busy?'spin':''}/> {busy?'Checking…':'Refresh now'}</button></div></header>
  <section className={'health-overall '+overall}><div className="health-overall-icon"><OverallIcon size={25}/></div><div className="health-overall-copy"><strong>{overall==='checking'?'Checking systems…':overall==='operational'?'All monitored systems operational':overall==='degraded'?'Some services need attention':'Connection unavailable'}</strong><span>{overall==='operational'?'The portal and monitored backend checks are responding normally.':'Review the service cards below for the latest check results.'}</span></div><b>{label(overall)}</b></section>
  <section className="health-grid">{services.map(s=>{const Icon=s.icon;const item=status[s.id];return <article className={'health-service '+item.status} key={s.id}><div className="health-service-top"><span><Icon size={19}/></span><strong>{s.name}</strong><i/></div><div className="health-service-meta"><span>{s.id==='api'||s.id==='firebase'||s.id==='assets'?'Response / state':'Status'}</span><b>{item.value}</b></div><p>{item.message}</p></article>})}</section>
  <section className="health-bottom"><article className="health-panel"><h2>Response history</h2><div className="health-bars">{history.length?history.slice().reverse().map((v,i)=><i key={i} style={{height:Math.max(5,Math.round(v/max*52))+'px'}} title={v+' ms'}/>):<span>Waiting for the first check.</span>}</div><small>{history.length?'Latest API response: '+history[0]+' ms · '+history.length+' checks in this session':'Waiting for the first check.'}</small></article><article className="health-panel"><h2>Runtime details</h2><div className="health-info"><span>Last checked</span><b>{checked}</b></div><div className="health-info"><span>Page uptime</span><b>{Math.floor((Date.now()-uptime)/60000)} min</b></div><div className="health-info"><span>Browser</span><b>{browser}</b></div><div className="health-info"><span>Service refresh</span><b>30 seconds</b></div></article></section>
  <p className="health-disclaimer"><strong>Monitoring scope:</strong> These checks report availability from this browser's point of view. Firebase status verifies the analytics daily-log read path only. This page does not inspect server CPU, memory, private credentials or employee data. A green status is not a guarantee that every portal feature is working.</p>
 </div>
}