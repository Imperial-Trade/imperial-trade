
import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CacheEntry {
  data: any[];
  timestamp: number;
  expiry: number;
}

interface RequestState {
  requests: any[];
  loading: boolean;
  error: string | null;
  newRequestCount: number;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();
const activeRequests = new Set<string>();

export function useDirectAccountRequests() {
  const [state, setState] = useState<RequestState>({
    requests: [],
    loading: true,
    error: null,
    newRequestCount: 0
  });

  const abortControllerRef = useRef<AbortController>();
  const realtimeChannelRef = useRef<any>();
  const cacheKey = 'account_requests';

  // Get cached data if available and not expired
  const getCachedData = useCallback(() => {
    const cached = cache.get(cacheKey);
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    return null;
  }, []);

  // Set cache data
  const setCacheData = useCallback((data: any[]) => {
    cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + CACHE_TTL
    });
  }, []);

  // Clear cache
  const clearCache = useCallback(() => {
    cache.delete(cacheKey);
  }, []);

  // Force immediate state update - this fixes the main issue
  const forceStateUpdate = useCallback((updatedRequests: any[]) => {
    setState(prev => ({
      ...prev,
      requests: updatedRequests,
      loading: false,
      error: null
    }));
    setCacheData(updatedRequests);
  }, [setCacheData]);

  // Load requests with request deduplication
  const loadRequests = useCallback(async (forceRefresh = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData();
      if (cachedData) {
        setState(prev => ({
          ...prev,
          requests: cachedData,
          loading: false,
          error: null
        }));
        return cachedData;
      }
    }

    // Prevent duplicate requests
    if (activeRequests.has(cacheKey)) {
      return;
    }

    activeRequests.add(cacheKey);

    try {
      // Cancel any existing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      setState(prev => ({ ...prev, loading: true, error: null }));

      const { data, error } = await supabase
        .from('account_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(signal);

      if (signal.aborted) return;

      if (error) {
        throw new Error(error.message);
      }

      const requestsData = data || [];
      
      // Cache the data
      setCacheData(requestsData);

      setState(prev => ({
        ...prev,
        requests: requestsData,
        loading: false,
        error: null
      }));

      return requestsData;
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      console.error('Error loading requests:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to load requests'
      }));
      throw error;
    } finally {
      activeRequests.delete(cacheKey);
    }
  }, [getCachedData, setCacheData]);

  // Handle real-time updates with immediate state sync
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('Real-time update received:', payload.eventType, payload.new?.id);

    setState(prev => {
      let updatedRequests = [...prev.requests];
      let newRequestCount = prev.newRequestCount;

      switch (payload.eventType) {
        case 'INSERT':
          // Add new request to the beginning
          updatedRequests.unshift(payload.new);
          newRequestCount += 1;
          break;
        
        case 'UPDATE':
          // Update existing request immediately
          const updateIndex = updatedRequests.findIndex(req => req.id === payload.new.id);
          if (updateIndex !== -1) {
            updatedRequests[updateIndex] = payload.new;
          } else {
            // If not found, add it (edge case)
            updatedRequests.unshift(payload.new);
          }
          break;
        
        case 'DELETE':
          // Remove deleted request
          updatedRequests = updatedRequests.filter(req => req.id !== payload.old.id);
          break;
      }

      // Update cache immediately
      setCacheData(updatedRequests);

      return {
        ...prev,
        requests: updatedRequests,
        newRequestCount
      };
    });
  }, [setCacheData]);

  // Clear new request count
  const clearNewRequestCount = useCallback(() => {
    setState(prev => ({ ...prev, newRequestCount: 0 }));
  }, []);

  // Setup real-time subscription
  useEffect(() => {
    // Load initial data
    loadRequests();

    // Setup real-time subscription
    realtimeChannelRef.current = supabase
      .channel('account_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'account_requests'
        },
        handleRealtimeUpdate
      )
      .subscribe();

    return () => {
      // Cleanup
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
      }
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    requests: state.requests,
    loading: state.loading,
    error: state.error,
    newRequestCount: state.newRequestCount,
    loadRequests,
    clearNewRequestCount,
    clearCache,
    forceStateUpdate // Export this for immediate updates after mutations
  };
}
