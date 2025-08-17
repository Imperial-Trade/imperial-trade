
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { MarketHoursService } from '@/services/MarketHoursService';
interface OptimizedLivePriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  dataSource: 'tradermade' | 'unavailable';
  priceUpdateSource: 'websocket' | 'websocket_institutional' | 'http' | 'unknown';
  refreshPrice: () => void;
  marketStatus?: {
    isOpen: boolean;
    sessionName?: string;
    lastKnownPrice?: number;
    timeUntilNext?: string;
  };
}

interface UseOptimizedLivePriceOptions {
  enableSmartPausing?: boolean;
  debounceMs?: number;
  pauseOnInput?: boolean;
}

export function useOptimizedLivePrice(
  symbol: string,
  options: UseOptimizedLivePriceOptions = {}
): OptimizedLivePriceData {
  const {
    debounceMs = 10 // Default ultra-low debounce for near-instant updates
  } = options;

  const {
    prices,
    connectionStatus,
    dataSource,
    lastUpdated: contextLastUpdated,
    errors,
    priceUpdateSources,
    subscribe,
    unsubscribe,
    getPrice,
    refreshPrice: contextRefreshPrice
  } = useWebSocketPrices();

  const [debouncedPrice, setDebouncedPrice] = useState({
    price: 0,
    change: 0,
    changePercent: 0
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [marketStatus, setMarketStatus] = useState<OptimizedLivePriceData['marketStatus']>();

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to symbol on mount (skip when market is closed)
  useEffect(() => {
    if (!symbol) return;

    const status = MarketHoursService.getMarketStatus(symbol);
    if (!status.isOpen) {
      // Ensure we are not subscribed when market is closed
      unsubscribe([symbol]);
      return;
    }

    subscribe([symbol]);

    return () => {
      unsubscribe([symbol]);
    };
  }, [symbol, subscribe, unsubscribe]);

  // Update market status with real-time countdown
  useEffect(() => {
    const updateMarketStatus = async () => {
      try {
        const { MarketHoursService } = await import('@/services/MarketHoursService');
        const status = MarketHoursService.getMarketStatus(symbol);
        const timeUntilNext = MarketHoursService.getTimeUntilNextEvent(status);
        
        setMarketStatus({
          isOpen: status.isOpen,
          sessionName: status.sessionName,
          timeUntilNext,
          lastKnownPrice: debouncedPrice.price > 0 ? debouncedPrice.price : undefined
        });
      } catch (error) {
        console.error('Failed to get market status:', error);
      }
    };

    updateMarketStatus();
    const interval = setInterval(updateMarketStatus, 1000); // Update every second for live countdown
    
    return () => clearInterval(interval);
  }, [symbol, debouncedPrice.price]);

  // Optimized price updates with smart debouncing
  useEffect(() => {
    const currentPrice = getPrice(symbol);
    
    if (!currentPrice) return;

    // Near-instant updates: no significance gating, minimal debounce
    const isUltraFastTick = currentPrice.is_ultra_fast_tick === true;
    const dynamicDelay = isUltraFastTick ? 0 : Math.max(0, Math.min(debounceMs, 10));

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedPrice({
        price: currentPrice.price,
        change: currentPrice.change,
        changePercent: currentPrice.changePercent
      });
      const tickMs = currentPrice.tick_timestamp ?? (currentPrice.timestamp ? Date.parse(currentPrice.timestamp) : Date.now());
      setLastUpdated(new Date(tickMs));
    }, dynamicDelay);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [prices, symbol, debounceMs, getPrice]);

  const refreshPrice = useCallback(() => {
    if (marketStatus && !marketStatus.isOpen) return; // Do not fetch when market is closed
    contextRefreshPrice(symbol);
  }, [contextRefreshPrice, symbol, marketStatus]);

  // Get error for this specific symbol or global error
  const symbolError = errors[symbol] || errors.global || null;

  return {
    price: debouncedPrice.price,
    change: debouncedPrice.change,
    changePercent: debouncedPrice.changePercent,
    isLoading: connectionStatus === 'connecting',
    error: symbolError,
    lastUpdated: lastUpdated || contextLastUpdated,
    connectionStatus,
    dataSource,
    priceUpdateSource: priceUpdateSources[symbol] || 'unknown',
    refreshPrice,
    marketStatus
  };
}
