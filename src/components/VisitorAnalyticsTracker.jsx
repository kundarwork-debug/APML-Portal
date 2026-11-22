import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { getApmlPresenceServices } from '../lib/firebase'

const makeId = () => window.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2))
const safePage = value => String(value || '/').split('?')[0].split('#')[0].slice(0, 120) || '/'
const dateKey = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return values.year + '-' + values.month + '-' + values.day
}
const browserInfo = () => {
  const ua = navigator.userAgent || ''
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Other'
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Other'
  const device = /iPad|Tablet/.test(ua) ? 'Tablet' : /Mobi|Android|iPhone/.test(ua) ? 'Mobile' : 'Desktop'
  return { browser, os, device }
}
function publishStatus(detail) {
  const status = { ...detail, checkedAt: Date.now() }
  window.__apmlVisitorTrackerStatus = status
  window.dispatchEvent(new CustomEvent('apml:visitor-tracker-status', { detail: status }))
}

export default function VisitorAnalyticsTracker() {
  const location = useLocation()
  const service = useRef(null)
  const sessionRef = useRef(null)
  const lastPage = useRef('')
  const lastTick = useRef(Date.now())
  const ready = useRef(false)

  useEffect(() => {
    let active = true
    let heartbeat = null
    const start = async () => {
      try {
        publishStatus({ state: 'sending', message: 'Connecting to Firebase visitor records…' })
        const presence = await getApmlPresenceServices()
        if (!active) return
        service.current = presence
        let sessionId
        try { sessionId = sessionStorage.getItem('apml-firebase-visitor-session') } catch {}
        if (!sessionId) {
          sessionId = makeId()
          try { sessionStorage.setItem('apml-firebase-visitor-session', sessionId) } catch {}
        }
        const startedAt = Date.now()
        const info = browserInfo()
        sessionRef.current = presence.database.ref('visitor_intelligence/sessions/' + presence.user.uid + '/' + sessionId)
        await sessionRef.current.onDisconnect().update({ online: false, lastSeen: window.firebase.database.ServerValue.TIMESTAMP })
        const dailyRef = presence.database.ref('visitor_intelligence/daily/' + dateKey() + '/' + presence.user.uid)
        await dailyRef.transaction(value => value || true)
        ready.current = true
        lastTick.current = Date.now()
        publishStatus({ state: 'connected', message: 'Firebase visitor collection is active.', backend: 'firebase' })
        const updatePage = async page => {
          if (!ready.current || !sessionRef.current) return
          const now = Date.now()
          await sessionRef.current.transaction(current => ({
            startedAt: Number(current?.startedAt) || startedAt,
            lastSeen: window.firebase.database.ServerValue.TIMESTAMP,
            online: true,
            currentPage: page,
            pageViews: (Number(current?.pageViews) || 0) + 1,
            pages: { ...(current?.pages || {}), [page]: (Number(current?.pages?.[page]) || 0) + 1 },
            totalSeconds: Number(current?.totalSeconds) || 0,
            ...info
          }))
          lastPage.current = page
          lastTick.current = now
          publishStatus({ state: 'connected', message: 'Visitor session saved to Firebase.', backend: 'firebase' })
        }
        window.__apmlRecordVisitorPage = updatePage
        const initialPage = safePage(window.location.pathname)
        await updatePage(initialPage)
        heartbeat = window.setInterval(async () => {
          if (!ready.current || !sessionRef.current) return
          const now = Date.now()
          const elapsed = Math.min(90, Math.max(0, Math.round((now - lastTick.current) / 1000)))
          lastTick.current = now
          try {
            await sessionRef.current.transaction(current => current ? {
              ...current,
              lastSeen: window.firebase.database.ServerValue.TIMESTAMP,
              online: true,
              totalSeconds: (Number(current.totalSeconds) || 0) + elapsed
            } : current)
          } catch (error) {
            publishStatus({ state: 'error', message: error?.message || 'Firebase heartbeat could not be saved.' })
          }
        }, 30000)
      } catch (error) {
        publishStatus({ state: 'error', message: error?.message || 'Firebase visitor collection failed.' })
      }
    }
    start()
    return () => {
      active = false
      ready.current = false
      if (heartbeat) window.clearInterval(heartbeat)
      delete window.__apmlRecordVisitorPage
    }
  }, [])

  useEffect(() => {
    const page = safePage(location.pathname)
    if (page === lastPage.current) return
    if (window.__apmlRecordVisitorPage) window.__apmlRecordVisitorPage(page).catch(error => publishStatus({ state: 'error', message: error?.message || 'Could not save page view.' }))
  }, [location.pathname])

  return null
}
