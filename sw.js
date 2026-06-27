'use strict';

const CACHE = 'owls-academy-v2';

const PRECACHE = [
  './css/main.css',
  './js/blocks.js',
  './js/srs.js',
  './js/progress.js',
  './js/offline.js',
  './js/tts.js',
  './js/admin-blocks.js',
  './js/supabase-client.js',
  './icons/icon.svg',
  './manifest.json',
];

// Pre-cache static assets on install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Remove old caches on activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Don't intercept cross-origin (Supabase API, CDN, Google Fonts)
  if (url.origin !== self.location.origin) return;

  // HTML navigation: network-first → cache fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }

  // Static assets (CSS, JS, icons): cache-first → network + cache update
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        return res;
      });
    })
  );
});
