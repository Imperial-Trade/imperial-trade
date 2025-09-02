
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { supabase } from '@/integrations/supabase/client';
import { getStandardSymbol } from '@/types/assets';

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

  // Enhanced symbol normalization for BTC/XAU mapping consistency
  const normalizedSymbol = (() => {
    const standardSymbol = getStandardSymbol(symbol) || symbol.toUpperCase();
    // Ensure BTC and XAU map properly to tradermade symbols
    switch (standardSymbol) {
      case 'BTC':
      case 'BITCOIN':
        return 'BTCUSD';
      case 'XAU':
      case 'GOLD':
        return 'XAUUSD';
      default:
        return standardSymbol;
    }
  })();

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
    refreshPrice: contextRefreshPrice,
    subscribeToPriceUpdates,
    validatePriceConsistency,
    getFallbackTelemetry
  } = useWebSocketPrices();

  const [debouncedPrice, setDebouncedPrice] = useState({
    price: 0,
    change: 0,
    changePercent: 0
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [lastSignificantUpdate, setLastSignificantUpdate] = useState<Date | null>(null);
  const [lastNonZeroPrice, setLastNonZeroPrice] = useState<number>(0);
  const [localPriceSource, setLocalPriceSource] = useState<'websocket' | 'websocket_institutional' | 'http' | 'unknown'>('unknown');

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedPriceRef = useRef<number>(0);
  const updateCounterRef = useRef<number>(0);
  const staleGuardTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const httpFallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountTimeRef = useRef<Date>(new Date());
  const fallbackTriggeredRef = useRef<{ lastTrigger: string; timestamp: number } | null>(null);

  // localStorage utilities for price persistence with 10-minute TTL
  const getStoredPrice = useCallback((sym: string) => {
    try {
      const stored = localStorage.getItem(`lastPrice:${sym}`);
      if (stored) {
        const { price, timestamp } = JSON.parse(stored);
        const storedTime = new Date(timestamp);
        const now = new Date();
        const ageMinutes = (now.getTime() - storedTime.getTime()) / (1000 * 60);
        
        // Only use stored price if less than 10 minutes old
        if (ageMinutes < 10) {
          return { price: Number(price), timestamp: storedTime };
        } else {
          // Remove stale price
          localStorage.removeItem(`lastPrice:${sym}`);
        }
      }
    } catch (e) {
      console.warn('Failed to read stored price:', e);
    }
    return null;
  }, []);

  const storePrice = useCallback((sym: string, price: number, timestamp: Date) => {
    try {
      localStorage.setItem(`lastPrice:${sym}`, JSON.stringify({
        price,
        timestamp: timestamp.toISOString()
      }));
    } catch (e) {
      console.warn('Failed to store price:', e);
    }
  }, []);

  // REMOVED: HTTP fallback logic moved to context for single source of truth

  // Initialize with stored price on mount
  useEffect(() => {
    const stored = getStoredPrice(normalizedSymbol);
    if (stored && stored.price > 0) {
      console.log(`💾 [${normalizedSymbol}] Restored from storage:`, stored.price);
      setLastNonZeroPrice(stored.price);
      setDebouncedPrice({
        price: stored.price,
        change: 0,
        changePercent: 0
      });
      setLastUpdated(stored.timestamp);
      lastProcessedPriceRef.current = stored.price;
    }
  }, [normalizedSymbol, getStoredPrice]);

  // GUARDRAIL: Subscribe once with centralized updates only
  useEffect(() => {
    if (!normalizedSymbol) return;

    subscribe([normalizedSymbol]);

    // Subscribe to centralized price updates - SINGLE SOURCE OF TRUTH
    const unsubscribeFromPriceUpdates = subscribeToPriceUpdates((symbol, priceData) => {
      if (symbol === normalizedSymbol) {
        console.log(`📡 [${normalizedSymbol}] Hook received centralized update:`, priceData.price);
        
        // Update immediately with centralized data
        setDebouncedPrice({
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent
        });
        setLastUpdated(new Date(priceData.timestamp));
        setLastNonZeroPrice(priceData.price);
        lastProcessedPriceRef.current = priceData.price;
        storePrice(normalizedSymbol, priceData.price, new Date(priceData.timestamp));
      }
    });

    return () => {
      unsubscribe([normalizedSymbol]);
      unsubscribeFromPriceUpdates();
    };
  }, [normalizedSymbol, subscribe, unsubscribe, subscribeToPriceUpdates, storePrice]);

  // REMOVED: Fallback logic moved to context - hook only receives centralized updates

  // REMOVED: Direct price processing removed - hook only receives centralized updates

  // Guard against symbol changes causing stale updates
  useEffect(() => {
    // Reset refs when symbol changes to prevent cross-symbol updates
    lastProcessedPriceRef.current = 0;
    if (fallbackTriggeredRef.current) {
      fallbackTriggeredRef.current = null;
    }
  }, [normalizedSymbol]);

  const refreshPrice = useCallback(async () => {
    // GUARDRAIL: Single refresh through context only
    contextRefreshPrice(normalizedSymbol);
  }, [contextRefreshPrice, normalizedSymbol]);

  // Get error for this specific symbol or global error
  const symbolError = errors[normalizedSymbol] || errors.global || null;

  // GUARDRAIL: Enhanced connection status with 30s sticky-live
  const enhancedConnectionStatus = (() => {
    const dataFreshness = lastUpdated ? (Date.now() - lastUpdated.getTime()) / 1000 : Infinity;
    const hasValidPrice = debouncedPrice.price > 0;
    
    // GUARDRAIL: Show "connected" for 60s after last update (sticky-live)
    if (dataFreshness < 60 && hasValidPrice) {
      return 'connected';
    }
    
    return connectionStatus;
  })();

  return {
    price: debouncedPrice.price || lastNonZeroPrice, // Fallback to last good price
    change: debouncedPrice.change,
    changePercent: debouncedPrice.changePercent,
    isLoading: enhancedConnectionStatus === 'connecting' && debouncedPrice.price === 0,
    error: symbolError,
    lastUpdated: lastUpdated || contextLastUpdated,
    connectionStatus: enhancedConnectionStatus,
    dataSource,
    priceUpdateSource: localPriceSource !== 'unknown' ? localPriceSource : (priceUpdateSources[normalizedSymbol] || 'unknown'),
    refreshPrice
  };
}
