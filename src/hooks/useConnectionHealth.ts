
import { useState, useEffect, useCallback, useRef } from 'react';

interface ConnectionHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  latency: number | null;
  lastCheck: Date | null;
  consecutiveFailures: number;
}

interface UseConnectionHealthReturn extends ConnectionHealth {
  checkHealth: () => Promise<void>;
  reset: () => void;
}

export const useConnectionHealth = (
  checkUrl?: string,
  interval: number = 30000 // 30 seconds
): UseConnectionHealthReturn => {
  const [health, setHealth] = useState<ConnectionHealth>({
    status: 'unknown',
    latency: null,
    lastCheck: null,
    consecutiveFailures: 0
  });

  const intervalRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  const checkHealth = useCallback(async () => {
    if (!checkUrl) return;

    // Abort previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const startTime = performance.now();

    try {
      const response = await fetch(checkUrl, {
        method: 'HEAD',
        signal: abortControllerRef.current.signal,
        timeout: 10000 // 10 second timeout
      } as RequestInit);

      const latency = performance.now() - startTime;
      const isHealthy = response.ok && latency < 5000; // Consider healthy if response is ok and under 5s

      setHealth(prev => ({
        status: isHealthy ? 'healthy' : latency > 5000 ? 'degraded' : 'unhealthy',
        latency: Math.round(latency),
        lastCheck: new Date(),
        consecutiveFailures: isHealthy ? 0 : prev.consecutiveFailures + 1
      }));

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Ignore aborted requests
      }

      console.warn('Connection health check failed:', error);
      
      setHealth(prev => ({
        status: 'unhealthy',
        latency: null,
        lastCheck: new Date(),
        consecutiveFailures: prev.consecutiveFailures + 1
      }));
    }
  }, [checkUrl]);

  const reset = useCallback(() => {
    setHealth({
      status: 'unknown',
      latency: null,
      lastCheck: null,
      consecutiveFailures: 0
    });
  }, []);

  useEffect(() => {
    if (!checkUrl) return;

    // Initial check
    checkHealth();

    // Set up interval
    intervalRef.current = setInterval(checkHealth, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [checkUrl, interval, checkHealth]);

  return {
    ...health,
    checkHealth,
    reset
  };
};
