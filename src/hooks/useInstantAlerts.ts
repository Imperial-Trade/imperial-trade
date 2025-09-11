import { useEffect, useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { realtimeLogger, generateChannelId } from '@/utils/realtimeLogger';

interface AlertNotification {
  signal_id: string;
  alert_type: string;
  target_price: number;
  triggered_price: number;
  notification_type: string;
  timestamp: string;
  urgency: 'critical' | 'high' | 'normal';
  event_key: string;
  v: string;
}

export const useInstantAlerts = () => {
  const { user, profile } = useAuth();
  const dupeMapRef = useRef(new Map<string, number>());
  const [xeonSubscription, setXeonSubscription] = useState<boolean | null>(null);
  
  // 🔥 LEAK-PROOF: Deterministic channel IDs for definitive logging  
  const alertsChannelIdRef = useRef(generateChannelId('alerts'));
  const monitoringChannelIdRef = useRef(generateChannelId('monitor'));
  const mountOnlyRef = useRef(false); // 🔥 LEAK-PROOF: Prevent operations after unmount
  
  const handleAlertNotification = useCallback((payload: AlertNotification) => {
    console.log('🚨 INSTANT ALERT RECEIVED:', payload);
    
    // Check subscription eligibility
    if (xeonSubscription !== true) {
      console.log('⚠️ User not subscribed to Xeon stream, dropping notification');
      return;
    }
    
    // 60s de-duplication by signal_id + alert_type for better specificity
    const now = Date.now();
    const dedupKey = `${payload.signal_id}:${payload.alert_type}`;
    const lastReceived = dupeMapRef.current.get(dedupKey);
    if (lastReceived && (now - lastReceived) < 60000) {
      console.log('🔄 De-duped notification within 60s:', dedupKey);
      return;
    }
    dupeMapRef.current.set(dedupKey, now);
    
    // Optional foreground toast suppression
    const currentPath = window.location.pathname;
    const suppressForegroundToasts = localStorage.getItem('suppressForegroundToasts') === 'true';
    const shouldSuppressToast = currentPath === '/dashboard/signal-stream' && suppressForegroundToasts;
    
    const { alert_type, target_price, triggered_price, urgency } = payload;
    
    // Format alert message
    const alertTypeDisplay = alert_type.replace('_', ' ').toUpperCase();
    const priceDirection = triggered_price >= target_price ? '📈' : '📉';
    const urgencyEmoji = urgency === 'critical' ? '🚨' : urgency === 'high' ? '⚡' : '💰';
    
    const title = `${urgencyEmoji} ${alertTypeDisplay} TRIGGERED!`;
    const message = `${priceDirection} Target: $${target_price.toFixed(2)} | Triggered: $${triggered_price.toFixed(2)}`;
    
    // Call NotificationSystem.addNotification
    if ((window as any).addNotification) {
      (window as any).addNotification({
        type: urgency === 'critical' ? 'error' : 'success',
        title,
        message,
        timestamp: new Date().toISOString()
      });
    }
    
    // Dispatch custom event for badge increment
    window.dispatchEvent(new CustomEvent('notification:received', { 
      detail: { event_key: payload.event_key } 
    }));
    
    // Show toast notification with appropriate styling (unless suppressed)
    if (!shouldSuppressToast && urgency === 'critical') {
      toast.error(title, {
        description: message,
        duration: 10000, // Show critical alerts for 10 seconds
        className: 'border-destructive bg-destructive/10 text-destructive',
        action: {
          label: 'View Signal',
          onClick: () => {
            // Navigate to signal detail - could be enhanced
            console.log('Navigate to signal:', payload.signal_id);
          }
        }
      });
    } else if (!shouldSuppressToast) {
      toast.success(title, {
        description: message,
        duration: 7000, // Show other alerts for 7 seconds
        className: 'border-primary bg-primary/10 text-primary',
        action: {
          label: 'View Signal',
          onClick: () => {
            console.log('Navigate to signal:', payload.signal_id);
          }
        }
      });
    }

    // Play sound notification (browser permitting)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico',
        requireInteraction: urgency === 'critical'
      });
    }

    // Browser beep for urgent alerts
    if (urgency === 'critical') {
      // Create audio beep
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // High pitch for urgency
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (error) {
        console.log('Audio notification not available');
      }
    }
  }, [xeonSubscription]);

  // Check xeon subscription status when user changes
  useEffect(() => {
    const checkXeonSubscription = async () => {
      if (!user) {
        setXeonSubscription(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc('check_user_xeon_subscription');

        if (error) {
          console.warn('Failed to check xeon subscription:', error);
          setXeonSubscription(false);
        } else {
          setXeonSubscription(data || false);
        }
      } catch (error) {
        console.error('Error checking xeon subscription:', error);
        setXeonSubscription(false);
      }
    };

    checkXeonSubscription();
  }, [user]);

  // 🔥 LEAK-PROOF: Setup instant alert notifications with mount guards
  useEffect(() => {
    mountOnlyRef.current = true;
    
    realtimeLogger.logStatus('useInstantAlerts MOUNT');

    // 🔥 DEFINITIVE LOGGING: Always log subscription attempts
    realtimeLogger.logSubscribe(alertsChannelIdRef.current, 'instant-alerts', 'useInstantAlerts');
    realtimeLogger.logSubscribe(monitoringChannelIdRef.current, 'alert-monitoring-changes', 'useInstantAlerts');

    // Subscribe to instant alert channel
    const channel = supabase
      .channel('instant-alerts')
      .on('broadcast', { event: 'alert_triggered' }, ({ payload }) => {
        // 🔥 LEAK-PROOF: Block operations after unmount
        if (!mountOnlyRef.current) return;
        
        handleAlertNotification(payload as AlertNotification);
      })
      .subscribe((status) => {
        if (!mountOnlyRef.current) return;
        
        console.log('📡 Instant alerts subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          // Request notification permission
          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
              console.log('🔔 Notification permission:', permission);
            });
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to instant alerts');
          toast.error('Alert notifications unavailable', {
            description: 'Failed to connect to real-time alerts'
          });
        }
      });

    // Also listen to alert_monitoring table changes for additional reliability
    const alertMonitoringChannel = supabase
      .channel('alert-monitoring-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alert_monitoring',
          filter: 'is_active=eq.false' // Listen for alerts being deactivated (triggered)
        },
        (payload) => {
          // 🔥 LEAK-PROOF: Block operations after unmount
          if (!mountOnlyRef.current) return;
          
          console.log('📊 Alert monitoring change detected:', payload);
          // Additional fallback notification handling could go here
        }
      )
      .subscribe();

    return () => {
      mountOnlyRef.current = false;
      
      realtimeLogger.logStatus('useInstantAlerts UNMOUNT');
      
      // 🔥 DEFINITIVE LOGGING: Always log unsubscription
      realtimeLogger.logUnsubscribe(alertsChannelIdRef.current, 'useInstantAlerts');
      realtimeLogger.logUnsubscribe(monitoringChannelIdRef.current, 'useInstantAlerts');
      
      supabase.removeChannel(channel);
      supabase.removeChannel(alertMonitoringChannel);
    };
  }, [handleAlertNotification, xeonSubscription]); // 🔥 LEAK-PROOF: Stable dependencies only

  return {
    // Could expose methods for manual alert testing, muting, etc.
    testAlert: useCallback((alertType: string = 'take_profit_1') => {
      handleAlertNotification({
        signal_id: 'test-123',
        alert_type: alertType,
        target_price: 3400,
        triggered_price: 3401,
        notification_type: 'take_profit_hit',
        timestamp: new Date().toISOString(),
        urgency: alertType === 'stop_loss' ? 'critical' : 'high',
        event_key: `test_${Date.now()}`,
        v: 'test'
      });
    }, [handleAlertNotification])
  };
};