import { useEffect, useCallback, useState } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

// PHASE 2B: Direct WebSocket alerts to replace expensive Realtime subscriptions
interface WebSocketAlert {
  type: 'alert_triggered' | 'signal_updated' | 'signal_closed';
  signal_id: string;
  alert_type: string;
  symbol: string;
  triggered_price: number;
  timestamp: string;
}

export function useOptimizedWebSocketAlerts() {
  const [alerts, setAlerts] = useState<WebSocketAlert[]>([]);
  const { connectionStatus } = useOptimizedWebSocketPrices();

  const handleWebSocketAlert = useCallback((alert: WebSocketAlert) => {
    console.log('🔔 PHASE 2B: WebSocket alert received:', alert);
    
    // Add to alerts list and auto-remove after 30 seconds
    setAlerts(prev => [...prev, alert]);
    
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.signal_id !== alert.signal_id));
    }, 30000);
    
    // Dispatch custom event for other components
    window.dispatchEvent(new CustomEvent('websocket-alert', { detail: alert }));
  }, []);

  useEffect(() => {
    if (connectionStatus === 'connected') {
      console.log('✅ PHASE 2B: WebSocket alerts active - Realtime usage minimized');
    }
  }, [connectionStatus]);

  return {
    alerts,
    connectionStatus,
    alertsEnabled: connectionStatus === 'connected'
  };
}