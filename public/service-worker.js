const CACHE_NAME = 'pos-cache-v2'; // 1. Bump version to clear old caches
const STATIC_ASSETS = ['/manifest.json', '/favicon.svg'];

// Install: Cache core static shell (skip index.html)
self.addEventListener('install', event => {
  self.skipWaiting(); // Force new service worker to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: Delete old caches (v1) instantly
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all open pages immediately
  );
});

// Fetch: Network-First for HTML/navigation, Cache-First for versioned assets
self.addEventListener('fetch', event => {
  const request = event.request;

  // Handle HTML navigation (index.html) -> Always fetch from Network first
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/index.html')) // Fallback to offline cache ONLY if network fails
    );
    return;
  }

  // Handle JS / CSS / Static Assets -> Try cache, fall back to network
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(request);
    })
  );
});