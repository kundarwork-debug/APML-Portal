import { Link } from 'react-router-dom'
import { ArrowLeft, Home } from 'lucide-react'
import './NotFound.css'

export default function NotFound() {
  return (
    <main className="not-found-page">
      <div className="nf-background-glow" aria-hidden="true" />
      <section className="nf-content">
        <img
          className="nf-illustration"
          src={import.meta.env.BASE_URL + 'assets/empty-states/undraw_throw-away_aaho.svg'}
          alt="Illustration representing a page that cannot be found"
          width="480"
          height="364"
        />
        <div className="nf-code" aria-label="Error 404">404</div>
        <span className="nf-kicker">PAGE NOT FOUND</span>
        <h1>Looks like we took a wrong turn.</h1>
        <p>The page you’re looking for may have moved, been removed, or never existed.</p>
        <div className="nf-actions">
          <Link className="nf-primary" to="/"><Home size={16} /> Back to APML Home</Link>
          <button className="nf-secondary" type="button" onClick={() => window.history.back()}><ArrowLeft size={16} /> Go back</button>
        </div>
      </section>
      <footer className="nf-signoff">APML PORTAL <span>•</span> HERE TO HELP</footer>
    </main>
  )
}
