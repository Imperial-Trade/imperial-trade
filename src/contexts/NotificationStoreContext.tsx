import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { PipsData } from '@/utils/pipsCalculator';

/**
 * Shared Notification Store Context
 * 
 * This context stores ALL notifications received by ModernNotificationSystem
 * so they can be accessed by NotificationSheet (Recent Activity).
 * 
 * Flow:
 * 1. ModernNotificationSystem receives broadcast → adds to store
 * 2. NotificationSheet reads from store → displays in Recent Activity
 * 3. Both components show identical notification data
 */

export interface StoredNotification {
  id: string;
  type: 'new_signal' | 'pending_limit' | 'tp_hit' | 'stop_loss' | 'trade_closed' | 'limit_activated' | 'notes_updated' | 'manual_close' | 'all_tps_hit';
  title: string;
  message: string;
  metadata?: {
    signal_id?: string;
    provider_name?: string;
    display_name?: string;
    provider_avatar_url?: string;
    provider_type?: 'educator' | 'admin' | 'moderator' | 'member';
    asset_name?: string;
    pips_data?: PipsData;
    tp_hits?: number[];
    total_tps?: number;
    progress_percentage?: number;
    change_types?: string[];
    old_data?: any;
    new_data?: any;
  };
  timestamp: Date;
  eventKey?: string;
  deliveryChannel?: string;
  priority?: number;
}

interface NotificationStoreContextType {
  notifications: StoredNotification[];
  addNotification: (notification: StoredNotification) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  getRecentNotifications: (limit?: number) => StoredNotification[];
}

const NotificationStoreContext = createContext<NotificationStoreContextType | undefined>(undefined);

const MAX_STORED_NOTIFICATIONS = 100; // Keep last 100 notifications
const NOTIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

export const NotificationStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<StoredNotification[]>([]);
  const { user, loading: authLoading } = useAuth();
  const authReady = !authLoading && !!user?.id;

  // Add notification to store
  const addNotification = useCallback((notification: StoredNotification) => {
    setNotifications((prev) => {
      // Check for duplicates (same eventKey or same signal_id + type within 1 second)
      const isDuplicate = prev.some((n) => {
        if (notification.eventKey && n.eventKey === notification.eventKey) {
          return true;
        }
        
        if (
          notification.metadata?.signal_id &&
          n.metadata?.signal_id === notification.metadata.signal_id &&
          n.type === notification.type &&
          Math.abs(n.timestamp.getTime() - notification.timestamp.getTime()) < 1000
        ) {
          return true;
        }
        
        return false;
      });

      if (isDuplicate) {
        console.log('⚠️ [NotificationStore] Duplicate notification blocked:', notification.id);
        return prev;
      }

      // Add new notification at the beginning
      const updated = [notification, ...prev];

      // Keep only the most recent notifications
      const filtered = updated
        .slice(0, MAX_STORED_NOTIFICATIONS)
        .filter((n) => {
          const age = Date.now() - n.timestamp.getTime();
          return age < NOTIFICATION_EXPIRY_MS;
        });

      console.log('✅ [NotificationStore] Notification added:', {
        id: notification.id,
        type: notification.type,
        signal_id: notification.metadata?.signal_id,
        total_stored: filtered.length,
      });

      return filtered;
    });
  }, []);

  // Remove notification from store
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Get recent notifications (sorted by timestamp, most recent first)
  const getRecentNotifications = useCallback(
    (limit: number = 20): StoredNotification[] => {
      return notifications
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, limit);
    },
    [notifications]
  );

  // Cleanup expired notifications periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications((prev) =>
        prev.filter((n) => {
          const age = Date.now() - n.timestamp.getTime();
          return age < NOTIFICATION_EXPIRY_MS;
        })
      );
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const value: NotificationStoreContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    getRecentNotifications,
  };

  return (
    <NotificationStoreContext.Provider value={value}>
      {children}
    </NotificationStoreContext.Provider>
  );
};

// Hook to use notification store
export const useNotificationStore = (): NotificationStoreContextType => {
  const context = useContext(NotificationStoreContext);
  if (!context) {
    throw new Error('useNotificationStore must be used within NotificationStoreProvider');
  }
  return context;
};

