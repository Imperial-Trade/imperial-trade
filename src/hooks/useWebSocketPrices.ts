import { useState, useEffect, useCallback, useRef } from 'react';

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: string;
}

interface UseWebSocketPricesReturn {
  prices: Record<string, PriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  error: string | null;
  lastUpdated: Date | null;
}

export const useWebSocketPrices = (): UseWebSocketPricesReturn => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [subscribedSymbols, setSubscribedSymbols] = useState<Set<string>>(new Set());
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 10;
  const reconnectDelay = 5000;

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    console.log('🔌 Connecting to WebSocket price stream...');
    setConnectionStatus('connecting');
    setError(null);

    try {
      // Connect to our edge function WebSocket
      const wsUrl = `wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tradermade-streaming`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ WebSocket price stream connected');
        setConnectionStatus('connected');
        setError(null);
        reconnectAttempts.current = 0;

        // Re-subscribe to existing symbols
        if (subscribedSymbols.size > 0) {
          wsRef.current?.send(JSON.stringify({
            type: 'subscribe',
            symbols: Array.from(subscribedSymbols)
          }));
        }
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'price_update' && message.data) {
            const priceData: PriceData = message.data;
            setPrices(prev => ({
              ...prev,
              [priceData.symbol]: priceData
            }));
            setLastUpdated(new Date());
            
            console.log(`💰 Price update for ${priceData.symbol}:`, priceData.mid);
          } else if (message.type === 'connection_status') {
            console.log('📡 WebSocket status:', message.status);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = (event) => {
        console.log('🔌 WebSocket price stream disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        if (!event.wasClean && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`🔄 Reconnecting in ${reconnectDelay}ms (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectDelay);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Maximum reconnection attempts reached');
          setConnectionStatus('error');
        }
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setError('WebSocket connection error');
        setConnectionStatus('error');
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setError('Failed to create WebSocket connection');
      setConnectionStatus('error');
    }
  }, [subscribedSymbols]);

  const subscribe = useCallback((symbols: string[]) => {
    console.log('📡 Subscribing request received for symbols:', symbols);
    
    // Check if all symbols are already subscribed
    const newSymbols = symbols.filter(symbol => !subscribedSymbols.has(symbol));
    if (newSymbols.length === 0) {
      console.log('📡 All symbols already referenced, skipping network subscribe');
      return;
    }

    setSubscribedSymbols(prev => {
      const updated = new Set(prev);
      symbols.forEach(symbol => updated.add(symbol));
      return updated;
    });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe',
        symbols: symbols
      }));
      console.log('📡 Subscription request sent for:', symbols);
    } else {
      console.log('📡 WebSocket not connected, storing symbols for later subscription');
      connect();
    }
  }, [subscribedSymbols, connect]);

  const unsubscribe = useCallback((symbols: string[]) => {
    setSubscribedSymbols(prev => {
      const updated = new Set(prev);
      symbols.forEach(symbol => updated.delete(symbol));
      return updated;
    });

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe',
        symbols: symbols
      }));
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connect]);

  return {
    prices,
    connectionStatus,
    subscribe,
    unsubscribe,
    error,
    lastUpdated
  };
};