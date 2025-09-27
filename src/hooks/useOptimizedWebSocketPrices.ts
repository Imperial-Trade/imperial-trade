import { useState, useCallback, useEffect, useRef } from 'react';

interface PriceData {
  price?: number;
  bid?: number;
  ask?: number;
  mid?: number;
  timestamp?: number;
}

interface UseOptimizedWebSocketPricesReturn {
  prices: Record<string, PriceData>;
  subscribe: (symbol: string) => void;
  unsubscribe: (symbol: string) => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
}

export const useOptimizedWebSocketPrices = (): UseOptimizedWebSocketPricesReturn => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const subscribedSymbols = useRef<Set<string>>(new Set());

  const subscribe = useCallback((symbol: string) => {
    if (!subscribedSymbols.current.has(symbol)) {
      subscribedSymbols.current.add(symbol);
      console.log('WebSocket price subscription:', symbol);
      
      // Mock price data for now
      setPrices(prev => ({
        ...prev,
        [symbol]: {
          price: 1.0000 + Math.random() * 0.1,
          bid: 1.0000 + Math.random() * 0.1,
          ask: 1.0000 + Math.random() * 0.1,
          mid: 1.0000 + Math.random() * 0.1,
          timestamp: Date.now()
        }
      }));
    }
  }, []);

  const unsubscribe = useCallback((symbol: string) => {
    if (subscribedSymbols.current.has(symbol)) {
      subscribedSymbols.current.delete(symbol);
      console.log('WebSocket price unsubscription:', symbol);
      
      setPrices(prev => {
        const newPrices = { ...prev };
        delete newPrices[symbol];
        return newPrices;
      });
    }
  }, []);

  useEffect(() => {
    setConnectionStatus('connected');
    
    // Mock price updates
    const interval = setInterval(() => {
      setPrices(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(symbol => {
          const basePrice = updated[symbol].price || 1.0000;
          const change = (Math.random() - 0.5) * 0.01;
          updated[symbol] = {
            ...updated[symbol],
            price: basePrice + change,
            bid: basePrice + change - 0.0001,
            ask: basePrice + change + 0.0001,
            mid: basePrice + change,
            timestamp: Date.now()
          };
        });
        return updated;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return {
    prices,
    subscribe,
    unsubscribe,
    connectionStatus
  };
};