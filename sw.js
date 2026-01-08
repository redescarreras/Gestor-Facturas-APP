const CACHE_NAME = 'gestor-facturas-v1';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './logo-redes_Transparente-216x216.png',
        './manifest.json'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  // Solo manejar solicitudes GET
  if (event.request.method !== 'GET') return;
  
  event.respondWith(
    caches.match(event.request).then(response => {
      // Si está en cache, devolverlo
      if (response) return response;
      
      // Si no está en cache, intentar fetch
      return fetch(event.request).then(fetchResponse => {
        // Solo cachear respuestas válidas
        if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
          return fetchResponse;
        }
        
        // Clonar la respuesta porque solo se puede usar una vez
        const responseToCache = fetchResponse.clone();
        
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return fetchResponse;
      }).catch(() => {
        // Si falla el fetch y es navegación, devolver index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  clients.claim();
});
