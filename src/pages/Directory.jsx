import { useEffect, useMemo, useState } from 'react'
import { Search, MapPin, Phone, Copy, Pencil, Trash2, RotateCcw, Plus, Upload, LogOut, Users, MapPinned, LoaderCircle, X, ExternalLink } from 'lucide-react'
import { driveAlert, driveConfirm, driveToast, getSwal } from '../lib/sweetalert'
import { useApmlAdminAuth } from '../lib/supabaseAuth'
import './Directory.css'

const firebaseConfig = {
  apiKey: 'AIzaSyDgJ6uRCABWxAHOU1bIY4VuA-nQ0zM3aF8',
  authDomain: 'apml-portal.firebaseapp.com',
  databaseURL: 'https://apml-portal-default-rtdb.firebaseio.com',
  projectId: 'apml-portal',
  storageBucket: 'apml-portal.firebasestorage.app',
  messagingSenderId: '479017159240',
  appId: '1:479017159240:web:0853422718e6195b74a67d',
  measurementId: 'G-4H1HT31DYB'
}
const CITIES = ['Mumbai','Pune','Gurgaon','Ahmedabad','Delhi','Bangalore','Kolkata','Hyderabad','Chennai','Indore','Jaipur','Nagpur','Surat','Lucknow']
const EMPTY = { category:'', location:'', region:'', designation:'', name:'', contact:'', address:'', isDeleted:false }
let firebasePromise
function loadScript(src) {
  if (!firebasePromise) firebasePromise = (async () => {
    const add = (url) => new Promise((resolve,reject) => {
      if (document.querySelector('script[data-apml-src="'+url+'"]')) return resolve()
      const script=document.createElement('script'); script.src=url; script.async=true; script.dataset.apmlSrc=url
      script.onload=resolve; script.onerror=()=>reject(new Error('Unable to load Firebase services. Check your connection.'))
      document.head.appendChild(script)
    })
    if (!window.firebase) await add('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')
    if (!window.firebase.database) await add('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js')
    if (!window.firebase.apps.length) window.firebase.initializeApp(firebaseConfig)
    return window.firebase
  })()
  return firebasePromise
}
function escapeText(value='') { return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) }
function deleted(record) { return record.isDeleted===true || record.isDeleted==='true' || record.isDeleted===1 }
function GoogleMark(){return <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.13 0-5.78-2.11-6.73-4.96H1.15v3.14C3.15 21.32 7.22 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.24c-.25-.72-.38-1.49-.38-2.24s.13-1.52.38-2.24V6.62H1.15C.42 8.1 0 9.77 0 11.5s.42 3.4 1.15 4.88l4.12-3.14z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.22 0 3.15 2.68 1.15 6.62l4.12 3.14c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>}
export default function Directory(){
  const [rows,setRows]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('')
  const [query,setQuery]=useState(''),[busy,setBusy]=useState(false),[edit,setEdit]=useState(null)
  const [toast,setToast]=useState('')
  const { admin, userEmail, signIn, signOut } = useApmlAdminAuth()
  const [db,setDb]=useState(null)
  useEffect(()=>{
    let active=true,ref=null
    loadScript().then(fb=>{
      if(!active)return
      const database=fb.database(),directoryRef=database.ref('directory')
      setDb(directoryRef)
      ref=directoryRef
      const unsubscribe=directoryRef.on('value',snapshot=>{
        if(!active)return
        const data=snapshot.val()||{}
        setRows(Object.entries(data).map(([id,item])=>({id,...(item||{})})))
        setLoading(false);setError('')
      },err=>{if(active){setError(err.message||'Unable to load directory.');setLoading(false)}})
      return unsubscribe
    }).catch(err=>{if(active){setError(err.message);setLoading(false)}})
    return ()=>{active=false;if(ref)ref.off('value')}
  },[])
  const activeCount=rows.filter(r=>!deleted(r)).length
  const visible=useMemo(()=>{
    const pool=admin?rows:[...rows.filter(r=>!deleted(r))]
    const q=query.trim().toLowerCase()
    return (q?pool.filter(r=>Object.values(r).some(v=>String(v??'').toLowerCase().includes(q))):pool)
      .sort((a,b)=>Number(deleted(a))-Number(deleted(b)))
  },[rows,admin,query])
  const notify=(message)=>{driveToast(message).catch(()=>{setToast(message);window.setTimeout(()=>setToast(''),2600)})}
  const authorized=()=>Boolean(admin && userEmail)
  async function toggleAdmin(){
    try{
      setBusy(true)
      if(admin){await signOut();notify('Admin view closed');return}
      await signIn()
    }catch(e){await driveAlert('Admin sign-in failed',e.message,'error').catch(()=>notify(e.message))}
    finally{setBusy(false)}
  }
  async function saveRecord(record){
    if(!db){notify('Directory is not connected.');return}
    if(!record.name.trim()||!record.location.trim()){notify('Name and location are required.');return}
    try{
      setBusy(true)
      if(record.id) await db.child(record.id).set({...record,isDeleted:deleted(record)})
      else await db.push({...record,isDeleted:false})
      setEdit(null);notify(record.id?'Contact updated':'Contact created')
    }catch(e){notify('Save failed: '+e.message)}finally{setBusy(false)}
  }
  async function updateFlag(id,patch){
    if(!authorized())return notify('Admin access required')
    if(patch.isDeleted===true && !(await driveConfirm('Hide this contact?','It will move to deleted records and remain recoverable by admins.','Hide contact')))return
    if(patch.isDeleted===false && !(await driveConfirm('Restore this contact?','It will become visible in the public directory again.','Restore contact','question')))return
    try{setBusy(true);await db.child(id).update(patch);notify(patch.isDeleted?'Contact moved to deleted records':patch.isDeleted===false?'Contact restored':'Contact updated')}
    catch(e){notify('Update failed: '+e.message)}finally{setBusy(false)}
  }
  async function permanentlyDelete(id){
    if(!authorized())return notify('Admin access required')
    if(!(await driveConfirm('Delete permanently?','This contact will be permanently removed. This cannot be undone.','Delete permanently','error')))return
    try{setBusy(true);await db.child(id).remove();notify('Contact permanently deleted')}
    catch(e){notify('Delete failed: '+e.message)}finally{setBusy(false)}
  }
  async function importExcel(event){
    const file=event.target.files?.[0];if(!file)return
    try{
      if(!authorized())throw new Error('Please sign in with an authorized admin account first.')
      if(!window.XLSX) await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';s.onload=resolve;s.onerror=()=>reject(new Error('Excel reader unavailable'));document.head.appendChild(s)})
      const workbook=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellText:true,cellDates:false})
      const sheet=workbook.Sheets[workbook.SheetNames[0]];if(!sheet)throw new Error('No readable worksheet found.')
      const source=window.XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false});if(!source.length)throw new Error('No contact rows found.')
      const required=['category','contactname','contactnumber','designation','fulladdress','location','region']
      const headers=Object.keys(source[0]).map(h=>String(h).trim().toLowerCase())
      const missing=required.filter(h=>!headers.includes(h));if(missing.length)throw new Error('Missing columns: '+missing.join(', '))
      const normalized=source.map((row,index)=>{
        const get=k=>{const key=Object.keys(row).find(h=>String(h).trim().toLowerCase()===k);return key?String(row[key]??'').trim():''}
        return {rowNumber:index+2,record:{category:get('category'),name:get('contactname'),contact:get('contactnumber').replace(/\s+/g,''),designation:get('designation'),address:get('fulladdress'),location:get('location'),region:get('region'),isDeleted:false}}
      })
      const invalid=normalized.filter(x=>!x.record.category||!x.record.name||!x.record.contact)
      const existing=new Set(rows.filter(r=>!deleted(r)).map(r=>String(r.contact||'').replace(/\D/g,'')+'|'+String(r.location||'').trim().toLowerCase()))
      const seen=new Set(),unique=[],duplicates=[]
      normalized.filter(x=>x.record.category&&x.record.name&&x.record.contact).forEach(x=>{
        const key=x.record.contact.replace(/\D/g,'')+'|'+x.record.location.trim().toLowerCase()
        if(existing.has(key)||seen.has(key))duplicates.push(x);else{seen.add(key);unique.push(x)}
      })
      const Swal=await getSwal()
      const preview='<div style="text-align:left"><p>'+source.length+' rows read from <b>'+escapeText(file.name)+'</b></p><p>Ready: <b>'+unique.length+'</b> · Duplicates skipped: <b>'+duplicates.length+'</b> · Invalid: <b>'+invalid.length+'</b></p><div style="max-height:220px;overflow:auto"><table style="width:100%;font-size:12px"><tbody>'+unique.slice(0,8).map(x=>'<tr><td>'+x.rowNumber+'</td><td>'+escapeText(x.record.name)+'</td><td>'+escapeText(x.record.contact)+'</td><td>'+escapeText(x.record.location)+'</td></tr>').join('')+'</tbody></table></div></div>'
      if(!unique.length){await Swal.fire({icon:'info',title:'Nothing to import',html:preview});return}
      const confirm=await Swal.fire({icon:'question',title:'Review Excel import',html:preview,showCancelButton:true,confirmButtonText:'Import '+unique.length+' contacts',cancelButtonText:'Cancel',width:680})
      if(!confirm.isConfirmed)return
      if(!authorized())throw new Error('Admin session expired. Please sign in again.')
      for(let i=0;i<unique.length;i+=200){
        const batch={};unique.slice(i,i+200).forEach(x=>{batch[db.push().key]=x.record})
        await db.update(batch)
      }
      await Swal.fire({icon:'success',title:'Import complete',text:unique.length+' contacts added. Duplicates skipped: '+duplicates.length+'. Invalid rows: '+invalid.length+'.'})
    }catch(e){await driveAlert('Import failed',e.message,'error').catch(()=>notify(e.message))}
    finally{event.target.value=''}
  }
  async function copyNumber(number){
    try{
      if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(String(number))
      else{
        const field=document.createElement('textarea')
        field.value=String(number);field.style.position='fixed';field.style.opacity='0'
        document.body.appendChild(field);field.select()
        const copied=document.execCommand('copy');field.remove()
        if(!copied)throw new Error('Copy was blocked')
      }
      notify('Phone number copied')
    }catch{notify('Could not copy number. Please select and copy it manually.')}
  }
  async function copyAddress(address){
    try{
      if(navigator.clipboard?.writeText) await navigator.clipboard.writeText(String(address))
      else{
        const field=document.createElement('textarea')
        field.value=String(address);field.style.position='fixed';field.style.opacity='0'
        document.body.appendChild(field);field.select()
        const copied=document.execCommand('copy');field.remove()
        if(!copied)throw new Error('Copy was blocked')
      }
      notify('Address copied')
    }catch{notify('Clipboard unavailable on this browser')}
  }
  return <div className="directory-page">
    <div className="directory-heading">
      <div className="directory-kicker"><MapPinned size={15}/> APML UNIFIED ENTERPRISE DIRECTORY</div>
      <h1>APML Hub &amp; Branch <span>Directory</span></h1>
      <p>Find branch locations and contact details in one place. Search by city, branch, officer name or phone number.</p>
      <div className="directory-live"><i/> Firebase real-time sync <b>{activeCount.toLocaleString('en-IN')} active records</b></div>
      <button className={admin?'directory-admin directory-admin-active':'directory-admin directory-google-admin'} onClick={toggleAdmin} disabled={busy} title={admin?'Exit admin view':'Sign in with Google'} aria-label={admin?'Exit admin view':'Sign in with Google'}>{busy?<span className="admin-button-spinner"/>:admin?<LogOut size={17}/>:<GoogleMark/>}</button>
    </div>
    <section className="directory-panel">
      <div className="directory-toolbar">
        <div className="directory-panel-title"><Users size={19}/> Search all hubs &amp; branches</div>
        <div className="directory-actions">
          {admin&&<button className="directory-btn import" onClick={()=>document.getElementById('directory-excel').click()}><Upload size={16}/> Upload Excel</button>}
          <input id="directory-excel" hidden type="file" accept=".xlsx,.xls,.csv" onChange={importExcel}/>
          <button className="directory-btn create" onClick={()=>setEdit({...EMPTY})}><Plus size={16}/> Create contact</button>
        </div>
      </div>
      <div className="directory-search"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Type city, branch code, officer name, or phone number..." aria-label="Search directory"/></div>
      <div className="directory-chips">{CITIES.map(city=><button key={city} className={query.toLowerCase()===city.toLowerCase()?'selected':''} onClick={()=>setQuery(city)}>{city}</button>)}{query&&<button className="clear" onClick={()=>setQuery('')}>Clear search</button>}</div>
      {loading?<div className="directory-loading apml-directory-skeleton" role="status" aria-live="polite" aria-busy="true"><div className="apml-directory-loading-copy"><b>Loading branch directory</b><small>Connecting to live APML records…</small></div><div className="apml-directory-skeleton-head"><i/><i/><i/><i/><i/></div>{Array.from({length:5},(_,index)=><div className="apml-directory-skeleton-row" key={index}><i/><i/><i/><i/><i/></div>)}</div>:error?<div className="directory-error">{error}</div>:visible.length===0?<div className="directory-empty"><Users size={32}/><b>No matching contacts</b><span>Try another search term or check the selected contact view.</span></div>:<div className="directory-results">
        <div className="directory-table-head"><span>Name / Category</span><span>Location / Region</span><span>Contact number</span><span>Address &amp; maps</span><span>Actions</span></div>
        {visible.map(item=>{
          const isDeleted=deleted(item),name=item.name||'Unnamed',initials=name.split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase()||'AP'
          return <article className={'directory-record '+(isDeleted?'is-deleted':'')} key={item.id}>
            <div className="directory-person"><div className="directory-avatar">{initials}</div><div><b>{name}{isDeleted?' · DELETED':''}</b><small>{item.designation||item.category||'Record'}</small></div></div>
            <div className="directory-location"><b>{item.location||'N/A'}</b><small>{item.region||''}</small></div>
            {item.contact?<button type="button" className="directory-phone directory-copy-phone" onClick={()=>copyNumber(item.contact)} title="Copy phone number" aria-label={'Copy phone number '+item.contact}><Phone size={14}/>{item.contact}</button>:<span className="directory-phone"><Phone size={14}/>No number</span>}
            <div className="directory-address"><span>{item.address||'No address specified'}</span><div><a href={'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(item.address||item.location||'')} target="_blank" rel="noreferrer"><MapPin size={13}/> Maps <ExternalLink size={11}/></a><button onClick={()=>copyAddress(item.address||'')}><Copy size={13}/> Copy</button></div></div>
            <div className="directory-row-actions">{isDeleted?(admin?<><button title="Restore contact" onClick={()=>updateFlag(item.id,{isDeleted:false})}><RotateCcw size={16}/></button><button className="danger" title="Delete permanently" onClick={()=>permanentlyDelete(item.id)}><Trash2 size={16}/></button></>:null):<><button title="Edit contact" onClick={()=>setEdit({...item})}><Pencil size={16}/></button>{admin&&<button className="danger" title="Delete contact" onClick={()=>updateFlag(item.id,{isDeleted:true})}><Trash2 size={16}/></button>}</>}</div>
          </article>
        })}
      </div>}
      <div className="directory-footer-count">Showing {visible.length.toLocaleString('en-IN')} of {rows.length.toLocaleString('en-IN')} directory records{admin?' · Admin view includes deleted contacts':''}</div>
    </section>
    {edit&&<div className="directory-modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setEdit(null)}}><form className="directory-modal" onSubmit={e=>{e.preventDefault();saveRecord(edit)}}><div className="directory-modal-head"><div><b>{edit.id?'Edit contact':'Create new contact'}</b><small>Directory record details</small></div><button type="button" onClick={()=>setEdit(null)} aria-label="Close"><X size={19}/></button></div><div className="directory-form-grid">{[['category','Category'],['location','Location / Branch'],['region','Region'],['designation','Designation / Role'],['name','Contact person name'],['contact','Contact number']].map(([key,label])=><label key={key}>{label}<input required={key==='location'||key==='name'} value={edit[key]||''} onChange={e=>setEdit(v=>({...v,[key]:e.target.value}))}/></label>)}<label className="wide">Full address<textarea rows="3" value={edit.address||''} onChange={e=>setEdit(v=>({...v,address:e.target.value}))}/></label></div><div className="directory-modal-actions"><button type="button" className="directory-btn" onClick={()=>setEdit(null)}>Cancel</button><button type="submit" className="directory-btn create" disabled={busy}>{busy?'Saving…':'Save contact'}</button></div></form></div>}
    {toast&&<div className="directory-toast">{toast}</div>}
    {busy&&<div className="directory-busy"><LoaderCircle size={20}/> Working…</div>}
  </div>
}
