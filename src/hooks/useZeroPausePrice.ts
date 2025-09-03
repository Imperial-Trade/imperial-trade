import { useState, useEffect, useCallback, useRef } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

interface ZeroPausePriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  lastUpdated: Date | null;
  refreshPrice: () => void;
  isPriceStale: boolean;
  cacheAge: number; // Age in seconds
}

const normalizeSymbol = (symbol: string): string => {
  const symbolMap: Record<string, string> = {
    'BTC': 'BTCUSD',
    'BITCOIN': 'BTCUSD', 
    'BTC/USD': 'BTCUSD',
    'XAU': 'XAUUSD',
    'GOLD': 'XAUUSD',
    'XAU/USD': 'XAUUSD',
  };
  
  const normalized = symbol.toUpperCase().trim();
  return symbolMap[normalized] || normalized;
};

export function useZeroPausePrice(symbol: string): ZeroPausePriceData {
  const normalizedSymbol = normalizeSymbol(symbol);
  const { prices, connectionStatus, subscribe, unsubscribe } = useOptimizedWebSocketPrices();
  
  const [cachedPrice, setCachedPrice] = useState<number>(0);
  const [cachedChange, setCachedChange] = useState<number>(0);
  const [cachedChangePercent, setCachedChangePercent] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const subscribedRef = useRef(false);
  const priceHistoryRef = useRef<Array<{ price: number; timestamp: number }>>([]);
  const interpolationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Zero-pause: Immediate subscription with cache loading
  useEffect(() => {
    if (!subscribedRef.current && normalizedSymbol) {
      console.log(`⚡ Zero-pause subscribing to: ${normalizedSymbol}`);
      subscribe([normalizedSymbol]);
      subscribedRef.current = true;
      
      // Load from localStorage immediately
      const cacheKey = `zero_pause_${normalizedSymbol}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { price, change, changePercent, timestamp } = JSON.parse(cached);
          const cacheAge = Date.now() - timestamp;
          
          // Use cache if less than 3 minutes old
          if (cacheAge < 3 * 60 * 1000) {
            setCachedPrice(price);
            setCachedChange(change);
            setCachedChangePercent(changePercent);
            setLastUpdated(new Date(timestamp));
            setIsLoading(false);
            console.log(`📦 Zero-pause cache loaded: ${price} (${Math.round(cacheAge / 1000)}s old)`);
          }
        }
      } catch (e) {
        console.warn('Zero-pause cache load failed:', e);
      }
      
      // Maximum loading time: 1 second
      const loadingTimeout = setTimeout(() => {
        setIsLoading(false);
      }, 1000);

      return () => {
        clearTimeout(loadingTimeout);
        if (subscribedRef.current) {
          unsubscribe([normalizedSymbol]);
          subscribedRef.current = false;
        }
      };
    }
  }, [normalizedSymbol, subscribe, unsubscribe]);

  // Zero-pause: Enhanced price monitoring with interpolation
  useEffect(() => {
    const priceData = prices[normalizedSymbol];
    
    if (priceData && priceData.price > 0) {
      const now = Date.now();
      
      // Add to price history for trend analysis
      priceHistoryRef.current.push({ price: priceData.price, timestamp: now });
      
      // Keep only last 20 prices for performance
      if (priceHistoryRef.current.length > 20) {
        priceHistoryRef.current = priceHistoryRef.current.slice(-20);
      }
      
      setCachedPrice(priceData.price);
      setCachedChange(priceData.change);
      setCachedChangePercent(priceData.changePercent);
      setLastUpdated(new Date(priceData.timestamp));
      setIsLoading(false);
      setError(null);
      
      // Cache to localStorage
      const cacheKey = `zero_pause_${normalizedSymbol}`;
      const cacheData = {
        price: priceData.price,
        change: priceData.change,
        changePercent: priceData.changePercent,
        timestamp: now
      };
      
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
      } catch (e) {
        console.warn('Zero-pause cache save failed:', e);
      }
    } else if (connectionStatus === 'error') {
      // Only show error if we don't have cached data
      if (cachedPrice === 0) {
        setError('Connection error - retrying...');
      }
    }
  }, [prices, normalizedSymbol, connectionStatus, cachedPrice]);

  // Zero-pause: Price interpolation during brief gaps
  useEffect(() => {
    if (priceHistoryRef.current.length >= 2 && connectionStatus === 'connected') {
      const history = priceHistoryRef.current;
      const lastPrice = history[history.length - 1];
      const now = Date.now();
      const timeSinceLastUpdate = now - lastPrice.timestamp;
      
      // If no update for more than 2 seconds, start interpolation
      if (timeSinceLastUpdate > 2000 && timeSinceLastUpdate < 10000) {
        const trend = history.length >= 3 ? 
          (history[history.length - 1].price - history[history.length - 3].price) / 2 : 0;
        
        // Very small interpolation based on trend (max 0.01% movement per second)
        const interpolatedChange = (trend * 0.0001) * (timeSinceLastUpdate / 1000);
        const interpolatedPrice = lastPrice.price + interpolatedChange;
        
        if (Math.abs(interpolatedChange) > 0.001) { // Only if meaningful change
          setCachedPrice(interpolatedPrice);
          console.log(`🔮 Price interpolation: ${lastPrice.price} → ${interpolatedPrice}`);
        }
      }
    }
  }, [connectionStatus]);

  // Zero-pause: Enhanced manual refresh
  const refreshPrice = useCallback(() => {
    console.log(`⚡ Zero-pause refresh: ${normalizedSymbol}`);
    setError(null);
    
    // Brief unsubscribe/resubscribe for forced refresh
    unsubscribe([normalizedSymbol]);
    setTimeout(() => {
      subscribe([normalizedSymbol]);
    }, 100);
  }, [normalizedSymbol, subscribe, unsubscribe]);

  // Calculate cache age and staleness
  const cacheAge = lastUpdated ? Math.floor((Date.now() - lastUpdated.getTime()) / 1000) : 0;
  const isPriceStale = cacheAge > 30; // Consider stale after 30 seconds

  return {
    price: cachedPrice,
    change: cachedChange,
    changePercent: cachedChangePercent,
    isLoading: isLoading && cachedPrice === 0,
    error,
    connectionStatus,
    lastUpdated,
    refreshPrice,
    isPriceStale,
    cacheAge
  };
}
