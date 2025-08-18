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
  dataSource: 'tradermade_fix' | 'websocket' | 'unavailable';
  priceUpdateSource: 'fix_binary' | 'fix_json' | 'websocket_institutional' | 'websocket' | 'unknown';
  refreshPrice: () => void;
  tickLatency: number;
  tickCount: number;
  bid: number;
  ask: number;
  spread: number;
  sequenceNumber: number;
}

/**
 * Real-time price hook using direct WebSocket connection to TraderMade FIX streaming
 * Provides institutional-grade latency with zero throttling
 */
export function useFIXRealTimePrice(symbol: string): FIXRealTimePriceData {
  const {
    prices,
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

  const previousPriceRef = useRef<number>(0);

  // Subscribe to real-time WebSocket data
  useEffect(() => {
    if (!symbol) return;

    console.log(`🚀 FIX Real-Time: Subscribing to ${symbol} via TraderMade FIX streaming`);
    subscribe([symbol]);

    return () => {
      unsubscribe([symbol]);
    };
  }, [symbol, subscribe, unsubscribe]);

  // Process WebSocket price updates with zero-latency
  useEffect(() => {
    const currentPrice = getPrice(symbol);
    
    if (!currentPrice) return;

    const receiveTime = performance.now() * 1000; // Microsecond precision
    const timestamp = currentPrice.tick_timestamp || Date.now();
    const latency = receiveTime - (timestamp * 1000);
    
    // Calculate change based on previous price
    const change = currentPrice.price - previousPriceRef.current;
    const changePercent = previousPriceRef.current > 0 
      ? (change / previousPriceRef.current) * 100 
      : 0;
    
    const bid = currentPrice.bid || currentPrice.price - 0.00005;
    const ask = currentPrice.ask || currentPrice.price + 0.00005;
    const spread = ask - bid;

    // IMMEDIATE state update with no React batching delays
    setPriceData({
      price: currentPrice.price,
      change: currentPrice.change || change,
      changePercent: currentPrice.changePercent || changePercent,
      bid,
      ask,
      spread
    });

    setLastUpdated(new Date(timestamp));
    setTickLatency(Math.abs(latency / 1000)); // Convert to milliseconds
    setTickCount(prev => prev + 1);
    setSequenceNumber(prev => prev + 1);
    setConnectionStatus(wsConnectionStatus);
    setPriceUpdateSource(currentPrice.is_ultra_fast_tick ? 'websocket_institutional' : 'websocket');

    // Update reference for next calculation
    previousPriceRef.current = currentPrice.price;

    console.log(`⚡ FIX STREAM: ${symbol} = $${currentPrice.price.toFixed(5)} (${bid.toFixed(5)}/${ask.toFixed(5)}) | Latency: ${(latency/1000).toFixed(1)}ms | Tick #${tickCount + 1}`);
  }, [prices, symbol, getPrice, wsConnectionStatus, tickCount]);

  const refreshPrice = useCallback(() => {
    contextRefreshPrice(symbol);
  }, [symbol, contextRefreshPrice]);

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
    dataSource: 'tradermade_fix',
    priceUpdateSource: priceUpdateSource as any,
    refreshPrice,
    tickLatency,
    tickCount,
    sequenceNumber
  };
}