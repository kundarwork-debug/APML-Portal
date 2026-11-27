import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, ChevronRight, Cloud, Download, FileText, Folder, Image, MapPinned, ShieldCheck, Trash2, UploadCloud, Users, X } from 'lucide-react'
import { getApmlDatabase } from '../lib/firebase'
import './NotificationCenter.css'

const NotificationContext = createContext(null)
const READ_KEY = 'apml-notifications-read-through'
const READ_IDS_KEY = 'apml-notifications-read-ids'
const DISMISSED_KEY = 'apml-notifications-dismissed-ids'
const MAX_ITEMS = 60

function readList(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || '[]')
    return Array.isArray(value) ? value.filter(item => typeof item === 'string').slice(-MAX_ITEMS * 2) : []
  } catch { return [] }
}

function routeFor(module) {
  const key = String(module || '').toLowerCase()
  if (key.includes('editor')) return '/editor'
  if (key.includes('drive')) return '/drive'
  if (key.includes('gallery')) return '/gallery'
  if (key.includes('directory')) return '/directory'
  if (key.includes('field')) return '/field-officer'
  return '/'
}

function describeEvent(event) {
  const action = String(event.action || 'Portal activity')
  const module = String(event.module || 'Portal')
  const item = String(event.item || '').trim()
  const details = String(event.details || '').trim()
  const lower = action.toLowerCase()
  let title = action
  let description = [item, details].filter(Boolean).join(' · ')
  if (lower.includes('pdf generated')) {
    title = 'Quotation PDF generated'
    description = item || 'A new quotation PDF was generated.'
  } else if (lower.includes('uploaded')) {
    title = module === 'Drive' ? 'File uploaded to Drive' : 'New media uploaded'
    description = item || (module === 'Drive' ? 'A file was added to APML Drive.' : 'New media was added to Gallery.')
  } else if (lower.includes('downloaded')) {
    title = module === 'Drive' ? 'Drive download completed' : 'Gallery download completed'
    description = item || 'A file was downloaded.'
  } else if (lower.includes('folder created')) {
    title = 'New Drive folder created'
    description = item || 'A folder was created.'
  } else if (lower.includes('contact')) {
    title = 'Branch Directory updated'
    description = action + (item ? ' · ' + item : '')
  } else if (lower.includes('officer')) {
    title = 'Field Officer records updated'
    description = action + (item ? ' · ' + item : '')
  } else if (lower.includes('trash') || lower.includes('deleted')) {
    title = module + ' item updated'
    description = action + (item ? ' · ' + item : '')
  } else if (lower.includes('excel import')) {
    title = module + ' import completed'
    description = item || 'A data import was completed.'
  } else if (lower.includes('renamed') || lower.includes('restored') || lower.includes('moved')) {
    title = module + ' updated'
    description = action + (item ? ' · ' + item : '')
  }
  return { title, description: description || module + ' activity', module, action }
}

function iconFor(module, action) {
  const key = String(module || '').toLowerCase()
  const verb = String(action || '').toLowerCase()
  if (verb.includes('download')) return Download
  if (verb.includes('upload')) return UploadCloud
  if (key.includes('editor')) return FileText
  if (key.includes('drive')) return Cloud
  if (key.includes('gallery')) return Image
  if (key.includes('directory')) return MapPinned
  if (key.includes('field')) return Users
  if (verb.includes('delete') || verb.includes('trash')) return Trash2
  return Folder
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [readThrough, setReadThrough] = useState(() => {
    try { return Number(localStorage.getItem(READ_KEY)) || 0 } catch { return 0 }
  })
  const [readIds, setReadIds] = useState(() => readList(READ_IDS_KEY))
  const [dismissedIds, setDismissedIds] = useState(() => readList(DISMISSED_KEY))

  useEffect(() => {
    let active = true
    let ref
    const start = async () => {
      try {
        const database = await getApmlDatabase()
        if (!active) return
        ref = database.ref('analytics/recent_actions').orderByChild('timestamp').limitToLast(MAX_ITEMS)
        const onValue = snapshot => {
          if (!active) return
          const rows = []
          snapshot.forEach(child => {
            const value = child.val() || {}
            if (!value.action || !value.module || !Number.isFinite(Number(value.timestamp))) return
            rows.push({ id: child.key, ...value, timestamp: Number(value.timestamp) })
          })
          rows.sort((a, b) => b.timestamp - a.timestamp)
          setNotifications(rows)
          setError('')
          setLoading(false)
        }
        const onError = reason => {
          if (!active) return
          setError(reason?.message || 'Notifications are temporarily unavailable.')
          setLoading(false)
        }
        ref.on('value', onValue, onError)
      } catch (reason) {
        if (!active) return
        setError(reason?.message || 'Could not connect to APML notifications.')
        setLoading(false)
      }
    }
    start()
    return () => {
      active = false
      if (ref) ref.off()
    }
  }, [])

  const visibleNotifications = useMemo(() => notifications.filter(item => !dismissedIds.includes(item.id)), [notifications, dismissedIds])
  const unreadCount = useMemo(() => visibleNotifications.filter(item => item.timestamp > readThrough && !readIds.includes(item.id)).length, [visibleNotifications, readThrough, readIds])

  const markRead = id => {
    setReadIds(current => {
      const next = [...new Set([...current, id])].slice(-MAX_ITEMS * 2)
      try { localStorage.setItem(READ_IDS_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }
  const markAllRead = () => {
    const now = Date.now()
    setReadThrough(now)
    setReadIds([])
    try { localStorage.setItem(READ_KEY, String(now)); localStorage.removeItem(READ_IDS_KEY) } catch {}
  }
  const dismiss = id => {
    setDismissedIds(current => {
      const next = [...new Set([...current, id])].slice(-MAX_ITEMS * 2)
      try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }
  const clearAll = () => {
    const ids = visibleNotifications.map(item => item.id)
    setDismissedIds(current => {
      const next = [...new Set([...current, ...ids])].slice(-MAX_ITEMS * 2)
      try { localStorage.setItem(DISMISSED_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const value = useMemo(() => ({ notifications: visibleNotifications, loading, error, unreadCount, readThrough, readIds, markRead, markAllRead, dismiss, clearAll }), [visibleNotifications, loading, error, unreadCount, readThrough, readIds])
  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>
}

export function usePortalNotifications() {
  const value = useContext(NotificationContext)
  if (!value) throw new Error('usePortalNotifications must be used inside NotificationProvider')
  return value
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { notifications, loading, unreadCount, readThrough, readIds, markRead } = usePortalNotifications()
  const navigate = useNavigate()
  const recent = notifications.slice(0, 5)
  const openItem = item => {
    markRead(item.id)
    setOpen(false)
    navigate(routeFor(item.module))
  }
  return <div className="apml-notification-bell-wrap">
    <button type="button" className="apml-notification-bell" aria-label={unreadCount ? 'Notifications, ' + unreadCount + ' unread' : 'Notifications'} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <Bell size={18}/>
      {unreadCount > 0 && <span className="apml-notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <div className="apml-notification-popover" role="dialog" aria-label="Recent notifications">
      <div className="apml-notification-popover-head"><div><strong>Notifications</strong><small>{unreadCount ? unreadCount + ' unread updates' : 'You are all caught up'}</small></div><button type="button" onClick={() => setOpen(false)} aria-label="Close notifications"><X size={17}/></button></div>
      <div className="apml-notification-popover-list">
        {loading && <p className="apml-notification-empty">Loading notifications…</p>}
        {!loading && recent.length === 0 && <p className="apml-notification-empty">No notifications yet. Important portal activity will appear here.</p>}
        {recent.map(item => {
          const read = item.timestamp <= readThrough || readIds.includes(item.id)
          const Icon = iconFor(item.module, item.action)
          const summary = describeEvent(item)
          return <button type="button" className={'apml-notification-mini'+(read?' is-read':'')} key={item.id} onClick={() => openItem(item)}>
            <span className="apml-notification-icon"><Icon size={16}/></span><span className="apml-notification-mini-copy"><strong>{summary.title}</strong><small>{summary.description}</small><em>{new Date(item.timestamp).toLocaleString()}</em></span>{!read&&<i aria-label="Unread"/>}
          </button>
        })}
      </div>
      <button type="button" className="apml-notification-view-all" onClick={() => { setOpen(false); navigate('/notifications') }}>View all notifications <ChevronRight size={16}/></button>
    </div>}
  </div>
}

export default function NotificationsPage() {
  const { notifications, loading, error, unreadCount, readThrough, readIds, markRead, markAllRead, dismiss, clearAll } = usePortalNotifications()
  const [filter, setFilter] = useState('all')
  const navigate = useNavigate()
  const filtered = notifications.filter(item => filter === 'all' || (item.timestamp > readThrough && !readIds.includes(item.id)))
  const openItem = item => {
    markRead(item.id)
    navigate(routeFor(item.module))
  }
  return <main className="apml-notifications-page">
    <header className="apml-notifications-heading">
      <div><span className="apml-notifications-eyebrow">APML WORKSPACE</span><h1>Notification <span>Centre</span></h1><p>Important updates and activity from across the portal.</p></div>
      <div className="apml-notifications-actions">{unreadCount > 0 && <button type="button" className="apml-notifications-secondary" onClick={markAllRead}><CheckCheck size={16}/> Mark all read</button>}{notifications.length > 0 && <button type="button" className="apml-notifications-secondary" onClick={clearAll}><Trash2 size={16}/> Clear all</button>}</div>
    </header>
    <section className="apml-notifications-panel">
      <div className="apml-notifications-toolbar"><div><strong>Recent activity</strong><span>{unreadCount} unread</span></div><div className="apml-notifications-filters"><button type="button" className={filter==='all'?'active':''} onClick={() => setFilter('all')}>All</button><button type="button" className={filter==='unread'?'active':''} onClick={() => setFilter('unread')}>Unread</button></div></div>
      {loading && <div className="apml-notifications-state">Loading your notifications…</div>}
      {!loading && error && <div className="apml-notifications-state is-error"><ShieldCheck size={20}/><span>{error}</span></div>}
      {!loading && !error && filtered.length === 0 && <div className="apml-notifications-state"><Bell size={24}/><strong>{filter==='unread'?'You are all caught up':'No notifications yet'}</strong><span>New quotation, file and directory activity will appear here automatically.</span></div>}
      {!loading && !error && filtered.map(item => {
        const read = item.timestamp <= readThrough || readIds.includes(item.id)
        const Icon = iconFor(item.module, item.action)
        const summary = describeEvent(item)
        return <article className={'apml-notification-row'+(read?' is-read':'')} key={item.id}>
          <span className="apml-notification-icon"><Icon size={18}/></span>
          <button type="button" className="apml-notification-row-main" onClick={() => openItem(item)}><span className="apml-notification-row-top"><strong>{summary.title}</strong><time dateTime={new Date(item.timestamp).toISOString()}>{new Date(item.timestamp).toLocaleString()}</time></span><span className="apml-notification-row-description">{summary.description}</span><span className="apml-notification-row-meta">{summary.module}{item.user ? ' · ' + item.user : ''}</span></button>
          <div className="apml-notification-row-actions">{!read&&<button type="button" title="Mark as read" aria-label="Mark as read" onClick={() => markRead(item.id)}><CheckCheck size={16}/></button>}<button type="button" title="Dismiss notification" aria-label="Dismiss notification" onClick={() => dismiss(item.id)}><X size={16}/></button></div>
        </article>
      })}
    </section>
    <p className="apml-notifications-footnote">Read and dismissed states are saved on this device. Notifications are based on activity recorded by the portal.</p>
  </main>
}
