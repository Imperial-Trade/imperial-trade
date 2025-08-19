import { useRef, useCallback, useEffect } from 'react';

interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  significance: 'major' | 'minor' | 'micro';
}

interface CoordinatorOptions {
  significanceThreshold: number; // Minimum % change to be considered significant
  batchWindowMs: number; // Time window to batch updates
  maxUpdatesPerSecond: number; // Rate limiting
}

/**
 * Price Update Coordinator - Intelligent batching and filtering
 * Prevents UI thrashing by coordinating all price updates
 */
export function usePriceUpdateCoordinator(options: CoordinatorOptions = {
  significanceThreshold: 0.01,
  batchWindowMs: 100,
  maxUpdatesPerSecond: 30
}) {
  const lastPricesRef = useRef<Record<string, number>>({});
  const updateQueueRef = useRef<PriceUpdate[]>([]);
  const lastUpdateTimeRef = useRef<Record<string, number>>({});
  const frameRequestRef = useRef<number | null>(null);
  const subscribersRef = useRef<Record<string, Set<(update: PriceUpdate) => void>>>({});

  const evaluateSignificance = useCallback((symbol: string, newPrice: number): 'major' | 'minor' | 'micro' => {
    const lastPrice = lastPricesRef.current[symbol];
    if (!lastPrice) return 'major'; // First price is always major
    
    const changePercent = Math.abs((newPrice - lastPrice) / lastPrice) * 100;
    
    if (changePercent >= options.significanceThreshold * 10) return 'major';
    if (changePercent >= options.significanceThreshold) return 'minor';
    return 'micro';
  }, [options.significanceThreshold]);

  const processUpdateQueue = useCallback(() => {
    if (updateQueueRef.current.length === 0) return;

    const now = Date.now();
    const minInterval = 1000 / options.maxUpdatesPerSecond;
    
    // Group updates by symbol and take the most recent for each
    const latestUpdates = new Map<string, PriceUpdate>();
    
    updateQueueRef.current.forEach(update => {
      const lastUpdateTime = lastUpdateTimeRef.current[update.symbol] || 0;
      
      // Rate limiting per symbol
      if (now - lastUpdateTime >= minInterval) {
        const existing = latestUpdates.get(update.symbol);
        if (!existing || update.timestamp > existing.timestamp) {
          latestUpdates.set(update.symbol, update);
        }
      }
    });

    // Process significant updates
    latestUpdates.forEach(update => {
      if (update.significance !== 'micro') {
        const subscribers = subscribersRef.current[update.symbol];
        if (subscribers) {
          subscribers.forEach(callback => callback(update));
        }
        
        lastPricesRef.current[update.symbol] = update.price;
        lastUpdateTimeRef.current[update.symbol] = now;
      }
    });

    // Clear processed updates
    updateQueueRef.current = [];
    frameRequestRef.current = null;
  }, [options.maxUpdatesPerSecond]);

  const queueUpdate = useCallback((symbol: string, price: number) => {
    const significance = evaluateSignificance(symbol, price);
    
    const update: PriceUpdate = {
      symbol,
      price,
      timestamp: Date.now(),
      significance
    };

    updateQueueRef.current.push(update);

    // Schedule processing if not already scheduled
    if (!frameRequestRef.current) {
      frameRequestRef.current = requestAnimationFrame(() => {
        setTimeout(processUpdateQueue, options.batchWindowMs);
      });
    }
  }, [evaluateSignificance, processUpdateQueue, options.batchWindowMs]);

  const subscribe = useCallback((symbol: string, callback: (update: PriceUpdate) => void) => {
    if (!subscribersRef.current[symbol]) {
      subscribersRef.current[symbol] = new Set();
    }
    subscribersRef.current[symbol].add(callback);

    return () => {
      subscribersRef.current[symbol]?.delete(callback);
      if (subscribersRef.current[symbol]?.size === 0) {
        delete subscribersRef.current[symbol];
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (frameRequestRef.current) {
        cancelAnimationFrame(frameRequestRef.current);
      }
    };
  }, []);

  return {
    queueUpdate,
    subscribe,
    getLastPrice: (symbol: string) => lastPricesRef.current[symbol],
    getPendingUpdateCount: () => updateQueueRef.current.length
  };
}