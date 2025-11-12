import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificationValidator, type SignalChangeData } from '@/utils/notificationValidation';
import { ProviderAvatar } from './ProviderAvatar';
import { NotificationBadge } from './NotificationBadge';
import { ProgressIndicator } from './ProgressIndicator';
import { ProfitLossDisplay } from './ProfitLossDisplay';
import type { PipsData } from '@/utils/pipsCalculator';
import { calculatePipsForSignal } from '@/utils/pipsCalculator';
import { capacitorNotificationService } from '@/services/CapacitorNotificationService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  NotificationEvent,
  subscribeToNotifications,
} from '@/utils/notificationBus';

const BACKFILL_WINDOW_MS = 5 * 60 * 1000;
const DEDUP_WINDOW_MS = 1500;

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

interface ModernNotification {
  id: string;
  type: 'new_signal' | 'pending_limit' | 'tp_hit' | 'stop_loss' | 'trade_closed' | 'limit_activated' | 'notes_updated' | 'manual_close';
  title: string;
  message: string;
  metadata?: {
    signal_id?: string;
    provider_name?: string;
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

const MODERN_DEDUP_WINDOW_MS = 1500;

const ModernNotificationSystem = () => {
  // ✅ useAuth() is safe here - component is inside AuthProvider in App.tsx
  const { user, loading: authLoading } = useAuth();
  const authReady = !authLoading && !!user?.id;
  
  console.log('🔔 [ModernNotificationSystem] Auth state:', {
    hasUser: !!user,
    userId: user?.id,
    authLoading,
    authReady
  });

  const [notifications, setNotifications] = useState<ModernNotification[]>([]);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  const componentMountTimeRef = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true);
  const pendingEventsRef = useRef<NotificationEvent[]>([]);
  const lastShownRef = useRef<Map<string, number>>(new Map());

  const playNotificationSound = useCallback((type: string) => {
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        console.warn('⚠️ [Sound] AudioContext not supported in this browser');
        return;
      }

      const audioContext = new AudioContextClass();
      
      // Check if audioContext is in suspended state (requires user interaction)
      if (audioContext.state === 'suspended') {
        console.warn('⚠️ [Sound] AudioContext suspended - user interaction required');
        audioContext.resume().catch((err) => {
          console.warn('⚠️ [Sound] Failed to resume AudioContext:', err);
        });
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      const frequencies: Record<string, number> = {
        new_signal: 800,
        pending_limit: 700,
        tp_hit: 1000,
        limit_activated: 900,
        trade_closed: 600,
        stop_loss: 400,
        manual_close: 500,
        notes_updated: 700,
        default: 700,
      };
      oscillator.frequency.value = frequencies[type] || frequencies.default;

      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        audioContext.currentTime + 0.5
      );

      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.5);
      
      console.log(`🔊 [Sound] Played ${type} notification (${frequencies[type] || frequencies.default}Hz)`);
    } catch (error) {
      console.error('❌ [Sound] Error playing notification sound:', error);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleNotification = useCallback(
    async (notification: any) => {
      const now = Date.now();
      const cooldown = 500;

      // ============================================================================
      // PHASE 1: DIAGNOSTIC LOGGING
      // ============================================================================
      console.log('🔍 [DIAGNOSTIC] Notification received:', {
        signal_id: notification.metadata?.signal_id,
        type: notification.type,
        title: notification.title,
        message: notification.message?.substring(0, 50),
        timestamp: new Date().toISOString()
      });

      // Enhanced validation for signal-related notifications
      if (notification.metadata?.signal_id && notification.metadata?.change_types) {
        const changeData: SignalChangeData = {
          signalId: notification.metadata.signal_id,
          oldData: notification.metadata.old_data || {},
          newData: notification.metadata.new_data || {},
          changeTypes: notification.metadata.change_types || [],
          timestamp: new Date()
        };

        const validation = await notificationValidator.validateSignalChange(changeData);
        if (!validation.isValid) {
          console.log(`🚫 [DIAGNOSTIC] Blocked by validation: ${validation.reason}`);
          return;
        }

        const rateLimitPassed = await notificationValidator.checkNotificationRateLimit(notification.metadata.signal_id);
        if (!rateLimitPassed) {
          console.log(`🚫 [DIAGNOSTIC] Blocked by rate limit: ${notification.metadata.signal_id}`);
          return;
        }
      }

      // ============================================================================
      // PHASE 2: SIGNAL-SPECIFIC COOLDOWN (replaces global cooldown)
      // ============================================================================
      // Initialize signal-specific cooldown map
      if (!(window as any).signalCooldowns) {
        (window as any).signalCooldowns = new Map<string, number>();
      }

      // Use signal_id for cooldown key, or 'global' for non-signal notifications
      const cooldownKey = notification.metadata?.signal_id || 'global';
      const lastCooldownTime = (window as any).signalCooldowns.get(cooldownKey) || 0;

      if (now - lastCooldownTime < cooldown) {
        const timeSinceLast = ((now - lastCooldownTime)).toFixed(0);
        console.warn('🚫 [DIAGNOSTIC] Blocked by cooldown:', {
          signal_id: notification.metadata?.signal_id,
          cooldown_key: cooldownKey,
          time_since_last: `${timeSinceLast}ms`,
          cooldown_window: `${cooldown}ms`
        });
        return;
      }

      // Update signal-specific cooldown
      (window as any).signalCooldowns.set(cooldownKey, now);
      console.log('✅ [DIAGNOSTIC] Passed cooldown check:', {
        signal_id: notification.metadata?.signal_id,
        cooldown_key: cooldownKey
      });

      // ============================================================================
      // DEDUPLICATION: Prevent showing same notification multiple times
      // ============================================================================

      // Use signal_id + notification_type + title for better uniqueness
      const signalId =
        notification.metadata?.signal_id ||
        (notification as any).signalId ||
        notification.metadata?.raw_payload?.signal_id;
      const triggeredPrice =
        notification.metadata?.triggered_price ||
        notification.metadata?.target_price ||
        notification.metadata?.raw_payload?.triggered_price ||
        notification.metadata?.raw_payload?.target_price ||
        (notification as any).triggeredPrice;

      const fallbackKey = signalId
        ? `${signalId}:${notification.type}:${triggeredPrice ?? 'na'}`
        : `${notification.title}:${notification.message}`;

      const notificationKey = notification.eventKey || fallbackKey;
      const keysToCheck = new Set<string>();
      if (notificationKey) keysToCheck.add(notificationKey);
      if (fallbackKey) keysToCheck.add(fallbackKey);

      console.log('🔑 [DIAGNOSTIC] Generated deduplication key:', {
        full_key: notificationKey,
        signal_id: notification.metadata?.signal_id,
        type: notification.type,
        title: notification.title
      });

      let blockedByDedup = false;
      for (const key of keysToCheck) {
        if (!key) continue;
        const lastShownTime =
          lastShownRef.current.get(key) ||
          (window as any).lastShownMap?.get(key) ||
          0;

        if (now - lastShownTime < MODERN_DEDUP_WINDOW_MS) {
          const timeSinceLastShown = ((now - lastShownTime) / 1000).toFixed(1);
          console.warn('🚫 [DIAGNOSTIC] Blocked by deduplication:', {
            key_preview: key.substring(0, 60) + '...',
            signal_id: signalId,
            type: notification.type,
            title: notification.title,
            time_since_last_shown: `${timeSinceLastShown}s`,
            deduplication_window: `${MODERN_DEDUP_WINDOW_MS / 1000}s`
          });
          blockedByDedup = true;
          break;
        }
      }

      if (blockedByDedup) {
        return;
      }

      // Log successful deduplication check
      console.log('✅ [DIAGNOSTIC] Passed deduplication check:', {
        key_preview: notificationKey.substring(0, 60) + '...',
        signal_id: notification.metadata?.signal_id,
        type: notification.type,
        title: notification.title
      });

      // Update last shown time
      keysToCheck.forEach((key) => {
        if (!key) return;
        lastShownRef.current.set(key, now);
        if (!(window as any).lastShownMap) {
          (window as any).lastShownMap = new Map();
        }
        (window as any).lastShownMap.set(key, now);
        
        // ✅ CROSS-TAB SYNC: Notify other tabs
        if ((window as any).notificationBroadcastChannel) {
          (window as any).notificationBroadcastChannel.postMessage({ 
            type: 'notification_shown', 
            eventKey: key 
          });
        }
      });

      setLastNotificationTime(now);

      const id = notification.id || Date.now() + Math.random();
      let computedPipsData: PipsData | undefined;

      const enhancedNotification: ModernNotification = {
        ...notification,
        id: id.toString(),
        timestamp: notification.timestamp
          ? new Date(notification.timestamp)
          : new Date(),
        eventKey: notification.eventKey || `notification_${id}`,
        deliveryChannel: notification.deliveryChannel || 'in_app',
      };
      
      console.log('✅ [DIAGNOSTIC] Notification APPROVED and will be displayed:', {
        signal_id: notification.metadata?.signal_id,
        type: notification.type,
        title: notification.title,
        notification_id: id.toString()
      });
      
      setNotifications((prev) => [enhancedNotification, ...prev]);
      setTimeout(() => removeNotification(id.toString()), 8000);
      playNotificationSound(notification.type);

      // ✅ PUSH NOTIFICATIONS:
      // - PWA users (Add to Home Screen): Use OneSignal (handled by backend)
      // - Native app users (future): Use Capacitor
      // - Web users: Use OneSignal (handled by backend)
      // 
      // Since you're using PWA (not native app yet), ALL push notifications
      // come from OneSignal via the backend. No Capacitor notifications needed.
      // When you build a true native app later, uncomment the code below.
      
      // if (capacitorNotificationService.isNativePlatform()) {
      //   await capacitorNotificationService.showNotification({
      //     title: notification.title,
      //     body: notification.message,
      //     data: notification.metadata || {},
      //     eventKey: notification.eventKey,
      //     type: notification.type,
      //     signalId: notification.metadata?.signal_id,
      //   });
      // }

      if (notification.eventKey) {
        import('@/services/NotificationService').then(({ notificationService }) => {
          notificationService.recordNotificationDelivery(
            notification.eventKey,
            notification.deliveryChannel || 'in_app',
            'delivered'
          );
        });
      }
    },
    [playNotificationSound, removeNotification, lastNotificationTime]
  );

  useEffect(() => {
    isMountedRef.current = true;

    // 🚫 DISABLED: notificationBus subscription (causes duplicate notifications)
    // ModernNotificationSystem already receives notifications directly from Supabase Realtime
    // via the 'instant-alerts' channel. Subscribing to notificationBus creates a loop because
    // we emit to the bus (line 697) AND subscribe to it, causing each notification to appear twice.
    // 
    // const unsubscribe = subscribeToNotifications((event) => {
    //   if (!authReady) {
    //     pendingEventsRef.current.push(event);
    //     return;
    //   }
    //   handleNotification(event);
    // });

    return () => {
      isMountedRef.current = false;
      // unsubscribe(); // No longer needed
    };
  }, [authReady]); // Removed handleNotification dependency

  useEffect(() => {
    if (authReady && pendingEventsRef.current.length > 0) {
      const queued = pendingEventsRef.current.splice(
        0,
        pendingEventsRef.current.length
      );
      queued.forEach((event) => {
        handleNotification(event);
      });
    }
  }, [authReady, handleNotification]);

  // Set up real-time listener for signal notifications
  useEffect(() => {
    // ✅ Subscribe IMMEDIATELY on mount - no auth dependency
    componentMountTimeRef.current = Date.now() - BACKFILL_WINDOW_MS;
    console.log('🔔 [ModernNotificationSystem] Setting up broadcast listeners (no auth required)');
    console.log('🔍 [DEBUG] System initialized:', {
      userId: user?.id,
      hasUser: !!user,
      authLoading,
      authReady,
      hasAddNotificationFn: typeof (window as any).addNotification === 'function',
      componentMounted: isMountedRef.current
    });

    // ✅ CROSS-TAB DEDUPLICATION: Use BroadcastChannel to sync across tabs
    const bc = new BroadcastChannel('trade-imperial-notifications');
    (window as any).notificationBroadcastChannel = bc;
    
    bc.onmessage = (event) => {
      const { type, eventKey } = event.data;
      if (type === 'notification_shown') {
        const now = Date.now();
        // Mark this notification as shown in this tab too
        lastShownRef.current.set(eventKey, now);
        if (!(window as any).lastShownMap) {
          (window as any).lastShownMap = new Map();
        }
        (window as any).lastShownMap.set(eventKey, now);
        console.log('📡 [Cross-Tab] Another tab showed notification:', eventKey);
      }
    };

    const channel = supabase
      .channel('instant-alerts')
      .on('broadcast', { event: 'signal_notification' }, (payload) => {
        if (!isMountedRef.current) {
          console.log('⏭️ [UNMOUNTED] Ignoring broadcast after unmount');
          return;
        }

        console.log('🚨 [ModernNotificationSystem] Received signal notification:', payload);
        
        // ✅ Auth check - only process if auth is ready
        if (!authReady) {
          console.log('⏳ [AUTH NOT READY] Notification received while auth loading:', {
            hasUser: !!user,
            userId: user?.id,
            authLoading,
            authReady
          });
          return;
        }

        if (!user?.id) {
          console.log('⚠️ [NO USER] Auth ready but no user ID found');
          return;
        }
        
        const data = payload.payload;

        // 🔍 DEBUG: Log broadcast notification data
        console.log('🔍 [Broadcast Notification]', {
          notification_type: data.notification_type,
          author_name: data.author_name,
          provider_name: data.provider_name,
          display_name: data.display_name,
          asset_name: data.asset_name,
          entry_price: data.entry_price,
          has_full_data: !!data.author_name
        });

        if (!data) return;

        // GUARD 1: TIMESTAMP FILTERING
        const eventTimestamp = data.timestamp || data.created_at;
        if (!eventTimestamp) {
          console.warn('⚠️ [MISSING TIMESTAMP] Ignoring broadcast without timestamp');
          return;
        }

        const eventTime = new Date(eventTimestamp).getTime();
        if (isNaN(eventTime)) {
          console.warn('⚠️ [INVALID TIMESTAMP] Ignoring broadcast with invalid timestamp');
          return;
        }

        // Filter events older than component mount
        if (eventTime < componentMountTimeRef.current) {
          console.log('⏭️ [REPLAY PREVENTION] Ignoring pre-mount broadcast');
          return;
        }

        const now = Date.now();
        const ageMs = now - eventTime;
        if (ageMs > DEDUP_WINDOW_MS) {
          console.log(`⏱️ [BACKFILL] Broadcast received after delay ${Math.round(ageMs / 1000)}s`);
        }
        
        // GUARD 2: PAYLOAD VALIDATION
        if (!data.asset_name || !data.notification_type) {
          console.warn('⚠️ [INVALID BROADCAST] Missing required fields');
          return;
        }

        // Map notification types
        let type: ModernNotification['type'] = 'trade_closed';
        let title = '';
        let message = '';
        let computedPipsData: PipsData | undefined;

        const symbolForPips =
          data.tradermade_symbol ||
          data.symbol ||
          data.asset_name;
        const entryPrice =
          typeof data.entry_price !== 'undefined'
            ? parseFloat(data.entry_price)
            : undefined;

        switch (data.notification_type) {
          // ============================================
          // Type 1: NEW SIGNAL (BUY/SELL) - Blue
          // ============================================
          case 'signal_created': {
            type = 'new_signal';
            const tradeDirection = data.trade_type?.toUpperCase().includes('BUY') ? 'BUY' : 'SELL';
            title = `🚀 New ${tradeDirection} Signal`;
            message = `${tradeDirection} Signal is Posted on ${data.asset_name} at $${data.entry_price}`;
            break;
          }

          // ============================================
          // Type 2: PENDING LIMIT - Yellow
          // ============================================
          case 'pending_limit_created':
          case 'limit_order_created': {
            type = 'pending_limit';
            const limitDirection = data.trade_type === 'buy_limit' ? 'BUY' : 'SELL';
            title = `⏳ Pending ${limitDirection} Limit`;
            message = `Waiting to reached ${data.asset_name} at $${data.entry_price}`;
            break;
          }

          // ============================================
          // Type 3: LIMIT ACTIVATED - Blue
          // ============================================
          case 'limit_activated':
          case 'limit_order_activated': {
            type = 'limit_activated';
            const activatedDirection = data.trade_type?.replace('_limit', '').toUpperCase();
            title = `✅ ${activatedDirection} Limit Activated`;
            message = `${activatedDirection} LIMIT is activated on ${data.asset_name} at $${data.entry_price}`;
            break;
          }

          // ============================================
          // Type 4: TP HIT (TP1-TP5) - Green
          // ============================================
          case 'tp_hit':
          case 'take_profit_hit':
          case 'multiple_tps_hit': {
            type = 'tp_hit';
            
            // Get TP number
            const tpNumber = data.tp_number || data.tp_hits?.[data.tp_hits.length - 1] || 1;
            
            // Get TP price
            let tpPrice = data.triggered_price;
            if (!tpPrice) {
              const tpField = `tp${tpNumber}`;
              tpPrice = data[tpField];
            }
            
            // Calculate pips
            if (tpPrice && entryPrice && symbolForPips && data.trade_type) {
              computedPipsData = calculatePipsForSignal(
                entryPrice,
                parseFloat(tpPrice),
                symbolForPips,
                data.trade_type
              );
            }

            const tpPipsText =
              computedPipsData?.formatted ||
              (data.pips
                ? `${data.pips.endsWith('PIPS') ? data.pips : `${data.pips} PIPS`}`
                : undefined);

            title = `🎯 Take Profit Hit`;
            message = `TP (${tpNumber}) HIT on ${data.asset_name} at $${tpPrice || 'N/A'}${
              tpPipsText ? ` | ${tpPipsText}` : ''
            }`;
            break;
          }

          // ============================================
          // Type 5: STOP LOSS HIT - Red
          // ============================================
          case 'stop_loss_hit': {
            type = 'stop_loss';
            
            const slPrice = data.stop_loss || data.triggered_price || data.target_price;
            
            if (slPrice && entryPrice && symbolForPips && data.trade_type) {
              computedPipsData = calculatePipsForSignal(
                entryPrice,
                parseFloat(slPrice),
                symbolForPips,
                data.trade_type
              );
            }

            const slPipsText =
              computedPipsData?.formatted ||
              (data.pips
                ? `${data.pips.startsWith('-') ? data.pips : `-${data.pips}`}${
                    data.pips.includes('PIPS') ? '' : ' PIPS'
                  }`
                : undefined);

            title = `▼ Stop Loss Hit`;
            message = `SL HIT on ${data.asset_name} at $${slPrice || 'N/A'}${
              slPipsText ? ` | ${slPipsText}` : ''
            }`;
            break;
          }

          // ============================================
          // Type 6: MANUAL CLOSE - Grey
          // ============================================
          case 'manual_close':
          case 'manually_closed': {
            type = 'manual_close';
            title = `🔒 Manually Closed`;
            message = `manually closed ${data.asset_name}`;
            break;
          }

          // ============================================
          // Type 7: MANUAL CLOSE WITH TP HIT - Grey
          // ============================================
          case 'manual_close_with_tp_hit': {
            type = 'manual_close';
            
            if (entryPrice && symbolForPips && data.trade_type && data.triggered_price) {
              computedPipsData = calculatePipsForSignal(
                entryPrice,
                parseFloat(data.triggered_price),
                symbolForPips,
                data.trade_type
              );
            } else if (data.pips) {
              computedPipsData = {
                value: parseFloat(data.pips),
                formatted: data.pips.includes('PIPS') ? data.pips : `${data.pips} PIPS`,
                direction: data.pips.startsWith('-') ? 'loss' : 'profit'
              };
            }

            const securedText =
              computedPipsData?.formatted ||
              (data.pips
                ? `${data.pips.startsWith('+') ? data.pips : `+${data.pips}`} ${
                    data.pips.includes('PIPS') ? '' : 'PIPS'
                  }`
                : '+0 PIPS');

            title = `💰 Closed in Profits`;
            message = `Secured Profits on ${data.asset_name} | ${securedText}`;
            break;
          }

          // ============================================
          // Type 8: ALL TPS HIT - Green
          // ============================================
          case 'all_tps_hit':
          case 'all_take_profits_hit': {
            type = 'trade_closed';
            
            const highestTP = data.tp5 || data.tp4 || data.tp3 || data.tp2 || data.tp1;
            if (highestTP && entryPrice && symbolForPips && data.trade_type) {
              computedPipsData = calculatePipsForSignal(
                entryPrice,
                parseFloat(highestTP),
                symbolForPips,
                data.trade_type
              );
            }

            const allTpText =
              computedPipsData?.formatted ||
              (data.pips
                ? `${data.pips.includes('PIPS') ? data.pips : `${data.pips} PIPS`}`
                : '+0 PIPS');

            title = `🎉 ALL TPs HIT`;
            message = `${data.asset_name} completed all Profits successfully | ${allTpText}`;
            break;
          }

          // ============================================
          // Type 9: NOTES UPDATED - Yellow
          // ============================================
          case 'notes_updated': {
            type = 'notes_updated';
            title = `📝 Notes Updated`;
            message = `${data.author_name || 'Educator'} updated notes for ${data.asset_name}`;
            break;
          }

          // ============================================
          // Default: REJECT
          // ============================================
          default: {
            console.warn(`⚠️ Unknown notification type: "${data.notification_type}"`);
            return;
          }
        }

        const finalizedPipsData =
          computedPipsData ||
          (typeof data.pips !== 'undefined' && data.pips !== null
            ? {
                value: parseFloat(data.pips) || 0,
                formatted: data.pips.includes('PIPS') ? data.pips : `${data.pips} PIPS`,
                direction: data.pips && data.pips.startsWith('-') ? 'loss' : 'profit'
              }
            : undefined);

        console.log('✅ [ModernNotificationSystem] Notification prepared:', {
          type,
          signal_id: data.signal_id,
          asset_name: data.asset_name,
        });

        // 🚀 CRITICAL FIX: Actually call handleNotification with the prepared data!
        handleNotification({
          type,
          title,
          message,
          metadata: {
            signal_id: data.signal_id,
            asset_name: data.asset_name,
            author_name: data.author_name,
            author_avatar_url: data.author_avatar_url,
            author_user_type: data.author_user_type,
            provider_name: data.provider_name || data.author_name,
            provider_avatar_url: data.metadata?.provider_avatar_url || data.author_avatar_url,
            provider_type: data.metadata?.provider_type || data.author_user_type,
            display_name: data.display_name || data.author_name,
            entry_price: data.entry_price,
            trade_type: data.trade_type,
            triggered_price: data.triggered_price,
            tp_number: data.tp_number,
            pips_data: finalizedPipsData,
            tp_hits: data.tp_hits || [],
            total_tps: [data.tp1, data.tp2, data.tp3, data.tp4, data.tp5].filter(Boolean).length,
            progress_percentage: data.progress_percentage,
            close_reason: data.close_reason,
          },
          timestamp: new Date(eventTime),
          eventKey: `${data.signal_id}-${data.notification_type}-${eventTime}`,
          deliveryChannel: 'realtime'
        });
      })
      .subscribe((status) => {
        // Log every subscription status change
        console.log('📡 [Channel Status]', status, {
          channel: 'instant-alerts',
          event: 'signal_notification',
          user_id: user?.id,
          timestamp: new Date().toISOString(),
          mounted_at: new Date(componentMountTimeRef.current).toISOString()
        });
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Channel] Successfully subscribed to instant-alerts');
          console.log('✅ [Channel] Ready to receive signal notifications');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ [Channel] Subscription error - will retry on reconnect');
        } else if (status === 'TIMED_OUT') {
          console.error('❌ [Channel] Subscription timed out - check network connection');
          console.log('🔄 [Fallback] Continuing with client-side notifications only');
        } else if (status === 'CLOSED') {
          console.warn('⚠️ [Channel] Channel closed - will reconnect on next mount');
          console.log('🔄 [Fallback] window.addNotification() still available for client-side notifications');
        }
      });

    return () => {
      console.log('🔔 [ModernNotificationSystem] Cleaning up channel subscription');
      supabase.removeChannel(channel);
      bc.close();
      (window as any).notificationBroadcastChannel = null;
      console.log('🔔 [ModernNotificationSystem] Cleanup completed');
    };
  }, [handleNotification]); // ✅ Added handleNotification dependency

  const getGradientClass = (type: string) => {
    const gradients: Record<string, string> = {
      new_signal: 'from-blue-500/10 via-blue-500/5 to-transparent',
      pending_limit: 'from-yellow-500/10 via-yellow-500/5 to-transparent',
      tp_hit: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      stop_loss: 'from-red-500/10 via-red-500/5 to-transparent',
      trade_closed: 'from-green-500/10 via-green-500/5 to-transparent',
      limit_activated: 'from-blue-500/10 via-blue-500/5 to-transparent',
      manual_close: 'from-gray-500/10 via-gray-500/5 to-transparent',
      notes_updated: 'from-yellow-500/10 via-yellow-500/5 to-transparent',
    };
    return gradients[type] || 'from-gray-500/10 via-gray-500/5 to-transparent';
  };

  const getBorderClass = (type: string) => {
    const borderColors: Record<string, string> = {
      new_signal: 'border-l-blue-500',
      pending_limit: 'border-l-yellow-500',
      tp_hit: 'border-l-emerald-500',
      stop_loss: 'border-l-red-500',
      trade_closed: 'border-l-green-500',
      limit_activated: 'border-l-blue-500',
      manual_close: 'border-l-gray-500',
      notes_updated: 'border-l-yellow-500',
    };
    return borderColors[type] || 'border-l-gray-500';
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-md">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          >
            <Card className={`overflow-hidden border-2 border-l-4 shadow-2xl backdrop-blur-md bg-gradient-to-br ${getGradientClass(notification.type)} ${getBorderClass(notification.type)} border-border/50`}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    {notification.metadata?.provider_avatar_url || notification.metadata?.provider_name ? (
                      <ProviderAvatar
                        avatarUrl={notification.metadata.provider_avatar_url}
                        displayName={notification.metadata.provider_name || 'Educator'}
                        userType={notification.metadata.provider_type}
                        size="md"
                        showBadge={true}
                      />
                    ) : null}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground text-sm">
                          {notification.metadata?.provider_name || 'Educator'}
                        </h4>
                        <NotificationBadge 
                          type={notification.type} 
                          priority={notification.priority}
                        />
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {notification.metadata?.asset_name || notification.title}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNotification(notification.id)}
                    className="text-muted-foreground hover:text-foreground p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <p className="text-foreground text-sm leading-relaxed">
                    {notification.message}
                  </p>

                  {/* ✅ PIPS and Progress on same line - right aligned */}
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1">
                      {notification.metadata?.pips_data && 
                       notification.metadata.pips_data.value !== 0 && 
                       notification.metadata.pips_data.value !== undefined && (
                        <ProfitLossDisplay pipsData={notification.metadata.pips_data} size="md" />
                      )}
                    </div>
                    
                    {notification.type === 'tp_hit' &&
                     notification.metadata?.tp_hits &&
                     notification.metadata?.total_tps &&
                     notification.metadata.tp_hits.some(tp => tp && tp > 0) && (
                      <div className="flex-shrink-0">
                        <ProgressIndicator 
                          tpHits={notification.metadata.tp_hits}
                          totalTPs={notification.metadata.total_tps}
                          showPercentage={true}
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <span className="text-muted-foreground text-xs">
                      {notification.timestamp.toLocaleTimeString()}
                    </span>
                    {notification.metadata?.signal_id && (
                      <Button
                        variant="link"
                        size="sm"
                        className="text-primary text-xs p-0 h-auto"
                        onClick={() => {
                          window.location.href = `/dashboard/signal-stream?signal=${notification.metadata?.signal_id}`;
                        }}
                      >
                        View Signal →
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ModernNotificationSystem;
