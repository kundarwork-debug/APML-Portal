import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const API = 'https://apml-drive-api.kundar-work.workers.dev/visitor/collect'
const makeId = () => window.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2))
const safePage = value => String(value || '/').split('?')[0].split('#')[0].slice(0, 120) || '/'

function publishStatus(detail) {
  const status = { ...detail, checkedAt: Date.now() }
  window.__apmlVisitorTrackerStatus = status
  window.dispatchEvent(new CustomEvent('apml:visitor-tracker-status', { detail: status }))
}

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
      session.current = { sessionId: makeId(), startedAt: Date.now() }
    }
    lastTick.current = Date.now()
    publishStatus({ state: 'sending', message: 'Sending first visitor heartbeat…' })
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
        const response = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: true,
          cache: 'no-store',
          credentials: 'omit'
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || result.ok !== true) {
          const message = result.error || ('Visitor endpoint returned HTTP ' + response.status)
          publishStatus({ state: 'error', message, httpStatus: response.status })
          return
        }
        publishStatus({
          state: 'connected',
          message: result.countedVisit ? 'Visitor recorded for today.' : (result.ignored ? 'Automated or unknown client was excluded.' : 'Session heartbeat received; 30-minute cooldown may apply.'),
          countedVisit: !!result.countedVisit,
          ignored: result.ignored || null,
          httpStatus: response.status
        })
      } catch (error) {
        publishStatus({ state: 'error', message: error?.message || 'Could not reach the visitor collection service.' })
      }
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
    const flush = () => { if (document.visibilityState === 'visible') send.current?.(false) }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('pagehide', () => send.current?.(false))
    return () => {
      window.clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [])

  return null
}
