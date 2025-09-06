// PHASE 2B: Enhanced WebSocket Alert Integration
// Replaces heavy Realtime subscriptions with efficient WebSocket notifications

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WebSocketAlertData {
  signal_id: string;
  alert_type: string;
  symbol: string;
  target_price: number;
  triggered_price: number;
  status: string;
  timestamp: string;
}

interface OptimizedWebSocketAlertsHook {
  alertsEnabled: boolean;
  lastAlert: WebSocketAlertData | null;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  subscribe: () => void;
  unsubscribe: () => void;
}

export const useOptimizedWebSocketAlerts = (): OptimizedWebSocketAlertsHook => {
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [lastAlert, setLastAlert] = useState<WebSocketAlertData | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const connect = async () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // PHASE 2B: Connect to enhanced WebSocket streaming for alert notifications
      const { data: session } = await supabase.auth.getSession();
      const wsUrl = 'wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-websocket-streaming';
      
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('🚨 PHASE 2B: Alert WebSocket connected');
        setConnectionStatus('connected');
        
        // Authenticate for alert notifications
        if (session?.session?.access_token) {
          socket.send(JSON.stringify({
            type: 'auth_alerts',
            token: session.session.access_token,
            subscription_type: 'alerts_only'
          }));
        }
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'alert_notification') {
            console.log('🚨 PHASE 2B: Alert notification received:', data);
            
            const alertData: WebSocketAlertData = {
              signal_id: data.signal_id,
              alert_type: data.alert_type,
              symbol: data.symbol,
              target_price: data.target_price,
              triggered_price: data.triggered_price,
              status: data.status,
              timestamp: data.timestamp || new Date().toISOString()
            };
            
            setLastAlert(alertData);
            
            // Dispatch browser notification for critical alerts
            if (data.alert_type === 'stop_loss' || data.alert_type.includes('take_profit')) {
              dispatchBrowserNotification(alertData);
            }
            
            // Dispatch custom event for UI updates
            window.dispatchEvent(new CustomEvent('websocket-alert-received', { detail: alertData }));
          }
        } catch (error) {
          console.error('❌ Error parsing alert WebSocket message:', error);
        }
      };

      socket.onclose = () => {
        console.log('🔌 PHASE 2B: Alert WebSocket disconnected');
        setConnectionStatus('disconnected');
        
        // Reconnect after 5 seconds
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 5000);
      };

      socket.onerror = (error) => {
        console.error('❌ PHASE 2B: Alert WebSocket error:', error);
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('❌ Failed to connect to alert WebSocket:', error);
      setConnectionStatus('error');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setAlertsEnabled(false);
  };

  const subscribe = () => {
    console.log('🚨 PHASE 2B: Enabling optimized WebSocket alerts');
    setAlertsEnabled(true);
    connect();
  };

  const unsubscribe = () => {
    console.log('🚫 PHASE 2B: Disabling optimized WebSocket alerts');
    setAlertsEnabled(false);
    disconnect();
  };

  // Browser notification for critical alerts
  const dispatchBrowserNotification = (alertData: WebSocketAlertData) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      const title = `${alertData.alert_type.toUpperCase()} Alert`;
      const body = `${alertData.symbol}: ${alertData.alert_type} triggered at ${alertData.triggered_price}`;
      
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: `alert-${alertData.signal_id}`,
        requireInteraction: true
      });
    }
  };

  // Auto-enable alerts on mount
  useEffect(() => {
    subscribe();
    return unsubscribe;
  }, []);

  return {
    alertsEnabled,
    lastAlert,
    connectionStatus,
    subscribe,
    unsubscribe
  };
};