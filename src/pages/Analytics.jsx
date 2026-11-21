import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, CalendarDays, Download, FileJson, RefreshCw, Sparkles, TrendingUp, Users, FileText, Image as ImageIcon } from 'lucide-react'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'
import { getApmlDatabase } from '../lib/firebase'
import { useApmlAdminAuth } from '../lib/firebaseAuth'
import './Analytics.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend)

const TZ = 'Asia/Kolkata'
const nf = new Intl.NumberFormat('en-IN')
const number = value => nf.format(Number(value) || 0)
const dateKey = date => new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year:'numeric', month:'2-digit', day:'2-digit' }).format(date)
const shiftKey = (key, offset) => { const d = new Date(key + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().slice(0,10) }
const labelDate = key => new Date(key + 'T00:00:00Z').toLocaleDateString('en-IN',{day:'2-digit',month:'short',timeZone:'UTC'})
const fullDate = key => new Date(key + 'T00:00:00Z').toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:'UTC'})
const dayData = (logs,key) => { const row=logs?.[key]||{}; return { visitors:Number(row.visitors)||0,pdf:Number(row.pdf)||0,media:Number(row.media)||0 } }
const sum = values => values.reduce((total,value)=>total+(Number(value)||0),0)
const periods = [{id:'7d',label:'7 days',days:7},{id:'30d',label:'30 days',days:30},{id:'6m',label:'6 months',days:180},{id:'1y',label:'1 year',days:365}]

function Metric({icon:Icon,label,value,note,tone}) {
 return <article className={'an-metric '+(tone||'')}>
  <span className="an-metric-icon"><Icon size={18}/></span><small>{label}</small><strong>{value}</strong><em>{note}</em>
 </article>
}

function downloadFile(name,content,type) {
 const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),link=document.createElement('a')
 link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url)
}

export default function Analytics(){
 const [logs,setLogs]=useState(null)
 const [totals,setTotals]=useState({pdf:null,media:null})
 const [busy,setBusy]=useState(true)
 const [error,setError]=useState('')
 const [updated,setUpdated]=useState(null)
 const [range,setRange]=useState('7d')
 const [customStart,setCustomStart]=useState('')
 const [customEnd,setCustomEnd]=useState('')
 const [customOpen,setCustomOpen]=useState(false)
 const [activity,setActivity]=useState([])
 const [activityFilter,setActivityFilter]=useState('All')
 const {admin}=useApmlAdminAuth()

 const load=useCallback(async()=>{
  setBusy(true);setError('')
  try{
   const db=await getApmlDatabase()
   const [daily,pdf,media]=await Promise.all([
    db.ref('analytics/daily_logs').once('value'),
    db.ref('analytics/totalPdfDownloads').once('value'),
    db.ref('analytics/totalMediaDownloads').once('value')
   ])
   setLogs(daily.val()||{})
   setTotals({pdf:Number(pdf.val())||0,media:Number(media.val())||0})
   setUpdated(new Date())
  }catch(e){setError(e.message||'Could not load analytics from Firebase.')}
  finally{setBusy(false)}
 },[])

 useEffect(()=>{
  let db,refs=[],live=true
  ;(async()=>{
   try{
    db=await getApmlDatabase()
    if(!live)return
    const subscribe=(path,callback)=>{const ref=db.ref(path),handler=snapshot=>{if(live)callback(snapshot.val())};ref.on('value',handler,err=>{if(live)setError(err.message||'Firebase read failed.')});refs.push([ref,handler])}
    subscribe('analytics/daily_logs',value=>{setLogs(value||{});setUpdated(new Date());setBusy(false)})
    subscribe('analytics/totalPdfDownloads',value=>setTotals(old=>({...old,pdf:Number(value)||0})))
    subscribe('analytics/totalMediaDownloads',value=>setTotals(old=>({...old,media:Number(value)||0})))
   }catch(e){if(live){setError(e.message||'Could not connect to Firebase.');setBusy(false)}}
  })()
  return()=>{live=false;refs.forEach(([ref,handler])=>ref.off('value',handler))}
 },[])

 useEffect(()=>{if(!admin)return;let ref,handler,live=true;(async()=>{try{const db=await getApmlDatabase();if(!live)return;ref=db.ref('Analytics page/recent_actions');handler=ref.orderByChild('timestamp').limitToLast(50).on('value',snapshot=>{if(!live)return;setActivity(Object.entries(snapshot.val()||{}).map(([id,value])=>({id,...value})).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)))},err=>console.warn('Activity log listener:',err.message))}catch(err){console.warn('Activity log unavailable:',err.message)}})();return()=>{live=false;if(ref&&handler)ref.off('value',handler)}},[admin])

 const selected=useMemo(()=>{
  if(!logs)return []
  const end=dateKey(new Date())
  let start
  if(range==='custom')start=customStart
  else {const days=periods.find(item=>item.id===range)?.days||7;start=shiftKey(end,-(days-1))}
  if(!start||start>end)return []
  const keys=[];let cursor=start,guard=0
  while(cursor<=end&&guard++<740){keys.push(cursor);cursor=shiftKey(cursor,1)}
  return keys.map(key=>({key,...dayData(logs,key)}))
 },[logs,range,customStart,customEnd])
 const visibleRows=useMemo(()=>range==='1y'?selected.slice(-45).reverse():[...selected].reverse(),[selected,range])
 const totalsForPeriod={visitors:sum(selected.map(x=>x.visitors)),pdf:sum(selected.map(x=>x.pdf)),media:sum(selected.map(x=>x.media))}
 const downloads=totalsForPeriod.pdf+totalsForPeriod.media
 const peak=selected.reduce((best,row)=>!best||row.visitors+row.pdf+row.media>best.visitors+best.pdf+best.media?row:best,null)
 const dailyValues=selected.map(row=>row.visitors+row.pdf+row.media)
 const average=selected.length?Math.round(sum(dailyValues)/selected.length*10)/10:0
 const activityModules=['All',...new Set(activity.map(row=>row.module).filter(Boolean).sort())]
 const filteredActivity=activityFilter==='All'?activity:activity.filter(row=>row.module===activityFilter)
 const heatmap=useMemo(()=>{const end=dateKey(new Date());return Array.from({length:365},(_,i)=>{const key=shiftKey(end,i-364),d=dayData(logs,key);return {key,...d,total:d.visitors+d.pdf+d.media}})},[logs])
 const maxHeat=Math.max(1,...heatmap.map(x=>x.total))
 const chartData={labels:selected.map(row=>labelDate(row.key)),datasets:[
  {label:'Visitors',data:selected.map(x=>x.visitors),borderColor:'#059669',backgroundColor:'rgba(5,150,105,.08)',tension:.35,fill:false,borderWidth:2.5,pointRadius:selected.length>60?0:2.5,pointHoverRadius:5},
  {label:'PDF quotations',data:selected.map(x=>x.pdf),borderColor:'#b91c1c',backgroundColor:'rgba(185,28,28,.08)',tension:.35,fill:false,borderWidth:2.5,pointRadius:selected.length>60?0:2.5,pointHoverRadius:5},
  {label:'Media downloads',data:selected.map(x=>x.media),borderColor:'#2563eb',backgroundColor:'rgba(37,99,235,.08)',tension:.35,fill:false,borderWidth:2.5,pointRadius:selected.length>60?0:2.5,pointHoverRadius:5}
 ]}
 const chartOptions={responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{position:'bottom',labels:{usePointStyle:true,boxWidth:7,boxHeight:7,color:'var(--text-muted)',font:{size:11},padding:18}},tooltip:{backgroundColor:'#202938',titleColor:'#fff',bodyColor:'#e2e8f0',padding:11,cornerRadius:9}},scales:{x:{grid:{display:false},border:{display:false},ticks:{color:'#8b929e',maxTicksLimit:10,maxRotation:0}},y:{beginAtZero:true,grid:{color:'rgba(145,155,170,.14)'},border:{display:false},ticks:{color:'#8b929e',precision:0}}}}
 const exportCsv=()=>{const lines=[['Date','Visitors','PDF quotations','Media downloads','Total downloads'],...selected.map(x=>[x.key,x.visitors,x.pdf,x.media,x.pdf+x.media])];downloadFile('apml-analytics-'+range+'.csv',lines.map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\n'),'text/csv;charset=utf-8')}
 const exportJson=()=>downloadFile('apml-analytics-'+range+'.json',JSON.stringify({portal:'APML Portal',generatedAt:new Date().toISOString(),timezone:TZ,range,totals:totalsForPeriod,lifetimeTotals:totals,days:selected},null,2),'application/json')
 const applyCustom=()=>{if(customStart&&customEnd&&customStart<=customEnd){setRange('custom');setCustomOpen(false)}}

 return <div className="an-page">
  <header className="an-heading"><div><span className="an-kicker"><BarChart3 size={14}/> APML PORTAL · INSIGHTS</span><h1>Analytics</h1><p>Understand portal traffic, quotation activity and media downloads at a glance.</p></div><div className="an-heading-actions"><span className="an-updated">{updated?'Updated '+updated.toLocaleTimeString('en-IN'):'Waiting for data'}</span><span className="an-live-status"><i/> Live data</span><button onClick={load} disabled={busy}><RefreshCw size={15} className={busy?'an-spin':''}/>{busy?'Refreshing…':'Refresh'}</button></div></header>
  {error&&<section className="an-error"><AlertTriangle size={19}/><div><b>Analytics data could not be loaded</b><p>{error}</p><button onClick={load}>Try again</button></div></section>}
  <section className="an-toolbar"><div className="an-period-tabs">{periods.map(item=><button key={item.id} className={range===item.id?'active':''} onClick={()=>setRange(item.id)}>{item.label}</button>)}<button className={range==='custom'?'active':''} onClick={()=>setCustomOpen(value=>!value)}><CalendarDays size={14}/> Custom</button></div><div className="an-export-actions"><button onClick={exportCsv} disabled={!selected.length}><Download size={14}/> CSV</button><button onClick={exportJson} disabled={!selected.length}><FileJson size={14}/> JSON</button></div>
   {customOpen&&<div className="an-custom-range"><label>From<input type="date" value={customStart} onChange={e=>setCustomStart(e.target.value)}/></label><label>To<input type="date" value={customEnd} onChange={e=>setCustomEnd(e.target.value)}/></label><button onClick={applyCustom} disabled={!customStart||!customEnd||customStart>customEnd}>Apply range</button></div>}
  </section>
  {busy&&!logs?<section className="an-loading"><span/><span/><span/><span/></section>:null}
  <section className="an-metrics">
   <Metric icon={Users} label="Visitors" value={number(totalsForPeriod.visitors)} note="Recorded daily visitors in selected period" tone="visitors"/>
   <Metric icon={FileText} label="PDF quotations" value={number(totalsForPeriod.pdf)} note={'Lifetime: '+number(totals.pdf)} tone="pdf"/>
   <Metric icon={ImageIcon} label="Media downloads" value={number(totalsForPeriod.media)} note={'Lifetime: '+number(totals.media)} tone="media"/>
   <Metric icon={Download} label="Total downloads" value={number(downloads)} note="PDF quotations + media downloads" tone="downloads"/>
  </section>
  <section className="an-panel an-trend-panel"><div className="an-panel-head"><div><span className="an-section-label">PERFORMANCE OVER TIME</span><h2>Daily activity</h2><p>Visitors, PDF quotations and media downloads · India time (IST)</p></div><span className="an-period">{selected.length} days</span></div><div className="an-chart">{selected.length?<Line data={chartData} options={chartOptions}/>:<div className="an-empty">No daily analytics data is available for this period.</div>}</div></section>
  <div className="an-insight-grid"><section className="an-panel"><div className="an-panel-head"><div><span className="an-section-label">AUTOMATIC SUMMARY</span><h2><Sparkles size={17}/> Smart insights</h2></div></div><div className="an-insight-list">
    <div><TrendingUp size={17}/><p><b>{number(totalsForPeriod.visitors)}</b> visitors were recorded across <b>{selected.length}</b> days.</p></div>
    <div><Download size={17}/><p><b>{number(downloads)}</b> downloads were recorded, averaging <b>{number(average)}</b> combined daily actions.</p></div>
    <div><Activity size={17}/><p>{peak&&peak.visitors+peak.pdf+peak.media>0?<>The busiest day was <b>{fullDate(peak.key)}</b> with <b>{number(peak.visitors+peak.pdf+peak.media)}</b> combined actions.</>:<>No activity is recorded in the selected period yet.</>}</p></div>
   </div></section><section className="an-panel an-period-summary"><div className="an-panel-head"><div><span className="an-section-label">SELECTED PERIOD</span><h2>At a glance</h2></div></div><div className="an-summary-pair"><span>Average visitors / day</span><b>{number(Math.round(totalsForPeriod.visitors/Math.max(1,selected.length)*10)/10)}</b></div><div className="an-summary-pair"><span>PDF quotations</span><b>{number(totalsForPeriod.pdf)}</b></div><div className="an-summary-pair"><span>Media downloads</span><b>{number(totalsForPeriod.media)}</b></div><div className="an-summary-pair"><span>Peak day</span><b>{peak&&peak.visitors+peak.pdf+peak.media>0?labelDate(peak.key):'—'}</b></div></section></div>
  <section className="an-panel an-heat-panel"><div className="an-panel-head"><div><span className="an-section-label">CONSISTENCY & ACTIVITY</span><h2>Activity heatmap</h2><p>Each square represents one day over the last 12 months.</p></div><span className="an-muted">Less <span className="an-heat-scale"><i/><i/><i/><i/></span> More</span></div><div className="an-heat-scroll"><div className="an-heat-grid">{heatmap.map(day=><span key={day.key} className="an-heat-cell" style={{'--level':day.total?Math.max(.12,day.total/maxHeat):0}} title={fullDate(day.key)+': '+day.visitors+' visitors, '+day.pdf+' PDFs, '+day.media+' media downloads'}/>)}</div></div></section>
  <section className="an-panel an-table-panel"><div className="an-panel-head"><div><span className="an-section-label">DAILY BREAKDOWN</span><h2>Activity by date</h2><p>{range==='1y'?'Showing the latest 45 days in this one-year period.':'Daily counts for the selected reporting period.'}</p></div></div><div className="an-table-wrap"><table className="an-table"><thead><tr><th>Date</th><th>Visitors</th><th>PDF quotations</th><th>Media downloads</th><th>Total downloads</th></tr></thead><tbody>{visibleRows.length?visibleRows.map(row=><tr key={row.key}><td>{fullDate(row.key)}</td><td>{number(row.visitors)}</td><td>{number(row.pdf)}</td><td>{number(row.media)}</td><td><b>{number(row.pdf+row.media)}</b></td></tr>):<tr><td colSpan="5" className="an-empty">No data for this period.</td></tr>}</tbody></table></div></section>
  {admin&&<section className="an-panel an-activity-panel"><div className="an-panel-head"><div><span className="an-section-label">PORTAL AUDIT TRAIL</span><h2><Activity size={17}/> Recent Activity</h2><p>Latest 50 successful actions recorded across APML Portal.</p></div><span className="an-period">{activity.length} / 50 events</span></div><div className="an-activity-toolbar"><label htmlFor="an-activity-filter">Filter module</label><select id="an-activity-filter" value={activityFilter} onChange={event=>setActivityFilter(event.target.value)}>{activityModules.map(module=><option key={module} value={module}>{module}</option>)}</select></div>{filteredActivity.length?<div className="an-activity-list">{filteredActivity.map(row=><article className="an-activity-row" key={row.id}><span className="an-activity-mark"><Activity size={15}/></span><div className="an-activity-copy"><strong>{row.action||'Activity recorded'}</strong><span>{[row.module,row.item,row.details].filter(Boolean).join(' · ')}</span><small>{row.user||'Guest'}</small></div><time>{row.timestamp?new Date(row.timestamp).toLocaleString('en-IN',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'—'}</time></article>)}</div>:<div className="an-activity-empty">No activity has been recorded yet. New successful actions will appear here.</div>}</section>}
  <p className="an-footnote">Analytics are based only on events currently written to Firebase under analytics/daily_logs and the lifetime download counters. Missing or uncollected metrics are not estimated.</p>
 </div>
}
