import { useEffect, useState, useCallback } from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

interface OptimizedPriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  dataSource: 'optimized_websocket';
  refreshPrice: () => void;
}

// Simple symbol normalization for our allowed symbols
const normalizeSymbol = (symbol: string): string => {
  const normalized = symbol.toUpperCase().replace(/[^A-Z]/g, '');
  
  // Map common variations to our allowed symbols
  if (normalized === 'BTC' || normalized === 'BITCOIN') return 'BTCUSD';
  if (normalized === 'XAU' || normalized === 'GOLD') return 'XAUUSD';
  
  return normalized;
};

export function useOptimizedWebSocketPrice(symbol: string): OptimizedPriceData {
  const { prices, connectionStatus, subscribe, unsubscribe, getPrice, isConnected, error } = useOptimizedWebSocketPrices();
  const [isLoading, setIsLoading] = useState(true);
  
  // Normalize the symbol to our allowed format
  const normalizedSymbol = normalizeSymbol(symbol);
  
  // Subscribe to the symbol on mount
  useEffect(() => {
    if (normalizedSymbol) {
      console.log(`📊 Subscribing to optimized price feed for ${normalizedSymbol}`);
      subscribe([normalizedSymbol]);
      
      return () => {
        console.log(`📊 Unsubscribing from optimized price feed for ${normalizedSymbol}`);
        unsubscribe([normalizedSymbol]);
      };
    }
  }, [normalizedSymbol, subscribe, unsubscribe]);
  
  // Update loading state based on connection and data availability
  useEffect(() => {
    if (isConnected && prices[normalizedSymbol]) {
      setIsLoading(false);
    } else if (connectionStatus === 'connecting') {
      setIsLoading(true);
    } else if (connectionStatus === 'error' || connectionStatus === 'disconnected') {
      setIsLoading(false);
    }
  }, [isConnected, prices, normalizedSymbol, connectionStatus]);

  const refreshPrice = useCallback(() => {
    // For WebSocket, we just re-subscribe to trigger a fresh price
    if (normalizedSymbol) {
      unsubscribe([normalizedSymbol]);
      setTimeout(() => subscribe([normalizedSymbol]), 100);
    }
  }, [normalizedSymbol, subscribe, unsubscribe]);

  const priceData = prices[normalizedSymbol];
  
  return {
    price: priceData?.price || 0,
    change: priceData?.change || 0,
    changePercent: priceData?.changePercent || 0,
    isLoading,
    error,
    lastUpdated: priceData ? new Date(priceData.timestamp) : null,
    connectionStatus,
    dataSource: 'optimized_websocket',
    refreshPrice
  };
}