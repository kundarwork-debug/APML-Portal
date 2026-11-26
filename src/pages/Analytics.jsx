import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as am5 from '@amcharts/amcharts5'
import * as am5xy from '@amcharts/amcharts5/xy'
import * as am5percent from '@amcharts/amcharts5/percent'
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated'
import { Activity, Users, FileText, Download, Eye, RefreshCw, ArrowUpRight, Monitor, Smartphone, Tablet, Clock3, FileDown, MapPin } from 'lucide-react'
import './Analytics.css'

function AmChart({ kind, data = [], series = [], height = '100%' }) {
  const host = useRef(null)
  const dataKey = JSON.stringify(data)
  const seriesKey = JSON.stringify(series)
  useEffect(() => {
    if (!host.current) return
    const root = am5.Root.new(host.current)
    root.setThemes([am5themes_Animated.new(root)])
    const ink = getComputedStyle(host.current.closest('.analytics-dashboard') || host.current).getPropertyValue('--analytics-muted').trim() || '#747986'
    const grid = getComputedStyle(host.current.closest('.analytics-dashboard') || host.current).getPropertyValue('--analytics-grid').trim() || '#eceef1'
    if (kind === 'donut') {
      const chart = root.container.children.push(am5percent.PieChart.new(root, { layout: root.verticalLayout, innerRadius: am5.percent(68) }))
      const pie = chart.series.push(am5percent.PieSeries.new(root, { valueField: 'value', categoryField: 'category', alignLabels: false }))
      pie.get('colors').set('colors', [am5.color('#bd303b'), am5.color('#3b82c4'), am5.color('#8b5cf6'), am5.color('#d49b42'), am5.color('#299b69')])
      pie.labels.template.setAll({ forceHidden: true })
      pie.ticks.template.setAll({ forceHidden: true })
      pie.slices.template.setAll({ stroke: am5.color('#ffffff'), strokeWidth: 3, cornerRadius: 5, tooltipText: '{category}: {value}' })
      pie.data.setAll(data)
      const total = data.reduce((sum, item) => sum + (Number(item.value) || 0), 0)
      chart.seriesContainer.children.push(am5.Label.new(root, { text: total.toLocaleString('en-IN'), fontSize: 22, fontWeight: '700', fill: am5.color(ink), centerX: am5.percent(50), centerY: am5.percent(50), x: am5.percent(50), y: am5.percent(50) }))
      const legend = chart.children.push(am5.Legend.new(root, { centerX: am5.percent(50), x: am5.percent(50), layout: root.horizontalLayout }))
      legend.labels.template.setAll({ fill: am5.color(ink), fontSize: 10 })
      legend.valueLabels.template.setAll({ forceHidden: true })
      legend.data.setAll(pie.dataItems)
    } else {
      const chart = root.container.children.push(am5xy.XYChart.new(root, { panX: false, panY: false, wheelX: 'none', wheelY: 'none', layout: root.verticalLayout, paddingLeft: 4, paddingRight: 8 }))
      if (kind === 'heatmap') {
        const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 24 })
        xRenderer.grid.template.setAll({ forceHidden: true })
        const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'week', renderer: xRenderer }))
        const yRenderer = am5xy.AxisRendererY.new(root, { inversed: true, cellStartLocation: 0.1, cellEndLocation: 0.9 })
        yRenderer.grid.template.setAll({ forceHidden: true })
        const yAxis = chart.yAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'day', renderer: yRenderer }))
        xAxis.data.setAll([...new Set(data.map(item => item.week))].map(week => ({ week })))
        yAxis.data.setAll(['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => ({ day })))
        const heat = chart.series.push(am5xy.ColumnSeries.new(root, { xAxis, yAxis, categoryXField: 'week', categoryYField: 'day', valueField: 'value', clustered: false }))
        heat.columns.template.setAll({ width: am5.percent(88), height: am5.percent(88), strokeOpacity: 0, tooltipText: '{day} · {week}: {value} visits', cornerRadius: 3 })
        heat.set('heatRules', [{ target: heat.columns.template, dataField: 'value', key: 'fill', min: am5.color('#eef0f3'), max: am5.color('#6d45bd') }])
        heat.data.setAll(data)
      } else {
        const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 34 })
        xRenderer.grid.template.setAll({ forceHidden: true })
        xRenderer.labels.template.setAll({ fill: am5.color(ink), fontSize: 10, paddingTop: 8 })
        const xAxis = chart.xAxes.push(am5xy.CategoryAxis.new(root, { categoryField: 'label', renderer: xRenderer }))
        const yRenderer = am5xy.AxisRendererY.new(root, {})
        yRenderer.grid.template.setAll({ stroke: am5.color(grid), strokeDasharray: [3, 4] })
        yRenderer.labels.template.setAll({ fill: am5.color(ink), fontSize: 10 })
        const yAxis = chart.yAxes.push(am5xy.ValueAxis.new(root, { min: 0, extraMax: 0.12, strictMinMax: false, renderer: yRenderer }))
        xAxis.data.setAll(data)
        if (kind === 'area') {
          series.forEach((item, index) => {
            const color = index === 0 ? '#bd303b' : '#3b82c4'
            const line = chart.series.push(am5xy.LineSeries.new(root, { name: item.name, xAxis, yAxis, categoryXField: 'label', valueYField: item.field, stroke: am5.color(color), fill: am5.color(color), tooltip: am5.Tooltip.new(root, { labelText: '{name}: {valueY}' }) }))
            line.strokes.template.setAll({ strokeWidth: 3 })
            line.fills.template.setAll({ visible: true, fillOpacity: 0.13 })
            line.data.setAll(data)
          })
          const legend = chart.children.push(am5.Legend.new(root, { x: am5.percent(100), centerX: am5.percent(100), layout: root.horizontalLayout }))
          legend.labels.template.setAll({ fill: am5.color(ink), fontSize: 10 })
          legend.data.setAll(chart.series.values)
        } else {
          const columns = chart.series.push(am5xy.ColumnSeries.new(root, { name: series[0]?.name || 'Visits', xAxis, yAxis, categoryXField: 'label', valueYField: 'value', fill: am5.color('#8b5cf6'), stroke: am5.color('#8b5cf6'), tooltip: am5.Tooltip.new(root, { labelText: '{categoryX}: {valueY}' }) }))
          columns.columns.template.setAll({ width: am5.percent(62), cornerRadiusTL: 5, cornerRadiusTR: 5, strokeOpacity: 0 })
          columns.data.setAll(data)
        }
      }
      chart.set('cursor', am5xy.XYCursor.new(root, { behavior: 'none' }))
    }
    return () => root.dispose()
  }, [kind, dataKey, seriesKey])
  return <div ref={host} className="amchart-host" style={{ height, width: '100%' }} />
}
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
  const [records, setRecords] = useState({ pdfDaily: {}, mediaDaily: {}, pdfLifetime: 0, mediaLifetime: 0, sessions: {}, visitors: {}, presence: {}, actions: {} })
  const [loading, setLoading] = useState(true)
  const [rangeLoading, setRangeLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

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
        // Remove only records explicitly classified as suspected bots. Preserve all other visitor history.
        try {
          const trafficSnapshot = await database.ref('visitor_intelligence/traffic_sessions').once('value')
          const trafficData = trafficSnapshot.val() || {}
          const removals = []
          Object.entries(trafficData).forEach(([date, visitors]) => {
            Object.entries(visitors || {}).forEach(([visitorId, sessions]) => {
              Object.entries(sessions || {}).forEach(([sessionId, session]) => {
                if (session?.status === 'suspected_bot') {
                  removals.push(database.ref('visitor_intelligence/traffic_sessions/' + date + '/' + visitorId + '/' + sessionId).remove())
                }
              })
            })
          })
          await Promise.all(removals)
        } catch (cleanupError) {
          console.warn('Could not clean suspected bot session records:', cleanupError)
        }
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
    const visits = entries.reduce((sum, detail) => sum + (detail?.trafficClass === 'likely_human' ? Number(detail.visits) || 0 : 0), 0)
    return { date: row.date, visits }
  }), [daily, records.visitors])
  const visitorDailyTotal = visitorDaily.reduce((sum, row) => sum + row.visits, 0)
  const visitorPeak = visitorDaily.reduce((peak, row) => row.visits > peak.visits ? row : peak, { date: '', visits: 0 })


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
      const country = String(detail.country || '').trim().toLowerCase()
      if (country === 'india' || country === 'in' || country === 'ind') {
        const place = [detail.cityVerified ? detail.city : '', detail.region, detail.country].filter(Boolean).join(', ') || 'Unknown location'
        locations[place] = (locations[place] || 0) + count
      }
    }))
    return { visits, unique: unique.size, devices, locations, systems, browsers, days: selected.length }
  }, [records.visitors, startDate, endDate])

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
  const activePresence = useMemo(() => Object.values(records.presence || {}).filter(session =>
    session?.online === true && typeof session.timestamp === 'number' && Number.isFinite(session.timestamp) && session.timestamp >= Date.now() - 90000
  ).length, [records.presence])
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
  const portalChartData = daily.map(row => ({ label: shortDate(row.date), pdf: row.pdf, media: row.media }))
  const visitorChartData = visitorDaily.map(row => ({ label: shortDate(row.date), value: row.visits }))
  const deviceChartData = Object.entries(visitorRows.devices).map(([category, value]) => ({ category, value }))
  const heatmapData = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00Z')
    start.setUTCDate(start.getUTCDate() - start.getUTCDay())
    return visitorDaily.flatMap(row => {
      const date = new Date(row.date + 'T00:00:00Z')
      const week = 'W' + (Math.floor((date - start) / 604800000) + 1)
      return [{ week, day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getUTCDay()], value: row.visits, date: row.date }]
    })
  }, [visitorDaily, startDate])


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
      <div><div className="analytics-eyebrow"><Activity size={13}/> APML PORTAL INTELLIGENCE</div><h1>Analytics <span>Overview</span></h1><p>Live portal activity, visitor sessions and operational downloads — synced directly with the new Firebase database.</p></div>
      <div className="analytics-hero-actions"><button className="analytics-action-btn" onClick={exportCsv}><FileDown size={15}/> Export CSV</button><button className="analytics-action-btn primary" onClick={() => setRefreshKey(key => key + 1)} disabled={loading}><RefreshCw size={15} className={loading ? 'analytics-spin' : ''}/> Refresh</button></div>
    </header>

    <div className="analytics-toolbar"><div className="analytics-range-tabs">{[['7','7 days'],['30','30 days'],['90','3 months'],['180','6 months'],['365','1 year']].map(([value, label]) => <button key={value} className={range === value ? 'active' : ''} onClick={() => { if (range !== value) { setRangeLoading(true); setRange(value) } }}>{label}</button>)}</div><span className="analytics-period">{labelDate(startDate)} – {labelDate(endDate)} · IST</span></div>
    {error && <div className="analytics-error" role="alert">{error}</div>}
    {loading && <div className="analytics-loading"><span/> Syncing live Firebase data…</div>}

    <div className="analytics-bento-grid">
    <section className="analytics-kpis">
      <article className="analytics-kpi live"><div className="analytics-kpi-top"><span className="analytics-kpi-icon"><Users size={18}/></span><span>People online</span><i/></div><strong>{fmt(activePresence)}</strong><small>Live sessions updated within 90 seconds</small></article>
      <article className="analytics-kpi"><div className="analytics-kpi-top"><span className="analytics-kpi-icon red"><FileText size={18}/></span><span>PDF generated</span></div><strong>{fmt(totals.pdf)}</strong><small>{fmt(lifetimePdf)} lifetime generated</small></article>
      <article className="analytics-kpi"><div className="analytics-kpi-top"><span className="analytics-kpi-icon blue"><Download size={18}/></span><span>Drive / Gallery downloads</span></div><strong>{fmt(totals.media)}</strong><small>{fmt(lifetimeMedia)} lifetime downloads</small></article>
      <article className="analytics-kpi"><div className="analytics-kpi-top"><span className="analytics-kpi-icon violet"><Eye size={18}/></span><span>Visitor visits</span></div><strong>{fmt(visitorRows.visits)}</strong><small>Engaged, likely-human visits · {fmt(visitorRows.unique)} unique browsers</small></article>
    </section>

    <section className="analytics-insight-grid">
      <article className="analytics-panel analytics-chart-panel"><div className="analytics-panel-head"><div><h2>Portal activity</h2><p>Daily PDF generation and Drive / Gallery downloads</p></div><span className="analytics-live-label"><i/> LIVE SYNC</span></div><div className="analytics-chart-wrap">{daily.length ? <AmChart kind="area" data={portalChartData} series={[{ name: "PDF generated", field: "pdf" }, { name: "Drive / Gallery downloads", field: "media" }]} /> : <div className="analytics-empty">No activity in this period.</div>}</div></article>
      <article className="analytics-panel analytics-visitors-chart"><div className="analytics-panel-head"><div><h2>Daily visitors</h2><p>Day-wise engaged, likely-human visits · India Standard Time</p></div><span className="analytics-row-count">{fmt(visitorDailyTotal)} visits</span></div><div className="analytics-chart-wrap analytics-visitors-bars"><AmChart kind="bar" data={visitorChartData} series={[{ name: "Likely-human visits" }]} /></div><div className="analytics-visitor-summary"><span>Daily average <strong>{fmt(visitorDailyTotal / Math.max(1, visitorDaily.length))}</strong></span><span>Peak day <strong>{visitorPeak.visits ? labelDate(visitorPeak.date) + ' · ' + fmt(visitorPeak.visits) : '—'}</strong></span></div></article>
      <article className="analytics-panel analytics-heatmap-panel"><div className="analytics-panel-head"><div><h2>Visitor activity heatmap</h2><p>Weekly pattern · darker cells indicate more visits</p></div><span className="analytics-row-count">{range} days</span></div><div className="analytics-heatmap-wrap"><AmChart kind="heatmap" data={heatmapData} /></div><div className="analytics-heatmap-legend"><span>Less</span><i className="level-0"/><i className="level-1"/><i className="level-2"/><i className="level-3"/><span>More</span></div></article>
      <article className="analytics-panel analytics-insights"><div className="analytics-panel-head"><div><h2>Period insights</h2><p>Summary for the selected date range</p></div></div><div className="analytics-insight-row"><span>Total tracked downloads</span><strong>{fmt(combined)}</strong></div><div className="analytics-insight-row"><span>Average per day</span><strong>{fmt(combined / Math.max(1, daily.length))}</strong></div><div className="analytics-insight-row"><span>Visitor-days recorded</span><strong>{fmt(visitorRows.days)}</strong></div><div className="analytics-insight-row"><span>Busiest activity date</span><strong>{busiest && busiest.pdf + busiest.media ? shortDate(busiest.date) : '—'}</strong></div><div className="analytics-insight-note">Generated PDFs are counted separately from downloads. A PDF is not counted as a Drive/Gallery download unless it is downloaded from there separately.</div></article>
    </section>

    <section className="analytics-lower-grid">
      <article className="analytics-panel"><div className="analytics-panel-head"><div><h2>Most viewed pages</h2><p>Page views accumulated across recorded visitor sessions</p></div></div>{topPages.length ? <div className="analytics-rank-list">{topPages.map(([name, count], index) => <div className="analytics-rank-row" key={name}><span className="analytics-rank-number">{index + 1}</span><span className="analytics-rank-name">{name}</span><strong>{fmt(count)}</strong></div>)}</div> : <div className="analytics-empty compact">Page-view details will appear as visitor sessions are recorded.</div>}</article>
      <article className="analytics-panel analytics-device-panel"><div className="analytics-panel-head"><div><h2>Visitor devices</h2><p>Device share by recorded visits</p></div></div>{deviceSeries.length ? <><div className="analytics-device-donut"><AmChart kind="donut" data={deviceChartData} /></div><div className="analytics-insight-note">OS: {Object.entries(visitorRows.systems).sort((a,b)=>b[1]-a[1]).map(([name,count])=>name+' ('+fmt(count)+')').join(' · ') || '—'}<br/>Browsers: {Object.entries(visitorRows.browsers).sort((a,b)=>b[1]-a[1]).map(([name,count])=>name+' ('+fmt(count)+')').join(' · ') || '—'}</div></> : <div className="analytics-empty compact">Device breakdown will appear as visitor records arrive.</div>}</article>
      <article className="analytics-panel"><div className="analytics-panel-head"><div><h2>Visitor locations</h2><p>Approximate location from network information</p></div></div>{Object.keys(visitorRows.locations).length ? <div className="analytics-rank-list">{Object.entries(visitorRows.locations).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([place,count],index)=><div className="analytics-rank-row" key={place}><span className="analytics-rank-number"><MapPin size={14}/></span><span className="analytics-rank-name">{place}</span><strong>{fmt(count)}</strong></div>)}</div> : <div className="analytics-empty compact">Location details will appear as visitor records arrive.</div>}</article>

    </section>

    <section className="analytics-panel analytics-daily-panel"><div className="analytics-panel-head"><div><h2>Daily breakdown</h2><p>Newest dates first · counts are recorded in India Standard Time</p></div><span className="analytics-row-count">{daily.length} days</span></div><div className="analytics-table-wrap"><table><thead><tr><th>Date</th><th>PDF generated</th><th>Drive / Gallery</th><th>Total</th></tr></thead><tbody>{[...daily].reverse().map(row=><tr key={row.date}><td>{labelDate(row.date)}</td><td>{fmt(row.pdf)}</td><td>{fmt(row.media)}</td><td><strong>{fmt(row.pdf+row.media)}</strong></td></tr>)}</tbody></table></div></section>

    <section className="analytics-panel analytics-activity-panel"><div className="analytics-panel-head"><div><h2>Recent activity</h2><p>Latest recorded successful actions across supported modules</p></div><span className="analytics-row-count">{actions.length} events</span></div>{actions.length ? <div className="analytics-activity-list">{actions.map(item=><div className="analytics-activity-row" key={item.id}><span className="analytics-activity-icon"><Clock3 size={15}/></span><div className="analytics-activity-copy"><strong>{item.action || 'Activity'} <span>· {item.module || 'Portal'}</span></strong><small>{[item.item,item.details].filter(Boolean).join(' — ') || 'Action recorded'}</small></div><time>{item.timestamp ? new Date(Number(item.timestamp)).toLocaleString('en-IN',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}) : '—'}</time></div>)}</div> : <div className="analytics-empty compact">No recent actions are available in the new Firebase activity log.</div>}</section>
    <footer className="analytics-footer-note">Source: new Firebase project <strong>portalapml</strong>. Likely-human totals require visible engagement; bot detection is heuristic and cannot guarantee that every session is human. Recent activity is a limited action log, not a complete clickstream.</footer>
    </div>
  </main>
}
