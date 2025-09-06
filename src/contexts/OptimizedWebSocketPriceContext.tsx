import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSymbolStreamingPolicy, canStreamAnySymbol, getUnifiedMarketStatus } from '@/utils/unifiedMarketHours';
import { smartPriceOptimizer } from '@/services/SmartPriceOptimizer';
import { SmartReconnectionProvider, useSmartReconnection } from '@/contexts/SmartReconnectionContext';

// Simple price data interface
interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

// Optimized context type - much simpler than the hybrid version
interface OptimizedWebSocketContextType {
  prices: Record<string, PriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  getPrice: (symbol: string) => PriceData | null;
  isConnected: boolean;
  error: string | null;
}

const OptimizedWebSocketContext = createContext<OptimizedWebSocketContextType | null>(null);

export const useOptimizedWebSocketPrices = () => {
  const context = useContext(OptimizedWebSocketContext);
  if (!context) {
    throw new Error('useOptimizedWebSocketPrices must be used within OptimizedWebSocketPriceProvider');
  }
  return context;
};

interface OptimizedWebSocketPriceProviderProps {
  children: React.ReactNode;
}

const OptimizedWebSocketPriceProviderInner: React.FC<OptimizedWebSocketPriceProviderProps> = ({
  children
}) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const isAuthenticatedRef = useRef<boolean>(false);
  const connectionStartTime = useRef<number>(0);
  
  // PHASE 3: Use smart reconnection context
  const { scheduleReconnection, cancelReconnection } = useSmartReconnection();

  // COST OPTIMIZED: Connection to enhanced-websocket-streaming with batching
  const WEBSOCKET_URL = 'wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-websocket-streaming';

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('🔄 WebSocket already connected');
      return;
    }

    setConnectionStatus('connecting');
    setError(null);

    // 24/7 CONNECTION: Always connect for live price data
    console.log('🔥 24/7 CONNECTION: Connecting for continuous live price streaming');

    const wsUrl = `${import.meta.env.VITE_SUPABASE_URL?.replace('https://', 'wss://').replace('http://', 'ws://')}/functions/v1/enhanced-websocket-streaming`;
    
    console.log('🔌 Connecting to optimized WebSocket:', wsUrl);

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

        socket.onopen = () => {
          console.log('✅ WebSocket connected');
          setConnectionStatus('connected');
          setError(null);
          
          // ULTRA-FAST: Subscribe immediately on connection (auth handled by edge function)
          const currentSymbols = Array.from(subscriptionsRef.current);
          if (currentSymbols.length === 0) {
            // Default subscribe to main trading symbols
            currentSymbols.push('BTCUSD', 'XAUUSD');
            subscriptionsRef.current.add('BTCUSD');
            subscriptionsRef.current.add('XAUUSD');
          }
          
          console.log('🚀 IMMEDIATE SUBSCRIBE:', currentSymbols);
          socket.send(JSON.stringify({
            type: 'subscribe',
            symbols: currentSymbols
          }));
          
          // Heartbeat to keep connection alive
          const heartbeatInterval = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: 'ping' }));
            } else {
              clearInterval(heartbeatInterval);
            }
          }, 25000);
        };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === 'price_update') {
            // ULTRA-FAST: Immediate price data processing
            const priceData: PriceData = {
              symbol: message.symbol,
              price: message.mid,
              change: message.change || 0,
              changePercent: message.changePercent || 0,
              timestamp: message.timestamp || new Date().toISOString()
            };
            
            // ULTRA-FAST: Direct state update + caching for sub-50ms latency
            setPrices(prev => ({
              ...prev,
              [message.symbol]: priceData
            }));
            
            // Cache for quick bootstrap and smooth interpolation
            try {
              localStorage.setItem(`price_${message.symbol}`, JSON.stringify(priceData));
            } catch (e) {
              // Ignore localStorage errors
            }
            
            console.log(`🔥 ULTRA-FAST: ${message.symbol} = ${message.mid} (LIVE)`);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('❌ 24/7 WebSocket error detected:', error);
        setConnectionStatus('error');
        setError('Connection error - Reconnecting for 24/7 service...');
        
        // Track connection failure
        smartPriceOptimizer.updateConnectionHealth(999, false);
      };

      socket.onclose = (event) => {
        console.log(`🔌 24/7 WebSocket connection closed: ${event.code} ${event.reason || ''}`);
        setConnectionStatus('disconnected');
        isAuthenticatedRef.current = false;
        
        // Don't reconnect if closed intentionally
        if (event.code === 1000) {
          console.log('🛑 Intentional disconnection - no reconnection');
          return;
        }
        
        // For 24/7 service, reconnect immediately for all other cases
        console.log('🔄 24/7 RECONNECTION: Immediate reconnect for continuous service');
        setTimeout(() => connect(), 1000); // 1 second delay for immediate reconnect
      };

    } catch (error) {
      console.error('❌ Connection setup failed:', error);
      setConnectionStatus('error');
      setError('Failed to establish connection - Retrying for 24/7 service');
      
      // For 24/7 service, retry immediately
      setTimeout(() => connect(), 2000);
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting 24/7 WebSocket...');
    
    if (socketRef.current) {
      socketRef.current.close(1000, 'Manual disconnect');
      socketRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setError(null);
    isAuthenticatedRef.current = false;
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    console.log('📡 Subscribing to symbols:', symbols);
    
    // Add symbols to our subscription set
    symbols.forEach(symbol => subscriptionsRef.current.add(symbol));
    
    // Connect if not already connected
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      connect();
      return;
    }
    
    // Send subscription if already connected and authenticated
    if (isAuthenticatedRef.current) {
      const supportedSymbols = symbols.filter(s => ['BTCUSD', 'XAUUSD'].includes(s.toUpperCase()));
      if (supportedSymbols.length > 0) {
        try {
          socketRef.current.send(JSON.stringify({ type: 'subscribe', symbols: supportedSymbols }));
        } catch (error) {
          console.error('❌ Error sending subscription:', error);
        }
      }
    }
  }, [connect]);

  const unsubscribe = useCallback((symbols: string[]) => {
    console.log('📡 Unsubscribing from symbols:', symbols);
    
    // Remove symbols from our subscription set
    symbols.forEach(symbol => subscriptionsRef.current.delete(symbol));
    
    // Send unsubscription if connected and authenticated
    if (socketRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
      const supportedSymbols = symbols.filter(s => ['BTCUSD', 'XAUUSD'].includes(s.toUpperCase()));
      if (supportedSymbols.length > 0) {
        try {
          socketRef.current.send(JSON.stringify({ type: 'unsubscribe', symbols: supportedSymbols }));
        } catch (error) {
          console.error('❌ Error sending unsubscription:', error);
        }
      }
    }
  }, []);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    // First try live prices
    if (prices[symbol]) {
      return prices[symbol];
    }
    
    // Fallback to smart cache
    const cachedPrice = smartPriceOptimizer.getCachedPrice(symbol);
    if (cachedPrice) {
      return {
        symbol: cachedPrice.symbol,
        price: cachedPrice.price,
        change: 0,
        changePercent: 0,
        timestamp: cachedPrice.timestamp.toISOString()
      };
    }
    
    return null;
  }, [prices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const contextValue: OptimizedWebSocketContextType = {
    prices,
    connectionStatus,
    subscribe,
    unsubscribe,
    getPrice,
    isConnected: connectionStatus === 'connected',
    error
  };

  return (
    <OptimizedWebSocketContext.Provider value={contextValue}>
      {children}
    </OptimizedWebSocketContext.Provider>
  );
};

// PHASE 3: Wrap with Smart Reconnection Provider
export const OptimizedWebSocketPriceProvider: React.FC<OptimizedWebSocketPriceProviderProps> = ({
  children
}) => {
  const handleReconnect = useCallback(async () => {
    // This will be connected to the inner component's connect function
    console.log('🔄 Smart reconnection triggered');
  }, []);

  return (
    <SmartReconnectionProvider onReconnect={handleReconnect}>
      <OptimizedWebSocketPriceProviderInner>
        {children}
      </OptimizedWebSocketPriceProviderInner>
    </SmartReconnectionProvider>
  );
};