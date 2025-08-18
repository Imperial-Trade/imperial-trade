// Fallback hook - OneSignal removed, using in-app notifications
import { useCallback } from 'react';

export function useEnhancedNotifications() {
  const triggerNotification = useCallback((notification: any) => {
    // Use in-app notification system instead
    if (typeof window !== 'undefined' && (window as any).addInAppNotification) {
      (window as any).addInAppNotification({
        type: notification.type || 'signal_created',
        title: notification.title || 'Notification',
        message: notification.message || notification.body,
        signal_id: notification.signal_id,
        asset_name: notification.asset_name,
        price: notification.price,
        priority: notification.priority || 'normal'
      });
    }
  }, []);

  return {
    triggerNotification,
    initialized: true,
    isEnabled: true,
    hasPermission: false, // Push notifications disabled
    canShowPrompt: false,
    promptForPermission: () => Promise.resolve(false),
    getNotificationStats: () => ({
      totalSent: 0,
      delivered: 0,
      opened: 0,
      failed: 0,
      total_sent: 0,
      total_delivered: 0,
      total_opened: 0,
      engagement_score: 0
    }),
    // Add missing properties for components that expect them
    preferences: {
      alerts: { 
        critical: { enabled: true, priority: 'critical', sound: 'default' }, 
        important: { enabled: true, priority: 'high', sound: 'default' } 
      },
      trading: { signal_created: { enabled: true, priority: 'normal', sound: 'default' } },
      channels: { in_app: { enabled: true, priority_threshold: 'normal' } },
      schedule: {
        quiet_hours: { enabled: false, start: '22:00', end: '08:00' },
        market_hours_only: false,
        weekend_alerts: true
      },
      device: {
        vibration: true,
        sound: true,
        visual: true,
        led_flash: false,
        priority_bypass: false
      }
    },
    stats: { 
      totalSent: 0, 
      delivered: 0, 
      opened: 0, 
      failed: 0,
      total_sent: 0,
      total_delivered: 0,
      total_opened: 0,
      engagement_score: 0
    },
    notifications: [],
    isLoading: false,
    testNotification: (data: any) => triggerNotification(data),
    playNotificationSound: () => {},
    markNotificationAsRead: () => {},
    clearAllNotifications: () => {},
    getUnreadCount: () => 0,
    refreshData: () => {},
    updatePreferences: (data: any) => Promise.resolve()
  };
}