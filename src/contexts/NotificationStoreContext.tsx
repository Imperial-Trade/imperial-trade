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

// ✅ STORAGE CONFIGURATION - Store latest 100 notifications
const STORAGE_KEY = 'imperial-trade-notifications';
const MAX_STORED_NOTIFICATIONS = 100;

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
  const { user, loading: authLoading } = useAuth();
  const authReady = !authLoading && !!user?.id;
  
  // ✅ Load from localStorage on mount (instant access while DB loads)
  const [notifications, setNotifications] = useState<StoredNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('✅ [NotificationStore] LOADED from localStorage (temporary):', {
          count: parsed.length,
          oldestDate: parsed.length > 0 ? new Date(parsed[parsed.length - 1].timestamp).toLocaleString() : 'N/A',
          newestDate: parsed.length > 0 ? new Date(parsed[0].timestamp).toLocaleString() : 'N/A',
          storageKey: STORAGE_KEY,
          firstNotification: parsed[0]
        });
        return parsed.map(deserializeNotification);
      }
      console.log('ℹ️ [NotificationStore] No stored notifications found in localStorage');
    } catch (error) {
      console.error('❌ [NotificationStore] Error loading from localStorage:', error);
    }
    return [];
  });
  
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(false);
  const hasLoadedFromDB = useRef(false);
  const pendingDBSaves = useRef<StoredNotification[]>([]); // Queue for notifications received before auth ready
  
  // ✅ Load from database when user is authenticated
  useEffect(() => {
    if (!authReady || !user?.id || hasLoadedFromDB.current) return;
    
    const loadFromDatabase = async () => {
      try {
        setIsLoadingFromDB(true);
        console.log('🔄 [NotificationStore] Loading from database for user:', user.id);
        
        const { data, error } = await supabase
          .rpc('get_user_notifications', {
            p_user_id: user.id,
            p_limit: MAX_STORED_NOTIFICATIONS
          });
        
        if (error) {
          console.error('❌ [NotificationStore] Failed to load from database:', error);
          return;
        }
        
        if (data && data.length > 0) {
          const dbNotifications: StoredNotification[] = data.map((row: any) => ({
            id: row.id,
            type: row.notification_type,
            title: row.title,
            message: row.message,
            metadata: row.metadata || {},
            timestamp: new Date(row.created_at),
            eventKey: row.event_key,
            deliveryChannel: row.delivery_channel,
            priority: row.priority
          }));
          
          console.log('✅ [NotificationStore] LOADED from database:', {
            count: dbNotifications.length,
            userId: user.id,
            oldestDate: dbNotifications.length > 0 ? dbNotifications[dbNotifications.length - 1].timestamp.toLocaleString() : 'N/A',
            newestDate: dbNotifications.length > 0 ? dbNotifications[0].timestamp.toLocaleString() : 'N/A'
          });
          
          setNotifications(dbNotifications);
          hasLoadedFromDB.current = true;
          
          // Also update localStorage for instant access next time
          try {
            const serialized = dbNotifications.map(serializeNotification);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
          } catch (e) {
            console.error('⚠️ Failed to sync to localStorage:', e);
          }
        } else {
          console.log('ℹ️ [NotificationStore] No notifications in database');
          hasLoadedFromDB.current = true;
        }
        
        // ✅ Process pending notifications that arrived before auth was ready
        if (pendingDBSaves.current.length > 0) {
          console.log(`🔄 [NotificationStore] Processing ${pendingDBSaves.current.length} pending notifications...`);
          const pending = pendingDBSaves.current.splice(0, pendingDBSaves.current.length);
          
          for (const notification of pending) {
            try {
              const { error } = await supabase
                .from('user_notifications')
                .insert([{
                  user_id: user.id,
                  notification_type: notification.type,
                  title: notification.title,
                  message: notification.message,
                  metadata: JSON.parse(JSON.stringify(notification.metadata || {})),
                  event_key: notification.eventKey,
                  delivery_channel: notification.deliveryChannel || 'realtime',
                  priority: String(notification.priority || 1),
                  created_at: notification.timestamp.toISOString()
                }]);
              
              if (!error || error.code === '23505') {
                console.log('💾 [NotificationStore] Saved pending notification:', notification.id);
              }
            } catch (error) {
              console.error('❌ [NotificationStore] Failed to save pending notification:', error);
            }
          }
        }
        
      } catch (error) {
        console.error('❌ [NotificationStore] Error loading from database:', error);
      } finally {
        setIsLoadingFromDB(false);
      }
    };
    
    loadFromDatabase();
  }, [authReady, user?.id]);

  // Add notification to store
  const addNotification = useCallback((notification: StoredNotification) => {
    // ✅ VALIDATION: Ensure display_name is always set
    if (!notification.metadata?.display_name) {
      console.warn('⚠️ [NotificationStore] Notification missing display_name, using fallback:', {
        id: notification.id,
        type: notification.type,
        metadata: notification.metadata
      });
      notification.metadata = notification.metadata || {};
      notification.metadata.display_name = 
        notification.metadata.provider_name || 
        notification.metadata.asset_name || 
        'Unknown Trader';
    }
    
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

      // ✅ Add new notification at the beginning - Keep only latest 100
      const updated = [notification, ...prev].slice(0, MAX_STORED_NOTIFICATIONS);

      console.log('✅ [NotificationStore] Notification added to memory:', {
        id: notification.id,
        type: notification.type,
        signal_id: notification.metadata?.signal_id,
        total_stored: updated.length,
        limit: MAX_STORED_NOTIFICATIONS
      });

      // ✅ ALSO SAVE TO DATABASE (async, non-blocking)
      if (authReady && user?.id) {
        (async () => {
          try {
            const { error } = await supabase
              .from('user_notifications')
              .insert([{
                user_id: user.id,
                notification_type: notification.type,
                title: notification.title,
                message: notification.message,
                metadata: JSON.parse(JSON.stringify(notification.metadata || {})),
                event_key: notification.eventKey,
                delivery_channel: notification.deliveryChannel || 'realtime',
                priority: String(notification.priority || 1),
                created_at: notification.timestamp.toISOString()
              }]);
            
            if (error) {
              // Check if it's a duplicate key error (event_key already exists)
              if (error.code === '23505') {
                console.log('ℹ️ [NotificationStore] Notification already in database (duplicate event_key)');
              } else {
                console.error('❌ [NotificationStore] Failed to save to database:', error);
              }
            } else {
              console.log('💾 [NotificationStore] Notification saved to database:', notification.id);
            }
          } catch (error) {
            console.error('❌ [NotificationStore] Error saving to database:', error);
          }
        })();
      } else {
        // ✅ Queue notification for later if auth not ready (iOS PWA scenario)
        console.log('📥 [NotificationStore] Queueing notification for later (auth not ready):', notification.id);
        pendingDBSaves.current.push(notification);
      }

      return updated;
    });
  }, [authReady, user?.id]);

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

