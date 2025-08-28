
import { useState, useCallback, useRef } from 'react';
import { TradeAlertWithProfile, tradingApiService } from '@/api/services/TradingApiService';

interface UseTradingFallbackOptions {
  userId: string;
  showAllSignals: boolean;
  shouldUseFallback: boolean;
}

interface UseTradingFallbackReturn {
  fallbackAlerts: TradeAlertWithProfile[];
  fallbackLoading: boolean;
  fallbackError: string | null;
  fetchAlertsFallback: (force?: boolean) => Promise<void>;
}

// Cache for storing alerts data (fallback for when realtime fails)
const alertsCache = new Map<string, { data: TradeAlertWithProfile[], timestamp: number }>();
const CACHE_DURATION = 10000; // 10 seconds cache

export const useTradingFallback = ({
  userId,
  showAllSignals,
  shouldUseFallback
}: UseTradingFallbackOptions): UseTradingFallbackReturn => {
  const [fallbackAlerts, setFallbackAlerts] = useState<TradeAlertWithProfile[]>([]);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const shouldFetchAlerts = showAllSignals || Boolean(userId && userId.trim() !== '');
  const cacheKey = showAllSignals ? 'all_signals' : userId;

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

  return {
    fallbackAlerts,
    fallbackLoading,
    fallbackError,
    fetchAlertsFallback
  };
};
