const CACHE_NAME = 'snk-cache-v138';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/app.js',
  '/logo.jpg',
  '/schedule.html',
  '/css/schedule.css',
  '/js/schedule.js'
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
  event.respondWith(
    fetch(event.request.method === 'GET' ? new Request(event.request.url, { cache: 'reload' }) : event.request)
      .then(response => {
        // Network first: if success, put a copy in cache
        if (response && response.status === 200) {
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
