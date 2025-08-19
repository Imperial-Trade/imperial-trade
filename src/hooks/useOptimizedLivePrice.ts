
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

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
    debounceMs = 100 // Business Plan: Ultra-fast 100ms debouncing for real-time performance
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
  const [lastSignificantUpdate, setLastSignificantUpdate] = useState<Date | null>(null);
  const [lastNonZeroPrice, setLastNonZeroPrice] = useState<number>(0);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedPriceRef = useRef<number>(0);
  const updateCounterRef = useRef<number>(0);

  // Subscribe to symbol on mount
  useEffect(() => {
    if (!symbol) return;

    subscribe([symbol]);

    return () => {
      unsubscribe([symbol]);
    };
  }, [symbol, subscribe, unsubscribe]);

  // Symbol-specific price updates - NO dependency on entire prices object
  useEffect(() => {
    const currentPrice = getPrice(symbol);
    updateCounterRef.current++;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [${symbol}] Price effect #${updateCounterRef.current}:`, {
        currentPrice: currentPrice?.price || 0,
        lastProcessed: lastProcessedPriceRef.current,
        hasPrice: !!currentPrice
      });
    }
    
    if (!currentPrice || currentPrice.price === 0) return;

    // CRITICAL: Always commit the first non-zero price immediately
    const isFirstValidPrice = lastProcessedPriceRef.current === 0 && currentPrice.price > 0;
    
    if (isFirstValidPrice) {
      console.log(`✅ [${symbol}] First valid price committed immediately:`, currentPrice.price);
      setDebouncedPrice({
        price: currentPrice.price,
        change: currentPrice.change,
        changePercent: currentPrice.changePercent
      });
      setLastUpdated(new Date(currentPrice.timestamp));
      setLastNonZeroPrice(currentPrice.price);
      lastProcessedPriceRef.current = currentPrice.price;
      return;
    }

    // For subsequent updates, use smarter significance threshold
    const changePercent = Math.abs((currentPrice.price - lastProcessedPriceRef.current) / lastProcessedPriceRef.current) * 100;
    
    // Business Plan: Ultra-sensitive significance thresholds for live tickers
    const getSignificanceThreshold = (sym: string): number => {
      const upper = sym.toUpperCase();
      if (upper.includes('XAU') || upper.includes('GOLD')) return 0.003; // 0.003% for gold - enhanced sensitivity
      if (upper.includes('BTC') || upper.includes('ETH')) return 0.008;   // 0.008% for crypto - enhanced sensitivity  
      if (upper.includes('USA30') || upper.includes('NAS100')) return 0.002; // 0.002% for indices - enhanced sensitivity
      return 0.003; // 0.003% for forex - enhanced sensitivity for live tickers
    };
    
    if (changePercent < getSignificanceThreshold(symbol)) {
      return;
    }

    // Clear existing timeout to prevent stacking updates
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Business Plan: Ultra-fast debouncing with institutional tick priority
    const isUltraFastTick = currentPrice.is_ultra_fast_tick;
    const isInstitutionalTick = currentPrice.is_institutional_tick;
    const effectiveDebounce = isUltraFastTick ? 30 : isInstitutionalTick ? 50 : Math.min(debounceMs, 100);
    
    debounceTimeoutRef.current = setTimeout(() => {
      const latestPrice = getPrice(symbol);
      if (!latestPrice || latestPrice.price === 0) return;

      setDebouncedPrice({
        price: latestPrice.price,
        change: latestPrice.change,
        changePercent: latestPrice.changePercent
      });
      setLastUpdated(new Date(latestPrice.timestamp));
      setLastNonZeroPrice(latestPrice.price);
      lastProcessedPriceRef.current = latestPrice.price;
      
      if (process.env.NODE_ENV === 'development') {
        const tickType = isUltraFastTick ? '⚡ ULTRA-FAST' : isInstitutionalTick ? '💎 INSTITUTIONAL' : '🚀 BUSINESS';
        console.log(`${tickType} [${symbol}] Price updated:`, latestPrice.price, `[${effectiveDebounce}ms debounce]`);
      }
    }, effectiveDebounce); // Business plan: 50-150ms based on tick type

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [symbol, prices[symbol]?.price, debounceMs, getPrice]); // FIXED: Symbol-specific dependency

  const refreshPrice = useCallback(() => {
    contextRefreshPrice(symbol);
  }, [contextRefreshPrice, symbol]);

  // Get error for this specific symbol or global error
  const symbolError = errors[symbol] || errors.global || null;

  // Business Plan: Enhanced connection status with ultra-fast tolerance
  const enhancedConnectionStatus = (() => {
    // Business plan: Consider connection "effectively connected" with tighter freshness requirements
    const dataFreshness = lastUpdated ? (Date.now() - lastUpdated.getTime()) / 1000 : Infinity;
    const hasValidPrice = debouncedPrice.price > 0;
    
    // Business plan: 15s tolerance for ultra-fast infrastructure
    if (dataFreshness < 15 && hasValidPrice) {
      return 'connected';
    }
    
    // Fallback to 30s for regular connections
    if (dataFreshness < 30 && hasValidPrice) {
      return 'connected';
    }
    
    return connectionStatus;
  })();

  return {
    price: debouncedPrice.price || lastNonZeroPrice, // Fallback to last good price
    change: debouncedPrice.change,
    changePercent: debouncedPrice.changePercent,
    isLoading: enhancedConnectionStatus === 'connecting',
    error: symbolError,
    lastUpdated: lastUpdated || contextLastUpdated,
    connectionStatus: enhancedConnectionStatus,
    dataSource,
    priceUpdateSource: priceUpdateSources[symbol] || 'unknown',
    refreshPrice
  };
}
