import React from 'react'
import './StateViews.css'

export function EmptyState({ className = '', illustration, title, description, children }) {
  return (
    <div className={className || 'apml-empty-state'}>
      {illustration && <img className="apml-empty-illustration" src={illustration} alt="" loading="lazy" />}
      {title && <strong>{title}</strong>}
      {description && <span>{description}</span>}
      {children}
    </div>
  )
}

export function ErrorState({ title = 'Something went wrong', description = 'Please try again.', onRetry, className = '' }) {
  return (
    <section className={className || 'apml-state-error'} role="alert">
      <strong>{title}</strong>
      <p>{description}</p>
      {onRetry && <button type="button" onClick={onRetry}>Try again</button>}
    </section>
  )
}

export function LoadingState({ title = 'Loading', description, count = 3, className = '' }) {
  return (
    <section className={className || 'apml-state-loading'} role="status" aria-busy="true">
      {title && <strong>{title}</strong>}
      {description && <span>{description}</span>}
      <div className="apml-state-skeleton-list">
        {Array.from({ length: count }, (_, index) => <div className="apml-state-skeleton" key={index} />)}
      </div>
    </section>
  )
}
