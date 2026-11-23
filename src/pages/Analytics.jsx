import { useCallback, useEffect, useState } from 'react'
import { FileText, Download, RefreshCw } from 'lucide-react'
import './Analytics.css'

const API_URL = 'https://apml-drive-api.kundar-work.workers.dev/nova/analytics'
const fmt = value => new Intl.NumberFormat('en-IN').format(Number(value) || 0)
const dateKey = date => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const get = type => parts.find(part => part.type === type)?.value || ''
  return get('year') + '-' + get('month') + '-' + get('day')
}
const dateLabel = value => new Date(value + 'T12:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' })

export default function Analytics() {
  const [data, setData] = useState(null)
  const [range, setRange] = useState('30')
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')

  const loadReport = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(API_URL + '?days=' + range, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok) throw new Error(result.error || 'Analytics report could not be loaded.')
      setData(result)
    } catch (err) {
      setError(err.message || 'Analytics report could not be loaded.')
    } finally {
      setBusy(false)
    }
  }, [range])

  useEffect(() => { loadReport() }, [loadReport])

  const totals = data?.totals || {}
  const daily = (data?.daily || []).slice().reverse()

  return <main className="analytics-page analytics-simple">
    <header className="analytics-head">
      <div className="analytics-heading-copy">
        <div className="analytics-eyebrow">APML PORTAL</div>
        <h1>Downloads <span>Analytics</span></h1>
        <p>PDF quotations generated and media downloaded from Drive and Gallery.</p>
      </div>
      <div className="analytics-head-actions">
        <button className="analytics-btn" onClick={loadReport} disabled={busy}><RefreshCw size={15} className={busy ? 'analytics-spin' : ''}/> Refresh</button>
      </div>
    </header>

    <section className="analytics-toolbar">
      <div className="analytics-range-tabs">
        {[['7','7 days'],['30','30 days'],['90','3 months'],['180','6 months'],['365','1 year']].map(([value,label]) =>
          <button key={value} className={range === value ? 'active' : ''} onClick={() => setRange(value)}>{label}</button>
        )}
      </div>
      <span className="analytics-range-caption">{data?.startDate ? dateLabel(data.startDate) + ' – ' + dateLabel(data.endDate) : 'Choose a reporting period'}</span>
    </section>

    {busy && <div className="analytics-loading-indicator" role="status">Updating download totals…</div>}
    {error && <div className="analytics-error"><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}

    <section className="analytics-kpis analytics-simple-kpis">
      <article className="analytics-kpi tone-red">
        <div className="analytics-kpi-top"><span className="analytics-kpi-icon"><FileText size={18}/></span><span className="analytics-kpi-label">PDF generated</span></div>
        <strong>{fmt(totals.pdf)}</strong>
        <small>{fmt(totals.totalPdfsLifetime)} lifetime generated</small>
      </article>
      <article className="analytics-kpi tone-blue">
        <div className="analytics-kpi-top"><span className="analytics-kpi-icon"><Download size={18}/></span><span className="analytics-kpi-label">Media downloaded</span></div>
        <strong>{fmt(totals.media)}</strong>
        <small>{fmt(totals.totalMediaLifetime)} lifetime downloaded</small>
      </article>
    </section>

    <section className="analytics-panel">
      <div className="analytics-panel-head">
        <div><h2>Daily downloads</h2><p>Only PDF generation and Drive / Gallery media downloads are included.</p></div>
      </div>
      <div className="analytics-table-wrap">
        <table>
          <thead><tr><th>Date</th><th>PDF generated</th><th>Media downloaded</th></tr></thead>
          <tbody>
            {daily.length ? daily.map(row => <tr key={row.date}><td>{dateLabel(row.date)}</td><td>{fmt(row.pdf)}</td><td>{fmt(row.media)}</td></tr>) : <tr><td colSpan="3" className="analytics-empty-cell">No download activity recorded in this period.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
    <p className="analytics-footnote">PDF generated counts only PDFs created in Quotation Editor. Media downloaded counts only separate downloads from Drive or Gallery. A generated PDF is not counted as a media download unless downloaded separately.</p>
  </main>
}
