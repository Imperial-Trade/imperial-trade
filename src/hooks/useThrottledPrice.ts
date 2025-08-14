import { useState, useEffect, useRef, useCallback } from 'react';

interface ThrottledPriceConfig {
  throttleMs?: number;
  maxUpdatesPerSecond?: number;
}

export function useThrottledPrice(
  price: number | null,
  config: ThrottledPriceConfig = {}
) {
  const { throttleMs = 100, maxUpdatesPerSecond = 10 } = config;
  
  const [throttledPrice, setThrottledPrice] = useState(price);
  const [updateCount, setUpdateCount] = useState(0);
  
  const lastUpdateRef = useRef<number>(0);
  const updateCounterRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset update counter every second
  useEffect(() => {
    const interval = setInterval(() => {
      updateCounterRef.current = 0;
      setUpdateCount(0);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const updateThrottledPrice = useCallback((newPrice: number | null) => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;
    const canUpdate = 
      timeSinceLastUpdate >= throttleMs && 
      updateCounterRef.current < maxUpdatesPerSecond;

    if (canUpdate && newPrice !== throttledPrice) {
      setThrottledPrice(newPrice);
      lastUpdateRef.current = now;
      updateCounterRef.current++;
      setUpdateCount(prev => prev + 1);
    } else if (newPrice !== price && !timeoutRef.current) {
      // Schedule delayed update if we're being throttled
      const delay = Math.max(throttleMs - timeSinceLastUpdate, 50);
      timeoutRef.current = setTimeout(() => {
        if (updateCounterRef.current < maxUpdatesPerSecond) {
          setThrottledPrice(newPrice);
          lastUpdateRef.current = Date.now();
          updateCounterRef.current++;
          setUpdateCount(prev => prev + 1);
        }
        timeoutRef.current = null;
      }, delay);
    }
  }, [price, throttledPrice, throttleMs, maxUpdatesPerSecond]);

  useEffect(() => {
    if (price !== null) {
      updateThrottledPrice(price);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [price, updateThrottledPrice]);

  return {
    price: throttledPrice,
    updateCount,
    isThrottled: price !== throttledPrice
  };
}