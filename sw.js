// sw.js — Athar Digital Studio: minimal, safe service worker for the static
// marketing site (backs the PWA install prompt / site.webmanifest).
//
// Safety rules baked into the fetch handler below:
//   - Only same-origin GET requests are ever intercepted.
//   - Supabase (csodtfvmoplgsjedtast.supabase.co), EmailJS, Google Fonts and
//     jsDelivr are all on other origins, so they're never touched here —
//     they always go straight to the network, never cached.
//   - Non-GET requests (the contact form's Supabase insert is a POST) are
//     never intercepted either, so nothing about form submission changes.
//
// Versioning convention (static assets are served cache-first below):
//   - Bump CACHE_NAME on every release that changes any cached same-origin
//     file in place (images, icons, manifest, anything precached). Activation
//     then deletes every older cache, including files the site no longer uses.
//   - Future Signal modules and vendored libraries must live under immutable,
//     versioned paths, e.g. /signal/v1/core.js or /vendor/three/r<rev>/…
//     A published versioned path never changes content; a change ships under
//     a new version folder, so cache-first can never serve a stale module.
const CACHE_NAME = 'athar-static-v2';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/site.webmanifest',
  '/favicon.ico',
  '/images/athar-mark-16.png',
  '/images/athar-mark-32.png',
  '/images/athar-mark-48.png',
  '/images/athar-mark-180.png',
  '/images/athar-mark-192.png',
  '/images/athar-mark-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  let url;
  try {
    url = new URL(request.url);
  } catch (e) {
    return;
  }
  if (url.origin !== self.location.origin) return;
  // Athar Lab (/lab/) is its own site, proxied from a separate deployment: never cached or
  // answered here (no cache-first assets, no main-site offline fallback), always the network.
  if (url.pathname === '/lab' || url.pathname.startsWith('/lab/')) return;

  const isHTML = request.mode === 'navigate' ||
    (request.headers.get('accept') || '').includes('text/html');

  if (isHTML) {
    // Network-first for the page itself, so visitors never get stuck on a
    // stale cached copy of the site while online — cache is only a fallback.
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only successful pages become the offline fallback, never a 404/500.
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Cache-first for static assets (images/icons/manifest) — fast repeat
  // visits, safe because none of this is sensitive or user-specific data.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
