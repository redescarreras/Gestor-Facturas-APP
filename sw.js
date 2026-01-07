const CACHE_NAME = 'gestor-facturas-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/logo-redes_Transparente-216x216.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
