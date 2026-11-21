import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, BarChart3, Download, RefreshCw } from 'lucide-react'
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
 const totalPdf=rows.reduce((sum,row)=>sum+(Number(row.pdf)||0),0)
 const totalMedia=rows.reduce((sum,row)=>sum+(Number(row.media)||0),0)
 return <div className="an-page">
  <header className="an-heading"><div><span className="an-kicker"><BarChart3 size={14}/> APML PORTAL · INSIGHTS</span><h1>Analytics</h1><p>A focused view of PDF generation and media download activity.</p></div><div className="an-heading-actions"><span className="an-updated">{updated?'Updated '+updated.toLocaleTimeString('en-IN'):'Waiting for data'}</span><span className="an-live-status"><i/> Live analytics</span><button onClick={load} disabled={busy}><RefreshCw size={15} className={busy?'an-spin':''}/>{busy?'Refreshing…':'Refresh'}</button></div></header>
  {error&&<section className="an-error"><AlertTriangle size={19}/><div><b>Analytics data could not be loaded</b><p>{error}</p><button onClick={load}>Try again</button></div></section>}
  {busy&&!data?<section className="an-loading"><span/><span/></section>:null}
  {data&&<>
   <section className="an-metrics">
    <Metric icon={Download} label="PDF generated" value={number(data.totals?.totalPdfsLifetime ?? totalPdf)} note="Lifetime total · daily trend below" series={rows.map(row=>row.pdf)}/>
    <Metric icon={Download} label="Media downloads" value={number(data.totals?.totalMediaLifetime ?? totalMedia)} note="Lifetime total · daily trend below" series={rows.map(row=>row.media)}/>
   </section>
   <p className="an-footnote">Daily trends use the last 7 days of recorded events. Lifetime totals are read from the portal-wide Firebase counters.</p>
  </>}
 </div>
}
