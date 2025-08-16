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

interface OptimizedInstantAlertsOptions {
  enableAudioNotifications?: boolean;
  enableBrowserNotifications?: boolean;
  enableToastNotifications?: boolean;
  maxRetries?: number;
  baseRetryDelay?: number;
}

export const useOptimizedInstantAlerts = (options: OptimizedInstantAlertsOptions = {}) => {
  const {
    enableAudioNotifications = true,
    enableBrowserNotifications = true,
    enableToastNotifications = true,
    maxRetries = 3,
    baseRetryDelay = 2000
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const channelRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const isReconnectingRef = useRef(false);

  // Optimized notification handlers
  const handleAlertNotification = useCallback((payload: AlertNotification) => {
    console.log('🚨 OPTIMIZED ALERT:', payload);
    
    const { alert_type, target_price, triggered_price, urgency } = payload;
    
    // Format alert message
    const alertTypeDisplay = alert_type.replace('_', ' ').toUpperCase();
    const priceDirection = triggered_price >= target_price ? '📈' : '📉';
    const urgencyEmoji = urgency === 'critical' ? '🚨' : urgency === 'high' ? '⚡' : '💰';
    
    const title = `${urgencyEmoji} ${alertTypeDisplay} TRIGGERED!`;
    const message = `${priceDirection} Target: $${target_price.toFixed(2)} | Triggered: $${triggered_price.toFixed(2)}`;
    
    // Non-blocking toast notification
    if (enableToastNotifications) {
      if (urgency === 'critical') {
        toast.error(title, {
          description: message,
          duration: 8000,
          className: 'border-destructive bg-destructive/10 text-destructive'
        });
      } else {
        toast.success(title, {
          description: message,
          duration: 5000,
          className: 'border-primary bg-primary/10 text-primary'
        });
      }
    }

    // Browser notification (non-blocking)
    if (enableBrowserNotifications && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
          requireInteraction: urgency === 'critical',
          silent: urgency !== 'critical'
        });
      } catch (error) {
        console.warn('Browser notification failed:', error);
      }
    }

    // Audio notification for critical alerts (non-blocking)
    if (enableAudioNotifications && urgency === 'critical') {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
        
        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.15);
      } catch (error) {
        console.warn('Audio notification failed:', error);
      }
    }
  }, [enableAudioNotifications, enableBrowserNotifications, enableToastNotifications]);

  const handleSignalCreated = useCallback((payload: any) => {
    if (!enableToastNotifications) return;
    
    const asset = payload.asset_name || 'New Signal';
    const author = payload.author_name?.trim() || 'Member';
    
    toast.success(`${author} posted a new signal`, {
      description: `${asset} • ${payload.trade_type?.toUpperCase() || 'Signal'}`,
      duration: 4000,
      className: 'border-primary bg-primary/10 text-primary'
    });
  }, [enableToastNotifications]);

  const handleSignalUpdated = useCallback((payload: any) => {
    if (!enableToastNotifications) return;
    
    const asset = payload.asset_name || 'Signal';
    const status = payload.status?.toUpperCase();
    
    if (status === 'CLOSED') {
      toast.message('Signal closed', {
        description: `${asset} signal has been closed`,
        duration: 3000,
        className: 'border-muted bg-muted/10 text-muted-foreground'
      });
    }
  }, [enableToastNotifications]);

  // Optimized connection management
  const connect = useCallback(() => {
    if (isReconnectingRef.current || channelRef.current) {
      return;
    }

    isReconnectingRef.current = true;
    
    try {
      const channel = supabase
        .channel('optimized-instant-alerts')
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
          console.log('📡 Optimized alerts status:', status);
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            setConnectionAttempts(0);
            isReconnectingRef.current = false;
            
            // Clear any pending reconnection
            if (reconnectTimeoutRef.current) {
              clearTimeout(reconnectTimeoutRef.current);
              reconnectTimeoutRef.current = null;
            }
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setIsConnected(false);
            isReconnectingRef.current = false;
            scheduleReconnect();
          }
        });

      channelRef.current = channel;
    } catch (error) {
      console.error('Connection failed:', error);
      isReconnectingRef.current = false;
      scheduleReconnect();
    }
  }, [handleAlertNotification, handleSignalCreated, handleSignalUpdated]);

  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current || connectionAttempts >= maxRetries) {
      return;
    }

    const delay = baseRetryDelay * Math.pow(2, connectionAttempts);
    const jitteredDelay = delay + Math.random() * 1000;
    
    setConnectionAttempts(prev => prev + 1);
    
    reconnectTimeoutRef.current = window.setTimeout(() => {
      reconnectTimeoutRef.current = null;
      connect();
    }, jitteredDelay);
  }, [connectionAttempts, maxRetries, baseRetryDelay, connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (channelRef.current) {
      try {
        supabase.removeChannel(channelRef.current);
      } catch (error) {
        console.warn('Error removing channel:', error);
      }
      channelRef.current = null;
    }
    
    setIsConnected(false);
    isReconnectingRef.current = false;
  }, []);

  // Auto-reconnect on visibility change and network events
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !isConnected && connectionAttempts < maxRetries) {
        connect();
      }
    };

    const handleOnline = () => {
      if (!isConnected && connectionAttempts < maxRetries) {
        setConnectionAttempts(0);
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
    };
  }, [isConnected, connectionAttempts, maxRetries, connect]);

  // Initial connection
  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return {
    isConnected,
    connectionAttempts,
    reconnect: connect,
    disconnect
  };
};