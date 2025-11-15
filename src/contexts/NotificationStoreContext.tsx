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
    notes?: string | null;
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

// ✅ UNLIMITED STORAGE - No time limit, no count limit
const STORAGE_KEY = 'imperial-trade-notifications';

// Helper to serialize Date objects for localStorage
const serializeNotification = (notification: StoredNotification) => ({
  ...notification,
  timestamp: notification.timestamp.toISOString(),
});

const deserializeNotification = (data: any): StoredNotification => ({
  ...data,
  timestamp: new Date(data.timestamp),
});

export const NotificationStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ✅ Load from localStorage on mount
  const [notifications, setNotifications] = useState<StoredNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('✅ [NotificationStore] LOADED from localStorage:', {
          count: parsed.length,
          oldestDate: parsed.length > 0 ? new Date(parsed[parsed.length - 1].timestamp).toLocaleString() : 'N/A',
          newestDate: parsed.length > 0 ? new Date(parsed[0].timestamp).toLocaleString() : 'N/A',
          storageKey: STORAGE_KEY,
          firstNotification: parsed[0]
        });
        return parsed.map(deserializeNotification);
      }
      console.log('ℹ️ [NotificationStore] No stored notifications found');
    } catch (error) {
      console.error('❌ [NotificationStore] Error loading from localStorage:', error);
    }
    return [];
  });
  
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

      // ✅ Add new notification at the beginning - NO LIMITS
      const updated = [notification, ...prev];

      console.log('✅ [NotificationStore] Notification added:', {
        id: notification.id,
        type: notification.type,
        signal_id: notification.metadata?.signal_id,
        total_stored: updated.length,
      });

      return updated;
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

  // ✅ Auto-save to localStorage whenever notifications change
  useEffect(() => {
    try {
      const serialized = notifications.map(serializeNotification);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
      console.log('💾 [NotificationStore] SAVED to localStorage:', {
        count: notifications.length,
        storageKey: STORAGE_KEY,
        sizeKB: Math.round(JSON.stringify(serialized).length / 1024),
        lastNotification: notifications[0]
      });
    } catch (error) {
      console.error('❌ [NotificationStore] Error saving to localStorage:', error);
      // If localStorage is full, try to clear old data
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('⚠️ [NotificationStore] localStorage quota exceeded, keeping only last 500 notifications');
        const trimmed = notifications.slice(0, 500);
        try {
          const serialized = trimmed.map(serializeNotification);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
          setNotifications(trimmed);
        } catch (retryError) {
          console.error('❌ [NotificationStore] Still failed after trimming:', retryError);
        }
      }
    }
  }, [notifications]);

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

