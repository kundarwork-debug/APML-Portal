import {useEffect,useMemo,useRef,useState} from 'react'
import {Plus,Trash2,Download,RotateCcw,FileText,Calculator} from 'lucide-react'
import './Editor.css'
import { getApmlPresenceServices, incrementApmlPdfGenerated } from '../lib/firebase'
import { apmlDialog } from '../lib/sweetalert'
import { logApmlAction } from '../lib/apmlActivity'
import legacyDriveExport from '../data/legacyDriveExport.json'
const dateNow=()=>{const d=new Date(),n=d.getDate(),s=n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th';return n+s+' '+d.toLocaleDateString('en-IN',{month:'short'})+' '+d.getFullYear()}
const indiaYear=()=>new Intl.DateTimeFormat('en',{timeZone:'Asia/Kolkata',year:'numeric'}).format(new Date())
const sharedDefault=()=>({date:dateNow(),custName:'',custCompany:'Unregistered',custGst:'GST Exempted',fromCity:'',toCity:''})
const mk=(items)=>items.map(([label,amount=0])=>({label,amount}))
const DEFAULTS={
exact:{docNoLabel:'Estimate No.',gstLabel:'GST No. (ours)',docNo:`${indiaYear()}0811001`,gstNo:'23AAACL1838J1ZO',costItems:mk([['Freight'],['Car Freight'],['Packing Charges'],['Loading Charges at Origin'],['Unloading Charges at Destination'],['Unpacking Charges'],['Other Charges (Toll etc.)']]),gstPercent:0,terms:['Please keep your cash / jewelry in your custody.','Carrying liquor, gas cylinder, acid or any type of liquid/explosive and illegal items is prohibited.','Minimum 15 litres of fuel should be available in the car to run up to the car carrier point and the same way from the car carrier point to the destination.','We don\'t undertake electrical, carpentry & plumbing work. It can be provided depending on availability and charged accordingly.','If there is any extra packing of any article, or an article outside the article list, it will be charged accordingly.','Extra services provided other than mentioned will be charged accordingly.','20% of the amount to be paid in advance along with the work order and the balance amount on completion of work at the loading point.','Payment in cash/cheque/draft should be in favor of Exact Container Logistics (P) Ltd.','In case of carrier risk, no individual policy / receipt from the insurance company will be given.','In case of monsoon / rainy season / foggy weather / riots / vehicle breakdown / any other natural calamity, 7 extra days will be added to the transit time.','No responsibility on the breakage of flower pots.','This quotation is valid for 15 days.'],companyName:'Exact Container Logistics',cin:'CIN : U74899DL2000PTC107846',addrLabel:'Registered address',addr:'7737/XV RAM NAGAR QUTUB ROAD, PAHARGANJ NEW DELHI 110063',phone:'9667724226',email:'',showEmail:false},
maxcare:{docNoLabel:'Reference No.',gstLabel:'GSTN (ours)',docNo:`MAX${indiaYear()}2712999`,gstNo:'07AAICM9877E1ZX',costItems:mk([['Transportation Cost'],['Packing + Loading + Unloading + Unpacking'],['Car Transportation (if any)'],['Toll Tax + Risk Cover + Misc. Cost']]),gstPercent:0,terms:['Please note that lorry transportation charges without quotes are the present prevailing rates and will be charged on actuals at the time of transportation. Extra charges will be charged extra as actual.','The carrier or agent shall be exempted from any loss or damage through accident, pilferage, fire, rain, collision or any other road-driven hazard; we therefore recommend that goods be insured covering risk. While on carrier risk, no individual policy/receipt from the insurance co. will be given.','We would request you to please pay 25% of all charges in advance along with your order, and the balance charges on completion of the packing. For insurance, the full amount of the premium value is to be paid at the packing location before departure of the consignment.','Please note that the above quotation has been prepared keeping in view our basic standards of packing with the best packing material, as the type of packing will depend on our discretion.','We would be grateful if you could please give us one week\'s advance notice as to when we may commence the above job. Payment will be done in favor of M/S Max Care Packers & Movers Pvt. Ltd.'],companyName:'Maxcare Packers and Movers Pvt Ltd',cin:'CIN: U63090DL2009PTC196378',addrLabel:'Regd. office',addr:'308, Neelkanth Plaza, Pitampura Community Centre, New Delhi-110034',phone:'9311204263',email:'maxcaremoverspvtltd@gmail.com',showEmail:true}}
const SPLITS={exact:{freight:60,'car freight':0,'packing charges':20,'loading charges at origin':10,'unloading charges at destination':5,'unpacking charges':3,'other charges (toll etc.)':2},maxcare:{'transportation cost':60,'packing + loading + unloading + unpacking':25,'car transportation (if any)':0,'toll tax + risk cover + misc. cost':15}}
const clone=x=>JSON.parse(JSON.stringify(x)),money=n=>(Number(n)||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})
const calc=d=>{const subtotal=d.costItems.reduce((s,x)=>s+(Number(x.amount)||0),0),gst=subtotal*(Number(d.gstPercent)||0)/100;return{subtotal,gst,grand:subtotal+gst}}

async function editorAlert(options){return apmlDialog(options)}
async function editorDatabase(){const {database}=await getApmlPresenceServices();return database}
async function reserveQuotationNumber(company){
 const database=await editorDatabase()
 const year=indiaYear()
 const counterRef=database.ref(`quotation_counters/${company}/${year}`)
 const result=await counterRef.transaction(current=>(Number.isSafeInteger(Number(current))&&Number(current)>=0?Number(current):0)+1)
 if(!result.committed)throw Error('Could not reserve a unique quotation number. Please try again.')
 const sequence=Number(result.snapshot.val())
 if(company==='exact')return `${year}0811${String(sequence).padStart(3,'0')}`
 const suffix=sequence<=1000?String(1000-sequence).padStart(3,'0'):`/${String(sequence-1000).padStart(3,'0')}`
 return `MAX${year}2712${suffix}`
}
const portalDriveConfig={
 apiKey:'AIzaSyDgJ6uVJcdSw5A6xyO3Tykjcp1hFFG_dWM',
 authDomain:'portalapml.firebaseapp.com',
 databaseURL:'https://portalapml-default-rtdb.asia-southeast1.firebasedatabase.app',
 projectId:'portalapml',
 storageBucket:'portalapml.firebasestorage.app',
 messagingSenderId:'461187970356',
 appId:'1:461187970356:web:e9dfc58a502fd3e04d2161',
 measurementId:'G-GXLWXXBT7P'
}
async function loadEditorFirebaseScript(src,ready){
 if(ready())return
 await new Promise((resolve,reject)=>{
  const existing=[...document.scripts].find(script=>script.src===src)
  if(existing){existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
  const script=document.createElement('script');script.src=src;script.onload=resolve;script.onerror=()=>reject(Error('Could not load Firebase database services.'));document.head.append(script)
 })
 if(!ready())throw Error('Firebase database services did not initialise.')
}
async function getBranchDriveDatabase(){
 await loadEditorFirebaseScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',()=>!!window.firebase?.apps)
 await loadEditorFirebaseScript('https://www.gstatic.com/firebasejs/9.23.0/firebase-database-compat.js',()=>!!window.firebase?.database)
 if(!window.firebase.apps.some(app=>app.name==='portalapml-drive'))window.firebase.initializeApp(portalDriveConfig,'portalapml-drive')
 const db=window.firebase.database(window.firebase.app('portalapml-drive'))
 // Merge the supplied legacy export by original Firebase keys. Existing target
 // records win, while missing fields from the export are filled without
 // replacing newer target values. The old Firebase is no longer contacted.
 const mergeNode=async(path,records)=>{
  const entries=Object.entries(records||{})
  await Promise.all(entries.map(([key,value])=>db.ref(path+'/'+key).transaction(current=>{
   if(current===null)return value
   if(current&&typeof current==='object'&&!Array.isArray(current)&&value&&typeof value==='object'&&!Array.isArray(value)){
    const merged={...value,...current}
    return Object.keys(merged).every(field=>merged[field]===current[field])?undefined:merged
   }
   return undefined
  })))
 }
 await Promise.all([
  mergeNode('catbox_gdrive_folders',legacyDriveExport.folders),
  mergeNode('catbox_gdrive_files',legacyDriveExport.files)
 ])
 return db
}
async function saveQuotationToDrive(blob,fileName){
 if(!blob||blob.size>10*1024*1024)throw Error('Quotation PDF exceeds the 10 MB Drive limit.')
 const db=await getBranchDriveDatabase()
 const folderRef=db.ref('catbox_gdrive_folders')
 const folders=await folderRef.once('value'),all=folders.val()||{}
 let folderId=Object.keys(all).find(key=>all[key]?.parentId==='root'&&String(all[key]?.name||'').trim().toLowerCase()==='quotation')
 if(!folderId){
  const reservedRef=folderRef.child('quotation_folder')
  const reserved=await reservedRef.once('value')
  const newFolderRef=reserved.exists()?folderRef.push():reservedRef
  folderId=newFolderRef.key
  await newFolderRef.set({name:'Quotation',parentId:'root',timestamp:Date.now()})
 }
 const form=new FormData()
 form.append('file',blob,fileName)
 form.append('upload_preset','apml_drive')
 form.append('folder','apml-drive')
 const response=await fetch('https://api.cloudinary.com/v1_1/wbrmw2pm/auto/upload',{method:'POST',body:form})
 const data=await response.json().catch(()=>({}))
 if(!response.ok||!data.secure_url)throw Error(data.error?.message||'Cloudinary upload failed')
 await db.ref('catbox_gdrive_files').push({fileId:data.secure_url,parentId:folderId,name:fileName,size:blob.size||0,timestamp:Date.now(),createdBy:'quotation-editor'})
 return true
}

async function queueQuotationPdfForTelegram(blob,fileName,metadata){
 try{
  const form=new FormData();
  form.append('file',blob,fileName);
  form.append('metadata',JSON.stringify(metadata));
  const response=await fetch('https://apml-drive-api.kundar-work.workers.dev/quotation-pdf/queue',{method:'POST',body:form,keepalive:true});
  if(!response.ok)throw Error('Background PDF queue HTTP '+response.status);
  return true;
 }catch(error){console.warn('Telegram quotation PDF queued delivery failed:',error);return false}
}
function Field({label,children}){return <label className="editor-field"><span>{label}</span>{children}</label>}
function Preview({company,d,s}){const t=calc(d);return <div className={'quote-document '+company}><div className="doc-letterhead"><p className="doc-company">{d.companyName}</p>{company==='exact'?<p className="doc-cin">{d.cin}</p>:<p className="doc-sub">{d.cin} · Regd. Office: {d.addr}<br/>Phone: {d.phone}{d.showEmail?' · Email: '+d.email:''}</p>}</div><div className="doc-body"><div className="doc-meta"><span>{company==='exact'?'Date: '+s.date:d.gstLabel+': '+d.gstNo}</span><span>{company==='exact'?d.docNoLabel+': '+d.docNo:'Date: '+s.date}</span></div><div className="doc-customer">{company==='exact'&&<>GST No: {d.gstNo}<br/></>}{company==='exact'?'MR. / MS.: ':'TO: '}<b>{s.custName}</b><br/>Company Name: {s.custCompany}<br/>GST No: {s.custGst}{company==='maxcare'&&<><br/>{d.docNoLabel}: {d.docNo}</>}</div><p className="doc-quotation">QUOTATION</p><p className="doc-intro">{company==='exact'?<>Dear Sir / Mam,<br/><br/>Below are our best prices for moving your <b>{s.fromCity} to {s.toCity}</b>. We hope you will find our price competitive enough &amp; will give us an opportunity to service you.</>:<>We thank you for your inquiry to move your household goods from <b>{s.fromCity} to {s.toCity}</b>. We have pleasure in quoting our charges as follows:</>}</p><table className="doc-table"><thead><tr>{company==='maxcare'&&<th>S.No</th>}<th>{company==='exact'?'Cost Item':'Particulars'}</th><th className="amt">Amount (INR)</th></tr></thead><tbody>{d.costItems.map((x,i)=><tr key={i}>{company==='maxcare'&&<td>{i+1}</td>}<td>{x.label}</td><td className="amt">{money(x.amount)}</td></tr>)}<tr className="total-row">{company==='maxcare'&&<td>{d.costItems.length+1}</td>}<td>Total</td><td className="amt">{money(t.subtotal)}</td></tr><tr>{company==='maxcare'&&<td>{d.costItems.length+2}</td>}<td>GST Charges @ {Number(d.gstPercent)||0}%</td><td className="amt">{money(t.gst)}</td></tr><tr className="grand-row">{company==='maxcare'&&<td/>}<td>Total with GST</td><td className="amt">{money(t.grand)}</td></tr></tbody></table><p className="doc-terms-title">TERMS &amp; CONDITION:</p><ol className="doc-terms">{d.terms.map((x,i)=><li key={i}>{x}</li>)}</ol>{company==='exact'?<div className="doc-footer"><b>{d.addrLabel}:</b> {d.addr}<br/><b>Phone:</b> {d.phone}</div>:<div className="doc-footer">Thanking you and looking forward to rendering our service to you.<br/>With Regards,<div className="doc-sign">M/s {d.companyName}</div></div>}</div></div>}
export default function EditorPage(){
const [company,setCompany]=useState('exact'),[mobileView,setMobileView]=useState('edit'),[forms,setForms]=useState(()=>clone(DEFAULTS)),[shared,setShared]=useState(sharedDefault),[totalAmount,setTotalAmount]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),preview=useRef(null),autoGstApplied=useRef({exact:false,maxcare:false}),d=forms[company],t=useMemo(()=>calc(d),[d])
useEffect(()=>{editorDatabase().catch(error=>console.warn('Editor analytics/presence unavailable:',error));getBranchDriveDatabase().catch(error=>console.warn('Legacy Drive export migration could not finish:',error))},[])
const patch=(k,v)=>setForms(o=>({...o,[company]:{...o[company],[k]:v}})),ps=(k,v)=>setShared(o=>({...o,[k]:v}))
useEffect(()=>{
 const companyValue=String(shared.custCompany||'').trim(),gstValue=String(shared.custGst||'').trim()
 const companyFilled=companyValue&&companyValue.toLowerCase()!=='unregistered'
 const gstFilled=gstValue&&gstValue.toLowerCase()!=='gst exempted'
 if(!companyFilled||!gstFilled){autoGstApplied.current={exact:false,maxcare:false};return}
 if(!autoGstApplied.current[company]){
  autoGstApplied.current[company]=true
  setForms(o=>({...o,[company]:{...o[company],gstPercent:18}}))
 }
},[shared.custCompany,shared.custGst,company])
const applyTotal=()=>{const total=Number(totalAmount)||0,matches=d.costItems.map((x,i)=>({i,p:SPLITS[company][x.label.trim().toLowerCase()]})).filter(x=>x.p>0);if(total<=0){editorAlert({icon:'warning',title:'Enter total amount',text:'Please fill in a valid total amount before applying the price split.'});return}if(!matches.length){editorAlert({icon:'error',title:'Unable to split amount',text:'No standard cost items are available to apply the amount. Add or restore a supported cost item.'});return}let used=0;patch('costItems',d.costItems.map((x,i)=>{const m=matches.find(y=>y.i===i);if(!m)return x;const pos=matches.indexOf(m),amount=pos===matches.length-1?Math.round(total-used):Math.round(total*m.p/100);if(pos!==matches.length-1)used+=amount;return{...x,amount}}))}
const carIndex=d.costItems.findIndex(x=>x.label.toLowerCase().includes('car'))
const changeCar=v=>{const rows=[...d.costItems],idx=rows.findIndex(x=>x.label.toLowerCase().includes('car'));if(idx<0)rows.splice(1,0,{label:company==='exact'?'Car Freight':'Car Transportation (if any)',amount:Number(v)||0});else rows[idx]={...rows[idx],amount:Number(v)||0};patch('costItems',rows)}
const reset=async()=>{const result=await editorAlert({icon:'warning',title:'Reset quotation template?',text:'This will restore the selected company template and clear the shared customer details.',showCancelButton:true,confirmButtonText:'Yes, reset',cancelButtonText:'Keep editing'});if(result.isConfirmed){setForms(o=>({...o,[company]:clone(DEFAULTS[company])}));setShared(sharedDefault());setTotalAmount('');setStatus('')}}
const download=async()=>{
 if(!shared.custName.trim()||!shared.fromCity.trim()||!shared.toCity.trim()){await editorAlert({icon:'warning',title:'Fill in the quotation details',text:'Please enter the customer name, moving-from location and moving-to location before generating the PDF.'});return}
 if(t.grand<=0){await editorAlert({icon:'warning',title:'Fill in the amount',text:'Please enter a valid quotation amount before generating the PDF.'});return}
 setBusy(true);setStatus('Preparing A4 PDF…');
 const showGenerationResult=async options=>{setBusy(false);await new Promise(resolve=>requestAnimationFrame(()=>resolve()));await editorAlert(options)};
 let exportStage=null;
 try{
  const load=(src,ok)=>ok()?Promise.resolve():new Promise((res,rej)=>{const e=document.createElement('script');e.src=src;e.onload=()=>ok()?res():rej(Error('PDF library failed'));e.onerror=()=>rej(Error('Could not load PDF library'));document.head.append(e)});
  await Promise.all([load('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',()=>!!window.html2canvas),load('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',()=>!!window.jspdf?.jsPDF)]);
  const issuedDocNo=await reserveQuotationNumber(company)
  patch('docNo',issuedDocNo)
  setStatus('Reserved quotation number '+issuedDocNo+' — preparing PDF…')
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))
  const source=preview.current?.querySelector('.quote-document');
  if(!source)throw Error('Quotation preview is not ready.');
  if(document.fonts?.ready)await document.fonts.ready;
  // Export an unscaled copy. The live preview is responsively transformed on
  // tablet/mobile; capturing it directly makes html2canvas shrink the PDF.
  exportStage=document.createElement('div');
  exportStage.setAttribute('aria-hidden','true');
  exportStage.style.cssText='position:fixed;left:-12000px;top:0;width:794px;min-height:1123px;margin:0;padding:0;overflow:visible;background:#fff;z-index:-1;transform:none;zoom:1;pointer-events:none;';
  const exportNode=source.cloneNode(true);
  // Ensure the freshly reserved number is present in the PDF snapshot even if React has not committed its state update yet.
  const numberWalker=document.createTreeWalker(exportNode,NodeFilter.SHOW_TEXT);
  let numberTextNode;
  while((numberTextNode=numberWalker.nextNode())){
   if(numberTextNode.nodeValue?.includes(d.docNo))numberTextNode.nodeValue=numberTextNode.nodeValue.replaceAll(d.docNo,issuedDocNo);
  }
  exportNode.style.cssText+=';display:block!important;position:relative!important;left:auto!important;top:auto!important;width:794px!important;min-width:794px!important;max-width:794px!important;min-height:1123px!important;height:auto!important;margin:0!important;padding-bottom:40px!important;transform:none!important;zoom:1!important;box-sizing:border-box!important;overflow:visible!important;';
  exportStage.appendChild(exportNode);
  document.body.appendChild(exportStage);
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
  const exportHeight=Math.max(1123,exportNode.scrollHeight,Math.ceil(exportNode.getBoundingClientRect().height));
  const canvas=await window.html2canvas(exportNode,{scale:2,useCORS:true,backgroundColor:'#ffffff',width:794,height:exportHeight,windowWidth:1200,windowHeight:Math.max(1200,exportHeight),scrollX:0,scrollY:0,logging:false});
  if(!canvas.width||!canvas.height)throw Error('Could not render the quotation page.');
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.96));
  const bytes=blob?new Uint8Array(await blob.arrayBuffer()):canvas.toDataURL('image/jpeg',.96);
  const {jsPDF}=window.jspdf,pdf=new jsPDF({unit:'mm',format:'a4',orientation:'portrait',compress:true});
  const pageW=pdf.internal.pageSize.getWidth(),pageH=pdf.internal.pageSize.getHeight();
  const fit=Math.min(pageW/canvas.width,pageH/canvas.height),w=canvas.width*fit,h=canvas.height*fit;
  pdf.addImage(bytes,'JPEG',(pageW-w)/2,(pageH-h)/2,w,h,undefined,'FAST');
  const clean=x=>String(x||'').replace(/[^a-zA-Z0-9 ]/g,'').trim()||'Customer';
  const name=clean(shared.custName)+'_'+clean(d.companyName)+'.pdf',file=pdf.output('blob'),url=URL.createObjectURL(file),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
  setStatus('PDF downloaded. Updating the generated-PDF count in the background…');
  setBusy(false);
  if(window.APMNotify?.send){try{window.APMNotify.send({type:'pdf',title:'PDF generated',file:name,details:{Customer:shared.custName,Company:d.companyName,Route:shared.fromCity+' to '+shared.toCity}})}catch{}}
  // Fire-and-forget delayed Telegram document delivery. It must not delay the user's PDF.
  void queueQuotationPdfForTelegram(file,name,{quotationNo:issuedDocNo,customer:shared.custName,company:d.companyName,route:shared.fromCity+' to '+shared.toCity,total:'INR '+money(t.grand)});
  void (async()=>{
   let countError=null,driveError=null;
   try{await incrementApmlPdfGenerated()}catch(error){countError=error;console.warn('APML quotation analytics failed:',error)}
   void logApmlAction({action:'PDF generated',module:'Editor',item:name,details:d.companyName,fileName:name,folder:'Quotation',fileSize:file.size,fileType:'application/pdf'})
   setStatus('PDF downloaded. Saving a copy to Drive/Quotation in the background…');
   try{await saveQuotationToDrive(file,name)}catch(error){driveError=error;console.warn('Quotation Drive save failed:',error)}
   const countStatus=countError?`PDF count update failed: ${countError.message||countError}`:'PDF generated count updated';
   const driveStatus=driveError?`Drive save failed: ${driveError.message||driveError}`:'saved to Drive/Quotation';
   setStatus(`PDF downloaded. ${countStatus}; ${driveStatus}.`);
  })();
  await showGenerationResult({icon:'success',title:'PDF downloaded',text:'Your quotation is ready! 💛 Your PDF is downloading now. We’re taking care of the remaining saves in the background.'});
 }catch(e){console.error(e);await showGenerationResult({icon:'error',title:'PDF generation failed',text:e?.message||'Please try again.'})}
 finally{exportStage?.remove();setBusy(false)}
}
return <div className="editor-page"><div className={`editor-layout mobile-${mobileView}`}><section className="editor-panel">
<div className="mobile-editor-switch"><button className={mobileView==='edit'?'active':''} onClick={()=>setMobileView('edit')}>Edit quotation</button><button className={mobileView==='preview'?'active':''} onClick={()=>setMobileView('preview')}>Preview</button></div><div className="company-tabs"><button className={company==='exact'?'active exact':'exact'} onClick={()=>{setCompany('exact');setStatus('')}}>Exact Container<br/>Logistics</button><button className={company==='maxcare'?'active maxcare':'maxcare'} onClick={()=>{setCompany('maxcare');setStatus('')}}>Maxcare Packers<br/>&amp; Movers</button></div>
<div className="editor-group shared-group"><h2>Customer &amp; details <span>— shared</span></h2><Field label="Date"><input value={shared.date} onChange={e=>ps('date',e.target.value)}/></Field><Field label="Customer name *"><input value={shared.custName} onChange={e=>ps('custName',e.target.value)} placeholder="Customer name"/></Field><div className="editor-two"><Field label="Customer company"><input value={shared.custCompany} onChange={e=>ps('custCompany',e.target.value)}/></Field><Field label="Customer GST"><input value={shared.custGst} onChange={e=>ps('custGst',e.target.value)}/></Field></div><div className="editor-two"><Field label="Moving from *"><input value={shared.fromCity} onChange={e=>ps('fromCity',e.target.value)}/></Field><Field label="Moving to *"><input value={shared.toCity} onChange={e=>ps('toCity',e.target.value)}/></Field></div></div>
<div className="editor-group"><h2>Document details</h2><Field label={d.docNoLabel}><input value={d.docNo} readOnly aria-readonly="true" title="Automatically assigned when you generate a PDF"/></Field><Field label={d.gstLabel}><input value={d.gstNo} onChange={e=>patch('gstNo',e.target.value)}/></Field></div>
<div className="editor-group"><h2>Cost items</h2><div className="quick-pricing"><div className="quick-label"><Calculator size={15}/> INSTANT PRICING CALCULATOR</div><Field label="Total amount (auto-split using standard %)"><div className="apply-total"><input type="number" value={totalAmount} onChange={e=>setTotalAmount(e.target.value)} onKeyDown={e=>e.key==='Enter'&&applyTotal()} placeholder="e.g. 47500"/><button onClick={applyTotal}>Apply</button></div></Field><div className="editor-two"><Field label="Car Freight (₹)"><input type="number" value={carIndex<0?'':d.costItems[carIndex].amount} onChange={e=>changeCar(e.target.value)}/></Field><Field label="GST %"><input type="number" value={d.gstPercent} onChange={e=>patch('gstPercent',e.target.value)}/></Field></div></div>
{d.costItems.map((x,i)=><div className="editor-dynamic-row" key={i}><input aria-label="Cost item description" value={x.label} onChange={e=>patch('costItems',d.costItems.map((z,j)=>j===i?{...z,label:e.target.value}:z))}/><input aria-label="Cost item amount" type="number" value={x.amount} onChange={e=>patch('costItems',d.costItems.map((z,j)=>j===i?{...z,amount:e.target.value}:z))}/><button className="remove-row" onClick={()=>patch('costItems',d.costItems.filter((_,j)=>j!==i))} aria-label="Remove cost item"><Trash2 size={16}/></button></div>)}<button className="editor-add" onClick={()=>patch('costItems',[...d.costItems,{label:'New Charge',amount:0}])}><Plus size={16}/> Add cost item</button><div className="editor-totals"><div><span>Subtotal</span><strong>₹ {money(t.subtotal)}</strong></div><div><span>GST ({Number(d.gstPercent)||0}%)</span><strong>₹ {money(t.gst)}</strong></div><div className="grand"><span>Total with GST</span><strong>₹ {money(t.grand)}</strong></div></div></div>
<div className="editor-group"><h2>Terms &amp; conditions</h2>{d.terms.map((x,i)=><div className="editor-dynamic-row term-edit" key={i}><textarea value={x} onChange={e=>patch('terms',d.terms.map((z,j)=>j===i?e.target.value:z))}/><button className="remove-row" onClick={()=>patch('terms',d.terms.filter((_,j)=>j!==i))} aria-label="Remove term"><Trash2 size={16}/></button></div>)}<button className="editor-add" onClick={()=>patch('terms',[...d.terms,'New term or condition.'])}><Plus size={16}/> Add term</button></div>
<div className="editor-group"><h2>Registered office</h2><Field label={d.addrLabel}><textarea value={d.addr} onChange={e=>patch('addr',e.target.value)}/></Field><div className="editor-two"><Field label="Phone"><input value={d.phone} onChange={e=>patch('phone',e.target.value)}/></Field>{d.showEmail&&<Field label="Email"><input value={d.email} onChange={e=>patch('email',e.target.value)}/></Field>}</div></div>
<button className="editor-reset" onClick={reset}><RotateCcw size={15}/> Reset template to default</button><div className="editor-download"><button className="apml-download-btn" onClick={download} disabled={busy}><div className="button-content"><div className="text-container"><div className="text">{busy?(status||'Generating PDF…'):'Download A4 PDF'}</div></div><div className="svg-container"><svg className="download-icon" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.479 10.092c-.212-3.951-3.473-7.092-7.479-7.092-4.005 0-7.267 3.141-7.479 7.092-2.57.463-4.521 2.706-4.521 5.408 0 3.037 2.463 5.5 5.5 5.5h13c3.037 0 5.5-2.463 5.5-5.5 0-2.702-1.951-4.945-4.521-5.408zm-7.479 6.908l-4-4h3v-4h2v4h3l-4 4z"></path></svg></div></div></button>{status&&<p role="status">{status}</p>}</div></section>
<section className="editor-preview"><div className="mobile-editor-switch mobile-preview-switch"><button className={mobileView==='edit'?'active':''} onClick={()=>setMobileView('edit')}>Edit quotation</button><button className={mobileView==='preview'?'active':''} onClick={()=>setMobileView('preview')}>Preview</button></div><div className="preview-caption"><FileText size={15}/> LIVE A4 PREVIEW <span>Changes update instantly</span></div><div className="preview-scroll"><div className="preview-paper" ref={preview}><Preview company={company} d={d} s={shared}/></div></div></section></div>
{busy&&<div className="quote-generating-overlay" role="status" aria-live="polite">
  <div className="spinnerContainer">
    <div className="spinner"></div>
    <div className="loader"><p>Preparing</p><div className="words">
      <span className="word">quotation</span>
      <span className="word">PDF</span>
      <span className="word">pages</span>
      <span className="word">document</span>
      <span className="word">quotation</span>
    </div></div>
    <span className="quote-generating-caption">Please wait while your A4 quotation is generated</span>
  </div>
</div>}
</div>
}