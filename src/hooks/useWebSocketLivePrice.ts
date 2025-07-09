
import { useEffect, useMemo } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

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
  const { prices, connectionStatus, subscribe, unsubscribe, getPrice } = useWebSocketPrices();

  useEffect(() => {
    if (!symbol) return;

    // Subscribe to the symbol
    subscribe([symbol]);

    // Cleanup: unsubscribe when component unmounts or symbol changes
    return () => {
      unsubscribe([symbol]);
    };
  }, [symbol, subscribe, unsubscribe]);

  const priceData = useMemo(() => {
    const price = getPrice(symbol);
    
    if (!price) {
      return {
        price: 0,
        change: 0,
        changePercent: 0,
        isLoading: connectionStatus === 'connecting',
        error: connectionStatus === 'error' ? 'Connection failed' : null,
        lastUpdated: null,
        connectionStatus
      };
    }

    return {
      price: price.price,
      change: price.change,
      changePercent: price.changePercent,
      isLoading: false,
      error: null,
      lastUpdated: new Date(price.timestamp),
      connectionStatus
    };
  }, [prices, symbol, connectionStatus, getPrice]);

  return priceData;
}
