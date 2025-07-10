
import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocketPrices } from '@/contexts/WebSocketPriceContext';

interface OptimizedLivePriceData {
  price: number;
  change: number;
  changePercent: number;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  connectionStatus: 'connected' | 'connecting' | 'disconnected' | 'error';
  isPaused: boolean;
  refreshPrice: () => void;
  pauseUpdates: () => void;
  resumeUpdates: () => void;
}

interface UseOptimizedLivePriceOptions {
  enableSmartPausing?: boolean;
  debounceMs?: number;
  pauseOnInput?: boolean;
}

export function useOptimizedLivePrice(
  symbol: string,
  options: UseOptimizedLivePriceOptions = {}
): OptimizedLivePriceData {
  const {
    enableSmartPausing = true,
    debounceMs = 500,
    pauseOnInput = true
  } = options;

  const {
    prices,
    connectionStatus,
    subscribe,
    unsubscribe,
    getPrice,
    pauseUpdates: contextPauseUpdates,
    resumeUpdates: contextResumeUpdates,
    refreshPrice: contextRefreshPrice,
    lastUpdated: contextLastUpdated
  } = useWebSocketPrices();

  const [debouncedPrice, setDebouncedPrice] = useState({
    price: 0,
    change: 0,
    changePercent: 0
  });
  const [isLocallyPaused, setIsLocallyPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputActivityRef = useRef(false);
  const inputTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to symbol on mount
  useEffect(() => {
    if (!symbol) return;

    subscribe([symbol]);

    return () => {
      unsubscribe([symbol]);
    };
  }, [symbol, subscribe, unsubscribe]);

  // Debounced price updates
  useEffect(() => {
    const currentPrice = getPrice(symbol);
    
    if (!currentPrice) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      setDebouncedPrice({
        price: currentPrice.price,
        change: currentPrice.change,
        changePercent: currentPrice.changePercent
      });
      setLastUpdated(new Date(currentPrice.timestamp));
    }, debounceMs);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [prices, symbol, debounceMs, getPrice]);

  // Smart input detection for pausing
  useEffect(() => {
    if (!enableSmartPausing || !pauseOnInput) return;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement;
      if (target.matches('input, textarea, select')) {
        inputActivityRef.current = true;
        setIsLocallyPaused(true);
        contextPauseUpdates();
      }
    };

    const handleFocusOut = () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }

      inputTimeoutRef.current = setTimeout(() => {
        inputActivityRef.current = false;
        setIsLocallyPaused(false);
        contextResumeUpdates();
      }, 3000); // Resume after 3 seconds of inactivity
    };

    const handleInput = () => {
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }

      inputTimeoutRef.current = setTimeout(() => {
        inputActivityRef.current = false;
        setIsLocallyPaused(false);
        contextResumeUpdates();
      }, 3000);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    document.addEventListener('input', handleInput);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      document.removeEventListener('input', handleInput);
      
      if (inputTimeoutRef.current) {
        clearTimeout(inputTimeoutRef.current);
      }
    };
  }, [enableSmartPausing, pauseOnInput, contextPauseUpdates, contextResumeUpdates]);

  const refreshPrice = useCallback(() => {
    contextRefreshPrice(symbol);
  }, [contextRefreshPrice, symbol]);

  const pauseUpdates = useCallback(() => {
    setIsLocallyPaused(true);
    contextPauseUpdates();
  }, [contextPauseUpdates]);

  const resumeUpdates = useCallback(() => {
    setIsLocallyPaused(false);
    contextResumeUpdates();
  }, [contextResumeUpdates]);

  return {
    price: debouncedPrice.price,
    change: debouncedPrice.change,
    changePercent: debouncedPrice.changePercent,
    isLoading: connectionStatus === 'connecting',
    error: connectionStatus === 'error' ? 'Connection failed' : null,
    lastUpdated: lastUpdated || contextLastUpdated,
    connectionStatus,
    isPaused: isLocallyPaused,
    refreshPrice,
    pauseUpdates,
    resumeUpdates
  };
}
