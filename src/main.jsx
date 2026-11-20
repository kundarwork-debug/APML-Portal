import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './styles.css'
import './design-system.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)

// Register a network-only service worker. It never intercepts requests,
// so refreshes and deep links are handled by the hosting platform directly.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const workerUrl = new URL('sw.js', window.location.origin + import.meta.env.BASE_URL)
      const registration = await navigator.serviceWorker.register(workerUrl.href, {
        scope: import.meta.env.BASE_URL,
        updateViaCache: 'none'
      })
      await registration.update()
    } catch (error) {
      console.warn('APML service worker registration skipped:', error)
    }
  }, { once: true })
}
