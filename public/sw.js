// Imperial Trading Platform Service Worker
// Optimized for mobile trading app experience

const CACHE_NAME = 'imperial-trading-v1.2.0';
const STATIC_CACHE = 'imperial-static-v1.2.0';
const DYNAMIC_CACHE = 'imperial-dynamic-v1.2.0';
const API_CACHE = 'imperial-api-v1.2.0';

// Critical files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/favicon.ico',
  '/apple-touch-icon.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png'
];

// API endpoints to cache with strategy
const API_PATTERNS = [
  /\/api\/signals/,
  /\/api\/education/,
  /\/api\/market-status/,
  /\/api\/portfolio/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and chrome-extension requests
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests with appropriate strategies
  if (url.pathname.startsWith('/api/')) {
    // API requests - Network first with cache fallback
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(url.pathname)) {
    // Static assets - Cache first
    event.respondWith(handleStaticAsset(request));
  } else {
    // Navigation requests - Network first with cache fallback
    event.respondWith(handleNavigationRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for API request, trying cache:', request.url);
    
    // Fallback to cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for critical endpoints
    if (request.url.includes('/api/market-status')) {
      return new Response(JSON.stringify({
        status: 'offline',
        message: 'Market data unavailable offline'
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    throw error;
  }
}

// Handle static assets with cache-first strategy
async function handleStaticAsset(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('[SW] Failed to fetch static asset:', request.url);
    throw error;
  }
}

// Handle navigation requests
async function handleNavigationRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for navigation, trying cache:', request.url);
    
    // Try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fallback to offline page for navigation requests
    const offlineResponse = await cache.match('/');
    if (offlineResponse) {
      return offlineResponse;
    }
    
    throw error;
  }
}

// Check if URL is a static asset
function isStaticAsset(pathname) {
  const staticExtensions = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.ico', '.woff', '.woff2'];
  return staticExtensions.some(ext => pathname.endsWith(ext)) || 
         pathname.includes('/assets/') ||
         pathname.includes('/static/');
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'trade-sync') {
    event.waitUntil(syncTradeActions());
  } else if (event.tag === 'portfolio-sync') {
    event.waitUntil(syncPortfolioUpdates());
  }
});

// Sync trade actions when back online
async function syncTradeActions() {
  try {
    // Get pending actions from IndexedDB (would need to implement)
    console.log('[SW] Syncing trade actions...');
    // Implementation would sync queued trades/journal entries
  } catch (error) {
    console.error('[SW] Failed to sync trade actions:', error);
  }
}

// Sync portfolio updates when back online
async function syncPortfolioUpdates() {
  try {
    console.log('[SW] Syncing portfolio updates...');
    // Implementation would sync portfolio changes
  } catch (error) {
    console.error('[SW] Failed to sync portfolio updates:', error);
  }
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const options = {
    body: 'New trading signal available',
    icon: '/android-chrome-192x192.png',
    badge: '/favicon-32x32.png',
    data: {
      url: '/dashboard/signals'
    },
    actions: [
      {
        action: 'view',
        title: 'View Signal'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    requireInteraction: true,
    vibrate: [100, 50, 100]
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;
      options.data = { ...options.data, ...data };
    } catch (error) {
      console.log('[SW] Failed to parse push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification('Imperial Trading', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    const urlToOpen = event.notification.data?.url || '/dashboard';
    
    event.waitUntil(
      clients.matchAll({ type: 'window' })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url.includes(urlToOpen) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Open new window if app not open
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  }
});

// Share target handling for PWA
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHARE_TARGET') {
    console.log('[SW] Share target received:', event.data);
    // Handle shared content (e.g., trade screenshots, market analysis)
  }
});

console.log('[SW] Service Worker loaded and ready');