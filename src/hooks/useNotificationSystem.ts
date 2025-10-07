import { useState, useEffect, useCallback } from 'react';
import { notificationService, NotificationBadgeState } from '@/services/NotificationService';
import { notificationReliabilityService, NotificationMetrics } from '@/services/NotificationReliabilityService';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationSystemState {
  badgeState: NotificationBadgeState;
  systemHealth: NotificationMetrics | null;
  isMonitoring: boolean;
  preferences: any | null;
}

export const useNotificationSystem = () => {
  const { user } = useAuth();
  const [state, setState] = useState<NotificationSystemState>({
    badgeState: { unreadCount: 0, lastCheckedAt: null, hasNewAlerts: false },
    systemHealth: null,
    isMonitoring: false,
    preferences: null
  });

  // Subscribe to badge updates
  useEffect(() => {
    const unsubscribe = notificationService.subscribeToBadgeUpdates((badgeState) => {
      setState(prev => ({ ...prev, badgeState }));
    });

    return unsubscribe;
  }, []);

  // Load user preferences
  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        const preferences = await notificationService.getUserNotificationSettings(user.id);
        setState(prev => ({ ...prev, preferences }));
      } catch (error) {
        console.warn('Failed to load notification preferences:', error);
      }
    };

    loadPreferences();
  }, [user]);

  // Start reliability monitoring
  useEffect(() => {
    if (user) {
      notificationReliabilityService.startMonitoring();
      setState(prev => ({ ...prev, isMonitoring: true }));

      return () => {
        notificationReliabilityService.stopMonitoring();
        setState(prev => ({ ...prev, isMonitoring: false }));
      };
    }
  }, [user]);

  // Check system health periodically
  useEffect(() => {
    if (!user) return;

    const checkHealth = async () => {
      const health = await notificationReliabilityService.checkNotificationHealth();
      setState(prev => ({ ...prev, systemHealth: health }));
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  // API methods
  const clearNotifications = useCallback(() => {
    notificationService.clearUnreadCount();
  }, []);

  const markAsChecked = useCallback(() => {
    notificationService.markAsChecked();
  }, []);

  const updatePreferences = useCallback(async (preferences: any) => {
    if (!user) return false;

    const success = await notificationService.updateNotificationSettings(user.id, preferences);
    if (success) {
      setState(prev => ({ ...prev, preferences }));
    }
    return success;
  }, [user]);

  const testNotificationFlow = useCallback(async () => {
    if (!user) return false;
    return await notificationReliabilityService.testNotificationFlow(user.id);
  }, [user]);

  const retryFailedNotifications = useCallback(async () => {
    return await notificationReliabilityService.retryFailedNotifications();
  }, []);

  const getAnalytics = useCallback(async (days = 7) => {
    return await notificationReliabilityService.getNotificationAnalytics(days);
  }, []);

  const recordDelivery = useCallback(async (
    eventKey: string, 
    channel: 'in_app' | 'push', 
    status: 'delivered' | 'viewed' | 'clicked'
  ) => {
    await notificationService.recordNotificationDelivery(eventKey, channel, status);
  }, []);

  const checkRateLimit = useCallback(async (notificationType: string) => {
    if (!user) return true;
    return await notificationService.checkRateLimit(user.id, notificationType);
  }, [user]);

  const recordAudit = useCallback(async (
    signalId: string | null,
    notificationType: string,
    deliveryChannel: string,
    status: 'sent' | 'delivered' | 'failed',
    metadata?: Record<string, any>
  ) => {
    if (!user) return;
    await notificationService.recordNotificationAudit(
      user.id, 
      signalId, 
      notificationType, 
      deliveryChannel, 
      status, 
      metadata
    );
  }, [user]);

  // Listen for real-time notification events
  useEffect(() => {
    if (!user) return;

    const handleNotificationReceived = (event: CustomEvent) => {
      const { event_key } = event.detail;
      console.log('📱 Notification received with key:', event_key);
      
      // Auto-record delivery
      if (event_key) {
        recordDelivery(event_key, 'in_app', 'delivered');
      }
    };

    window.addEventListener('notification:received', handleNotificationReceived as EventListener);

    return () => {
      window.removeEventListener('notification:received', handleNotificationReceived as EventListener);
    };
  }, [user, recordDelivery]);

  return {
    // State
    ...state,
    
    // Actions
    clearNotifications,
    markAsChecked,
    updatePreferences,
    testNotificationFlow,
    retryFailedNotifications,
    getAnalytics,
    recordDelivery,
    checkRateLimit,
    recordAudit,

    // Utilities
    isSystemHealthy: state.systemHealth ? state.systemHealth.deliveryRate > 80 : true,
    hasUnreadNotifications: state.badgeState.unreadCount > 0,
    isPreferencesLoaded: !!state.preferences
  };
};