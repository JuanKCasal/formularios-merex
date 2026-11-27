/* Service worker: deja la app disponible sin conexión.
   IMPORTANTE: al publicar cambios, sube VERSION (y APP_VERSION en js/config.js). */
const VERSION = 'v1.1.0';
const CACHE = 'formularios-merex-' + VERSION;

const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/config.js',
  'js/util.js',
  'js/storage.js',
  'js/engine.js',
  'js/signature.js',
  'js/ui.js',
  'js/photos.js',
  'js/forms/registry.js',
  'js/forms/cerezas/schema.js',
  'js/forms/cerezas/fields.js',
  'js/forms/cerezas/compute.js',
  'js/forms/cerezas/pdf.js',
  'js/forms/cerezas/tolerancias.js',
  'vendor/jspdf.umd.min.js',
  'img/logo_merex.svg',
  'img/logo_merex.png',
  'icons/icon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('formularios-merex-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navegación: siempre la página principal (la app usa rutas con #)
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.match('index.html').then((cached) => cached || fetch(req))
    );
    return;
  }

  // Recursos: primero caché, si no, red (y se guarda copia)
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
