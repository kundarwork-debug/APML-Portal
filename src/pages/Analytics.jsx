import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Clock3,
  Download, FileJson, FileText, Globe2, Image as ImageIcon, MapPin,
  RefreshCw, Sparkles, Users, Zap
} from 'lucide-react'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend } from 'chart.js'
import { getApmlDatabase, ensureApmlAnalyticsStructure } from '../lib/firebase'
import { useApmlAdminAuth } from '../lib/firebaseAuth'
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
  const [range, setRange] = useState('7d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [customOpen, setCustomOpen] = useState(false)
  const [activity, setActivity] = useState([])
  const [activityFilter, setActivityFilter] = useState('All')
  const [visitorStats, setVisitorStats] = useState(null)
  const [visitorError, setVisitorError] = useState('')
  const { admin } = useApmlAdminAuth()

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
    if (!admin) return
    let ref, handler, live = true
    ; (async () => {
      try {
        const db = await getApmlDatabase()
        if (!live) return
        ref = db.ref('Analytics page/recent_actions')
        handler = ref.orderByChild('timestamp').limitToLast(50).on('value', snapshot => {
          if (!live) return
          setActivity(Object.entries(snapshot.val() || {}).map(([id, value]) => ({ id, ...value })).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)))
        }, err => console.warn('Activity log listener:', err.message))
      } catch (err) { console.warn('Activity log unavailable:', err.message) }
    })()
    return () => { live = false; if (ref && handler) ref.off('value', handler) }
  }, [admin])
  useEffect(() => {
    let live = true
    const refreshVisitors = async () => {
      try {
        const response = await fetch('https://apml-drive-api.kundar-work.workers.dev/nova/analytics?days=365')
        if (!response.ok) throw new Error('Visitor analytics endpoint is not ready yet.')
        const data = await response.json()
        if (!data.ok || !data.visitorIntelligence) throw new Error(data.error || 'Visitor analytics are temporarily unavailable.')
        if (live) { setVisitorStats(data.visitorIntelligence); setVisitorError('') }
      } catch (error) {
        if (live) setVisitorError(error.message || 'Visitor analytics are temporarily unavailable.')
      }
    }
    refreshVisitors()
    const interval = window.setInterval(refreshVisitors, 30000)
    return () => { live = false; window.clearInterval(interval) }
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
  const visibleRows = useMemo(() => range === '365d' ? selected.slice(-45).reverse() : [...selected].reverse(), [selected, range])
  const heatmap = useMemo(() => {
    const end = dateKey(new Date())
    return Array.from({ length: 365 }, (_, i) => { const key = shiftKey(end, i - 364), day = dayData(logs, key); return { key, ...day, total: day.pdf + day.media } })
  }, [logs])
  const maxHeat = Math.max(1, ...heatmap.map(day => day.total))
  const modules = ['All', ...new Set(activity.map(row => row.module).filter(Boolean).sort())]
  const filteredActivity = activityFilter === 'All' ? activity : activity.filter(row => row.module === activityFilter)
  const chartData = {
    labels: selected.map(row => labelDate(row.key)),
    datasets: [
      { label: 'PDFs generated', data: selected.map(row => row.pdf), borderColor: '#c23b50', backgroundColor: 'rgba(194,59,80,.13)', tension: .38, fill: true, borderWidth: 2.5, pointRadius: selected.length > 60 ? 0 : 3, pointHoverRadius: 5 },
      { label: 'Drive/Gallery downloads', data: selected.map(row => row.media), borderColor: '#4387c9', backgroundColor: 'rgba(67,135,201,.08)', tension: .38, fill: true, borderWidth: 2.5, pointRadius: selected.length > 60 ? 0 : 3, pointHoverRadius: 5 }
    ]
  }
  const chartOptions = {
    responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 7, boxHeight: 7, color: 'var(--text-muted)', font: { size: 11 }, padding: 22 } }, tooltip: { backgroundColor: '#191b25', titleColor: '#fff', bodyColor: '#e7e8ee', padding: 12, cornerRadius: 10 } },
    scales: { x: { grid: { display: false }, border: { display: false }, ticks: { color: '#8b929e', maxTicksLimit: 10, maxRotation: 0 } }, y: { beginAtZero: true, grid: { color: 'rgba(145,155,170,.12)' }, border: { display: false }, ticks: { color: '#8b929e', precision: 0 } } }
  }
  const visitorDaily = visitorStats?.dailySessions || []
  const visitorUniqueDaily = visitorStats?.dailyUniqueVisitors || []
  const visitorTrendData = {
    labels: visitorDaily.map(row => new Date(row.date + 'T00:00:00Z').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', timeZone: 'UTC' })),
    datasets: [
      { label: 'Sessions', data: visitorDaily.map(row => row.sessions || 0), borderColor: '#9d2438', backgroundColor: 'rgba(157,36,56,.13)', fill: true, tension: .35, borderWidth: 2, pointRadius: 0 },
      { label: 'Estimated unique visitors', data: visitorUniqueDaily.map(row => row.visitors || 0), borderColor: '#4387c9', backgroundColor: 'rgba(67,135,201,.08)', fill: true, tension: .35, borderWidth: 2, pointRadius: 0 }
    ]
  }
  const visitorTrendOptions = { ...chartOptions, plugins: { ...chartOptions.plugins, legend: { ...chartOptions.plugins.legend, position: 'bottom' } }, scales: { ...chartOptions.scales, x: { ...chartOptions.scales.x, ticks: { ...chartOptions.scales.x.ticks, maxTicksLimit: 8 } } } }
  const cityRows = visitorStats?.cities?.slice(0, 6) || []
  const deviceRows = visitorStats?.devices || []
  const visitorBarData = { labels: cityRows.map(row => row.name), datasets: [{ label: 'Sessions', data: cityRows.map(row => row.count || 0), backgroundColor: 'rgba(157,36,56,.72)', borderRadius: 6, maxBarThickness: 22 }] }
  const visitorBarOptions = { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: chartOptions.plugins.tooltip }, scales: { x: { beginAtZero: true, grid: { color: 'rgba(145,155,170,.12)' }, ticks: { color: '#8b929e', precision: 0 } }, y: { grid: { display: false }, ticks: { color: 'var(--text-muted)', autoSkip: false } } } }
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

    <section className="an-section-block">
      <div className="an-section-heading"><div><span>01 / PERFORMANCE SNAPSHOT</span><h2>The numbers that matter</h2></div><p>{selected.length} calendar days · {activeDays} active days</p></div>
      <div className="an-stats-grid">
        <StatCard icon={Zap} label="Total recorded actions" value={number(combined)} detail={number(average) + ' average actions per day'} tone="total" trend="IN THIS PERIOD" />
        <StatCard icon={FileText} label="Quotation PDFs generated" value={number(periodTotals.pdf)} detail={'Lifetime total · ' + number(totals.pdf)} tone="pdf" />
        <StatCard icon={ImageIcon} label="Drive & Gallery downloads" value={number(periodTotals.media)} detail={'Lifetime total · ' + number(totals.media)} tone="media" />
        <StatCard icon={CalendarDays} label="Active days" value={number(activeDays)} detail={selected.length ? Math.round(activeDays / selected.length * 100) + '% of selected days' : 'No reporting days'} tone="days" />
      </div>
    </section>

    <section className="an-section-block">
      <div className="an-section-heading"><div><span>02 / ACTIVITY TRENDS</span><h2>Usage over time</h2></div><div className="an-peak-chip"><TrendingIcon /> {peak && peak.pdf + peak.media ? 'Peak · ' + fullDate(peak.key) : 'Waiting for activity'}</div></div>
      <div className="an-chart-card"><div className="an-chart-top"><div><b>Daily activity</b><span>Compare quotation PDF generation with Drive/Gallery downloads</span></div><span className="an-chart-total">{number(combined)} <small>actions</small></span></div><div className="an-chart">{selected.length ? <Line data={chartData} options={chartOptions} /> : <div className="an-empty">No activity is recorded in this reporting window.</div>}</div></div>
      <div className="an-insight-strip">
        <div><span className="an-insight-icon"><ArrowUpRight size={16} /></span><small>BUSIEST DAY</small><b>{peak && peak.pdf + peak.media ? fullDate(peak.key) : '—'}</b></div>
        <div><span className="an-insight-icon blue"><Activity size={16} /></span><small>DAILY AVERAGE</small><b>{number(average)} actions</b></div>
        <div><span className="an-insight-icon gold"><Download size={16} /></span><small>COMBINED DOWNLOADS</small><b>{number(combined)}</b></div>
      </div>
    </section>

    <section className="an-section-block an-intelligence-block">
      <div className="an-section-heading"><div><span>03 / VISITOR INTELLIGENCE</span><h2>Understand your audience</h2></div><span className="an-planned-label">{visitorStats ? 'COLLECTING LIVE' : 'CONNECTING'}</span></div>
      <div className="an-visitor-overview">
        <div className="an-visitor-intro"><div className="an-visitor-globe"><Globe2 size={30} /></div><div><h3>Estimated visitors, not just page loads.</h3><p>Understand how people discover and use APML Portal through aggregated visitor sessions, approximate network locations, device types and popular pages. Visitor identity and human/bot classification are estimates, not verified identities.</p></div><div className="an-visitor-note"><MapPin size={15} /><span>Approximate location only · no GPS · raw IP addresses are not returned by this analytics endpoint · visitor metrics are based on up to 500 short-lived sessions.</span></div></div>
        <div className="an-visitor-data">
          {visitorError && <p className="an-visitor-status">{visitorError}</p>}
          <div className="an-visitor-metrics">
            <div><small>SESSIONS</small><b>{number(visitorStats?.sessions || 0)}</b></div>
            <div><small>EST. UNIQUE VISITORS</small><b>{number(visitorStats?.uniqueBrowsers || 0)}</b></div>
            <div><small>RETURNING VISITORS</small><b>{number(visitorStats?.returningBrowsers || 0)}</b></div>
            <div><small>ACTIVE NOW</small><b>{number(visitorStats?.activeNow || 0)}</b></div>
          </div>
          <div className="an-visitor-lists">
            <div><b>Top locations</b>{visitorStats?.cities?.length ? visitorStats.cities.slice(0,5).map(item=><span key={item.name}>{item.name}<strong>{number(item.count)}</strong></span>) : <small>Waiting for location data</small>}</div>
            <div><b>Devices &amp; browsers</b>{visitorStats?.devices?.length ? visitorStats.devices.slice(0,3).map(item=><span key={item.name}>{item.name}<strong>{number(item.count)}</strong></span>) : <small>Waiting for device data</small>}{visitorStats?.browsers?.slice(0,2).map(item=><span key={item.name}>{item.name}<strong>{number(item.count)}</strong></span>)}</div>
            <div><b>Popular pages</b>{visitorStats?.topPages?.length ? visitorStats.topPages.slice(0,5).map(item=><span key={item.name}>{item.name}<strong>{number(item.views)}</strong></span>) : <small>Waiting for page data</small>}</div>
          </div>
          <p className="an-visitor-footnote">Estimated human traffic · {number(visitorStats?.pageViews || 0)} page views · average session {Math.round(visitorStats?.averageSessionSeconds || 0)} sec · refreshed every 30 seconds.</p>
        </div>
      </div>
      <div className="an-visitor-charts">
        <article className="an-visitor-chart-card an-visitor-trend"><div><b>Visitor trend</b><span>Daily sessions vs estimated unique visitors · last 365 days</span></div><div className="an-visitor-chart">{visitorDaily.length ? <Line data={visitorTrendData} options={visitorTrendOptions} /> : <small>No visitor trend data available yet.</small>}</div></article>
        <article className="an-visitor-chart-card"><div><b>Top locations</b><span>Sessions by approximate city</span></div><div className="an-visitor-chart an-visitor-bars">{cityRows.length ? <Bar data={visitorBarData} options={visitorBarOptions} /> : <small>No location data available yet.</small>}</div></article>
        <article className="an-visitor-chart-card"><div><b>Device mix</b><span>Share of recorded sessions</span></div><div className="an-visitor-chart an-visitor-donut">{deviceRows.length ? <Doughnut data={visitorDeviceData} options={visitorDoughnutOptions} /> : <small>No device data available yet.</small>}</div></article>
      </div>
    </section>

    <section className="an-section-block">
      <div className="an-section-heading"><div><span>04 / ACTIVITY CALENDAR</span><h2>Your year in activity</h2></div><p>Daily activity intensity · last 365 days</p></div>
      <div className="an-heat-card"><div className="an-heat-legend"><span>Less</span><i /><i /><i /><i /><span>More</span></div><div className="an-heat-scroll"><div className="an-heat-grid">{heatmap.map(day => <span key={day.key} className="an-heat-cell" style={{ '--level': day.total ? Math.max(.14, day.total / maxHeat) : 0 }} title={fullDate(day.key) + ': ' + day.pdf + ' PDFs · ' + day.media + ' downloads'} />)}</div></div><div className="an-heat-foot"><span>365 days</span><span>Each square represents one day</span></div></div>
    </section>

    <section className="an-section-block">
      <div className="an-section-heading"><div><span>05 / DAILY REPORT</span><h2>Activity breakdown</h2></div><p>{range === '365d' ? 'Latest 45 days shown · export for full range' : 'Newest dates first'}</p></div>
      <div className="an-table-card"><div className="an-table-wrap"><table className="an-table"><thead><tr><th>DATE</th><th>PDF GENERATED</th><th>DRIVE / GALLERY</th><th>TOTAL</th></tr></thead><tbody>{visibleRows.length ? visibleRows.map(row => <tr key={row.key}><td>{fullDate(row.key)}</td><td><span className="an-table-dot pdf-dot" />{number(row.pdf)}</td><td><span className="an-table-dot media-dot" />{number(row.media)}</td><td><b>{number(row.pdf + row.media)}</b></td></tr>) : <tr><td colSpan="4" className="an-empty">No data available for this period.</td></tr>}</tbody></table></div></div>
    </section>

    {admin && <section className="an-section-block">
      <div className="an-section-heading"><div><span>06 / ADMIN AUDIT TRAIL</span><h2>Recent Activity &amp; Audit Logs</h2><p>Review selected recorded actions across Quotation Editor, Drive, Gallery, Directory and Field Officer. Each entry includes an activity summary, user label and timestamp where available. This is an action log, not a complete record of every click or visit.</p></div><span className="an-audit-count">{activity.length} / 50 events</span></div>
      <div className="an-audit-card"><div className="an-audit-toolbar"><span>Latest successful instrumented actions</span><select value={activityFilter} onChange={event => setActivityFilter(event.target.value)}>{modules.map(module => <option key={module} value={module}>{module === 'All' ? 'All modules' : module}</option>)}</select></div>
        {filteredActivity.length ? <div className="an-activity-list">{filteredActivity.map(row => <article className="an-activity-row" key={row.id}><span className="an-activity-mark"><Activity size={15} /></span><div className="an-activity-copy"><b>{row.action || 'Activity recorded'}</b><span>{[row.module, row.item, row.details].filter(Boolean).join(' · ')}</span><small>{row.user || 'Guest'}</small></div><time>{row.timestamp ? new Date(row.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}</time></article>)}</div> : <div className="an-empty an-audit-empty">No recorded actions yet.</div>}
      </div>
    </section>}

    <footer className="an-footer"><span>APML PORTAL <i>·</i> ANALYTICS</span><p>Metrics are sourced from Firebase. PDF generation and Drive/Gallery downloads are counted separately. Recent Activity shows the latest 50 instrumented actions, not every click or page view.</p></footer>
  </main>
}

function TrendingIcon() { return <ArrowDownRight size={14} /> }
