import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Cloud, Download, ExternalLink, FileSearch, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { getApmlAuth } from '../lib/firebase'
import './StorageManager.css'

const API='https://apml-drive-api.kundar-work.workers.dev/storage-audit'
const formatBytes=value=>{
 const bytes=Math.max(0,Number(value)||0)
 if(!bytes)return '0 B'
 const units=['B','KB','MB','GB','TB']
 const index=Math.min(units.length-1,Math.floor(Math.log(bytes)/Math.log(1024)))
 return (bytes/Math.pow(1024,index)).toFixed(index?1:0)+' '+units[index]
}
const formatDate=value=>value?new Date(value).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'}):'—'
const statusLabels={visible:'Visible in Portal',trash:'In Trash',deleted:'Deleted from Portal'}

export default function StorageManager(){
 const [report,setReport]=useState(null)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [query,setQuery]=useState('')
 const [statusFilter,setStatusFilter]=useState('all')
 const [typeFilter,setTypeFilter]=useState('all')
 const [updated,setUpdated]=useState(null)

 const scan=async()=>{
  setBusy(true);setError('')
  try{
   const auth=await getApmlAuth()
   const user=auth.currentUser
   if(!user)throw new Error('Your administrator session has expired. Please sign in again.')
   const token=await user.getIdToken(true)
   const response=await fetch(API,{headers:{Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'})
   const data=await response.json().catch(()=>({}))
   if(!response.ok||!data.ok)throw new Error(data.error||'Storage audit failed with HTTP '+response.status+'.')
   setReport(data);setUpdated(new Date())
  }catch(e){setError(e.message||'Could not complete the Cloudinary audit.')}
  finally{setBusy(false)}
 }

 const rows=useMemo(()=>{
  const items=report?.assets||[]
  const term=query.trim().toLowerCase()
  return items.filter(item=>(statusFilter==='all'||item.status===statusFilter)&&(typeFilter==='all'||item.resourceType===typeFilter)&&(!term||[item.fileName,item.publicId,item.url,...(item.locations||[]).flatMap(loc=>[loc.section,loc.name,loc.folder])].some(value=>String(value||'').toLowerCase().includes(term))))
 },[report,query,statusFilter,typeFilter])

 const exportCsv=()=>{
  if(!report)return
  const columns=['fileName','publicId','status','resourceType','format','createdAt','bytes','portalLocations','url']
  const quote=value=>'"'+String(value??'').replace(/"/g,'""')+'"'
  const csv=[columns.join(','),...rows.map(item=>columns.map(key=>{
   const value=key==='portalLocations'?(item.locations||[]).map(loc=>[loc.section,loc.folder,loc.status].filter(Boolean).join(' / ')).join(' | '):item[key]
   return quote(value)
  }).join(','))].join('\r\n')
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
  const url=URL.createObjectURL(blob)
  const link=document.createElement('a')
  link.href=url;link.download='apml-cloudinary-storage-audit-'+new Date().toISOString().slice(0,10)+'.csv'
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url)
 }

 const totals=report?.totals
 return <div className="sm-page">
  <header className="sm-heading"><div><span className="sm-kicker"><ShieldCheck size={14}/> ADMIN · STORAGE MANAGEMENT</span><h1>Cloudinary storage audit</h1><p>See whether every Cloudinary file is active in APML Portal, in Trash, or no longer referenced.</p></div><button className="sm-scan" onClick={scan} disabled={busy}><RefreshCw size={16} className={busy?'sm-spin':''}/>{busy?'Scanning assets…':report?'Run new scan':'Scan Cloudinary'}</button></header>

  <section className="sm-safety"><ShieldCheck size={18}/><p><b>Read-only audit.</b> The scan compares Cloudinary assets with APML Drive and Gallery records in Firebase. It does not delete, move, or modify any files.</p></section>
  {error&&<section className="sm-error"><AlertTriangle size={18}/><div><b>Could not complete the scan</b><p>{error}</p></div></section>}

  {report&&<><section className="sm-summary">
   <article><span>Total Cloudinary assets</span><strong>{Number(totals.assets||0).toLocaleString('en-IN')}</strong><small>{totals.images} images · {totals.videos} videos · {totals.raw} raw files</small></article>
   <article><span>Visible in Portal</span><strong className="sm-good">{Number(totals.visible||0).toLocaleString('en-IN')}</strong><small>{formatBytes(totals.visibleBytes)} storage</small></article>
   <article><span>In Trash Archive</span><strong className="sm-warn">{Number(totals.trash||0).toLocaleString('en-IN')}</strong><small>{formatBytes(totals.trashBytes)} storage</small></article>
   <article><span>Deleted from Portal</span><strong className="sm-danger">{Number(totals.deleted||0).toLocaleString('en-IN')}</strong><small>{formatBytes(totals.deletedBytes)} still in Cloudinary</small></article>
  </section>

  <section className="sm-panel">
   <div className="sm-panel-head"><div><span className="sm-section-label">CLOUDINARY INVENTORY</span><h2>File status and locations</h2><p>{report.complete?'Inventory scan completed.':'Partial inventory: the scan reached its per-type page limit; results are not exhaustive.'} {updated?'Last scanned '+updated.toLocaleString('en-IN'):''}</p></div><button className="sm-export" onClick={exportCsv} disabled={!rows.length}><Download size={15}/> Export filtered CSV</button></div>
   {!report.complete&&<div className="sm-partial"><AlertTriangle size={16}/> Partial scan only. Run another scan after reviewing the inventory limit before treating the totals as complete.</div>}
   <div className="sm-controls">
    <label className="sm-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search file name, folder or public ID"/></label>
    <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} aria-label="Filter file status"><option value="all">All statuses</option><option value="visible">Visible in Portal</option><option value="trash">In Trash</option><option value="deleted">Deleted from Portal</option></select>
    <select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} aria-label="Filter file type"><option value="all">All file types</option><option value="image">Images</option><option value="video">Videos</option><option value="raw">Raw / PDF</option></select>
   </div>
   {rows.length?<div className="sm-table-wrap"><table className="sm-table"><thead><tr><th>File</th><th>Portal status</th><th>Portal location</th><th>Cloudinary type</th><th>Uploaded</th><th>Size</th><th>Open</th></tr></thead><tbody>{rows.map((item,index)=><tr key={item.resourceType+'/'+item.publicId+'/'+index}>
    <td><b>{item.fileName||item.publicId}</b><small>{item.publicId}</small><small>{item.format||'Unknown format'}</small></td>
    <td><span className={'sm-status sm-status-'+item.status}>{statusLabels[item.status]||item.status}</span></td>
    <td>{item.locations?.length?item.locations.map((loc,i)=><div className="sm-location" key={i}><b>{loc.section}</b><small>{loc.folder||'—'}{loc.status==='trash'?' · Trash':''}</small></div>):<span className="sm-muted">No portal record found</span>}</td>
    <td><span className="sm-type">{item.resourceType}</span></td><td>{formatDate(item.createdAt)}</td><td>{formatBytes(item.bytes)}</td><td>{item.url?<a href={item.url} target="_blank" rel="noreferrer" aria-label="Open Cloudinary asset"><ExternalLink size={15}/></a>:'—'}</td>
   </tr>)}</tbody></table></div>:<div className="sm-empty"><CheckCircle2 size={25}/><b>No files match these filters</b><span>Try changing the status, file type or search phrase.</span></div>}
   <div className="sm-table-foot">Showing {rows.length.toLocaleString('en-IN')} of {Number(totals.assets||0).toLocaleString('en-IN')} Cloudinary assets</div>
  </section>
  <section className="sm-note"><FileSearch size={17}/><p><b>How statuses are assigned:</b> an asset is Visible if at least one active Drive or Gallery record references it. It is In Trash if it has no active record but has a trashed record, including files inside a trashed Drive folder. It is Deleted from Portal only when neither Drive nor Gallery has a matching record. These classifications do not prove that an asset is safe to delete; review it before taking any action.</p></section>
 </>}

 {!report&&!busy&&!error&&<section className="sm-empty sm-first"><span className="sm-empty-icon"><Cloud size={26}/></span><b>No audit has been run yet</b><span>Run a read-only scan to classify all Cloudinary files by their APML Portal status.</span><button className="sm-scan" onClick={scan}><FileSearch size={16}/> Start first scan</button></section>}
 {busy&&<section className="sm-loading"><RefreshCw className="sm-spin" size={22}/><b>Scanning Cloudinary and portal references…</b><span>This may take a little while if the account contains many assets.</span></section>}
 </div>
}
