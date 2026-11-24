import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getApmlDatabase } from '../lib/firebase'

const GEO_URL = 'https://ipwho.is/'
const VISITOR_KEY = 'apml-firebase-visitor-id'
const SESSION_KEY = 'apml-firebase-visitor-session'
const GEO_CACHE_KEY = 'apml-ip-location-cache'
const COOLDOWN_MS = 30 * 60 * 1000
const HEARTBEAT_MS = 30000
const safePage = value => String(value || '/').split('?')[0].split('#')[0].slice(0, 120) || '/'
const makeId = () => (window.crypto?.randomUUID?.() || Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)
function getStoredId(key, storage) {
  try {
    let value = storage.getItem(key)
    if (!value) { value = makeId(); storage.setItem(key, value) }
    return value
  } catch { return makeId() }
}
function getDeviceDetails() {
  const ua = navigator.userAgent || ''
  const device = /ipad|tablet/i.test(ua) ? 'Tablet' : /mobile|android|iphone/i.test(ua) ? 'Mobile' : 'Desktop'
  const browser = /edg\//i.test(ua) ? 'Edge' : /opr\//i.test(ua) ? 'Opera' : /firefox\//i.test(ua) ? 'Firefox' : /chrome\//i.test(ua) ? 'Chrome' : /safari\//i.test(ua) ? 'Safari' : 'Other'
  const os = /windows/i.test(ua) ? 'Windows' : /android/i.test(ua) ? 'Android' : /iphone|ipad|ios/i.test(ua) ? 'iOS' : /mac os/i.test(ua) ? 'macOS' : /linux/i.test(ua) ? 'Linux' : 'Other'
  return { device, browser, os }
}
async function getIpLocation() {
  try {
    const cached = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || 'null')
    if (cached && cached.expiresAt > Date.now() && cached.location) return cached.location
  } catch {}
  const response = await fetch(GEO_URL, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' })
  if (!response.ok) throw new Error('IP location lookup unavailable')
  const data = await response.json()
  if (!data.success) throw new Error(data.message || 'IP location lookup unavailable')
  const location = {
    city: String(data.city || '').slice(0, 80),
    region: String(data.region || '').slice(0, 80),
    country: String(data.country || '').slice(0, 80),
    countryCode: String(data.country_code || '').slice(0, 2),
    timezone: String(data.timezone?.id || '').slice(0, 80),
    source: 'IP geolocation'
  }
  try { localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ location, expiresAt: Date.now() + 12 * 60 * 60 * 1000 })) } catch {}
  return location
}
function indiaDateKey() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = type => parts.find(item => item.type === type)?.value || ''
  return part('year') + '-' + part('month') + '-' + part('day')
}
function publishStatus(detail) {
  const status = { ...detail, checkedAt: Date.now() }
  window.__apmlVisitorTrackerStatus = status
  window.dispatchEvent(new CustomEvent('apml:visitor-tracker-status', { detail: status }))
}
export default function VisitorAnalyticsTracker() {
  const location = useLocation()
  useEffect(() => {
    let active = true
    let heartbeat = null
    let lastTick = Date.now()
    let lastPage = safePage(window.location.pathname)
    let database
    let sessionRef
    let visitorId
    const sessionId = getStoredId(SESSION_KEY, sessionStorage)
    const startedAt = Date.now()
    const device = getDeviceDetails()
    let geo = { city: '', region: '', country: '', countryCode: '', timezone: '', source: 'IP geolocation' }

    const writeVisitor = async (page, pageView, elapsedSeconds) => {
      if (!database || !visitorId || !active) return
      const now = Date.now()
      const date = indiaDateKey()
      const visitorRef = database.ref('visitor_intelligence/visitors/' + visitorId)
      let countedVisit = false
      const transaction = await visitorRef.transaction(current => {
        const prior = current && typeof current === 'object' ? current : {}
        const lastCountedAt = Number(prior.lastCountedAt) || 0
        countedVisit = !lastCountedAt || now - lastCountedAt >= COOLDOWN_MS
        return {
          ...prior,
          visitorId,
          firstSeen: Number(prior.firstSeen) || now,
          lastSeen: now,
          lastCountedAt: countedVisit ? now : lastCountedAt,
          visitCount: (Number(prior.visitCount) || 0) + (countedVisit ? 1 : 0),
          ...geo,
          ...device
        }
      }, undefined, false)
      if (!transaction.committed) return
      if (countedVisit) {
        const dailyRef = database.ref('visitor_intelligence/daily/' + date + '/' + visitorId)
        await dailyRef.transaction(current => {
          const prior = current && typeof current === 'object' ? current : {}
          return {
            ...prior,
            visitorId,
            firstSeen: Number(prior.firstSeen) || now,
            lastSeen: now,
            visits: (Number(prior.visits) || 0) + 1,
            ...geo,
            ...device
          }
        }, undefined, false)
      } else {
        await database.ref('visitor_intelligence/daily/' + date + '/' + visitorId).update({ lastSeen: now, ...geo, ...device })
      }

      const pageKey = btoa(unescape(encodeURIComponent(page))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
      const pagesRef = sessionRef.child('pages/' + pageKey)
      await pagesRef.transaction(current => {
        const prior = current && typeof current === 'object' ? current : {}
        return { name: page, views: (Number(prior.views) || 0) + (pageView ? 1 : 0), seconds: (Number(prior.seconds) || 0) + elapsedSeconds, lastSeen: now }
      }, undefined, false)
      await sessionRef.update({
        visitorId, startedAt, lastSeen: now, online: true, currentPage: page,
        pageViews: pageView ? 1 : 0, totalSeconds: elapsedSeconds,
        ...geo, ...device
      })
    }

    const send = async (path, pageView = false) => {
      if (!active || !database || !sessionRef) return
      const now = Date.now()
      const elapsedSeconds = Math.min(120, Math.max(0, Math.floor((now - lastTick) / 1000)))
      lastTick = now
      lastPage = safePage(path)
      try {
        await writeVisitor(lastPage, pageView, elapsedSeconds)
        publishStatus({ state: 'connected', message: 'Visitor data is syncing directly with the new Firebase.', backend: 'portalapml Firebase', location: [geo.city, geo.region, geo.country].filter(Boolean).join(', ') || 'Location unavailable' })
      } catch (error) {
        publishStatus({ state: 'error', message: error.message || 'Visitor data could not be saved.', backend: 'portalapml Firebase' })
      }
    }

    const start = async () => {
      try {
        publishStatus({ state: 'connecting', message: 'Connecting directly to the new Firebase.', backend: 'portalapml Firebase' })
        visitorId = getStoredId(VISITOR_KEY, localStorage)
        const results = await Promise.allSettled([getApmlDatabase(), getIpLocation()])
        if (!active) return
        if (results[0].status !== 'fulfilled') throw results[0].reason
        database = results[0].value
        if (results[1].status === 'fulfilled') geo = results[1].value
        sessionRef = database.ref('visitor_intelligence/sessions/' + visitorId + '/' + sessionId)
        await sessionRef.onDisconnect().remove()
        await send(lastPage, true)
        heartbeat = window.setInterval(() => send(lastPage, false), HEARTBEAT_MS)
        if (results[1].status !== 'fulfilled') {
          publishStatus({ state: 'partial', message: 'Visitor activity is saved, but IP location lookup is temporarily unavailable.', backend: 'portalapml Firebase' })
        }
      } catch (error) {
        publishStatus({ state: 'error', message: error.message || 'Visitor tracker could not start.', backend: 'portalapml Firebase' })
      }
    }
    const routeChanged = event => send(safePage(event.detail || window.location.pathname), true)
    window.addEventListener('apml:visitor-route', routeChanged)
    start()
    return () => {
      active = false
      if (heartbeat) window.clearInterval(heartbeat)
      window.removeEventListener('apml:visitor-route', routeChanged)
      if (sessionRef) sessionRef.onDisconnect().cancel().catch(() => {})
    }
  }, [])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('apml:visitor-route', { detail: safePage(location.pathname) }))
  }, [location.pathname])
  return null
}
