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

// Enhanced push notification handling for trading alerts
self.addEventListener('push', (event) => {
  console.log('[SW] Trading notification received');
  
  let notificationData = null;
  let title = 'Imperial Trading';
  let body = 'New trading alert';
  let icon = '/android-chrome-192x192.png';
  let badge = '/favicon-32x32.png';
  let url = '/dashboard';
  let vibrate = [100, 50, 100];
  let requireInteraction = true;
  let tag = 'trading-alert';
  let actions = [];

  // Parse notification data
  if (event.data) {
    try {
      notificationData = event.data.json();
      console.log('[SW] Parsed notification data:', notificationData);
    } catch (error) {
      console.error('[SW] Failed to parse notification data:', error);
    }
  }

  if (notificationData) {
    // Enhanced trading notification formatting
    const alertType = notificationData.notification_type || notificationData.alert_type;
    const assetName = notificationData.asset_name || 'Asset';
    const price = notificationData.triggered_price || notificationData.target_price;
    const signalId = notificationData.signal_id;

    // Set title and body based on alert type
    switch (alertType) {
      case 'signal_created':
        title = `🚀 New ${assetName} Signal`;
        body = `${notificationData.trade_type?.toUpperCase()} at ${price}`;
        url = signalId ? `/dashboard/signal-stream?signal=${signalId}` : '/dashboard/signal-stream';
        vibrate = [200, 100, 200];
        tag = 'new-signal';
        actions = [
          { action: 'view', title: '👀 View Signal' },
          { action: 'dismiss', title: '✖️ Dismiss' }
        ];
        break;

      case 'take_profit_1':
      case 'take_profit_2':
      case 'take_profit_3':
      case 'take_profit_4':
      case 'take_profit_5':
      case 'tp_hits':
        title = `🎯 ${assetName} Take Profit Hit!`;
        body = `TP level reached at ${price} 📈`;
        url = signalId ? `/dashboard/signal-stream?signal=${signalId}` : '/dashboard/signal-stream';
        vibrate = [300, 100, 300, 100, 300];
        tag = 'tp-hit';
        requireInteraction = true;
        actions = [
          { action: 'view', title: '🎉 Celebrate' },
          { action: 'journal', title: '📝 Add to Journal' }
        ];
        break;

      case 'stop_loss':
        title = `🚨 ${assetName} Stop Loss Hit`;
        body = `SL triggered at ${price} - Review position`;
        url = signalId ? `/dashboard/signal-stream?signal=${signalId}` : '/dashboard/signal-stream';
        vibrate = [500, 200, 500, 200, 500];
        tag = 'stop-loss';
        requireInteraction = true;
        actions = [
          { action: 'view', title: '🔍 Review' },
          { action: 'analyze', title: '📊 Analyze' }
        ];
        break;

      case 'signal_updated':
        title = `📝 ${assetName} Signal Updated`;
        body = notificationData.message || 'Signal has been modified';
        url = signalId ? `/dashboard/signal-stream?signal=${signalId}` : '/dashboard/signal-stream';
        vibrate = [100];
        tag = 'signal-update';
        requireInteraction = false;
        actions = [
          { action: 'view', title: '👀 View Changes' },
          { action: 'dismiss', title: '✖️ Dismiss' }
        ];
        break;

      default:
        title = notificationData.title || title;
        body = notificationData.message || notificationData.body || body;
        url = notificationData.url || url;
    }

    // Override with explicit values if provided
    if (notificationData.title) title = notificationData.title;
    if (notificationData.message) body = notificationData.message;
    if (notificationData.url) url = notificationData.url;
  }

  const options = {
    body,
    icon,
    badge,
    data: {
      url,
      signalId: notificationData?.signal_id,
      alertType: notificationData?.notification_type || notificationData?.alert_type,
      timestamp: Date.now(),
      ...notificationData
    },
    actions,
    requireInteraction,
    vibrate,
    tag,
    renotify: true,
    timestamp: Date.now()
  };

  console.log('[SW] Showing trading notification:', { title, options });

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Enhanced notification click handling for trading alerts
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Trading notification clicked:', {
    action: event.action,
    data: event.notification.data,
    tag: event.notification.tag
  });
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const baseUrl = self.location.origin;
  let urlToOpen = notificationData.url || '/dashboard';
  
  // Handle specific actions
  switch (event.action) {
    case 'view':
      // Default view action
      break;
      
    case 'journal':
      // Navigate to trade journal with signal context
      if (notificationData.signalId) {
        urlToOpen = `/dashboard/trade-journal?signal=${notificationData.signalId}&action=add`;
      } else {
        urlToOpen = '/dashboard/trade-journal';
      }
      break;
      
    case 'analyze':
      // Navigate to signal analysis
      if (notificationData.signalId) {
        urlToOpen = `/dashboard/signal-stream?signal=${notificationData.signalId}&analyze=true`;
      } else {
        urlToOpen = '/dashboard/signal-stream';
      }
      break;
      
    case 'dismiss':
      // Just close, don't navigate
      return;
      
    default:
      // Default click (no action button)
      break;
  }

  // Ensure absolute URL
  if (!urlToOpen.startsWith('http')) {
    urlToOpen = baseUrl + (urlToOpen.startsWith('/') ? '' : '/') + urlToOpen;
  }

  console.log('[SW] Opening URL:', urlToOpen);

  event.waitUntil(
    clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then((clientList) => {
      // Try to find existing client with matching base path
      const targetPath = new URL(urlToOpen).pathname;
      const basePath = targetPath.split('?')[0];
      
      for (const client of clientList) {
        try {
          const clientUrl = new URL(client.url);
          const clientPath = clientUrl.pathname;
          
          // If we found the app window, focus it and navigate
          if (clientUrl.origin === baseUrl && 
              (clientPath.startsWith('/dashboard') || clientPath === '/')) {
            
            // Send message to client to navigate
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: targetPath,
              data: notificationData,
              timestamp: Date.now()
            });
            
            return client.focus();
          }
        } catch (error) {
          console.warn('[SW] Error checking client URL:', error);
        }
      }
      
      // No suitable client found, open new window
      console.log('[SW] Opening new window for:', urlToOpen);
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }).catch((error) => {
      console.error('[SW] Error handling notification click:', error);
      // Fallback: try to open new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Share target handling for PWA
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHARE_TARGET') {
    console.log('[SW] Share target received:', event.data);
    // Handle shared content (e.g., trade screenshots, market analysis)
  }
});

console.log('[SW] Service Worker loaded and ready');