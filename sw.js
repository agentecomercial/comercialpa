// Service Worker para PWA - Agente Comercial Febracis
// v81 — guard null em todos os filtros de data[]
const CACHE_NAME = 'agente-febracis-v81';
const URLS = [
  './agente-comercial.html',
  './manifest.json',
  './js/data/treinamentos.js',
  './js/data/playbook-spin-tour.js',
  './js/data/perfis-treino.js'
  // api-key.js NÃO entra no cache (não está no git e pode mudar)
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((c) => c.addAll(URLS)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Network-first: tenta a rede primeiro, cai pro cache se offline.
// Garante que o HTML atualizado sempre seja servido quando online.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then((c) => c.put(e.request, copy)).catch(() => {});
        return resp;
      })
      .catch(() => caches.match(e.request))
  );
});
