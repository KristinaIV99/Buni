const CACHE_NAME = 'mpd-v4'; // Atnaujintas versijos numeris
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './main.css',
  './text-reader.js',
  './text-normalizer.js',
  './html-converter.js',
  './text-paginator.js',
  './main.js',
  './aho-corasick.js',
  './dictionary-manager.js',
  './text-statistics.js',
  './unknown-words-exporter.js',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/favicon.ico',
  './vendor/marked.esm.js',   
  './vendor/purify.es.mjs',
  './text-highlighter.js',
  './text-selection-handler.js',
  './words.json',
  './phrases.json',
  './state-manager.js'
];

const SW_NAME = '[ServiceWorker]';

const handleError = (error) => {
  console.error(`${SW_NAME} Error:`, error);
  return new Response('Offline content not available', {
    status: 404,
    headers: { 'Content-Type': 'text/plain' }
  });
};

self.addEventListener('install', (e) => {
  console.debug(`${SW_NAME} Installing service worker...`);
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.debug(`${SW_NAME} Caching static assets...`);
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(handleError)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.debug(`${SW_NAME} Activating service worker...`);
  e.waitUntil(
    caches.keys()
      .then((keys) => {
        console.debug(`${SW_NAME} Found caches:`, keys);
        return Promise.all(
          keys.filter((key) => key !== CACHE_NAME)
            .map((key) => {
              console.debug(`${SW_NAME} Deleting old cache:`, key);
              return caches.delete(key);
            })
        );
      })
      .then(() => self.clients.claim())
      .catch(handleError)
  );
});

self.addEventListener('fetch', (e) => {
  // API užklausos
  if (e.request.url.includes('/api/')) {
    console.debug(`${SW_NAME} Handling API request:`, e.request.url);
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const fetchPromise = fetch(e.request)
          .then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME)
                .then((cache) => cache.put(e.request, clone))
                .catch((err) => console.error(`${SW_NAME} Cache put error:`, err));
            }
            return response;
          })
          .catch(() => cached || handleError(new Error('API unreachable')));
        return cached || fetchPromise;
      })
    );
  }
  
  // .md ir .json failai
  else if (e.request.url.endsWith('.md') || e.request.url.endsWith('.json')) {
    console.debug(`${SW_NAME} Handling MD/JSON file request:`, e.request.url);
    e.respondWith(
      caches.match(e.request)
        .then((response) => response || fetch(e.request))
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => cache.put(e.request, clone))
              .catch((err) => console.error(`${SW_NAME} Cache put error:`, err));
          }
          return response;
        })
        .catch(handleError)
    );
  }
  
  // Statiniai resursai
  else {
    console.debug(`${SW_NAME} Handling static asset request:`, e.request.url);
    e.respondWith(
      caches.match(e.request)
        .then((response) => response || fetch(e.request))
        .catch(handleError)
    );
  }
});
