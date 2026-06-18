const CACHE_NAME = 'qr-menu-cache-v1';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './menu.html',
  './item.html',
  './cart.html',
  './order-status.html',
  './kitchen.html',
  './admin.html',
  './css/global.css',
  './js/config.js',
  './js/utils.js',
  './js/qrcode.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Allow WebSocket or non-http protocols to bypass
  if (!url.protocol.startsWith('http')) return;

  // Bypass Supabase database queries and auth endpoints to guarantee fresh dynamic data
  if (url.hostname.includes('supabase.co')) {
    return;
  }

  // Caching Strategy:
  // - Images: Cache-First
  // - Everything else (HTML, CSS, JS, Fonts): Stale-While-Revalidate
  const isImage = event.request.destination === 'image' || 
                  url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/i);

  if (isImage) {
    // Cache-First strategy for images
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Fallback for missing images offline
            return new Response('<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><rect width="100%" height="100%" fill="#1a1a1a"/><text x="50%" y="50%" fill="#555" font-family="sans-serif" font-size="14" text-anchor="middle" dominant-baseline="middle">Offline</text></svg>', {
              headers: { 'Content-Type': 'image/svg+xml' }
            });
          });
        });
      })
    );
  } else {
    // Stale-While-Revalidate strategy for HTML, JS, CSS, and CDNs
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch((err) => {
            // If completely offline and not in cache, fallback gracefully for HTML pages
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return cache.match('./menu.html') || cache.match('./index.html');
            }
            throw err;
          });

          // Return cached response instantly if we have it, otherwise wait for network fetch
          return cachedResponse || fetchPromise;
        });
      })
    );
  }
});
