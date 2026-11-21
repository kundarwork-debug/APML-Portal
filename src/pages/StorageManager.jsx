import { useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Cloud, Download, ExternalLink, FileSearch, Image, RefreshCw, Search, ShieldCheck, Video } from 'lucide-react'
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

export default function StorageManager(){
 const [report,setReport]=useState(null)
 const [busy,setBusy]=useState(false)
 const [error,setError]=useState('')
 const [query,setQuery]=useState('')
 const [filter,setFilter]=useState('all')
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
  const items=report?.unmatched||[]
  const term=query.trim().toLowerCase()
  return items.filter(item=>(filter==='all'||item.resourceType===filter)&&(!term||[item.publicId,item.url,item.format].some(value=>String(value||'').toLowerCase().includes(term))))
 },[report,query,filter])

 const exportCsv=()=>{
  if(!report)return
  const columns=['publicId','resourceType','format','createdAt','bytes','url']
  const quote=value=>'"'+String(value??'').replace(/"/g,'""')+'"'
  const csv=[columns.join(','),...rows.map(item=>columns.map(key=>quote(item[key])).join(','))].join('\r\n')
  const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'})
  const url=URL.createObjectURL(blob)
  const link=document.createElement('a')
  link.href=url;link.download='apml-cloudinary-unmatched-assets-'+new Date().toISOString().slice(0,10)+'.csv'
  document.body.appendChild(link);link.click();link.remove();URL.revokeObjectURL(url)
 }

 const totals=report?.totals
 return <div className="sm-page">
  <header className="sm-heading"><div><span className="sm-kicker"><ShieldCheck size={14}/> ADMIN · STORAGE MANAGEMENT</span><h1>Cloudinary storage audit</h1><p>Find Cloudinary assets that no longer have a matching reference in APML Portal.</p></div><button className="sm-scan" onClick={scan} disabled={busy}><RefreshCw size={16} className={busy?'sm-spin':''}/>{busy?'Scanning assets…':report?'Run new scan':'Scan Cloudinary'}</button></header>

  <section className="sm-safety"><ShieldCheck size={18}/><p><b>Read-only audit.</b> This scan compares Cloudinary inventory against readable Firebase portal records. It does not delete, move, or modify any files.</p></section>

  {error&&<section className="sm-error"><AlertTriangle size={18}/><div><b>Could not complete the scan</b><p>{error}</p></div></section>}

  {report&&<><section className="sm-summary">
   <article><span>Total Cloudinary assets</span><strong>{Number(totals.assets||0).toLocaleString('en-IN')}</strong><small>{totals.images} images · {totals.videos} videos · {totals.raw} raw files</small></article>
   <article><span>Portal-linked assets</span><strong className="sm-good">{Number(totals.matched||0).toLocaleString('en-IN')}</strong><small>Found in Firebase portal records</small></article>
   <article><span>Unmatched assets</span><strong className="sm-warn">{Number(totals.unmatched||0).toLocaleString('en-IN')}</strong><small>Require review before any action</small></article>
   <article><span>Unmatched storage</span><strong>{formatBytes(totals.unmatchedBytes)}</strong><small>Total Cloudinary storage: {formatBytes(totals.storageBytes)}</small></article>
  </section>

  <section className="sm-panel">
   <div className="sm-panel-head"><div><span className="sm-section-label">AUDIT RESULTS</span><h2>Assets without a portal reference</h2><p>{report.complete?'Cloudinary inventory scan completed.':'Partial inventory: the scan reached its per-type page limit. Unmatched results are not yet exhaustive.'} {updated?'Last scanned '+updated.toLocaleString('en-IN'):''}</p></div><button className="sm-export" onClick={exportCsv} disabled={!rows.length}><Download size={15}/> Export CSV</button></div>
   {!report.complete&&<div className="sm-partial"><AlertTriangle size={16}/> Partial scan only. Do not treat this list as a complete orphan-file report.</div>}
   <div className="sm-controls"><label className="sm-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search public ID, format or URL"/></label><select value={filter} onChange={e=>setFilter(e.target.value)} aria-label="Filter resource type"><option value="all">All types</option><option value="image">Images</option><option value="video">Videos</option><option value="raw">Raw / PDF</option></select></div>
   {rows.length?<div className="sm-table-wrap"><table className="sm-table"><thead><tr><th>Cloudinary asset</th><th>Type</th><th>Uploaded</th><th>Size</th><th>Open</th></tr></thead><tbody>{rows.map((item,index)=><tr key={item.resourceType+'/'+item.publicId+'/'+index}><td><b>{item.publicId}</b><small>{item.format||'Unknown format'}</small></td><td><span className="sm-type">{item.resourceType}</span></td><td>{formatDate(item.createdAt)}</td><td>{formatBytes(item.bytes)}</td><td>{item.url?<a href={item.url} target="_blank" rel="noreferrer" aria-label="Open Cloudinary asset"><ExternalLink size={15}/></a>:'—'}</td></tr>)}</tbody></table></div>:<div className="sm-empty"><CheckCircle2 size={25}/><b>{totals.unmatched?'No results match this filter':'No unmatched assets found'}</b><span>{totals.unmatched?'Try a different search or resource type.':'All scanned Cloudinary assets currently have a matching portal reference.'}</span></div>}
   <div className="sm-table-foot">Showing {rows.length.toLocaleString('en-IN')} of {Number(totals.unmatched||0).toLocaleString('en-IN')} unmatched assets</div>
  </section>
  <section className="sm-note"><FileSearch size={17}/><p><b>How matching works:</b> the audit extracts Cloudinary public IDs from URLs stored anywhere in the readable Firebase portal database, then compares them with Cloudinary image, video and raw uploads. A missing reference does not automatically mean a file is safe to delete; old links, backups or other integrations may still depend on it.</p></section>
 </>}

 {!report&&!busy&&!error&&<section className="sm-empty sm-first"><span className="sm-empty-icon"><Cloud size={26}/></span><b>No audit has been run yet</b><span>Run a read-only scan to compare your Cloudinary assets with APML Portal records.</span><button className="sm-scan" onClick={scan}><FileSearch size={16}/> Start first scan</button></section>}
 {busy&&<section className="sm-loading"><RefreshCw className="sm-spin" size={22}/><b>Scanning Cloudinary and portal references…</b><span>This may take a little while if the account contains many assets.</span></section>}
 </div>
}
