import { useCallback, useEffect, useRef, useState } from 'react';
import { priceCacheService } from '@/services/PriceCacheService';

interface RealTimePriceData {
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: Date;
  confidence: number;
  volatility: number;
  isLive: boolean;
  source: 'websocket' | 'http' | 'interpolated';
  tickTimestamp: number;
}

interface RealTimePriceOptions {
  enablePrediction?: boolean;
  maxUpdateFrequency?: number; // Max updates per second
  volatilityThreshold?: number; // Stop prediction during high volatility
}

/**
 * Ultra-fast real-time price engine with zero-latency updates
 * Uses direct DOM manipulation and RAF for sub-100ms price updates
 */
export function useRealTimePriceEngine(
  symbol: string,
  options: RealTimePriceOptions = {}
): RealTimePriceData & {
  refreshPrice: () => void;
  getLastKnownPrice: () => number | null;
} {
  const {
    enablePrediction = true,
    maxUpdateFrequency = 60, // 60 FPS max
    volatilityThreshold = 0.02
  } = options;

  const [priceData, setPriceData] = useState<RealTimePriceData>({
    price: 0,
    change: 0,
    changePercent: 0,
    lastUpdated: new Date(),
    confidence: 0,
    volatility: 0,
    isLive: false,
    source: 'websocket',
    tickTimestamp: Date.now()
  });

  const rafRef = useRef<number>();
  const lastUpdateRef = useRef<number>(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const predictionIntervalRef = useRef<NodeJS.Timeout>();
  const lastKnownPriceRef = useRef<number | null>(null);

  // Minimum time between updates (based on max frequency)
  const minUpdateInterval = 1000 / maxUpdateFrequency;

  /**
   * Update price data with rate limiting
   */
  const updatePriceData = useCallback((cachedData: any) => {
    const now = Date.now();
    
    // Rate limiting to prevent excessive updates
    if (now - lastUpdateRef.current < minUpdateInterval) {
      return;
    }
    
    lastUpdateRef.current = now;
    lastKnownPriceRef.current = cachedData.price;

    const newPriceData: RealTimePriceData = {
      price: cachedData.price,
      change: cachedData.change,
      changePercent: cachedData.changePercent,
      lastUpdated: new Date(cachedData.timestamp),
      confidence: cachedData.confidence_score || 1,
      volatility: cachedData.volatility || 0,
      isLive: cachedData.source === 'websocket' && cachedData.is_ultra_fast_tick,
      source: cachedData.source,
      tickTimestamp: cachedData.tick_timestamp || cachedData.timestamp
    };

    // Use RAF for smooth updates
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      setPriceData(newPriceData);
    });
  }, [minUpdateInterval]);

  /**
   * Price prediction for smoother interpolation
   */
  const startPricePrediction = useCallback(() => {
    if (!enablePrediction) return;

    if (predictionIntervalRef.current) {
      clearInterval(predictionIntervalRef.current);
    }

    predictionIntervalRef.current = setInterval(() => {
      const cachedPrice = priceCacheService.getPrice(symbol);
      if (!cachedPrice) return;

      // Don't predict during high volatility
      if (cachedPrice.volatility && cachedPrice.volatility > volatilityThreshold) {
        return;
      }

      // Only predict if data is slightly stale (500ms - 2s)
      const age = Date.now() - cachedPrice.timestamp;
      if (age < 500 || age > 2000) {
        return;
      }

      // Simple momentum-based prediction
      const momentum = cachedPrice.change / 1000; // Per millisecond
      const predictedPrice = cachedPrice.price + (momentum * age);
      
      // Only apply small corrections
      if (Math.abs(predictedPrice - cachedPrice.price) < cachedPrice.price * 0.001) {
        setPriceData(prev => ({
          ...prev,
          price: predictedPrice,
          confidence: Math.max(prev.confidence * 0.9, 0.3),
          source: 'interpolated'
        }));
      }
    }, 250); // Check every 250ms
  }, [symbol, enablePrediction, volatilityThreshold]);

  /**
   * Refresh price from cache service
   */
  const refreshPrice = useCallback(() => {
    const cachedPrice = priceCacheService.getPrice(symbol);
    if (cachedPrice) {
      updatePriceData(cachedPrice);
    }
  }, [symbol, updatePriceData]);

  /**
   * Get last known price (useful for offline scenarios)
   */
  const getLastKnownPrice = useCallback(() => {
    return lastKnownPriceRef.current;
  }, []);

  // Subscribe to price cache service
  useEffect(() => {
    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Subscribe to real-time updates
    unsubscribeRef.current = priceCacheService.subscribe(symbol, updatePriceData);

    // Get initial price
    refreshPrice();

    // Start price prediction
    startPricePrediction();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (predictionIntervalRef.current) {
        clearInterval(predictionIntervalRef.current);
      }
    };
  }, [symbol, updatePriceData, refreshPrice, startPricePrediction]);

  return {
    ...priceData,
    refreshPrice,
    getLastKnownPrice
  };
}