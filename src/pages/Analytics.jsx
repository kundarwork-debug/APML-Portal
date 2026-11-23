import { useCallback, useEffect, useState } from 'react'
import ReactApexChart from 'react-apexcharts'
import { FileText, Download, RefreshCw } from 'lucide-react'
import { getApmlDatabase } from '../lib/firebase'
import './Analytics.css'

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
const shortDateLabel = value => new Date(value + 'T12:00:00+05:30').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' })

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
  const chartOptions = {
    chart: {
      type: 'area',
      height: '100%',
      toolbar: { show: false },
      zoom: { enabled: false },
      fontFamily: 'Plus Jakarta Sans, DM Sans, sans-serif',
      foreColor: '#8a837c',
      animations: { enabled: true, easing: 'easeinout', speed: 650 }
    },
    colors: ['#b4232c', '#3977c8'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 3, lineCap: 'round' },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 0.35,
        opacityFrom: 0.20,
        opacityTo: 0.015,
        stops: [0, 90, 100]
      }
    },
    markers: {
      size: daily.length > 45 ? 0 : 3,
      strokeWidth: 2,
      strokeColors: '#fff',
      hover: { size: 6 }
    },
    legend: {
      show: true,
      position: 'top',
      horizontalAlign: 'right',
      fontSize: '11px',
      fontWeight: 600,
      markers: { width: 8, height: 8, radius: 8 },
      itemMargin: { horizontal: 10, vertical: 4 }
    },
    grid: {
      borderColor: 'rgba(120, 110, 100, 0.12)',
      strokeDashArray: 4,
      padding: { top: 2, right: 8, bottom: 0, left: 4 }
    },
    xaxis: {
      categories: daily.map(row => shortDateLabel(row.date)),
      axisBorder: { show: false },
      axisTicks: { show: false },
      tickAmount: 8,
      labels: { rotate: 0, hideOverlappingLabels: true, style: { fontSize: '10px' } },
      tooltip: { enabled: false }
    },
    yaxis: {
      min: 0,
      forceNiceScale: true,
      decimalsInFloat: 0,
      labels: { formatter: value => Math.round(value), style: { fontSize: '10px' } }
    },
    tooltip: {
      shared: true,
      intersect: false,
      x: { formatter: (_, { dataPointIndex }) => daily[dataPointIndex] ? dateLabel(daily[dataPointIndex].date) : '' },
      y: { formatter: value => fmt(value) }
    },
    noData: { text: 'No download activity recorded in this period.' },
    responsive: [{
      breakpoint: 650,
      options: {
        chart: { toolbar: { show: false } },
        legend: { position: 'bottom', horizontalAlign: 'left' },
        grid: { padding: { left: -4, right: 0 } },
        xaxis: { tickAmount: 5 }
      }
    }]
  }
  const chartSeries = [
    { name: 'PDF generated', data: daily.map(row => Number(row.pdf) || 0) },
    { name: 'Media downloaded', data: daily.map(row => Number(row.media) || 0) }
  ]

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
        {daily.length ? <ReactApexChart options={chartOptions} series={chartSeries} type="area" height="100%" /> : <div className="analytics-chart-empty">No download activity recorded in this period.</div>}
      </div>
    </section>

    <section className="analytics-panel">
      <div className="analytics-panel-head">
        <div><h2>Daily downloads</h2><p>Newest dates appear first. Only PDF generation and Drive / Gallery media downloads are included.</p></div>
      </div>
      <div className="analytics-table-wrap">
        <table>
          <thead><tr><th>Date</th><th>PDF generated</th><th>Media downloaded</th></tr></thead>
          <tbody>
            {daily.length ? [...daily].reverse().map(row => <tr key={row.date}><td>{dateLabel(row.date)}</td><td>{fmt(row.pdf)}</td><td>{fmt(row.media)}</td></tr>) : <tr><td colSpan="3" className="analytics-empty-cell">No download activity recorded in this period.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
    <p className="analytics-footnote">PDF generated counts only PDFs created in Quotation Editor. Media downloaded counts only separate downloads from Drive or Gallery. A generated PDF is not counted as a media download unless downloaded separately.</p>
  </main>
}
