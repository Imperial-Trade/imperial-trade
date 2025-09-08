import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useFallbackPrices } from './FallbackPriceContext';

// Simple price data interface
interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

// Optimized context type - now using Supabase Realtime
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

export const OptimizedWebSocketPriceProvider: React.FC<OptimizedWebSocketPriceProviderProps> = ({
  children
}) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const fallbackPrices = useFallbackPrices();

  const connect = useCallback(async () => {
    if (channelRef.current) {
      return; // Already connected
    }

    console.log('🔗 Connecting to Supabase Realtime...');
    setConnectionStatus('connecting');
    setError(null);

    try {
      // Create the live-prices-broadcast channel (matches price-ingestor)
      const channel = supabase.channel('live-prices-broadcast');
      channelRef.current = channel;

      // Set up listener for price updates
      channel.on('broadcast', { event: 'price_update' }, ({ payload }) => {
        console.log('📈 Received price update:', payload);
        
        // Only process if we're subscribed to this symbol
        if (subscriptionsRef.current.has(payload.symbol)) {
          const priceData: PriceData = {
            symbol: payload.symbol,
            price: payload.price,
            change: 0, // Will be calculated by DigitalOcean
            changePercent: 0, // Will be calculated by DigitalOcean
            timestamp: payload.ts || new Date().toISOString()
          };
          setPrices(prev => ({ ...prev, [payload.symbol]: priceData }));
        }
      });

      // Subscribe to the channel
      channel.subscribe((status) => {
        console.log('🔌 Realtime connection status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully connected to Supabase Realtime');
          setConnectionStatus('connected');
          setUsingFallback(false);
          
          // Clear fallback timeout if connection succeeds
          if (fallbackTimeoutRef.current) {
            clearTimeout(fallbackTimeoutRef.current);
            fallbackTimeoutRef.current = null;
          }
          
          // Stop fallback if it was running
          if (fallbackPrices.isActive) {
            fallbackPrices.stopFallback();
          }
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Realtime channel error');
          setConnectionStatus('error');
          setError('Failed to connect to live price channel');
          activateFallback();
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Realtime connection timed out');
          setConnectionStatus('error');
          setError('Connection timed out');
          activateFallback();
        } else if (status === 'CLOSED') {
          console.log('🔌 Realtime connection closed');
          setConnectionStatus('disconnected');
        }
      });
      
      // Set fallback timeout - if no data received in 10 seconds, use fallback
      fallbackTimeoutRef.current = setTimeout(() => {
        if (connectionStatus === 'connecting' || connectionStatus === 'connected') {
          console.log('🚨 No price data received in 10 seconds, activating fallback');
          activateFallback();
        }
      }, 10000);

    } catch (error) {
      console.error('❌ Connection setup failed:', error);
      setConnectionStatus('error');
      setError('Failed to establish connection - please check your network');
      activateFallback();
    }
  }, []);

  const activateFallback = useCallback(() => {
    if (!usingFallback) {
      console.log('🚨 Activating fallback price generation');
      setUsingFallback(true);
      fallbackPrices.startFallback();
      
      // Subscribe fallback to current symbols
      const currentSymbols = Array.from(subscriptionsRef.current);
      if (currentSymbols.length > 0) {
        fallbackPrices.subscribe(currentSymbols);
      }
    }
  }, [usingFallback, fallbackPrices]);

  const disconnect = useCallback(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    // Add strict symbol validation and logging
    const validatedSymbols = symbols.filter(symbol => {
      const isValid = symbol && symbol.trim().length > 0;
      console.log(`🎯 [Subscribe] Symbol: ${symbol} → Valid: ${isValid}`);
      return isValid;
    });
    
    // Add to local subscription tracking - this is passive, just for filtering
    validatedSymbols.forEach(symbol => {
      console.log(`📝 [Subscribe] Adding ${symbol} to subscription set`);
      subscriptionsRef.current.add(symbol);
    });
    
    // Also subscribe fallback to these symbols if it's active
    if (usingFallback && fallbackPrices.isActive) {
      fallbackPrices.subscribe(validatedSymbols);
    }
    
    // Note: With Supabase Realtime, we don't need to send subscription messages
    // The DigitalOcean worker will broadcast all prices, and we filter locally
    console.log(`✅ [Subscribe] Subscribed to symbols (passive filtering):`, validatedSymbols);
  }, [usingFallback, fallbackPrices]);

  const unsubscribe = useCallback((symbols: string[]) => {
    // Remove from local subscription tracking
    symbols.forEach(symbol => {
      console.log(`📝 [Unsubscribe] Removing ${symbol} from subscription set`);
      subscriptionsRef.current.delete(symbol);
    });
    
    // Also unsubscribe from fallback
    if (usingFallback && fallbackPrices.isActive) {
      fallbackPrices.unsubscribe(symbols);
    }
    
    // Remove prices for unsubscribed symbols
    setPrices(prev => {
      const updated = { ...prev };
      symbols.forEach(symbol => delete updated[symbol]);
      return updated;
    });
    
    console.log(`✅ [Unsubscribe] Unsubscribed from symbols:`, symbols);
  }, [usingFallback, fallbackPrices]);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    // Use fallback prices if primary connection is using fallback
    if (usingFallback && fallbackPrices.prices[symbol]) {
      return fallbackPrices.prices[symbol];
    }
    return prices[symbol] || null;
  }, [prices, usingFallback, fallbackPrices.prices]);

  // Initialize connection on mount
  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Merge real-time and fallback prices for display
  const mergedPrices = usingFallback ? { ...prices, ...fallbackPrices.prices } : prices;

  const contextValue: OptimizedWebSocketContextType = {
    prices: mergedPrices,
    connectionStatus: usingFallback ? 'connected' : connectionStatus,
    subscribe,
    unsubscribe,
    getPrice,
    isConnected: connectionStatus === 'connected' || usingFallback,
    error: usingFallback ? null : error
  };

  return (
    <OptimizedWebSocketContext.Provider value={contextValue}>
      {children}
    </OptimizedWebSocketContext.Provider>
  );
};