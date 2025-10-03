// Simple pass-through service worker - no caching
console.log('Service Worker: Loading...');

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activated');
  event.waitUntil(self.clients.claim());
});

// Pass through all requests without caching
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
