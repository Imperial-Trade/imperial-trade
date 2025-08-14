import { useEffect, useRef, useCallback } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

interface ThrottledPriceConfig {
  throttleMs?: number;
  enableBatching?: boolean;
}

export function useThrottledWebSocketPrice(
  symbols: string[],
  config: ThrottledPriceConfig = {}
) {
  const { throttleMs = 100, enableBatching = true } = config;
  const { prices, connectionStatus, subscribe, unsubscribe } = useWebSocketPrices();
  
  const lastUpdateRef = useRef<number>(0);
  const batchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingSymbolsRef = useRef<Set<string>>(new Set());

  // Throttled subscribe function
  const throttledSubscribe = useCallback((symbolsToSubscribe: string[]) => {
    const now = Date.now();
    
    if (enableBatching) {
      // Add symbols to pending batch
      symbolsToSubscribe.forEach(symbol => pendingSymbolsRef.current.add(symbol));
      
      // Clear existing timeout and set a new one
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      
      batchTimeoutRef.current = setTimeout(() => {
        const symbolsToBatch = Array.from(pendingSymbolsRef.current);
        if (symbolsToBatch.length > 0) {
          console.log('🔄 Batched WebSocket subscription for symbols:', symbolsToBatch);
          subscribe(symbolsToBatch);
          pendingSymbolsRef.current.clear();
        }
        batchTimeoutRef.current = null;
      }, throttleMs);
    } else {
      // Immediate subscription with throttle check
      if (now - lastUpdateRef.current >= throttleMs) {
        console.log('🔄 Throttled WebSocket subscription for symbols:', symbolsToSubscribe);
        subscribe(symbolsToSubscribe);
        lastUpdateRef.current = now;
      }
    }
  }, [subscribe, throttleMs, enableBatching]);

  // Subscribe to symbols with throttling
  useEffect(() => {
    if (symbols.length > 0) {
      throttledSubscribe(symbols);
    }

    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
        batchTimeoutRef.current = null;
      }
      if (symbols.length > 0) {
        unsubscribe(symbols);
      }
    };
  }, [symbols, throttledSubscribe, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (batchTimeoutRef.current) {
        clearTimeout(batchTimeoutRef.current);
      }
      pendingSymbolsRef.current.clear();
    };
  }, []);

  return {
    prices,
    connectionStatus,
    isThrottled: batchTimeoutRef.current !== null
  };
}