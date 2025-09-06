// PHASE 3: Enhanced Live Price Hook with Smart Optimization
// Integrates smart caching, interpolation, and performance monitoring

import { useState, useEffect, useCallback } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { smartPriceOptimizer } from '@/services/SmartPriceOptimizer';

interface OptimizedLivePriceOptions {
  enableSmartPausing?: boolean;
  debounceMs?: number;
  pauseOnInput?: boolean;
  enableInterpolation?: boolean;
}

interface OptimizedLivePriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  priceQuality: 'fresh' | 'interpolated' | 'stale' | 'cached';
  dataSource?: string;
  priceUpdateSource?: 'websocket' | 'websocket_institutional' | 'http' | 'unknown';
  refreshPrice: () => void;
}

export function useOptimizedLivePrice(
  symbol: string,
  options: OptimizedLivePriceOptions = {}
): OptimizedLivePriceData {
  const {
    enableSmartPausing = true,
    debounceMs = 50,
    pauseOnInput = false,
    enableInterpolation = true
  } = options;

  const { prices, connectionStatus, subscribe, unsubscribe } = useOptimizedWebSocketPrices();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceQuality, setPriceQuality] = useState<'fresh' | 'interpolated' | 'stale' | 'cached'>('fresh');

  // Normalize symbol
  const normalizeSymbol = (sym: string): string => {
    const upperSym = sym.toUpperCase();
    
    // Map common variations
    const symbolMap: Record<string, string> = {
      'BTC': 'BTCUSD',
      'BITCOIN': 'BTCUSD',
      'XAU': 'XAUUSD',
      'GOLD': 'XAUUSD'
    };
    
    return symbolMap[upperSym] || upperSym;
  };

  const normalizedSymbol = normalizeSymbol(symbol);

  // Get current price with smart fallbacks
  const getCurrentPrice = useCallback((): OptimizedLivePriceData => {
    const livePrice = prices[normalizedSymbol];
    
    if (livePrice) {
      return {
        price: livePrice.price,
        change: livePrice.change,
        changePercent: livePrice.changePercent,
        isLoading: false,
        error: null,
        lastUpdated: new Date(livePrice.timestamp),
        connectionStatus,
        priceQuality: 'fresh',
        dataSource: 'WebSocket Live',
        priceUpdateSource: 'websocket',
        refreshPrice: () => refreshPrice()
      };
    }

    // Try smart cache
    const cachedPrice = smartPriceOptimizer.getCachedPrice(normalizedSymbol);
    if (cachedPrice) {
      const age = Date.now() - cachedPrice.timestamp.getTime();
      let quality: 'fresh' | 'interpolated' | 'stale' | 'cached' = 'cached';
      
      if (age < 10000) { // Less than 10 seconds
        quality = 'fresh';
      } else if (age < 30000) { // Less than 30 seconds
        quality = 'stale';
      } else {
        quality = 'cached';
      }

      // Apply interpolation if enabled and price is stale
      let finalPrice = cachedPrice.price;
      if (enableInterpolation && quality === 'stale') {
        const secondsGap = age / 1000;
        finalPrice = smartPriceOptimizer.interpolatePrice(normalizedSymbol, cachedPrice.price, secondsGap);
        quality = 'interpolated';
      }

      return {
        price: finalPrice,
        change: 0, // No change data for cached prices
        changePercent: 0,
        isLoading: false,
        error: connectionStatus === 'error' ? 'Connection error - using cached data' : null,
        lastUpdated: cachedPrice.timestamp,
        connectionStatus,
        priceQuality: quality,
        dataSource: 'Smart Cache',
        priceUpdateSource: 'unknown',
        refreshPrice: () => refreshPrice()
      };
    }

    // No data available
    return {
      price: 0,
      change: 0,
      changePercent: 0,
      isLoading: connectionStatus === 'connecting',
      error: connectionStatus === 'error' ? 'Unable to fetch live prices' : null,
      lastUpdated: null,
      connectionStatus,
      priceQuality: 'stale',
      dataSource: 'None',
      priceUpdateSource: 'unknown',
      refreshPrice: () => refreshPrice()
    };
  }, [prices, normalizedSymbol, connectionStatus, enableInterpolation]);

  // Subscribe to symbol on mount
  useEffect(() => {
    if (normalizedSymbol && ['BTCUSD', 'XAUUSD'].includes(normalizedSymbol)) {
      console.log(`📈 Subscribing to optimized live price for ${normalizedSymbol}`);
      subscribe([normalizedSymbol]);
      setIsLoading(true);
      
      // Clear loading state after a timeout
      const loadingTimeout = setTimeout(() => {
        setIsLoading(false);
      }, 3000);

      return () => {
        console.log(`📉 Unsubscribing from live price for ${normalizedSymbol}`);
        unsubscribe([normalizedSymbol]);
        clearTimeout(loadingTimeout);
      };
    } else {
      setError(`Symbol ${normalizedSymbol} not supported - only BTCUSD and XAUUSD available`);
      setIsLoading(false);
    }
  }, [normalizedSymbol, subscribe, unsubscribe]);

  // Update loading state based on connection
  useEffect(() => {
    if (connectionStatus === 'connected' && prices[normalizedSymbol]) {
      setIsLoading(false);
      setError(null);
    } else if (connectionStatus === 'error') {
      setIsLoading(false);
      setError('Connection error - using cached data if available');
    }
  }, [connectionStatus, prices, normalizedSymbol]);

  // Refresh function
  const refreshPrice = useCallback(() => {
    console.log(`🔄 Refreshing price for ${normalizedSymbol}`);
    
    // Re-subscribe to trigger fresh data
    unsubscribe([normalizedSymbol]);
    setTimeout(() => {
      subscribe([normalizedSymbol]);
    }, 100);
  }, [normalizedSymbol, subscribe, unsubscribe]);

  return getCurrentPrice();
}