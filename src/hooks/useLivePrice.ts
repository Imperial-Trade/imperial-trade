
import { useState, useEffect } from 'react';
import { marketDataService } from '@/services/MarketDataService';
import { useEnhancedLivePrice } from './useEnhancedLivePrice';

interface LivePriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
}

export function useLivePrice(symbol: string): LivePriceData {
  const {
    price,
    change,
    changePercent,
    isLoading,
    error
  } = useEnhancedLivePrice(symbol, {
    refreshInterval: 15000,
    enableRetry: true,
    maxRetries: 3,
    enableOfflineMode: true
  });

  return {
    price,
    change,
    changePercent,
    isLoading,
    error
  };
}
