import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const COLLECT_URL = 'https://apml-drive-api.kundar-work.workers.dev/visitor/collect'
const makeId = () => (window.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
const safePage = value => String(value || '/').split('?')[0].split('#')[0].slice(0, 120) || '/'
function publishStatus(detail) {
  const status = { ...detail, checkedAt: Date.now() }
  window.__apmlVisitorTrackerStatus = status
  window.dispatchEvent(new CustomEvent('apml:visitor-tracker-status', { detail: status }))
}
function getSessionId() {
  try {
    let value = sessionStorage.getItem('apml-visitor-session')
    if (!value) { value = makeId(); sessionStorage.setItem('apml-visitor-session', value) }
    return value
  } catch { return makeId() }
}
export default function VisitorAnalyticsTracker() {
  const location = useLocation()
  useEffect(() => {
    let active = true, heartbeat = null, lastTick = Date.now(), lastPage = ''
    const sessionId = getSessionId()
    const startedAt = Date.now()
    const send = async (path, pageView = false) => {
      if (!active) return
      const now = Date.now()
      const seconds = Math.min(120, Math.max(0, Math.floor((now - lastTick) / 1000)))
      lastTick = now
      lastPage = safePage(path)
      try {
        const response = await fetch(COLLECT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, startedAt, page: lastPage, pageView, seconds }),
          cache: 'no-store',
          keepalive: true
        })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || result.ok === false) throw new Error(result.error || 'Visitor collection failed')
        publishStatus({ state: 'connected', message: 'IP-based visitor location and device details are being recorded.', backend: 'Cloudflare + portalapml Firebase', countedVisit: !!result.countedVisit })
      } catch (error) {
        publishStatus({ state: 'error', message: error.message || 'Visitor collection failed.', backend: 'Cloudflare + portalapml Firebase' })
      }
    }
    publishStatus({ state: 'connecting', message: 'Connecting IP-based visitor analytics.', backend: 'Cloudflare + portalapml Firebase' })
    send(safePage(window.location.pathname), true)
    heartbeat = window.setInterval(() => send(lastPage || safePage(window.location.pathname), false), 30000)
    const routeChanged = event => send(safePage(event.detail || window.location.pathname), true)
    window.addEventListener('apml:visitor-route', routeChanged)
    return () => {
      active = false
      if (heartbeat) window.clearInterval(heartbeat)
      window.removeEventListener('apml:visitor-route', routeChanged)
      try {
        const body = JSON.stringify({ sessionId, startedAt, page: lastPage || safePage(window.location.pathname), pageView: false, seconds: Math.min(120, Math.max(0, Math.floor((Date.now() - lastTick) / 1000))) })
        navigator.sendBeacon?.(COLLECT_URL, new Blob([body], { type: 'application/json' }))
      } catch {}
    }
  }, [])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('apml:visitor-route', { detail: safePage(location.pathname) }))
  }, [location.pathname])
  return null
}
