/*
 * APML Portal service worker — network-only baseline.
 *
 * This worker deliberately does not intercept fetch requests and does not
 * cache HTML, JavaScript, CSS, API responses, or navigation requests.
 * It exists only to preserve PWA installation support while eliminating
 * stale-shell and deep-link refresh problems.
 */
const WORKER_VERSION = 'apml-network-only-v1';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((name) => name.startsWith('apml-portal-'))
        .map((name) => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

// Intentionally no "fetch" event listener.
// Every request uses the browser's normal network and hosting fallback.
