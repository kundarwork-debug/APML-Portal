import {useEffect,useMemo,useState} from 'react'
import {Plus,Pencil,Trash2,RotateCcw,LogOut,Search,Phone,Upload,Users,MapPin,Clock3,BriefcaseBusiness,RefreshCw,LoaderCircle} from 'lucide-react'
import {getApmlDatabase} from '../lib/firebase'
import { useApmlAdminAuth } from '../lib/firebaseAuth'
import {driveAlert,driveConfirm,driveToast} from '../lib/sweetalert'
import './FieldOfficer.css'

const empty={name:'',branch:'',apmCode:'N/A',mobile:'',designation:'Marketing Executive',role:'BFO',status:'Active',isDeleted:false}
let xlsxLoad
function loadXlsx(){if(!xlsxLoad)xlsxLoad=new Promise((resolve,reject)=>{if(window.XLSX)return resolve(window.XLSX);const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=()=>resolve(window.XLSX);s.onerror=()=>reject(new Error('Excel import library could not load.'));document.head.appendChild(s)});return xlsxLoad}
function normHeader(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function isDeleted(x){return x.isDeleted===true||x.isDeleted==='true'||x.isDeleted===1}

export default function FieldOfficer(){
 const [records,setRecords]=useState([]),[query,setQuery]=useState(''),[status,setStatus]=useState('Connecting to live officer directory…'),[busy,setBusy]=useState(false),[edit,setEdit]=useState(null),[toast,setToast]=useState('')
 const { admin, signIn, signOut } = useApmlAdminAuth()
 const [ref,setRef]=useState(null),[importing,setImporting]=useState(false),[statusFilter,setStatusFilter]=useState('All')
 useEffect(()=>{let active=true,dbRef=null,handler=null;(async()=>{try{const db=await getApmlDatabase();if(!active)return;dbRef=db.ref('field_officers');setRef(dbRef);handler=snap=>{if(!active)return;const v=snap.val()||{};setRecords(Object.entries(v).map(([id,x])=>({...x,id})));setStatus('Live sync connected')};dbRef.on('value',handler,e=>{if(active)setStatus('Unable to load directory: '+e.message)})}catch(e){if(active)setStatus('Firebase connection unavailable. '+e.message)}})();return()=>{active=false;if(dbRef&&handler)dbRef.off('value',handler)}},[])
 const activeRecords=records.filter(x=>!isDeleted(x)),activeCount=activeRecords.length
 const branchCount=new Set(activeRecords.map(x=>(x.branch||'').trim().toUpperCase()).filter(Boolean)).size
 const leaveCount=activeRecords.filter(x=>['leave','assco'].includes(String(x.status||'').toLowerCase())).length
 const availableBranches=[...new Set(activeRecords.map(x=>String(x.branch||'').trim().toUpperCase()).filter(Boolean))].sort((a,b)=>a.localeCompare(b))
 const filtered=useMemo(()=>records.filter(x=>admin||!isDeleted(x)).filter(x=>statusFilter==='All'||(statusFilter==='Deleted'?isDeleted(x):!isDeleted(x)&&String(x.status||'Active').toLowerCase()===statusFilter.toLowerCase())).filter(x=>[x.name,x.branch,x.apmCode,x.designation,x.role,x.mobile,x.status].join(' ').toLowerCase().includes(query.toLowerCase().trim())).sort((a,b)=>Number(isDeleted(a))-Number(isDeleted(b))||String(a.name||'').localeCompare(String(b.name||''))),[records,query,admin,statusFilter])
 const notify=m=>{driveToast(m).catch(()=>{setToast(m);window.setTimeout(()=>setToast(''),2800)})}
 async function copyNumber(number){
  try{
   if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(String(number));
   else{
    const field=document.createElement('textarea');field.value=String(number);field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();
    const copied=document.execCommand('copy');field.remove();if(!copied)throw new Error('Copy was blocked by the browser.');
   }
   notify('Phone number copied');
  }catch{notify('Could not copy number. Please select and copy it manually.')}
 }
 async function toggleAdmin(){setBusy(true);try{if(admin){await signOut();notify('Admin view closed');return}await signIn()}catch(e){try{await driveAlert('Admin sign-in failed',e.message||'Please try again.','error')}catch{notify(e.message||'Admin sign-in failed')}}finally{setBusy(false)}}
 async function save(){if(!ref)return notify('Directory is not connected');const value={...edit,name:edit.name.trim(),branch:edit.branch.trim().toUpperCase(),apmCode:edit.apmCode.trim()||'N/A',mobile:edit.mobile.trim(),role:'BFO'};if(!value.name||!value.branch||!value.mobile)return notify('Name, branch and mobile are required.');setBusy(true);try{if(edit.id)await ref.child(edit.id).update(value);else await ref.push({...value,isDeleted:false});setEdit(null);notify(edit.id?'Officer details updated':'New field officer created')}catch(e){notify('Save failed: '+e.message)}finally{setBusy(false)}}
 async function update(id,patch){if(!ref)return;if(patch.isDeleted===false&&!admin)return notify('Admin access required to restore officers');if(patch.isDeleted===true){const ok=await driveConfirm('Hide this officer?','The contact will disappear from the public directory. Only an admin can restore or permanently delete it.','Hide contact');if(!ok)return}setBusy(true);try{await ref.child(id).update(patch);notify(patch.isDeleted?'Contact hidden from public directory':'Officer restored')}catch(e){notify('Update failed: '+e.message)}finally{setBusy(false)}}
 async function importExcel(file){
  if(!ref)return notify('Directory is not connected');
  if(!file)return;
  setImporting(true);
  try{
   const XLSX=await loadXlsx(),data=await file.arrayBuffer(),book=XLSX.read(data,{type:'array'}),sheet=book.Sheets[book.SheetNames[0]];
   const rows=XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false});
   if(!rows.length)throw new Error('The selected sheet has no data rows.');
   const existing=new Set(records.map(x=>String(x.mobile||'').replace(/\D/g,'')+'|'+String(x.branch||'').trim().toUpperCase()));
   const imported=[],skipped=[];
   for(const row of rows){
    const mapped={};Object.entries(row).forEach(([k,v])=>{mapped[normHeader(k)]=String(v??'').trim()});
    const pick=(...keys)=>{for(const k of keys){if(mapped[k]!==undefined&&mapped[k]!=='')return mapped[k]}return ''};
    const name=pick('name','officername','fieldofficer','employeename');
    const branch=pick('branch','branchcode','location');
    const mobile=pick('mobile','mobileno','phonenumber','contact','contactnumber');
    if(!name||!branch||!mobile){skipped.push('invalid');continue}
    const key=mobile.replace(/\D/g,'')+'|'+branch.toUpperCase();
    if(existing.has(key)){skipped.push('duplicate');continue}
    existing.add(key);
    const rawStatus=pick('status').trim().toLowerCase();
    const officerStatus=rawStatus==='assco'||rawStatus==='associate'?'Assco':rawStatus==='leave'?'Leave':rawStatus==='left'?'Left':'Active';
    imported.push({name,branch:branch.toUpperCase(),apmCode:pick('apmcode','apm','code')||'N/A',mobile,designation:pick('designation','title')||'Marketing Executive',role:'BFO',status:officerStatus,isDeleted:false});
   }
   if(!imported.length)throw new Error('No valid new officers found. Required columns: Name, Branch and Mobile.');
   for(let i=0;i<imported.length;i+=25){const updates={};imported.slice(i,i+25).forEach(v=>{updates[ref.push().key]=v});await ref.update(updates)}
   notify('Imported '+imported.length+' officers'+(skipped.length?' · skipped '+skipped.length+' invalid/duplicate rows':''));
  }catch(e){notify('Excel import failed: '+e.message)}finally{setImporting(false)}
 }
 async function permanentlyDelete(id){if(!admin||!ref)return;const ok=await driveConfirm('Delete officer permanently?','This removes the record from Firebase and cannot be undone.','Delete forever');if(!ok)return;setBusy(true);try{await ref.child(id).remove();notify('Officer permanently deleted')}catch(e){notify('Delete failed: '+e.message)}finally{setBusy(false)}}
 return <main className="fo-page">
  <header className="fo-head"><div className="fo-heading-copy"><div className="fo-eyebrow"><Users size={14}/> PEOPLE DIRECTORY</div><h1 className="fo-title">Field Officer <span>Directory</span></h1><p className="fo-subtitle">Find branch officers, contact details and current status.</p>
   <div className="fo-stats"><span><Users size={14}/><strong>{activeCount.toLocaleString('en-IN')}</strong> Active officers</span><span><MapPin size={14}/><strong>{branchCount.toLocaleString('en-IN')}</strong> Branches</span><span><Clock3 size={14}/><strong>{leaveCount.toLocaleString('en-IN')}</strong> On leave / associate</span></div>
  </div><button className={admin?'fo-admin':'fo-admin fo-google-admin'} onClick={toggleAdmin} disabled={busy} title={admin?'Exit admin':'Sign in with Google'} aria-label={admin?'Exit admin':'Sign in with Google'}>{busy?<RefreshCw size={17} className="fo-admin-spinner"/>:admin?<><LogOut size={15}/> Exit admin</>:<svg className="fo-google-mark" viewBox="0 0 48 48" role="img" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12z"/></svg>}</button></header>
  <section className="fo-action-bar"><div className="fo-action-intro"><span className="fo-action-icon"><BriefcaseBusiness size={19}/></span><div><strong>Officer directory</strong><small>Search, contact and manage branch officer records</small></div></div>
   <div className="fo-action-buttons"><label className="fo-search"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, branch, APM code or mobile…"/></label>
    <><button className="fo-action fo-action-primary" onClick={()=>setEdit({...empty})}><Plus size={15}/> Create officer</button><label className="fo-action fo-action-primary fo-import-label"><Upload size={15}/>{importing?'Importing…':'Import Excel'}<input type="file" accept=".xlsx,.xls,.csv" disabled={importing||busy} onChange={e=>{const f=e.target.files?.[0];e.target.value='';importExcel(f)}} hidden/></label></>}
   </div>
  </section>
  <div className="fo-toolbar"><div className="fo-filter-tabs">{['All','Active','Assco','Leave','Left','Deleted'].map(x=><button key={x} className={statusFilter===x?'selected':''} onClick={()=>setStatusFilter(x)}>{x==='All'?'All officers':x}</button>)}</div>
   <div className="fo-quick-filters">{availableBranches.map(branch=><button key={branch} className={query.trim().toUpperCase()===branch?'selected':''} onClick={()=>setQuery(query.trim().toUpperCase()===branch?'':branch)}>{branch}</button>)}{(query||statusFilter!=='All')&&<button onClick={()=>{setQuery('');setStatusFilter('All')}}><RefreshCw size={12}/> Clear</button>}</div>
  </div>
  <div className="fo-live-status"><span className="fo-live-dot"/>{status}<span className="fo-status-count">Showing {filtered.length.toLocaleString('en-IN')} of {(admin?records.length:activeCount).toLocaleString('en-IN')} records</span></div>
  <section className="fo-results"><div className="fo-results-heading"><h2><Users size={17}/> Field officers</h2><span>Everyone can manage officer records</span></div>
   <div className="fo-contact-list">
    {filtered.map(x=><article className={'fo-contact-row '+(isDeleted(x)?'deleted':'')} key={x.id}>
     <span className="fo-contact-avatar">{(x.name||'?').trim().slice(0,1).toUpperCase()}</span>
     <div className="fo-contact-main"><strong>{x.name||'Unnamed officer'}</strong><span>{x.designation||x.role||'Field Officer'}{x.role?' · '+x.role:''}</span></div>
     <div className="fo-contact-branch"><span>BRANCH</span><strong>{x.branch||'—'}</strong></div>
     <div className="fo-contact-phone"><span>PHONE</span>{x.mobile?<button type="button" className="fo-copy-phone" onClick={()=>copyNumber(x.mobile)} title="Copy phone number" aria-label={'Copy phone number '+x.mobile}>{x.mobile}</button>:<em>Not available</em>}</div>
     <span className={'fo-contact-status '+(isDeleted(x)?'deleted':String(x.status||'Active').toLowerCase())}>{isDeleted(x)?'Deleted':x.status||'Active'}</span>
     <div className="fo-contact-actions">{isDeleted(x)?(admin?<><button onClick={()=>update(x.id,{isDeleted:false})} title="Restore"><RotateCcw size={16}/></button><button className="fo-danger" onClick={()=>permanentlyDelete(x.id)} title="Delete forever"><Trash2 size={16}/></button></>:null):<><button onClick={()=>setEdit({...empty,...x})} title="Edit details"><Pencil size={16}/></button><button className="fo-danger" onClick={()=>update(x.id,{isDeleted:true})} title="Hide contact"><Trash2 size={16}/></button></>}
     </div>
    </article>)}
    {!filtered.length&&status.includes('Connecting')?<div className="fo-loading" role="status" aria-live="polite"><span className="fo-loader-ring"><LoaderCircle size={25}/></span><strong>Loading field officers</strong><small>Connecting to live APML records…</small></div>:!filtered.length&&<div className="fo-empty"><Users size={28}/><strong>{status.startsWith('Unable')||status.startsWith('Firebase')?'Unable to load field officers':'No matching field officers found'}</strong><span>Try another name, branch code or status filter.</span></div>}
   </div>
  </section>
  {edit&&<div className="fo-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEdit(null)}}><form className="fo-modal" onSubmit={e=>{e.preventDefault();save()}}><div className="fo-modal-head"><div><b>{edit.id?'Edit field officer':'Create field officer'}</b><small>Keep branch and contact information current</small></div><button type="button" onClick={()=>setEdit(null)} aria-label="Close">×</button></div><div className="fo-form-grid">
   <label>Officer name *<input required value={edit.name||''} onChange={e=>setEdit(v=>({...v,name:e.target.value}))}/></label><label>Branch code *<input required value={edit.branch||''} onChange={e=>setEdit(v=>({...v,branch:e.target.value.toUpperCase()}))}/></label><label>APM code<input value={edit.apmCode||''} onChange={e=>setEdit(v=>({...v,apmCode:e.target.value}))}/></label><label>Mobile number *<input required value={edit.mobile||''} onChange={e=>setEdit(v=>({...v,mobile:e.target.value}))}/></label>
   <label>Designation<select value={edit.designation||'Marketing Executive'} onChange={e=>setEdit(v=>({...v,designation:e.target.value}))}><option>Marketing Executive</option><option>Branch Incharge</option></select></label><label>Status<select value={edit.status||'Active'} onChange={e=>setEdit(v=>({...v,status:e.target.value}))}><option>Active</option><option>Assco</option><option>Leave</option><option>Left</option></select></label>
  </div><div className="fo-modal-actions"><button type="button" onClick={()=>setEdit(null)}>Cancel</button><button className="fo-save" type="submit" disabled={busy}>{busy?'Saving…':'Save officer'}</button></div></form></div>}
  {toast&&<div className="fo-fallback-toast">{toast}</div>}
 </main>
}
