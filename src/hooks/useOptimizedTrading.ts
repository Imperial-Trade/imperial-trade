
import { useState, useEffect, useCallback, useRef } from 'react';
import { useOptimizedTradingRealtime } from './useOptimizedTradingRealtime';
import { tradingApiService, TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { CreateTradeAlertDto, UpdateTradeAlertDto, TradeAlertResponseDto } from '@/domain/dtos/trading/CreateTradeAlertDto';

interface UseOptimizedTradingReturn {
  alerts: TradeAlertWithProfile[];
  isLoading: boolean;
  error: string | null;
  createAlert: (dto: CreateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  updateAlert: (id: string, dto: UpdateTradeAlertDto) => Promise<TradeAlertResponseDto | null>;
  deleteAlert: (id: string) => Promise<boolean>;
  refreshAlerts: () => Promise<void>;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdated?: Date | null;
}

// Cache for storing alerts data (fallback for when realtime fails)
const alertsCache = new Map<string, { data: TradeAlertWithProfile[], timestamp: number }>();
const CACHE_DURATION = 10000; // 10 seconds cache
const POLLING_INTERVAL = 60000; // Fallback polling interval

export const useOptimizedTrading = (userId: string, showAllSignals: boolean = false): UseOptimizedTradingReturn => {
  // Try real-time first
  const realtimeHook = useOptimizedTradingRealtime(userId, showAllSignals);
  
  // Fallback state for HTTP polling
  const [fallbackAlerts, setFallbackAlerts] = useState<TradeAlertWithProfile[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shouldFetchAlerts = showAllSignals || Boolean(userId && userId.trim() !== '');
  const cacheKey = showAllSignals ? 'all_signals' : userId;

  // Check if we should use fallback based on connection status
  const shouldUseFallback = realtimeHook.connectionStatus === 'error' || 
                           realtimeHook.connectionStatus === 'disconnected';

  // Cache management for fallback
  const getCachedAlerts = useCallback((key: string): TradeAlertWithProfile[] | null => {
    const cached = alertsCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }, []);

  const setCachedAlerts = useCallback((key: string, data: TradeAlertWithProfile[]) => {
    alertsCache.set(key, { data, timestamp: Date.now() });
  }, []);

  // HTTP fallback fetch function
  const fetchAlertsFallback = useCallback(async (force = false) => {
    if (!shouldFetchAlerts || !shouldUseFallback) return;

    const now = Date.now();
    if (!force && now - lastFetch < 2000) return;

    const cachedData = getCachedAlerts(cacheKey);
    if (cachedData && !force) {
      setFallbackAlerts(cachedData);
      return;
    }

    setFallbackLoading(true);
    setFallbackError(null);
    setLastFetch(now);

    try {
      let result;
      
      if (showAllSignals) {
        result = await tradingApiService.getAllPublicAlertsWithProfiles();
      } else {
        const userAlertsResult = await tradingApiService.getAllAlerts(userId);
        if (userAlertsResult.success && userAlertsResult.data) {
          result = {
            success: true,
            data: userAlertsResult.data.map(alert => ({ ...alert, creator: undefined })),
            error: undefined
          };
        } else {
          result = userAlertsResult;
        }
      }
      
      if (result.success && result.data) {
        setFallbackAlerts(result.data);
        setCachedAlerts(cacheKey, result.data);
        setFallbackError(null);
      } else {
        setFallbackError(result.error || 'Failed to fetch alerts');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setFallbackError(errorMessage);
      console.error('Fallback fetch failed:', errorMessage);
    } finally {
      setFallbackLoading(false);
    }
  }, [userId, shouldFetchAlerts, shouldUseFallback, lastFetch, getCachedAlerts, setCachedAlerts, showAllSignals, cacheKey]);

  // Setup fallback polling when real-time fails
  useEffect(() => {
    if (!shouldUseFallback || !shouldFetchAlerts) {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
        pollingTimeoutRef.current = null;
      }
      setUsingFallback(false);
      return;
    }

    console.log('Real-time connection failed, switching to HTTP polling fallback');
    setUsingFallback(true);
    fetchAlertsFallback();

    const setupPolling = () => {
      pollingTimeoutRef.current = setTimeout(() => {
        fetchAlertsFallback();
        setupPolling();
      }, POLLING_INTERVAL);
    };

    setupPolling();

    return () => {
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [shouldUseFallback, shouldFetchAlerts, fetchAlertsFallback]);

  // Return appropriate data based on connection status
  const alerts = usingFallback ? fallbackAlerts : realtimeHook.alerts;
  const isLoading = usingFallback ? fallbackLoading : realtimeHook.isLoading;
  const error = usingFallback ? fallbackError : realtimeHook.error;

  // Fallback implementations for CRUD operations when real-time is not available
  const createAlert = useCallback(async (dto: CreateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    const result = await realtimeHook.createAlert(dto);
    
    // If using fallback, refresh alerts after create
    if (usingFallback && result) {
      await fetchAlertsFallback(true);
    }
    
    return result;
  }, [realtimeHook.createAlert, usingFallback, fetchAlertsFallback]);

  const updateAlert = useCallback(async (id: string, dto: UpdateTradeAlertDto): Promise<TradeAlertResponseDto | null> => {
    const result = await realtimeHook.updateAlert(id, dto);
    
    // If using fallback, refresh alerts after update
    if (usingFallback && result) {
      await fetchAlertsFallback(true);
    }
    
    return result;
  }, [realtimeHook.updateAlert, usingFallback, fetchAlertsFallback]);

  const deleteAlert = useCallback(async (id: string): Promise<boolean> => {
    const result = await realtimeHook.deleteAlert(id);
    
    // If using fallback, refresh alerts after delete
    if (usingFallback && result) {
      await fetchAlertsFallback(true);
    }
    
    return result;
  }, [realtimeHook.deleteAlert, usingFallback, fetchAlertsFallback]);

  const refreshAlerts = useCallback(async () => {
    if (usingFallback) {
      await fetchAlertsFallback(true);
    } else {
      await realtimeHook.refreshAlerts();
    }
  }, [usingFallback, fetchAlertsFallback, realtimeHook.refreshAlerts]);

  return {
    alerts,
    isLoading,
    error,
    createAlert,
    updateAlert,
    deleteAlert,
    refreshAlerts,
    connectionStatus: realtimeHook.connectionStatus,
    lastUpdated: realtimeHook.lastUpdated
  };
};
