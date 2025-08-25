
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';

interface OptimizedSignalData {
  signals: TradeAlertWithProfile[];
  filteredSignals: TradeAlertWithProfile[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
}

interface FilterOptions {
  search: string;
  status: 'all' | 'active' | 'pending' | 'closed';
  tradeType: string;
  educator: string;
}

export const useOptimizedSignalData = (
  rawSignals: TradeAlertWithProfile[],
  filters: FilterOptions,
  isLoading: boolean,
  error: string | null,
  lastUpdated: Date | null,
  refreshFunction: () => Promise<void>
): OptimizedSignalData => {
  const [optimizedData, setOptimizedData] = useState<TradeAlertWithProfile[]>([]);
  const previousFiltersRef = useRef<FilterOptions>(filters);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search to avoid excessive filtering
  const debouncedSearch = useCallback((searchTerm: string, otherFilters: Omit<FilterOptions, 'search'>) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performFiltering(searchTerm, otherFilters);
    }, 300); // 300ms debounce
  }, []);

  const performFiltering = useCallback((searchTerm: string, otherFilters: Omit<FilterOptions, 'search'>) => {
    if (!rawSignals || rawSignals.length === 0) {
      setOptimizedData([]);
      return;
    }

    const filtered = rawSignals.filter(signal => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesAsset = signal.assetName?.toLowerCase().includes(searchLower);
        const matchesSymbol = signal.tradermadeSymbol?.toLowerCase().includes(searchLower);
        const matchesNotes = signal.notes?.toLowerCase().includes(searchLower);
        const matchesCreator = signal.creator?.display_name?.toLowerCase().includes(searchLower);
        
        if (!matchesAsset && !matchesSymbol && !matchesNotes && !matchesCreator) {
          return false;
        }
      }

      // Status filter
      if (otherFilters.status !== 'all' && signal.status !== otherFilters.status) {
        return false;
      }

      // Trade type filter
      if (otherFilters.tradeType !== 'all' && signal.tradeType !== otherFilters.tradeType) {
        return false;
      }

      // Educator filter
      if (otherFilters.educator !== 'all' && signal.creator?.display_name !== otherFilters.educator) {
        return false;
      }

      return true;
    });

    setOptimizedData(filtered);
  }, [rawSignals]);

  // Handle filter changes
  useEffect(() => {
    const { search, ...otherFilters } = filters;
    
    // Check if only search changed (for debouncing)
    const previousFilters = previousFiltersRef.current;
    const onlySearchChanged = 
      search !== previousFilters.search &&
      otherFilters.status === previousFilters.status &&
      otherFilters.tradeType === previousFilters.tradeType &&
      otherFilters.educator === previousFilters.educator;

    if (onlySearchChanged) {
      debouncedSearch(search, otherFilters);
    } else {
      // Immediate filtering for non-search filters
      performFiltering(search, otherFilters);
    }

    previousFiltersRef.current = filters;
  }, [filters, debouncedSearch, performFiltering]);

  // Update optimized data when raw signals change
  useEffect(() => {
    const { search, ...otherFilters } = filters;
    performFiltering(search, otherFilters);
  }, [rawSignals, performFiltering]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Memoized statistics for performance
  const signalStats = useMemo(() => {
    return {
      total: rawSignals.length,
      active: rawSignals.filter(s => s.status === 'active').length,
      pending: rawSignals.filter(s => s.status === 'pending').length,
      closed: rawSignals.filter(s => s.status === 'closed').length,
      filteredCount: optimizedData.length
    };
  }, [rawSignals, optimizedData]);

  const refreshData = useCallback(async () => {
    try {
      await refreshFunction();
    } catch (error) {
      console.error('Error refreshing signal data:', error);
    }
  }, [refreshFunction]);

  return {
    signals: rawSignals,
    filteredSignals: optimizedData,
    isLoading,
    error,
    lastUpdated,
    refreshData
  };
};
