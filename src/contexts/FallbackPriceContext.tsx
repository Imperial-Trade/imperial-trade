import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { isDevToolsEnabled } from '@/utils/featureFlags';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface FallbackPriceContextType {
  prices: Record<string, PriceData>;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  isActive: boolean;
  startFallback: () => void;
  stopFallback: () => void;
}

const FallbackPriceContext = createContext<FallbackPriceContextType | null>(null);

export const useFallbackPrices = () => {
  const context = useContext(FallbackPriceContext);
  if (!context) {
    throw new Error('useFallbackPrices must be used within FallbackPriceProvider');
  }
  return context;
};

const BASE_PRICES = {
  'XAUUSD': 2650.00,
  'EURUSD': 1.0850,
  'GBPUSD': 1.2750,
  'BTCUSD': 94500.00,
  'USDJPY': 149.50,
  'USDCHF': 0.8850,
  'AUDUSD': 0.6540,
  'USDCAD': 1.3920,
  'NZDUSD': 0.5890
};

export const FallbackPriceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [subscribedSymbols, setSubscribedSymbols] = useState<Set<string>>(new Set());
  const [isActive, setIsActive] = useState(false);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const generateMockPrice = useCallback((symbol: string, basePrice: number, previousPrice?: number) => {
    // More realistic price movement
    const variance = (Math.random() - 0.5) * 0.008; // ±0.8% max change
    const newPrice = basePrice * (1 + variance);
    
    const change = previousPrice ? newPrice - previousPrice : 0;
    const changePercent = previousPrice ? (change / previousPrice) * 100 : 0;
    
    return {
      symbol,
      price: Math.round(newPrice * 10000) / 10000, // 4 decimal precision
      change: Math.round(change * 10000) / 10000,
      changePercent: Math.round(changePercent * 100) / 100,
      timestamp: new Date().toISOString()
    };
  }, []);

  const updatePrices = useCallback(() => {
    if (!isActive || subscribedSymbols.size === 0) return;

    setPrices(prev => {
      const updated = { ...prev };
      
      subscribedSymbols.forEach(symbol => {
        const basePrice = BASE_PRICES[symbol] || 1.0000;
        const previousPrice = prev[symbol]?.price;
        updated[symbol] = generateMockPrice(symbol, basePrice, previousPrice);
      });
      
      return updated;
    });
  }, [isActive, subscribedSymbols, generateMockPrice]);

  const subscribe = useCallback((symbols: string[]) => {
    setSubscribedSymbols(prev => {
      const newSet = new Set(prev);
      symbols.forEach(symbol => newSet.add(symbol));
      return newSet;
    });
    
    // Initialize prices for new symbols
    setPrices(prev => {
      const updated = { ...prev };
      symbols.forEach(symbol => {
        if (!updated[symbol]) {
          const basePrice = BASE_PRICES[symbol] || 1.0000;
          updated[symbol] = generateMockPrice(symbol, basePrice);
        }
      });
      return updated;
    });
  }, [generateMockPrice]);

  const unsubscribe = useCallback((symbols: string[]) => {
    setSubscribedSymbols(prev => {
      const newSet = new Set(prev);
      symbols.forEach(symbol => newSet.delete(symbol));
      return newSet;
    });
    
    // Remove prices for unsubscribed symbols
    setPrices(prev => {
      const updated = { ...prev };
      symbols.forEach(symbol => delete updated[symbol]);
      return updated;
    });
  }, []);

  const startFallback = useCallback(() => {
    if (isActive) return;
    
    if (isDevToolsEnabled()) {
      console.log('🚨 Starting fallback price generation');
    }
    setIsActive(true);
    
    // Generate prices every 2 seconds
    const id = setInterval(updatePrices, 2000);
    setIntervalId(id);
    
    // Generate initial prices
    updatePrices();
  }, [isActive, updatePrices]);

  const stopFallback = useCallback(() => {
    if (!isActive) return;
    
    if (isDevToolsEnabled()) {
      console.log('✅ Stopping fallback price generation');
    }
    setIsActive(false);
    
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }
  }, [isActive, intervalId]);

  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [intervalId]);

  const contextValue: FallbackPriceContextType = {
    prices,
    subscribe,
    unsubscribe,
    isActive,
    startFallback,
    stopFallback
  };

  return (
    <FallbackPriceContext.Provider value={contextValue}>
      {children}
    </FallbackPriceContext.Provider>
  );
};