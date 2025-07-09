
import { useState, useEffect, useCallback, useRef } from 'react';
import { tradingApiService } from '@/api/services/TradingApiService';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

interface UseOptimizedTradingReturn {
  alerts: TradeAlertResponseDto[];
  isLoading: boolean;
  error: string | null;
  createAlert: (dto: CreateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  updateAlert: (id: string, dto: UpdateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  deleteAlert: (id: string) => Promise<boolean>;
  refreshAlerts: () => Promise<void>;
}

// Cache for storing alerts data
const alertsCache = new Map<string, { data: TradeAlertResponseDto[], timestamp: number }>();
const CACHE_DURATION = 10000; // 10 seconds cache
const POLLING_INTERVAL = 60000; // Reduced from 30s to 60s

export const useOptimizedTrading = (userId: string): UseOptimizedTradingReturn => {
  const [alerts, setAlerts] = useState<TradeAlertResponseDto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const shouldFetchAlerts = Boolean(userId && userId.trim() !== '');

  // Check cache first
  const getCachedAlerts = useCallback((userId: string): TradeAlertResponseDto[] | null => {
    const cached = alertsCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, []);

  // Update cache
  const setCachedAlerts = useCallback((userId: string, data: TradeAlertResponseDto[]) => {
    alertsCache.set(userId, { data, timestamp: Date.now() });
  }, []);

  const fetchAlerts = useCallback(async (force = false) => {
    if (!shouldFetchAlerts) return;

    // Prevent duplicate requests within 2 seconds
    const now = Date.now();
    if (!force && now - lastFetch < 2000) {
      return;
    }

    // Check cache first
    const cachedData = getCachedAlerts(userId);
    if (cachedData && !force) {
      setAlerts(cachedData);
      return;
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);
    setError(null);
    setLastFetch(now);

    try {
      const result = await tradingApiService.getAllAlerts(userId);
      
      if (result.success && result.data) {
        setAlerts(result.data);
        setCachedAlerts(userId, result.data);
      } else {
        setError(result.error || 'Failed to fetch alerts');
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        console.error('Failed to fetch alerts:', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, shouldFetchAlerts, lastFetch, getCachedAlerts, setCachedAlerts]);

  // Setup polling with smart intervals
  useEffect(() => {
    if (!shouldFetchAlerts) return;

    // Initial fetch
    fetchAlerts();

    // Setup polling
    const setupPolling = () => {
      pollingTimeoutRef.current = setTimeout(() => {
        fetchAlerts();
        setupPolling(); // Recursively setup next poll
      }, POLLING_INTERVAL);
    };

    setupPolling();

    // Listen for custom events to trigger immediate refresh
    const handleSignalPosted = () => {
      console.log('Signal posted event received, refreshing alerts');
      fetchAlerts(true); // Force refresh
    };

    window.addEventListener('signal-posted', handleSignalPosted);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
      window.removeEventListener('signal-posted', handleSignalPosted);
    };
  }, [fetchAlerts, shouldFetchAlerts]);

  const createAlert = useCallback(async (dto: CreateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    if (!shouldFetchAlerts) {
      console.warn('Cannot create alert: invalid userId');
      return null;
    }

    try {
      const result = await tradingApiService.createAlert(dto, userId);
      if (result.success && result.data) {
        // Update local state immediately
        setAlerts(prev => [result.data!, ...prev]);
        // Update cache
        const updatedAlerts = [result.data, ...alerts];
        setCachedAlerts(userId, updatedAlerts);
        return result.data;
      } else {
        console.error('Failed to create alert:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error creating alert:', error);
      return null;
    }
  }, [userId, shouldFetchAlerts, alerts, setCachedAlerts]);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    if (!shouldFetchAlerts) {
      console.warn('Cannot update alert: invalid userId');
      return null;
    }

    try {
      const result = await tradingApiService.updateAlert(id, dto, userId);
      if (result.success && result.data) {
        // Update local state immediately
        setAlerts(prev => prev.map(alert => 
          alert.id === id ? result.data! : alert
        ));
        // Update cache
        const updatedAlerts = alerts.map(alert => 
          alert.id === id ? result.data! : alert
        );
        setCachedAlerts(userId, updatedAlerts);
        return result.data;
      } else {
        console.error('Failed to update alert:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error updating alert:', error);
      return null;
    }
  }, [userId, shouldFetchAlerts, alerts, setCachedAlerts]);

  const deleteAlert = useCallback(async (id: string): Promise<boolean> => {
    if (!shouldFetchAlerts) {
      console.warn('Cannot delete alert: invalid userId');
      return false;
    }

    try {
      const result = await tradingApiService.deleteAlert(id, userId);
      if (result.success) {
        // Update local state immediately
        setAlerts(prev => prev.filter(alert => alert.id !== id));
        // Update cache
        const updatedAlerts = alerts.filter(alert => alert.id !== id);
        setCachedAlerts(userId, updatedAlerts);
        return true;
      } else {
        console.error('Failed to delete alert:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Error deleting alert:', error);
      return false;
    }
  }, [userId, shouldFetchAlerts, alerts, setCachedAlerts]);

  const refreshAlerts = useCallback(async () => {
    await fetchAlerts(true);
  }, [fetchAlerts]);

  return {
    alerts,
    isLoading: shouldFetchAlerts ? isLoading : false,
    error: shouldFetchAlerts ? error : null,
    createAlert,
    updateAlert,
    deleteAlert,
    refreshAlerts
  };
};
