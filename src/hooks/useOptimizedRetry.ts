
import { useState, useCallback, useRef } from 'react';

interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

interface RetryState {
  isRetrying: boolean;
  attempt: number;
  canRetry: boolean;
  lastError: Error | null;
}

export function useOptimizedRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = {}
) {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry
  } = config;

  const [state, setState] = useState<RetryState>({
    isRetrying: false,
    attempt: 0,
    canRetry: true,
    lastError: null
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateDelay = useCallback((attempt: number) => {
    const delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
    return Math.min(delay, maxDelay);
  }, [initialDelay, backoffFactor, maxDelay]);

  const execute = useCallback(async (): Promise<T> => {
    // Cancel any existing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setState(prev => ({
      ...prev,
      isRetrying: true,
      attempt: prev.attempt + 1
    }));

    try {
      if (signal.aborted) throw new Error('Operation cancelled');
      
      const result = await operation();
      
      if (signal.aborted) throw new Error('Operation cancelled');
      
      setState({
        isRetrying: false,
        attempt: 0,
        canRetry: true,
        lastError: null
      });
      
      return result;
    } catch (error) {
      if (signal.aborted) {
        setState(prev => ({ ...prev, isRetrying: false }));
        throw new Error('Operation cancelled');
      }

      const currentAttempt = state.attempt + 1;
      const canRetryAgain = currentAttempt < maxAttempts;

      setState({
        isRetrying: false,
        attempt: currentAttempt,
        canRetry: canRetryAgain,
        lastError: error as Error
      });

      if (canRetryAgain) {
        onRetry?.(currentAttempt, error as Error);
        const delay = calculateDelay(currentAttempt);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        if (signal.aborted) throw new Error('Operation cancelled');
        
        return execute();
      }

      throw error;
    }
  }, [operation, state.attempt, maxAttempts, onRetry, calculateDelay]);

  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState({
      isRetrying: false,
      attempt: 0,
      canRetry: true,
      lastError: null
    });
  }, []);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setState(prev => ({ ...prev, isRetrying: false }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    cancel
  };
}
