import { useCallback, useEffect, useState } from 'react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'
import { FileText, Download, RefreshCw } from 'lucide-react'
import { getApmlDatabase } from '../lib/firebase'
import './Analytics.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const fmt = value => new Intl.NumberFormat('en-IN').format(Number(value) || 0)
const dateKey = date => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const get = type => parts.find(part => part.type === type)?.value || ''
  return get('year') + '-' + get('month') + '-' + get('day')
}
const getRangeStart = (days, endKey) => {
  const date = new Date(endKey + 'T00:00:00Z')
  date.setUTCDate(date.getUTCDate() - days + 1)
  return date.toISOString().slice(0, 10)
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
      const database = await getApmlDatabase()
      const [dailySnapshot, lifetimeSnapshot, legacyDailySnapshot, legacyPdfSnapshot, legacyMediaSnapshot] = await Promise.all([
        database.ref('Analytics page/daily_logs').once('value'),
        database.ref('Analytics page/lifetime_totals').once('value'),
        database.ref('analytics/daily_logs').once('value'),
        database.ref('analytics/totalPdfDownloads').once('value'),
        database.ref('analytics/totalMediaDownloads').once('value')
      ])
      const canonicalDaily = dailySnapshot.val() || {}
      const legacyDaily = legacyDailySnapshot.val() || {}
      const allDaily = Object.keys(canonicalDaily).length ? canonicalDaily : legacyDaily
      const lifetime = lifetimeSnapshot.val() || {}
      const endDate = dateKey(new Date())
      const startDate = getRangeStart(Number(range), endDate)
      const rows = []
      const cursor = new Date(startDate + 'T00:00:00Z')
      const last = new Date(endDate + 'T00:00:00Z')
      const totals = { pdf: 0, media: 0 }
      while (cursor <= last) {
        const date = cursor.toISOString().slice(0, 10)
        const entry = allDaily[date] || {}
        const pdf = Number(entry.pdf) || 0
        const media = Number(entry.media) || 0
        rows.push({ date, pdf, media })
        totals.pdf += pdf
        totals.media += media
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }
      setData({
        startDate,
        endDate,
        daily: rows,
        totals: {
          ...totals,
          totalPdfsLifetime: Number(lifetime.pdfGenerated ?? legacyPdfSnapshot.val()) || 0,
          totalMediaLifetime: Number(lifetime.mediaDownloads ?? legacyMediaSnapshot.val()) || 0
        }
      })
    } catch (err) {
      setError(err.message || 'Analytics report could not be loaded.')
    } finally {
      setBusy(false)
    }
  }, [range])

  useEffect(() => { loadReport() }, [loadReport])

  const totals = data?.totals || {}
  const daily = data?.daily || []
  const chartData = {
    labels: daily.map(row => new Date(row.date + 'T12:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })),
    datasets: [
      {
        label: 'PDF generated',
        data: daily.map(row => Number(row.pdf) || 0),
        borderColor: '#b4232c',
        backgroundColor: context => {
          const { ctx, chartArea } = context.chart
          if (!chartArea) return 'rgba(180, 35, 44, 0.08)'
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, 'rgba(180, 35, 44, 0.20)')
          gradient.addColorStop(1, 'rgba(180, 35, 44, 0.005)')
          return gradient
        },
        pointBackgroundColor: '#b4232c',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: daily.length > 45 ? 0 : 3,
        pointHoverRadius: 6,
        borderWidth: 2.8,
        tension: 0.42,
        cubicInterpolationMode: 'monotone',
        spanGaps: true,
        fill: true
      },
      {
        label: 'Media downloaded',
        data: daily.map(row => Number(row.media) || 0),
        borderColor: '#3977c8',
        backgroundColor: context => {
          const { ctx, chartArea } = context.chart
          if (!chartArea) return 'rgba(57, 119, 200, 0.07)'
          const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom)
          gradient.addColorStop(0, 'rgba(57, 119, 200, 0.16)')
          gradient.addColorStop(1, 'rgba(57, 119, 200, 0.005)')
          return gradient
        },
        pointBackgroundColor: '#3977c8',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: daily.length > 45 ? 0 : 3,
        pointHoverRadius: 6,
        borderWidth: 2.8,
        tension: 0.42,
        fill: true
      }
    ]
  }
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 650, easing: 'easeOutQuart' },
    layout: { padding: { top: 4, right: 8, bottom: 0, left: 2 } },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle', boxWidth: 7, boxHeight: 7, padding: 18, color: '#746f69', font: { family: 'Plus Jakarta Sans, sans-serif', size: 11, weight: '600' } } },
      tooltip: { backgroundColor: '#242424', padding: 12, cornerRadius: 9, titleFont: { size: 11, weight: '700' }, bodyFont: { size: 11 }, displayColors: true }
    },
    scales: {
      x: { type: 'category', reverse: false, grid: { display: false }, border: { display: false }, ticks: { color: '#8a837c', maxTicksLimit: 8, maxRotation: 0, autoSkip: true, font: { size: 10 } } },
      y: { beginAtZero: true, border: { display: false, dash: [3, 4] }, grid: { color: 'rgba(120, 110, 100, 0.10)' }, ticks: { precision: 0, color: '#8a837c', padding: 9, font: { size: 10 } } }
    }
  }

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

    {busy && <div className="analytics-sync-status" role="status"><span className="analytics-sync-dot"/> Syncing latest totals</div>}
    {error && <div className="analytics-error"><span>{error}</span><button onClick={() => setError('')}>Dismiss</button></div>}

    <section className="analytics-kpis analytics-simple-kpis">
      <article className="analytics-kpi tone-red">
        <div className="analytics-kpi-top"><span className="analytics-kpi-icon"><FileText size={18}/></span><span className="analytics-kpi-label">PDF generated</span></div>
        <strong>{data ? fmt(totals.pdf) : '—'}</strong>
        <small>{data ? fmt(totals.totalPdfsLifetime) : '—'} lifetime generated</small>
      </article>
      <article className="analytics-kpi tone-blue">
        <div className="analytics-kpi-top"><span className="analytics-kpi-icon"><Download size={18}/></span><span className="analytics-kpi-label">Media downloaded</span></div>
        <strong>{data ? fmt(totals.media) : '—'}</strong>
        <small>{data ? fmt(totals.totalMediaLifetime) : '—'} lifetime downloaded</small>
      </article>
    </section>

    <section className="analytics-panel analytics-chart-panel">
      <div className="analytics-panel-head">
        <div><h2>Download activity</h2><p>Daily trend across the selected period, with smooth curves for both metrics.</p></div>
      </div>
      <div className="analytics-chart-wrap">
        {daily.length ? <Line data={chartData} options={chartOptions} /> : <div className="analytics-chart-empty">No download activity recorded in this period.</div>}
      </div>
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
