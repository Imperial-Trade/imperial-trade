// Notification click handler utilities for service worker communication

export interface NotificationClickData {
  type: 'NOTIFICATION_CLICK';
  url: string;
  data: any;
}

// Handle notification click messages from service worker
export const setupNotificationClickHandler = () => {
  if (typeof window === 'undefined') return;

  // Listen for messages from service worker
  navigator.serviceWorker?.addEventListener('message', (event) => {
    const data = event.data as NotificationClickData;
    
    if (data.type === 'NOTIFICATION_CLICK') {
      console.log('[Notification] Handling click navigation:', data.url);
      
      // Use React Router or direct navigation
      if (window.location.pathname !== data.url) {
        window.location.href = data.url;
      }
    }
  });
};

// Utility to extract signal information from notification data
export const parseSignalNotification = (notificationData: any) => {
  const signalId = notificationData?.signal_id || notificationData?.signalId;
  const notificationType = notificationData?.type || notificationData?.notification_type;
  
  let targetUrl = '/';
  
  if (signalId || notificationType === 'signal_created') {
    targetUrl = '/dashboard/signal-stream';
    if (signalId) {
      targetUrl += `?signal=${signalId}`;
    }
  } else if (notificationData?.url) {
    targetUrl = notificationData.url;
  }
  
  return {
    signalId,
    notificationType,
    targetUrl
  };
};