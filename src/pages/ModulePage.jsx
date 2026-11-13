import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowUpRight, Construction, ShieldCheck } from 'lucide-react'
import { modules } from '../data/modules'
export default function ModulePage(){
 const {id}=useParams(); const module=modules.find(m=>m.id===id)
 if(!module)return <div className="empty-state">This tool could not be found. <Link to="/">Return to overview</Link></div>
 const Icon=module.icon
 return <div className="subpage"><Link to="/" className="back-link"><ArrowLeft size={15}/> All tools</Link><div className="subpage-head"><div className={`module-icon large ${module.color}`}><Icon size={25}/></div><div><div className="eyebrow muted">{module.category}</div><h1>{module.title}</h1><p>{module.description}</p></div></div><section className="migration-card"><div className="migration-symbol"><Construction size={23}/></div><div><span className="migration-label">REACT REBUILD IN PROGRESS</span><h2>This workspace is being rebuilt</h2><p>The new React portal foundation is in place. This tool’s original workflow, data connections and permissions will be migrated into dedicated React components next, without changing the existing production services.</p><div className="migration-foot"><ShieldCheck size={16}/> Existing APML services are kept separate from this new interface.</div></div></section><div className="subpage-actions"><Link to="/" className="btn-primary">Back to overview <ArrowUpRight size={16}/></Link></div></div>
}