
import { useEffect, useMemo, useCallback, useRef } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

interface PriceFeedData {
  prices: Record<string, number>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  priceSource: string;
}

export function useWebSocketPriceFeed(symbols: string[] = []): PriceFeedData {
  const { prices, connectionStatus, subscribe, unsubscribe } = useWebSocketPrices();

  // Filter out empty or invalid symbols
  const validSymbols = useMemo(() => {
    return symbols.filter(symbol => symbol && symbol.trim().length > 0);
  }, [symbols]);

  const prevSubscribedRef = useRef<string[]>([]);

  useEffect(() => {
    // Compute diffs to avoid full resubscribe cycles
    const prev = prevSubscribedRef.current;
    const added = validSymbols.filter(s => !prev.includes(s));
    const removed = prev.filter(s => !validSymbols.includes(s));

    if (added.length > 0) {
      console.log('useWebSocketPriceFeed - Subscribing (diff):', added);
      subscribe(added);
    }
    if (removed.length > 0) {
      console.log('useWebSocketPriceFeed - Unsubscribing (diff):', removed);
      unsubscribe(removed);
    }

    // Update ref after applying diffs
    prevSubscribedRef.current = [...validSymbols];

    return () => {
      // On unmount, clean up any remaining subscriptions
      if (prevSubscribedRef.current.length > 0) {
        unsubscribe(prevSubscribedRef.current);
        prevSubscribedRef.current = [];
      }
    };
  }, [validSymbols, subscribe, unsubscribe]);

  const formattedPrices = useMemo(() => {
    const result: Record<string, number> = {};
    validSymbols.forEach(symbol => {
      const priceData = prices[symbol];
      if (priceData) {
        result[symbol] = priceData.price;
      }
    });
    return result;
  }, [prices, validSymbols]);

  return {
    prices: formattedPrices,
    connectionStatus,
    priceSource: 'WebSocket'
  };
}
