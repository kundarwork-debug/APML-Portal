import {useEffect,useMemo,useRef,useState} from 'react'
import {X,Download,ExternalLink,ChevronLeft,ChevronRight,ZoomIn,ZoomOut,FileText,AlertCircle,LoaderCircle} from 'lucide-react'

const extension=(item)=>String(item?.name||item?.fileId||'').split('?')[0].split('#')[0].split('.').pop().toLowerCase()
const kindOf=(item)=>{
 const ext=extension(item),mime=String(item?.mimeType||'').toLowerCase()
 if(/^image\//.test(mime)||['png','jpg','jpeg','gif','webp','avif','svg','bmp','ico','tif','tiff'].includes(ext))return 'image'
 if(/^video\//.test(mime)||['mp4','mov','webm','m4v','ogv','avi','mkv'].includes(ext))return 'video'
 if(/^audio\//.test(mime)||['mp3','wav','ogg','oga','m4a','aac','flac'].includes(ext))return 'audio'
 if(ext==='pdf'||mime==='application/pdf')return 'pdf'
 if(['doc','docx','xls','xlsx','ppt','pptx'].includes(ext))return 'office'
 if(['txt','md','json','xml','csv','log','js','jsx','ts','tsx','css','html','htm','yaml','yml','sql','py','java','c','cpp','sh'].includes(ext)||mime.startsWith('text/'))return 'text'
 return 'other'
}
let pdfLoader
function loadPdfJs(){
 if(window.pdfjsLib)return Promise.resolve(window.pdfjsLib)
 if(!pdfLoader)pdfLoader=new Promise((resolve,reject)=>{
  const existing=document.querySelector('script[data-apml-pdfjs]')
  if(existing){existing.addEventListener('load',()=>resolve(window.pdfjsLib),{once:true});existing.addEventListener('error',reject,{once:true});return}
  const script=document.createElement('script');script.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';script.dataset.apmlPdfjs='1'
  script.onload=()=>{if(!window.pdfjsLib){reject(new Error('PDF preview engine could not start'));return}window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';resolve(window.pdfjsLib)}
  script.onerror=()=>reject(new Error('Could not load the PDF preview engine'));document.head.append(script)
 })
 return pdfLoader
}
export default function DriveFilePreview({item,onClose,onDownload}){
 const kind=useMemo(()=>kindOf(item),[item]),canvasRef=useRef(null),[busy,setBusy]=useState(kind==='pdf'||kind==='text'),[error,setError]=useState(''),[page,setPage]=useState(1),[pages,setPages]=useState(1),[zoom,setZoom]=useState(1),[text,setText]=useState('')
 const url=item?.fileId||'',name=item?.name||'File preview'
 useEffect(()=>{const esc=e=>{if(e.key==='Escape')onClose();if(kind==='pdf'&&e.key==='ArrowRight')setPage(p=>Math.min(p+1,pages));if(kind==='pdf'&&e.key==='ArrowLeft')setPage(p=>Math.max(1,p-1))};window.addEventListener('keydown',esc);return()=>window.removeEventListener('keydown',esc)},[onClose,kind,pages])
 useEffect(()=>{if(kind!=='text'||!url)return;let live=true;setBusy(true);setError('');fetch(url).then(r=>{if(!r.ok)throw new Error('File could not be loaded (HTTP '+r.status+')');return r.text()}).then(value=>{if(!live)return;if(value.length>1500000)throw new Error('This text file is too large for in-page preview.');setText(value);setBusy(false)}).catch(e=>{if(live){setError(e.message||'Text preview is unavailable.');setBusy(false)}});return()=>{live=false}},[kind,url])
 useEffect(()=>{if(kind!=='pdf'||!url)return;let live=true,doc;setBusy(true);setError('');(async()=>{try{const pdfjs=await loadPdfJs();const task=pdfjs.getDocument({url,withCredentials:false});doc=await task.promise;if(!live){doc.destroy();return}setPages(doc.numPages);setPage(p=>Math.min(p,doc.numPages));setBusy(false)}catch(e){if(live){setError(e?.message?.includes('CORS')?'The file host blocked preview access. Open or download the original file instead.':e.message||'PDF preview is unavailable.');setBusy(false)}}})();return()=>{live=false;if(doc)doc.destroy()}},[kind,url])
 useEffect(()=>{if(kind!=='pdf'||!url||!pages)return;let live=true;let renderTask;(async()=>{try{const pdfjs=await loadPdfJs();const doc=await pdfjs.getDocument({url,withCredentials:false}).promise;if(!live){doc.destroy();return}const pdfPage=await doc.getPage(page);const viewport=pdfPage.getViewport({scale:zoom});const canvas=canvasRef.current;if(!canvas)return;const context=canvas.getContext('2d');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);renderTask=pdfPage.render({canvasContext:context,viewport});await renderTask.promise;if(live)setBusy(false);doc.destroy()}catch(e){if(live){setBusy(false);setError(e.message||'Could not render this PDF page.')}}})();return()=>{live=false;try{renderTask?.cancel()}catch{}}},[kind,url,page,zoom,pages])
 const download=()=>onDownload?.(item)
 return <div className="drive-preview-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
  <section className="drive-preview-modal" role="dialog" aria-modal="true" aria-label={'Preview '+name}>
   <header className="drive-preview-header"><div className="drive-preview-heading"><span className="drive-preview-filemark"><FileText size={18}/></span><div><strong title={name}>{name}</strong><small>{kind==='office'?'Office document':kind==='other'?'Preview not supported':kind.toUpperCase()+' preview'}</small></div></div><div className="drive-preview-header-actions"><button type="button" onClick={download} title="Download file"><Download size={17}/><span>Download</span></button><a href={url} target="_blank" rel="noreferrer" title="Open original file"><ExternalLink size={17}/></a><button type="button" onClick={onClose} aria-label="Close preview" title="Close"><X size={19}/></button></div></header>
   {kind==='pdf'&&<div className="drive-preview-toolbar"><button disabled={page<=1} onClick={()=>{setPage(p=>p-1);setBusy(true)}} title="Previous page"><ChevronLeft size={17}/></button><span>Page <b>{page}</b> of {pages}</span><button disabled={page>=pages} onClick={()=>{setPage(p=>p+1);setBusy(true)}} title="Next page"><ChevronRight size={17}/></button><i/><button onClick={()=>setZoom(z=>Math.max(.5,+(z-.15).toFixed(2)))} title="Zoom out"><ZoomOut size={16}/></button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>Math.min(2.5,+(z+.15).toFixed(2)))} title="Zoom in"><ZoomIn size={16}/></button></div>}
   <div className={'drive-preview-content drive-preview-'+kind}>
    {busy&&<div className="drive-preview-loading"><LoaderCircle size={25}/><span>Preparing preview…</span></div>}
    {error&&<div className="drive-preview-fallback"><AlertCircle size={28}/><strong>Preview unavailable</strong><span>{error}</span><div><button onClick={download}><Download size={15}/> Download file</button><a href={url} target="_blank" rel="noreferrer">Open original</a></div></div>}
    {!error&&kind==='image'&&<img src={url} alt={name} onLoad={()=>setBusy(false)} onError={()=>{setBusy(false);setError('This image could not be loaded.')}}/>}
    {!error&&kind==='video'&&<video src={url} controls autoPlay playsInline onLoadedData={()=>setBusy(false)} onError={()=>{setBusy(false);setError('This video format or source cannot be played in this browser.')}}/>}
    {!error&&kind==='audio'&&<div className="drive-preview-audio-player"><div className="drive-preview-audio-art"><FileText size={42}/></div><strong>{name}</strong><audio src={url} controls onCanPlay={()=>setBusy(false)} onError={()=>{setBusy(false);setError('This audio format or source cannot be played in this browser.')}}/></div>}
    {!error&&kind==='pdf'&&<canvas ref={canvasRef} aria-label={'PDF page '+page}/>}
    {!error&&kind==='office'&&<iframe title={'Preview '+name} src={'https://docs.google.com/gview?embedded=1&url='+encodeURIComponent(url)} onLoad={()=>setBusy(false)}/>}
    {!error&&kind==='text'&&!busy&&<pre>{text}</pre>}
    {!error&&kind==='other'&&<div className="drive-preview-fallback"><AlertCircle size={28}/><strong>Preview isn't available for this file type yet</strong><span>You can still open the original file or download it safely.</span><div><button onClick={download}><Download size={15}/> Download file</button><a href={url} target="_blank" rel="noreferrer">Open original</a></div></div>}
   </div>
  </section>
 </div>
}
