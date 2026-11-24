import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactApexChart from 'react-apexcharts'
import { Activity, Users, FileText, Download, Eye, RefreshCw, ArrowUpRight, Monitor, Smartphone, Tablet, Clock3, FileDown, MapPin } from 'lucide-react'
import './Analytics.css'

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDgJ6uVJcdSw5A6xyO3Tykjcp1hFFG_dWM',
  authDomain: 'portalapml.firebaseapp.com',
  databaseURL: 'https://portalapml-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'portalapml',
  storageBucket: 'portalapml.firebasestorage.app',
  messagingSenderId: '461187970356',
  appId: '1:461187970356:web:e9dfc58a502fd3e04d2161'
}
const fmt = value => new Intl.NumberFormat('en-IN').format(Number(value) || 0)
const istDateKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const get = type => parts.find(part => part.type === type)?.value || ''
  return get('year') + '-' + get('month') + '-' + get('day')
}
const shiftDate = (key, amount) => {
  const date = new Date(key + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() + amount)
  return date.toISOString().slice(0, 10)
}
const labelDate = key => new Date(key + 'T12:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })
const shortDate = key => new Date(key + 'T12:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })
const loadScript = src => new Promise((resolve, reject) => {
  if (src.includes('firebase-app') && window.firebase?.apps) return resolve()
  if (src.includes('firebase-database') && window.firebase?.database) return resolve()
  const existing = [...document.scripts].find(script => script.src === src)
  if (existing) {
    existing.addEventListener('load', resolve, { once: true })
    existing.addEventListener('error', reject, { once: true })
    if ((src.includes('firebase-app') && window.firebase?.apps) || (src.includes('firebase-database') && window.firebase?.database)) resolve()
    return
  }
  const script = document.createElement('script')
  script.src = src
  script.async = true
  script.onload = resolve
  script.onerror = () => reject(new Error('Firebase SDK could not be loaded.'))
  document.head.appendChild(script)
})
async function getNewDatabase() {
  await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')
  await loadScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js')
  const firebase = window.firebase
  let app = firebase.apps.find(item => item.options?.projectId === FIREBASE_CONFIG.projectId)
  if (!app) app = firebase.initializeApp(FIREBASE_CONFIG, 'portalapml-analytics-dashboard')
  return firebase.database(app)
}
const unwrapSessions = value => Object.entries(value || {}).flatMap(([uid, sessions]) =>
  Object.entries(sessions || {}).filter(([, session]) => session && typeof session === 'object').map(([id, session]) => ({ ...session, uid, id }))
)

export default function Analytics() {
  const [range, setRange] = useState('30')
  const [records, setRecords] = useState({ pdfDaily: {}, mediaDaily: {}, pdfLifetime: 0, mediaLifetime: 0, sessions: {}, visitors: {}, trafficSessions: {}, presence: {}, actions: {} })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let active = true
    let database
    const refs = []
    const paths = {
      pdfDaily: 'analytics/pdf_generation/daily',
      mediaDaily: 'analytics/media_downloads/daily',
      pdfLifetime: 'analytics/pdf_generation/lifetime',
      mediaLifetime: 'analytics/media_downloads/lifetime',
      sessions: 'visitor_intelligence/sessions',
      visitors: 'visitor_intelligence/daily',
      trafficSessions: 'visitor_intelligence/traffic_sessions',
      presence: 'presence',
      actions: 'analytics/recent_actions'
    }
    const start = async () => {
      setLoading(true)
      setError('')
      try {
        database = await getNewDatabase()
        if (!active) return
        Object.entries(paths).forEach(([key, path]) => {
          const ref = database.ref(path)
          const handler = snapshot => {
            if (!active) return
            setRecords(previous => ({ ...previous, [key]: snapshot.val() || (key.endsWith('Lifetime') ? 0 : {}) }))
            setLoading(false)
          }
          ref.on('value', handler, err => {
            if (active) {
              setError(err.message || 'Some analytics data could not be read. Check the new Firebase read rules.')
              setLoading(false)
            }
          })
          refs.push([ref, handler])
        })
      } catch (err) {
        if (active) { setError(err.message || 'Could not connect to the new Firebase database.'); setLoading(false) }
      }
    }
    start()
    return () => {
      active = false
      refs.forEach(([ref, handler]) => ref.off('value', handler))
    }
  }, [refreshKey])

  const endDate = istDateKey()
  const startDate = shiftDate(endDate, -(Number(range) - 1))
  const daily = useMemo(() => {
    const rows = []
    for (let i = 0; i < Number(range); i++) {
      const date = shiftDate(startDate, i)
      rows.push({ date, pdf: Number(records.pdfDaily?.[date]) || 0, media: Number(records.mediaDaily?.[date]) || 0 })
    }
    return rows
  }, [records.pdfDaily, records.mediaDaily, startDate, range])
  const totals = useMemo(() => daily.reduce((sum, row) => ({ pdf: sum.pdf + row.pdf, media: sum.media + row.media }), { pdf: 0, media: 0 }), [daily])

  const visitorRows = useMemo(() => {
    const selected = Object.entries(records.visitors || {}).filter(([date]) => date >= startDate && date <= endDate)
    const unique = new Set(), devices = {}, locations = {}, systems = {}, browsers = {}
    let visits = 0
    selected.forEach(([, visitors]) => Object.entries(visitors || {}).forEach(([visitorId, detail]) => {
      if (!detail || typeof detail !== 'object' || detail.trafficClass !== 'likely_human') return
      unique.add(visitorId)
      const count = Number(detail.visits) || 0
      visits += count
      const device = detail.device || 'Other'
      devices[device] = (devices[device] || 0) + count
      const os = detail.os || 'Other'
      systems[os] = (systems[os] || 0) + count
      const browser = detail.browser || 'Other'
      browsers[browser] = (browsers[browser] || 0) + count
      const place = [detail.city, detail.region, detail.country].filter(Boolean).join(', ') || 'Unknown location'
      locations[place] = (locations[place] || 0) + count
    }))
    return { visits, unique: unique.size, devices, locations, systems, browsers, days: selected.length }
  }, [records.visitors, startDate, endDate])

  const trafficQuality = useMemo(() => {
    const result = { likelyHuman: 0, suspectedBots: 0, unverified: 0, countries: {} }
    Object.entries(records.trafficSessions || {}).forEach(([date, visitors]) => {
      if (date < startDate || date > endDate) return
      Object.values(visitors || {}).forEach(sessionsById => Object.values(sessionsById || {}).forEach(session => {
        if (!session || typeof session !== 'object') return
        if (session.status === 'likely_human') result.likelyHuman += 1
        else if (session.status === 'suspected_bot') {
          result.suspectedBots += 1
          const country = session.country || 'Unknown location'
          result.countries[country] = (result.countries[country] || 0) + 1
        } else result.unverified += 1
      }))
    })
    return result
  }, [records.trafficSessions, startDate, endDate])

  const legacyUnclassified = useMemo(() => {
    let count = 0
    Object.entries(records.visitors || {}).forEach(([date, visitors]) => {
      if (date < startDate || date > endDate) return
      Object.values(visitors || {}).forEach(detail => {
        if (detail && typeof detail === 'object' && !detail.trafficClass) count += Number(detail.visits) || 0
      })
    })
    return count
  }, [records.visitors, startDate, endDate])

  const sessions = useMemo(() => unwrapSessions(records.sessions), [records.sessions])
  const activeSessions = sessions.filter(session => session.trafficClass === 'likely_human' && session.online !== false && Date.now() - Number(session.lastSeen || 0) < 90000)
  const activePresence = useMemo(() => {
    const rows = []
    Object.entries(records.presence || {}).forEach(([uid, values]) => Object.values(values || {}).forEach(session => {
      if (session?.online && Date.now() - Number(session.timestamp || 0) < 90000) rows.push(uid)
    }))
    return new Set(rows).size
  }, [records.presence])
  const topPages = useMemo(() => {
    const pages = {}
    sessions.forEach(session => Object.values(session.pages || {}).forEach(page => {
      const name = page?.name || '/'
      pages[name] = (pages[name] || 0) + (Number(page?.views) || 0)
    }))
    return Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [sessions])
  const actions = useMemo(() => Object.entries(records.actions || {}).map(([id, item]) => ({ id, ...item })).sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, 12), [records.actions])
  const lifetimePdf = Number(records.pdfLifetime) || 0
  const lifetimeMedia = Number(records.mediaLifetime) || 0
  const combined = totals.pdf + totals.media
  const busiest = [...daily].sort((a, b) => (b.pdf + b.media) - (a.pdf + a.media))[0]
  const chartOptions = {
    chart: { type: 'area', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Plus Jakarta Sans, DM Sans, sans-serif', foreColor: 'var(--analytics-muted)', animations: { enabled: true, speed: 550 } },
    colors: ['#bd303b', '#3b82c4'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3, lineCap: 'round' },
    fill: { type: 'gradient', gradient: { opacityFrom: .22, opacityTo: .02, stops: [0, 90, 100] } },
    markers: { size: daily.length > 45 ? 0 : 3, hover: { size: 6 } },
    legend: { position: 'top', horizontalAlign: 'right', fontSize: '11px', markers: { radius: 8 } },
    grid: { borderColor: 'var(--analytics-grid)', strokeDashArray: 4, padding: { left: 5, right: 8 } },
    xaxis: { categories: daily.map(row => shortDate(row.date)), tickAmount: 8, axisBorder: { show: false }, axisTicks: { show: false }, labels: { rotate: 0, hideOverlappingLabels: true, style: { fontSize: '10px' } } },
    yaxis: { min: 0, forceNiceScale: true, decimalsInFloat: 0, labels: { formatter: value => Math.round(value), style: { fontSize: '10px' } } },
    tooltip: { shared: true, intersect: false, x: { formatter: (_, opts) => daily[opts.dataPointIndex] ? labelDate(daily[opts.dataPointIndex].date) : '' }, y: { formatter: fmt } },
    responsive: [{ breakpoint: 650, options: { legend: { position: 'bottom', horizontalAlign: 'left' }, xaxis: { tickAmount: 5 } } }]
  }
  const chartSeries = [{ name: 'PDF generated', data: daily.map(row => row.pdf) }, { name: 'Drive / Gallery downloads', data: daily.map(row => row.media) }]

  const exportCsv = useCallback(() => {
    const lines = [['Date', 'PDF generated', 'Drive/Gallery downloads', 'Total'], ...[...daily].reverse().map(row => [row.date, row.pdf, row.media, row.pdf + row.media])]
    const csv = lines.map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'apml-analytics-' + startDate + '-to-' + endDate + '.csv'
    anchor.click()
    URL.revokeObjectURL(url)
  }, [daily, startDate, endDate])

  return <main className="analytics-page analytics-dashboard">
    <header className="analytics-hero">
      <div><div className="analytics-eyebrow"><Activity size={13}/> APML PORTAL INTELLIGENCE</div><h1>Analytics <span>Overview</span></h1><p>Live portal activity, visitor sessions and operational downloads — synced directly with the new Firebase database.</p></div>
      <div className="analytics-hero-actions"><button className="analytics-action-btn" onClick={exportCsv}><FileDown size={15}/> Export CSV</button><button className="analytics-action-btn primary" onClick={() => setRefreshKey(key => key + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'analytics-spin' : ''}/> Refresh</button></div>
    </header>

    <div className="analytics-toolbar"><div className="analytics-range-tabs">{[['7','7 days'],['30','30 days'],['90','3 months'],['180','6 months'],['365','1 year']].map(([value, label]) => <button key={value} className={range === value ? 'active' : ''} onClick={() => setRange(value)}>{label}</button>)}</div><span className="analytics-period">{labelDate(startDate)} – {labelDate(endDate)} · IST</span></div>
    {error && <div className="analytics-error" role="alert">{error}</div>}
    {loading && <div className="analytics-loading"><span/> Syncing live Firebase data…</div>}

    <div className="analytics-bento-grid">
    <section className="analytics-kpis">
      <article className="analytics-kpi live"><div className="analytics-kpi-top"><span className="analytics-kpi-icon"><Users size={18}/></span><span>People online</span><i/></div><strong>{fmt(Math.max(activeSessions.length, activePresence))}</strong><small>Live sessions updated within 90 seconds</small></article>
      <article className="analytics-kpi"><div className="analytics-kpi-top"><span className="analytics-kpi-icon red"><FileText size={18}/></span><span>PDF generated</span></div><strong>{fmt(totals.pdf)}</strong><small>{fmt(lifetimePdf)} lifetime generated</small></article>
      <article className="analytics-kpi"><div className="analytics-kpi-top"><span className="analytics-kpi-icon blue"><Download size={18}/></span><span>Drive / Gallery downloads</span></div><strong>{fmt(totals.media)}</strong><small>{fmt(lifetimeMedia)} lifetime downloads</small></article>
      <article className="analytics-kpi"><div className="analytics-kpi-top"><span className="analytics-kpi-icon violet"><Eye size={18}/></span><span>Visitor visits</span></div><strong>{fmt(visitorRows.visits)}</strong><small>Engaged, likely-human visits · {fmt(visitorRows.unique)} unique browsers</small></article>
    </section>

    <section className="analytics-insight-grid">
      <article className="analytics-panel analytics-chart-panel"><div className="analytics-panel-head"><div><h2>Portal activity</h2><p>Daily PDF generation and Drive / Gallery downloads</p></div><span className="analytics-live-label"><i/> LIVE SYNC</span></div><div className="analytics-chart-wrap">{daily.length ? <ReactApexChart options={chartOptions} series={chartSeries} type="area" height="100%"/> : <div className="analytics-empty">No activity in this period.</div>}</div></article>
      <article className="analytics-panel analytics-insights"><div className="analytics-panel-head"><div><h2>Period insights</h2><p>Summary for the selected date range</p></div></div><div className="analytics-insight-row"><span>Total tracked downloads</span><strong>{fmt(combined)}</strong></div><div className="analytics-insight-row"><span>Average per day</span><strong>{fmt(combined / Math.max(1, daily.length))}</strong></div><div className="analytics-insight-row"><span>Visitor-days recorded</span><strong>{fmt(visitorRows.days)}</strong></div><div className="analytics-insight-row"><span>Busiest activity date</span><strong>{busiest && busiest.pdf + busiest.media ? shortDate(busiest.date) : '—'}</strong></div><div className="analytics-insight-note">Generated PDFs are counted separately from downloads. A PDF is not counted as a Drive/Gallery download unless it is downloaded from there separately.</div></article>
    </section>

    <section className="analytics-lower-grid">
      <article className="analytics-panel"><div className="analytics-panel-head"><div><h2>Most viewed pages</h2><p>Page views accumulated across recorded visitor sessions</p></div></div>{topPages.length ? <div className="analytics-rank-list">{topPages.map(([name, count], index) => <div className="analytics-rank-row" key={name}><span className="analytics-rank-number">{index + 1}</span><span className="analytics-rank-name">{name}</span><strong>{fmt(count)}</strong></div>)}</div> : <div className="analytics-empty compact">Page-view details will appear as visitor sessions are recorded.</div>}</article>
      <article className="analytics-panel"><div className="analytics-panel-head"><div><h2>Visitor devices</h2><p>Device type · operating system · browser</p></div></div>{Object.keys(visitorRows.devices).length ? <div className="analytics-device-list">{Object.entries(visitorRows.devices).sort((a,b)=>b[1]-a[1]).map(([device,count])=>{const Icon=device==='Mobile'?Smartphone:device==='Tablet'?Tablet:Monitor;const pct=Math.round(count/Math.max(1,Object.values(visitorRows.devices).reduce((a,b)=>a+b,0))*100);return <div className="analytics-device-row" key={device}><span className="analytics-device-icon"><Icon size={16}/></span><span className="analytics-device-name">{device}</span><div className="analytics-device-track"><i style={{width:pct+'%'}}/></div><strong>{pct}%</strong></div>})}<div className="analytics-insight-note">OS: {Object.entries(visitorRows.systems).sort((a,b)=>b[1]-a[1]).map(([name,count])=>name+' ('+fmt(count)+')').join(' · ') || '—'}<br/>Browsers: {Object.entries(visitorRows.browsers).sort((a,b)=>b[1]-a[1]).map(([name,count])=>name+' ('+fmt(count)+')').join(' · ') || '—'}</div></div> : <div className="analytics-empty compact">Device breakdown will appear as visitor records arrive.</div>}</article>
      <article className="analytics-panel"><div className="analytics-panel-head"><div><h2>Visitor locations</h2><p>Approximate location from network information</p></div></div>{Object.keys(visitorRows.locations).length ? <div className="analytics-rank-list">{Object.entries(visitorRows.locations).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([place,count],index)=><div className="analytics-rank-row" key={place}><span className="analytics-rank-number"><MapPin size={14}/></span><span className="analytics-rank-name">{place}</span><strong>{fmt(count)}</strong></div>)}</div> : <div className="analytics-empty compact">Location details will appear as visitor records arrive.</div>}</article>
      <article className="analytics-panel analytics-traffic-quality"><div className="analytics-panel-head"><div><h2>Traffic quality</h2><p>Automated traffic is separated from engaged visitor totals</p></div></div><div className="analytics-insight-row"><span>Likely human sessions</span><strong>{fmt(trafficQuality.likelyHuman)}</strong></div><div className="analytics-insight-row"><span>Suspected bots filtered</span><strong>{fmt(trafficQuality.suspectedBots)}</strong></div><div className="analytics-insight-row"><span>Unverified sessions</span><strong>{fmt(trafficQuality.unverified)}</strong></div><div className="analytics-insight-row"><span>Older unclassified visits</span><strong>{fmt(legacyUnclassified)}</strong></div><div className="analytics-insight-note">Top suspected-bot locations: {Object.entries(trafficQuality.countries).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([country,count])=>country+' ('+fmt(count)+')').join(' · ') || 'No suspected bots recorded yet.'}. Detection is heuristic, not proof; advanced bots can imitate browsers and genuine users can be misclassified.</div></article>
    </section>

    <section className="analytics-panel analytics-daily-panel"><div className="analytics-panel-head"><div><h2>Daily breakdown</h2><p>Newest dates first · counts are recorded in India Standard Time</p></div><span className="analytics-row-count">{daily.length} days</span></div><div className="analytics-table-wrap"><table><thead><tr><th>Date</th><th>PDF generated</th><th>Drive / Gallery</th><th>Total</th></tr></thead><tbody>{[...daily].reverse().map(row=><tr key={row.date}><td>{labelDate(row.date)}</td><td>{fmt(row.pdf)}</td><td>{fmt(row.media)}</td><td><strong>{fmt(row.pdf+row.media)}</strong></td></tr>)}</tbody></table></div></section>

    <section className="analytics-panel analytics-activity-panel"><div className="analytics-panel-head"><div><h2>Recent activity</h2><p>Latest recorded successful actions across supported modules</p></div><span className="analytics-row-count">{actions.length} events</span></div>{actions.length ? <div className="analytics-activity-list">{actions.map(item=><div className="analytics-activity-row" key={item.id}><span className="analytics-activity-icon"><Clock3 size={15}/></span><div className="analytics-activity-copy"><strong>{item.action || 'Activity'} <span>· {item.module || 'Portal'}</span></strong><small>{[item.item,item.details].filter(Boolean).join(' — ') || 'Action recorded'}</small></div><time>{item.timestamp ? new Date(Number(item.timestamp)).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}</time></div>)}</div> : <div className="analytics-empty compact">No recent actions are available in the new Firebase activity log.</div>}</section>
    <footer className="analytics-footer-note">Source: new Firebase project <strong>portalapml</strong>. Likely-human totals require visible engagement; bot detection is heuristic and cannot guarantee that every session is human. Recent activity is a limited action log, not a complete clickstream.</footer>
    </div>
  </main>
}
