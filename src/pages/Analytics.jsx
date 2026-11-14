import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getApmlAuth } from '../lib/firebase'
import { BarChart3, ShieldCheck, LogIn, LogOut, RefreshCw, Download, LoaderCircle, LockKeyhole } from 'lucide-react'
import './Analytics.css'

const ADMIN_EMAILS = ['kundar701@gmail.com', 'kundar.work@gmail.com']
const API_URL = 'https://apml-drive-api.kundar-work.workers.dev/nova/analytics'
const fmt = value => new Intl.NumberFormat('en-IN').format(Number(value) || 0)
const duration = value => {
  const seconds = Math.max(0, Number(value) || 0)
  return seconds < 60 ? seconds + ' sec' : Math.floor(seconds / 60) + 'm ' + Math.round(seconds % 60) + 's'
}

export default function Analytics() {
  const [auth, setAuth] = useState(null)
  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [range, setRange] = useState(30)
  const chartRef = useRef(null)
  const chartInstance = useRef(null)

  useEffect(() => {
    let active = true
    let unsubscribe = null
    getApmlAuth().then(instance => {
      if (!active) return
      setAuth(instance)
      unsubscribe = instance.onAuthStateChanged(async current => {
        if (!active) return
        if (current && ADMIN_EMAILS.includes(String(current.email || '').toLowerCase().trim())) {
          setUser(current)
          setError('')
        } else {
          if (current) await instance.signOut().catch(() => {})
          setUser(null)
          setData(null)
        }
        setAuthReady(true)
      })
    }).catch(err => {
      if (active) {
        setError(err.message || 'Google sign-in could not be initialized.')
        setAuthReady(true)
      }
    })
    return () => {
      active = false
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const loadReport = useCallback(async (currentUser, days = range) => {
    if (!currentUser) return
    setBusy(true)
    setError('')
    try {
      const token = await currentUser.getIdToken(true)
      const response = await fetch(API_URL + '?days=' + days, {
        headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
        cache: 'no-store'
      })
      const result = await response.json().catch(() => ({}))
      if (response.status === 401 || response.status === 403) {
        await auth?.signOut()
        throw new Error('Admin session could not be verified. Please sign in again.')
      }
      if (!response.ok || !result.ok) throw new Error(result.error || 'Analytics report could not be loaded.')
      setData(result)
    } catch (err) {
      setError(err.message || 'Analytics report could not be loaded.')
    } finally {
      setBusy(false)
    }
  }, [auth, range])

  useEffect(() => {
    if (user) loadReport(user, range)
  }, [user, range, loadReport])

  async function signIn() {
    if (!auth) return
    setBusy(true)
    setError('')
    try {
      const provider = new window.firebase.auth.GoogleAuthProvider()
      const result = await auth.signInWithPopup(provider)
      const email = String(result.user?.email || '').toLowerCase().trim()
      if (!ADMIN_EMAILS.includes(email)) {
        await auth.signOut()
        throw new Error('This Google account is not authorized for APML Analytics.')
      }
      setUser(result.user)
    } catch (err) {
      setError(err.message || 'Google sign-in failed.')
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    await auth?.signOut()
    setUser(null)
    setData(null)
  }

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
      if (!user || !data || !chartRef.current) return
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
  }, [user, data])

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

  if (!authReady) return <main className="analytics-page"><div className="analytics-gate"><LoaderCircle className="analytics-spin" size={30}/><h2>Preparing secure analytics</h2><p>Checking APML administrator access…</p></div></main>

  if (!user) return <main className="analytics-page"><button className="analytics-google-admin" onClick={signIn} disabled={busy || !auth} title="Sign in with Google" aria-label="Sign in with Google">{busy?<span className="admin-button-spinner"/>:<svg className="apml-google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12z"/></svg>}</button><section className="analytics-gate"><div className="analytics-gate-icon"><LockKeyhole size={27}/></div><div className="eyebrow">RESTRICTED AREA</div><h1>Analytics <span>Dashboard</span></h1><p>Sign in with an approved APML administrator Google account to view private visitor and performance reports.</p><button className="analytics-gate-secondary" onClick={signIn} disabled={busy || !auth}>{busy ? 'Please wait…' : 'Sign in to continue'}</button>{error && <div className="analytics-error">{error}</div>}<small><ShieldCheck size={14}/> Protected by Firebase sign-in and server-side admin verification.</small></section></main>

  return <main className="analytics-page">
    <header className="analytics-head"><div><div className="eyebrow"><ShieldCheck size={14}/> ADMIN-ONLY INSIGHTS</div><h1>Traffic &amp; <span>Analytics</span></h1><p>Private portal activity, visitor trends and performance reports.</p><div className="analytics-admin-email">{user.email}</div></div><div className="analytics-head-actions"><button className="analytics-export" onClick={exportCsv} disabled={!data}><Download size={16}/> Export CSV</button><button className="analytics-signout" onClick={signOut}><LogOut size={16}/> Sign out</button></div></header>
    <div className="analytics-toolbar"><div className="analytics-status">{busy ? <><LoaderCircle className="analytics-spin" size={14}/> Updating secure report…</> : data ? 'Updated ' + new Date(data.generatedAt).toLocaleString('en-IN') + ' · ' + data.timezone : 'Waiting for report'}</div><div className="analytics-ranges">{[7,30,90].map(days=><button key={days} className={range===days?'active':''} onClick={()=>setRange(days)}>{days} days</button>)}<button onClick={()=>loadReport(user,range)} disabled={busy}><RefreshCw size={13}/> Refresh</button></div></div>
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
