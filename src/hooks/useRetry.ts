
import { useState, useCallback } from 'react';

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

export function useRetry<T>(
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

  const calculateDelay = useCallback((attempt: number) => {
    const delay = initialDelay * Math.pow(backoffFactor, attempt - 1);
    return Math.min(delay, maxDelay);
  }, [initialDelay, backoffFactor, maxDelay]);

  const execute = useCallback(async (): Promise<T> => {
    setState(prev => ({
      ...prev,
      isRetrying: true,
      attempt: prev.attempt + 1
    }));

    try {
      const result = await operation();
      setState({
        isRetrying: false,
        attempt: 0,
        canRetry: true,
        lastError: null
      });
      return result;
    } catch (error) {
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
        return execute();
      }

      throw error;
    }
  }, [operation, state.attempt, maxAttempts, onRetry, calculateDelay]);

  const reset = useCallback(() => {
    setState({
      isRetrying: false,
      attempt: 0,
      canRetry: true,
      lastError: null
    });
  }, []);

  const retry = useCallback(() => {
    if (state.canRetry) {
      return execute();
    }
    return Promise.reject(state.lastError);
  }, [execute, state.canRetry, state.lastError]);

  return {
    ...state,
    execute,
    retry,
    reset
  };
}
