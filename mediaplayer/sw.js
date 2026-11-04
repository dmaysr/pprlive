/* Primetime Power Radio – app service worker
   Caches only the player shell so the app opens instantly.
   The live stream and now-playing data are NEVER cached, so audio is always real time. */
const VERSION = 'ppr-player-v3';
const SHELL = [
  './pprmediaplayerfull.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png',
  './offline.html'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Live audio + station info: always straight from the network, never touched.
  if (url.hostname.includes('sonicpanel') || req.destination === 'audio' || req.headers.has('range')) return;

  // The player page: network first (picks up your updates), cached copy if offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./pprmediaplayerfull.html', copy)); return res; })
        .catch(() => caches.match('./pprmediaplayerfull.html').then(r => r || caches.match('./offline.html')))
    );
    return;
  }

  // Same-origin shell files: cache first.
  if (url.origin === location.origin) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(r => r || fetch(req)));
  }
});
