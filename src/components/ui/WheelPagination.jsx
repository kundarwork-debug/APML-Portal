import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './wheel-pagination.css'

/**
 * Shared APML pagination control.
 * Pages are 1-based to match the rest of the portal.
 */
export default function WheelPagination({ totalPages = 1, visibleCount = 5, className = '', currentPage, onChange, summary = '' }) {
  const safeTotal = Math.max(1, Math.floor(Number(totalPages) || 1))
  const controlled = Number.isFinite(currentPage)
  const [internalPage, setInternalPage] = useState(1)
  const active = Math.min(safeTotal, Math.max(1, controlled ? currentPage : internalPage))
  const containerRef = useRef(null)

  useEffect(() => {
    if (!controlled) setInternalPage(page => Math.min(safeTotal, Math.max(1, page)))
  }, [controlled, safeTotal])

  const changePage = next => {
    const value = Math.min(safeTotal, Math.max(1, next))
    if (!controlled) setInternalPage(value)
    if (value !== active) onChange?.(value)
  }
  const visiblePages = useMemo(() => {
    const count = Math.min(safeTotal, Math.max(1, Math.floor(visibleCount) || 5))
    const left = Math.floor((count - 1) / 2)
    let start = Math.max(1, active - left)
    let end = Math.min(safeTotal, start + count - 1)
    start = Math.max(1, end - count + 1)
    return Array.from({ length: end - start + 1 }, (_, index) => start + index)
  }, [active, safeTotal, visibleCount])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const handleWheel = event => {
      if (Math.abs(event.deltaY) < 2) return
      event.preventDefault()
      changePage(active + (event.deltaY > 0 ? 1 : -1))
    }
    element.addEventListener('wheel', handleWheel, { passive: false })
    return () => element.removeEventListener('wheel', handleWheel)
  }, [active, safeTotal, controlled])

  if (safeTotal <= 1) return null

  return <nav ref={containerRef} className={`apml-wheel-pagination ${className}`} aria-label="Pagination" aria-live="polite">
    <button className="apml-wheel-arrow" type="button" onClick={() => changePage(active - 1)} disabled={active <= 1} aria-label="Previous page" title="Previous page">
      <ChevronLeft size={19}/>
    </button>
    <div className="apml-wheel-pages" aria-label="Choose page">
      {visiblePages.map(page => <button key={page} type="button" className={`apml-wheel-page ${active === page ? 'is-active' : ''}`} onClick={() => changePage(page)} aria-current={active === page ? 'page' : undefined} aria-label={`Page ${page}`}>
        {page}
      </button>)}
    </div>
    <button className="apml-wheel-arrow" type="button" onClick={() => changePage(active + 1)} disabled={active >= safeTotal} aria-label="Next page" title="Next page">
      <ChevronRight size={19}/>
    </button>
    <span className="apml-wheel-summary">Page <strong>{active}</strong> of {safeTotal}{summary ? ` · ${summary}` : ''}</span>
  </nav>
}
