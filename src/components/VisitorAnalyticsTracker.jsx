import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { getApmlPresenceServices } from '../lib/firebase'

const makeId = () => (window.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
const safePage = value => String(value || '/').split('?')[0].split('#')[0].slice(0, 120) || '/'
const safeKey = value => btoa(unescape(encodeURIComponent(String(value)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'').slice(0,120) || 'page'
const getDevice = ua => /tablet|ipad/i.test(ua) ? 'Tablet' : /mobile|android|iphone/i.test(ua) ? 'Mobile' : 'Desktop'
const getBrowser = ua => /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Other'
const getOS = ua => /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : /Linux/i.test(ua) ? 'Linux' : 'Other'
const istDay = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
function publishStatus(detail) {
  const status={...detail,checkedAt:Date.now()}
  window.__apmlVisitorTrackerStatus=status
  window.dispatchEvent(new CustomEvent('apml:visitor-tracker-status',{detail:status}))
}
export default function VisitorAnalyticsTracker(){
  const location=useLocation(), sessionRef=useRef(null), lastPage=useRef('')
  useEffect(()=>{
    let live=true, timer=null, db, sessionDb, uid, sessionId, startedAt, lastTick=Date.now()
    const bootstrap=async()=>{
      try{
        sessionId=sessionStorage.getItem('apml-firebase-visitor-session')||makeId()
        sessionStorage.setItem('apml-firebase-visitor-session',sessionId)
        const saved=Number(sessionStorage.getItem('apml-firebase-visitor-started-at'))
        startedAt=saved>0?saved:Date.now()
        sessionStorage.setItem('apml-firebase-visitor-started-at',String(startedAt))
      }catch{sessionId=makeId();startedAt=Date.now()}
      sessionRef.current={sessionId,startedAt}
      try{
        const services=await getApmlPresenceServices()
        if(!live)return
        db=services.database; uid=services.user.uid
        sessionDb=db.ref('visitor_intelligence/sessions/'+uid+'/'+sessionId)
        const ua=navigator.userAgent||'', device=getDevice(ua), browser=getBrowser(ua), os=getOS(ua)
        const initial=safePage(window.location.pathname); lastPage.current=initial
        let pages={}
        const bump=path=>{const key=safeKey(path),old=pages[key]||{name:path,views:0};pages[key]={name:path,views:old.views+1}}
        bump(initial)
        await db.ref('visitor_intelligence/daily/'+istDay()+'/'+uid).set(true)
        const write=async(path,increment=false)=>{
          if(!live)return
          const now=Date.now(),seconds=Math.min(120,Math.max(0,Math.floor((now-lastTick)/1000)))
          if(increment)bump(path)
          lastTick=now
          const snap=await sessionDb.once('value'),old=snap.val()||{},oldPages=old.pages||{}
          const merged={...oldPages,...pages}
          const totalViews=Object.values(merged).reduce((sum,p)=>sum+(Number(p.views)||0),0)
          await sessionDb.set({startedAt,lastSeen:now,online:true,currentPage:path,pageViews:totalViews,totalSeconds:(Number(old.totalSeconds)||0)+seconds,pages:merged,device,browser,os})
          publishStatus({state:'connected',message:'Visitor session is being recorded directly in Firebase.',backend:'firebase'})
        }
        await write(initial,false)
        try{sessionDb.onDisconnect().update({online:false,lastSeen:Date.now()})}catch{}
        const onRoute=event=>{const path=safePage(event.detail||window.location.pathname);write(path,true).catch(err=>publishStatus({state:'error',message:err.message||'Firebase visitor write failed.',backend:'firebase'}))}
        window.addEventListener('apml:visitor-route',onRoute)
        timer=window.setInterval(()=>write(lastPage.current||initial,false).catch(err=>publishStatus({state:'error',message:err.message||'Firebase visitor write failed.',backend:'firebase'})),30000)
        return ()=>window.removeEventListener('apml:visitor-route',onRoute)
      }catch(err){if(live)publishStatus({state:'error',message:err.message||'Firebase visitor tracker failed.',backend:'firebase'})}
    }
    publishStatus({state:'connecting',message:'Connecting directly to Firebase visitor tracking.',backend:'firebase'})
    let routeCleanup
    bootstrap().then(cleanup=>{routeCleanup=cleanup})
    return ()=>{live=false;if(timer)clearInterval(timer);if(routeCleanup)routeCleanup();try{sessionDb?.onDisconnect().update({online:false,lastSeen:Date.now()})}catch{}}
  },[])
  useEffect(()=>{
    const page=safePage(location.pathname)
    if(page===lastPage.current)return
    lastPage.current=page
    window.dispatchEvent(new CustomEvent('apml:visitor-route',{detail:page}))
  },[location.pathname])
  return null
}
