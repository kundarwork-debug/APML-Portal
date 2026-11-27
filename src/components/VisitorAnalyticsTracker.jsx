import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getApmlDatabase } from '../lib/firebase'

const GEO_URL = 'https://ipwho.is/'
const VISITOR_KEY = 'apml-firebase-visitor-id'
const SESSION_KEY = 'apml-firebase-visitor-session'
const GEO_CACHE_KEY = 'apml-ip-location-cache'
const COOLDOWN_MS = 30 * 60 * 1000
const HEARTBEAT_MS = 5000
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
function detectAutomation() {
  const ua = navigator.userAgent || ''
  const botPattern = /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|google-inspectiontool|pagespeed|lighthouse|headlesschrome|phantomjs|selenium|playwright|puppeteer|python-requests|curl\/|wget\//i
  const reasons = []
  if (botPattern.test(ua)) reasons.push('bot_user_agent')
  if (navigator.webdriver === true) reasons.push('webdriver')
  if (/headless/i.test(ua)) reasons.push('headless_browser')
  return { suspected: reasons.length > 0, reasons }
}
async function getIpLocation() {
  try {
    const cached = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || 'null')
    if (cached && cached.expiresAt > Date.now() && cached.location) return cached.location
  } catch {}
  const [primary, secondary] = await Promise.allSettled([
    fetch(GEO_URL, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' }).then(response => response.ok ? response.json() : Promise.reject(new Error('Primary geolocation unavailable'))),
    fetch('https://ipapi.co/json/', { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' }).then(response => response.ok ? response.json() : Promise.reject(new Error('Secondary geolocation unavailable')))
  ])
  const p = primary.status === 'fulfilled' && primary.value?.success !== false ? primary.value : null
  const s = secondary.status === 'fulfilled' && !secondary.value?.error ? secondary.value : null
  const city1 = String(p?.city || '').trim()
  const city2 = String(s?.city || '').trim()
  const normalize = value => value.toLocaleLowerCase().replace(/[^a-z]/g, '')
  const cityVerified = Boolean(city1 && city2 && normalize(city1) === normalize(city2))
  const region = String(p?.region || s?.region || s?.region_code || '').slice(0, 80)
  const country = String(p?.country || s?.country_name || '').slice(0, 80)
  const location = {
    city: cityVerified ? city1.slice(0, 80) : '',
    cityVerified,
    region,
    country,
    countryCode: String(p?.country_code || s?.country_code || '').slice(0, 2),
    timezone: String(p?.timezone?.id || s?.timezone || '').slice(0, 80),
    source: cityVerified ? 'IP geolocation consensus' : 'IP geolocation (region only)'
  }
  if (!p && !s) throw new Error('IP location lookup unavailable')
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
    let qualified = false
    let interactionScore = 0
    let movementPoints = 0
    let lastPointer = null
    let lastInteractionAt = 0
    let lastPage = safePage(window.location.pathname)
    let database
    let sessionRef
    let visitorId
    const sessionId = getStoredId(SESSION_KEY, sessionStorage)
    const startedAt = Date.now()
    const device = getDeviceDetails()
    const automation = detectAutomation()
    let geo = { city: '', region: '', country: '', countryCode: '', timezone: '', source: 'IP geolocation' }

    const writeVisitor = async (page, pageView, elapsedSeconds) => {
      if (!database || !visitorId || !active || !sessionRef) return
      const now = Date.now()
      const date = indiaDateKey()
      const visitorRef = database.ref('visitor_intelligence/visitors/' + visitorId)
      let countedVisit = false
      const transaction = await visitorRef.transaction(current => {
        const prior = current && typeof current === 'object' ? current : {}
        const lastCountedAt = Number(prior.lastCountedAt) || 0
        countedVisit = !lastCountedAt || now - lastCountedAt >= COOLDOWN_MS
        return {
          ...prior, visitorId, firstSeen: Number(prior.firstSeen) || now, lastSeen: now,
          lastCountedAt: countedVisit ? now : lastCountedAt,
          visitCount: (Number(prior.visitCount) || 0) + (countedVisit ? 1 : 0),
          city: geo.city || '', cityVerified: Boolean(geo.cityVerified), region: geo.region || prior.region || '',
          country: geo.country || prior.country || '', countryCode: geo.countryCode || prior.countryCode || '',
          timezone: geo.timezone || prior.timezone || '',
          source: geo.city || geo.region || geo.country ? geo.source : (prior.source || geo.source),
          trafficClass: 'likely_human', interactionVerified: true, ...device
        }
      }, undefined, false)
      if (!transaction.committed) return
      if (countedVisit) {
        const dailyRef = database.ref('visitor_intelligence/daily/' + date + '/' + visitorId)
        await dailyRef.transaction(current => {
          const prior = current && typeof current === 'object' ? current : {}
          return {
            ...prior, visitorId, firstSeen: Number(prior.firstSeen) || now, lastSeen: now,
            visits: (Number(prior.visits) || 0) + 1,
            city: geo.city || '', cityVerified: Boolean(geo.cityVerified), region: geo.region || prior.region || '',
            country: geo.country || prior.country || '', countryCode: geo.countryCode || prior.countryCode || '',
            timezone: geo.timezone || prior.timezone || '',
            source: geo.city || geo.region || geo.country ? geo.source : (prior.source || geo.source),
            trafficClass: 'likely_human', interactionVerified: true, ...device
          }
        }, undefined, false)
      } else {
        await database.ref('visitor_intelligence/daily/' + date + '/' + visitorId).update({
          lastSeen: now, trafficClass: 'likely_human', interactionVerified: true,
          ...(geo.city || geo.region || geo.country ? geo : {}), city: geo.city || '', cityVerified: Boolean(geo.cityVerified), ...device
        })
      }
      const pageKey = btoa(unescape(encodeURIComponent(page))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
      const pagesRef = sessionRef.child('pages/' + pageKey)
      await pagesRef.transaction(current => {
        const prior = current && typeof current === 'object' ? current : {}
        return { name: page, views: (Number(prior.views) || 0) + (pageView ? 1 : 0), seconds: (Number(prior.seconds) || 0) + elapsedSeconds, lastSeen: now }
      }, undefined, false)
      await sessionRef.transaction(current => {
        const prior = current && typeof current === 'object' ? current : {}
        return {
          ...prior, visitorId, startedAt: Number(prior.startedAt) || startedAt,
          lastSeen: now, online: true, currentPage: page, interactionVerified: true,
          pageViews: (Number(prior.pageViews) || 0) + (pageView ? 1 : 0),
          totalSeconds: (Number(prior.totalSeconds) || 0) + elapsedSeconds,
          city: geo.city || '', cityVerified: Boolean(geo.cityVerified), region: geo.region || prior.region || '',
          country: geo.country || prior.country || '', countryCode: geo.countryCode || prior.countryCode || '',
          timezone: geo.timezone || prior.timezone || '',
          source: geo.city || geo.region || geo.country ? geo.source : (prior.source || geo.source),
          trafficClass: 'likely_human', interactionVerified: true, ...device
        }
      }, undefined, false)
    }

    const qualify = async () => {
      if (qualified || automation.suspected || interactionScore < 3 || !database) return
      qualified = true
      window.__apmlVisitorVerified = true
      await send(lastPage, true)
      publishStatus({ state: 'connected', message: 'Qualified visitor activity is syncing to the new Firebase.', backend: 'portalapml Firebase', trafficClass: 'likely_human' })
    }

    const send = async (path, pageView = false) => {
      if (!active || !database) return
      lastPage = safePage(path)
      if (!qualified || !sessionRef) return
      const now = Date.now()
      const elapsedSeconds = Math.min(30, Math.max(0, Math.floor((now - lastTick) / 1000)))
      lastTick = now
      try {
        await writeVisitor(lastPage, pageView, elapsedSeconds)
        publishStatus({ state: 'connected', message: 'Qualified visitor data is syncing directly with the new Firebase.', backend: 'portalapml Firebase', location: [geo.city, geo.region, geo.country].filter(Boolean).join(', ') || 'Location unavailable', trafficClass: 'likely_human' })
      } catch (error) {
        publishStatus({ state: 'error', message: error.message || 'Visitor data could not be saved.', backend: 'portalapml Firebase' })
      }
    }

    const onActivity = event => {
      if (!event?.isTrusted || document.visibilityState !== 'visible' || automation.suspected || qualified) return
      const now = Date.now()
      const type = event.type
      if (type === 'pointermove' || type === 'mousemove') {
        const x = Number(event.clientX), y = Number(event.clientY)
        if (!Number.isFinite(x) || !Number.isFinite(y)) return
        if (lastPointer && Math.hypot(x - lastPointer.x, y - lastPointer.y) >= 18 && now - lastInteractionAt >= 120) {
          movementPoints = Math.min(3, movementPoints + 1)
          interactionScore = Math.max(interactionScore, movementPoints)
          lastInteractionAt = now
        }
        lastPointer = { x, y }
      } else if (type === 'wheel' || type === 'scroll') {
        interactionScore += 2
        lastInteractionAt = now
      } else if (type === 'pointerdown' || type === 'touchstart' || type === 'click') {
        interactionScore += 3
        lastInteractionAt = now
      } else if (type === 'keydown') {
        interactionScore += 2
        lastInteractionAt = now
      } else if (type === 'touchmove') {
        interactionScore += 2
        lastInteractionAt = now
      }
      void qualify()
    }
    const start = async () => {
      try {
        publishStatus({ state: 'connecting', message: 'Checking visitor session before counting it.', backend: 'portalapml Firebase' })
        visitorId = getStoredId(VISITOR_KEY, localStorage)
        const results = await Promise.allSettled([getApmlDatabase(), getIpLocation()])
        if (!active) return
        if (results[0].status !== 'fulfilled') throw results[0].reason
        database = results[0].value
        if (results[1].status === 'fulfilled') geo = results[1].value
        const date = indiaDateKey()
        if (automation.suspected) {
          publishStatus({ state: 'filtered', message: 'Automated traffic detected; excluded from visitor totals.', backend: 'portalapml Firebase', trafficClass: 'suspected_bot' })
          return
        }
        sessionRef = database.ref('visitor_intelligence/sessions/' + visitorId + '/' + sessionId)
        await sessionRef.onDisconnect().remove()
        lastTick = Date.now()
        const tick = async () => {
          if (!active) return
          if (qualified) { await send(lastPage, false); return }
          await qualify()
        }
        heartbeat = window.setInterval(tick, HEARTBEAT_MS)
        publishStatus({ state: 'pending', message: 'Waiting for meaningful page engagement before counting this visit.', backend: 'portalapml Firebase', trafficClass: 'unverified' })
      } catch (error) {
        publishStatus({ state: 'error', message: error.message || 'Visitor tracker could not start.', backend: 'portalapml Firebase' })
      }
    }
    const routeChanged = event => {
      const nextPage = safePage(event.detail || window.location.pathname)
      const changed = nextPage !== lastPage
      lastPage = nextPage
      if (qualified) void send(nextPage, changed)
    }
    const activityEvents = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'touchmove', 'wheel']
    activityEvents.forEach(name => window.addEventListener(name, onActivity, { passive: true }))
    window.addEventListener('apml:visitor-route', routeChanged)
    start()
    return () => {
      active = false
      if (window.__apmlVisitorVerified === true) window.__apmlVisitorVerified = false
      if (heartbeat) window.clearInterval(heartbeat)
      activityEvents.forEach(name => window.removeEventListener(name, onActivity))
      window.removeEventListener('apml:visitor-route', routeChanged)
      if (sessionRef) sessionRef.onDisconnect().cancel().catch(() => {})
    }
  }, [])
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('apml:visitor-route', { detail: safePage(location.pathname) }))
  }, [location.pathname])
  return null
}
