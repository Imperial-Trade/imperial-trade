
import { useState, useEffect, useCallback, useMemo } from 'react';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';

interface UsePaginatedSignalsOptions {
  signals: TradeAlertWithProfile[];
  pageSize?: number;
  prefetchThreshold?: number;
}

interface UsePaginatedSignalsReturn {
  displayedSignals: TradeAlertWithProfile[];
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void;
  reset: () => void;
  currentPage: number;
  totalPages: number;
}

export const usePaginatedSignals = ({
  signals,
  pageSize = 50,
  prefetchThreshold = 0.8
}: UsePaginatedSignalsOptions): UsePaginatedSignalsReturn => {
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const totalPages = Math.ceil(signals.length / pageSize);
  
  const displayedSignals = useMemo(() => {
    return signals.slice(0, currentPage * pageSize);
  }, [signals, currentPage, pageSize]);

  const hasMore = currentPage < totalPages;

  const loadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      setIsLoading(true);
      // Simulate async loading with a small delay for smooth UX
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setIsLoading(false);
      }, 100);
    }
  }, [hasMore, isLoading]);

  const reset = useCallback(() => {
    setCurrentPage(1);
    setIsLoading(false);
  }, []);

  // Auto-load more when user is near the end (prefetching)
  useEffect(() => {
    const shouldPrefetch = displayedSignals.length / signals.length >= prefetchThreshold;
    if (shouldPrefetch && hasMore && !isLoading) {
      loadMore();
    }
  }, [displayedSignals.length, signals.length, prefetchThreshold, hasMore, isLoading, loadMore]);

  // Reset pagination when signals array changes significantly
  useEffect(() => {
    if (signals.length === 0) {
      reset();
    }
  }, [signals.length, reset]);

  return {
    displayedSignals,
    hasMore,
    isLoading,
    loadMore,
    reset,
    currentPage,
    totalPages
  };
};
