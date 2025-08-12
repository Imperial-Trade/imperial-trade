
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { enhancedApiClient } from '@/api/client/EnhancedApiClient';
import { useOptimizedRetry } from './useOptimizedRetry';

interface OptimizedRealTimeState {
  requests: any[];
  newRequestCount: number;
  loading: boolean;
  error: string | null;
}

export const useOptimizedRealTimeRequests = () => {
  const [state, setState] = useState<OptimizedRealTimeState>({
    requests: [],
    newRequestCount: 0,
    loading: true,
    error: null
  });

  const batchUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<any[]>([]);

  const { execute: loadRequests, isRetrying } = useOptimizedRetry(
    async () => {
      const result = await enhancedApiClient.select('account_requests', {
        order: { column: 'created_at', ascending: false }
      });
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load requests');
      }
      
      return result.data || [];
    },
    {
      maxAttempts: 3,
      initialDelay: 1000,
      onRetry: (attempt, error) => {
        console.log(`Retrying load requests (attempt ${attempt}):`, error.message);
      }
    }
  );

  const batchStateUpdate = useCallback((updateFn: (prevState: OptimizedRealTimeState) => OptimizedRealTimeState) => {
    if (batchUpdateTimeoutRef.current) {
      clearTimeout(batchUpdateTimeoutRef.current);
    }

    batchUpdateTimeoutRef.current = setTimeout(() => {
      setState(updateFn);
      pendingUpdatesRef.current = [];
    }, 50); // Batch updates for 50ms
  }, []);

  const handleRealTimeUpdate = useCallback((payload: any) => {
    console.log('Real-time update received:', payload);

    if (payload.eventType === 'INSERT') {
      batchStateUpdate(prev => ({
        ...prev,
        newRequestCount: prev.newRequestCount + 1,
        requests: [payload.new, ...prev.requests]
      }));

      // Notifications are handled centrally on create; avoid duplicates here

    } else if (payload.eventType === 'UPDATE') {
      batchStateUpdate(prev => ({
        ...prev,
        requests: prev.requests.map(req => 
          req.id === payload.new.id ? payload.new : req
        )
      }));

      // Check if it's a resubmission
      if (payload.old?.status === 'rejected' && payload.new?.status === 'pending') {
        // Resubmission notifications handled centrally; avoid duplicates here
      }

    } else if (payload.eventType === 'DELETE') {
      batchStateUpdate(prev => ({
        ...prev,
        requests: prev.requests.filter(req => req.id !== payload.old.id)
      }));
    }
  }, [batchStateUpdate]);

  const loadRequestsCallback = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      const data = await loadRequests();
      setState(prev => ({ ...prev, requests: data, loading: false }));
    } catch (error) {
      console.error('Error loading requests:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to load requests'
      }));
    }
  }, [loadRequests]);

  useEffect(() => {
    loadRequestsCallback();

    // Set up real-time subscription with optimized handling
    const channel = supabase
      .channel('account_requests_optimized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_requests'
        },
        handleRealTimeUpdate
      )
      .subscribe();

    return () => {
      if (batchUpdateTimeoutRef.current) {
        clearTimeout(batchUpdateTimeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [loadRequestsCallback, handleRealTimeUpdate]);

  const clearNewRequestCount = useCallback(() => {
    setState(prev => ({ ...prev, newRequestCount: 0 }));
  }, []);

  const memoizedReturn = useMemo(() => ({
    requests: state.requests,
    newRequestCount: state.newRequestCount,
    loading: state.loading || isRetrying,
    error: state.error,
    loadRequests: loadRequestsCallback,
    clearNewRequestCount
  }), [state, isRetrying, loadRequestsCallback, clearNewRequestCount]);

  return memoizedReturn;
};
