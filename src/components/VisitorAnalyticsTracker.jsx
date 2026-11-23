import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'

const VISITOR_API = 'https://apml-drive-api.kundar-work.workers.dev/visitor/collect'
const makeId = () => {
  const value = window.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2))
  return value.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
}
const safePage = value => String(value || '/').split('?')[0].split('#')[0].slice(0, 120) || '/'
function publishStatus(detail) {
  const status = { ...detail, checkedAt: Date.now() }
  window.__apmlVisitorTrackerStatus = status
  window.dispatchEvent(new CustomEvent('apml:visitor-tracker-status', { detail: status }))
}

export default function VisitorAnalyticsTracker() {
  const location = useLocation()
  const sessionRef = useRef(null)
  const lastSentAt = useRef(Date.now())
  const ready = useRef(false)
  const lastPage = useRef('')

  useEffect(() => {
    let active = true
    let heartbeat = null
    let sessionId
    let startedAt
    try {
      sessionId = sessionStorage.getItem('apml-cloudflare-visitor-session')
      if (!sessionId) {
        sessionId = makeId()
        sessionStorage.setItem('apml-cloudflare-visitor-session', sessionId)
      }
      const savedStart = Number(sessionStorage.getItem('apml-cloudflare-visitor-started-at'))
      startedAt = savedStart > 0 ? savedStart : Date.now()
      sessionStorage.setItem('apml-cloudflare-visitor-started-at', String(startedAt))
    } catch {
      sessionId = makeId()
      startedAt = Date.now()
    }
    sessionRef.current = { sessionId, startedAt }

    const send = async (page, pageView, seconds = 0) => {
      if (!active || !sessionRef.current) return
      try {
        const response = await fetch(VISITOR_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: sessionRef.current.sessionId,
            startedAt: sessionRef.current.startedAt,
            page: safePage(page),
            pageView: !!pageView,
            seconds: Math.min(120, Math.max(0, Math.floor(seconds)))
          }),
          cache: 'no-store',
          keepalive: true
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || result.ok !== true) throw new Error(result.error || 'Cloudflare visitor collection failed (' + response.status + ').')
        if (!active) return
        ready.current = true
        lastSentAt.current = Date.now()
        lastPage.current = safePage(page)
        publishStatus({
          state: 'connected',
          message: result.ignored ? 'Automated or unidentified client excluded from visitor totals.' : 'Cloudflare visitor collection is active; approximate location is derived at the edge.',
          backend: 'cloudflare',
          ignored: result.ignored || null
        })
      } catch (error) {
        if (active) publishStatus({ state: 'error', message: error?.message || 'Cloudflare visitor collection failed.' })
      }
    }

    const initialPage = safePage(window.location.pathname)
    publishStatus({ state: 'sending', message: 'Connecting to privacy-preserving visitor collection…' })
    send(initialPage, true, 0)
    heartbeat = window.setInterval(() => {
      if (!active) return
      const now = Date.now()
      const elapsed = Math.min(120, Math.max(0, Math.floor((now - lastSentAt.current) / 1000)))
      send(lastPage.current || safePage(window.location.pathname), false, elapsed)
    }, 30000)

    return () => {
      active = false
      ready.current = false
      if (heartbeat) window.clearInterval(heartbeat)
    }
  }, [])

  useEffect(() => {
    const page = safePage(location.pathname)
    if (page === lastPage.current) return
    if (sessionRef.current) {
      const elapsed = Math.min(120, Math.max(0, Math.floor((Date.now() - lastSentAt.current) / 1000)))
      // The first route is sent by the session bootstrap effect.
      if (lastPage.current) {
        const sessionId = sessionRef.current.sessionId
        fetch(VISITOR_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, startedAt: sessionRef.current.startedAt, page, pageView: true, seconds: elapsed }),
          cache: 'no-store',
          keepalive: true
        }).then(async response => {
          const result = await response.json().catch(() => ({}))
          if (!response.ok || result.ok !== true) throw new Error(result.error || 'Could not save visitor page view.')
          lastSentAt.current = Date.now()
          lastPage.current = page
          publishStatus({ state: 'connected', message: 'Visitor session and approximate location saved by Cloudflare.', backend: 'cloudflare' })
        }).catch(error => publishStatus({ state: 'error', message: error?.message || 'Could not save visitor page view.' }))
      }
    }
  }, [location.pathname])

  return null
}
