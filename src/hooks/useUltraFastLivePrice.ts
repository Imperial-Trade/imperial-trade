import { useSyncExternalStore, useCallback, useRef } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { priceCacheService } from '@/services/PriceCacheService';

interface UltraFastPriceData {
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: Date | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  isLoading: boolean;
  error: string | null;
  dataSource: 'tradermade' | 'unavailable';
  priceUpdateSource: 'websocket' | 'websocket_institutional' | 'http' | 'unknown';
  isUltraFastTick: boolean;
  tickTimestamp: number | null;
}

/**
 * Ultra-fast live price hook with zero debouncing and direct state access
 * Uses useSyncExternalStore for immediate updates without React batching
 */
export function useUltraFastLivePrice(symbol: string): UltraFastPriceData {
  const {
    prices,
    connectionStatus,
    dataSource,
    lastUpdated,
    errors,
    priceUpdateSources,
    subscribe,
    unsubscribe,
    getPrice
  } = useWebSocketPrices();

  const subscribedRef = useRef(false);
  const latestPriceRef = useRef<UltraFastPriceData>({
    price: 0,
    change: 0,
    changePercent: 0,
    lastUpdated: null,
    connectionStatus: 'disconnected',
    isLoading: true,
    error: null,
    dataSource: 'unavailable',
    priceUpdateSource: 'unknown',
    isUltraFastTick: false,
    tickTimestamp: null
  });

  // Subscribe to external store (WebSocket price context) for zero-delay updates
  const subscribe_internal = useCallback((callback: () => void) => {
    // Auto-subscribe to symbol when component mounts
    if (!subscribedRef.current) {
      subscribe([symbol]);
      subscribedRef.current = true;
    }

    const checkForUpdates = () => {
      callback();
    };

    // Use RAF for ultra-smooth 120fps updates without blocking
    let rafId: number;
    let frameCount = 0;
    const scheduleUpdate = () => {
      rafId = requestAnimationFrame(() => {
        // Run at 120fps for ultra-smooth updates
        frameCount++;
        if (frameCount % 1 === 0) { // Every frame (120fps)
          checkForUpdates();
        }
        scheduleUpdate(); // Continue loop
      });
    };
    scheduleUpdate();

    return () => {
      cancelAnimationFrame(rafId);
      if (subscribedRef.current) {
        unsubscribe([symbol]);
        subscribedRef.current = false;
      }
    };
  }, [symbol, subscribe, unsubscribe]);

  // Get current snapshot with zero processing delay + smart cache fallback
  const getSnapshot = useCallback((): UltraFastPriceData => {
    // Try WebSocket data first
    const currentPrice = getPrice(symbol);
    
    // Fallback to smart cache if WebSocket data is stale or missing
    let cachedPrice = null;
    if (!currentPrice || (currentPrice?.tick_timestamp && Date.now() - currentPrice.tick_timestamp > 500)) {
      cachedPrice = priceCacheService.getPrice(symbol);
    }
    
    const bestPrice = currentPrice || cachedPrice;
    const symbolError = errors[symbol] || errors.global || null;

    const result: UltraFastPriceData = {
      price: bestPrice?.price || 0,
      change: bestPrice?.change || 0,
      changePercent: bestPrice?.changePercent || 0,
      lastUpdated: bestPrice?.tick_timestamp 
        ? new Date(bestPrice.tick_timestamp) 
        : (bestPrice?.timestamp ? new Date(bestPrice.timestamp) : lastUpdated),
      connectionStatus,
      isLoading: connectionStatus === 'connecting',
      error: symbolError,
      dataSource: cachedPrice ? 'tradermade' : dataSource,
      priceUpdateSource: bestPrice?.is_ultra_fast_tick ? 'websocket_institutional' : 
                        priceUpdateSources[symbol] || 'unknown',
      isUltraFastTick: bestPrice?.is_ultra_fast_tick === true,
      tickTimestamp: bestPrice?.tick_timestamp || bestPrice?.timestamp || null
    };

    // Update ref for external access
    latestPriceRef.current = result;
    return result;
  }, [symbol, getPrice, errors, connectionStatus, dataSource, priceUpdateSources, lastUpdated]);

  // Server-side snapshot (same as client)
  const getServerSnapshot = getSnapshot;

  // Use external store for zero-delay updates
  return useSyncExternalStore(subscribe_internal, getSnapshot, getServerSnapshot);
}