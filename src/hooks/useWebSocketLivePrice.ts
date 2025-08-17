
// Enhanced WebSocket live price hook with performance optimizations
import { useOptimizedLivePrice } from './useOptimizedLivePrice';
import { logLegacyUsage } from '@/utils/legacyCleanup';
import { useEffect } from 'react';

interface LivePriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
}

export function useWebSocketLivePrice(symbol: string): LivePriceData {
  // Log usage for performance monitoring
  useEffect(() => {
    console.log('✅ Using WebSocket-based live pricing for', symbol);
  }, [symbol]);

  const optimizedData = useOptimizedLivePrice(symbol, {
    enableSmartPausing: false, // Disabled for fastest updates
    debounceMs: 0, // Zero debounce for ultra-fast updates
    pauseOnInput: false
  });

  return {
    price: optimizedData.price,
    change: optimizedData.change,
    changePercent: optimizedData.changePercent,
    isLoading: optimizedData.isLoading,
    error: optimizedData.error,
    lastUpdated: optimizedData.lastUpdated,
    connectionStatus: optimizedData.connectionStatus
  };
}
