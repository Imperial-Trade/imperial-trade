
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
  // Business Plan optimization logging
  useEffect(() => {
    console.log('🚀 Business Plan: Ultra-fast WebSocket pricing for', symbol);
  }, [symbol]);

  const optimizedData = useOptimizedLivePrice(symbol, {
    enableSmartPausing: false, // Disabled for fastest updates with business plan
    debounceMs: 100, // Reduced to 100ms for business plan speed
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
