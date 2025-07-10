
import { useEffect, useRef } from 'react';

interface UseTradingPollingOptions {
  shouldUseFallback: boolean;
  shouldFetchAlerts: boolean;
  fetchAlertsFallback: (force?: boolean) => Promise<void>;
  setUsingFallback: (using: boolean) => void;
}

const POLLING_INTERVAL = 60000; // Fallback polling interval

export const useTradingPolling = ({
  shouldUseFallback,
  shouldFetchAlerts,
  fetchAlertsFallback,
  setUsingFallback
}: UseTradingPollingOptions) => {
  const pollingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
  }, [shouldUseFallback, shouldFetchAlerts, fetchAlertsFallback, setUsingFallback]);
};
