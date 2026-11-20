import { useCallback, useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, Clock3, Download, Eye, Gauge, RefreshCw, Users } from 'lucide-react'
import './Analytics.css'

const API='https://apml-drive-api.kundar-work.workers.dev/nova/analytics?days=7'
const number=value=>Number(value||0).toLocaleString('en-IN')
const dateLabel=value=>new Date(value+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'})
const duration=value=>{const n=Number(value)||0;return n>=60?Math.round(n/60)+' min':n+' sec'}

function TrendChart({rows}){
 const max=Math.max(1,...rows.map(row=>Number(row.visitors)||0))
 const width=700,height=210,left=34,right=12,top=14,bottom=34
 const points=rows.map((row,index)=>({x:left+(rows.length===1?0:index*(width-left-right)/(rows.length-1)),y:top+(height-top-bottom)*(1-(Number(row.visitors)||0)/max)}))
 const line=points.map((p,index)=>(index?'L':'M')+' '+p.x+' '+p.y).join(' ')
 const area=line+' L '+points[points.length-1]?.x+' '+(height-bottom)+' L '+points[0]?.x+' '+(height-bottom)+' Z'
 return <div className="an-chart-wrap">
  <svg className="an-trend-chart" viewBox={'0 0 '+width+' '+height} role="img" aria-label="Unique visitors by day over the last seven days">
   {[0,.5,1].map((ratio,index)=><g key={index}><line x1={left} x2={width-right} y1={top+(height-top-bottom)*ratio} y2={top+(height-top-bottom)*ratio}/><text x={left-9} y={top+(height-top-bottom)*ratio+4} textAnchor="end">{Math.round(max*(1-ratio))}</text></g>)}
   <path className="an-chart-area" d={area}/><path className="an-chart-line" d={line}/>
   {points.map((point,index)=><g key={rows[index].date}><circle cx={point.x} cy={point.y} r="4"/><text className="an-chart-date" x={point.x} y={height-8} textAnchor="middle">{new Date(rows[index].date+'T00:00:00').toLocaleDateString('en-IN',{weekday:'short'})}</text><title>{dateLabel(rows[index].date)}: {number(rows[index].visitors)} unique visitors</title></g>)}
  </svg>
 </div>
}

function Heatmap({rows}){
 const days=useMemo(()=>{
  const map=new Map(rows.map(row=>[row.date,row]))
  const end=new Date();end.setHours(0,0,0,0)
  const start=new Date(end);start.setDate(start.getDate()-364)
  const first=new Date(start);first.setDate(first.getDate()-first.getDay())
  const cells=[]
  for(let cursor=new Date(first);cursor<=end;cursor.setDate(cursor.getDate()+1)){
   const key=cursor.toLocaleDateString('en-CA')
   const row=map.get(key)
   cells.push({key,count:Number(row?.visitors)||0,month:cursor.getMonth(),outside:cursor<start})
  }
  return cells
 },[rows])
 const max=Math.max(1,...days.map(day=>day.count))
 const months=days.reduce((result,day,index)=>{if(!day.outside&&(!index||day.month!==days[index-1].month))result.push({month:day.month,index});return result},[])
 return <div className="an-heat-scroll">
  <div className="an-heat-months">{months.map(item=><span key={item.index} style={{gridColumn:item.index+1}}>{new Date(2026,item.month,1).toLocaleDateString('en-IN',{month:'short'})}</span>)}</div>
  <div className="an-heat-grid">{days.map(day=><span key={day.key} className={'an-heat-cell'+(day.outside?' outside':'')} style={{'--level':day.count?Math.max(.2,day.count/max):0}} title={day.key+': '+number(day.count)+' unique visitors'}/>)}</div>
  <div className="an-heat-legend"><span>Less</span>{[0,.25,.5,.75,1].map(level=><i key={level} style={{'--level':level}}/>)}<span>More</span></div>
 </div>
}

function Metric({icon:Icon,label,value,note}){
 return <article className="an-metric"><span className="an-metric-icon"><Icon size={17}/></span><small>{label}</small><strong>{value}</strong><em>{note}</em></article>
}

export default function Analytics(){
 const [data,setData]=useState(null)
 const [busy,setBusy]=useState(true)
 const [error,setError]=useState('')
 const [updated,setUpdated]=useState(null)
 const load=useCallback(async()=>{
  setBusy(true);setError('')
  try{
   const response=await fetch(API,{cache:'no-store',headers:{Accept:'application/json'}})
   if(!response.ok)throw new Error('Analytics service returned HTTP '+response.status+'.')
   const result=await response.json()
   if(!result.ok)throw new Error(result.error||'Analytics data is unavailable.')
   setData(result);setUpdated(new Date())
  }catch(e){setError(e.message||'Could not load analytics.');}
  finally{setBusy(false)}
 },[])
 useEffect(()=>{load();const timer=setInterval(load,300000);return()=>clearInterval(timer)},[load])
 const rows=data?.daily||[]
 const visitors=data?.visitorIntelligence||{}
 const performance=data?.performance||{}
 const totalVisitors=rows.reduce((sum,row)=>sum+(Number(row.visitors)||0),0)
 const totalPdf=rows.reduce((sum,row)=>sum+(Number(row.pdf)||0),0)
 const totalMedia=rows.reduce((sum,row)=>sum+(Number(row.media)||0),0)
 const peak=Math.max(0,...rows.map(row=>Number(row.peak)||0))
 const devices=visitors.devices||[]
 const topPages=visitors.topPages||[]
 return <div className="an-page">
  <header className="an-heading"><div><span className="an-kicker"><BarChart3 size={14}/> APML PORTAL · INSIGHTS</span><h1>Analytics</h1><p>A clear view of portal traffic, usage and performance.</p></div><div className="an-heading-actions"><span>{updated?'Updated '+updated.toLocaleTimeString('en-IN'):'Live data'}</span><button onClick={load} disabled={busy}><RefreshCw size={15} className={busy?'an-spin':''}/>{busy?'Refreshing…':'Refresh'}</button></div></header>
  {error&&<section className="an-error"><AlertTriangle size={19}/><div><b>Analytics data could not be loaded</b><p>{error}</p><button onClick={load}>Try again</button></div></section>}
  {busy&&!data?<section className="an-loading"><span/><span/><span/><span/></section>:null}
  {data&&<>
   <section className="an-metrics">
    <Metric icon={Users} label="Unique visitors" value={number(totalVisitors)} note="Daily unique visitor totals · last 7 days"/>
    <Metric icon={Download} label="PDF generated" value={number(totalPdf)} note="Quotation documents created"/>
    <Metric icon={Download} label="Media downloads" value={number(totalMedia)} note="Drive and Gallery downloads"/>
    <Metric icon={Activity} label="Peak online" value={number(peak)} note="Highest concurrent presence · 7 days"/>
   </section>
   <section className="an-panel">
    <div className="an-panel-head"><div><span className="an-section-label">TRAFFIC OVERVIEW</span><h2>Unique visitors</h2><p>Daily unique visitors over the last seven days.</p></div><span className="an-period">Last 7 days</span></div>
    {rows.length?<TrendChart rows={rows}/>:<p className="an-muted">No daily traffic records are available for this period.</p>}
   </section>
   <section className="an-panel">
    <div className="an-panel-head"><div><span className="an-section-label">YEAR AT A GLANCE</span><h2>Visitor activity</h2><p>Daily unique visitor intensity across the last 365 days.</p></div></div>
    <Heatmap rows={data.heatmap||[]}/>
   </section>
   <section className="an-section-title"><span className="an-section-label">VISITOR INTELLIGENCE</span><h2>Who is using the portal</h2><p>Aggregated insights from consented visitor sessions.</p></section>
   <section className="an-metrics an-metrics-three">
    <Metric icon={Eye} label="Unique visitors" value={number(visitors.uniqueBrowsers)} note="Distinct visitor IDs in the available session sample"/>
    <Metric icon={Users} label="Returning visitors" value={number(visitors.returningBrowsers)} note="Visitors with more than one recorded session"/>
    <Metric icon={Clock3} label="Average session" value={duration(visitors.averageSessionSeconds)} note={number(visitors.sessions)}+' recorded sessions'/>
   </section>
   <section className="an-two-col">
    <article className="an-panel"><div className="an-panel-head"><div><span className="an-section-label">AUDIENCE</span><h2>Devices</h2></div></div>{devices.length?devices.map(item=><div className="an-rank" key={item.name}><span>{item.name}</span><b>{number(item.count)}</b><i style={{'--fill':Math.max(4,item.count/Math.max(1,devices[0].count)*100)+'%'}}/></div>):<p className="an-muted">No device breakdown available.</p>}</article>
    <article className="an-panel"><div className="an-panel-head"><div><span className="an-section-label">ENGAGEMENT</span><h2>Top pages</h2></div></div>{topPages.length?topPages.slice(0,6).map(item=><div className="an-page-row" key={item.name}><span>{item.name}</span><b>{number(item.views)} views</b></div>):<p className="an-muted">No page-level engagement data available.</p>}</article>
   </section>
   <section className="an-section-title"><span className="an-section-label">PORTAL ACTIVITY</span><h2>Operational events</h2><p>Document generation and media downloads are tracked independently.</p></section>
   <section className="an-panel an-event-panel"><div className="an-event-row"><span className="an-event-icon"><Download size={17}/></span><div><b>PDF generated</b><small>Quotation documents created in the Editor.</small></div><strong>{number(totalPdf)}</strong></div><div className="an-event-row"><span className="an-event-icon"><Download size={17}/></span><div><b>Media downloads</b><small>Files from APML Drive and media from Gallery.</small></div><strong>{number(totalMedia)}</strong></div></section>
   <section className="an-section-title"><span className="an-section-label">PERFORMANCE INTELLIGENCE</span><h2>Experience &amp; speed</h2><p>Page performance from the available consented measurements.</p></section>
   <section className="an-metrics an-metrics-three">
    <Metric icon={Gauge} label="Average page load" value={performance.averageLoadMs==null?'—':number(performance.averageLoadMs)+' ms'} note={number(performance.samples)}+' measurements'/>
    <Metric icon={Gauge} label="75th percentile load" value={performance.p75LoadMs==null?'—':number(performance.p75LoadMs)+' ms'} note="Recorded page-load times"/>
    <Metric icon={Activity} label="Service worker coverage" value={performance.serviceWorkerControlledPercent==null?'—':performance.serviceWorkerControlledPercent+'%'} note="Measured page loads controlled by PWA worker"/>
   </section>
   {performance.pages?.length>0&&<section className="an-panel"><div className="an-panel-head"><div><span className="an-section-label">SLOWEST PAGES</span><h2>Average load time</h2></div></div>{performance.pages.slice(0,6).map(item=><div className="an-page-row" key={item.name}><span>{item.name}</span><b>{number(item.averageLoadMs)} ms</b></div>)}</section>}
   <p className="an-footnote">{(data.dataNotes||[]).join(' ')} Visitor intelligence and performance details are limited to the latest 500 stored sessions. Daily totals are aggregated separately.</p>
  </>}
 </div>
}
