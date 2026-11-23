// Katekize's service worker. It exists so the app can be installed and so a dropped connection shows a friendly page
// instead of a browser error. It does not cache the app or your progress: everything else goes straight to the network.
const OFFLINE = '/heir/offline.html';
const CACHE = 'katekize-offline-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, '/heir/icon-192.png'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  // The offline page's own icon comes from the cache.
  if (new URL(req.url).pathname === '/heir/icon-192.png') { event.respondWith(caches.match(req).then((hit) => hit || fetch(req))); return; }
  if (req.mode !== 'navigate') return;
  event.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
});
