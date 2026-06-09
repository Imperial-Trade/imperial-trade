/**
 * 🔄 NOTIFICATION POLLING BACKUP SYSTEM
 * 
 * This hook provides a safety net when Realtime fails.
 * Polls database every 1 SECOND to ensure ZERO missed notifications.
 * 
 * Features:
 * - 1-second polling for instant feel
 * - Only polls when Realtime is disconnected
 * - Stops immediately when Realtime reconnects
 * - Fetches only new notifications since last check
 * - Zero duplicates (handled by NotificationStore)
 */

import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PollingOptions {
  enabled: boolean; // Enable/disable polling (true when Realtime is down)
  onNotificationReceived: (notification: any) => void; // Callback when new notification found
  pollingInterval?: number; // Default: 1000ms (1 second)
}

export const useNotificationPolling = ({
  enabled,
  onNotificationReceived,
  pollingInterval = 1000 // 1 SECOND for instant feel
}: PollingOptions) => {
  const { user } = useAuth();
  const lastFetchTimeRef = useRef<Date>(new Date());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  const fetchNewNotifications = useCallback(async () => {
    // Prevent concurrent fetches
    if (isFetchingRef.current || !user?.id) {
      return;
    }

    isFetchingRef.current = true;

    try {
      console.log('🔄 [Polling] Fetching notifications since:', lastFetchTimeRef.current.toISOString());

      // Fetch notifications created since last check
      const { data: notifications, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .gt('created_at', lastFetchTimeRef.current.toISOString())
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ [Polling] Failed to fetch notifications:', error);
        return;
      }

      if (notifications && notifications.length > 0) {
        console.log(`🔔 [Polling] Found ${notifications.length} new notifications via polling`);

        // Process each notification
        for (const dbNotif of notifications) {
          // Transform database notification to StoredNotification format
          const meta =
            dbNotif.metadata && typeof dbNotif.metadata === "object"
              ? { ...(dbNotif.metadata as Record<string, unknown>) }
              : {};
          if (dbNotif.link_url) {
            meta.link_url = dbNotif.link_url;
          }
          const notification = {
            id: dbNotif.id,
            type: dbNotif.notification_type,
            title: dbNotif.title,
            message: dbNotif.message,
            metadata: meta,
            timestamp: new Date(dbNotif.created_at),
            eventKey: dbNotif.event_key,
            deliveryChannel: 'polling' as const,
            priority: parseInt(dbNotif.priority || '1', 10)
          };

          console.log('📤 [Polling] Delivering notification:', {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            created_at: dbNotif.created_at
          });

          // Pass to handler (will show modern notification modal + add to Recent Activity)
          onNotificationReceived(notification);
        }

        // Update last fetch time to latest notification
        const latestNotification = notifications[notifications.length - 1];
        lastFetchTimeRef.current = new Date(latestNotification.created_at);
        console.log('✅ [Polling] Updated last fetch time to:', lastFetchTimeRef.current.toISOString());
      } else {
        console.log('ℹ️ [Polling] No new notifications found');
      }
    } catch (error) {
      console.error('❌ [Polling] Exception during fetch:', error);
    } finally {
      isFetchingRef.current = false;
    }
  }, [user?.id, onNotificationReceived]);

  // Start/stop polling based on enabled flag
  useEffect(() => {
    if (!user?.id) {
      console.log('⏭️ [Polling] No user, skipping polling');
      return;
    }

    if (enabled) {
      console.log('🚀 [Polling] STARTING 1-second polling (Realtime is DOWN)');
      console.log('⚡ [Polling] Polling every 1 SECOND for instant notification delivery');

      // Initial fetch
      fetchNewNotifications();

      // Start polling interval
      pollingIntervalRef.current = setInterval(() => {
        fetchNewNotifications();
      }, pollingInterval);
    } else {
      console.log('✅ [Polling] STOPPING polling (Realtime is CONNECTED)');
      
      // Clear interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    }

    // Cleanup on unmount or when enabled changes
    return () => {
      if (pollingIntervalRef.current) {
        console.log('🧹 [Polling] Cleanup: Stopping polling interval');
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [enabled, user?.id, pollingInterval, fetchNewNotifications]);

  return {
    isPolling: enabled && !!pollingIntervalRef.current,
    lastFetchTime: lastFetchTimeRef.current
  };
};

