import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const API = 'https://apml-drive-api.kundar-work.workers.dev/visitor/collect'
const makeId = () => window.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2))
const safePage = value => String(value || '/').split('?')[0].split('#')[0].slice(0, 120) || '/'

export default function VisitorAnalyticsTracker() {
  const location = useLocation()
  const session = useRef(null)
  const lastTick = useRef(Date.now())
  const lastPage = useRef('')
  const send = useRef(null)

  useEffect(() => {
    try {
      let sessionId = sessionStorage.getItem('apml-visitor-session')
      if (!sessionId) { sessionId = makeId(); sessionStorage.setItem('apml-visitor-session', sessionId) }
      session.current = {
        sessionId,
        startedAt: Number(sessionStorage.getItem('apml-visitor-started') || 0) || Date.now(),
      }
      sessionStorage.setItem('apml-visitor-started', String(session.current.startedAt))
    } catch {
      session.current = { sessionId: makeId(), startedAt: Date.now(), displayName: '' }
    }
    lastTick.current = Date.now()
    send.current = async pageView => {
      if (!session.current) return
      const now = Date.now()
      const seconds = Math.min(120, Math.max(0, Math.round((now - lastTick.current) / 1000)))
      lastTick.current = now
      const payload = {
        sessionId: session.current.sessionId,
        startedAt: session.current.startedAt,
        page: safePage(window.location.pathname),
        pageView: !!pageView,
        seconds
      }
      try {
        await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), keepalive: true })
      } catch { /* Telemetry must never block portal navigation. */ }
    }
    return () => { send.current = null; session.current = null }
  }, [])

  useEffect(() => {
    const page = safePage(location.pathname)
    if (lastPage.current === page) return
    lastPage.current = page
    send.current?.(true)
  }, [location.pathname])

  useEffect(() => {
    const heartbeat = window.setInterval(() => send.current?.(false), 30000)
    const flush = () => send.current?.(false)
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', flush)
    return () => {
      window.clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('pagehide', flush)
    }
  }, [])

  return null
}
