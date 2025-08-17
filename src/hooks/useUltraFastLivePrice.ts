import { useSyncExternalStore, useCallback, useRef } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

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

    // Use RAF for smooth 60fps updates without blocking
    let rafId: number;
    const scheduleUpdate = () => {
      rafId = requestAnimationFrame(() => {
        checkForUpdates();
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

  // Get current snapshot with zero processing delay
  const getSnapshot = useCallback((): UltraFastPriceData => {
    const currentPrice = getPrice(symbol);
    const symbolError = errors[symbol] || errors.global || null;

    const result: UltraFastPriceData = {
      price: currentPrice?.price || 0,
      change: currentPrice?.change || 0,
      changePercent: currentPrice?.changePercent || 0,
      lastUpdated: currentPrice?.tick_timestamp 
        ? new Date(currentPrice.tick_timestamp) 
        : (currentPrice?.timestamp ? new Date(currentPrice.timestamp) : lastUpdated),
      connectionStatus,
      isLoading: connectionStatus === 'connecting',
      error: symbolError,
      dataSource,
      priceUpdateSource: priceUpdateSources[symbol] || 'unknown',
      isUltraFastTick: currentPrice?.is_ultra_fast_tick === true,
      tickTimestamp: currentPrice?.tick_timestamp || null
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