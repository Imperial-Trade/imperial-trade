
import { useEffect, useMemo, useCallback } from 'react';
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

  useEffect(() => {
    if (validSymbols.length === 0) return;

    console.log('useWebSocketPriceFeed - Subscribing to symbols:', validSymbols);
    subscribe(validSymbols);

    return () => {
      console.log('useWebSocketPriceFeed - Unsubscribing from symbols:', validSymbols);
      unsubscribe(validSymbols);
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
