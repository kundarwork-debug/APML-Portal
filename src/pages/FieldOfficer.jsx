import {useEffect,useMemo,useState} from 'react'
import {Plus, Pencil, Trash2, RotateCcw, LogOut, LoaderCircle, X, Search, Phone, MessageCircle, UserRoundPlus, Upload} from 'lucide-react'
import './FieldOfficer.css'

const config={apiKey:'AIzaSyDgJ6uRCABWxAHOU1bIY4VuA-nQ0zM3aF8',authDomain:'apml-portal.firebaseapp.com',databaseURL:'https://apml-portal-default-rtdb.firebaseio.com',projectId:'apml-portal',storageBucket:'apml-portal.firebasestorage.app',messagingSenderId:'479017159240',appId:'1:479017159240:web:90fc2b64776f530874a67d'}
const admins=['kundar701@gmail.com','kundar.work@gmail.com']
let xlsxLoad
function loadXlsx(){if(!xlsxLoad)xlsxLoad=new Promise((resolve,reject)=>{if(window.XLSX)return resolve(window.XLSX);const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=()=>resolve(window.XLSX);s.onerror=()=>reject(new Error('Excel import library could not load.'));document.head.appendChild(s)});return xlsxLoad}
function normHeader(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
const empty={name:'',branch:'',apmCode:'N/A',mobile:'',designation:'Marketing Executive',role:'BFO',status:'Active',isDeleted:false}
let firebaseLoad
function loadFirebase(){
 if(!firebaseLoad)firebaseLoad=(async()=>{
  const add=src=>new Promise((resolve,reject)=>{
   const existing=[...document.scripts].find(s=>s.src===src)
   if(existing){if(existing.dataset.apmlReady==='1')return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
   const s=document.createElement('script');s.src=src;s.async=true;s.onload=()=>{s.dataset.apmlReady='1';resolve()};s.onerror=()=>reject(new Error('Firebase service could not load.'));document.head.appendChild(s)
  })
  if(!window.firebase?.apps)await add('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')
  if(!window.firebase.database)await add('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js')
  if(!window.firebase.apps.length)window.firebase.initializeApp(config)
  return window.firebase
 })()
 return firebaseLoad
}
async function loadAuth(){const fb=await loadFirebase();if(!fb.auth)await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js';s.onload=resolve;s.onerror=()=>reject(new Error('Google sign-in service could not load.'));document.head.appendChild(s)});return fb}
function isDeleted(x){return x.isDeleted===true||x.isDeleted==='true'||x.isDeleted===1}

export default function FieldOfficer(){
 const [records,setRecords]=useState([]),[query,setQuery]=useState(''),[status,setStatus]=useState('Connecting to live officer directory…'),[admin,setAdmin]=useState(false),[busy,setBusy]=useState(false),[edit,setEdit]=useState(null),[toast,setToast]=useState('')
 const [ref,setRef]=useState(null),[importing,setImporting]=useState(false)
 useEffect(()=>{let active=true,dbRef=null,handler=null;(async()=>{try{const fb=await loadFirebase();if(!active)return;dbRef=fb.database().ref('field_officers');setRef(dbRef);handler=snap=>{if(!active)return;const v=snap.val()||{};setRecords(Object.entries(v).map(([id,x])=>({...x,id})));setStatus('Live sync connected')};dbRef.on('value',handler,e=>{if(active)setStatus('Unable to load directory: '+e.message)})}catch(e){if(active)setStatus('Firebase connection unavailable. '+e.message)}})();return()=>{active=false;if(dbRef&&handler)dbRef.off('value',handler)}},[])
 const activeCount=records.filter(x=>!isDeleted(x)).length
 const filtered=useMemo(()=>records.filter(x=>admin||!isDeleted(x)).filter(x=>[x.name,x.branch,x.apmCode,x.designation,x.role,x.mobile,x.status].join(' ').toLowerCase().includes(query.toLowerCase().trim())).sort((a,b)=>Number(isDeleted(a))-Number(isDeleted(b))),[records,query,admin])
 const notify=m=>{setToast(m);window.setTimeout(()=>setToast(''),2800)}
 async function toggleAdmin(){setBusy(true);try{const fb=await loadAuth(),auth=fb.auth();if(admin){await auth.signOut();setAdmin(false);notify('Admin view closed');return}const result=await auth.signInWithPopup(new fb.auth.GoogleAuthProvider()),email=(result.user.email||'').toLowerCase().trim();if(!admins.includes(email)){await auth.signOut();throw new Error('This Google account is not authorized for admin access.')}setAdmin(true);notify('Admin access enabled')}catch(e){notify(e.message||'Admin sign-in failed')}finally{setBusy(false)}}
 async function save(){if(!admin||!ref)return notify('Admin access required');const value={...edit,name:edit.name.trim(),branch:edit.branch.trim().toUpperCase(),apmCode:edit.apmCode.trim()||'N/A',mobile:edit.mobile.trim(),role:'BFO'};if(!value.name||!value.branch||!value.mobile)return notify('Name, branch and mobile are required.');setBusy(true);try{if(edit.id)await ref.child(edit.id).update(value);else await ref.push({...value,isDeleted:false});setEdit(null);notify(edit.id?'Officer details updated':'New field officer created')}catch(e){notify('Save failed: '+e.message)}finally{setBusy(false)}}
 async function update(id,patch){if(!admin||!ref)return;setBusy(true);try{await ref.child(id).update(patch);notify(patch.isDeleted?'Officer hidden from directory':'Officer restored')}catch(e){notify('Update failed: '+e.message)}finally{setBusy(false)}}
 async function importExcel(file){
  if(!admin||!ref)return notify('Admin access required');
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
    const rawStatus=pick('status').trim().toLowerCase();\n    const officerStatus=rawStatus==='assco'||rawStatus==='associate'?'Assco':rawStatus==='leave'?'Leave':rawStatus==='left'?'Left':'Active';\n    imported.push({name,branch:branch.toUpperCase(),apmCode:pick('apmcode','apm','code')||'N/A',mobile,designation:pick('designation','title')||'Marketing Executive',role:'BFO',status:officerStatus,isDeleted:false});
   }
   if(!imported.length)throw new Error('No valid new officers found. Required columns: Name, Branch and Mobile.');
   for(let i=0;i<imported.length;i+=25){const updates={};imported.slice(i,i+25).forEach(v=>{updates[ref.push().key]=v});await ref.update(updates)}
   notify('Imported '+imported.length+' officers'+(skipped.length?' · skipped '+skipped.length+' invalid/duplicate rows':''));
  }catch(e){notify('Excel import failed: '+e.message)}finally{setImporting(false)}
 }
 async function permanentlyDelete(id){if(!admin||!ref)return;if(!window.confirm('Permanently remove this officer? This cannot be undone.'))return;setBusy(true);try{await ref.child(id).remove();notify('Officer permanently deleted')}catch(e){notify('Delete failed: '+e.message)}finally{setBusy(false)}}
 return <main className="fo-page">
  <header className="fo-heading"><div className="eyebrow">PEOPLE DIRECTORY</div><h1>Field Officer <span>Directory</span></h1><p>Find branch officers, contact details and current status.</p><div className="fo-status"><i/> {status} · {activeCount.toLocaleString('en-IN')} active records</div></header>
  <section className="fo-panel">
   <div className="fo-toolbar"><div className="fo-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, branch, APM code or mobile…"/></div><div className="fo-toolbar-actions">{admin&&<><button className="fo-create" onClick={()=>setEdit({...empty})}><Plus size={16}/> Create officer</button><label className="fo-create fo-import-label"><Upload size={15}/> {importing?'Importing…':'Import Excel'}<input type="file" accept=".xlsx,.xls,.csv" disabled={importing||busy} onChange={e=>{const f=e.target.files?.[0];e.target.value='';importExcel(f)}} hidden/></label></>}<button onClick={toggleAdmin} disabled={busy}>{busy?'Please wait…':admin?<><LogOut size={15}/> Exit admin</>:'Admin sign in'}</button></div></div>
   <div className="fo-chips">{['MUM','PUN','GRGN','DEL','AHMD','GOA'].map(x=><button key={x} onClick={()=>setQuery(x)}>{x}</button>)}<button onClick={()=>setQuery('')}>Clear</button></div>
   <div className="fo-list"><div className="fo-row fo-head"><b>Officer / Role</b><b>Branch / APM</b><b>Contact</b><b>Status</b><b>Actions</b></div>
    {filtered.map(x=><article className={'fo-row '+(isDeleted(x)?'deleted':'')} key={x.id}>
     <div className="fo-person"><span className="fo-avatar">{(x.name||'?').trim().slice(0,1).toUpperCase()}</span><div><strong>{x.name||'Unnamed officer'}{isDeleted(x)?' · DELETED':''}</strong><small>{x.designation||x.role||'Field Officer'}{x.role?' ('+x.role+')':''}</small></div></div>
     <div><strong>{x.branch||'—'}</strong><small>{x.apmCode||'—'}</small></div>
     <div><a className="fo-phone" href={x.mobile?'tel:'+String(x.mobile).replace(/[^+\d]/g,''):undefined}><Phone size={13}/>{x.mobile||'—'}</a></div>
     <div><span className="fo-tag">{x.status||'—'}</span></div>
     <div className="fo-actions">{!isDeleted(x)&&x.mobile&&<a href={'https://wa.me/91'+String(x.mobile).replace(/\D/g,'').slice(-10)} target="_blank" rel="noreferrer"><MessageCircle size={13}/> WhatsApp</a>}{admin&&(isDeleted(x)?<><button onClick={()=>update(x.id,{isDeleted:false})}><RotateCcw size={14}/> Restore</button><button className="fo-danger" onClick={()=>permanentlyDelete(x.id)}><Trash2 size={14}/> Delete forever</button></>:<><button onClick={()=>setEdit({...empty,...x})}><Pencil size={14}/> Edit</button><button className="fo-danger" onClick={()=>update(x.id,{isDeleted:true})}><Trash2 size={14}/> Delete</button></>)}</div>
    </article>)}
    {!filtered.length&&<div className="fo-empty">{status.includes('Connecting')?'Loading field officers…':'No matching field officers found.'}</div>}
   </div><footer className="fo-foot">Showing {filtered.length.toLocaleString('en-IN')} of {(admin?records.length:activeCount).toLocaleString('en-IN')} records {admin?'· Admin view includes deleted records':''}</footer>
  </section>
  {edit&&<div className="fo-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEdit(null)}}><form className="fo-modal" onSubmit={e=>{e.preventDefault();save()}}><div className="fo-modal-head"><div><b>{edit.id?'Edit field officer':'Create field officer'}</b><small>Keep branch and contact information current</small></div><button type="button" onClick={()=>setEdit(null)} aria-label="Close"><X size={19}/></button></div><div className="fo-form-grid">
   <label>Officer name *<input required value={edit.name||''} onChange={e=>setEdit(v=>({...v,name:e.target.value}))}/></label><label>Branch code *<input required value={edit.branch||''} onChange={e=>setEdit(v=>({...v,branch:e.target.value.toUpperCase()}))}/></label><label>APM code<input value={edit.apmCode||''} onChange={e=>setEdit(v=>({...v,apmCode:e.target.value}))}/></label><label>Mobile number *<input required value={edit.mobile||''} onChange={e=>setEdit(v=>({...v,mobile:e.target.value}))}/></label>
   <label>Designation<select value={edit.designation||'Marketing Executive'} onChange={e=>setEdit(v=>({...v,designation:e.target.value}))}><option>Marketing Executive</option><option>Branch Incharge</option></select></label><label>Status<select value={edit.status||'Active'} onChange={e=>setEdit(v=>({...v,status:e.target.value}))}><option>Active</option><option>Assco</option><option>Leave</option><option>Left</option></select></label>
  </div><div className="fo-modal-actions"><button type="button" onClick={()=>setEdit(null)}>Cancel</button><button className="fo-save" type="submit" disabled={busy}>{busy?'Saving…':'Save officer'}</button></div></form></div>}
  {toast&&<div className="fo-toast">{toast}</div>}{busy&&<div className="fo-busy"><LoaderCircle size={18}/> Working…</div>}
 </main>
}
