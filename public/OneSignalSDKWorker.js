try {
  // Enhanced service worker with error handling and logging
  console.log('[OneSignal SW] Loading OneSignal Service Worker...');
  importScripts('https://cdn.onesignal.com/sdks/OneSignalSDKWorker.js');
  console.log('[OneSignal SW] OneSignal Service Worker loaded successfully');
} catch (error) {
  console.error('[OneSignal SW] Failed to load OneSignal Service Worker:', error);
  
  // Fallback registration
  self.addEventListener('push', function(event) {
    console.log('[OneSignal SW] Fallback push handler activated');
    const data = event.data ? event.data.json() : {};
    const title = data.title || 'New Notification';
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/favicon.ico',
      badge: data.badge || '/favicon.ico',
      data: data
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  });
  
  self.addEventListener('notificationclick', function(event) {
    console.log('[OneSignal SW] Fallback notification click handler');
    event.notification.close();
    event.waitUntil(
      clients.openWindow(event.notification.data?.url || '/')
    );
  });
}
