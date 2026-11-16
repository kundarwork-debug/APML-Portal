import { useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, Download, FileText, RefreshCw, Users } from 'lucide-react'
import './PublicAnalytics.css'

const API_URL = 'https://apml-drive-api.kundar-work.workers.dev/analytics/public'
const number = value => new Intl.NumberFormat('en-IN').format(Number(value) || 0)
const dateLabel = key => new Date(key + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })

export default function PublicAnalytics() {
  const [range, setRange] = useState(30)
  const [report, setReport] = useState(null)
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  async function load(days = range) {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(API_URL + '?days=' + days, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok) throw new Error(result.error || 'Traffic analytics are temporarily unavailable.')
      setReport(result)
    } catch (err) {
      setError(err.message || 'Traffic analytics are temporarily unavailable.')
    } finally {
      setBusy(false)
    }
  }

  useEffect(() => { load(range) }, [range])

  const daily = report?.daily || []
  const totals = report?.totals || {}
  const maxActivity = Math.max(1, ...daily.map(row => row.visitors + row.pdf + row.media))
  const averageVisitors = daily.length ? Math.round((totals.visitors || 0) / daily.length) : 0
  const cards = [
    { label: 'Visitors', value: totals.visitors, note: 'Recorded visits', icon: Users, tone: 'green' },
    { label: 'PDF quotations', value: totals.pdf, note: 'PDFs generated', icon: FileText, tone: 'red' },
    { label: 'Media downloads', value: totals.media, note: 'Files downloaded', icon: Download, tone: 'blue' },
    { label: 'Total downloads', value: (totals.pdf || 0) + (totals.media || 0), note: 'PDFs and media', icon: BarChart3, tone: 'amber' }
  ]
  const chartRows = useMemo(() => daily.filter((row, index) => range <= 30 || index % Math.ceil(daily.length / 30) === 0 || index === daily.length - 1), [daily, range])

  return <main className="public-analytics">
    <header className="public-analytics-head">
      <div><span className="public-analytics-kicker"><Activity size={14}/> APML PORTAL INSIGHTS</span><h1>Traffic &amp; <span>Analytics</span></h1><p>A simple overview of visits and downloads across the portal.</p></div>
      <button className="public-analytics-refresh" onClick={() => load(range)} disabled={busy}><RefreshCw size={15} className={busy ? 'is-spinning' : ''}/> Refresh</button>
    </header>
    <nav className="public-analytics-ranges" aria-label="Analytics period">
      {[7, 30, 90, 365].map(days => <button key={days} className={range === days ? 'active' : ''} onClick={() => setRange(days)}>{days === 365 ? '1 year' : days + ' days'}</button>)}
    </nav>
    {error && <div className="public-analytics-error" role="alert">{error}<button onClick={() => load(range)}>Try again</button></div>}
    {busy && !report && <p className="public-analytics-status">Loading traffic summary…</p>}
    <section className="public-analytics-cards">
      {cards.map(item => { const Icon = item.icon; return <article className={'public-analytics-card ' + item.tone} key={item.label}><span className="public-analytics-icon"><Icon size={18}/></span><span>{item.label}</span><strong>{number(item.value)}</strong><small>{item.note}</small></article> })}
    </section>
    <section className="public-analytics-panel">
      <div className="public-analytics-panel-head"><div><h2>Daily activity</h2><p>Visitors, quotations and media downloads combined.</p></div><span>{report?.startDate && report?.endDate ? dateLabel(report.startDate) + ' – ' + dateLabel(report.endDate) : ''}</span></div>
      <div className="public-analytics-bars" role="img" aria-label="Daily combined portal activity">
        {chartRows.map(row => { const total = row.visitors + row.pdf + row.media; return <div className="public-analytics-bar-col" key={row.date} title={dateLabel(row.date) + ': ' + number(total) + ' activities'}><div className="public-analytics-bar-stack" style={{height: Math.max(3, total / maxActivity * 100) + '%'}}><i className="visitors" style={{height: (total ? row.visitors / total * 100 : 0) + '%'}}/><i className="pdf" style={{height: (total ? row.pdf / total * 100 : 0) + '%'}}/><i className="media" style={{height: (total ? row.media / total * 100 : 0) + '%'}}/></div><small>{dateLabel(row.date)}</small></div> })}
        {!chartRows.length && <p className="public-analytics-status">No activity recorded in this period.</p>}
      </div>
      <div className="public-analytics-legend"><span><i className="visitors"/> Visitors</span><span><i className="pdf"/> PDFs</span><span><i className="media"/> Media</span></div>
    </section>
    <section className="public-analytics-summary"><div><b>{number(averageVisitors)}</b><span>Average visitors per day</span></div><div><b>{number(totals.peakOnline)}</b><span>Peak concurrent visitors</span></div><div><b>{number(daily.length)}</b><span>Days in this report</span></div></section>
    <p className="public-analytics-footnote">This public view contains aggregated totals only. Visitor identities, session details, locations, device information and technical diagnostics remain restricted to administrators.</p>
  </main>
}
