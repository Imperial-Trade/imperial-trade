import { useEffect, useCallback, useRef, useState } from 'react';
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

    const author = (payload.author_name || '').trim();

    const title = author ? `${author} posted a new signal` : `New Signal Created`;
    const details = [
      asset,
      type ? type : undefined,
      entry ? `@ $${Number(entry).toFixed(2)}` : undefined,
      payload.stop_loss ? `SL $${Number(payload.stop_loss).toFixed(2)}` : undefined
    ].filter(Boolean).join(' • ');

    toast.success(title, {
      description: details,
      duration: 6000,
      className: 'border-primary bg-primary/10 text-primary',
      action: {
        label: 'View',
        onClick: () => console.log('Navigate to signal:', payload.signal_id)
      }
    });

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: details,
        icon: '/favicon.ico'
      });
    }
  }, []);

  const handleSignalUpdated = useCallback((payload: any) => {
    console.log('♻️ SIGNAL UPDATED:', payload);

    const asset = payload.asset_name || payload.symbol || 'Signal';
    const author = (payload.author_name || '').trim();
    const title = author ? `${author} updated signal` : `Signal updated`;

    const status = payload.status ? String(payload.status).toUpperCase() : undefined;
    const tpHits = Array.isArray(payload.tp_hits) && payload.tp_hits.length ? `TP hits ${payload.tp_hits.join(',')}` : undefined;
    const closeReason = payload.close_reason ? `Close: ${String(payload.close_reason).replace('_',' ')}` : undefined;
    const notes = payload.notes ? (String(payload.notes).length > 80 ? String(payload.notes).slice(0,77) + '...' : String(payload.notes)) : undefined;

    const details = [asset, status ? `Status ${status}` : undefined, tpHits, closeReason, notes]
      .filter(Boolean)
      .join(' • ');

    toast.message(title, {
      description: details || 'Signal details updated',
      duration: 6000,
      className: 'border-primary bg-primary/10 text-primary',
      action: {
        label: 'View',
        onClick: () => console.log('Navigate to signal:', payload.signal_id)
      }
    });

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: details || 'Signal details updated',
        icon: '/favicon.ico'
      });
    }
  }, []);

  // Realtime connection state
  const channelRef = useRef<any>(null);
  const monitorRef = useRef<any>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    console.log('🔔 Setting up instant alert notifications with resilience...');

    const MAX_RETRIES = 5;
    const BASE_DELAY = 1000;
    const JITTER = 300;

    let attempts = 0;
    let subscribed = false;
    let reconnectTimer: number | null = null;
    let handshakeTimer: number | null = null;
    let delayedErrorTimer: number | null = null;

    const clearTimers = () => {
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
      if (handshakeTimer) { clearTimeout(handshakeTimer); handshakeTimer = null; }
      if (delayedErrorTimer) { clearTimeout(delayedErrorTimer); delayedErrorTimer = null; }
    };

    const scheduleReconnect = () => {
      if (reconnectTimer) return;
      attempts += 1;
      setIsSubscribed(false);
      if (attempts > MAX_RETRIES) {
        console.error('❌ Instant alerts failed after retries');
        return;
      }
      const delay = Math.min(BASE_DELAY * Math.pow(2, attempts - 1) + Math.random() * JITTER, 15000);
      console.log(`⏳ Reconnecting to instant alerts in ${delay}ms (attempt ${attempts}/${MAX_RETRIES})`);
      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        connect();
      }, delay) as unknown as number;
    };

    const connect = () => {
      // Remove existing channel if any
      if (channelRef.current) {
        try { supabase.removeChannel(channelRef.current); } catch {}
        channelRef.current = null;
      }
      subscribed = false;

      const ch = supabase
        .channel('instant-alerts')
        .on('broadcast', { event: 'alert_triggered' }, ({ payload }) => {
          handleAlertNotification(payload as AlertNotification);
        })
        .on('broadcast', { event: 'signal_created' }, ({ payload }) => {
          handleSignalCreated(payload);
        })
        .on('broadcast', { event: 'signal_updated' }, ({ payload }) => {
          handleSignalUpdated(payload);
        })
        .subscribe((status) => {
          console.log('📡 Instant alerts subscription status:', status);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Successfully subscribed to instant alerts');
            subscribed = true;
            attempts = 0;
            setIsSubscribed(true);

            // Ensure fallback monitoring channel exists
            if (!monitorRef.current) {
              monitorRef.current = supabase
                .channel('alert-monitoring-changes')
                .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'alert_monitoring', filter: 'is_active=eq.false' }, (payload) => {
                  console.log('📊 Alert monitoring change detected:', payload);
                })
                .subscribe();
            }

            if (handshakeTimer) { clearTimeout(handshakeTimer); handshakeTimer = null; }
            if (delayedErrorTimer) { clearTimeout(delayedErrorTimer); delayedErrorTimer = null; }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            console.warn('⚠️ Instant alerts channel issue, scheduling reconnect...');
            scheduleReconnect();
          }
        });

      channelRef.current = ch;

      // Handshake timeout
      handshakeTimer = window.setTimeout(() => {
        if (!subscribed) {
          console.warn('⚠️ Instant alerts handshake timeout');
          scheduleReconnect();
        }
      }, 5000) as unknown as number;

      // Delayed user-facing message after 10s if still not connected
      delayedErrorTimer = window.setTimeout(() => {
        if (!subscribed) {
          toast.message('Alert notifications temporarily unavailable', {
            description: 'Still connecting… We will keep trying in the background.'
          });
        }
      }, 10000) as unknown as number;
    };

    connect();

    const onOnline = () => {
      if (!subscribed) {
        attempts = 0;
        scheduleReconnect();
      }
    };

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !subscribed) {
        attempts = 0;
        scheduleReconnect();
      }
    };

    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      clearTimers();
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      if (monitorRef.current) supabase.removeChannel(monitorRef.current);
      channelRef.current = null;
      monitorRef.current = null;
      console.log('🔕 Cleaning up instant alert subscriptions');
    };
  }, [handleAlertNotification, handleSignalCreated, handleSignalUpdated]);

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