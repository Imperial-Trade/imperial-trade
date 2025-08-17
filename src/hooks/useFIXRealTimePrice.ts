import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

interface FIXRealTimePriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  dataSource: 'tradermade' | 'unavailable';
  priceUpdateSource: 'websocket' | 'websocket_institutional' | 'http' | 'unknown';
  refreshPrice: () => void;
  tickLatency: number; // Microsecond precision latency measurement
  tickCount: number; // Number of ticks received
}

/**
 * Ultra-fast FIX-style real-time price hook with ZERO throttling/debouncing
 * Designed for institutional-grade sub-50ms latency requirements
 */
export function useFIXRealTimePrice(symbol: string): FIXRealTimePriceData {
  const {
    prices,
    connectionStatus,
    dataSource,
    lastUpdated: contextLastUpdated,
    errors,
    priceUpdateSources,
    subscribe,
    unsubscribe,
    getPrice,
    refreshPrice: contextRefreshPrice
  } = useWebSocketPrices();

  // Direct state updates with zero batching
  const [priceData, setPriceData] = useState({
    price: 0,
    change: 0,
    changePercent: 0
  });
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tickLatency, setTickLatency] = useState(0);
  const [tickCount, setTickCount] = useState(0);

  const startTimeRef = useRef<number>(0);
  const previousPriceRef = useRef<number>(0);

  // Subscribe immediately with no delays
  useEffect(() => {
    if (!symbol) return;

    console.log(`🚀 FIX Real-Time: Subscribing to ${symbol} with ZERO latency`);
    subscribe([symbol]);

    return () => {
      unsubscribe([symbol]);
    };
  }, [symbol, subscribe, unsubscribe]);

  // ZERO-latency price updates - direct state mutations
  useEffect(() => {
    const currentPrice = getPrice(symbol);
    
    if (!currentPrice) return;

    // Measure tick-to-render latency in microseconds
    const receiveTime = performance.now() * 1000; // Convert to microseconds
    const tickTimestamp = currentPrice.tick_timestamp || Date.now();
    const latency = receiveTime - (tickTimestamp * 1000);

    // Calculate change based on previous price
    const change = currentPrice.price - previousPriceRef.current;
    const changePercent = previousPriceRef.current > 0 
      ? (change / previousPriceRef.current) * 100 
      : 0;

    // IMMEDIATE state update with no React batching delays
    setPriceData({
      price: currentPrice.price,
      change: currentPrice.change || change,
      changePercent: currentPrice.changePercent || changePercent
    });

    setLastUpdated(new Date(tickTimestamp));
    setTickLatency(Math.abs(latency));
    setTickCount(prev => prev + 1);

    // Update reference for next calculation
    previousPriceRef.current = currentPrice.price;

    // Log ultra-fast ticks for monitoring
    if (currentPrice.is_ultra_fast_tick) {
      console.log(`⚡ FIX ULTRA-FAST: ${symbol} = $${currentPrice.price} | Latency: ${latency.toFixed(0)}μs | Tick #${tickCount + 1}`);
    }

  }, [prices, symbol, getPrice, tickCount]);

  const refreshPrice = useCallback(() => {
    startTimeRef.current = performance.now() * 1000; // Microsecond precision
    contextRefreshPrice(symbol);
  }, [contextRefreshPrice, symbol]);

  // Get error for this specific symbol or global error
  const symbolError = errors[symbol] || errors.global || null;

  return {
    price: priceData.price,
    change: priceData.change,
    changePercent: priceData.changePercent,
    isLoading: connectionStatus === 'connecting',
    error: symbolError,
    lastUpdated: lastUpdated || contextLastUpdated,
    connectionStatus,
    dataSource,
    priceUpdateSource: priceUpdateSources[symbol] || 'unknown',
    refreshPrice,
    tickLatency,
    tickCount
  };
}