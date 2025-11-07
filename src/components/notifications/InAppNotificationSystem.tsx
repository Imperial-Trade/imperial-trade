import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  X,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  Rocket,
  Calendar,
  TrendingUp,
  DollarSign,
  StopCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Enhanced notification interface for all signal events
interface SignalNotification {
  id: string;
  type: 'signal_created' | 'signal_updated' | 'tp_hit' | 'stop_loss_hit' | 'limit_activated' | 'limit_cancelled' | 'manual_close' | 'notes_updated' | 'all_tps_hit';
  title: string;
  message: string;
  timestamp: Date;
  signalId: string;
  assetName: string;
  authorName: string;
  eventKey?: string;
  deliveryChannel?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  autoRemove: boolean;
}

const BACKFILL_WINDOW_MS = 5 * 60 * 1000;
const DEFAULT_DEDUP_WINDOW_MS = 15000;
const CRITICAL_DEDUP_WINDOW_MS = 5000;
const NOTIFICATION_COOLDOWN_MS = 500;

const InAppNotificationSystem = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SignalNotification[]>([]);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  
  // 🔒 MOUNT TIME TRACKING: Filter out stale/replayed events
  const componentMountTimeRef = useRef<number>(Date.now());
  
  // 🔒 UNMOUNT GUARD: Prevent processing broadcasts after unmount
  const isMountedRef = useRef<boolean>(true);

  // Setup and cleanup on mount/unmount
  useEffect(() => {
    isMountedRef.current = true; // ✅ Mark as mounted
    const mountTime = Date.now();
    componentMountTimeRef.current = mountTime - BACKFILL_WINDOW_MS;
    console.log(`🎬 [InAppNotificationSystem] Mounted at ${new Date(mountTime).toISOString()}`);

    // ✅ CORRECTED: Only clear OLD entries (>5 minutes), keep recent ones
    if ((window as any).lastInAppNotifications) {
      const now = Date.now();
      const fiveMinutesAgo = now - BACKFILL_WINDOW_MS;
      let clearedCount = 0;
      let keptCount = 0;
      
      (window as any).lastInAppNotifications.forEach((timestamp: number, key: string) => {
        if (timestamp < fiveMinutesAgo) {
          (window as any).lastInAppNotifications.delete(key);
          clearedCount++;
        } else {
          keptCount++;
        }
      });
      
      console.log(
        `🧹 [InAppNotificationSystem] Cleaned ${clearedCount} old entries, ` +
        `kept ${keptCount} recent entries`
      );
    }

    return () => {
      isMountedRef.current = false; // ✅ Mark as unmounted
      // ✅ CORRECTED: Don't clear on unmount, let data persist for navigation
      console.log('🎬 [InAppNotificationSystem] Component unmounting (keeping deduplication data)');
    };
  }, []);

  const playNotificationSound = useCallback((priority: string) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies based on priority
    const frequencies: Record<string, number> = {
      critical: 1200, // Stop loss hits
      high: 1000,     // TP hits, limit activations
      medium: 800,    // New signals, manual closes
      low: 600,       // Notes updates
    };
    oscillator.frequency.value = frequencies[priority] || frequencies.medium;

    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.6
    );

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.6);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (notification: Partial<SignalNotification>) => {
      // ============================================
      // ✅ FIX #3: Comprehensive Debug Logging
      // ============================================
      const notificationTimestamp = notification.timestamp?.getTime() || Date.now();
      const now = Date.now();
      const ageSeconds = Math.round((now - notificationTimestamp) / 1000);
      
      console.log('🔔 [ADD NOTIFICATION CALLED]', {
        type: notification.type,
        title: notification.title,
        signalId: notification.signalId,
        assetName: notification.assetName,
        timestamp: new Date(notificationTimestamp).toISOString(),
        age_seconds: ageSeconds,
        caller: new Error().stack?.split('\n')[2]?.trim() // Shows where it was called from
      });

      // ============================================
      // ✅ Timestamp logging for delayed notifications
      // ============================================
      if (ageSeconds > 0) {
        console.log(`⏱️ [IN-APP] Notification age ${ageSeconds}s (will display)`);
      }

      // ============================================
      // ✅ EXISTING: Cooldown check (prevent rapid spam)
      // ============================================
      const cooldown = NOTIFICATION_COOLDOWN_MS;
      if (now - lastNotificationTime < cooldown) {
        console.warn("⏭️ [COOLDOWN] In-app notification suppressed due to cooldown.");
        return;
      }

      // ============================================
      // ✅ EXISTING: More robust deduplication key
      // ============================================
      const notificationKey = notification.eventKey || 
        `${notification.signalId}:${notification.type}:${notification.assetName}:${notificationTimestamp}`;

      const lastShownTime = (window as any).lastInAppNotifications?.get(notificationKey) || 0;

      // ============================================
      // ✅ EXISTING: Dynamic deduplication window
      // ============================================
      const deduplicationWindow = notification.type === 'all_tps_hit' 
        ? CRITICAL_DEDUP_WINDOW_MS
        : DEFAULT_DEDUP_WINDOW_MS;

      if (now - lastShownTime < deduplicationWindow) {
        console.warn(
          `⏭️ [DEDUP] In-app notification suppressed (duplicate within ${deduplicationWindow}ms):`,
          notificationKey
        );
        return;
      }
      
      // Initialize or update deduplication map
      if (!(window as any).lastInAppNotifications) {
        (window as any).lastInAppNotifications = new Map();
      }
      (window as any).lastInAppNotifications.set(notificationKey, now);

      setLastNotificationTime(now);

      const id = `${Date.now()}-${Math.random()}`;
      // ============================================
      // BUG #39 FIX: Use author name without generic fallback
      // ============================================
      const enhancedNotification: SignalNotification = {
        id,
        type: notification.type || 'signal_updated',
        title: notification.title || 'Trading Alert',
        message: notification.message || '',
        timestamp: new Date(notificationTimestamp),
        signalId: notification.signalId || '',
        assetName: notification.assetName || '',
        authorName: notification.authorName || 'Unknown Trader',
        eventKey: notification.eventKey,
        deliveryChannel: 'in_app',
        priority: notification.priority || 'medium',
        autoRemove: notification.autoRemove !== false,
      };
      
      setNotifications((prev) => {
        const updated = [enhancedNotification, ...prev.slice(0, 4)];
        console.log(`✅ [NOTIFICATION ADDED] Now showing ${updated.length} notification(s)`);
        return updated;
      });
      
      // Auto-remove based on priority
      const autoRemoveDelay = {
        critical: 12000, // 12 seconds for critical alerts
        high: 10000,     // 10 seconds for important alerts
        medium: 8000,    // 8 seconds for standard alerts
        low: 6000,       // 6 seconds for minor updates
      }[enhancedNotification.priority];
      
      if (enhancedNotification.autoRemove) {
        setTimeout(() => removeNotification(id), autoRemoveDelay);
      }
      
      playNotificationSound(enhancedNotification.priority);

      // Record delivery tracking
      if (notification.eventKey && user?.id) {
        supabase
          .from('notification_delivery_log')
          .insert({
            user_id: user.id,
            signal_id: notification.signalId,
            notification_type: notification.type || 'signal_updated',
            delivery_channel: 'in_app',
            status: 'delivered',
            event_key: notification.eventKey,
            delivered_at: new Date().toISOString(),
            metadata: {
              asset_name: notification.assetName,
              author_name: notification.authorName,
              priority: notification.priority
            }
          })
          .then(({ error }) => {
            if (error) console.warn('Failed to log notification delivery:', error);
          });
      }
    },
    [playNotificationSound, removeNotification, lastNotificationTime, user?.id]
  );

  // Set up real-time listener for signal notifications
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 Setting up in-app notification listeners');

    const channel = supabase
      .channel('instant-alerts')
      .on('broadcast', { event: 'signal_notification' }, (payload) => {
        // ✅ GUARD 0: Ignore if component is unmounted
        if (!isMountedRef.current) {
          console.log('⏭️ [UNMOUNTED] Ignoring broadcast received after unmount');
          return;
        }

        console.log('🚨 Received signal notification:', payload);
        
        const data = payload.payload;
        if (!data) return;

        // ============================================
        // ✅ GUARD 1: TIMESTAMP FILTERING (Enhanced)
        // ============================================
        const eventTimestamp = data.timestamp || data.created_at;

        // Require valid timestamp
        if (!eventTimestamp) {
          console.warn('⚠️ [MISSING TIMESTAMP] Ignoring broadcast without timestamp:', {
            notification_type: data.notification_type,
            asset_name: data.asset_name
          });
          return;
        }

        const eventTime = new Date(eventTimestamp).getTime();

        // Validate timestamp is valid
        if (isNaN(eventTime)) {
          console.warn('⚠️ [INVALID TIMESTAMP] Ignoring broadcast with invalid timestamp:', eventTimestamp);
          return;
        }

        // Filter events older than component mount
        if (eventTime < componentMountTimeRef.current) {
          const ageSeconds = Math.round((componentMountTimeRef.current - eventTime) / 1000);
          console.log(
            `⏭️ [REPLAY PREVENTION] Ignoring pre-mount broadcast: ` +
            `${data.notification_type} for ${data.asset_name} (${ageSeconds}s before mount)`
          );
          return;
        }

        // ✅ CRITICAL: Filter events older than 30 seconds (even if after mount)
        const now = Date.now();
        const ageMs = now - eventTime;
        if (ageMs > DEFAULT_DEDUP_WINDOW_MS) {
          console.log(
            `⏱️ [IN-APP BACKFILL] Broadcast delay ${Math.round(ageMs / 1000)}s for ${data.asset_name}`
          );
        }
        
        // ============================================
        // ✅ GUARD 2: PAYLOAD VALIDATION (Prevents "undefined" glitches)
        // ============================================
        if (!data.asset_name || !data.notification_type) {
          console.warn(
            '⚠️ [INVALID BROADCAST] Ignoring event with missing required fields:',
            {
              asset_name: data.asset_name,
              notification_type: data.notification_type,
              has_signal_id: !!data.signal_id,
              raw_data: data
            }
          );
          return;
        }

        // Map notification types to our enhanced system
        let type: SignalNotification['type'] = 'signal_updated';
        let title = '';
        let message = '';
        let priority: SignalNotification['priority'] = 'medium';

        switch (data.notification_type) {
          case 'signal_created':
            type = 'signal_created';
            title = `🚨 New ${data.trade_type?.toUpperCase()} Signal`;
            message = `${data.author_name} posted ${data.asset_name} at $${data.entry_price}`;
            priority = 'high';
            break;
          case 'tp_hit':
          case 'take_profit_hit':
            type = 'tp_hit';
            title = `🎯 Take Profit Hit - ${data.asset_name}`;
            message = `TP ${data.tp_hits?.[data.tp_hits.length - 1]} reached at $${data.triggered_price || data.target_price}`;
            priority = 'high';
            break;
          case 'stop_loss_hit':
            type = 'stop_loss_hit';
            title = `🔴 Stop Loss Hit - ${data.asset_name}`;
            message = `Stop loss triggered at $${data.triggered_price || data.target_price}`;
            priority = 'critical';
            break;
          case 'limit_activated':
            type = 'limit_activated';
            title = `✅ Limit Order Activated - ${data.asset_name}`;
            message = `${data.trade_type?.replace('_', ' ')?.toUpperCase()} order activated at $${data.entry_price}`;
            priority = 'high';
            break;
          case 'limit_cancelled':
            type = 'limit_cancelled';
            title = `❌ Limit Order Cancelled - ${data.asset_name}`;
            message = `${data.trade_type?.replace('_', ' ')?.toUpperCase()} order cancelled by ${data.author_name}`;
            priority = 'medium';
            break;
          case 'manual_close':
            type = 'manual_close';
            title = `🔒 Signal Manually Closed - ${data.asset_name}`;
            message = `${data.author_name} manually closed the signal`;
            priority = 'medium';
            break;
          case 'notes_updated':
            type = 'notes_updated';
            title = `📝 Notes Updated - ${data.asset_name}`;
            message = `${data.author_name} updated signal notes`;
            priority = 'low';
            break;
          case 'all_tps_hit':
            type = 'all_tps_hit';
            title = `🎉 All Take Profits Hit - ${data.asset_name}`;
            message = `Trade completed successfully by ${data.author_name}`;
            priority = 'high';
            break;
          default:
            title = `📊 Signal Update - ${data.asset_name}`;
            message = `${data.author_name} updated the signal`;
            priority = 'medium';
        }

        addNotification({
          type,
          title,
          message,
          signalId: data.signal_id,
          assetName: data.asset_name,
          authorName: data.author_name,
          eventKey: data.event_key,
          priority,
          timestamp: new Date(eventTime),
        });
      })
      .subscribe();

    // Also listen for custom signal events
    const handleSignalPosted = () => {
      addNotification({
        type: 'signal_created',
        title: '🚨 New Signal Posted',
        message: 'A new trading signal has been created',
        signalId: '',
        assetName: '',
        authorName: 'Educator',
        priority: 'high',
        timestamp: new Date(),
      });
    };

    window.addEventListener('signal-posted', handleSignalPosted);

    // Expose the addNotification function globally for compatibility
    (window as any).addNotification = addNotification;

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('signal-posted', handleSignalPosted);
      delete (window as any).addNotification;
    };
  }, [user?.id, addNotification]);

  const icons: Record<string, React.ReactNode> = {
    signal_created: <Bell className="w-5 h-5 text-blue-400" />,
    signal_updated: <TrendingUp className="w-5 h-5 text-yellow-400" />,
    tp_hit: <Target className="w-5 h-5 text-green-400" />,
    stop_loss_hit: <XCircle className="w-5 h-5 text-red-400" />,
    limit_activated: <Rocket className="w-5 h-5 text-purple-400" />,
    limit_cancelled: <StopCircle className="w-5 h-5 text-orange-400" />,
    manual_close: <CheckCircle className="w-5 h-5 text-blue-400" />,
    notes_updated: <AlertCircle className="w-5 h-5 text-gray-400" />,
    all_tps_hit: <DollarSign className="w-5 h-5 text-gold-400" />,
  };

  const colors: Record<string, string> = {
    signal_created: "border-blue-500 bg-blue-500/10",
    signal_updated: "border-yellow-500 bg-yellow-500/10", 
    tp_hit: "border-green-500 bg-green-500/10",
    stop_loss_hit: "border-red-500 bg-red-500/10",
    limit_activated: "border-purple-500 bg-purple-500/10",
    limit_cancelled: "border-orange-500 bg-orange-500/10",
    manual_close: "border-blue-500 bg-blue-500/10",
    notes_updated: "border-gray-500 bg-gray-500/10",
    all_tps_hit: "border-gold-500 bg-gold-500/10",
  };

  const priorityGlow: Record<string, string> = {
    critical: "shadow-lg shadow-red-500/20 ring-1 ring-red-500/30",
    high: "shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/30", 
    medium: "shadow-md shadow-gray-500/10",
    low: "shadow-sm",
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 400, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 400, scale: 0.8, transition: { duration: 0.2 } }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 25,
              mass: 0.8
            }}
            className="pointer-events-auto"
          >
            <Card
              className={`${
                colors[notification.type] || "border-gray-500 bg-gray-500/10"
              } ${priorityGlow[notification.priority]} border-2 backdrop-blur-md bg-background/90 hover:bg-background/95 transition-all duration-200`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 flex-shrink-0">
                      {icons[notification.type] || (
                        <TrendingUp className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground text-sm leading-tight">
                        {notification.title}
                      </h4>
                      <p className="text-muted-foreground text-xs mt-1 leading-snug">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-muted-foreground/80 text-xs">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>
                        {notification.priority === 'critical' && (
                          <span className="text-red-400 text-xs font-medium">URGENT</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNotification(notification.id)}
                    className="text-muted-foreground hover:text-foreground p-1 h-auto flex-shrink-0 ml-2"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default InAppNotificationSystem;