import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Clock3,
  Download, FileJson, FileText, Image as ImageIcon,
  RefreshCw, Sparkles, Zap
} from 'lucide-react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend } from 'chart.js'
import { getApmlDatabase, ensureApmlAnalyticsStructure } from '../lib/firebase'
import './Analytics.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend)

const TZ = 'Asia/Kolkata'
const nf = new Intl.NumberFormat('en-IN')
const number = value => nf.format(Number(value) || 0)
const dateKey = date => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
const shiftKey = (key, offset) => { const d = new Date(key + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0, 10) }
const labelDate = key => new Date(key + 'T00:00:00Z').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' })
const fullDate = key => new Date(key + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const dayData = (logs, key) => { const row = logs?.[key] || {}; return { pdf: Number(row.pdf) || 0, media: Number(row.media) || 0 } }
const sum = values => values.reduce((total, value) => total + (Number(value) || 0), 0)
const periods = [{ id: '7d', label: '7 days', days: 7 }, { id: '30d', label: '30 days', days: 30 }, { id: '365d', label: '365 days', days: 365 }]

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type }), url = URL.createObjectURL(blob), link = document.createElement('a')
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url)
}

function StatCard({ icon: Icon, label, value, detail, tone, trend }) {
  return <article className={'an-stat an-stat-' + tone}>
    <div className="an-stat-top"><span className="an-stat-icon"><Icon size={18} /></span><span className="an-stat-tag">{trend || 'SELECTED PERIOD'}</span></div>
    <span className="an-stat-label">{label}</span><strong>{value}</strong><span className="an-stat-detail">{detail}</span>
  </article>
}

export default function Analytics() {
  const [logs, setLogs] = useState(null)
  const [totals, setTotals] = useState({ pdf: null, media: null })
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [updated, setUpdated] = useState(null)
  const [range, setRange] = useState('30d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [visitorStats, setVisitorStats] = useState(null)
  const [visitorError, setVisitorError] = useState('')
  const [visitorConnection, setVisitorConnection] = useState(() => window.__apmlVisitorTrackerStatus || { state: 'connecting', message: 'Waiting for the first browser heartbeat…' })

  const load = useCallback(async () => {
    setBusy(true); setError('')
    try {
      const db = await getApmlDatabase()
      await ensureApmlAnalyticsStructure(db)
      const [daily, pdf, media] = await Promise.all([
        db.ref('Analytics page/daily_logs').once('value'),
        db.ref('Analytics page/lifetime_totals/pdfGenerated').once('value'),
        db.ref('Analytics page/lifetime_totals/mediaDownloads').once('value')
      ])
      setLogs(daily.val() || {})
      setTotals({ pdf: Number(pdf.val()) || 0, media: Number(media.val()) || 0 })
      setUpdated(new Date())
    } catch (e) { setError(e.message || 'Could not load analytics from Firebase.') }
    finally { setBusy(false) }
  }, [])

  useEffect(() => {
    let db, refs = [], live = true
    ; (async () => {
      try {
        db = await getApmlDatabase()
        await ensureApmlAnalyticsStructure(db)
        if (!live) return
        const subscribe = (path, callback) => {
          const ref = db.ref(path), handler = snapshot => { if (live) callback(snapshot.val()) }
          ref.on('value', handler, err => { if (live) setError(err.message || 'Firebase read failed.') })
          refs.push([ref, handler])
        }
        subscribe('Analytics page/daily_logs', value => { setLogs(value || {}); setUpdated(new Date()); setBusy(false) })
        subscribe('Analytics page/lifetime_totals/pdfGenerated', value => setTotals(old => ({ ...old, pdf: Number(value) || 0 })))
        subscribe('Analytics page/lifetime_totals/mediaDownloads', value => setTotals(old => ({ ...old, media: Number(value) || 0 })))
      } catch (e) { if (live) { setError(e.message || 'Could not connect to Firebase.'); setBusy(false) } }
    })()
    return () => { live = false; refs.forEach(([ref, handler]) => ref.off('value', handler)) }
  }, [])

  useEffect(() => {
    let query, handler, live = true
    if (!admin) {
      setActivity([])
      setActivityStatus('Admin access required')
      return () => { live = false }
    }
    setActivityStatus('Connecting to activity log…')
    setActivityError('')
    ; (async () => {
      try {
        const db = await getApmlDatabase()
        if (!live) return
        query = db.ref('Analytics page/recent_actions').orderByChild('timestamp').limitToLast(50)
        handler = query.on('value', snapshot => {
          if (!live) return
          const rows = Object.entries(snapshot.val() || {}).map(([id, value]) => ({ id, ...value }))
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))
          setActivity(rows)
          setActivityStatus(rows.length ? 'Live · latest 50 events' : 'Connected · no actions recorded yet')
        }, err => {
          if (!live) return
          setActivityStatus('Read failed')
          setActivityError(err.message || 'Could not read activity log.')
        })
      } catch (err) {
        if (live) {
          setActivityStatus('Unavailable')
          setActivityError(err.message || 'Could not connect to activity log.')
        }
      }
    })()
    return () => { live = false; if (query && handler) query.off('value', handler) }
  }, [admin])
  useEffect(() => {
    const updateStatus = event => setVisitorConnection(event.detail || window.__apmlVisitorTrackerStatus || { state: 'connecting', message: 'Waiting for browser heartbeat…' })
    window.addEventListener('apml:visitor-tracker-status', updateStatus)
    if (window.__apmlVisitorTrackerStatus) setVisitorConnection(window.__apmlVisitorTrackerStatus)
    return () => window.removeEventListener('apml:visitor-tracker-status', updateStatus)
  }, [])

  useEffect(() => {
    let live = true
    let interval
    const refreshVisitors = async () => {
      try {
        const response = await fetch('https://apml-drive-api.kundar-work.workers.dev/nova/analytics?days=90', { cache: 'no-store' })
        const result = await response.json().catch(() => ({}))
        if (!response.ok || result.ok !== true) throw new Error(result.error || 'Cloudflare visitor analytics could not be loaded.')
        const data = result.visitorIntelligence || {}
        const hours = Array.from({ length: 24 }, (_, hour) => {
          const match = (data.peakHours || []).find(item => Number(item.hour) === hour)
          return { hour, count: Number(match?.count) || 0 }
        })
        if (live) {
          setVisitorStats({
            visitors: Number(data.visitors) || 0,
            visitorsToday: Number(data.visitorsToday) || 0,
            activeNow: Number(data.activeNow) || 0,
            pageViews: Number(data.pageViews) || 0,
            sessionCount: Number(data.sessions) || 0,
            averageSessionSeconds: Number(data.averageSessionSeconds) || 0,
            dailyVisitors: data.dailyVisitors || [],
            devices: data.devices || [],
            browsers: data.browsers || [],
            topPages: data.topPages || [],
            hourlyActivity: hours,
            cities: data.cities || []
          })
          setVisitorError('')
        }
      } catch (error) {
        if (live) setVisitorError(error.message || 'Could not read visitor intelligence from Cloudflare.')
      }
    }
    refreshVisitors()
    interval = window.setInterval(refreshVisitors, 30000)
    return () => { live = false; if (interval) window.clearInterval(interval) }
  }, [])

  const selected = useMemo(() => {
    if (!logs) return []
    const end = range === 'custom' ? (customEnd || dateKey(new Date())) : dateKey(new Date())
    let start
    if (range === 'custom') start = customStart
    else { const days = periods.find(item => item.id === range)?.days || 7; start = shiftKey(end, -(days - 1)) }
    if (!start || start > end) return []
    const keys = []; let cursor = start, guard = 0
    while (cursor <= end && guard++ < 740) { keys.push(cursor); cursor = shiftKey(cursor, 1) }
    return keys.map(key => ({ key, ...dayData(logs, key) }))
  }, [logs, range, customStart, customEnd])

  const periodTotals = { pdf: sum(selected.map(row => row.pdf)), media: sum(selected.map(row => row.media)) }
  const combined = periodTotals.pdf + periodTotals.media
  const activeDays = selected.filter(row => row.pdf + row.media > 0).length
  const average = selected.length ? Math.round(combined / selected.length * 10) / 10 : 0
  const peak = selected.reduce((best, row) => !best || row.pdf + row.media > best.pdf + best.media ? row : best, null)
  const heatmap = useMemo(() => {
    const end = dateKey(new Date())
    const days = Array.from({ length: 365 }, (_, i) => { const key = shiftKey(end, i - 364), day = dayData(logs, key); return { key, ...day, total: day.pdf + day.media } })
    const startWeekday = (new Date(days[0].key + 'T00:00:00Z').getUTCDay() + 6) % 7
    const cells = [...Array(startWeekday).fill(null), ...days]
    while (cells.length % 7) cells.push(null)
    const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))
    const monthLabels = weeks.map(week => {
      const monthStart = week.find(day => day && new Date(day.key + 'T00:00:00Z').getUTCDate() === 1)
      return monthStart ? new Date(monthStart.key + 'T00:00:00Z').toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' }) : ''
    })
    return { weeks, monthLabels }
  }, [logs])
  const heatmapWeeks = heatmap.weeks
  const maxHeat = Math.max(1, ...heatmapWeeks.flat().filter(Boolean).map(day => day.total))
  const chartData = {
    labels: selected.map(row => labelDate(row.key)),
    datasets: [
      { label: 'PDFs generated', data: selected.map(row => row.pdf), borderColor: '#c58a43', backgroundColor: 'rgba(197,138,67,.08)', tension: .36, fill: false, borderWidth: 2, pointRadius: selected.length > 60 ? 0 : 2, pointHoverRadius: 5 },
      { label: 'Drive/Gallery downloads', data: selected.map(row => row.media), borderColor: '#4387c9', backgroundColor: 'rgba(67,135,201,.08)', tension: .36, fill: false, borderWidth: 2, pointRadius: selected.length > 60 ? 0 : 2, pointHoverRadius: 5 }
    ]
  }
  const chartOptions = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 7, boxHeight: 7, color: 'var(--text-muted)', font: { size: 11 }, padding: 22 } }, tooltip: { backgroundColor: '#191b25', titleColor: '#fff', bodyColor: '#e7e8ee', padding: 12, cornerRadius: 10 } },
    scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#8b929e', maxTicksLimit: 10, maxRotation: 0 } }, y: { beginAtZero: true, grid: { color: 'rgba(145,155,170,.12)' }, border: { display: false }, ticks: { color: '#8b929e', precision: 0 } } }
  }
  const recentSessionCount = Number(visitorStats?.sessionCount) || 0
  const visitorDaily = visitorStats?.dailyVisitors || []
  const pageRows = (visitorStats?.topPages || []).slice(0, 8)
  const browserRows = (visitorStats?.browsers || []).slice(0, 7)
  const locationRows = (visitorStats?.cities || []).slice(0, 8)
  const deviceRows = visitorStats?.devices || []
  const hourlyRows = visitorStats?.hourlyActivity || []
  const visitorBarOptions = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: chartOptions.plugins.tooltip }, scales: { x: { beginAtZero: true, grid: { color: 'rgba(145,155,170,.12)' }, ticks: { color: '#8b929e', precision: 0 } }, y: { grid: { display: false }, ticks: { color: 'var(--text-muted)', autoSkip: false } } } }
  const pageChartData = { labels: pageRows.map(row => row.name), datasets: [{ label: 'Page views', data: pageRows.map(row => row.views || 0), backgroundColor: 'rgba(161,42,64,.78)', borderRadius: 6, maxBarThickness: 22 }] }
  const browserChartData = { labels: browserRows.map(row => row.name), datasets: [{ label: 'Sessions', data: browserRows.map(row => row.count || 0), backgroundColor: 'rgba(67,131,193,.78)', borderRadius: 6, maxBarThickness: 22 }] }
  const hourlyChartData = { labels: hourlyRows.map(row => String(row.hour).padStart(2, '0') + ':00'), datasets: [{ label: 'Session starts', data: hourlyRows.map(row => row.count || 0), backgroundColor: 'rgba(197,138,67,.78)', borderRadius: 5, maxBarThickness: 18 }] }
  const visitorDeviceData = { labels: deviceRows.map(row => row.name), datasets: [{ data: deviceRows.map(row => row.count || 0), backgroundColor: ['#9d2438', '#4387c9', '#c59b4a', '#6e9c83', '#8d78b5'], borderWidth: 0, hoverOffset: 5 }] }
  const visitorDoughnutOptions = { responsive: true, maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 7, color: 'var(--text-muted)', font: { size: 10 }, padding: 15 } }, tooltip: chartOptions.plugins.tooltip } }
  const exportCsv = () => {
    const lines = [['Date', 'PDFs generated', 'Drive/Gallery downloads', 'Total actions'], ...selected.map(row => [row.key, row.pdf, row.media, row.pdf + row.media])]
    downloadFile('apml-analytics-' + range + '.csv', lines.map(row => row.map(value => '"' + String(value).replaceAll('"', '""') + '"').join(',')).join('\n'), 'text/csv;charset=utf-8')
  }
  const exportJson = () => downloadFile('apml-analytics-' + range + '.json', JSON.stringify({ portal: 'APML Portal', generatedAt: new Date().toISOString(), timezone: TZ, dataSource: 'Analytics page', range, totals: periodTotals, lifetimeTotals: totals, days: selected }, null, 2), 'application/json')
  const applyCustom = () => { if (customStart && customEnd && customStart <= customEnd) { setRange('custom'); setCustomOpen(false) } }

  return <main className="an-page">
    <section className="an-hero">
      <div className="an-hero-orbit an-orbit-one" /><div className="an-hero-orbit an-orbit-two" />
      <div className="an-hero-copy">
        <div className="an-eyebrow"><span className="an-eyebrow-dot" /> APML PORTAL <span>/</span> BUSINESS INTELLIGENCE</div>
        <h1>Analytics<span>.</span></h1>
        <p>A clearer view of portal activity, document generation and shared-file engagement.</p>
        <div className="an-hero-meta"><span><i className="an-live-dot" /> Live Firebase data</span><span><Clock3 size={13} /> {updated ? 'Synced ' + updated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Connecting to data'}</span></div>
      </div>
      <div className="an-hero-side"><div className="an-hero-symbol"><BarChart3 size={35} strokeWidth={1.3} /></div><div><small>REPORTING TIMEZONE</small><b>India Standard Time</b><span>UTC +05:30</span></div></div>
    </section>

    <section className="an-controlbar">
      <div className="an-control-title"><span>REPORT OVERVIEW</span><small>Choose a reporting window</small></div>
      <div className="an-period-switch">{periods.map(item => <button key={item.id} className={range === item.id ? 'selected' : ''} onClick={() => setRange(item.id)}>{item.label}</button>)}<button className={range === 'custom' ? 'selected' : ''} onClick={() => setCustomOpen(value => !value)}><CalendarDays size={14} /> Custom</button></div>
      <div className="an-control-actions"><button onClick={load} disabled={busy} title="Refresh data"><RefreshCw size={15} className={busy ? 'an-spin' : ''} /></button><button onClick={exportCsv} disabled={!selected.length}><Download size={14} /> CSV</button><button onClick={exportJson} disabled={!selected.length}><FileJson size={14} /> JSON</button></div>
      {customOpen && <div className="an-custom-pop"><label>START DATE<input type="date" value={customStart} onChange={event => setCustomStart(event.target.value)} /></label><label>END DATE<input type="date" value={customEnd} onChange={event => setCustomEnd(event.target.value)} /></label><button onClick={applyCustom} disabled={!customStart || !customEnd || customStart > customEnd}>Apply dates</button></div>}
    </section>

    {error && <div className="an-error"><b>Unable to load analytics</b><span>{error}</span><button onClick={load}>Retry</button></div>}
    {busy && !logs && <div className="an-loading"><i /><i /><i /><i /></div>}

    <div className="an-dashboard-bento">
    <section className="an-section-block an-bento-snapshot">
      <div className="an-section-heading"><div><span>01 / PERFORMANCE SNAPSHOT</span><h2>The numbers that matter</h2></div><p>{selected.length} calendar days · {activeDays} active days</p></div>
      <div className="an-stats-grid">
        <StatCard icon={Zap} label="Total recorded actions" value={number(combined)} detail={number(average) + ' average actions per day'} tone="total" trend="IN THIS PERIOD" />
        <StatCard icon={FileText} label="Quotation PDFs generated" value={number(periodTotals.pdf)} detail={'Lifetime total · ' + number(totals.pdf)} tone="pdf" />
        <StatCard icon={ImageIcon} label="Drive & Gallery downloads" value={number(periodTotals.media)} detail={'Lifetime total · ' + number(totals.media)} tone="media" />
      </div>
    </section>

    <section className="an-section-block an-bento-trends">
      <div className="an-section-heading"><div><span>02 / ACTIVITY TRENDS</span><h2>Usage over time</h2></div><div className="an-peak-chip"><TrendingIcon /> {peak && peak.pdf + peak.media ? 'Peak · ' + fullDate(peak.key) : 'Waiting for activity'}</div></div>
      <div className="an-chart-card"><div className="an-chart-top"><div><b>PDFs &amp; Drive/Gallery downloads</b><span>Daily quotation PDFs generated and shared-file downloads</span></div><span className="an-chart-total">{number(combined)} <small>PDFs + downloads</small></span></div><div className="an-chart">{selected.length ? <Line data={chartData} options={{ ...chartOptions, interaction: { mode: 'index', intersect: false }, scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, stacked: false }, y: { ...chartOptions.scales.y, beginAtZero: true } } }} /> : <div className="an-empty">No activity is recorded in this reporting window.</div>}</div></div>
      <div className="an-insight-strip">
        <div><span className="an-insight-icon"><ArrowUpRight size={16} /></span><small>BUSIEST DAY</small><b>{peak && peak.pdf + peak.media ? fullDate(peak.key) : '—'}</b></div>
        <div><span className="an-insight-icon blue"><Activity size={16} /></span><small>DAILY AVERAGE</small><b>{number(average)} actions</b></div>
        <div><span className="an-insight-icon gold"><Download size={16} /></span><small>COMBINED DOWNLOADS</small><b>{number(combined)}</b></div>
      </div>
    </section>

    <section className="an-section-block an-intelligence-block an-bento-intelligence">
      <div className="an-section-heading"><div><span>03 / VISITOR INTELLIGENCE</span><h2>Understand your audience</h2></div><span className="an-planned-label">{visitorConnection.state === 'connected' ? 'COLLECTOR REACHED' : visitorConnection.state === 'error' ? 'COLLECTOR ERROR' : 'CONNECTING'}</span></div>
      <div className="an-visitor-overview">
                <div className="an-visitor-data">
          <p className={'an-visitor-status an-collector-status an-collector-' + visitorConnection.state}><i /> <span><b>{visitorConnection.state === 'connected' ? 'Browser tracker connected' : visitorConnection.state === 'error' ? 'Browser tracker failed' : 'Browser tracker connecting'}</b> · {visitorConnection.message || 'Waiting for heartbeat.'}</span></p>
          {visitorError && <p className="an-visitor-status">Analytics read: {visitorError}</p>}
          <div className="an-visitor-metrics">
            <div><small>VISITS · LAST 90 DAYS</small><b>{number(visitorStats?.visitors || 0)}</b></div>
            <div><small>VISITS TODAY</small><b>{number(visitorStats?.visitorsToday || 0)}</b></div>
          </div>
          <div className="an-visitor-lists">
            <div><b>Top devices</b>{visitorStats?.devices?.length ? visitorStats.devices.slice(0,5).map(item=><span key={item.name}>{item.name}<strong>{number(item.count)}</strong></span>) : <small>Waiting for device data</small>}</div>
            <div><b>Browsers</b>{visitorStats?.browsers?.length ? visitorStats.browsers.slice(0,5).map(item=><span key={item.name}>{item.name}<strong>{number(item.count)}</strong></span>) : <small>Waiting for browser data</small>}</div>
            <div><b>Popular pages</b>{visitorStats?.topPages?.length ? visitorStats.topPages.slice(0,5).map(item=><span key={item.name}>{item.name}<strong>{number(item.views)}</strong></span>) : <small>Waiting for page data</small>}</div>
            <div><b>Approx. locations</b>{locationRows.length ? locationRows.map(item=><span key={item.name}>{item.name}<strong>{number(item.count)}</strong></span>) : <small>No location records yet</small>}</div>
          </div>
          <p className="an-visitor-footnote">Approximate IP-derived location · raw IP addresses are not stored · {number(visitorStats?.pageViews || 0)} page views · average session {Math.round(visitorStats?.averageSessionSeconds || 0)} sec.</p>
        </div>
      </div>
      <div className="an-visitor-charts an-bento-charts">
        <article className="an-visitor-chart-card an-bento-pages"><div><b>Most visited pages</b><span>Page views from recorded browser sessions · last 90 days</span></div><div className="an-visitor-chart an-visitor-bars">{pageRows.length ? <Bar data={pageChartData} options={visitorBarOptions} /> : <small>No page-view records available yet.</small>}</div></article>
        <article className="an-visitor-chart-card an-bento-hourly"><div><b>Hourly activity</b><span>Session starts by India time · last 90 days</span></div><div className="an-visitor-chart">{recentSessionCount ? <Bar data={hourlyChartData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } }, scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, grid: { display: false }, ticks: { ...chartOptions.scales.x.ticks, maxTicksLimit: 12 } } } }} /> : <small>No session timestamps available yet.</small>}</div></article>
        <article className="an-visitor-chart-card an-bento-device"><div><b>Device mix</b><span>Recorded sessions by device</span></div><div className="an-visitor-chart an-visitor-donut">{deviceRows.length ? <Doughnut data={visitorDeviceData} options={visitorDoughnutOptions} /> : <small>No device records available yet.</small>}</div></article>
        <article className="an-visitor-chart-card an-bento-browser"><div><b>Browser mix</b><span>Recorded sessions by browser</span></div><div className="an-visitor-chart an-visitor-bars">{browserRows.length ? <Bar data={browserChartData} options={visitorBarOptions} /> : <small>No browser records available yet.</small>}</div></article>
      </div>
    </section>

    <section className="an-section-block an-bento-calendar">
      <div className="an-section-heading"><div><span>04 / ACTIVITY CALENDAR</span><h2>Your year in activity</h2></div><p>Daily activity intensity · last 365 days</p></div>
      <div className="an-heat-card"><div className="an-heat-legend"><span>Less</span><i /><i /><i /><i /><span>More</span></div><div className="an-heat-scroll"><div className="an-heat-calendar"><div className="an-heat-days"><span /><span>Mon</span><span /><span>Wed</span><span /><span>Fri</span><span /></div><div className="an-heat-months">{heatmap.monthLabels.map((month, index) => <span key={index}>{month}</span>)}</div><div className="an-heat-grid">{heatmapWeeks.map((week, wi) => <div className="an-heat-week" key={wi}>{week.map((day, di) => day ? <span key={day.key} className="an-heat-cell" style={{ '--level': day.total ? Math.max(.14, day.total / maxHeat) : 0 }} title={fullDate(day.key) + ': ' + day.pdf + ' PDFs · ' + day.media + ' downloads'} /> : <span key={'blank-' + wi + '-' + di} className="an-heat-cell an-heat-blank" />)}</div>)}</div></div></div><div className="an-heat-foot"><span>365 days</span><span>Each square represents one day</span></div></div>
    </section>


    {admin && <section id="an-audit-trail" className="an-section-block an-bento-audit">
      <div className="an-section-heading"><div><span>05 / ADMIN AUDIT TRAIL</span><h2>Recent Activity &amp; Audit Logs</h2><p>Review file names, folders, file sizes, user labels and exact timestamps for recorded actions. Older entries may not contain every detail. This is an action log, not a complete record of every click or visit.</p></div><span className="an-audit-count">{activity.length} / 50 events</span></div>
      <div className="an-audit-card"><div className="an-audit-toolbar"><span>{activityStatus} · time shown in India locale</span><select value={activityFilter} onChange={event => setActivityFilter(event.target.value)}>{modules.map(module => <option key={module} value={module}>{module === 'All' ? 'All modules' : module}</option>)}</select></div>
        {activityError ? <div className="an-empty an-audit-empty">{activityError}</div> : filteredActivity.length ? <div className="an-activity-list">{filteredActivity.map(row => <article className="an-activity-row" key={row.id}><span className="an-activity-mark"><Activity size={15} /></span><div className="an-activity-copy"><b>{row.action || 'Activity recorded'}</b><span>{[row.module, row.fileName || row.item, row.folder ? 'Folder: ' + row.folder : '', row.details].filter(Boolean).join(' · ')}</span><div className="an-activity-meta"><small><Users size={11} /> {row.user || 'Guest'}</small>{row.fileSize != null && <small>{formatBytes(row.fileSize)}</small>}{row.fileType && <small>{row.fileType}</small>}</div></div><time title={row.timestamp ? new Date(row.timestamp).toLocaleString('en-IN', { dateStyle: 'full', timeStyle: 'medium' }) : ''}>{row.timestamp ? new Date(row.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</time></article>)}</div> : <div className="an-empty an-audit-empty">No recorded actions yet.</div>}
      </div>
    </section>}
    </div>

    <footer className="an-footer"><span>APML PORTAL <i>·</i> ANALYTICS</span><p>Metrics are sourced from Firebase. PDF generation and Drive/Gallery downloads are counted separately. Visitor intelligence uses approximate Cloudflare data; activity metrics reflect recorded PDFs and Drive/Gallery downloads.</p></footer>
  </main>
}

function TrendingIcon() { return <ArrowDownRight size={14} /> }
