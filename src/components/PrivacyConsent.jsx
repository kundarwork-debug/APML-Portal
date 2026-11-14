import {useEffect,useState} from 'react'
import {Link,useLocation} from 'react-router-dom'
import {Cookie,ShieldCheck} from 'lucide-react'
import './PrivacyConsent.css'

const PRIVACY_KEY='apml-privacy-consent'
const ANALYTICS_KEY='apml-analytics-consent'
const DISMISSED_KEY='apml-privacy-dismissed'

function readChoice(){
  try{
    const saved=JSON.parse(localStorage.getItem(PRIVACY_KEY)||'null')
    if(saved&&typeof saved.analytics==='boolean')return saved
    if(localStorage.getItem(ANALYTICS_KEY)==='yes')return{essential:true,analytics:true}
    if(localStorage.getItem(ANALYTICS_KEY)==='no')return{essential:true,analytics:false}
  }catch(_){}
  return null
}

export default function PrivacyConsent(){
  const location=useLocation()
  const [open,setOpen]=useState(false)

  useEffect(()=>{
    const review=()=>{
      try{
        localStorage.removeItem(PRIVACY_KEY)
        localStorage.removeItem(ANALYTICS_KEY)
        sessionStorage.removeItem(DISMISSED_KEY)
      }catch(_){}
      setOpen(true)
    }
    window.addEventListener('apml:review-privacy',review)
    const choice=readChoice()
    let dismissed=false
    try{dismissed=sessionStorage.getItem(DISMISSED_KEY)==='yes'}catch(_){}
    setOpen(Boolean(!choice&&!dismissed&&location.pathname!=='/cookies'))
    return()=>window.removeEventListener('apml:review-privacy',review)
  },[location.pathname])

  function saveChoice(analytics){
    const choice={essential:true,analytics,updatedAt:Date.now()}
    try{
      localStorage.setItem(PRIVACY_KEY,JSON.stringify(choice))
      localStorage.setItem(ANALYTICS_KEY,analytics?'yes':'no')
      sessionStorage.removeItem(DISMISSED_KEY)
    }catch(_){}
    setOpen(false)
    window.dispatchEvent(new CustomEvent('apml-analytics-consent-changed',{detail:choice}))
    if(analytics)window.dispatchEvent(new Event('apml-analytics-consent-granted'))
  }

  function dismiss(){
    try{sessionStorage.setItem(DISMISSED_KEY,'yes')}catch(_){}
    setOpen(false)
  }

  useEffect(()=>{
    if(!open)return
    const onKey=e=>{if(e.key==='Escape')dismiss()}
    document.addEventListener('keydown',onKey)
    return()=>document.removeEventListener('keydown',onKey)
  },[open])

  if(!open)return null
  return <div className="privacy-consent-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)dismiss()}}>
    <section className="privacy-consent-card" role="dialog" aria-modal="true" aria-labelledby="privacy-consent-title" aria-describedby="privacy-consent-copy">
      <div className="privacy-consent-icon"><Cookie size={27}/></div>
      <div className="privacy-consent-eyebrow"><ShieldCheck size={14}/> YOUR PRIVACY, YOUR CHOICE</div>
      <h2 id="privacy-consent-title">Your privacy choices</h2>
      <p id="privacy-consent-copy">APML Portal uses essential browser storage to keep the workspace working. Optional visitor analytics help us understand portal usage and improve the experience. Analytics stay off unless you allow them.</p>
      <p className="privacy-consent-policy">You can change your choice later from the <Link to="/cookies" onClick={()=>setOpen(false)}>Cookies &amp; Storage Policy</Link>.</p>
      <div className="privacy-consent-actions">
        <button className="privacy-consent-allow" onClick={()=>saveChoice(true)}>Allow analytics</button>
        <button className="privacy-consent-decline" onClick={()=>saveChoice(false)}>Decline</button>
      </div>
      <button className="privacy-consent-dismiss" onClick={dismiss}>Not now</button>
    </section>
  </div>
}
