import {useEffect,useMemo,useRef,useState} from 'react'
import { Folder, FileText, FileSpreadsheet, FileImage, FileVideo, FileArchive, File, Download, ExternalLink, Pencil, Trash2, RotateCcw, ChevronLeft, ChevronRight, Upload, Plus, HardDrive, ShieldCheck, FolderPlus, Link2, Search, X } from 'lucide-react'
import './Drive.css'
import { driveAlert, driveConfirm, driveInput, driveToast } from '../lib/sweetalert'
import { incrementApmlMediaDownload } from '../lib/firebase'
import { logApmlAction } from '../lib/apmlActivity'
import { EmptyState } from '../components/ui/StateViews'
import WheelPagination from '../components/ui/WheelPagination'
const cfg={apiKey:'AIzaSyDgJ6uVJcdSw5A6xyO3Tykjcp1hFFG_dWM',authDomain:'portalapml.firebaseapp.com',databaseURL:'https://portalapml-default-rtdb.asia-southeast1.firebasedatabase.app',projectId:'portalapml',storageBucket:'portalapml.firebasestorage.app',messagingSenderId:'461187970356',appId:'1:461187970356:web:e9dfc58a502fd3e04d2161',measurementId:'G-GXLWXXBT7P'}
const ADMIN_EMAILS=new Set(['kundar.work@gmail.com','kundar701@gmail.com'])
function getPortalDriveDb(){return window.firebase.database(window.firebase.app('portalapml-drive'))}
async function loadPortalDriveFirebase(){
 await script('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js')
 await script('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js')
 if(!window.firebase.apps.some(app=>app.name==='portalapml-drive'))window.firebase.initializeApp(cfg,'portalapml-drive')
 await script('https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js')
 return window.firebase
}
function usePortalDriveAdminAuth(){
 const [user,setUser]=useState(null)
 useEffect(()=>{
  let active=true,unsubscribe=null
  loadPortalDriveFirebase().then(firebase=>{
   if(!active)return
   const auth=firebase.auth(firebase.app('portalapml-drive'))
   auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).then(()=>{
    if(!active)return
    unsubscribe=auth.onAuthStateChanged(async next=>{
     if(!active)return
     const email=String(next?.email||'').toLowerCase().trim()
     if(next&&!ADMIN_EMAILS.has(email)){await auth.signOut();if(active)setUser(null);return}
     setUser(next||null)
    })
   })
  }).catch(error=>console.error('Drive admin authentication unavailable:',error))
  return()=>{active=false;if(unsubscribe)unsubscribe()}
 },[])
 const email=String(user?.email||'').toLowerCase().trim()
 const signIn=async()=>{
  const firebase=await loadPortalDriveFirebase()
  const auth=firebase.auth(firebase.app('portalapml-drive'))
  const provider=new firebase.auth.GoogleAuthProvider()
  provider.setCustomParameters({prompt:'select_account'})
  await auth.signInWithPopup(provider)
 }
 const signOut=async()=>{const firebase=await loadPortalDriveFirebase();await firebase.auth(firebase.app('portalapml-drive')).signOut()}
 return {admin:Boolean(user&&ADMIN_EMAILS.has(email)),signIn,signOut}
}
const cloud='wbrmw2pm',preset='apml_drive',base='https://apml-drive-api.kundar-work.workers.dev';
const isProtectedFolderName=name=>['prasad','quotation'].includes(String(name||'').trim().toLowerCase());
const isImage=x=>/\.(png|jpe?g|gif|webp|avif|svg)$/i.test((x.name||'')+' '+(x.fileId||''));const isVideo=x=>/\.(mp4|mov|webm|m4v)$/i.test((x.name||'')+' '+(x.fileId||''))
function script(src){return new Promise((ok,no)=>{let s=[...document.scripts].find(x=>x.src===src);const ready=()=>src.includes('firebase-auth')?!!window.firebase?.auth:src.includes('firebase-database')?!!window.firebase?.database:src.includes('firebase-app')?!!window.firebase?.apps:!!s?.dataset.loaded;if(ready()){ok();return}if(s){s.addEventListener('load',ok,{once:true});s.addEventListener('error',no,{once:true});return}s=document.createElement('script');s.src=src;s.onload=()=>{s.dataset.loaded='1';ok()};s.onerror=no;document.head.append(s)})}
export default function DrivePortal(){const [folders,setFolders]=useState([]),[files,setFiles]=useState([]),[parent,setParent]=useState('root'),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[status,setStatus]=useState('Connecting to cloud drive…'),[page,setPage]=useState(1),[searchOpen,setSearchOpen]=useState(false),[search,setSearch]=useState('');const input=useRef();const {admin,signIn,signOut}=usePortalDriveAdminAuth()
 const isQuotationFolder=(folder)=>{if(!folder)return false;let current=folder,seen=new Set();while(current&&current.key&&!seen.has(current.key)){if(isProtectedFolderName(current.name))return true;seen.add(current.key);current=folders.find(f=>f.key===(current.parentId||'root'))}return false};
 const isQuotationFile=(file)=>{if(!file)return false;let id=file.parentId||file.prevParentId||'root';if(id==='deleted')id=file.prevParentId||'root';let seen=new Set();while(id&&id!=='root'&&id!=='deleted'&&!seen.has(id)){seen.add(id);const folder=folders.find(f=>f.key===id);if(!folder)return false;if(isProtectedFolderName(folder.name))return true;id=folder.parentId||'root'}return false};
 useEffect(()=>{let fref,iref,fh,ih,live=true;(async()=>{try{await script('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');await script('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js');if(!window.firebase.apps.some(app=>app.name==='portalapml-drive'))window.firebase.initializeApp(cfg,'portalapml-drive');const db=getPortalDriveDb();fref=db.ref('catbox_gdrive_folders');iref=db.ref('catbox_gdrive_files');
 let received=0;const markReady=()=>{received+=1;if(received>=2&&live)setLoading(false)};fh=fref.on('value',s=>{if(!live)return;const d=s.val()||{};const rows=Object.entries(d).map(([key,v])=>({key,...v}));setFolders(rows);try{localStorage.setItem('apml_branch_drive_folders_v1',JSON.stringify(rows))}catch{}setStatus('Live sync connected');markReady()},e=>{if(live){setStatus('Folder sync error: '+e.message);setLoading(false)}});ih=iref.on('value',s=>{if(!live)return;const d=s.val()||{};const rows=Object.entries(d).map(([key,v])=>({key,...v}));setFiles(rows);try{localStorage.setItem('apml_branch_drive_files_v1',JSON.stringify(rows))}catch{}markReady()},e=>{if(live){setStatus('File sync error: '+e.message);setLoading(false)}})}catch(e){setStatus('Cloud drive unavailable: '+e.message);setLoading(false)}})();try{const cachedFolders=JSON.parse(localStorage.getItem('apml_branch_drive_folders_v1')||'[]');const cachedFiles=JSON.parse(localStorage.getItem('apml_branch_drive_files_v1')||'[]');setFolders(cachedFolders);setFiles(cachedFiles);if(cachedFolders.length||cachedFiles.length)setLoading(false)}catch{}return()=>{live=false;if(fref&&fh)fref.off('value',fh);if(iref&&ih)iref.off('value',ih)}},[])
 useEffect(()=>{setPage(1)},[parent]);
 useEffect(()=>{if(!admin&&parent==='deleted')setParent('root')},[admin,parent]);
 const hereFolders=useMemo(()=>folders.filter(x=>(x.parentId||'root')===parent&&x.parentId!=='deleted'),[folders,parent])
 const hereFiles=useMemo(()=>files.filter(x=>(x.parentId||'root')===parent&&x.parentId!=='deleted').sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)),[files,parent])
 const normalizedSearch=search.trim().toLowerCase();
 const searchFolders=useMemo(()=>normalizedSearch?folders.filter(x=>x.parentId!=='deleted'&&String(x.name||'').toLowerCase().includes(normalizedSearch)):hereFolders,[folders,normalizedSearch,hereFolders]);
 const searchFiles=useMemo(()=>normalizedSearch?files.filter(x=>x.parentId!=='deleted'&&String(x.name||'').toLowerCase().includes(normalizedSearch)).sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)):hereFiles,[files,normalizedSearch,hereFiles]);
 const trash=admin&&parent==='deleted';const pageSize=12;const pageFiles=trash?files.filter(x=>x.parentId==='deleted').sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)):searchFiles;const pageCount=Math.max(1,Math.ceil(pageFiles.length/pageSize));const pagedFiles=pageFiles.slice((Math.min(page,pageCount)-1)*pageSize,Math.min(page,pageCount)*pageSize);const total=folders.filter(x=>x.parentId!=='deleted').length+files.filter(x=>x.parentId!=='deleted').length
 async function adminToggle(){setBusy(true);try{if(admin){await signOut();if(parent==='deleted')setParent('root')}else{await signIn()}}catch(e){try{await driveAlert('Admin sign-in failed',e.message,'error')}catch{setStatus(e.message)}}finally{setBusy(false)}}
 async function downloadFile(item){
  if(!item?.fileId){await driveAlert('File unavailable','The file URL is missing.','error');return}
  const name=item.name||'apml-file';
  try{
   if(window.ApmNativeDownload?.start){
    await Promise.resolve(window.ApmNativeDownload.start(item.fileId,name));
    void incrementApmlMediaDownload().catch(e=>console.warn('Drive download counter unavailable',e))
    void logApmlAction({action:'File downloaded',module:'Drive',item:name,fileName:name,folder:folders.find(folder=>folder.key===(item.parentId||'root'))?.name||'APML Drive',fileSize:item.size,fileType:item.mimeType||item.resourceType||''});
    window.APMNotify?.send?.({type:'drive',title:'Drive file downloaded',file:name,folder:folders.find(folder=>folder.key===(item.parentId||'root'))?.name||'APML Drive'});
    await driveToast('Download started');
    return;
   }
   const response=await fetch(item.fileId);
   if(!response.ok)throw Error('Download request failed (HTTP '+response.status+')');
   const blob=await response.blob();
   if(!blob.size)throw Error('The downloaded file is empty.');
   const url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download=name;a.style.display='none';document.body.append(a);a.click();a.remove();
   void incrementApmlMediaDownload().catch(e=>console.warn('Drive download counter unavailable',e))
   setTimeout(()=>URL.revokeObjectURL(url),10000);
   void logApmlAction({action:'File downloaded',module:'Drive',item:name});
   window.APMNotify?.send?.({type:'drive',title:'Drive file downloaded',file:name,folder:folders.find(folder=>folder.key===(item.parentId||'root'))?.name||'APML Drive'});
   await driveToast('Download started');
  }catch(e){
   console.warn('Drive download fallback',e);
   await driveAlert('Download could not start','Your browser blocked the download. Use the Open file icon to view or save it.','warning');
  }
 }
 async function createFolder(){try{const name=await driveInput('Create new folder',{placeholder:'Folder name',confirmText:'Create folder'});if(!name)return;await getPortalDriveDb().ref('catbox_gdrive_folders').push({name,parentId:parent,timestamp:Date.now()});void logApmlAction({action:'Folder created',module:'Drive',item:name});await driveToast('Folder created')}catch(e){await driveAlert('Could not create folder',e.message,'error')}}
 async function upload(selected){if(!selected?.length)return;setBusy(true);let ok=0,failed=[];for(const file of selected){try{const video=(file.type||'').startsWith('video/');if(file.size>(video?100:10)*1024*1024)throw Error('File exceeds the '+(video?'100':'10')+' MB limit');const form=new FormData();form.append('file',file);form.append('upload_preset',preset);form.append('folder','apml-drive');const res=await fetch('https://api.cloudinary.com/v1_1/'+cloud+'/auto/upload',{method:'POST',body:form});const data=await res.json();if(!res.ok||!data.secure_url)throw Error(data.error?.message||'Cloudinary upload failed');await getPortalDriveDb().ref('catbox_gdrive_files').push({fileId:data.secure_url,parentId:parent,name:file.name,size:file.size||0,timestamp:Date.now()});void logApmlAction({action:'File uploaded',module:'Drive',item:file.name,fileName:file.name,folder:folders.find(folder=>folder.key===parent)?.name||'My Drive',fileSize:file.size,fileType:file.type});ok++}catch(e){failed.push(file.name+': '+e.message)}}if(input.current)input.current.value='';setBusy(false);if(ok)await driveToast(ok+' file(s) uploaded');if(failed.length)await driveAlert('Some files could not be uploaded',failed.join('\\n'),'warning')}
 async function move(item,type){const confirmed=await driveConfirm('Move to Trash?',`“${item.name||'This item'}” will be moved to Trash Archive.`,'Move to trash');if(!confirmed)return;const ref=getPortalDriveDb().ref(type==='folder'?'catbox_gdrive_folders':'catbox_gdrive_files').child(item.key);try{await ref.update({parentId:'deleted',prevParentId:item.parentId||'root',trashedAt:Date.now()});void logApmlAction({action:'Moved to trash',module:'Drive',item:item.name||'File'});await driveToast('Moved to Trash')}catch(e){await driveAlert('Move failed',e.message,'error')}}
 async function rename(item,type){try{const name=await driveInput('Rename '+(type==='folder'?'folder':'file'),{value:item.name||'',placeholder:'Enter a new name',confirmText:'Save changes'});if(!name||name===(item.name||''))return;await getPortalDriveDb().ref((type==='folder'?'catbox_gdrive_folders':'catbox_gdrive_files')+'/'+item.key).update({name});void logApmlAction({action:'Renamed',module:'Drive',item:name,details:'Previous name: '+(item.name||'')});await driveToast('Name updated')}catch(e){await driveAlert('Rename failed',e.message,'error')}}
 async function restore(item,type){const p=item.prevParentId||'root';try{await getPortalDriveDb().ref((type==='folder'?'catbox_gdrive_folders':'catbox_gdrive_files')+'/'+item.key).update({parentId:p,prevParentId:null,trashedAt:null});void logApmlAction({action:'Restored from trash',module:'Drive',item:item.name||'File'});await driveToast('Item restored')}catch(e){await driveAlert('Restore failed',e.message,'error')}}
 async function addLink(){try{const raw=await driveInput('Add Catbox / direct link',{placeholder:'https://…',confirmText:'Add link',maxLength:2000});if(!raw)return;let url;try{url=new URL(raw);if(!['http:','https:'].includes(url.protocol))throw Error('Use a valid http or https link.')}catch(e){await driveAlert('Invalid link',e.message||'Please enter a valid full URL.','error');return}const name=decodeURIComponent(url.pathname.split('/').filter(Boolean).pop()||'file');await getPortalDriveDb().ref('catbox_gdrive_files').push({fileId:url.href,parentId:parent,name,size:0,timestamp:Date.now(),source:'link'});await driveToast('Link added to Drive')}catch(e){await driveAlert('Could not save link',e.message,'error')}}async function dropFile(e,folderKey){e.preventDefault();const key=e.dataTransfer.getData('text/plain');if(!key)return;try{await getPortalDriveDb().ref('catbox_gdrive_files/'+key).update({parentId:folderKey,trashedAt:null,prevParentId:null});await driveToast('File moved')}catch(e){await driveAlert('Could not move file',e.message,'error')}}async function permanent(item,type){
   if(!admin){await driveAlert('Administrator access required','Only an administrator can permanently delete Drive items.','warning');return}
   const confirmed=await driveConfirm('Delete permanently?',`“${item.name||'This item'}” and its contents will be permanently deleted. This cannot be undone.`,'Delete permanently');
   if(!confirmed)return;
   try{
    const user=window.firebase?.auth?.(window.firebase.app('portalapml-drive'))?.currentUser;
    if(!user)throw new Error('Admin session expired. Please sign in again.');
    const token=await user.getIdToken();
    const folderKeys=new Set();
    const filesToDelete=[];
    if(type==='folder'){
     const pending=[item.key];
     while(pending.length){
      const key=pending.pop();
      if(folderKeys.has(key))continue;
      folderKeys.add(key);
      folders.filter(folder=>(folder.parentId||'root')===key).forEach(folder=>pending.push(folder.key));
     }
     filesToDelete.push(...files.filter(file=>folderKeys.has(file.parentId||'root')));
    }else filesToDelete.push(item);
    const urls=filesToDelete.map(file=>file.fileId).filter(Boolean);
    for(let offset=0;offset<urls.length;offset+=50){
     const response=await fetch(base+'/delete',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+token},body:JSON.stringify({urls:urls.slice(offset,offset+50)})});
     const result=await response.json().catch(()=>({}));
     if(!response.ok||result.ok!==true)throw new Error(result.error||'Cloudinary could not delete every asset. Drive records were retained.');
    }
    const updates={};
    if(type==='folder'){
     folderKeys.forEach(key=>{updates['catbox_gdrive_folders/'+key]=null});
     filesToDelete.forEach(file=>{updates['catbox_gdrive_files/'+file.key]=null});
    }else updates['catbox_gdrive_files/'+item.key]=null;
    await getPortalDriveDb().ref().update(updates);
    void logApmlAction({action:'Permanently deleted',module:'Drive',item:item.name||'File',details:type==='folder'?'Folder and contents':'File'});
    await driveToast(type==='folder'?'Folder and all contents permanently deleted':'File permanently deleted from Drive and cloud storage');
   }catch(e){await driveAlert('Delete failed',e.message,'error')}
  }
 const crumbs=[];let p=parent;while(p&&p!=='root'&&p!=='deleted'){const f=folders.find(x=>x.key===p);if(!f)break;crumbs.unshift(f);p=f.parentId||'root'}
 const trashFolders=folders.filter(x=>x.parentId==='deleted');
 const trashFiles=files.filter(x=>x.parentId==='deleted').sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
 const visibleFolders=trash?trashFolders:searchFolders;
 const displayFolders=(!trash&&parent==='root')?(admin?[...visibleFolders,{key:'deleted',name:'Trash Archive',isVirtualTrash:true}]:visibleFolders):visibleFolders;
 const activeFileCount=files.filter(x=>x.parentId!=='deleted').length;
 const activeFolderCount=folders.filter(x=>x.parentId!=='deleted').length;
 const folderBytes=files.filter(x=>x.parentId!=='deleted').reduce((n,x)=>n+(Number(x.size)||0),0);
 const fileIcon=(item)=>{
  const name=item.name||'',url=item.fileId||'';
  if(isImage(item))return <FileImage size={31}/>;
  if(isVideo(item))return <FileVideo size={31}/>;
  if(/\.(xls|xlsx|csv)$/i.test(name+' '+url))return <FileSpreadsheet size={31}/>;
  if(/\.pdf/i.test(name+' '+url))return <FileText size={31}/>;
  if(/\.(zip|rar|7z|tar)/i.test(name+' '+url))return <FileArchive size={31}/>;
  return <File size={31}/>;
 };
 const folderPath=[{key:'root',name:'My Drive'},...crumbs];
 return <main className="drive-page">
  <header className="drive-head">
   <div className="drive-heading-copy">
    <div className="drive-eyebrow"><HardDrive size={14}/> CLOUD STORAGE</div>
    <h1 className="drive-title">APML <span>Drive</span></h1>
    <p className="drive-subtitle">A central place for shared files, documents and media.</p>
    <div className="drive-stats">
     <span className="drive-stat"><Folder size={14}/> <strong>{activeFolderCount}</strong> Folders</span>
     <span className="drive-stat"><File size={14}/> <strong>{activeFileCount}</strong> Files</span>
     <span className="drive-stat"><HardDrive size={14}/> <strong>{(folderBytes/1048576).toFixed(1)} MB</strong> Stored</span>
    </div>
   </div>
   <button className={admin?'drive-admin drive-admin-active':'drive-admin drive-google-admin'} onClick={adminToggle} disabled={busy} title={admin?'Exit admin':'Sign in with Google'} aria-label={admin?'Exit admin':'Sign in with Google'}>{busy?<span className="admin-button-spinner"/>:admin?<><ShieldCheck size={16}/> Exit admin</>:<svg className="apml-google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.8 6.1-15z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8v5.3A20 20 0 0 0 24 44z"/><path fill="#FBBC05" d="M12.6 27.6a12 12 0 0 1 0-7.2v-5.3H5.8a20 20 0 0 0 0 17.8z"/><path fill="#EA4335" d="M24 12c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.9 29.5 4 24 4A20 20 0 0 0 5.8 15.1l6.8 5.3C14.2 15.6 18.7 12 24 12z"/></svg>}</button>
  </header>
  <section className="drive-action-bar">
   <nav className="drive-breadcrumb" aria-label="Drive location">
    {folderPath.map((x,i)=><span className="drive-crumb-part" key={x.key}>{i>0&&<span className="drive-crumb-separator">/</span>}<button className={i===folderPath.length-1&&!trash?'current':''} onClick={()=>{setParent(x.key);setPage(1)}}>{i===0&&<Folder size={15}/>} {x.name}</button></span>)}
    {trash&&<span className="drive-crumb-part"><span className="drive-crumb-separator">/</span><b>Trash Archive</b></span>}
   </nav>
   <div className="drive-action-buttons">
    <label className="drive-search"><Search size={16}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Search files and folders…" aria-label="Search files and folders"/>{search&&<button type="button" aria-label="Clear search" onClick={()=>{setSearch('');setPage(1)}}><X size={15}/></button>}</label>
    <button className="drive-action" onClick={()=>{setParent('root');setSearch('');setPage(1)}}><HardDrive size={15}/> My Drive</button>
    <button className="drive-action" onClick={createFolder}><FolderPlus size={15}/> New Folder</button>
    <button className="drive-action" onClick={addLink}><Link2 size={15}/> Catbox Link</button>
    <button className="drive-action drive-action-primary" onClick={()=>input.current?.click()} disabled={busy}><Upload size={15}/> Upload File</button>
    <input ref={input} hidden type="file" multiple onChange={e=>upload(e.target.files)}/>
   </div>
  </section>
  <div className="drive-live-status"><span className="drive-live-dot"/>{status}<span className="drive-status-count">{trash?trashFolders.length+trashFiles.length:total} items</span></div>
  {displayFolders.length>0&&<section className="drive-folders-section">
   <div className="drive-section-heading"><h2><Folder size={17}/> {trash?'Archived Folders':'Folders'}</h2><span>{displayFolders.length} {displayFolders.length===1?'folder':'folders'}</span></div>
   <div className="drive-folders-grid">{displayFolders.map(x=><article className={'drive-folder-card'+(x.isVirtualTrash?' drive-trash-folder':'')} key={x.key} onDragOver={e=>e.preventDefault()} onDrop={e=>!x.isVirtualTrash&&dropFile(e,x.key)}>
    <button className="drive-folder-open" onClick={()=>{setParent(x.key);setPage(1)}}><span className="drive-folder-icon">{x.isVirtualTrash?<Trash2 size={23}/>:<Folder size={23}/>}</span><span className="drive-folder-name">{x.name}</span><span className="drive-folder-caption">{x.isVirtualTrash?'Deleted items': 'Open folder'}</span></button>
    {!x.isVirtualTrash&&<div className="drive-folder-actions">{trash?<><button title="Restore folder" onClick={()=>restore(x,'folder')}><RotateCcw size={14}/></button><button title="Delete permanently" onClick={()=>permanent(x,'folder')}><Trash2 size={14}/></button></>:<><button title="Rename folder" onClick={()=>rename(x,'folder')}><Pencil size={14}/></button>{(admin||!isQuotationFolder(x))&&<button title="Move to trash" onClick={()=>move(x,'folder')}><Trash2 size={14}/></button>}</>}</div>}
   </article>)}</div>
  </section>}
  {loading?<section className="drive-files-section apml-loading-section" aria-label="Loading drive files" aria-busy="true"><div className="drive-section-heading"><h2><File size={17}/> Loading your files</h2><span>Syncing library…</span></div><div className="drive-files-grid apml-drive-skeleton-grid">{Array.from({length:6},(_,i)=><div className="drive-file-card apml-drive-skeleton-card" key={i}><span className="apml-skeleton-preview"/><span className="apml-skeleton-line long"/><span className="apml-skeleton-line short"/></div>)}</div></section>:<section className="drive-files-section">
   <div className="drive-section-heading"><h2><File size={17}/> {trash?'Archived Files':'Files'}</h2><span>{pageFiles.length} {pageFiles.length===1?'file':'files'}</span></div>
   <div className="drive-files-grid">
    {pagedFiles.map(x=><article className="drive-file-card" key={x.key} draggable onDragStart={e=>e.dataTransfer.setData('text/plain',x.key)}>
     <a className={'drive-file-preview '+(isImage(x)?'image-preview':isVideo(x)?'video-preview':/\.pdf/i.test(x.name||'')?'pdf-preview':/\.(xls|xlsx|csv)/i.test(x.name||'')?'sheet-preview':'doc-preview')} href={x.fileId} target="_blank" rel="noreferrer">
      {isImage(x)?<img src={x.fileId} alt={x.name||'Drive image'} loading="lazy"/>:isVideo(x)?<video src={x.fileId} muted playsInline preload="metadata"/>:<span className="drive-file-type-icon">{fileIcon(x)}<small>{(x.name||'FILE').split('.').pop().slice(0,6).toUpperCase()}</small></span>}
     </a>
     <div className="drive-file-body"><strong className="drive-file-name" title={x.name}>{x.name}</strong><span className="drive-file-date">{isQuotationFile(x)&&/\.pdf/i.test((x.name||'')+' '+(x.fileId||''))?new Date(x.timestamp||Date.now()).toLocaleString(undefined,{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit'}):new Date(x.timestamp||Date.now()).toLocaleDateString()}</span><div className="drive-file-meta"><span className="drive-file-type">{(x.name||'FILE').split('.').pop().slice(0,6).toUpperCase()}</span><span>{x.size?((x.size/1048576).toFixed(1)+' MB'):'Size unavailable'}</span></div></div>
     <div className="drive-file-footer"><button className="drive-download apml-download-btn" onClick={()=>downloadFile(x)}><div className="button-content"><div className="text-container"><div className="text">Download</div></div><div className="svg-container"><svg className="download-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.479 10.092c-.212-3.951-3.473-7.092-7.479-7.092-4.005 0-7.267 3.141-7.479 7.092-2.57.463-4.521 2.706-4.521 5.408 0 3.037 2.463 5.5 5.5 5.5h13c3.037 0 5.5-2.463 5.5-5.5 0-2.702-1.951-4.945-4.521-5.408zm-7.479 6.908l-4-4h3v-4h2v4h3l-4 4z"></path></svg></div></div></button><a className="drive-open-link" href={x.fileId} target="_blank" rel="noreferrer" aria-label={'Open '+x.name}><ExternalLink size={15}/></a>
      {<div className="drive-admin-actions">{trash?<><button title="Restore file" onClick={()=>restore(x,'file')}><RotateCcw size={14}/></button><button title="Delete permanently" onClick={()=>permanent(x,'file')}><Trash2 size={14}/></button></>:<><button title="Rename file" onClick={()=>rename(x,'file')}><Pencil size={14}/></button>{(admin||!isQuotationFile(x))&&<button title="Move to trash" onClick={()=>move(x,'file')}><Trash2 size={14}/></button>}</>}</div>}
     </div>
    </article>)}
    {!displayFolders.length&&!pagedFiles.length&&<EmptyState className="drive-empty-state" illustration="/illustrations/apml-empty-folder.svg" title="This folder is empty" description="Create a folder or upload a file to get started."/>}
   </div>
   <WheelPagination totalPages={pageCount} currentPage={Math.min(page,pageCount)} visibleCount={5} summary={`${pageFiles.length} files`} onChange={setPage}/>
  </section>}
  {trash&&<div className="drive-trash-note">Trash Archive · {trashFolders.length+trashFiles.length} items</div>}
 </main>
}

