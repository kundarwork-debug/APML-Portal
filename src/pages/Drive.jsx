import {useEffect,useMemo,useRef,useState} from 'react'
import { Folder, FileText, FileSpreadsheet, FileImage, FileVideo, FileArchive, File, Download, ExternalLink, Pencil, Trash2, RotateCcw, ChevronLeft, ChevronRight, Upload, Plus, HardDrive, ShieldCheck, FolderPlus, Link2 } from 'lucide-react'
import './Drive.css'
import { driveAlert, driveConfirm, driveInput, driveToast } from '../lib/sweetalert'
import { useApmlAdminAuth } from '../lib/firebaseAuth'
import { getApmlDatabase } from '../lib/firebase'
const cloud='wbrmw2pm',preset='apml_drive',base='https://apml-drive-api.kundar-work.workers.dev';const isImage=x=>/\.(png|jpe?g|gif|webp|avif|svg)$/i.test((x.name||'')+' '+(x.fileId||''));const isVideo=x=>/\.(mp4|mov|webm|m4v)$/i.test((x.name||'')+' '+(x.fileId||''))
export default function Drive(){const [folders,setFolders]=useState([]),[files,setFiles]=useState([]),[parent,setParent]=useState('root'),[busy,setBusy]=useState(false),[status,setStatus]=useState('Connecting to cloud drive…'),[page,setPage]=useState(1);const input=useRef();const {admin,signIn,signOut}=useApmlAdminAuth()
 useEffect(()=>{let fref,iref,fh,ih,live=true;(async()=>{try{const db=getApmlDatabase();fref=db.ref('catbox_gdrive_folders');iref=db.ref('catbox_gdrive_files');fh=fref.on('value',s=>{if(!live)return;const d=s.val()||{};const rows=Object.entries(d).map(([key,v])=>({key,...v}));setFolders(rows);try{localStorage.setItem('apml_catbox_link_folders_v1',JSON.stringify(rows))}catch{}setStatus('Live sync connected')},e=>setStatus('Folder sync error: '+e.message));ih=iref.on('value',s=>{if(!live)return;const d=s.val()||{};const rows=Object.entries(d).map(([key,v])=>({key,...v}));setFiles(rows);try{localStorage.setItem('apml_catbox_link_files_v1',JSON.stringify(rows))}catch{}},e=>setStatus('File sync error: '+e.message))}catch(e){setStatus('Cloud drive unavailable: '+e.message)}})();try{setFolders(JSON.parse(localStorage.getItem('apml_catbox_link_folders_v1')||'[]'));setFiles(JSON.parse(localStorage.getItem('apml_catbox_link_files_v1')||'[]'))}catch{}return()=>{live=false;if(fref&&fh)fref.off('value',fh);if(iref&&ih)iref.off('value',ih)}},[])
 useEffect(()=>{setPage(1)},[parent]);
 const hereFolders=useMemo(()=>folders.filter(x=>(x.parentId||'root')===parent&&x.parentId!=='deleted'),[folders,parent])
 const hereFiles=useMemo(()=>files.filter(x=>(x.parentId||'root')===parent&&x.parentId!=='deleted').sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)),[files,parent])
 const trash=parent==='deleted';const pageSize=12;const pageFiles=trash?files.filter(x=>x.parentId==='deleted').sort((a,b)=>(b.timestamp||0)-(a.timestamp||0)):hereFiles;const pageCount=Math.max(1,Math.ceil(pageFiles.length/pageSize));const pagedFiles=pageFiles.slice((Math.min(page,pageCount)-1)*pageSize,Math.min(page,pageCount)*pageSize);const total=folders.filter(x=>x.parentId!=='deleted').length+files.filter(x=>x.parentId!=='deleted').length
 async function adminToggle(){setBusy(true);try{if(admin){await signOut();if(trash)setParent('root')}else{await signIn()}}catch(e){try{await driveAlert('Admin sign-in failed',e.message,'error')}catch{setStatus(e.message)}}finally{setBusy(false)}}
 async function recordMediaDownload(){
  try{
   const response=await fetch(base+'/counter/increment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({counter:'media'})});
   const result=await response.json().catch(()=>({}));
   if(!response.ok||result.ok!==true)throw Error(result.error||'Lifetime media counter could not be updated');
  }catch(error){console.warn('Drive lifetime download counter unavailable',error)}
  if(window.apmlHasAnalyticsConsent?.()){
   try{await window.logDailyActivity?.('media')}catch(error){console.warn('Drive daily analytics unavailable',error)}
  }
 }
 async function downloadFile(item){
  if(!item?.fileId){await driveAlert('File unavailable','The file URL is missing.','error');return}
  const name=item.name||'apml-file';
  try{
   if(window.ApmNativeDownload?.start){
    await window.ApmNativeDownload.start(item.fileId,name);
    await recordMediaDownload();
    await driveToast('Download started');
    return;
   }
   const response=await fetch(item.fileId);if(!response.ok)throw Error('Download request failed');
   const blob=await response.blob(),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
   await recordMediaDownload();
   await driveToast('Download started');
  }catch(e){console.warn('Drive direct download fallback',e);const a=document.createElement('a');a.href=item.fileId;a.download=name;a.target='_blank';a.rel='noopener';document.body.append(a);a.click();a.remove();await driveToast('Download opened in a new tab; it was not counted as a completed download','info')}
 }
 async function createFolder(){if(!admin)return;try{const name=await driveInput('Create new folder',{placeholder:'Folder name',confirmText:'Create folder'});if(!name)return;await getApmlDatabase().ref('catbox_gdrive_folders').push({name,parentId:parent,timestamp:Date.now()});await driveToast('Folder created')}catch(e){await driveAlert('Could not create folder',e.message,'error')}}
 async function upload(selected){if(!admin||!selected?.length)return;setBusy(true);let ok=0,failed=[];for(const file of selected){try{const video=(file.type||'').startsWith('video/');if(file.size>(video?100:10)*1024*1024)throw Error('File exceeds the '+(video?'100':'10')+' MB limit');const form=new FormData();form.append('file',file);form.append('upload_preset',preset);form.append('folder','apml-drive');const res=await fetch('https://api.cloudinary.com/v1_1/'+cloud+'/auto/upload',{method:'POST',body:form});const data=await res.json();if(!res.ok||!data.secure_url)throw Error(data.error?.message||'Cloudinary upload failed');await getApmlDatabase().ref('catbox_gdrive_files').push({fileId:data.secure_url,parentId:parent,name:file.name,size:file.size||0,timestamp:Date.now()});ok++}catch(e){failed.push(file.name+': '+e.message)}}if(input.current)input.current.value='';setBusy(false);if(ok)await driveToast(ok+' file(s) uploaded');if(failed.length)await driveAlert('Some files could not be uploaded',failed.join('\\n'),'warning')}
 async function move(item,type){if(!admin)return;const confirmed=await driveConfirm('Move to Trash?',`“${item.name||'This item'}” will be moved to Trash Archive for 30 days.`,'Move to trash');if(!confirmed)return;const ref=getApmlDatabase().ref(type==='folder'?'catbox_gdrive_folders':'catbox_gdrive_files').child(item.key);try{await ref.update({parentId:'deleted',prevParentId:item.parentId||'root',deletedAt:Date.now()});await driveToast('Moved to Trash')}catch(e){await driveAlert('Move failed',e.message,'error')}}
 async function rename(item,type){if(!admin)return;try{const name=await driveInput('Rename '+(type==='folder'?'folder':'file'),{value:item.name||'',placeholder:'Enter a new name',confirmText:'Save changes'});if(!name||name===(item.name||''))return;await getApmlDatabase().ref((type==='folder'?'catbox_gdrive_folders':'catbox_gdrive_files')+'/'+item.key).update({name});await driveToast('Name updated')}catch(e){await driveAlert('Rename failed',e.message,'error')}}
 async function restore(item,type){if(!admin)return;const p=item.prevParentId||'root';try{await getApmlDatabase().ref((type==='folder'?'catbox_gdrive_folders':'catbox_gdrive_files')+'/'+item.key).update({parentId:p,prevParentId:null,deletedAt:null});await driveToast('Item restored')}catch(e){await driveAlert('Restore failed',e.message,'error')}}
 async function addLink(){if(!admin)return;try{const raw=await driveInput('Add Catbox / direct link',{placeholder:'https://…',confirmText:'Add link',maxLength:2000});if(!raw)return;let url;try{url=new URL(raw);if(!['http:','https:'].includes(url.protocol))throw Error('Use a valid http or https link.')}catch(e){await driveAlert('Invalid link',e.message||'Please enter a valid full URL.','error');return}const name=decodeURIComponent(url.pathname.split('/').filter(Boolean).pop()||'file');await getApmlDatabase().ref('catbox_gdrive_files').push({fileId:url.href,parentId:parent,name,size:0,timestamp:Date.now(),source:'link'});await driveToast('Link added to Drive')}catch(e){await driveAlert('Could not save link',e.message,'error')}}async function dropFile(e,folderKey){e.preventDefault();if(!admin)return;const key=e.dataTransfer.getData('text/plain');if(!key)return;try{await getApmlDatabase().ref('catbox_gdrive_files/'+key).update({parentId:folderKey});await driveToast('File moved')}catch(e){await driveAlert('Could not move file',e.message,'error')}}async function permanent(item,type){if(!admin)return;const confirmed=await driveConfirm('Delete permanently?',`“${item.name||'This item'}” will be permanently deleted. This cannot be undone.`,'Delete permanently');if(!confirmed)return;try{await getApmlDatabase().ref((type==='folder'?'catbox_gdrive_folders':'catbox_gdrive_files')+'/'+item.key).remove();await driveToast('Permanently deleted')}catch(e){await driveAlert('Delete failed',e.message,'error')}}
 const crumbs=[];let p=parent;while(p&&p!=='root'&&p!=='deleted'){const f=folders.find(x=>x.key===p);if(!f)break;crumbs.unshift(f);p=f.parentId||'root'}
 const trashFolders=folders.filter(x=>x.parentId==='deleted');
 const daysLeft=item=>{const deletedAt=Number(item.deletedAt)||Date.now();return Math.max(0,Math.ceil((deletedAt+30*86400000-Date.now())/86400000))};
 const expiryLabel=item=>{const days=daysLeft(item);return days===0?'Expires today':`${days} day${days===1?'':'s'} left`};
 const trashFiles=files.filter(x=>x.parentId==='deleted').sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
 const visibleFolders=trash?trashFolders:hereFolders;
 const displayFolders=(!trash&&parent==='root'&&admin)?[...visibleFolders,{key:'deleted',name:'Trash Archive',isVirtualTrash:true}]:visibleFolders;
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
    <button className="drive-action" onClick={()=>{setParent('root');setPage(1)}}><HardDrive size={15}/> My Drive</button>
    {admin&&<><button className="drive-action" onClick={createFolder}><FolderPlus size={15}/> New Folder</button>
    <button className="drive-action" onClick={addLink}><Link2 size={15}/> Catbox Link</button>
    <button className="drive-action drive-action-primary" onClick={()=>input.current?.click()} disabled={busy}><Upload size={15}/> Upload File</button>
    <input ref={input} hidden type="file" multiple onChange={e=>upload(e.target.files)}/></>}
   </div>
  </section>
  <div className="drive-live-status"><span className="drive-live-dot"/>{status}<span className="drive-status-count">{trash?trashFolders.length+trashFiles.length:total} items</span></div>
  {displayFolders.length>0&&<section className="drive-folders-section">
   <div className="drive-section-heading"><h2><Folder size={17}/> {trash?'Archived Folders':'Folders'}</h2><span>{displayFolders.length} {displayFolders.length===1?'folder':'folders'}</span></div>
   <div className="drive-folders-grid">{displayFolders.map(x=><article className={'drive-folder-card'+(x.isVirtualTrash?' drive-trash-folder':'')} key={x.key} onDragOver={e=>e.preventDefault()} onDrop={e=>!x.isVirtualTrash&&dropFile(e,x.key)}>
    <button className="drive-folder-open" onClick={()=>{setParent(x.key);setPage(1)}}><span className="drive-folder-icon">{x.isVirtualTrash?<Trash2 size={23}/>:<Folder size={23}/>}</span><span className="drive-folder-name">{x.name}</span><span className="drive-folder-caption">{x.isVirtualTrash?'Deleted items':trash?expiryLabel(x):'Open folder'}</span></button>
    {admin&&!x.isVirtualTrash&&<div className="drive-folder-actions">{trash?<><button title="Restore folder" onClick={()=>restore(x,'folder')}><RotateCcw size={14}/></button><button title="Delete permanently" onClick={()=>permanent(x,'folder')}><Trash2 size={14}/></button></>:<><button title="Rename folder" onClick={()=>rename(x,'folder')}><Pencil size={14}/></button><button title="Move to trash" onClick={()=>move(x,'folder')}><Trash2 size={14}/></button></>}</div>}
   </article>)}</div>
  </section>}
  <section className="drive-files-section">
   <div className="drive-section-heading"><h2><File size={17}/> {trash?'Archived Files':'Files'}</h2><span>{pageFiles.length} {pageFiles.length===1?'file':'files'}</span></div>
   <div className="drive-files-grid">
    {pagedFiles.map(x=><article className="drive-file-card" key={x.key} draggable onDragStart={e=>e.dataTransfer.setData('text/plain',x.key)}>
     <a className={'drive-file-preview '+(isImage(x)?'image-preview':isVideo(x)?'video-preview':/\.pdf/i.test(x.name||'')?'pdf-preview':/\.(xls|xlsx|csv)/i.test(x.name||'')?'sheet-preview':'doc-preview')} href={x.fileId} target="_blank" rel="noreferrer">
      {isImage(x)?<img src={x.fileId} alt={x.name||'Drive image'} loading="lazy"/>:isVideo(x)?<video src={x.fileId} muted playsInline preload="metadata"/>:<span className="drive-file-type-icon">{fileIcon(x)}<small>{(x.name||'FILE').split('.').pop().slice(0,6).toUpperCase()}</small></span>}
     </a>
     <div className="drive-file-body"><strong className="drive-file-name" title={x.name}>{x.name}</strong><span className="drive-file-date">{trash?expiryLabel(x):new Date(x.timestamp||Date.now()).toLocaleDateString()}</span><div className="drive-file-meta"><span className="drive-file-type">{(x.name||'FILE').split('.').pop().slice(0,6).toUpperCase()}</span><span>{x.size?((x.size/1048576).toFixed(1)+' MB'):'Size unavailable'}</span></div></div>
     <div className="drive-file-footer"><button className="drive-download apml-download-btn" onClick={()=>downloadFile(x)}><Download size={14}/><span className="apml-download-label">Download</span><span className="apml-download-tray" aria-hidden="true"></span><span className="apml-download-tooltip">Download</span></button><a className="drive-open-link" href={x.fileId} target="_blank" rel="noreferrer" aria-label={'Open '+x.name}><ExternalLink size={15}/></a>
      {admin&&<div className="drive-admin-actions">{trash?<><button title="Restore file" onClick={()=>restore(x,'file')}><RotateCcw size={14}/></button><button title="Delete permanently" onClick={()=>permanent(x,'file')}><Trash2 size={14}/></button></>:<><button title="Rename file" onClick={()=>rename(x,'file')}><Pencil size={14}/></button><button title="Move to trash" onClick={()=>move(x,'file')}><Trash2 size={14}/></button></>}</div>}
     </div>
    </article>)}
    {!displayFolders.length&&!pagedFiles.length&&<div className="drive-empty-state"><Folder size={34}/><strong>This folder is empty</strong><span>{admin?'Create a folder or upload a file to get started.':'Files shared to this folder will appear here.'}</span></div>}
   </div>
   {pageCount>1&&<nav className="drive-pagination" aria-label="Drive file pages"><button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}><ChevronLeft size={17}/> Previous</button><span>Page <b>{Math.min(page,pageCount)}</b> of {pageCount}</span><button disabled={page>=pageCount} onClick={()=>setPage(p=>Math.min(pageCount,p+1))}>Next <ChevronRight size={17}/></button></nav>}
  </section>
  {trash&&<div className="drive-trash-note">Trash Archive · {trashFolders.length+trashFiles.length} items</div>}
 </main>
}
