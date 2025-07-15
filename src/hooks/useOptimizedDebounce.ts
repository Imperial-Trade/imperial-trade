
import { useState, useEffect, useRef, useCallback } from 'react';

export function useOptimizedDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [value, delay]);

  return debouncedValue;
}

// Advanced throttle hook with memory optimization
export function useThrottle<T>(value: T, limit: number): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
}

// Event deduplication hook
export function useEventDeduplication() {
  const eventCache = useRef(new Map<string, number>());
  const cacheTimeout = 5000; // 5 seconds

  const isDuplicate = useCallback((eventKey: string): boolean => {
    const now = Date.now();
    const lastTime = eventCache.current.get(eventKey);

    if (lastTime && now - lastTime < cacheTimeout) {
      return true;
    }

    eventCache.current.set(eventKey, now);
    
    // Cleanup old entries
    if (eventCache.current.size > 100) {
      const cutoff = now - cacheTimeout;
      for (const [key, time] of eventCache.current.entries()) {
        if (time < cutoff) {
          eventCache.current.delete(key);
        }
      }
    }

    return false;
  }, [cacheTimeout]);

  return { isDuplicate };
}
