import { useMemo, useState } from 'react'
import { Calculator, Package, ReceiptText, Grid3X3, Gavel, Truck } from 'lucide-react'
import './LocalRate.css'
const money=n=>'₹'+Math.round(n||0).toLocaleString('en-IN')
const extras=[
 {id:'crossing',name:'Crossing requirement',rate:'₹1,500 / trip',kind:'count',unit:1500},
 {id:'manpower',name:'Additional manpower (2nd day)',rate:'₹1,000 / person',kind:'count',unit:1000},
 {id:'appliance',name:'Removal / uninstallation (AC, fan, geyser)',rate:'As actuals',kind:'amount'},
 {id:'crate',name:'Wooden crate',rate:'As actuals',kind:'amount'},
 {id:'rope',name:'Rope requirement',rate:'As actuals',kind:'amount'},
 {id:'mathadi',name:'Mathadi charges',rate:'As actuals',kind:'amount'}
]
const initial=Object.fromEntries(extras.map(x=>[x.id,{enabled:false,value:x.kind==='count'?1:0}]))
export default function LocalRate(){
 const [cft,setCft]=useState(200),[addons,setAddons]=useState(initial)
 const volume=Math.max(0,Number(cft)||0),rate=volume>500?20:25,raw=volume*rate,base=Math.max(5000,raw)
 const addonTotal=extras.reduce((sum,x)=>{const a=addons[x.id];return sum+(a.enabled?(x.kind==='count'?Math.max(1,Number(a.value)||1)*x.unit:Math.max(0,Number(a.value)||0)):0)},0)
 const total=base+addonTotal,advance=Math.round(total*.2)
 const setAddon=(id,patch)=>setAddons(old=>({...old,[id]:{...old[id],...patch}}))
 const format=useMemo(()=>({raw:money(raw),addons:money(addonTotal),base:money(base),total:money(total),advance:money(advance)}),[raw,addonTotal,base,total,advance])
 return <div className="local-page">
  <header className="local-hero"><img src="https://3dicons.sgp1.cdn.digitaloceanspaces.com/v1/dynamic/color/bag-dynamic-color.png" alt="" /><span className="local-eyebrow">LOCAL SHIFTING · BOOKING SOP</span><h1>APML <em>Local Rate Calculator</em></h1><p>Estimate intra-city relocation charges including packing, moving, loading and unloading.</p></header>
  <div className="local-grid">
   <section className="local-card"><div className="local-card-title"><h2><Package size={19}/> Volume & consignment details</h2><span className="local-tier">{rate===20?'₹20':'₹25'} / CFT</span></div>
    <div className="local-field"><label htmlFor="local-cft">Consignment volume (CFT)</label><div className="local-volume"><input id="local-cft" type="number" min="1" max="1500" value={cft} onChange={e=>setCft(e.target.value)}/><strong>{volume} CFT</strong></div><input aria-label="Adjust consignment volume" type="range" min="50" max="1000" step="10" value={Math.min(1000,volume)} onChange={e=>setCft(e.target.value)}/></div>
    <div className="local-field"><label>Additional services / requirements</label><div className="local-extras">{extras.map(x=>{const a=addons[x.id];return <div className={'local-extra '+(a.enabled?'active':'')} key={x.id}><label className="local-extra-name"><input type="checkbox" checked={a.enabled} onChange={e=>setAddon(x.id,{enabled:e.target.checked})}/><span>{x.name}</span></label><div className="local-extra-control"><small>{x.rate}</small><input type="number" min={x.kind==='count'?1:0} step={x.kind==='count'?1:100} disabled={!a.enabled} aria-label={x.name+' quantity or charge'} value={a.value} onChange={e=>setAddon(x.id,{value:e.target.value})}/></div></div>})}</div></div>
   </section>
   <section className="local-card local-summary"><div className="local-card-title"><h2><ReceiptText size={19}/> Quotation breakdown</h2><span className="local-sop">SOP compliant</span></div><div className="local-breakdown"><div><span>Calculated volume cost</span><b>{format.raw}</b></div><div><span>Applicable rate tier</span><b>₹{rate} / CFT</b></div><div><span>Minimum base floor</span><b>{raw<5000?'₹5,000 applied':'Passed'}</b></div><div><span>Additional services</span><b>{format.addons}</b></div><div><span>Advance payable (20%)</span><b className="green">{format.advance}</b></div></div><div className="local-total"><div><strong>Total local shifting rate</strong><small>Packing, loading, moving & unloading</small></div><b>{format.total}</b></div><p className="local-note">* FOV risk coverage and GST extra as applicable.</p></section>
  </div>
  <section className="local-card local-matrix"><h2><Grid3X3 size={19}/> Applicable booking rates (August to February)</h2><div className="local-table-scroll"><table><thead><tr><th>Volume category</th><th>Booking rate</th><th>Included inclusions</th><th>Minimum charge</th></tr></thead><tbody><tr className={volume<=500?'chosen':''}><td>Up to 500 CFT</td><td>₹25 per CFT</td><td>Packing, moving, loading & unloading</td><td>₹5,000</td></tr><tr className={volume>500?'chosen':''}><td>Above 500 CFT</td><td>₹20 per CFT</td><td>Packing, moving, loading & unloading</td><td>₹5,000</td></tr></tbody></table></div></section>
  <section className="local-card local-terms"><h2><Gavel size={19}/> Terms & conditions – Local shifting</h2><ol><li><b>Survey accuracy:</b> Physical / video survey must be accurate and include all items. Additional goods may affect the booking cost.</li><li><b>Month-end exception:</b> Bookings at these rates are not accepted at month-end.</li><li><b>Advance payment:</b> A minimum 20% advance is mandatory before confirming the booking.</li><li><b>High-value articles:</b> Separate rates may apply depending on the work and requirements.</li><li><b>Stairs / handling:</b> Additional manpower charges apply when goods need to be carried by stairs.</li><li><b>Supervisor responsibility:</b> The supervisor is responsible for collecting the balance after loading is complete.</li><li><b>Damage prevention:</b> Use PP sheets / solid boxes wherever possible to protect goods during packing.</li></ol></section>
 </div>
}