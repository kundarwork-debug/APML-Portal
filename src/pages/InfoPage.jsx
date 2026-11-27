import {useMemo,useState} from 'react'
import './InfoPage.css'

function MaterialIcon({name,size=20}){return <span className="material-symbols-rounded about-material-icon" aria-hidden="true" style={{fontSize:size}}>{name}</span>}

const chapters = [
 {phase:'01',status:'origin',label:'THE BEGINNING',title:'A simple idea: make everyday work easier.',description:'APML Portal started with a practical goal — bring useful digital tools closer to the people who need them. What began as a focused internal productivity project grew through real-world feedback and everyday use.',icon:'lightbulb',items:['A single place for useful work tools','A focus on practical problems, not unnecessary complexity']},
 {phase:'02',status:'complete',label:'THE FIRST TOOLS',title:'From individual tools to a useful workspace.',description:'The portal expanded with purpose-built calculators and modules that help turn repetitive tasks into quicker, more consistent workflows.',icon:'calculate',items:['Local and vehicle rate calculators','APML Lite and quotation-related workflows','A responsive interface for desktop and mobile']},
 {phase:'03',status:'complete',label:'A CONNECTED WORKSPACE',title:'Bringing people, files and workflows together.',description:'The experience grew beyond calculators. Directory and Field Officer tools made information easier to access, while Drive and Gallery brought shared files and media into the same workspace.',icon:'hub',items:['Directory and Field Officer modules','Drive and Gallery for shared files','Shared navigation, themes and reusable interface components']},
 {phase:'04',status:'complete',label:'SMARTER OPERATIONS',title:'Automation, notifications and visibility.',description:'The portal gained more connected workflows — including quotation PDF generation, file activity notifications and analytics to better understand how the workspace is being used.',icon:'auto_awesome',items:['Quotation Editor and PDF generation','Telegram notifications and workflow automation','Portal activity and visitor analytics']},
 {phase:'05',status:'active',label:'FOUNDATION & RELIABILITY',title:'Strengthening the systems behind the experience.',description:'The focus has shifted toward dependable infrastructure, clearer data flows and better operational visibility. This includes the ongoing Drive storage/index migration to Cloudflare D1 and continued analytics and visitor-tracking improvements.',icon:'database',items:['Firebase data and access-rule improvements','Cloudflare Worker services and scheduled reporting','Drive D1 migration and analytics reliability work'],note:'Work in this chapter is ongoing; individual migrations and fixes are verified as they are completed.'}
]

const roadmap = [
 {tag:'PORTAL 1.0',state:'NEXT PRIORITY',title:'Stability & completion',icon:'verified',description:'Make the existing portal dependable before adding more complexity.',points:['Complete pending migrations and remove obsolete connections','Improve analytics accuracy and hourly reporting','Audit module behaviour, permissions and mobile responsiveness','Strengthen error handling, monitoring and recovery']},
 {tag:'PORTAL 2.0',state:'FUTURE VISION',title:'Intelligence & integration',icon:'psychology',description:'Build on a stable foundation with smarter, more connected workflows.',points:['More intelligent automation for repetitive tasks','Deeper integrations between portal modules and services','More useful operational insights and reporting','A more adaptive, polished experience across devices']},
 {tag:'BEYOND',state:'EXPLORATION',title:'Grow with real needs',icon:'rocket_launch',description:'New ideas should earn their place by solving real problems.',points:['Explore new modules based on user feedback','Improve existing workflows before duplicating features','Keep the portal practical, accessible and easy to maintain']}
]

export default function InfoPage(){
 const [expanded,setExpanded]=useState('01')
 const milestones=useMemo(()=>chapters.map((x)=>({...x,open:expanded===x.phase})),[expanded])
 return <main className="about-page roadmap-page">
  <section className="roadmap-hero">
   <div className="roadmap-hero-copy">
    <div className="about-eyebrow"><MaterialIcon name="route" size={15}/> THE STORY SO FAR & WHAT'S AHEAD</div>
    <h1>About <span>APML Portal.</span></h1>
    <p className="about-lead">A workspace built around real work, improved one step at a time. Explore how APML Portal has evolved — from its first tools to a connected platform — and where it is heading next.</p>
    <div className="roadmap-hero-tags"><span><MaterialIcon name="history" size={16}/> Our journey</span><span><MaterialIcon name="timeline" size={16}/> Product roadmap</span><span><MaterialIcon name="trending_up" size={16}/> Always evolving</span></div>
   </div>
   <div className="roadmap-hero-art"><div className="roadmap-art-glow"/><img src={import.meta.env.BASE_URL+'other/undraw_programming_j1zw.svg'} alt="Illustration representing the development of APML Portal"/><div className="roadmap-art-caption"><span className="roadmap-live-dot"/> Built around real-world needs</div></div>
  </section>

  <section className="roadmap-intro">
   <div><div className="about-kicker">OUR APPROACH</div><h2>Built in chapters.<br/><span>Improved continuously.</span></h2></div>
   <p>APML Portal is not a one-time launch. It is an evolving collection of tools and services shaped by practical requirements, feedback and lessons from daily use. This roadmap separates what has been built from what is still being worked on and what remains a future goal.</p>
  </section>

  <section className="roadmap-timeline-section">
   <div className="roadmap-section-heading"><div><div className="about-kicker">THE JOURNEY</div><h2>How we got here.</h2></div><span className="roadmap-section-count">05 CHAPTERS</span></div>
   <div className="roadmap-timeline">
    {milestones.map((item,index)=><article className={'roadmap-milestone '+(item.status==='active'?'is-active':'')} key={item.phase}>
     <div className="roadmap-rail"><span className="roadmap-node">{item.status==='active'?<MaterialIcon name="sync" size={17}/>:item.status==='origin'?<MaterialIcon name="flag" size={17}/>:<MaterialIcon name="check" size={17}/>}</span></div>
     <div className="roadmap-milestone-card">
      <button className="roadmap-milestone-toggle" type="button" aria-expanded={item.open} onClick={()=>setExpanded(item.open?'':item.phase)}>
       <div className="roadmap-milestone-top"><span className="roadmap-phase">{item.phase} / {item.label}</span><span className={'roadmap-status '+item.status}>{item.status==='active'?'IN PROGRESS':item.status==='origin'?'ORIGIN':'COMPLETED'}</span></div>
       <div className="roadmap-milestone-title"><span className="roadmap-milestone-icon"><MaterialIcon name={item.icon} size={23}/></span><span><strong>{item.title}</strong><small>{item.description}</small></span><MaterialIcon name={item.open?'expand_less':'expand_more'} size={22}/></div>
      </button>
      {item.open&&<div className="roadmap-milestone-details"><ul>{item.items.map(point=><li key={point}><MaterialIcon name="check_circle" size={17}/>{point}</li>)}</ul>{item.note&&<p className="roadmap-note"><MaterialIcon name="info" size={16}/>{item.note}</p>}</div>}
     </div>
    </article>)}
   </div>
  </section>

  <section className="roadmap-future">
   <div className="roadmap-section-heading"><div><div className="about-kicker">THE ROAD AHEAD</div><h2>What's coming next?</h2></div><span className="roadmap-section-count">THE ROADMAP</span></div>
   <div className="roadmap-future-grid">
    {roadmap.map((item,index)=><article className={'roadmap-future-card future-'+index} key={item.tag}>
     <div className="roadmap-future-top"><span className="roadmap-future-icon"><MaterialIcon name={item.icon} size={24}/></span><span className="roadmap-status planned">{item.state}</span></div>
     <div className="roadmap-future-tag">{item.tag}</div><h3>{item.title}</h3><p>{item.description}</p>
     <ul>{item.points.map(point=><li key={point}><MaterialIcon name="arrow_forward" size={16}/>{point}</li>)}</ul>
    </article>)}
   </div>
  </section>

  <section className="roadmap-principles">
   <div className="roadmap-principle-icon"><MaterialIcon name="tips_and_updates" size={28}/></div>
   <div><div className="about-kicker">THE PRINCIPLE</div><h2>Useful first. Better every day.</h2><p>Every improvement should make the portal more useful, reliable or easier to use. The roadmap will evolve as real needs change — and completed work will be marked only after it has been implemented and verified.</p></div>
   <a href="https://github.com/kundarwork-debug/APML-Portal" target="_blank" rel="noopener noreferrer" className="about-btn"><MaterialIcon name="code" size={17}/> View project <MaterialIcon name="open_in_new" size={15}/></a>
  </section>
 </main>
}
