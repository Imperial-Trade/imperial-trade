import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';
import { fixPriceService } from '@/services/FIXPriceService';

interface FIXRealTimePriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  dataSource: 'tradermade_fix' | 'websocket' | 'unavailable';
  priceUpdateSource: 'fix_binary' | 'fix_json' | 'websocket_institutional' | 'websocket' | 'unknown';
  refreshPrice: () => void;
  tickLatency: number; // Microsecond precision latency measurement
  tickCount: number; // Number of ticks received
  bid: number; // Direct bid price from FIX
  ask: number; // Direct ask price from FIX
  spread: number; // Bid-ask spread
  sequenceNumber: number; // FIX sequence number for validation
}

/**
 * Ultra-fast FIX-style real-time price hook with ZERO throttling/debouncing
 * Designed for institutional-grade sub-50ms latency requirements
 * Integrates with both FIX binary protocol and WebSocket fallback
 */
export function useFIXRealTimePrice(symbol: string): FIXRealTimePriceData {
  const {
    prices: wsContext,
    connectionStatus: wsConnectionStatus,
    dataSource,
    lastUpdated: contextLastUpdated,
    errors,
    priceUpdateSources,
    subscribe,
    unsubscribe,
    getPrice,
    refreshPrice: contextRefreshPrice
  } = useWebSocketPrices();

  // Direct state updates with zero batching for maximum speed
  const [priceData, setPriceData] = useState({
    price: 0,
    change: 0,
    changePercent: 0,
    bid: 0,
    ask: 0,
    spread: 0
  });
  
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tickLatency, setTickLatency] = useState(0);
  const [tickCount, setTickCount] = useState(0);
  const [sequenceNumber, setSequenceNumber] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('connecting');
  const [priceUpdateSource, setPriceUpdateSource] = useState<string>('unknown');

  const startTimeRef = useRef<number>(0);
  const previousPriceRef = useRef<number>(0);
  const fixInitializedRef = useRef<boolean>(false);

  // Initialize FIX price service
  useEffect(() => {
    if (!fixInitializedRef.current) {
      console.log('🚀 Initializing FIX Price Service for institutional-grade streaming...');
      
      fixPriceService.initialize().then(() => {
        console.log('✅ FIX Price Service ready for ultra-fast price streaming');
        fixInitializedRef.current = true;
      }).catch((error) => {
        console.error('❌ FIX Price Service initialization failed:', error);
      });
    }
  }, []);

  // Subscribe to both FIX and WebSocket for redundancy
  useEffect(() => {
    if (!symbol) return;

    console.log(`🚀 FIX Real-Time: Subscribing to ${symbol} with dual-source redundancy`);
    
    // Subscribe to WebSocket as fallback
    subscribe([symbol]);
    
    // Subscribe to FIX service for primary feed
    const unsubscribeFIX = fixPriceService.subscribe((fixSymbol, price, bid, ask, timestamp) => {
      if (fixSymbol === symbol || fixSymbol.toUpperCase() === symbol.toUpperCase()) {
        handleFIXPriceUpdate(price, bid, ask, timestamp);
      }
    });

    return () => {
      unsubscribe([symbol]);
      unsubscribeFIX();
    };
  }, [symbol, subscribe, unsubscribe]);

  /**
   * Handle FIX price updates with microsecond precision
   */
  const handleFIXPriceUpdate = useCallback((price: number, bid: number, ask: number, timestamp: number) => {
    const receiveTime = performance.now() * 1000; // Convert to microseconds
    const latency = receiveTime - (timestamp * 1000);
    
    // Calculate change based on previous price
    const change = price - previousPriceRef.current;
    const changePercent = previousPriceRef.current > 0 
      ? (change / previousPriceRef.current) * 100 
      : 0;
    
    const spread = ask - bid;

    // IMMEDIATE state update with no React batching delays
    setPriceData({
      price,
      change,
      changePercent,
      bid,
      ask,
      spread
    });

    setLastUpdated(new Date(timestamp));
    setTickLatency(Math.abs(latency));
    setTickCount(prev => prev + 1);
    setSequenceNumber(prev => prev + 1);
    setConnectionStatus('connected');
    setPriceUpdateSource('fix_binary');

    // Update reference for next calculation
    previousPriceRef.current = price;

    console.log(`⚡ FIX BINARY: ${symbol} = $${price.toFixed(5)} (${bid}/${ask}) | Latency: ${latency.toFixed(0)}μs | Tick #${tickCount + 1}`);
  }, [symbol, tickCount]);

  // Fallback to WebSocket data when FIX is unavailable
  useEffect(() => {
    const wsPrice = getPrice(symbol);
    
    if (!wsPrice) return;

    // Only use WebSocket data if FIX hasn't provided recent data
    const now = Date.now();
    const lastFIXUpdate = lastUpdated?.getTime() || 0;
    const shouldUseFallback = now - lastFIXUpdate > 1000; // 1 second threshold

    if (shouldUseFallback) {
      const receiveTime = performance.now() * 1000;
      const wsTimestamp = wsPrice.tick_timestamp || Date.now();
      const latency = receiveTime - (wsTimestamp * 1000);

      // Calculate change
      const change = wsPrice.price - previousPriceRef.current;
      const changePercent = previousPriceRef.current > 0 
        ? (change / previousPriceRef.current) * 100 
        : 0;

      setPriceData({
        price: wsPrice.price,
        change: wsPrice.change || change,
        changePercent: wsPrice.changePercent || changePercent,
        bid: wsPrice.bid || wsPrice.price,
        ask: wsPrice.ask || wsPrice.price,
        spread: (wsPrice.ask || wsPrice.price) - (wsPrice.bid || wsPrice.price)
      });

      setLastUpdated(new Date(wsTimestamp));
      setTickLatency(Math.abs(latency));
      setTickCount(prev => prev + 1);
      setConnectionStatus(wsConnectionStatus);
      setPriceUpdateSource(wsPrice.is_ultra_fast_tick ? 'websocket_institutional' : 'websocket');

      previousPriceRef.current = wsPrice.price;

      console.log(`🔄 WebSocket Fallback: ${symbol} = $${wsPrice.price.toFixed(5)} | Latency: ${latency.toFixed(0)}μs`);
    }
  }, [wsContext, symbol, getPrice, wsConnectionStatus, lastUpdated, tickCount]);

  // Monitor FIX service health
  useEffect(() => {
    const healthCheckInterval = setInterval(() => {
      const healthStatus = fixPriceService.getHealthStatus();
      const hasHealthyConnection = Object.values(healthStatus).some(health => health.isHealthy);
      
      if (!hasHealthyConnection && connectionStatus === 'connected') {
        setConnectionStatus('disconnected');
        console.warn('⚠️ FIX connections unhealthy, falling back to WebSocket');
      }
    }, 2000);

    return () => clearInterval(healthCheckInterval);
  }, [connectionStatus]);

  const refreshPrice = useCallback(() => {
    startTimeRef.current = performance.now() * 1000; // Microsecond precision
    
    // Try FIX service first, then WebSocket fallback
    const fixPrice = fixPriceService.getPrice(symbol);
    if (fixPrice) {
      handleFIXPriceUpdate(fixPrice.price, fixPrice.bid, fixPrice.ask, fixPrice.timestamp);
    } else {
      contextRefreshPrice(symbol);
    }
  }, [symbol, contextRefreshPrice, handleFIXPriceUpdate]);

  // Get error for this specific symbol or global error
  const symbolError = errors[symbol] || errors.global || null;

  return {
    price: priceData.price,
    change: priceData.change,
    changePercent: priceData.changePercent,
    bid: priceData.bid,
    ask: priceData.ask,
    spread: priceData.spread,
    isLoading: connectionStatus === 'connecting',
    error: symbolError,
    lastUpdated: lastUpdated || contextLastUpdated,
    connectionStatus,
    dataSource: priceUpdateSource.startsWith('fix') ? 'tradermade_fix' : 'websocket',
    priceUpdateSource: priceUpdateSource as any,
    refreshPrice,
    tickLatency,
    tickCount,
    sequenceNumber
  };
}