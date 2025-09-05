// Trade Imperial - Service Worker for PWA and Push Notifications
// Version: 1.1.0

const CACHE_NAME = 'trade-imperial-v2';
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/favicon-16x16.png',
  '/favicon-32x32.png'
];

// Import OneSignal SDK for push notifications
importScripts('https://cdn.onesignal.com/sdks/OneSignalSDK.js');

// Install Event - Cache essential resources
self.addEventListener('install', (event) => {
  console.log('Trade Imperial SW: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Trade Imperial SW: Caching essential resources');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => {
        console.log('Trade Imperial SW: Install complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Trade Imperial SW: Install failed', error);
      })
  );
});

// Activate Event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Trade Imperial SW: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Trade Imperial SW: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Trade Imperial SW: Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch Event - Network-first strategy with cache fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  // Network-first strategy for API calls
  if (request.url.includes('/api/') || request.url.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // If network fails, return a custom offline response for API calls
          return new Response(
            JSON.stringify({ error: 'Offline - Unable to fetch data' }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }
  
  // Cache-first strategy for static assets
  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        
        return fetch(request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response for caching
            const responseToCache = response.clone();
            
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(request, responseToCache);
              });
            
            return response;
          })
          .catch(() => {
            // Return offline page for navigation requests
            if (request.destination === 'document') {
              return caches.match('/offline.html');
            }
          });
      })
  );
});

// Push Event - Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('Trade Imperial SW: Push notification received', event);
  
  if (!event.data) {
    console.log('Trade Imperial SW: Push event but no data');
    return;
  }
  
  const data = event.data.json();
  const options = {
    body: data.body || 'New trading alert available',
    icon: data.icon || '/apple-touch-icon.png',
    badge: '/favicon-32x32.png',
    image: data.image,
    tag: data.tag || 'trade-alert',
    data: {
      url: data.url || '/dashboard/signal-stream',
      alertId: data.alertId,
      signalId: data.signalId,
      urgency: data.urgency || 'normal'
    },
    actions: data.actions || [
      {
        action: 'view',
        title: 'View Signal',
        icon: '/favicon-16x16.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/favicon-16x16.png'
      }
    ],
    requireInteraction: data.urgency === 'critical',
    silent: false,
    vibrate: data.urgency === 'critical' ? [200, 100, 200, 100, 200] : [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Trade Imperial Alert', options)
  );
});

// Notification Click Event - Handle notification interactions
self.addEventListener('notificationclick', (event) => {
  console.log('Trade Imperial SW: Notification clicked', event);
  
  const { notification, action } = event;
  const data = notification.data || {};
  
  notification.close();
  
  if (action === 'dismiss') {
    console.log('Trade Imperial SW: Notification dismissed');
    return;
  }
  
  // Default action or 'view' action
  const urlToOpen = data.url || '/dashboard/signal-stream';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a Trade Imperial window open
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            // Focus existing window and navigate to the URL
            client.focus();
            client.postMessage({
              type: 'NAVIGATE',
              url: urlToOpen,
              alertData: data
            });
            return;
          }
        }
        
        // No existing window, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Background Sync Event - Handle offline actions
self.addEventListener('sync', (event) => {
  console.log('Trade Imperial SW: Background sync triggered', event.tag);
  
  if (event.tag === 'background-alert-sync') {
    event.waitUntil(
      // Handle queued alerts when back online
      syncPendingAlerts()
    );
  }
});

// Sync pending alerts when connection is restored
async function syncPendingAlerts() {
  try {
    // This would integrate with your existing alert queue system
    console.log('Trade Imperial SW: Syncing pending alerts...');
    
    // Implementation would check IndexedDB for queued alerts
    // and attempt to deliver them when connection is restored
    
  } catch (error) {
    console.error('Trade Imperial SW: Failed to sync pending alerts', error);
  }
}

// Message Event - Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('Trade Imperial SW: Message received', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('Trade Imperial Service Worker loaded successfully');