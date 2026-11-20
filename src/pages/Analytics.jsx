import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, BarChart3, Clock3, Download, Eye, Gauge, RefreshCw, Users } from 'lucide-react'
import Chart from 'react-apexcharts'
import './Analytics.css'

const API='https://apml-drive-api.kundar-work.workers.dev/nova/analytics?days=7'
const number=value=>Number(value||0).toLocaleString('en-IN')
const duration=value=>{const n=Number(value)||0;return n>=60?Math.round(n/60)+' min':n+' sec'}

function TrendChart({rows}){
 const categories=rows.map(row=>new Date(row.date+'T00:00:00').toLocaleDateString('en-IN',{day:'numeric',month:'short'}))
 const options={
  chart:{type:'area',toolbar:{show:false},zoom:{enabled:false},fontFamily:'inherit',foreColor:'#8b929e',background:'transparent',animations:{enabled:true,speed:450}},
  colors:['#b91c1c'],stroke:{curve:'smooth',width:3},fill:{type:'gradient',gradient:{shadeIntensity:.25,opacityFrom:.24,opacityTo:.025,stops:[0,90,100]}},
  dataLabels:{enabled:false},markers:{size:4,strokeWidth:2,strokeColors:'#fff',hover:{size:6}},
  grid:{borderColor:'rgba(145,155,170,.18)',strokeDashArray:4,padding:{left:8,right:12}},
  xaxis:{categories,axisBorder:{show:false},axisTicks:{show:false},labels:{style:{fontSize:'11px'}}},
  yaxis:{min:0,forceNiceScale:true,labels:{formatter:value=>Math.round(value).toLocaleString('en-IN'),style:{fontSize:'10px'}}},
  tooltip:{theme:'dark',y:{formatter:value=>number(value)+' unique visitors'}},
  legend:{show:false}
 }
 return <div className="an-apex-chart"><Chart type="area" height={250} options={options} series={[{name:'Unique visitors',data:rows.map(row=>Number(row.visitors)||0)}]}/></div>
}

function Heatmap({rows}){
 const byDate=new Map(rows.map(row=>[row.date,Number(row.visitors)||0]))
 const end=new Date((rows[rows.length-1]?.date||new Date().toLocaleDateString('en-CA'))+'T00:00:00')
 end.setHours(0,0,0,0)
 const start=new Date(end);start.setDate(start.getDate()-364)
 const first=new Date(start);first.setDate(first.getDate()-first.getDay())
 const weeks=[]
 for(let cursor=new Date(first);cursor<=end;){
  const week=[]
  for(let day=0;day<7;day++){
   const current=new Date(cursor);current.setDate(cursor.getDate()+day)
   const key=current.toLocaleDateString('en-CA')
   week.push({x:current.toLocaleDateString('en-IN',{day:'numeric',month:'short'}),y:current<start||current>end?0:(byDate.get(key)||0)})
  }
  weeks.push(week);cursor.setDate(cursor.getDate()+7)
 }
 const weekdays=['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
 const series=weekdays.map((name,index)=>({name,data:weeks.map((week,weekIndex)=>({x:'W'+(weekIndex+1),y:week[index].y,meta:week[index].x}))}))
 const options={
  chart:{type:'heatmap',toolbar:{show:false},fontFamily:'inherit',foreColor:'#8b929e',background:'transparent'},
  dataLabels:{enabled:false},stroke:{width:2,colors:['var(--surface-card, #fff)']},
  plotOptions:{heatmap:{radius:3,enableShades:true,shadeIntensity:.55,colorScale:{ranges:[{from:0,to:0,color:'#f1f2f4',name:'No activity'},{from:1,to:2,color:'#f4b8bc',name:'Low'},{from:3,to:5,color:'#e87980',name:'Medium'},{from:6,to:100000,color:'#a91f2b',name:'High'}]}}},
  xaxis:{type:'category',labels:{show:false},axisBorder:{show:false},axisTicks:{show:false}},
  yaxis:{labels:{style:{fontSize:'10px'}}},
  grid:{show:false,padding:{left:4,right:4,top:-8,bottom:0}},
  tooltip:{custom:({seriesIndex,dataPointIndex,w})=>{const point=w.config.series[seriesIndex].data[dataPointIndex];return '<div class="apex-tooltip-custom"><b>'+weekdays[seriesIndex]+'</b> · '+point.meta+'<br/>'+number(point.y)+' unique visitors</div>'}},
  legend:{show:false}
 }
 return <div className="an-heat-apex"><Chart type="heatmap" height={190} options={options} series={series}/><div className="an-heat-legend"><span>Less</span><i className="low"/><i className="mid"/><i className="high"/><span>More</span></div></div>
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
 const totalPdf=rows.reduce((sum,row)=>sum+(Number(row.pdf)||0),0)
 const totalMedia=rows.reduce((sum,row)=>sum+(Number(row.media)||0),0)
 const peak=Math.max(0,...rows.map(row=>Number(row.peak)||0))
 const devices=visitors.devices||[]
 const topPages=visitors.topPages||[]
 return <div className="an-page">
  <header className="an-heading"><div><span className="an-kicker"><BarChart3 size={14}/> APML PORTAL · INSIGHTS</span><h1>Analytics</h1><p>A clear view of portal traffic, usage and performance.</p></div><div className="an-heading-actions"><span className="an-updated">{updated?'Updated '+updated.toLocaleTimeString('en-IN'):'Waiting for data'}</span><span className="an-live-status"><i/> Live analytics</span><button onClick={load} disabled={busy}><RefreshCw size={15} className={busy?'an-spin':''}/>{busy?'Refreshing…':'Refresh'}</button></div></header>
  {error&&<section className="an-error"><AlertTriangle size={19}/><div><b>Analytics data could not be loaded</b><p>{error}</p><button onClick={load}>Try again</button></div></section>}
  {busy&&!data?<section className="an-loading"><span/><span/><span/><span/></section>:null}
  {data&&<>
   <section className="an-metrics">
    <Metric icon={Users} label="Unique visitors" value={number(visitors.uniqueBrowsers)} note="Unique visitors · 7-day sample"/>
    <Metric icon={Download} label="PDF generated" value={number(totalPdf)} note="Editor · last 7 days"/>
    <Metric icon={Download} label="Media downloads" value={number(totalMedia)} note="Drive + Gallery · last 7 days"/>
    <Metric icon={Activity} label="Peak online" value={number(peak)} note="Highest concurrent presence · last 7 days"/>
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
    <Metric icon={Eye} label="Recorded sessions" value={number(visitors.sessions)} note="Consented sessions in the available sample"/>
    <Metric icon={Users} label="Returning visitors" value={number(visitors.returningBrowsers)} note="Visitors with more than one recorded session"/>
    <Metric icon={Clock3} label="Average session" value={duration(visitors.averageSessionSeconds)} note={number(visitors.sessions)+' recorded sessions'}/>
   </section>
   <section className="an-two-col">
    <article className="an-panel"><div className="an-panel-head"><div><span className="an-section-label">AUDIENCE</span><h2>Devices</h2></div></div>{devices.length?<Chart type="donut" height={245} options={{chart:{fontFamily:'inherit',background:'transparent'},labels:devices.map(item=>item.name),colors:['#b91c1c','#e87980','#f3b6ba','#7f1d1d','#c7cbd1'],legend:{position:'bottom',fontSize:'11px',labels:{colors:'#8b929e'}},dataLabels:{enabled:true},stroke:{width:2,colors:['var(--surface-card, #fff)']},plotOptions:{pie:{donut:{size:'66%',labels:{show:true,total:{show:true,label:'Devices',color:'#8b929e'}}}}},tooltip:{y:{formatter:value=>number(value)}}}} series={devices.map(item=>Number(item.count)||0)}/>:<p className="an-muted">No device breakdown available.</p>}</article>
    <article className="an-panel"><div className="an-panel-head"><div><span className="an-section-label">ENGAGEMENT</span><h2>Top pages</h2></div></div>{topPages.length?<Chart type="bar" height={Math.max(210,topPages.slice(0,6).length*42)} options={{chart:{type:'bar',toolbar:{show:false},fontFamily:'inherit',background:'transparent'},plotOptions:{bar:{horizontal:true,borderRadius:5,barHeight:'58%'}},colors:['#b91c1c'],dataLabels:{enabled:false},xaxis:{categories:topPages.slice(0,6).map(item=>item.name),labels:{style:{fontSize:'10px',colors:'#8b929e'}},axisBorder:{show:false},axisTicks:{show:false}},yaxis:{labels:{style:{fontSize:'10px',colors:'#8b929e'},maxWidth:150}},grid:{borderColor:'rgba(145,155,170,.18)',strokeDashArray:4},tooltip:{y:{formatter:value=>number(value)+' views'}}}} series={[{name:'Views',data:topPages.slice(0,6).map(item=>Number(item.views)||0)}]}/>:<p className="an-muted">No page-level engagement data available.</p>}</article>
   </section>
   <section className="an-section-title"><span className="an-section-label">PORTAL ACTIVITY</span><h2>Operational events</h2><p>Document generation and media downloads are tracked independently.</p></section>
   <section className="an-panel an-event-panel"><div className="an-event-row"><span className="an-event-icon"><Download size={17}/></span><div><b>PDF generated</b><small>Quotation documents created in the Editor.</small></div><strong>{number(totalPdf)}</strong></div><div className="an-event-row"><span className="an-event-icon"><Download size={17}/></span><div><b>Media downloads</b><small>Files from APML Drive and media from Gallery.</small></div><strong>{number(totalMedia)}</strong></div></section>
   <section className="an-section-title"><span className="an-section-label">PERFORMANCE INTELLIGENCE</span><h2>Experience &amp; speed</h2><p>Page performance from the available consented measurements.</p></section>
   <section className="an-metrics an-metrics-three">
    <Metric icon={Gauge} label="Average page load" value={performance.averageLoadMs==null?'—':number(performance.averageLoadMs)+' ms'} note={number(performance.samples)+' measurements'}/>
    <Metric icon={Gauge} label="75th percentile load" value={performance.p75LoadMs==null?'—':number(performance.p75LoadMs)+' ms'} note="Recorded page-load times"/>
    <Metric icon={Activity} label="Service worker coverage" value={performance.serviceWorkerControlledPercent==null?'—':performance.serviceWorkerControlledPercent+'%'} note="Measured page loads controlled by PWA worker"/>
   </section>
   {performance.pages?.length>0&&<section className="an-panel"><div className="an-panel-head"><div><span className="an-section-label">SLOWEST PAGES</span><h2>Average load time</h2></div></div>{performance.pages.slice(0,6).map(item=><div className="an-page-row" key={item.name}><span>{item.name}</span><b>{number(item.averageLoadMs)} ms</b></div>)}</section>}
   <p className="an-footnote">{(data.dataNotes||[]).join(' ')} Visitor intelligence and performance details are limited to the latest 500 stored sessions. Daily totals are aggregated separately.</p>
  </>}
 </div>
}
