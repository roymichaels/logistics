// Logistics App Service Worker
const CACHE_NAME = 'logistics-app-v1';
const OFFLINE_CACHE = 'logistics-offline-v1';

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/images/icon.png',
  '/assets/images/favicon.png',
  // Add more static assets as needed
];

// API endpoints that can work offline
const OFFLINE_ENDPOINTS = [
  '/api/tasks',
  '/api/orders',
  '/api/users',
  '/api/products'
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');

  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME && cacheName !== OFFLINE_CACHE)
            .map(cacheName => {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    if (isStaticAsset(url.pathname)) {
      // Serve static assets from cache first, fallback to network
      event.respondWith(cacheFirst(request));
    } else if (isAPIRequest(url.pathname)) {
      // API requests: network first, fallback to cache
      event.respondWith(networkFirst(request));
    } else {
      // Other requests: cache first with network fallback
      event.respondWith(cacheFirst(request));
    }
  } else if (request.method === 'POST' || request.method === 'PUT' || request.method === 'DELETE') {
    // Handle write operations when offline
    event.respondWith(handleWriteOperation(request));
  }
});

// Push event - handle push notifications
self.addEventListener('push', event => {
  console.log('Service Worker: Push event received');

  let notificationData = {
    title: 'התראה חדשה',
    body: 'יש לך התראה חדשה מהמערכת',
    icon: '/assets/images/icon.png',
    badge: '/assets/images/badge.png',
    tag: 'default',
    data: {},
    actions: []
  };

  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = { ...notificationData, ...pushData };
    } catch (error) {
      console.error('Service Worker: Failed to parse push data', error);
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: notificationData.actions,
      vibrate: [200, 100, 200],
      requireInteraction: notificationData.data?.priority === 'high'
    })
  );
});

// Notification click event
self.addEventListener('notificationclick', event => {
  console.log('Service Worker: Notification clicked');

  event.notification.close();

  const action = event.action;
  const data = event.notification.data;

  if (action) {
    // Handle notification action buttons
    event.waitUntil(handleNotificationAction(action, data));
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clientList => {
          // If app is already open, focus it
          for (const client of clientList) {
            if (client.url.includes(self.location.origin)) {
              return client.focus();
            }
          }
          // Otherwise, open new window
          return clients.openWindow('/');
        })
    );
  }
});

// Background sync for offline operations
self.addEventListener('sync', event => {
  console.log('Service Worker: Background sync event', event.tag);

  if (event.tag === 'offline-operations') {
    event.waitUntil(syncOfflineOperations());
  }
});

// Helper functions

function isStaticAsset(pathname) {
  return pathname.startsWith('/assets/') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.ico');
}

function isAPIRequest(pathname) {
  return pathname.startsWith('/api/') ||
         pathname.includes('supabase.co') ||
         pathname.includes('/functions/');
}

// Cache first strategy
async function cacheFirst(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      // Update cache in background
      fetch(request).then(response => {
        if (response.status === 200) {
          cache.put(request, response.clone());
        }
      }).catch(() => {}); // Ignore network errors

      return cachedResponse;
    }

    // Not in cache, try network
    const response = await fetch(request);

    if (response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.error('Service Worker: Cache first strategy failed', error);
    return new Response('Offline - Content not available', { status: 503 });
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    if (response.status === 200) {
      // Cache successful responses
      const cache = await caches.open(OFFLINE_CACHE);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache');

    // Network failed, try cache
    const cache = await caches.open(OFFLINE_CACHE);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'החבירה לאינטרנט לא זמינה',
        offline: true,
        timestamp: new Date().toISOString()
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );
  }
}

// Handle write operations when offline
async function handleWriteOperation(request) {
  try {
    // Try network first
    return await fetch(request);
  } catch (error) {
    console.log('Service Worker: Write operation failed, storing for later sync');

    // Store for background sync
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.text(),
      timestamp: Date.now()
    };

    // Store in IndexedDB for background sync
    await storeOfflineOperation(requestData);

    // Register background sync
    await self.registration.sync.register('offline-operations');

    return new Response(
      JSON.stringify({
        success: true,
        offline: true,
        message: 'הפעולה נשמרה ותתבצע כשהחבור לאינטרנט יתחזר',
        timestamp: new Date().toISOString()
      }),
      {
        status: 202,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

// Handle notification actions
async function handleNotificationAction(action, data) {
  const clients = await self.clients.matchAll({ type: 'window' });

  switch (action) {
    case 'view':
      // Open specific page based on notification data
      const url = data.url || '/';
      if (clients.length > 0) {
        await clients[0].navigate(url);
        return clients[0].focus();
      } else {
        return self.clients.openWindow(url);
      }

    case 'complete':
      // Send completion request
      if (data.taskId) {
        try {
          await fetch('/api/tasks/' + data.taskId + '/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Failed to complete task:', error);
        }
      }
      break;

    case 'dismiss':
      // Just close notification
      break;

    default:
      console.log('Unknown notification action:', action);
  }
}

// IndexedDB operations for offline functionality
async function storeOfflineOperation(operation) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LogisticsOffline', 1);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('operations')) {
        db.createObjectStore('operations', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = event => {
      const db = event.target.result;
      const transaction = db.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');

      store.add(operation);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}

// Sync offline operations when back online
async function syncOfflineOperations() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LogisticsOffline', 1);

    request.onsuccess = async event => {
      const db = event.target.result;
      const transaction = db.transaction(['operations'], 'readonly');
      const store = transaction.objectStore('operations');

      const operations = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      // Process each operation
      for (const operation of operations) {
        try {
          const response = await fetch(operation.url, {
            method: operation.method,
            headers: operation.headers,
            body: operation.body
          });

          if (response.ok) {
            // Remove successful operation
            await removeOfflineOperation(operation.id);
            console.log('Service Worker: Synced offline operation', operation.id);
          }
        } catch (error) {
          console.error('Service Worker: Failed to sync operation', operation.id, error);
        }
      }

      db.close();
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
}

async function removeOfflineOperation(id) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('LogisticsOffline', 1);

    request.onsuccess = event => {
      const db = event.target.result;
      const transaction = db.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');

      store.delete(id);

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = () => {
        db.close();
        reject(transaction.error);
      };
    };
  });
}