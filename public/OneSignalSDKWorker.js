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
      icon: data.icon || '/android-chrome-192x192.png',
      badge: data.badge || '/android-chrome-192x192.png',
      data: data
    };
    
    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  });
  
  self.addEventListener('notificationclick', function(event) {
    console.log('[OneSignal SW] Fallback notification click handler');
    event.notification.close();
    
    // Extract signal data from notification
    const notificationData = event.notification.data || {};
    const signalId = notificationData.signal_id || notificationData.signalId;
    
    // Determine target URL based on notification type
    let targetUrl = '/';
    if (signalId || notificationData.type === 'signal_created') {
      targetUrl = '/dashboard/signal-stream';
      if (signalId) {
        targetUrl += `?signal=${signalId}`;
      }
    } else if (notificationData.url) {
      targetUrl = notificationData.url;
    }
    
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
        // Try to focus existing window first
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          const clientUrl = new URL(client.url);
          if (clientUrl.origin === self.location.origin) {
            console.log('[OneSignal SW] Focusing existing window and navigating to:', targetUrl);
            client.focus();
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: targetUrl,
              data: notificationData
            });
            return client;
          }
        }
        
        // No existing window found, open new one
        console.log('[OneSignal SW] Opening new window:', targetUrl);
        return clients.openWindow(targetUrl);
      })
    );
  });
}
