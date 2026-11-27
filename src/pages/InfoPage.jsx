import {useMemo,useState} from 'react'
import './InfoPage.css'

function MaterialIcon({name,size=20}){return <span className="material-symbols-rounded about-material-icon" aria-hidden="true" style={{fontSize:size}}>{name}</span>}

const chapters = [
 {phase:'01',date:'SEPTEMBER 2026 OR EARLIER · START PERIOD',status:'origin',label:'THE ORIGINAL IDEA',title:'The project begins as a small, practical web tool.',description:'APML Portal traces its roots to the original Side-Quote-Generator project. It began before November 2026, with a focused goal: make a useful work task easier through a lightweight web page. The exact first commit and first-publication date are not currently recoverable from the deleted repository, so this starting period is intentionally shown as approximate.',icon:'lightbulb',items:['The original project name was Side-Quote-Generator','The first experience was a standalone web page built with browser technologies rather than the later React application','The project was published separately through GitHub Pages at kundarwork-debug.github.io/Side-Quote-Generator/','The earliest exact deployment date is not verified because the original repository is currently deleted'],note:'The September-or-earlier start period reflects the project history you provided. The original repository is needed to verify the precise first commit and first deployment date.'},
 {phase:'02',date:'EARLY DEVELOPMENT · BEFORE THE REACT MIGRATION',status:'complete',label:'THE STANDALONE WEB APP',title:'The first page is built, tested and improved through real use.',description:'The original standalone page became the working foundation. Its layout, interactions and supporting scripts were refined over time. The project was still a focused web tool at this stage—not yet the full React-based portal that exists today.',icon:'web',items:['HTML, CSS and JavaScript formed the original standalone experience','The page was iterated on as practical requirements and usability issues appeared','The GitHub Pages deployment and its repository were separate from the later Vercel-hosted APML Portal','The original mascot behaviour and shared scripts were part of the legacy experience']},
 {phase:'03',date:'GROWTH PERIOD · BEFORE 13 NOVEMBER 2026',status:'complete',label:'FROM ONE TOOL TO APML WORKSPACE',title:'The scope expands beyond the original page.',description:'The project evolved from a single-purpose page into a broader APML workspace. More tools and workflows were brought together, creating the need for shared navigation, consistent styling and a structure that could support multiple modules.',icon:'hub',items:['Quotation-related workflows and the APML Lite rate calculator became part of the wider experience','Directory, Field Officer, Drive and Gallery expanded the portal beyond its original purpose','Shared navigation, branding and responsive behaviour became increasingly important','The growing codebase exposed the limits of maintaining every experience as a separate legacy page']},
 {phase:'04',date:'13 NOVEMBER 2026 · REPOSITORY-COMMIT VERIFIED',status:'complete',label:'THE REACT REBUILD BEGINS',title:'A new React foundation is created for APML Portal.',description:'The current APML-Portal repository records the React foundation and responsive workspace on 13 November. This is a major architectural milestone—not the beginning of the project. The work established a modern application shell while retaining the identity and workflows built in the earlier project.',icon:'code',items:['React 19, Vite and React Router form the new application foundation','The responsive workspace and shared navigation are established','The project moves toward a component-based UI rather than a collection of standalone pages','The original project history continues into the new APML-Portal repository'],link:'https://github.com/kundarwork-debug/APML-Portal/commit/fd3f5bb7de2e8112ee80af6c313aa71a8912affa'},
 {phase:'05',date:'14 NOVEMBER 2026 · REPOSITORY-COMMIT VERIFIED',status:'complete',label:'MODULE-BY-MODULE REACT MIGRATION',title:'The wider portal is connected to the new application shell.',description:'The React transition moved beyond the homepage. Existing APML sections were connected and key modules were migrated or integrated, while compatibility work helped preserve established workflows during the transition.',icon:'layers',items:['APML Drive and APML Analytics received React migration work','APML Lite and policy pages were migrated into the React application','Telegram notification client and shared notification behaviour were brought into the React shell','PWA foundations were added: manifest, app icons and service-worker/offline support','Firebase configuration and legacy homepage/mascot experiences were reconciled during integration'],link:'https://github.com/kundarwork-debug/APML-Portal/commit/dd7771bd84f1b75bd6104442fa7a12ffcab85e02'},
 {phase:'06',date:'16–17 NOVEMBER 2026 · CONVERSATION & COMMIT HISTORY',status:'complete',label:'EXPERIENCE, THEMING & IDENTITY',title:'The portal gets a more unified visual experience.',description:'The migration period also focused on bringing the established APML look and feel into the new interface. Theme behaviour, mascot integration and special pages were refined, with follow-up work based on actual use.',icon:'palette',items:['Legacy dark-theme behaviour was brought into React modules and applied before the first page paint','Homepage, navigation, footer and mascot experiences were restored and refined','Telegram announcements were connected to the React mascot experience','The React 404 experience was developed and subsequently revised based on feedback','Responsive spacing and visual consistency were refined across modules']},
 {phase:'07',date:'20–21 NOVEMBER 2026 · CONVERSATION & COMMIT HISTORY',status:'complete',label:'RELIABILITY & PRODUCT POLISH',title:'The focus shifts to dependable everyday workflows.',description:'The portal received further usability work and a stronger analytics experience. The old project was also given a clear handover so visitors would be directed to the new portal rather than a dead page.',icon:'analytics',items:['The old Side-Quote-Generator GitHub Pages page was prepared as a “We’ve Moved” destination pointing to https://apmlportal.vercel.app/','Download-button behaviour and feedback were refined across Quotation Editor, Drive and Gallery','The Analytics page was rebuilt with interactive reporting and visual refinements','Visitor and activity reporting requirements were clarified, including unique visitors and module-level activity'],link:'https://github.com/kundarwork-debug/APML-Portal/commit/6c771e5a40305c34dac40d2af612ed245f749df4'},
 {phase:'08',date:'22–27 NOVEMBER 2026 · RECENT DEVELOPMENT',status:'active',label:'INFRASTRUCTURE & OPERATIONS',title:'The portal is being strengthened behind the scenes.',description:'Recent work has concentrated on data integrity, visitor measurement, storage infrastructure and operational notifications. Some of these efforts are still under audit or verification and are deliberately not presented as fully completed.',icon:'database',items:['Visitor analytics and online-presence tracking are being refined to distinguish real visitors and avoid counting multiple people on shared Wi-Fi as one','Cloudflare Worker and D1 work is moving APML Drive metadata away from the older Firebase Drive paths while preserving file assets','Firebase data sources, access rules and module connections are being reviewed as migrations progress','Telegram PDF notifications and hourly activity reports are being improved; the hourly report still has a known data-source mismatch awaiting correction','Legacy Firebase cleanup is intended only after migration is complete and data preservation is confirmed'],note:'This is the current workstream, not a declaration that every migration or analytics issue is already solved.'}
]

const roadmap = [
 {tag:'NOW',state:'CURRENT PRIORITY',title:'Finish the foundations',icon:'verified',description:'Close out the in-progress reliability work before expanding the feature set.',points:['Correct hourly Telegram report data sources and verify real activity totals','Finish and validate Drive D1 migration without losing existing data or Cloudinary assets','Complete visitor and online-presence analytics audits','Remove obsolete service connections only after migration checks pass']},
 {tag:'NEXT',state:'PLANNED',title:'A more connected APML workspace',icon:'psychology',description:'Make existing modules work together more naturally and reduce repetitive work.',points:['More reliable cross-module notifications and automation','Clearer operational dashboards and useful activity insights','Consistent permissions, data handling and recovery across modules','Continue improving mobile experience and accessibility']},
 {tag:'LONG TERM',state:'FUTURE VISION',title:'Grow from real requirements',icon:'rocket_launch',description:'Keep the portal practical and let real APML needs guide its evolution.',points:['Introduce new modules only when they solve a real workflow problem','Build smarter assistance around existing quotation and operations tasks','Improve maintainability and reduce duplicated legacy code','Keep performance, privacy and data reliability central to future releases']}
]

export default function InfoPage(){
 const [expanded,setExpanded]=useState('01')
 const milestones=useMemo(()=>chapters.map((x)=>({...x,open:expanded===x.phase})),[expanded])
 return <main className="about-page roadmap-page">
  <section className="roadmap-hero">
   <div className="roadmap-hero-copy">
    <div className="about-eyebrow"><MaterialIcon name="route" size={15}/> THE STORY SO FAR & WHAT'S AHEAD</div>
    <h1>About <span>APML Portal.</span></h1>
    <p className="about-lead">A project that began as a small standalone web tool in September 2026 or earlier, grew through real work, and eventually became a connected React workspace. Explore the journey, the rebuild and what we are working toward next.</p>
    <div className="roadmap-hero-tags"><span><MaterialIcon name="history" size={16}/> Since 2026</span><span><MaterialIcon name="timeline" size={16}/> 8 milestones</span><span><MaterialIcon name="trending_up" size={16}/> Always evolving</span></div>
   </div>
   <div className="roadmap-hero-art"><div className="roadmap-art-glow"/><img src={import.meta.env.BASE_URL+'other/undraw_programming_j1zw.svg'} alt="Illustration representing the development of APML Portal"/><div className="roadmap-art-caption"><span className="roadmap-live-dot"/> Built around real-world needs</div></div>
  </section>

  <section className="roadmap-intro">
   <div><div className="about-kicker">A PROJECT, NOT JUST A LAUNCH</div><h2>From one page.<br/><span>To a complete workspace.</span></h2></div>
   <p>The APML Portal story starts before the current React repository. The original Side-Quote-Generator was a standalone web page published on GitHub Pages. As the work grew, the project expanded into multiple APML tools, then moved into a React/Vite application and a new Vercel deployment. Dates below distinguish repository-verified milestones from earlier periods whose original commit history is no longer available.</p>
  </section>

  <section className="roadmap-timeline-section">
   <div className="roadmap-section-heading"><div><div className="about-kicker">THE FULLER JOURNEY</div><h2>How the project evolved.</h2></div><span className="roadmap-section-count">08 MILESTONES</span></div>
   <div className="roadmap-timeline">
    {milestones.map((item)=><article className={'roadmap-milestone '+(item.status==='active'?'is-active':'')} key={item.phase}>
     <div className="roadmap-rail"><span className="roadmap-node">{item.status==='active'?<MaterialIcon name="sync" size={17}/>:item.status==='origin'?<MaterialIcon name="flag" size={17}/>:<MaterialIcon name="check" size={17}/>}</span></div>
     <div className="roadmap-milestone-card">
      <button className="roadmap-milestone-toggle" type="button" aria-expanded={item.open} onClick={()=>setExpanded(item.open?'':item.phase)}>
       <div className="roadmap-milestone-top"><span className="roadmap-phase">{item.phase} / {item.label}</span><span className={'roadmap-status '+item.status}>{item.status==='active'?'IN PROGRESS':item.status==='origin'?'PROJECT ORIGIN':'RECORDED'}</span></div>
       <div className="roadmap-milestone-title"><span className="roadmap-milestone-icon"><MaterialIcon name={item.icon} size={23}/></span><span><strong>{item.title}</strong><small>{item.date} · {item.description}</small></span><MaterialIcon name={item.open?'expand_less':'expand_more'} size={22}/></div>
      </button>
      {item.open&&<div className="roadmap-milestone-details"><ul>{item.items.map(point=><li key={point}><MaterialIcon name="check_circle" size={17}/>{point}</li>)}</ul>{item.note&&<p className="roadmap-note"><MaterialIcon name="info" size={16}/>{item.note}</p>}{item.link&&<a className="roadmap-source-link" href={item.link} target="_blank" rel="noopener noreferrer"><MaterialIcon name="open_in_new" size={15}/> View supporting GitHub commit</a>}</div>}
     </div>
    </article>)}
   </div>
   <p className="roadmap-history-footnote"><MaterialIcon name="info" size={15}/> The original Side-Quote-Generator repository was deleted, so its earliest commit and first deployment timestamp cannot currently be independently verified. The start period is shown as September 2026 or earlier based on the project history, not as an invented exact date.</p>
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
   <div><div className="about-kicker">THE PRINCIPLE</div><h2>Useful first. Better every day.</h2><p>APML Portal grew because one useful tool led to another. Every next step should make the workspace more reliable, connected or easier to use. Completed milestones are described as recorded work; ongoing tasks remain clearly marked as in progress.</p></div>
   <a href="https://github.com/kundarwork-debug/APML-Portal" target="_blank" rel="noopener noreferrer" className="about-btn"><MaterialIcon name="code" size={17}/> View project <MaterialIcon name="open_in_new" size={15}/></a>
  </section>
 </main>
}
