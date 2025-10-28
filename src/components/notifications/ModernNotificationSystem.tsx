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
import { capacitorNotificationService } from '@/services/CapacitorNotificationService';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

interface ModernNotification {
  id: string;
  type: 'new_signal' | 'tp_hit' | 'stop_loss' | 'trade_closed' | 'limit_activated' | 'notes_updated' | 'manual_close';
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

const ModernNotificationSystem = () => {
  // Safely get auth context - handle case where it's not ready yet
  let user: any = undefined;
  let authReady = false;

  try {
    const auth = useAuth();
    user = auth.user || undefined;
    authReady = true;
  } catch (error) {
    // AuthContext not initialized yet - this is expected during initial render
    console.log('⏳ [ModernNotificationSystem] AuthProvider not ready yet, deferring initialization');
    authReady = false;
  }

  // Don't render notification listeners until auth is ready
  // This prevents race conditions during app initialization
  if (!authReady) {
    return null;
  }

  const [notifications, setNotifications] = useState<ModernNotification[]>([]);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);
  const componentMountTimeRef = useRef<number>(Date.now());
  const isMountedRef = useRef<boolean>(true);

  const playNotificationSound = useCallback((type: string) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequencies: Record<string, number> = {
      new_signal: 800,
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
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    async (notification: any) => {
      const now = Date.now();
      const cooldown = 5000;

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
          console.log(`🚫 Notification blocked by validation: ${validation.reason}`);
          return;
        }

        const rateLimitPassed = await notificationValidator.checkNotificationRateLimit(notification.metadata.signal_id);
        if (!rateLimitPassed) {
          console.log(`🚫 Notification blocked by rate limit: ${notification.metadata.signal_id}`);
          return;
        }
      }

      if (now - lastNotificationTime < cooldown) {
        console.warn('Notification suppressed due to cooldown.');
        return;
      }

      // Enhanced deduplication with 120s TTL
      const notificationKey = notification.eventKey || `${notification.title}:${notification.message}`;
      const lastShownTime = (window as any).lastShownMap?.get(notificationKey) || 0;
      if (now - lastShownTime < 120000) {
        console.warn('Notification suppressed due to 120s deduplication:', notificationKey);
        return;
      }
      
      if (!(window as any).lastShownMap) {
        (window as any).lastShownMap = new Map();
      }
      (window as any).lastShownMap.set(notificationKey, now);

      setLastNotificationTime(now);

      const id = Date.now() + Math.random();
      const enhancedNotification: ModernNotification = { 
        ...notification, 
        id: id.toString(), 
        timestamp: new Date(),
        eventKey: notification.eventKey || `notification_${id}`,
        deliveryChannel: notification.deliveryChannel || 'in_app'
      };
      
      setNotifications((prev) => [enhancedNotification, ...prev]);
      setTimeout(() => removeNotification(id.toString()), 8000);
      playNotificationSound(notification.type);

      // Use Capacitor notification service for cross-platform notifications
      await capacitorNotificationService.showNotification({
        title: notification.title,
        body: notification.message,
        data: notification.metadata || {},
        eventKey: notification.eventKey,
        type: notification.type,
        signalId: notification.metadata?.signal_id,
      });

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
    (window as any).addNotification = addNotification;
    return () => {
      isMountedRef.current = false;
      delete (window as any).addNotification;
    };
  }, [addNotification]);

  // Set up real-time listener for signal notifications
  useEffect(() => {
    if (!user?.id) return;

    componentMountTimeRef.current = Date.now();
    console.log('🔔 [ModernNotificationSystem] Setting up broadcast listeners');

    const channel = supabase
      .channel('instant-alerts')
      .on('broadcast', { event: 'signal_notification' }, (payload) => {
        if (!isMountedRef.current) {
          console.log('⏭️ [UNMOUNTED] Ignoring broadcast after unmount');
          return;
        }

        console.log('🚨 [ModernNotificationSystem] Received signal notification:', payload);
        
        const data = payload.payload;
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

        // Filter events older than 30 seconds
        const now = Date.now();
        const ageMs = now - eventTime;
        if (ageMs > 30000) {
          console.log(`⏭️ [TOO OLD] Ignoring broadcast older than 30s (${Math.round(ageMs / 1000)}s old)`);
          return;
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

        switch (data.notification_type) {
          case 'signal_created':
            type = 'new_signal';
            title = `🚨 New ${data.trade_type?.toUpperCase()} Signal`;
            message = `${data.author_name} posted ${data.asset_name} at $${data.entry_price}`;
            break;
          case 'tp_hit':
          case 'take_profit_hit':
            type = 'tp_hit';
            title = `🎯 TP Hit - ${data.asset_name}`;
            message = `TP ${data.tp_hits?.[data.tp_hits.length - 1] || '1'} reached at $${data.triggered_price || data.target_price}`;
            break;
          case 'stop_loss_hit':
            type = 'stop_loss';
            title = `🔴 Stop Loss Hit - ${data.asset_name}`;
            message = `Stop loss triggered at $${data.triggered_price || data.target_price}`;
            break;
          case 'limit_activated':
            type = 'limit_activated';
            title = `✅ Limit Order Activated - ${data.asset_name}`;
            message = `${data.trade_type?.replace('_', ' ')?.toUpperCase()} order activated at $${data.entry_price}`;
            break;
          case 'manual_close':
            type = 'manual_close';
            title = `🔒 Signal Manually Closed - ${data.asset_name}`;
            message = `${data.author_name} manually closed the signal`;
            break;
          case 'notes_updated':
            type = 'notes_updated';
            title = `📝 Notes Updated - ${data.asset_name}`;
            message = `${data.author_name} updated signal notes`;
            break;
          case 'all_tps_hit':
            type = 'trade_closed';
            title = `🎉 All TPs Hit - ${data.asset_name}`;
            message = `Trade completed successfully by ${data.author_name}`;
            break;
          default:
            title = `📊 Signal Update - ${data.asset_name}`;
            message = `${data.author_name} updated the signal`;
        }

        addNotification({
          type,
          title,
          message,
          metadata: {
            signal_id: data.signal_id,
            provider_name: data.author_name,
            provider_avatar_url: data.author_avatar_url,
            provider_type: data.author_user_type,
            asset_name: data.asset_name,
            tp_hits: data.tp_hits,
            total_tps: data.total_tps,
          },
          eventKey: data.event_key,
          timestamp: new Date(eventTime),
        });
      })
      .subscribe();

    // Also listen for custom signal events
    const handleSignalPosted = () => {
      if (!isMountedRef.current) return;
      
      addNotification({
        type: 'new_signal',
        title: '🚨 New Signal Posted',
        message: 'A new trading signal has been created',
        metadata: {},
        timestamp: new Date(),
      });
    };

    window.addEventListener('signal-posted', handleSignalPosted);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('signal-posted', handleSignalPosted);
      console.log('🔔 [ModernNotificationSystem] Cleanup completed');
    };
  }, [user?.id, addNotification]);

  const getGradientClass = (type: string) => {
    const gradients: Record<string, string> = {
      new_signal: 'from-blue-500/10 via-blue-500/5 to-transparent',
      tp_hit: 'from-emerald-500/10 via-emerald-500/5 to-transparent',
      stop_loss: 'from-red-500/10 via-red-500/5 to-transparent',
      trade_closed: 'from-green-500/10 via-green-500/5 to-transparent',
      limit_activated: 'from-purple-500/10 via-purple-500/5 to-transparent',
      manual_close: 'from-orange-500/10 via-orange-500/5 to-transparent',
      notes_updated: 'from-yellow-500/10 via-yellow-500/5 to-transparent',
    };
    return gradients[type] || 'from-gray-500/10 via-gray-500/5 to-transparent';
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
            <Card className={`overflow-hidden border-2 shadow-2xl backdrop-blur-md bg-gradient-to-br ${getGradientClass(notification.type)} border-border/50`}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 flex-1">
                    {notification.metadata?.provider_avatar_url || notification.metadata?.provider_name ? (
                      <ProviderAvatar
                        avatarUrl={notification.metadata.provider_avatar_url}
                        displayName={notification.metadata.provider_name || 'Provider'}
                        userType={notification.metadata.provider_type}
                        size="md"
                        showBadge={true}
                      />
                    ) : null}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground text-sm">
                          {notification.metadata?.provider_name || 'Provider'}
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

                  {notification.metadata?.pips_data && (
                    <ProfitLossDisplay pipsData={notification.metadata.pips_data} size="md" />
                  )}

                  {notification.metadata?.tp_hits && notification.metadata?.total_tps && (
                    <ProgressIndicator 
                      tpHits={notification.metadata.tp_hits}
                      totalTPs={notification.metadata.total_tps}
                      showPercentage={true}
                    />
                  )}

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
