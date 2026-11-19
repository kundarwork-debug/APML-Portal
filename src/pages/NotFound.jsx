import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <section className="not-found-page" aria-labelledby="not-found-title">
      <div className="not-found-content">
        <img
          className="not-found-illustration"
          src="/other/undraw_page-eaten_b2rt.svg"
          alt="An illustration representing a page that could not be found"
        />
        <p className="not-found-code">404</p>
        <h1 id="not-found-title">Page Not Found</h1>
        <p className="not-found-description">
          The page you’re looking for may have moved, been removed, or is temporarily unavailable.
        </p>
        <Link to="/" className="not-found-home">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to Home
        </Link>
      </div>
    </section>
  )
}
