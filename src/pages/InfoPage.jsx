import './InfoPage.css'

function MaterialIcon({name,size=20}){return <span className="material-symbols-rounded about-material-icon" aria-hidden="true" style={{fontSize:size}}>{name}</span>}

const chapters = [
 {phase:'01',date:'Nov 2026',status:'active',label:'CURRENT IMPROVEMENTS',title:'Making APML Portal more reliable and connected.',icon:'database'},
 {phase:'02',date:'Nov 2026',status:'complete',label:'RELIABILITY & POLISH',title:'Improving everyday workflows and the overall experience.',icon:'analytics'},
 {phase:'03',date:'Nov 2026',status:'complete',label:'DESIGN & IDENTITY',title:'Bringing a consistent APML look and feel across the portal.',icon:'palette'},
 {phase:'04',date:'Nov 2026',status:'complete',label:'REACT MIGRATION',title:'Bringing APML modules together in one modern application.',icon:'layers'},
 {phase:'05',date:'Nov 2026',status:'complete',label:'NEW APPLICATION FOUNDATION',title:'Building the new React-based APML Portal.',icon:'code'},
 {phase:'06',date:'Oct 2026',status:'complete',label:'WORKSPACE EXPANSION',title:'Growing from one tool into a collection of APML tools.',icon:'hub'},
 {phase:'07',date:'Oct 2026',status:'complete',label:'THE FIRST WEB APP',title:'Creating and refining the original standalone web tool.',icon:'web'},
 {phase:'08',date:'Sep 2026',status:'origin',label:'THE BEGINNING',title:'Starting with a simple idea to make everyday work easier.',icon:'lightbulb'}
]

const roadmap = [
 {tag:'NOW',state:'CURRENT PRIORITY',title:'Strengthen the foundations',icon:'verified',description:'Improve reliability, analytics and the systems behind the portal.'},
 {tag:'NEXT',state:'PLANNED',title:'Connect the workspace',icon:'psychology',description:'Make APML modules work together more smoothly.'},
 {tag:'LONG TERM',state:'FUTURE VISION',title:'Keep evolving',icon:'rocket_launch',description:'Add smarter tools and useful features as real needs grow.'}
]

export default function InfoPage(){
 return <main className="about-page roadmap-page">
  <section className="roadmap-hero">
   <div className="roadmap-hero-copy">
    <div className="about-eyebrow"><MaterialIcon name="route" size={15}/> THE STORY SO FAR & WHAT'S AHEAD</div>
    <h1>About <span>APML Portal.</span></h1>
    <p className="about-lead">A simple idea that grew into a connected workspace for APML.</p>
    <div className="roadmap-hero-tags"><span><MaterialIcon name="history" size={16}/> Since 2026</span><span><MaterialIcon name="timeline" size={16}/> Since 2026</span><span><MaterialIcon name="trending_up" size={16}/> Always evolving</span></div>
   </div>
   <div className="roadmap-hero-art"><div className="roadmap-art-glow"/><img src={import.meta.env.BASE_URL+'other/undraw_programming_j1zw.svg'} alt="Illustration representing the development of APML Portal"/><div className="roadmap-art-caption"><span className="roadmap-live-dot"/> Built around real-world needs</div></div>
  </section>

  <section className="roadmap-intro">
   <div><div className="about-kicker">A PROJECT, NOT JUST A LAUNCH</div><h2>From one page.<br/><span>To a complete workspace.</span></h2></div>
   <p>From its first standalone tool to today’s connected workspace, APML Portal continues to grow.</p>
  </section>

  <section className="roadmap-timeline-section">
   <div className="roadmap-section-heading"><div><div className="about-kicker">THE FULLER JOURNEY</div><h2>How the project evolved.</h2></div><span className="roadmap-section-count">THE JOURNEY</span></div>
   <div className="roadmap-timeline">
    {chapters.map((item)=><article className={'roadmap-milestone '+(item.status==='active'?'is-active':'')} key={item.phase}>
     <div className="roadmap-rail"><span className="roadmap-node">{item.status==='active'?<MaterialIcon name="sync" size={17}/>:item.status==='origin'?<MaterialIcon name="flag" size={17}/>:<MaterialIcon name="check" size={17}/>}</span></div>
     <div className="roadmap-milestone-card">
      <div className="roadmap-milestone-toggle">
       <div className="roadmap-milestone-top"><span className="roadmap-phase">{item.date}</span><span className={'roadmap-status '+item.status}>{item.status==='active'?'IN PROGRESS':item.status==='origin'?'ORIGIN':'RECORDED'}</span></div>
       <div className="roadmap-milestone-title"><span className="roadmap-milestone-icon"><MaterialIcon name={item.icon} size={23}/></span><strong>{item.title}</strong></div>
      </div>
     </div>
    </article>)}
   </div>

  </section>

  <section className="roadmap-future">
   <div className="roadmap-section-heading"><div><div className="about-kicker">THE ROAD AHEAD</div><h2>What's coming next?</h2></div><span className="roadmap-section-count">FUTURE PLANS</span></div>
   <div className="roadmap-future-grid">
    {roadmap.map((item,index)=><article className={'roadmap-future-card future-'+index} key={item.tag}>
     <div className="roadmap-future-top"><span className="roadmap-future-icon"><MaterialIcon name={item.icon} size={24}/></span><span className="roadmap-status planned">{item.state}</span></div>
     <div className="roadmap-future-tag">{item.tag}</div><h3>{item.title}</h3><p>{item.description}</p>
     
    </article>)}
   </div>
  </section>

  <section className="roadmap-principles">
   <div className="roadmap-principle-icon"><MaterialIcon name="tips_and_updates" size={28}/></div>
   <div><div className="about-kicker">THE PRINCIPLE</div><h2>Useful first. Better every day.</h2><p>Built around real work. Always evolving.</p></div>
   <a href="https://github.com/kundarwork-debug/APML-Portal" target="_blank" rel="noopener noreferrer" className="about-btn"><MaterialIcon name="code" size={17}/> View project <MaterialIcon name="open_in_new" size={15}/></a>
  </section>
 </main>
}
