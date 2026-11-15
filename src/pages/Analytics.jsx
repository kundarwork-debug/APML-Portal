import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, BarChart3, CalendarDays, Clock3, Download, FileDown, FileSpreadsheet,
  Gauge, Globe2, MonitorSmartphone, RefreshCw, Sparkles, TrendingUp, Users,
  FileText, MapPin, Layers3, Zap
} from 'lucide-react'
import './Analytics.css'
import { getApmlDatabase } from '../lib/firebase'

const API_URL = 'https://apml-drive-api.kundar-work.workers.dev/nova/analytics'
const fmt = value => new Intl.NumberFormat('en-IN').format(Number(value) || 0)
const duration = value => {
  const seconds = Math.max(0, Number(value) || 0)
  return seconds < 60 ? Math.round(seconds) + 's' : Math.floor(seconds / 60) + 'm ' + Math.round(seconds % 60) + 's'
}
const ms = value => value == null || !Number.isFinite(Number(value)) ? '—' : Number(value) >= 1000 ? (Number(value) / 1000).toFixed(2) + ' s' : Math.round(value) + ' ms'
const dateKey = date => {
  const d = new Date(date)
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-')
}
const shiftDate = (key, amount) => {
  const d = new Date(key + 'T12:00:00')
  d.setDate(d.getDate() + amount)
  return dateKey(d)
}
const dateLabel = key => new Date(key + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
const pctChange = (current, previous) => {
  if (!Number(previous)) return Number(current) ? '+100%' : '0%'
  const n = ((Number(current) - Number(previous)) / Number(previous)) * 100
  return (n > 0 ? '+' : '') + n.toFixed(1) + '%'
}
const csvDownload = (filename, rows) => {
  const csv = '\ufeff' + rows.map(row => row.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 3000)
}
async function ensureApex() {
  if (window.ApexCharts) return
  if (!window.__apmlApexPromise) window.__apmlApexPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/apexcharts@3.54.1/dist/apexcharts.min.js'
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
  await window.__apmlApexPromise
}

function Sparkline({ values = [] }) {
  const width = 180, height = 42, pad = 4
  const nums = values.map(value => Number(value) || 0)
  if (!nums.length) return <div className="analytics-sparkline-empty" aria-label="No trend data yet" />
  const max = Math.max(...nums, 1), min = Math.min(...nums, 0), span = max - min || 1
  const coords = nums.map((value, index) => [nums.length === 1 ? width / 2 : pad + index * (width - pad * 2) / (nums.length - 1), height - pad - ((value - min) / span) * (height - pad * 2)])
  const line = coords.length < 2 ? `M ${coords[0][0]} ${coords[0][1]} L ${coords[0][0] + 1} ${coords[0][1]}` : coords.slice(1).reduce((path, point, index) => {
    const previous = coords[index]
    const mid = (previous[0] + point[0]) / 2
    return path + ` C ${mid} ${previous[1]}, ${mid} ${point[1]}, ${point[0]} ${point[1]}`
  }, `M ${coords[0][0]} ${coords[0][1]}`)
  return <svg className="analytics-sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label="Daily trend sparkline">
    <path className="analytics-sparkline-line" d={line}/>
  </svg>
}

export default function Analytics() {
  const [data, setData] = useState(null)
  const [range, setRange] = useState('30')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState(dateKey(new Date()))
  const [customOpen, setCustomOpen] = useState(false)
  const [chartType, setChartType] = useState('area')
  const [visible, setVisible] = useState({ visitors: true, pdf: true, media: true })
  const [hideEmpty, setHideEmpty] = useState(true)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [firebaseLive, setFirebaseLive] = useState(false)
  const [onlineNow, setOnlineNow] = useState(null)
  const rangeRef = useRef(range)
  const customStartRef = useRef(customStart)
  const customEndRef = useRef(customEnd)
  const loadReportRef = useRef(null)
  rangeRef.current = range
  customStartRef.current = customStart
  customEndRef.current = customEnd
  loadReportRef.current = loadReport
  const trendRef = useRef(null)
  const visitorRef = useRef(null)
  const performanceRef = useRef(null)
  const charts = useRef([])

  const loadReport = useCallback(async (selectedRange = range, start = '', end = '') => {
    setBusy(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (start && end) { params.set('start', start); params.set('end', end) }
      else params.set('days', selectedRange)
      const response = await fetch(API_URL + '?' + params.toString(), { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok) throw new Error(result.error || 'Analytics report could not be loaded.')
      setData(result)
    } catch (err) {
      setError(err.message || 'Analytics report could not be loaded.')
    } finally {
      setBusy(false)
    }
  }, [range])

  useEffect(() => { if (range !== 'custom') loadReport(range) }, [range, loadReport])

  // Subscribe to Firebase Realtime Database so the dashboard updates as soon
  // as the portal writes new daily activity, downloads, sessions or presence.
  // The Worker remains responsible for privacy-safe aggregation and insights.
  useEffect(() => {
    let db
    let refreshTimer
    let disposed = false
    const subscriptions = []
    const queueRefresh = () => {
      clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        if (disposed) return
        const selected = rangeRef.current
        if (selected === 'custom') {
          if (customStartRef.current && customEndRef.current) loadReportRef.current?.('custom', customStartRef.current, customEndRef.current)
        } else {
          loadReportRef.current?.(selected)
        }
      }, 650)
    }
    const attach = (database, path, callback) => {
      const ref = database.ref(path)
      ref.on('value', callback, () => setFirebaseLive(false))
      subscriptions.push(() => ref.off('value', callback))
    }
    getApmlDatabase().then(database => {
      if (disposed) return
      db = database
      setFirebaseLive(true)
      attach(db, 'analytics/daily_logs', queueRefresh)
      attach(db, 'analytics/visitor_sessions', queueRefresh)
      attach(db, 'analytics/totalPdfDownloads', snap => {
        const value = Number(snap.val()) || 0
        setData(current => current ? { ...current, totals: { ...current.totals, totalPdfsLifetime: value } } : current)
      })
      attach(db, 'analytics/totalMediaDownloads', snap => {
        const value = Number(snap.val()) || 0
        setData(current => current ? { ...current, totals: { ...current.totals, totalMediaLifetime: value } } : current)
      })
      attach(db, 'presence', snap => setOnlineNow(snap.numChildren()))
    }).catch(() => {
      if (!disposed) {
        setFirebaseLive(false)
        setOnlineNow(null)
      }
    })
    return () => {
      disposed = true
      clearTimeout(refreshTimer)
      subscriptions.forEach(unsubscribe => unsubscribe())
    }
  }, [])

  const daily = data?.daily || []
  const totals = data?.totals || {}
  const previous = data?.previousTotals || {}
  const visitors = data?.visitorIntelligence || {}
  const performance = data?.performance || {}
  const heatmap = data?.heatmap || []
  const dailyForTable = useMemo(() => (hideEmpty ? daily.filter(row => row.visitors || row.pdf || row.media || row.peak) : daily).slice().reverse(), [daily, hideEmpty])
  const weekday = useMemo(() => {
    const values = Array(7).fill(0)
    daily.forEach(row => { values[new Date(row.date + 'T12:00:00').getDay()] += row.visitors + row.pdf + row.media })
    return values
  }, [daily])
  const busiestWeekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekday.indexOf(Math.max(...weekday, 0))] || '—'
  const busiestDay = daily.reduce((best, row) => !best || row.visitors + row.pdf + row.media > best.visitors + best.pdf + best.media ? row : best, null)
  const totalDownloads = (totals.pdf || 0) + (totals.media || 0)
  const previousDownloads = (previous.pdf || 0) + (previous.media || 0)
  const peakHours = visitors.peakHours || []
  const visitorDaily = visitors.dailySessions || []
  const deviceRows = visitors.deviceComparison || []
  const cityRows = visitors.cities || []
  const browserRows = visitors.browsers || []
  const pageRows = visitors.topPages || []
  const dropoffRows = visitors.dropoffPages || []
  const suggestions = visitors.suggestions || []

  useEffect(() => {
    let active = true
    async function renderCharts() {
      if (!data) return
      try {
        await ensureApex()
        if (!active || !window.ApexCharts) return
        charts.current.forEach(chart => chart.destroy())
        charts.current = []
        const common = {
          chart: { height: 300, toolbar: { show: false }, fontFamily: 'inherit', animations: { enabled: !window.matchMedia('(prefers-reduced-motion: reduce)').matches } },
          dataLabels: { enabled: false },
          stroke: { curve: 'smooth', width: 2.5 },
          fill: { type: 'gradient', gradient: { opacityFrom: .2, opacityTo: .02 } },
          grid: { borderColor: '#eee8e2', strokeDashArray: 4 },
          legend: { position: 'top', horizontalAlign: 'left', fontSize: '12px' },
          xaxis: { labels: { style: { colors: '#8b8580', fontSize: '11px' }, rotate: -35 } },
          yaxis: { min: 0, forceNiceScale: true, labels: { style: { colors: '#8b8580' } } },
          noData: { text: 'No activity recorded in this period' }
        }
        const labels = daily.map(row => new Date(row.date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }))
        if (trendRef.current) {
          const series = [
            { name: 'Visitors', data: daily.map(row => visible.visitors ? row.visitors : null) },
            { name: 'PDF quotations', data: daily.map(row => visible.pdf ? row.pdf : null) },
            { name: 'Media downloads', data: daily.map(row => visible.media ? row.media : null) }
          ]
          const chart = new window.ApexCharts(trendRef.current, {
            ...common, chart: { ...common.chart, type: chartType === 'bar' ? 'bar' : 'area' },
            series, colors: ['#15966b', '#b4232c', '#3977c8'],
            plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
            xaxis: { ...common.xaxis, categories: labels },
            tooltip: { shared: true, intersect: false }
          })
          charts.current.push(chart)
          await chart.render()
        }
        if (!active) return
        if (visitorRef.current) {
          const chart = new window.ApexCharts(visitorRef.current, {
            ...common, chart: { ...common.chart, type: 'area', height: 240 },
            series: [{ name: 'Sessions', data: visitorDaily.map(row => row.sessions) }],
            colors: ['#b4232c'],
            xaxis: { ...common.xaxis, categories: visitorDaily.map(row => new Date(row.date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })) },
            tooltip: { y: { formatter: value => fmt(value) + ' sessions' } }
          })
          charts.current.push(chart)
          await chart.render()
        }
        if (!active) return
        if (performanceRef.current) {
          const chart = new window.ApexCharts(performanceRef.current, {
            ...common, chart: { ...common.chart, type: 'area', height: 240 },
            series: [{ name: 'Average load', data: (performance.daily || []).map(row => row.averageLoadMs) }],
            colors: ['#3977c8'],
            xaxis: { ...common.xaxis, categories: (performance.daily || []).map(row => new Date(row.date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })) },
            yaxis: { ...common.yaxis, labels: { formatter: value => ms(value) } },
            tooltip: { y: { formatter: value => ms(value) } }
          })
          charts.current.push(chart)
          await chart.render()
        }
      } catch (err) {
        if (active) setError(current => current || 'Charts could not be loaded. Please refresh the report.')
      }
    }
    renderCharts()
    return () => {
      active = false
      charts.current.forEach(chart => chart.destroy())
      charts.current = []
    }
  }, [data, chartType, visible, daily, visitorDaily, performance])

  function applyCustomRange() {
    const today = dateKey(new Date())
    if (!customStart || !customEnd) { setError('Choose both a start date and an end date.'); return }
    if (customStart > customEnd || customEnd > today) { setError('Choose a valid date range ending today or earlier.'); return }
    const days = Math.round((new Date(customEnd + 'T12:00:00') - new Date(customStart + 'T12:00:00')) / 86400000) + 1
    if (days > 730) { setError('The maximum custom reporting range is 730 days.'); return }
    setRange('custom')
    setCustomOpen(false)
    loadReport('custom', customStart, customEnd)
  }

  function exportDailyCsv() {
    csvDownload('apml-analytics-' + (data?.startDate || range) + '-' + (data?.endDate || dateKey(new Date())) + '.csv', [
      ['Date', 'Visitors', 'PDF quotations', 'Media downloads', 'Total activity', 'Peak online'],
      ...daily.map(row => [row.date, row.visitors, row.pdf, row.media, row.visitors + row.pdf + row.media, row.peak])
    ])
  }
  function exportVisitorsCsv() {
    csvDownload('apml-visitor-intelligence-' + (data?.endDate || dateKey(new Date())) + '.csv', [
      ['City / region', 'Sessions'], ...cityRows.map(row => [row.name, row.count]),
      [], ['Device', 'Sessions'], ...(visitors.devices || []).map(row => [row.name, row.count]),
      [], ['Browser', 'Sessions'], ...browserRows.map(row => [row.name, row.count]),
      [], ['Page', 'Views', 'Time spent'], ...pageRows.map(row => [row.name, row.views, duration(row.seconds)])
    ])
  }
  async function exportPdf() {
    try {
      if (!window.jspdf?.jsPDF) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js'
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }
      if (!window.jspdf.jsPDF.API.autoTable) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.4/jspdf.plugin.autotable.min.js'
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }
      const doc = new window.jspdf.jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const width = doc.internal.pageSize.getWidth()
      doc.setFont('helvetica', 'bold'); doc.setFontSize(19); doc.setTextColor(40, 40, 40)
      doc.text('APML Portal - Analytics Report', 14, 17)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(110, 110, 110)
      doc.text('Period: ' + (data?.startDate || '') + ' to ' + (data?.endDate || '') + ' | India time (IST)', 14, 24)
      doc.text('Generated: ' + new Date().toLocaleString('en-IN'), width - 14, 24, { align: 'right' })
      doc.autoTable?.({
        startY: 31, head: [['Metric', 'Selected period', 'Previous period']],
        body: [
          ['Visitors', fmt(totals.visitors), fmt(previous.visitors)],
          ['PDF quotations', fmt(totals.pdf), fmt(previous.pdf)],
          ['Media downloads', fmt(totals.media), fmt(previous.media)],
          ['Total downloads', fmt(totalDownloads), fmt(previousDownloads)],
          ['Peak online', fmt(totals.peakOnline), fmt(previous.peakOnline)],
          ['Visitor sessions', fmt(visitors.sessions), '—'],
          ['Average page load', ms(performance.averageLoadMs), '—']
        ],
        theme: 'grid', headStyles: { fillColor: [180, 35, 44] }, styles: { fontSize: 9, cellPadding: 3 }
      })
      doc.autoTable?.({
        startY: (doc.lastAutoTable?.finalY || 70) + 8,
        head: [['Date', 'Visitors', 'PDFs', 'Media', 'Total activity']],
        body: daily.map(row => [row.date, fmt(row.visitors), fmt(row.pdf), fmt(row.media), fmt(row.visitors + row.pdf + row.media)]),
        theme: 'striped', headStyles: { fillColor: [180, 35, 44] }, styles: { fontSize: 8, cellPadding: 2 }
      })
      doc.save('apml-analytics-' + (data?.endDate || dateKey(new Date())) + '.pdf')
    } catch { setError('PDF export could not be prepared. Please try again.') }
  }
  function exportAllJson() {
    const bundle = {
      exportedAt: new Date().toISOString(), portal: 'APML Portal', formatVersion: 2,
      privacy: 'Aggregated analytics only. Individual visitor IDs and raw session records are not included.',
      dailyAnalytics: { startDate: data?.startDate, endDate: data?.endDate, daily, previousDaily: data?.previousDaily, heatmap, totals, previousTotals: previous },
      visitorIntelligence: visitors, performance
    }
    const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url; link.download = 'apml-portal-all-analytics-' + (data?.endDate || dateKey(new Date())) + '.json'; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 3000)
  }

  const kpis = [
    { label: 'Visitors', value: fmt(totals.visitors), delta: pctChange(totals.visitors, previous.visitors), note: 'Daily visitor counts', icon: Users, tone: 'green', trend: daily.map(row => row.visitors) },
    { label: 'PDF quotations', value: fmt(totals.pdf), delta: pctChange(totals.pdf, previous.pdf), note: fmt(totals.totalPdfsLifetime) + ' lifetime', icon: FileText, tone: 'red', trend: daily.map(row => row.pdf) },
    { label: 'Media downloads', value: fmt(totals.media), delta: pctChange(totals.media, previous.media), note: fmt(totals.totalMediaLifetime) + ' lifetime', icon: Layers3, tone: 'blue', trend: daily.map(row => row.media) },
    { label: 'Total downloads', value: fmt(totalDownloads), delta: pctChange(totalDownloads, previousDownloads), note: 'PDFs + media', icon: Download, tone: 'red', trend: daily.map(row => (row.pdf || 0) + (row.media || 0)) },
    { label: 'Average daily visitors', value: fmt(daily.length ? Math.round((totals.visitors || 0) / daily.length) : 0), note: 'Selected period average', icon: TrendingUp, tone: 'green', trend: daily.map(row => row.visitors) },
    { label: 'Busiest day', value: busiestDay ? dateLabel(busiestDay.date).replace(/, \\d{4}$/, '') : '—', note: fmt(busiestDay ? busiestDay.visitors + busiestDay.pdf + busiestDay.media : 0) + ' total actions', icon: Zap, tone: 'amber', trend: daily.map(row => row.visitors + row.pdf + row.media) }
  ]

  return <main className="analytics-page">
    <header className="analytics-head">
      <div className="analytics-heading-copy">
        <div className="analytics-eyebrow"><Activity size={14}/> APML PORTAL INSIGHTS</div>
        <h1>Traffic &amp; <span>Analytics</span></h1>
        <p>Understand portal activity, visitor engagement, downloads and performance.</p>
        <div className="analytics-head-meta"><span><i className={busy ? 'analytics-live-dot is-busy' : 'analytics-live-dot'}/>{busy ? 'Updating report…' : firebaseLive ? 'Live · Firebase connected' : 'Worker report · Firebase reconnecting'}</span>{onlineNow !== null && <span>{fmt(onlineNow)} online now</span>}<span>India time · {data?.timezone || 'Asia/Kolkata'}</span>{data?.generatedAt && <span>Updated {new Date(data.generatedAt).toLocaleTimeString('en-IN')}</span>}</div>
      </div>
      <div className="analytics-head-actions">
        <button className="analytics-btn" onClick={() => range === 'custom' ? loadReport('custom', customStart, customEnd) : loadReport(range)} disabled={busy}><RefreshCw size={15} className={busy ? 'analytics-spin' : ''}/> Refresh</button>
        <button className="analytics-btn" onClick={exportDailyCsv} disabled={!data}><FileSpreadsheet size={15}/> CSV</button>
        <button className="analytics-btn analytics-btn-primary" onClick={exportPdf} disabled={!data}><FileDown size={15}/> PDF report</button>
      </div>
    </header>

    <section className="analytics-toolbar">
      <div className="analytics-range-tabs">
        {[['7','7 days'],['30','30 days'],['90','3 months'],['180','6 months'],['365','1 year']].map(([value,label]) => <button key={value} className={range === value ? 'active' : ''} onClick={() => setRange(value)}>{label}</button>)}
        <button className={range === 'custom' ? 'active' : ''} onClick={() => setCustomOpen(value => !value)}><CalendarDays size={13}/> Custom</button>
      </div>
      <div className="analytics-toolbar-right"><span className="analytics-range-caption">{data?.startDate ? dateLabel(data.startDate) + ' – ' + dateLabel(data.endDate) : 'Choose a reporting period'}</span></div>
      {customOpen && <div className="analytics-custom-range"><label>From<input type="date" value={customStart} max={dateKey(new Date())} onChange={e => setCustomStart(e.target.value)}/></label><label>To<input type="date" value={customEnd} max={dateKey(new Date())} onChange={e => setCustomEnd(e.target.value)}/></label><button className="analytics-btn analytics-btn-primary" onClick={applyCustomRange}>Apply range</button></div>}
    </section>

    {busy && <div className="analytics-loading-indicator" role="status" aria-live="polite">
      <div className="spinnerContainer">
        <div className="spinner" aria-hidden="true"><span/><span/></div>
        <div className="loader"><p>Updating</p><div className="words">
          <span className="word">visitors</span><span className="word">quotations</span><span className="word">downloads</span><span className="word">insights</span><span className="word">visitors</span>
        </div></div>
      </div>
      <span className="analytics-loading-hint">Your current report stays visible while the new range loads.</span>
    </div>}
    {error && <div className="analytics-error"><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}

    <section className="analytics-kpis">
      {kpis.map(item => {
        const Icon = item.icon
        return <article className={'analytics-kpi tone-' + item.tone} key={item.label}>
          <div className="analytics-kpi-top"><span className="analytics-kpi-icon"><Icon size={18}/></span><span className="analytics-kpi-label">{item.label}</span>{item.delta && <span className={'analytics-delta ' + (item.delta.startsWith('+') && item.delta !== '+0.0%' ? 'up' : item.delta.startsWith('-') ? 'down' : '')}>{item.delta}</span>}</div>
          <strong>{item.value}</strong><div className="analytics-kpi-trend"><Sparkline values={item.trend}/></div><small>{item.note}</small>
        </article>
      })}
    </section>

    <section className="analytics-panel">
      <div className="analytics-panel-head"><div><h2><BarChart3 size={18}/> Activity trend</h2><p>Compare visitors, PDF quotations and media downloads day by day.</p></div>
        <div className="analytics-chart-controls"><div className="analytics-series">{[['visitors','Visitors'],['pdf','PDFs'],['media','Media']].map(([key,label]) => <button key={key} className={visible[key] ? 'selected' : ''} onClick={() => setVisible(old => ({ ...old, [key]: !old[key] }))}><i className={'series-' + key}/>{label}</button>)}</div><div className="analytics-chart-type"><button className={chartType === 'area' ? 'active' : ''} onClick={() => setChartType('area')}>Line</button><button className={chartType === 'bar' ? 'active' : ''} onClick={() => setChartType('bar')}>Bars</button></div></div>
      </div>
      <div className="analytics-chart" ref={trendRef}/>
    </section>

    <div className="analytics-two-col">
      <section className="analytics-panel">
        <div className="analytics-panel-head"><div><h2><CalendarDays size={18}/> Day-by-day activity</h2><p>Daily totals for the selected period.</p></div><label className="analytics-check"><input type="checkbox" checked={hideEmpty} onChange={e => setHideEmpty(e.target.checked)}/> Hide empty days</label></div>
        <div className="analytics-table-wrap"><table><thead><tr><th>Date</th><th>Visitors</th><th>PDFs</th><th>Media</th><th>Total</th></tr></thead><tbody>{dailyForTable.length ? dailyForTable.map(row => <tr key={row.date}><td>{dateLabel(row.date)}</td><td>{fmt(row.visitors)}</td><td>{fmt(row.pdf)}</td><td>{fmt(row.media)}</td><td><b>{fmt(row.visitors + row.pdf + row.media)}</b></td></tr>) : <tr><td colSpan="5" className="analytics-empty-cell">No activity in this period.</td></tr>}</tbody></table></div>
      </section>
      <section className="analytics-panel">
        <div className="analytics-panel-head"><div><h2><TrendingUp size={18}/> Highlights</h2><p>Patterns across the selected period.</p></div></div>
        <div className="analytics-highlight-grid">
          <article><small>Visitors / day</small><strong>{fmt(daily.length ? totals.visitors / daily.length : 0)}</strong><span>Average</span></article>
          <article><small>Downloads / day</small><strong>{fmt(daily.length ? totalDownloads / daily.length : 0)}</strong><span>PDFs + media</span></article>
          <article><small>Downloads / visitor</small><strong>{totals.visitors ? (totalDownloads / totals.visitors).toFixed(2) : '0.00'}</strong><span>Average ratio</span></article>
          <article><small>Busiest weekday</small><strong>{busiestWeekday}</strong><span>Combined activity</span></article>
        </div>
        <div className="analytics-weekdays">{weekday.map((value,index) => <div key={index} title={['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][index] + ': ' + fmt(value)}><div className="analytics-weekday-track"><i style={{ height: (Math.max(...weekday,1) ? Math.max(4,value / Math.max(...weekday,1) * 100) : 4) + '%' }}/></div><span>{['S','M','T','W','T','F','S'][index]}</span></div>)}</div>
      </section>
    </div>

    <section className="analytics-panel">
      <div className="analytics-panel-head"><div><h2><CalendarDays size={18}/> Daily activity heatmap</h2><p>Rolling 365-day view · hover or focus a square for its daily totals.</p></div><span className="analytics-muted">Oldest → newest</span></div>
      <div className="analytics-heat-scroll"><div className="analytics-heat-months">{Array.from({length:12},(_,i)=><span key={i}>{new Date(new Date().getFullYear(),new Date().getMonth()-11+i,1).toLocaleDateString('en-IN',{month:'short'})}</span>)}</div><div className="analytics-heatmap">{heatmap.map(row => { const total = row.visitors + row.pdf + row.media; const max = Math.max(1,...heatmap.map(x=>x.visitors+x.pdf+x.media)); const level = total === 0 ? 0 : total / max < .25 ? 1 : total / max < .5 ? 2 : total / max < .75 ? 3 : 4; return <span key={row.date} className={'heat-level-' + level} title={dateLabel(row.date) + ' · ' + fmt(total) + ' actions (Visitors ' + fmt(row.visitors) + ', PDFs ' + fmt(row.pdf) + ', Media ' + fmt(row.media) + ')'} aria-label={dateLabel(row.date) + ', ' + fmt(total) + ' actions'}/> })}</div></div>
      <div className="analytics-heat-legend"><span>Less</span>{[0,1,2,3,4].map(n=><i key={n} className={'heat-level-' + n}/>)}<span>More</span></div>
    </section>

    <section className="analytics-panel">
      <div className="analytics-panel-head"><div><h2><Sparkles size={18}/> Smart insights</h2><p>Automatically generated observations from the available aggregated data.</p></div></div>
      <div className="analytics-insights">
        {busiestDay && <article><Zap size={17}/><span>The busiest date was <b>{dateLabel(busiestDay.date)}</b>, with {fmt(busiestDay.visitors + busiestDay.pdf + busiestDay.media)} combined actions.</span></article>}
        {totals.visitors > 0 && <article><TrendingUp size={17}/><span>The portal recorded {((totalDownloads / totals.visitors) || 0).toFixed(2)} PDF and media downloads per daily visitor count in this period.</span></article>}
        {suggestions.map((item,index)=><article key={index}><Sparkles size={17}/><span>{item}</span></article>)}
        {!busiestDay && !suggestions.length && <p className="analytics-muted">Insights will appear as more consent-based activity is recorded.</p>}
      </div>
    </section>

    <section className="analytics-panel">
      <div className="analytics-panel-head"><div><h2><Gauge size={18}/> Portal performance</h2><p>Browser navigation measurements from consented sessions only.</p></div><span className="analytics-muted">{fmt(performance.samples)} samples</span></div>
      <div className="analytics-mini-kpis"><article><small>Average page load</small><strong>{ms(performance.averageLoadMs)}</strong></article><article><small>75th percentile</small><strong>{ms(performance.p75LoadMs)}</strong></article><article><small>Average DOM ready</small><strong>{ms(performance.averageDomMs)}</strong></article><article><small>Average TTFB</small><strong>{ms(performance.averageTtfbMs)}</strong></article><article><small>Service-worker controlled</small><strong>{performance.serviceWorkerControlledPercent == null ? '—' : performance.serviceWorkerControlledPercent + '%'}</strong></article></div>
      <div className="analytics-two-col analytics-performance-grid"><div><h3>Average load time by day</h3><div className="analytics-small-chart" ref={performanceRef}/></div><div><h3>Slowest pages by average load</h3><div className="analytics-table-wrap"><table><thead><tr><th>Page</th><th>Average</th><th>Samples</th></tr></thead><tbody>{(performance.pages || []).map(row=><tr key={row.name}><td>{row.name}</td><td>{ms(row.averageLoadMs)}</td><td>{fmt(row.samples)}</td></tr>)}{!(performance.pages || []).length && <tr><td colSpan="3" className="analytics-empty-cell">No performance samples yet.</td></tr>}</tbody></table></div></div></div>
    </section>

    <section className="analytics-panel">
      <div className="analytics-panel-head"><div><h2><Globe2 size={18}/> Visitor intelligence</h2><p>Aggregated consent-based sessions · approximate location only · no individual visitor records exposed.</p></div><button className="analytics-btn" onClick={exportVisitorsCsv}><Download size={14}/> Export visitor summary</button></div>
      <div className="analytics-mini-kpis"><article><small>Recorded sessions</small><strong>{fmt(visitors.sessions)}</strong></article><article><small>Unique browsers</small><strong>{fmt(visitors.uniqueBrowsers)}</strong></article><article><small>New browsers</small><strong>{fmt(visitors.newBrowsers)}</strong></article><article><small>Online now</small><strong>{fmt(visitors.activeNow)}</strong></article><article><small>Returning browsers</small><strong>{fmt(visitors.returningBrowsers)}</strong></article><article><small>Average session</small><strong>{duration(visitors.averageSessionSeconds)}</strong></article><article><small>Page views</small><strong>{fmt(visitors.pageViews)}</strong></article></div>
      <div className="analytics-two-col analytics-visitor-charts"><div><h3>Daily visitor sessions</h3><div className="analytics-small-chart" ref={visitorRef}/></div><div><h3>Peak visiting hours · IST</h3>{peakHours.length ? <div className="analytics-ranked">{peakHours.map(row=><div key={row.hour}><span>{row.label}</span><b>{fmt(row.count)}</b></div>)}</div> : <p className="analytics-muted">Not enough session data yet.</p>}</div></div>
      <div className="analytics-two-col">
        <div><h3><MapPin size={15}/> Visitor locations</h3><div className="analytics-ranked">{cityRows.map(row=><div key={row.name}><span>{row.name}</span><b>{fmt(row.count)}</b></div>)}{!cityRows.length && <p className="analytics-muted">No location data yet.</p>}</div></div>
        <div><h3><MonitorSmartphone size={15}/> Devices and browsers</h3><div className="analytics-ranked">{(visitors.devices || []).map(row=><div key={row.name}><span>{row.name}</span><b>{fmt(row.count)}</b></div>)}{!visitors.devices?.length && <p className="analytics-muted">No device data yet.</p>}</div><div className="analytics-ranked analytics-ranked-secondary">{browserRows.map(row=><div key={row.name}><span>{row.name}</span><b>{fmt(row.count)}</b></div>)}</div></div>
      </div>
      <div className="analytics-two-col">
        <div><h3>Most visited pages · engagement</h3><div className="analytics-table-wrap"><table><thead><tr><th>Page</th><th>Views</th><th>Time spent</th></tr></thead><tbody>{pageRows.map(row=><tr key={row.name}><td>{row.name}</td><td>{fmt(row.views)}</td><td>{duration(row.seconds)}</td></tr>)}{!pageRows.length && <tr><td colSpan="3" className="analytics-empty-cell">No page activity yet.</td></tr>}</tbody></table></div></div>
        <div><h3>Last recorded page signals</h3><div className="analytics-table-wrap"><table><thead><tr><th>Page</th><th>Sessions</th><th>Share</th></tr></thead><tbody>{dropoffRows.map(row=><tr key={row.name}><td>{row.name}</td><td>{fmt(row.sessions)}</td><td>{row.share}%</td></tr>)}{!dropoffRows.length && <tr><td colSpan="3" className="analytics-empty-cell">Not enough journey data yet.</td></tr>}</tbody></table></div><p className="analytics-note">These are last observed pages, not confirmed exits.</p></div>
      </div>
      <div><h3>Mobile vs desktop experience</h3><div className="analytics-table-wrap"><table><thead><tr><th>Device</th><th>Sessions</th><th>Avg. time</th><th>Views / session</th><th>Avg. load</th></tr></thead><tbody>{deviceRows.map(row=><tr key={row.name}><td>{row.name}</td><td>{fmt(row.sessions)}</td><td>{duration(row.averageSeconds)}</td><td>{row.viewsPerSession}</td><td>{ms(row.averageLoadMs)}</td></tr>)}{!deviceRows.length && <tr><td colSpan="5" className="analytics-empty-cell">No device comparison data yet.</td></tr>}</tbody></table></div></div>
    </section>

    <section className="analytics-export-panel"><div><h2><FileDown size={18}/> Download all analytics data</h2><p>Export selected-period daily totals, rolling heatmap, visitor intelligence and performance summaries together. Individual visitor IDs and raw session records are excluded.</p></div><button className="analytics-btn analytics-btn-primary" onClick={exportAllJson} disabled={!data}><Download size={15}/> Download complete JSON</button></section>
    <p className="analytics-footnote">{(data?.dataNotes || []).join(' ')} All dates and reporting boundaries use India Standard Time.</p>
  </main>
}
