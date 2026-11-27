import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactApexChart from 'react-apexcharts'
import { Activity, Users, FileText, Download, Eye, RefreshCw, ArrowUpRight, Monitor, Smartphone, Tablet, Clock3, FileDown, MapPin, SlidersHorizontal, RotateCcw, GripVertical } from 'lucide-react'
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
const ACTIVITY_WIDGETS = [
  ['people-online', 'People online'], ['pdf-generated', 'PDF generated'], ['media-downloads', 'Drive / Gallery downloads'], ['visitor-visits', 'Visitor visits'],
  ['portal-activity', 'Portal activity chart'], ['daily-visitors', 'Daily visitors chart'], ['visitor-heatmap', '365-day visitor heatmap'], ['period-insights', 'Period insights'],
  ['most-viewed-pages', 'Most viewed pages'], ['visitor-devices', 'Visitor devices'], ['visitor-locations', 'Visitor locations'], ['browser-rankings', 'Browser rankings'],
  ['daily-breakdown', 'Daily breakdown'], ['recent-activity', 'Recent activity']
]
const DEFAULT_WIDGET_ORDER = ACTIVITY_WIDGETS.map(([id]) => id)
const unwrapSessions = value => Object.entries(value || {}).flatMap(([uid, sessions]) =>
  Object.entries(sessions || {}).filter(([, session]) => session && typeof session === 'object').map(([id, session]) => ({ ...session, uid, id }))
)

export default function Analytics() {
  const [range, setRange] = useState('30')
  const [records, setRecords] = useState({ pdfDaily: {}, mediaDaily: {}, pdfLifetime: 0, mediaLifetime: 0, sessions: {}, visitors: {}, presence: {}, actions: {} })
  const [loading, setLoading] = useState(true)
  const [rangeLoading, setRangeLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  // Anonymous identity is created once per browser profile; no login or personal data is required.
  const [dashboardUserId] = useState(() => {
    try {
      let id = localStorage.getItem('apml-activity-anonymous-user')
      if (!id) {
        id = window.crypto?.randomUUID?.() || ('apml-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2))
        localStorage.setItem('apml-activity-anonymous-user', id)
      }
      return id
    } catch { return 'session-' + Math.random().toString(36).slice(2) }
  })
  const preferenceKey = 'apml-activity-dashboard-preferences:' + dashboardUserId
  const [dashboardPrefs, setDashboardPrefs] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(preferenceKey) || '{}')
      return {
        hidden: Array.isArray(saved.hidden) ? saved.hidden.filter(id => DEFAULT_WIDGET_ORDER.includes(id)) : [],
        order: Array.isArray(saved.order) && saved.order.length === DEFAULT_WIDGET_ORDER.length && DEFAULT_WIDGET_ORDER.every(id => saved.order.includes(id)) ? saved.order : DEFAULT_WIDGET_ORDER
      }
    } catch { return { hidden: [], order: DEFAULT_WIDGET_ORDER } }
  })
  const [customizing, setCustomizing] = useState(false)
  const [draggedWidget, setDraggedWidget] = useState('')
  useEffect(() => {
    try { localStorage.setItem(preferenceKey, JSON.stringify(dashboardPrefs)) } catch {}
  }, [preferenceKey, dashboardPrefs])
  const widgetVisible = id => !dashboardPrefs.hidden.includes(id)
  const widgetOrder = id => dashboardPrefs.order.indexOf(id)
  const moveWidget = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return
    setDashboardPrefs(previous => {
      const order = [...previous.order]
      const from = order.indexOf(fromId), to = order.indexOf(toId)
      if (from < 0 || to < 0) return previous
      order.splice(to, 0, order.splice(from, 1)[0])
      return { ...previous, order }
    })
  }
  const widgetProps = id => ({
    'data-dashboard-widget': id,
    draggable: customizing,
    style: { display: widgetVisible(id) ? undefined : 'none', order: widgetOrder(id) },
    onDragStart: event => { if (!customizing) return; setDraggedWidget(id); event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', id) },
    onDragOver: event => { if (customizing) { event.preventDefault(); event.dataTransfer.dropEffect = 'move' } },
    onDrop: event => { event.preventDefault(); const source = draggedWidget || event.dataTransfer.getData('text/plain'); moveWidget(source, id); setDraggedWidget('') },
    onDragEnd: () => setDraggedWidget('')
  })
  const toggleWidget = id => setDashboardPrefs(previous => ({
    ...previous,
    hidden: previous.hidden.includes(id) ? previous.hidden.filter(item => item !== id) : [...previous.hidden, id]
  }))
  const resetDashboard = () => setDashboardPrefs({ hidden: [], order: DEFAULT_WIDGET_ORDER })

  useEffect(() => {
    if (!rangeLoading) return
    const timer = window.setTimeout(() => setRangeLoading(false), 650)
    return () => window.clearTimeout(timer)
  }, [range, rangeLoading])

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
      presence: 'analytics/active_sessions',
      actions: 'analytics/recent_actions'
    }
    const start = async () => {
      setLoading(true)
      setError('')
      try {
        database = await getNewDatabase()
        if (!active) return
        // Historical visitor records are preserved. Unverified records are filtered from reports below.
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
  const visitorDaily = useMemo(() => daily.map(row => {
    const entries = Object.values(records.visitors?.[row.date] || {})
    const visits = entries.reduce((sum, detail) => sum + (detail?.trafficClass === 'likely_human' && detail?.interactionVerified === true ? Number(detail.visits) || 0 : 0), 0)
    return { date: row.date, visits }
  }), [daily, records.visitors])
  const visitorDailyTotal = visitorDaily.reduce((sum, row) => sum + row.visits, 0)
  const visitorPeak = visitorDaily.reduce((peak, row) => row.visits > peak.visits ? row : peak, { date: '', visits: 0 })


  const visitorRows = useMemo(() => {
    const selected = Object.entries(records.visitors || {}).filter(([date]) => date >= startDate && date <= endDate)
    const unique = new Set(), devices = {}, locations = {}, systems = {}, browsers = {}
    let visits = 0
    selected.forEach(([, visitors]) => Object.entries(visitors || {}).forEach(([visitorId, detail]) => {
      if (!detail || typeof detail !== 'object' || detail.trafficClass !== 'likely_human' || detail.interactionVerified !== true) return
      unique.add(visitorId)
      const count = Number(detail.visits) || 0
      visits += count
      const device = detail.device || 'Other'
      devices[device] = (devices[device] || 0) + count
      const os = detail.os || 'Other'
      systems[os] = (systems[os] || 0) + count
      const browser = detail.browser || 'Other'
      browsers[browser] = (browsers[browser] || 0) + count
      const country = String(detail.country || '').trim().toLowerCase()
      if (country === 'india' || country === 'in' || country === 'ind') {
        const place = [detail.cityVerified ? detail.city : '', detail.region, detail.country].filter(Boolean).join(', ') || 'Unknown location'
        locations[place] = (locations[place] || 0) + count
      }
    }))
    return { visits, unique: unique.size, devices, locations, systems, browsers, days: selected.length }
  }, [records.visitors, startDate, endDate])

  const sessions = useMemo(() => unwrapSessions(records.sessions), [records.sessions])
  const verifiedSessions = useMemo(() => sessions.filter(session => session.trafficClass === 'likely_human' && session.interactionVerified === true), [sessions])
  const activeSessions = verifiedSessions.filter(session => session.online !== false && Number.isFinite(Number(session.lastSeen)) && Number(session.lastSeen) >= Date.now() - 90000)
  // Match homepage People online using the same verified sessions and 90-second cutoff.
  const activePresence = activeSessions.length
  const presenceShare = sessions.length ? Math.round((activePresence / sessions.length) * 100) : 0
  const topPages = useMemo(() => {
    const pages = {}
    verifiedSessions.forEach(session => Object.values(session.pages || {}).forEach(page => {
      const name = page?.name || '/'
      pages[name] = (pages[name] || 0) + (Number(page?.views) || 0)
    }))
    return Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 6)
  }, [verifiedSessions])
  const actions = useMemo(() => Object.entries(records.actions || {}).filter(([, item]) => item?.interactionVerified === true).map(([id, item]) => ({ id, ...item })).sort((a, b) => Number(b.timestamp || 0) - Number(a.timestamp || 0)).slice(0, 12), [records.actions])
  const topBrowsers = useMemo(() => Object.entries(visitorRows.browsers).sort((a, b) => b[1] - a[1]).slice(0, 6), [visitorRows.browsers])
  const topLocations = useMemo(() => Object.entries(visitorRows.locations).sort((a, b) => b[1] - a[1]).slice(0, 8), [visitorRows.locations])
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
  const visitorChartOptions = {
    chart: { type: 'bar', toolbar: { show: false }, zoom: { enabled: false }, fontFamily: 'Plus Jakarta Sans, DM Sans, sans-serif', foreColor: 'var(--analytics-muted)', animations: { enabled: true, speed: 500 } },
    colors: ['#8b5cf6'],
    plotOptions: { bar: { borderRadius: 5, columnWidth: '48%', distributed: false } },
    dataLabels: { enabled: false },
    stroke: { show: false },
    grid: { borderColor: 'var(--analytics-grid)', strokeDashArray: 4, padding: { left: 5, right: 8 } },
    xaxis: { categories: visitorDaily.map(row => shortDate(row.date)), tickAmount: 8, axisBorder: { show: false }, axisTicks: { show: false }, labels: { rotate: 0, hideOverlappingLabels: true, style: { fontSize: '10px' } } },
    yaxis: { min: 0, forceNiceScale: true, decimalsInFloat: 0, labels: { formatter: value => Math.round(value), style: { fontSize: '10px' } } },
    tooltip: { shared: false, intersect: false, x: { formatter: (_, opts) => visitorDaily[opts.dataPointIndex] ? labelDate(visitorDaily[opts.dataPointIndex].date) : '' }, y: { formatter: fmt } },
    responsive: [{ breakpoint: 650, options: { plotOptions: { bar: { columnWidth: '62%' } }, xaxis: { tickAmount: 5 } } }]
  }
  const visitorChartSeries = [{ name: 'Likely-human visits', data: visitorDaily.map(row => row.visits) }]
  const deviceLabels = Object.keys(visitorRows.devices)
  const deviceSeries = deviceLabels.map(label => visitorRows.devices[label])
  const deviceChartOptions = {
    chart: { type: 'donut', fontFamily: 'Plus Jakarta Sans, DM Sans, sans-serif', foreColor: 'var(--analytics-muted)' },
    labels: deviceLabels,
    colors: ['#bd303b', '#3b82c4', '#8b5cf6', '#d49b42'],
    legend: { position: 'bottom', fontSize: '10px', markers: { radius: 8 }, labels: { colors: 'var(--analytics-muted)' } },
    dataLabels: { enabled: false },
    stroke: { width: 3, colors: ['var(--analytics-panel)'] },
    plotOptions: { pie: { donut: { size: '72%', labels: { show: true, name: { show: true, fontSize: '10px' }, value: { show: true, fontSize: '19px', fontWeight: 700, formatter: fmt }, total: { show: true, label: 'Visits', formatter: w => fmt(w.globals.seriesTotals.reduce((sum, value) => sum + value, 0)) } } } } },
    tooltip: { y: { formatter: fmt } },
    responsive: [{ breakpoint: 650, options: { chart: { height: 270 }, legend: { position: 'bottom' } } }]
  }
  // Fixed rolling 365-day visitor calendar, independent of the selected analytics period.
  const heatmapDays = useMemo(() => {
    const today = istDateKey()
    const first = shiftDate(today, -364)
    const days = Array.from({ length: 365 }, (_, offset) => {
      const date = shiftDate(first, offset)
      const visitors = Object.values(records.visitors?.[date] || {})
      const visits = visitors.reduce((sum, detail) => sum + (detail?.trafficClass === 'likely_human' && detail?.interactionVerified === true ? Number(detail.visits) || 0 : 0), 0)
      return { date, visits }
    })
    const leading = new Date(first + 'T00:00:00Z').getUTCDay()
    const cells = [...Array(leading).fill(null), ...days]
    while (cells.length % 7) cells.push(null)
    const weeks = Array.from({ length: cells.length / 7 }, (_, week) => cells.slice(week * 7, week * 7 + 7))
    return { days, weeks, first, today }
  }, [records.visitors, refreshKey])


  const sparkOptions = {
    chart: { type: 'area', sparkline: { enabled: true }, animations: { enabled: true, speed: 450 } },
    stroke: { curve: 'smooth', width: 2.5, lineCap: 'round' },
    fill: { type: 'gradient', gradient: { opacityFrom: .3, opacityTo: .02, stops: [0, 100] } },
    dataLabels: { enabled: false }, markers: { size: 0 }, tooltip: { enabled: false },
    yaxis: { min: 0 }, grid: { show: false }
  }
  const onlineGaugeOptions = {
    chart: { type: 'radialBar', sparkline: { enabled: true }, animations: { enabled: true, speed: 500 } },
    colors: ['#299b69'],
    plotOptions: { radialBar: { startAngle: -110, endAngle: 110, hollow: { size: '64%' }, track: { background: 'var(--analytics-soft)', strokeWidth: '100%', margin: 0 }, dataLabels: { name: { show: false }, value: { show: true, offsetY: 5, fontSize: '13px', fontWeight: 750, color: 'var(--analytics-ink)', formatter: value => Math.round(value) + '%' } } } },
    stroke: { lineCap: 'round' }
  }
  const rankingMax = values => Math.max(1, ...values.map(([, count]) => Number(count) || 0))

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
    {rangeLoading && <div className="analytics-range-loading" role="status" aria-live="polite"><div className="analytics-range-loading-card"><span className="analytics-range-spinner"/><strong>Loading selected days</strong><small>Updating charts and daily insights…</small></div></div>}
    <header className="analytics-hero">
      <div><div className="analytics-eyebrow"><Activity size={13}/> APML PORTAL INTELLIGENCE</div><h1>Portal <span>Activity</span></h1><p>Live portal activity, visitor sessions and operational downloads — synced directly with the new Firebase database.</p></div>
      <div className="analytics-hero-actions"><button className={"analytics-action-btn" + (customizing ? " primary" : "")} onClick={() => setCustomizing(value => !value)}><SlidersHorizontal size={15}/>{customizing ? "Done" : "Customize"}</button><button className="analytics-action-btn" onClick={exportCsv}><FileDown size={15}/> Export CSV</button><button className="analytics-action-btn primary" onClick={() => setRefreshKey(key => key + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'analytics-spin' : ''}/> Refresh</button></div>
    </header>

    <div className="analytics-toolbar"><div className="analytics-range-tabs">{[['7','7 days'],['30','30 days'],['90','3 months'],['180','6 months'],['365','1 year']].map(([value, label]) => <button key={value} className={range === value ? 'active' : ''} onClick={() => { if (range !== value) { setRangeLoading(true); setRange(value) } }}>{label}</button>)}</div><span className="analytics-period">{labelDate(startDate)} – {labelDate(endDate)} · IST</span></div>
    {customizing && <section className="analytics-customizer" aria-label="Customize Portal Activity dashboard">
      <div className="analytics-customizer-head"><div><strong>Customize Portal Activity</strong><p>Show or hide cards, then drag cards on the dashboard to change their order. Your choices are saved in this browser.</p></div><button type="button" className="analytics-reset-btn" onClick={resetDashboard}><RotateCcw size={13}/> Reset layout</button></div>
      <div className="analytics-customizer-list">{ACTIVITY_WIDGETS.map(([id, label]) => <label key={id} className="analytics-customizer-option"><input type="checkbox" checked={widgetVisible(id)} onChange={() => toggleWidget(id)}/><span>{label}</span><GripVertical size={14}/></label>)}</div>
    </section>}
    {error && <div className="analytics-error" role="alert">{error}</div>}
    {loading && <div className="analytics-loading"><span/> Syncing live Firebase data…</div>}

    <div className="analytics-bento-grid">
    <section className="analytics-kpis">
      <article className="analytics-kpi live analytics-kpi-online" {...widgetProps('people-online')}><div className="analytics-kpi-top"><span className="analytics-kpi-icon"><Users size={18}/></span><span>People online</span><i/></div><div className="analytics-kpi-gauge-row"><strong>{fmt(activePresence)}</strong><div className="analytics-online-gauge"><ReactApexChart options={onlineGaugeOptions} series={[presenceShare]} type="radialBar" height={76}/></div></div><small>{presenceShare}% of tracked presence records active · last 90 seconds</small></article>
      <article className="analytics-kpi analytics-kpi-spark" {...widgetProps('pdf-generated')}><div className="analytics-kpi-top"><span className="analytics-kpi-icon red"><FileText size={18}/></span><span>PDF generated</span></div><strong>{fmt(totals.pdf)}</strong><div className="analytics-kpi-sparkline"><ReactApexChart options={{...sparkOptions, colors:['#bd303b']}} series={[{name:'PDFs',data:daily.slice(-14).map(row=>row.pdf)}]} type="area" height={42}/></div><small>{fmt(lifetimePdf)} lifetime generated</small></article>
      <article className="analytics-kpi analytics-kpi-spark" {...widgetProps('media-downloads')}><div className="analytics-kpi-top"><span className="analytics-kpi-icon blue"><Download size={18}/></span><span>Drive / Gallery downloads</span></div><strong>{fmt(totals.media)}</strong><div className="analytics-kpi-sparkline"><ReactApexChart options={{...sparkOptions, colors:['#3b82c4']}} series={[{name:'Downloads',data:daily.slice(-14).map(row=>row.media)}]} type="area" height={42}/></div><small>{fmt(lifetimeMedia)} lifetime downloads</small></article>
      <article className="analytics-kpi analytics-kpi-spark" {...widgetProps('visitor-visits')}><div className="analytics-kpi-top"><span className="analytics-kpi-icon violet"><Eye size={18}/></span><span>Visitor visits</span></div><strong>{fmt(visitorRows.visits)}</strong><div className="analytics-kpi-sparkline"><ReactApexChart options={{...sparkOptions, colors:['#8b5cf6']}} series={[{name:'Visits',data:visitorDaily.slice(-14).map(row=>row.visits)}]} type="area" height={42}/></div><small>Engaged, likely-human visits · {fmt(visitorRows.unique)} unique browsers</small></article>
    </section>

    <section className="analytics-insight-grid">
      <article className="analytics-panel analytics-chart-panel" {...widgetProps('portal-activity')}><div className="analytics-panel-head"><div><h2>Portal activity</h2><p>Daily PDF generation and Drive / Gallery downloads</p></div><span className="analytics-live-label"><i/> LIVE SYNC</span></div><div className="analytics-chart-wrap">{daily.length ? <ReactApexChart options={chartOptions} series={chartSeries} type="area" height="100%"/> : <div className="analytics-empty">No activity in this period.</div>}</div></article>
      <article className="analytics-panel analytics-visitors-chart" {...widgetProps('daily-visitors')}><div className="analytics-panel-head"><div><h2>Daily visitors</h2><p>Day-wise engaged, likely-human visits · India Standard Time</p></div><span className="analytics-row-count">{fmt(visitorDailyTotal)} visits</span></div><div className="analytics-chart-wrap analytics-visitors-bars"><ReactApexChart options={visitorChartOptions} series={visitorChartSeries} type="bar" height="100%"/></div><div className="analytics-visitor-summary"><span>Daily average <strong>{fmt(visitorDailyTotal / Math.max(1, visitorDaily.length))}</strong></span><span>Peak day <strong>{visitorPeak.visits ? labelDate(visitorPeak.date) + ' · ' + fmt(visitorPeak.visits) : '—'}</strong></span></div></article>
      <article className="analytics-panel analytics-heatmap-panel analytics-365-heatmap" {...widgetProps('visitor-heatmap')}><div className="analytics-panel-head"><div><h2>Visitor activity heatmap</h2><p>Every day across the last 365 days · darker cells indicate more visits</p></div><span className="analytics-row-count">365 days</span></div><div className="analytics-365-scroll"><div className="analytics-365-calendar"><div className="analytics-365-weekdays"><span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span></div><div className="analytics-365-months">{heatmapDays.weeks.map((week,index)=>{const day=week.find(Boolean);const prior=index?heatmapDays.weeks[index-1].find(Boolean):null;const month=day?new Date(day.date+"T12:00:00Z").getUTCMonth():-1;const priorMonth=prior?new Date(prior.date+"T12:00:00Z").getUTCMonth():-2;return <span key={index}>{day&&(index===0||month!==priorMonth)?new Date(day.date+"T12:00:00Z").toLocaleDateString("en-US",{month:"short",timeZone:"UTC"}):""}</span>})}</div><div className="analytics-365-grid">{heatmapDays.weeks.map((week,index)=><div className="analytics-365-week" key={index}>{week.map((day,dayIndex)=>day?<span key={day.date} className={"analytics-365-cell "+(day.visits===0?"level-0":day.visits<=2?"level-1":day.visits<=8?"level-2":"level-3")} title={labelDate(day.date)+": "+fmt(day.visits)+" visits"} aria-label={labelDate(day.date)+": "+fmt(day.visits)+" visits"}/>:<span key={"blank-"+dayIndex} className="analytics-365-cell empty"/>)}</div>)}</div></div></div><div className="analytics-heatmap-legend"><span>Less</span><i className="level-0"/><i className="level-1"/><i className="level-2"/><i className="level-3"/><span>More</span></div><div className="analytics-365-footnote">{labelDate(heatmapDays.first)} – {labelDate(heatmapDays.today)} · {fmt(heatmapDays.days.reduce((sum,day)=>sum+day.visits,0))} likely-human visits</div></article>
      <article className="analytics-panel analytics-insights" {...widgetProps('period-insights')}><div className="analytics-panel-head"><div><h2>Period insights</h2><p>Summary for the selected date range</p></div></div><div className="analytics-insight-row"><span>Total tracked downloads</span><strong>{fmt(combined)}</strong></div><div className="analytics-insight-row"><span>Average per day</span><strong>{fmt(combined / Math.max(1, daily.length))}</strong></div><div className="analytics-insight-row"><span>Visitor-days recorded</span><strong>{fmt(visitorRows.days)}</strong></div><div className="analytics-insight-row"><span>Busiest activity date</span><strong>{busiest && busiest.pdf + busiest.media ? shortDate(busiest.date) : '—'}</strong></div><div className="analytics-insight-note">Generated PDFs are counted separately from downloads. A PDF is not counted as a Drive/Gallery download unless it is downloaded from there separately.</div></article>
    </section>

    <section className="analytics-lower-grid">
      <article className="analytics-panel analytics-ranking-panel" {...widgetProps('most-viewed-pages')}><div className="analytics-panel-head"><div><h2>Most viewed pages</h2><p>Page views accumulated across recorded visitor sessions</p></div><span className="analytics-row-count">{topPages.length} pages</span></div>{topPages.length ? <div className="analytics-horizontal-rank">{topPages.map(([name,count],index)=><div className="analytics-horizontal-row" key={name}><div className="analytics-horizontal-meta"><span><b>{index+1}</b>{name}</span><strong>{fmt(count)}</strong></div><div className="analytics-horizontal-track"><i style={{width:((count/rankingMax(topPages))*100)+'%'}}/></div></div>)}</div> : <div className="analytics-empty compact">Page-view details will appear as visitor sessions are recorded.</div>}</article>
      <article className="analytics-panel analytics-device-panel" {...widgetProps('visitor-devices')}><div className="analytics-panel-head"><div><h2>Visitor devices</h2><p>Device share by recorded visits</p></div></div>{deviceSeries.length ? <><div className="analytics-device-donut"><ReactApexChart options={deviceChartOptions} series={deviceSeries} type="donut" height="100%"/></div><div className="analytics-insight-note">OS: {Object.entries(visitorRows.systems).sort((a,b)=>b[1]-a[1]).map(([name,count])=>name+' ('+fmt(count)+')').join(' · ') || '—'}<br/>Browsers: {Object.entries(visitorRows.browsers).sort((a,b)=>b[1]-a[1]).map(([name,count])=>name+' ('+fmt(count)+')').join(' · ') || '—'}</div></> : <div className="analytics-empty compact">Device breakdown will appear as visitor records arrive.</div>}</article>
      <article className="analytics-panel analytics-ranking-panel" {...widgetProps('visitor-locations')}><div className="analytics-panel-head"><div><h2>Visitor locations</h2><p>Approximate locations · India traffic only</p></div></div>{topLocations.length ? <div className="analytics-horizontal-rank">{topLocations.map(([place,count],index)=><div className="analytics-horizontal-row" key={place}><div className="analytics-horizontal-meta"><span><b><MapPin size={12}/></b>{place}</span><strong>{fmt(count)}</strong></div><div className="analytics-horizontal-track"><i className="location" style={{width:((count/rankingMax(topLocations))*100)+'%'}}/></div></div>)}</div> : <div className="analytics-empty compact">Location details will appear as visitor records arrive.</div>}</article>
      <article className="analytics-panel analytics-ranking-panel" {...widgetProps('browser-rankings')}><div className="analytics-panel-head"><div><h2>Browser rankings</h2><p>Browsers used by engaged visitors</p></div></div>{topBrowsers.length ? <div className="analytics-horizontal-rank">{topBrowsers.map(([browser,count],index)=><div className="analytics-horizontal-row" key={browser}><div className="analytics-horizontal-meta"><span><b>{index+1}</b>{browser}</span><strong>{fmt(count)}</strong></div><div className="analytics-horizontal-track"><i className="browser" style={{width:((count/rankingMax(topBrowsers))*100)+'%'}}/></div></div>)}</div> : <div className="analytics-empty compact">Browser details will appear as visitor records arrive.</div>}</article>

    </section>

    <section className="analytics-panel analytics-daily-panel" {...widgetProps('daily-breakdown')}><div className="analytics-panel-head"><div><h2>Daily breakdown</h2><p>Newest dates first · counts are recorded in India Standard Time</p></div><span className="analytics-row-count">{daily.length} days</span></div><div className="analytics-table-wrap"><table><thead><tr><th>Date</th><th>PDF generated</th><th>Drive / Gallery</th><th>Total</th></tr></thead><tbody>{[...daily].reverse().map(row=><tr key={row.date}><td>{labelDate(row.date)}</td><td>{fmt(row.pdf)}</td><td>{fmt(row.media)}</td><td><strong>{fmt(row.pdf+row.media)}</strong></td></tr>)}</tbody></table></div></section>

    <section className="analytics-panel analytics-activity-panel" {...widgetProps('recent-activity')}><div className="analytics-panel-head"><div><h2>Recent activity</h2><p>Latest recorded successful actions across supported modules</p></div><span className="analytics-row-count">{actions.length} events</span></div>{actions.length ? <div className="analytics-activity-list">{actions.map(item=><div className="analytics-activity-row" key={item.id}><span className="analytics-activity-icon"><Clock3 size={15}/></span><div className="analytics-activity-copy"><strong>{item.action || 'Activity'} <span>· {item.module || 'Portal'}</span></strong><small>{[item.item,item.details].filter(Boolean).join(' — ') || 'Action recorded'}</small></div><time>{item.timestamp ? new Date(Number(item.timestamp)).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}</time></div>)}</div> : <div className="analytics-empty compact">No recent actions are available in the new Firebase activity log.</div>}</section>
    <footer className="analytics-footer-note">Source: new Firebase project <strong>portalapml</strong>. Likely-human totals require visible engagement; bot detection is heuristic and cannot guarantee that every session is human. Recent activity is a limited action log, not a complete clickstream.</footer>
    </div>
  </main>
}
