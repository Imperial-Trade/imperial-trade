import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AlertNotification {
  signal_id: string;
  alert_type: string;
  target_price: number;
  triggered_price: number;
  notification_type: string;
  timestamp: string;
  urgency: 'critical' | 'high' | 'normal';
}

export const useInstantAlerts = () => {
  const handleAlertNotification = useCallback((payload: AlertNotification) => {
    console.log('🚨 INSTANT ALERT RECEIVED:', payload);
    
    const { alert_type, target_price, triggered_price, urgency } = payload;
    
    // Format alert message
    const alertTypeDisplay = alert_type.replace('_', ' ').toUpperCase();
    const priceDirection = triggered_price >= target_price ? '📈' : '📉';
    const urgencyEmoji = urgency === 'critical' ? '🚨' : urgency === 'high' ? '⚡' : '💰';
    
    const title = `${urgencyEmoji} ${alertTypeDisplay} TRIGGERED!`;
    const message = `${priceDirection} Target: $${target_price.toFixed(2)} | Triggered: $${triggered_price.toFixed(2)}`;
    
    // Show toast notification with appropriate styling
    if (urgency === 'critical') {
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
    } else {
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
  }, []);

  const handleSignalCreated = useCallback((payload: any) => {
    console.log('🆕 NEW SIGNAL CREATED:', payload);

    const asset = payload.asset_name || payload.symbol || 'New Signal';
    const type = (payload.trade_type || '').toUpperCase();
    const entry = payload.entry_price;

    const title = `New Signal Created`;
    const message = `${asset} • ${type}${entry ? ` @ $${Number(entry).toFixed(2)}` : ''}`;

    toast.success(title, {
      description: message,
      duration: 6000,
      className: 'border-primary bg-primary/10 text-primary',
      action: {
        label: 'View',
        onClick: () => console.log('Navigate to signal:', payload.signal_id)
      }
    });

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/favicon.ico'
      });
    }
  }, []);

  useEffect(() => {
    console.log('🔔 Setting up instant alert notifications...');

    // Subscribe to instant alert channel
    const channel = supabase
      .channel('instant-alerts')
      .on('broadcast', { event: 'alert_triggered' }, ({ payload }) => {
        handleAlertNotification(payload as AlertNotification);
      })
      .on('broadcast', { event: 'signal_created' }, ({ payload }) => {
        handleSignalCreated(payload);
      })
      .subscribe((status) => {
        console.log('📡 Instant alerts subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to instant alerts');
          
          // Notification permission is handled centrally by NotificationsContext
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
          console.log('📊 Alert monitoring change detected:', payload);
          // Additional fallback notification handling could go here
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 Cleaning up instant alert subscriptions');
      supabase.removeChannel(channel);
      supabase.removeChannel(alertMonitoringChannel);
    };
  }, [handleAlertNotification]);

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
        urgency: alertType === 'stop_loss' ? 'critical' : 'high'
      });
    }, [handleAlertNotification])
  };
};