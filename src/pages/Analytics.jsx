import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, Download, RefreshCw, Users } from 'lucide-react'
import { Line } from 'react-chartjs-2'
import {
 Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip
} from 'chart.js'
import './Analytics.css'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip)

const API='https://apml-drive-api.kundar-work.workers.dev/nova/analytics?days=7'
const number=value=>Number(value||0).toLocaleString('en-IN')

function chartOptions({spark=false}={}){
 return {
  responsive:true, maintainAspectRatio:false,
  animation:{duration:420},
  interaction:{intersect:false,mode:'index'},
  plugins:{
   legend:{display:false},
   tooltip:{enabled:!spark,displayColors:false,backgroundColor:'#202938',titleColor:'#f8fafc',bodyColor:'#e2e8f0',padding:10,cornerRadius:8}
  },
  scales:spark?{x:{display:false},y:{display:false,beginAtZero:true}}:{
   x:{grid:{display:false},border:{display:false},ticks:{color:'#8b929e',font:{size:10},maxRotation:0}},
   y:{beginAtZero:true,grid:{color:'rgba(145,155,170,.14)',drawBorder:false},border:{display:false},ticks:{color:'#8b929e',font:{size:10},precision:0}}
  }
 }
}

function createLineData(labels,values,{spark=false}={}){
 return {labels,datasets:[{data:values,borderColor:'#b91c1c',backgroundColor:(ctx)=>{
   const chart=ctx.chart,area=chart.chartArea
   if(!area)return 'rgba(185,28,28,.10)'
   const gradient=chart.ctx.createLinearGradient(0,area.top,0,area.bottom)
   gradient.addColorStop(0,'rgba(185,28,28,.22)')
   gradient.addColorStop(1,'rgba(185,28,28,0)')
   return gradient
  },fill:!spark,tension:.38,borderWidth:spark?2:2.5,pointRadius:spark?0:3,pointHoverRadius:spark?3:5,pointBackgroundColor:'#b91c1c',pointBorderColor:'#fff',pointBorderWidth:spark?0:1.5,spanGaps:true}]}
}

function TrendChart({rows,label='Daily unique visitors'}){
 const labels=rows.map(row=>new Date(row.date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}))
 const values=rows.map(row=>Number(row.visitors)||0)
 return <div className="an-chart"><Line data={createLineData(labels,values)} options={chartOptions()}/></div>
}

function Heatmap({rows}){
 const byDate=new Map(rows.map(row=>[row.date,Number(row.visitors)||0]))
 const end=new Date((rows[rows.length-1]?.date||new Date().toLocaleDateString('en-CA'))+'T00:00:00')
 end.setHours(0,0,0,0)
 const start=new Date(end);start.setDate(start.getDate()-364)
 const first=new Date(start);first.setDate(first.getDate()-first.getDay()
 )
 const weeks=[]
 for(let cursor=new Date(first);cursor<=end;){
  const week=[]
  for(let day=0;day<7;day++){
   const current=new Date(cursor);current.setDate(cursor.getDate()+day)
   const key=current.toLocaleDateString('en-CA')
   const value=current<start||current>end?0:(byDate.get(key)||0)
   week.push({date:current,x:current.toLocaleDateString('en-IN',{day:'numeric',month:'short'}),y:value,outside:current<start||current>end})
  }
  weeks.push(week);cursor.setDate(cursor.getDate()+7)
 }
 const max=Math.max(1,...Array.from(byDate.values()))
 const level=value=>value===0?0:value/max>.75?4:value/max>.45?3:value/max>.2?2:1
 return <div className="an-heat-scroll">
  <div className="an-heat-months" style={{gridTemplateColumns:`repeat(${weeks.length},12px)`}}>
   {weeks.map((week,i)=>{const month=week.find(day=>day.date.getDate()<=7&&day.date>=start);return <span key={i}>{month?month.date.toLocaleDateString('en-IN',{month:'short'}):''}</span>})}
  </div>
  <div className="an-heat-grid" style={{gridTemplateColumns:`repeat(${weeks.length},12px)`}}>
   {weeks.map((week,wi)=>week.map((day,di)=><span key={wi+'-'+di} className={'an-heat-cell'+(day.outside?' outside':'')} style={{'--level':level(day.y)}} title={day.date.toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short'})+': '+day.y+' recorded visits'}/>))}
  </div>
  <div className="an-heat-legend"><span>Less</span><i style={{'--level':.08}}/><i style={{'--level':.28}}/><i style={{'--level':.55}}/><i style={{'--level':.85}}/><span>More</span></div>
 </div>
}

function Metric({icon:Icon,label,value,note,series=[]}){
 const values=series.map(point=>Number(point)||0)
 return <article className="an-metric">
  <span className="an-metric-icon"><Icon size={17}/></span><small>{label}</small><strong>{value}</strong><em>{note}</em>
  <div className="an-metric-spark"><Line data={createLineData(values.map((_,i)=>i+1),values,{spark:true})} options={chartOptions({spark:true})}/></div>
 </article>
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
  }catch(e){setError(e.message||'Could not load analytics.')}
  finally{setBusy(false)}
 },[])
 useEffect(()=>{load();const timer=setInterval(load,300000);return()=>clearInterval(timer)},[load])
 const rows=data?.daily||[]
 const visitors=data?.visitorIntelligence||{}
 const hasDailyUniqueVisitors=Array.isArray(visitors.dailyUniqueVisitors)&&visitors.dailyUniqueVisitors.length>0
 const trendRows=hasDailyUniqueVisitors?visitors.dailyUniqueVisitors:(visitors.dailySessions||[]).map(row=>({date:row.date,visitors:row.sessions}))
 const trendLabel=hasDailyUniqueVisitors?'Daily unique visitors':'Daily sessions'
 const totalPdf=rows.reduce((sum,row)=>sum+(Number(row.pdf)||0),0)
 const totalMedia=rows.reduce((sum,row)=>sum+(Number(row.media)||0),0)
 const peak=Math.max(0,...rows.map(row=>Number(row.peak)||0))
 return <div className="an-page">
  <header className="an-heading"><div><span className="an-kicker"><BarChart3 size={14}/> APML PORTAL · INSIGHTS</span><h1>Analytics</h1><p>A clear view of portal traffic, usage and performance.</p></div><div className="an-heading-actions"><span className="an-updated">{updated?'Updated '+updated.toLocaleTimeString('en-IN'):'Waiting for data'}</span><span className="an-live-status"><i/> Live analytics</span><button onClick={load} disabled={busy}><RefreshCw size={15} className={busy?'an-spin':''}/>{busy?'Refreshing…':'Refresh'}</button></div></header>
  {error&&<section className="an-error"><AlertTriangle size={19}/><div><b>Analytics data could not be loaded</b><p>{error}</p><button onClick={load}>Try again</button></div></section>}
  {busy&&!data?<section className="an-loading"><span/><span/><span/><span/></section>:null}
  {data&&<>
   <section className="an-metrics">
    <Metric icon={Users} label="Unique visitors" value={number(visitors.uniqueBrowsers)} note="Distinct consented visitors · 7-day sample" series={trendRows.map(row=>row.visitors)}/>
    <Metric icon={Download} label="PDF generated" value={number(totalPdf)} note="Editor · last 7 days" series={rows.map(row=>row.pdf)}/>
    <Metric icon={Download} label="Media downloads" value={number(totalMedia)} note="Drive + Gallery · last 7 days" series={rows.map(row=>row.media)}/>
    <Metric icon={Activity} label="Peak online" value={number(peak)} note="Highest concurrent presence · last 7 days" series={rows.map(row=>row.peak)}/>
   </section>
   <section className="an-panel">
    <div className="an-panel-head"><div><span className="an-section-label">TRAFFIC OVERVIEW</span><h2>{trendLabel}</h2><p>{hasDailyUniqueVisitors?'Distinct consented visitors per day.':'Session starts per day while the visitor aggregate is being updated.'}</p></div><span className="an-period">Last 7 days</span></div>
    {trendRows.length?<TrendChart rows={trendRows} label={trendLabel}/>:<p className="an-muted">No daily traffic records are available for this period.</p>}
   </section>
   <section className="an-panel">
    <div className="an-panel-head"><div><span className="an-section-label">YEAR AT A GLANCE</span><h2>Visitor activity</h2><p>Daily recorded visit activity across the last 365 days.</p></div></div>
    <Heatmap rows={data.heatmap||[]}/>
   </section>
   <p className="an-footnote">{(data.dataNotes||[]).join(' ')} Visitor intelligence and performance details are limited to the latest 500 stored sessions. Daily totals are aggregated separately.</p>
  </>}
 </div>
}
