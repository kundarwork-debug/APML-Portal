import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { getApmlDatabase } from '../lib/firebase'

const COOLDOWN_MS = 30 * 60 * 1000
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
function getStoredId(key) {
  try {
    let value=localStorage.getItem(key)
    if(!value){value=makeId();localStorage.setItem(key,value)}
    return value
  } catch { return makeId() }
}
export default function VisitorAnalyticsTracker(){
  const location=useLocation(), lastPage=useRef('')
  useEffect(()=>{
    let live=true, timer=null, sessionRef=null, routeHandler=null
    const bootstrap=async()=>{
      try{
        const visitorId=getStoredId('apml-firebase-visitor-id')
        let sessionId
        try{
          sessionId=sessionStorage.getItem('apml-firebase-visitor-session')||makeId()
          sessionStorage.setItem('apml-firebase-visitor-session',sessionId)
        }catch{sessionId=makeId()}
        const startedAt=Date.now()
        const database=await getApmlDatabase()
        if(!live)return
        const ua=navigator.userAgent||'', device=getDevice(ua), browser=getBrowser(ua), os=getOS(ua)
        let place={city:'',region:'',country:''}
        try {
          const response=await fetch('https://apml-drive-api.kundar-work.workers.dev/visitor/location',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId}),cache:'no-store'})
          if(response.ok){const result=await response.json();place={city:String(result.city||'').slice(0,80),region:String(result.region||'').slice(0,80),country:String(result.country||'').slice(0,2)}}
        } catch(error) { console.warn('[APML visitor] Approximate location lookup unavailable:',error) }
        if(!live)return
        const now=Date.now(), day=istDay()
        const visitorRef=database.ref('visitor_intelligence/visitors/'+visitorId)
        const visitResult=await visitorRef.transaction(current=>{
          const old=current||{}
          const counted=!Number(old.lastCountedAt)||now-Number(old.lastCountedAt)>=COOLDOWN_MS
          return {
            visitorId,
            firstSeen:Number(old.firstSeen)||now,
            lastSeen:now,
            lastCountedAt:counted?now:Number(old.lastCountedAt),
            visitCount:(Number(old.visitCount)||0)+(counted?1:0),
            city:place.city||old.city||'',
            region:place.region||old.region||'',
            country:place.country||old.country||'',
            device,browser,os
          }
        })
        const visitor=visitResult.snapshot.val()||{}
        const countedThisVisit=Number(visitor.lastCountedAt)===now
        const dailyRef=database.ref('visitor_intelligence/daily/'+day+'/'+visitorId)
        if(countedThisVisit){
          await dailyRef.transaction(current=>({...current,visits:(Number(current?.visits)||0)+1,firstSeen:Number(current?.firstSeen)||now,lastVisit:now,city:place.city,region:place.region,country:place.country,device,browser,os}))
        }else{
          await dailyRef.update({lastSeen:now,city:place.city,region:place.region,country:place.country,device,browser,os})
        }
        const sessionPath=database.ref('visitor_intelligence/sessions/'+visitorId+'/'+sessionId)
        sessionRef=sessionPath
        let lastTick=Date.now(), pages={}
        const initial=safePage(window.location.pathname)
        lastPage.current=initial
        const bump=path=>{const key=safeKey(path),old=pages[key]||{name:path,views:0};pages[key]={name:path,views:old.views+1}}
        bump(initial)
        const write=async(path,increment=false)=>{
          if(!live)return
          const timestamp=Date.now(),seconds=Math.min(120,Math.max(0,Math.floor((timestamp-lastTick)/1000)))
          if(increment)bump(path)
          lastTick=timestamp
          const snap=await sessionPath.once('value'),old=snap.val()||{},oldPages=old.pages||{}
          const merged={...oldPages,...pages}
          const totalViews=Object.values(merged).reduce((sum,page)=>sum+(Number(page.views)||0),0)
          await sessionPath.set({visitorId,startedAt,lastSeen:timestamp,online:true,currentPage:path,pageViews:totalViews,totalSeconds:(Number(old.totalSeconds)||0)+seconds,pages:merged,device,browser,os,city:place.city,region:place.region,country:place.country})
          await dailyRef.update({lastSeen:timestamp})
          publishStatus({state:'connected',message:'Visitor analytics is recording to the new Firebase project.',backend:'portalapml'})
        }
        await write(initial,false)
        try{await sessionPath.onDisconnect().update({online:false,lastSeen:Date.now()})}catch{}
        routeHandler=event=>{
          const path=safePage(event.detail||window.location.pathname)
          write(path,true).catch(error=>publishStatus({state:'error',message:error.message||'Firebase visitor write failed.',backend:'portalapml'}))
        }
        window.addEventListener('apml:visitor-route',routeHandler)
        timer=window.setInterval(()=>write(lastPage.current||initial,false).catch(error=>publishStatus({state:'error',message:error.message||'Firebase visitor heartbeat failed.',backend:'portalapml'})),30000)
      }catch(error){if(live)publishStatus({state:'error',message:error.message||'Firebase visitor tracking failed.',backend:'portalapml'})}
    }
    publishStatus({state:'connecting',message:'Connecting visitor analytics to the new Firebase project.',backend:'portalapml'})
    bootstrap()
    return ()=>{
      live=false
      if(timer)clearInterval(timer)
      if(routeHandler)window.removeEventListener('apml:visitor-route',routeHandler)
      try{sessionRef?.onDisconnect().update({online:false,lastSeen:Date.now()})}catch{}
    }
  },[])
  useEffect(()=>{
    const page=safePage(location.pathname)
    if(page===lastPage.current)return
    lastPage.current=page
    window.dispatchEvent(new CustomEvent('apml:visitor-route',{detail:page}))
  },[location.pathname])
  return null
}
