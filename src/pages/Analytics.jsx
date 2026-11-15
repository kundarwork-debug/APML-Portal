import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { RefreshCw, Download, LoaderCircle } from 'lucide-react'
import './Analytics.css'

const API_URL = 'https://apml-drive-api.kundar-work.workers.dev/nova/analytics'
const fmt = value => new Intl.NumberFormat('en-IN').format(Number(value) || 0)
const duration = value => {
  const seconds = Math.max(0, Number(value) || 0)
  return seconds < 60 ? seconds + ' sec' : Math.floor(seconds / 60) + 'm ' + Math.round(seconds % 60) + 's'
}

export default function Analytics() {
  const [busy, setBusy] = useState(true)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [range, setRange] = useState(30)
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  const loadReport = useCallback(async (days = range) => {
    setBusy(true)
    setError('')
    try {
      const response = await fetch(API_URL + '?days=' + days, {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok || !result.ok) throw new Error(result.error || 'Analytics report could not be loaded.')
      setData(result)
    } catch (err) {
      setError(err.message || 'Analytics report could not be loaded.')
    } finally {
      setBusy(false)
    }
  }, [range])

  useEffect(() => {
    loadReport(range)
  }, [range, loadReport])

  const daily = data?.daily || []
  const totals = data?.totals || {}
  const visitors = data?.visitorIntelligence || {}
  const performance = data?.performance || {}
  const topDevices = visitors.devices || []
  const topBrowsers = visitors.browsers || []
  const topCities = visitors.cities || []
  const topPages = visitors.topPages || []

  useEffect(() => {
    let active = true
    async function renderChart() {
      if (!data || !chartRef.current) return
      try {
        if (!window.ApexCharts) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script')
            script.src = 'https://cdn.jsdelivr.net/npm/apexcharts@3.54.1/dist/apexcharts.min.js'
            script.onload = resolve
            script.onerror = () => reject(new Error('Chart library could not load'))
            document.head.appendChild(script)
          })
        }
        if (!active || !chartRef.current || !window.ApexCharts) return
        if (chartInstance.current) chartInstance.current.destroy()
        chartInstance.current = new window.ApexCharts(chartRef.current, {
          chart: { type: 'area', height: 310, toolbar: { show: false }, fontFamily: 'inherit' },
          series: [
            { name: 'Visitors', data: daily.map(row => row.visitors) },
            { name: 'PDF quotations', data: daily.map(row => row.pdf) },
            { name: 'Media downloads', data: daily.map(row => row.media) }
          ],
          xaxis: { categories: daily.map(row => new Date(row.date + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })), labels: { rotate: -35 } },
          stroke: { curve: 'smooth', width: 2 },
          fill: { type: 'gradient', gradient: { opacityFrom: .24, opacityTo: .03 } },
          dataLabels: { enabled: false },
          legend: { position: 'top' },
          grid: { borderColor: '#e7e5e4' },
          noData: { text: 'No activity recorded for this period' }
        })
        await chartInstance.current.render()
      } catch (err) {
        if (active) setError(current => current || err.message)
      }
    }
    renderChart()
    return () => {
      active = false
      if (chartInstance.current) {
        chartInstance.current.destroy()
        chartInstance.current = null
      }
    }
  }, [data])

  function exportCsv() {
    if (!data) return
    const rows = [
      ['Date', 'Visitors', 'PDF quotations', 'Media downloads', 'Peak online'],
      ...daily.map(row => [row.date, row.visitors, row.pdf, row.media, row.peak])
    ]
    const csv = '\ufeff' + rows.map(row => row.map(value => '"' + String(value ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n')
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.download = 'apml-analytics-' + range + '-days.csv'
    link.click()
    URL.revokeObjectURL(link.href)
  }

  return <main className="analytics-page">
    <header className="analytics-head"><div><div className="eyebrow">APML PORTAL INSIGHTS</div><h1>Traffic &amp; <span>Analytics</span></h1><p>Portal activity, visitor trends and performance reports.</p></div><div className="analytics-head-actions"><button className="analytics-export" onClick={exportCsv} disabled={!data}><Download size={16}/> Export CSV</button></div></header>
    <div className="analytics-toolbar"><div className="analytics-status">{busy ? <><LoaderCircle className="analytics-spin" size={14}/> Updating secure report…</> : data ? 'Updated ' + new Date(data.generatedAt).toLocaleString('en-IN') + ' · ' + data.timezone : 'Waiting for report'}</div><div className="analytics-ranges">{[7,30,90].map(days=><button key={days} className={range===days?'active':''} onClick={()=>setRange(days)}>{days} days</button>)}<button onClick={()=>loadReport(range)} disabled={busy}><RefreshCw size={13}/> Refresh</button></div></div>
    {error && <div className="analytics-error">{error}</div>}
    {data && <>
      <section className="analytics-stats"><article><small>Visitors · selected period</small><strong>{fmt(totals.visitors)}</strong><em>Daily visitor counts summed</em></article><article><small>PDF quotations</small><strong>{fmt(totals.pdf)}</strong><em>{fmt(totals.totalPdfsLifetime)} lifetime</em></article><article><small>Media downloads</small><strong>{fmt(totals.media)}</strong><em>{fmt(totals.totalMediaLifetime)} lifetime</em></article><article><small>Peak concurrent online</small><strong>{fmt(totals.peakOnline)}</strong><em>Highest daily recorded peak</em></article></section>
      <section className="analytics-card"><div className="analytics-card-head"><div><h2>Activity trend</h2><p>Daily visitors, PDF quotations and media downloads.</p></div></div><div ref={chartRef} className="analytics-chart"/></section>
      <section className="analytics-card visitor-intelligence"><div className="analytics-card-head"><div><h2>Visitor intelligence</h2><p>Aggregated consented sessions only. Individual visitor records are never sent to this dashboard.</p></div></div><div className="visitor-kpis"><article><small>Recorded sessions</small><strong>{fmt(visitors.sessions)}</strong></article><article><small>Unique browsers</small><strong>{fmt(visitors.uniqueBrowsers)}</strong></article><article><small>Returning browsers</small><strong>{fmt(visitors.returningBrowsers)}</strong></article><article><small>Page views</small><strong>{fmt(visitors.pageViews)}</strong></article><article><small>Average session</small><strong>{duration(visitors.averageSessionSeconds)}</strong></article></div><div className="visitor-columns"><div><h3>Devices</h3>{topDevices.length?topDevices.map(item=><div className="visitor-rank" key={item.name}><span>{item.name}</span><b>{fmt(item.count)}</b></div>):<p className="analytics-muted">No device data yet.</p>}<h3 className="analytics-subheading">Browsers</h3>{topBrowsers.length?topBrowsers.map(item=><div className="visitor-rank" key={item.name}><span>{item.name}</span><b>{fmt(item.count)}</b></div>):<p className="analytics-muted">No browser data yet.</p>}</div><div><h3>Top cities</h3>{topCities.length?topCities.map(item=><div className="visitor-rank" key={item.name}><span>{item.name}</span><b>{fmt(item.count)}</b></div>):<p className="analytics-muted">No location data yet.</p>}<h3 className="analytics-subheading">Most visited pages</h3>{topPages.length?topPages.map(item=><div className="visitor-rank" key={item.name}><span>{item.name}</span><b>{fmt(item.count)}</b></div>):<p className="analytics-muted">No page-view data yet.</p>}</div></div></section>
      <section className="analytics-card"><div className="analytics-card-head"><div><h2>Performance overview</h2><p>Average measurements from consented visitor sessions.</p></div></div><div className="analytics-stats analytics-performance"><article><small>Average page load</small><strong>{performance.averageLoadMs == null?'—':fmt(performance.averageLoadMs)+' ms'}</strong></article><article><small>Average DOM ready</small><strong>{performance.averageDomMs == null?'—':fmt(performance.averageDomMs)+' ms'}</strong></article><article><small>Average TTFB</small><strong>{performance.averageTtfbMs == null?'—':fmt(performance.averageTtfbMs)+' ms'}</strong></article><article><small>Performance samples</small><strong>{fmt(performance.samples)}</strong></article></div></section>
      <section className="analytics-card"><div className="analytics-card-head"><div><h2>Daily breakdown</h2><p>Most recent days first.</p></div></div><div className="analytics-table-wrap"><table><thead><tr><th>Date</th><th>Visitors</th><th>PDFs</th><th>Media</th><th>Peak online</th></tr></thead><tbody>{[...daily].reverse().map(row=><tr key={row.date}><td>{row.date}</td><td>{fmt(row.visitors)}</td><td>{fmt(row.pdf)}</td><td>{fmt(row.media)}</td><td>{fmt(row.peak)}</td></tr>)}</tbody></table></div></section>
      <p className="analytics-muted">{(data.dataNotes||[]).join(' ')}</p>
    </>}
  </main>
}
