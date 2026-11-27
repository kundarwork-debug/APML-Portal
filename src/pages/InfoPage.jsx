import './InfoPage.css'

function MaterialIcon({name,size=20}){return <span className="material-symbols-rounded about-material-icon" aria-hidden="true" style={{fontSize:size}}>{name}</span>}

const technologies = ['React','Vite','Firebase','Cloudflare','Vercel']

export default function InfoPage(){
 return <main className="about-page product-about">
  <section className="product-about-hero">
   <div className="product-about-copy">
    <div className="about-eyebrow"><MaterialIcon name="grid_view" size={16}/> ABOUT THE PROJECT</div>
    <h1>About <span>APML Portal.</span></h1>
    <p className="about-lead">A connected digital workspace bringing essential APML tools and everyday workflows together in one place.</p>
    <div className="product-about-credit"><span className="product-about-avatar"><MaterialIcon name="person" size={21}/></span><span><small>INDEPENDENTLY BUILT BY</small><strong>Prasad Kundar</strong></span><a href="https://github.com/kundarwork-debug" target="_blank" rel="noopener noreferrer" aria-label="Prasad Kundar on GitHub"><MaterialIcon name="open_in_new" size={17}/></a></div>
   </div>
   <div className="product-about-art"><div className="product-about-glow"/><img src={import.meta.env.BASE_URL+'other/undraw_programming_j1zw.svg'} alt="Illustration representing APML Portal"/></div>
  </section>

  <section className="product-about-story">
   <div className="about-kicker">THE STORY</div>
   <h2>From a simple idea<br/><span>to a practical workspace.</span></h2>
   <p>APML Portal began as a small standalone quotation tool in 2026. As more everyday needs emerged, it grew into a collection of connected tools for quotations, operations, files and information—brought together under one workspace.</p>
  </section>

  <section className="product-about-tech">
   <div><div className="about-kicker">BUILT WITH</div><h2>Technology that brings it together.</h2></div>
   <div className="product-about-tech-list">{technologies.map(name=><span key={name}>{name}</span>)}</div>
  </section>

  <section className="product-about-principle">
   <span className="product-about-principle-icon"><MaterialIcon name="auto_awesome" size={27}/></span>
   <div><div className="about-kicker">THE PHILOSOPHY</div><h2>Built for practical use. Designed to last.</h2><p>Reliable tools, simple experiences and thoughtful improvements—without change for the sake of change.</p></div>
  </section>
  <footer className="product-about-footer">APML Portal <span>·</span> An independent project by <a href="https://github.com/kundarwork-debug" target="_blank" rel="noopener noreferrer">Prasad Kundar</a></footer>
 </main>
}
