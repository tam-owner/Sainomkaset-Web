const CACHE_NAME = 'sainom-v256';
const urlsToCache = [
  '/',
  '/index.html',
  '/maintemp.html',
  '/checklist.html',
  '/stock.html',
  '/admin.html',
  '/accounting.html',
  '/schedule.html',
  '/attendance.html',
  '/logo.jpg',
  '/logo-admin.jpg',
  '/manifest.json',
  '/manifest-admin.json',
  '/js/app.js',
  '/js/admin.js',
  '/js/accounting.js',
  '/js/schedule.js',
  '/css/styles.css',
  'https://cdn.tailwindcss.com',
  'https://cdn.jsdelivr.net/npm/chart.js',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Force the new service worker to activate immediately
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return Promise.all(urlsToCache.map(url => {
          return fetch(new Request(url, { cache: 'reload' })).then(res => {
            if (res.ok) {
              return cache.put(url, res);
            }
          }).catch(err => console.log('Cache fetch error', err));
        }));
      })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Bypass cross-origin requests (e.g. Tailwind CDN, Firebase APIs, Google Fonts)
  if (url.origin !== location.origin) {
    return;
  }

  const req = event.request;

  event.respondWith(
    fetch(req)
      .then(response => {
        // Network first: if success (including opaque responses), put a copy in cache
        if (response && (response.status === 200 || response.type === 'opaque')) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request);
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
