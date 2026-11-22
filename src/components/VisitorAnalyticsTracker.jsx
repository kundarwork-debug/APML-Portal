import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { MapPin, ShieldCheck, X } from 'lucide-react'
import './VisitorAnalyticsTracker.css'

const API = 'https://apml-drive-api.kundar-work.workers.dev/visitor/collect'
const CONSENT_KEY = 'apml-visitor-analytics-consent'

function id() {
  return window.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2))
}

function cleanPath(path) {
  return String(path || '/').split('?')[0].split('#')[0].slice(0, 120) || '/'
}

export default function VisitorAnalyticsTracker() {
  const location = useLocation()
  const [choice, setChoice] = useState(() => {
    try { return localStorage.getItem(CONSENT_KEY) || '' } catch { return '' }
  })
  const [open, setOpen] = useState(!choice)
  const session = useRef(null)
  const lastTick = useRef(Date.now())
  const lastPath = useRef('')
  const sendRef = useRef(null)

  useEffect(() => {
    if (choice !== 'accepted') return
    try {
      let visitorId = localStorage.getItem('apml-visitor-id')
      if (!visitorId) { visitorId = id(); localStorage.setItem('apml-visitor-id', visitorId) }
      let sessionId = sessionStorage.getItem('apml-visitor-session')
      if (!sessionId) { sessionId = id(); sessionStorage.setItem('apml-visitor-session', sessionId) }
      session.current = {
        visitorId, sessionId, startedAt: Date.now(),
        displayName: (localStorage.getItem('apml-welcome-name') || '').trim().slice(0, 32)
      }
    } catch {
      session.current = { visitorId: id(), sessionId: id(), startedAt: Date.now(), displayName: '' }
    }
    lastTick.current = Date.now()
    lastPath.current = ''
    sendRef.current = async (pageView = false) => {
      if (!session.current) return
      const now = Date.now()
      const seconds = Math.min(120, Math.max(0, Math.round((now - lastTick.current) / 1000)))
      lastTick.current = now
      const page = cleanPath(window.location.pathname)
      const payload = {
        consent: true,
        visitorId: session.current.visitorId,
        sessionId: session.current.sessionId,
        startedAt: session.current.startedAt,
        displayName: session.current.displayName,
        page,
        pageView,
        seconds,
        timestamp: now
      }
      try {
        await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true
        })
      } catch { /* Analytics is optional; never interrupt portal use. */ }
    }
    return () => { sendRef.current = null; session.current = null }
  }, [choice])

  useEffect(() => {
    if (choice !== 'accepted') return
    const path = cleanPath(location.pathname)
    if (lastPath.current === path) return
    lastPath.current = path
    sendRef.current?.(true)
  }, [choice, location.pathname])

  useEffect(() => {
    if (choice !== 'accepted') return
    const heartbeat = window.setInterval(() => sendRef.current?.(false), 30000)
    const flush = () => sendRef.current?.(false)
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      window.clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [choice])

  const decide = value => {
    try { localStorage.setItem(CONSENT_KEY, value) } catch {}
    setChoice(value)
    setOpen(false)
  }

  if (!open || choice) return null
  return <aside className="apml-visitor-consent" role="dialog" aria-label="Optional visitor analytics">
    <div className="apml-visitor-consent-icon"><ShieldCheck size={20} /></div>
    <div className="apml-visitor-consent-copy">
      <strong>Help improve APML Portal</strong>
      <p>Allow optional, privacy-conscious analytics? We record pages visited, approximate city/region/country, device category and visit duration to understand portal usage. We do not store your IP address. Your saved homepage name may be included; otherwise you are recorded as Anonymous. You can decline and still use every portal feature.</p>
      <a href="/privacy" target="_blank" rel="noreferrer">Read the Privacy Policy</a>
    </div>
    <div className="apml-visitor-consent-actions">
      <button type="button" className="apml-visitor-accept" onClick={() => decide('accepted')}>Allow analytics</button>
      <button type="button" className="apml-visitor-decline" onClick={() => decide('declined')}>Decline</button>
    </div>
    <button type="button" className="apml-visitor-dismiss" onClick={() => decide('declined')} aria-label="Close analytics notice"><X size={16}/></button>
  </aside>
}
