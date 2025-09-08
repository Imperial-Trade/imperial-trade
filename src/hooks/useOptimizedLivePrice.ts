// Phase 3: Optimized Live Price Hook with Throttling & Backward Compatibility
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { pricePerformanceMonitor } from '@/utils/pricePerformanceMonitor';

interface PriceData {
  symbol: string;
  price: number;
  ts: string;
}

interface LivePriceOptions {
  debounceMs?: number;
  enableSmartPausing?: boolean;
  pauseOnInput?: boolean;
}

interface LivePriceReturn {
  // Backward compatibility
  price: number | null;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: string;
  dataSource: string;
  priceUpdateSource: string;
  refreshPrice: () => Promise<void>;
  // New optimized properties
  livePrice: number | null;
  lastUpdate: string | null;
  isConnected: boolean;
  dataAge: number;
  isStale: boolean;
  isVeryStale: boolean;
}

export function useOptimizedLivePrice(symbol: string, options: LivePriceOptions = {}): LivePriceReturn {
  const [priceState, setPriceState] = useState({
    price: null as number | null,
    change: 0,
    changePercent: 0,
    isLoading: true,
    error: null as string | null,
    lastUpdated: null as Date | null,
    connectionStatus: 'connecting',
    dataSource: 'websocket',
    priceUpdateSource: 'websocket_institutional',
    dataAge: 0
  });

  // Phase 3: Throttling configuration
  const throttledUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdateRef = useRef<PriceData | null>(null);
  const previousPriceRef = useRef<number | null>(null);
  const THROTTLE_DELAY_MS = options.debounceMs || 250;

  const applyThrottledUpdate = useCallback((priceData: PriceData) => {
    pendingUpdateRef.current = priceData;
    pricePerformanceMonitor.recordPriceUpdate(false);
    
    if (!throttledUpdateRef.current) {
      // Immediate update for first price
      const prevPrice = previousPriceRef.current;
      const newPrice = priceData.price;
      const change = prevPrice ? newPrice - prevPrice : 0;
      const changePercent = prevPrice && prevPrice > 0 ? (change / prevPrice) * 100 : 0;

      setPriceState(prev => ({
        ...prev,
        price: newPrice,
        change,
        changePercent,
        isLoading: false,
        error: null,
        lastUpdated: new Date(priceData.ts),
        connectionStatus: 'connected',
        dataAge: 0
      }));

      previousPriceRef.current = newPrice;
      pricePerformanceMonitor.recordUIUpdate();

      // Set up throttling for subsequent updates
      throttledUpdateRef.current = setTimeout(() => {
        const pending = pendingUpdateRef.current;
        if (pending) {
          const prevPrice = previousPriceRef.current;
          const newPrice = pending.price;
          const change = prevPrice ? newPrice - prevPrice : 0;
          const changePercent = prevPrice && prevPrice > 0 ? (change / prevPrice) * 100 : 0;

          setPriceState(prev => ({
            ...prev,
            price: newPrice,
            change,
            changePercent,
            lastUpdated: new Date(pending.ts),
            dataAge: Date.now() - new Date(pending.ts).getTime()
          }));

          previousPriceRef.current = newPrice;
          pricePerformanceMonitor.recordUIUpdate();
        }
        throttledUpdateRef.current = null;
        pendingUpdateRef.current = null;
      }, THROTTLE_DELAY_MS);
    }
  }, [THROTTLE_DELAY_MS]);

  const refreshPrice = useCallback(async () => {
    setPriceState(prev => ({ ...prev, isLoading: true }));
    // Refresh will be handled by the WebSocket reconnection
    return Promise.resolve();
  }, []);

  useEffect(() => {
    if (!symbol) return;

    console.log(`🔗 Subscribing to optimized live prices for ${symbol}`);
    
    const channel = supabase.channel('live-prices-broadcast');
    let connectionCheckInterval: NodeJS.Timeout;

    // Phase 3: Enhanced connection handling
    setPriceState(prev => ({ 
      ...prev, 
      isLoading: true, 
      connectionStatus: 'connecting',
      error: null 
    }));

    channel.on('broadcast', { event: 'price_update' }, ({ payload }: { payload: PriceData }) => {
      if (payload.symbol === symbol) {
        const latency = Date.now() - new Date(payload.ts).getTime();
        pricePerformanceMonitor.recordLatency(latency);
        console.log(`📈 Received price update for ${symbol}: ${payload.price}`);
        applyThrottledUpdate(payload);
      }
    });

    channel.subscribe((status) => {
      console.log(`📡 WebSocket status for ${symbol}: ${status}`);
      
      setPriceState(prev => ({
        ...prev,
        connectionStatus: status === 'SUBSCRIBED' ? 'connected' : 
                         status === 'CHANNEL_ERROR' ? 'error' : 'connecting',
        isLoading: status !== 'SUBSCRIBED'
      }));

      if (status === 'SUBSCRIBED') {
        connectionCheckInterval = setInterval(() => {
          setPriceState(prev => {
            if (prev.lastUpdated) {
              const age = Date.now() - prev.lastUpdated.getTime();
              return { ...prev, dataAge: age };
            }
            return prev;
          });
        }, 5000);
      } else if (status === 'CHANNEL_ERROR') {
        setPriceState(prev => ({ 
          ...prev, 
          error: 'WebSocket connection error',
          isLoading: false 
        }));
      }
    });

    return () => {
      if (throttledUpdateRef.current) {
        clearTimeout(throttledUpdateRef.current);
        throttledUpdateRef.current = null;
      }
      if (connectionCheckInterval) {
        clearInterval(connectionCheckInterval);
      }
      supabase.removeChannel(channel);
      console.log(`🧹 Cleaned up optimized price subscription for ${symbol}`);
    };
  }, [symbol, applyThrottledUpdate]);

  return {
    // Backward compatibility properties
    price: priceState.price,
    change: priceState.change,
    changePercent: priceState.changePercent,
    isLoading: priceState.isLoading,
    error: priceState.error,
    lastUpdated: priceState.lastUpdated,
    connectionStatus: priceState.connectionStatus,
    dataSource: priceState.dataSource,
    priceUpdateSource: priceState.priceUpdateSource,
    refreshPrice,
    // New optimized properties
    livePrice: priceState.price,
    lastUpdate: priceState.lastUpdated?.toISOString() || null,
    isConnected: priceState.connectionStatus === 'connected',
    dataAge: priceState.dataAge,
    isStale: priceState.dataAge > 60000,
    isVeryStale: priceState.dataAge > 300000
  };
}