
import { useState, useEffect, useCallback } from 'react';
import { ApiResponse, AsyncState } from '@/types/common';

interface UseApiOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: string) => void;
}

export function useApi<T = unknown>(
  apiCall: () => Promise<T>,
  options: UseApiOptions<T> = {}
) {
  const { immediate = true, onSuccess, onError } = options;
  
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: false,
    error: null
  });

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const data = await apiCall();
      setState({ data, isLoading: false, error: null });
      onSuccess?.(data);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ data: null, isLoading: false, error: errorMessage });
      onError?.(errorMessage);
      throw error;
    }
  }, [apiCall, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    ...state,
    execute,
    refetch: execute
  };
}

export function useMutation<T = unknown, P = unknown>(
  mutationFn: (params: P) => Promise<T>,
  options: UseApiOptions<T> = {}
) {
  const { onSuccess, onError } = options;
  
  const [state, setState] = useState<AsyncState<T> & { isIdle: boolean }>({
    data: null,
    isLoading: false,
    error: null,
    isIdle: true
  });

  const mutate = useCallback(async (params: P) => {
    setState(prev => ({ ...prev, isLoading: true, error: null, isIdle: false }));
    
    try {
      const data = await mutationFn(params);
      setState({ data, isLoading: false, error: null, isIdle: false });
      onSuccess?.(data);
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setState({ data: null, isLoading: false, error: errorMessage, isIdle: false });
      onError?.(errorMessage);
      throw error;
    }
  }, [mutationFn, onSuccess, onError]);

  const reset = useCallback(() => {
    setState({ data: null, isLoading: false, error: null, isIdle: true });
  }, []);

  return {
    ...state,
    mutate,
    reset
  };
}
