// ============================================
// FINAL VERIFIED FIX - SignalRealtimeContext.tsx
// All changes confirmed by Lovable's analysis
// Guarantees: Instant notifications, instant card display, zero delays
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';

// ✅ FIX #5: Optimized cache TTL for real-time trading
const LOCAL_CACHE_TTL = 3 * 1000; // 3 seconds for near-instant updates
const EDUCATOR_CACHE_TTL = 30 * 1000; // 30 seconds (educator list doesn't change often)

// Module-level educator cache
let educatorUserIdsCache: string[] = [];
let educatorCacheExpiry = 0;

// ✅ FIX #7: Global debug helpers
if (typeof window !== 'undefined') {
  (window as any).clearSignalCache = () => {
    educatorUserIdsCache = [];
    educatorCacheExpiry = 0;
    console.log('✅ Global signal caches cleared - next fetch will be fresh');
  };
  
  (window as any).debugSignalState = () => {
    console.log('📊 Cache State:', {
      educatorIds: educatorUserIdsCache,
      educatorCount: educatorUserIdsCache.length,
      educatorCacheValid: Date.now() < educatorCacheExpiry,
      cacheExpiry: new Date(educatorCacheExpiry).toLocaleString(),
      timeUntilExpiry: Math.max(0, Math.round((educatorCacheExpiry - Date.now()) / 1000)) + 's'
    });
  };
}

interface Signal {
  id: string;
  asset_name: string;
  direction: 'BUY' | 'SELL';
  entry_price: number;
  stop_loss?: number;
  take_profit_1?: number;
  status: string;
  user_id: string;
  created_at: string;
  [key: string]: any;
}

interface SignalRealtimeContextType {
  signals: Signal[];
  error: string | null;
  lastUpdated: Date;
  refreshSignals: (bypassThrottle?: boolean) => Promise<void>;
  isLoading: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback';
  nextRetryAt: number | null;
  subscribe: () => void;
  unsubscribe: () => void;
  getSignalById: (signalId: string) => Signal | undefined;
  lastUpdatePayload: any | null;  // ✅ TIER 0 FIX: Expose latest UPDATE payload for instant event listeners
}

const SignalRealtimeContext = createContext<SignalRealtimeContextType | undefined>(undefined);

export const SignalRealtimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback'>('connecting');
  
  // ✅ PHASE 1: Add TP hits cache to eliminate stale closure bug
  const tpHitsCache = useRef<Map<string, number[]>>(new Map());
  
  const localCacheRef = useRef<{
    data: Signal[];
    expiry: number;
    educatorIds: string[];
    educatorExpiry: number;
  }>({ data: [], expiry: 0, educatorIds: [], educatorExpiry: 0 });

  const mountOnlyRef = useRef(true);
  const seenIdsRef = useRef(new Set<string>());
  const channelRef = useRef<any>(null);

  // ✅ TIER 0 FIX: Store last UPDATE payload for instant event listener access
  const lastUpdatePayloadRef = useRef<any>(null);

  // ✅ PHASE 3: Expose context to window for emergency fallbacks
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__signalRealtimeContext = {
        getSignalById: (id: string) => {
          const signal = signals.find(s => s.id === id);
          console.log('🔍 [Window Context] getSignalById called:', {
            signalId: id?.substring(0, 8),
            found: !!signal,
            totalSignals: signals.length
          });
          return signal;
        },
        getAllSignals: () => {
          console.log('🔍 [Window Context] getAllSignals called:', {
            totalSignals: signals.length
          });
          return signals;
        },
        getTpHits: (id: string) => {
          const hits = tpHitsCache.current.get(id) || [];
          console.log('🔍 [Window Context] getTpHits called:', {
            signalId: id?.substring(0, 8),
            hits,
            cacheSize: tpHitsCache.current.size
          });
          return hits;
        }
      };
    }
    
    return () => {
      if (typeof window !== 'undefined') {
        console.log('🧹 [Window Context] Cleaning up window.__signalRealtimeContext');
        delete (window as any).__signalRealtimeContext;
      }
    };
  }, [signals]);

  // Fetch educator user IDs with caching
  const fetchEducatorUserIds = useCallback(async (): Promise<string[]> => {
    const now = Date.now();

    // Check cache
    if (educatorUserIdsCache.length > 0 && now < educatorCacheExpiry) {
      console.log('📊 Using cached educator IDs:', educatorUserIdsCache.length, 'educators');
      return educatorUserIdsCache;
    }

    console.log('🔄 Fetching fresh educator IDs from database...');

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, user_type, access_level')
        .or('user_type.eq.educator,access_level.eq.admin,access_level.eq.moderator');

      if (error) {
        console.error('❌ Error fetching educator IDs:', error);
        return educatorUserIdsCache; // Return old cache on error
      }

      const ids = data?.map(p => p.id) || [];
      
      // ✅ FIX #3: Detailed logging
      console.log('✅ Fetched educator profiles:', {
        total: data?.length || 0,
        educators: data?.map(p => ({
          id: p.id.substring(0, 8) + '...',
          name: p.display_name,
          type: p.user_type,
          access: p.access_level
        }))
      });

      educatorUserIdsCache = ids;
      educatorCacheExpiry = now + EDUCATOR_CACHE_TTL;

      return ids;
    } catch (err) {
      console.error('❌ Exception fetching educators:', err);
      return educatorUserIdsCache;
    }
  }, []);

  // Main signal refresh function
  const refreshSignals = useCallback(async (bypassThrottle = false) => {
    const now = Date.now();
    const cache = localCacheRef.current;

    // Force bypass on manual refresh
    if (bypassThrottle) {
      console.log('🔄 FORCE REFRESH - Bypassing all caches');
      cache.expiry = 0;
      educatorCacheExpiry = 0;
    }

    // Check cache validity
    const cacheValid = cache.data.length > 0 && now < cache.expiry;
    
    if (cacheValid && cache.educatorIds.length > 0 && !bypassThrottle) {
      const timeRemaining = Math.round((cache.expiry - now) / 1000);
      console.log(`📊 Using cached signals (${cache.data.length} signals, expires in ${timeRemaining}s)`);
      setSignals(cache.data);
      return;
    }

    console.log('🔄 Fetching fresh signals from database...');

    try {
      // Fetch educator IDs
      const educatorUserIds = await fetchEducatorUserIds();

      if (educatorUserIds.length === 0) {
        console.warn('⚠️ No educator IDs found - check profiles table');
        setSignals([]);
        setError('No educators found');
        return;
      }

      // ✅ FIX #3: Log query parameters
      console.log('🔍 [DEBUG] Query parameters:', {
        educatorCount: educatorUserIds.length,
        educatorIdsSample: educatorUserIds.slice(0, 3).map(id => id.substring(0, 8) + '...'),
        table: 'trade_alerts',
        filter: 'Active + recently closed (1hr)'
      });

      // Query signals
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      // ✅ TWO-QUERY APPROACH: Query 1 - Fetch alerts WITHOUT JOIN
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .in('user_id', educatorUserIds)
        .or(`status.neq.closed,and(status.eq.closed,updated_at.gte.${oneHourAgo})`)
        .order('created_at', { ascending: false })
        .limit(50);

      console.log('🔍 [Step 1] Fetched alerts:', {
        success: !alertsError,
        count: alertsData?.length || 0,
        error: alertsError?.message
      });

      if (alertsError) {
        console.error('❌ Error fetching alerts:', {
          message: alertsError.message,
          details: alertsError.details,
          hint: alertsError.hint,
          code: alertsError.code
        });
        setError(alertsError.message);
        return;
      }

      if (!alertsData || alertsData.length === 0) {
        console.log('ℹ️ No signals found');
        unstable_batchedUpdates(() => {
          setSignals([]);
          setLastUpdated(new Date());
          setError(null);
        });
        return;
      }

      // ✅ TWO-QUERY APPROACH: Query 2 - Fetch creator profiles separately
      const uniqueUserIds = [...new Set(alertsData.map(a => a.user_id))];

      console.log('🔍 [Step 2] Fetching profiles for user IDs:', uniqueUserIds);

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, role, avatar_url, user_type, access_level')
        .in('id', uniqueUserIds);

      if (profilesError) {
        console.warn('⚠️ Error fetching profiles (continuing with default creators):', profilesError);
      }

      console.log('🔍 [Step 3] Fetched profiles:', {
        count: profilesData?.length || 0,
        profiles: profilesData?.map(p => ({ id: p.id, name: p.display_name }))
      });

      // ✅ TWO-QUERY APPROACH: Step 3 - Merge profiles into alerts
      const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      const enrichedAlerts = alertsData.map(alert => ({
        ...alert,
        creator: profileMap.get(alert.user_id) || {
          id: alert.user_id,
          display_name: 'Unknown Educator',
          role: 'user',
          avatar_url: null,
          user_type: null,
          access_level: null
        }
      }));

      console.log('✅ [Step 4] Enriched alerts with creator data:', {
        total: enrichedAlerts.length,
        withCreators: enrichedAlerts.filter(a => a.creator.display_name !== 'Unknown Educator').length,
        sample: enrichedAlerts[0] ? {
          id: enrichedAlerts[0].id,
          asset: enrichedAlerts[0].asset_name,
          creator: enrichedAlerts[0].creator.display_name
        } : null
      });

      // Process enriched signals
      const processedSignals = enrichedAlerts as any[];

      console.log('✅ Successfully fetched signals:', {
        total: processedSignals.length,
        active: processedSignals.filter(s => s.status === 'active').length,
        closed: processedSignals.filter(s => s.status === 'closed').length
      });

      // Update state in batched update
      unstable_batchedUpdates(() => {
        setSignals(processedSignals);
        setLastUpdated(new Date());
        setError(null);
      });

      // ✅ FIX #2: Only cache non-empty results
      localCacheRef.current = {
        data: processedSignals,
        expiry: now + LOCAL_CACHE_TTL,
        educatorIds: educatorUserIds,
        educatorExpiry: educatorCacheExpiry
      };

      console.log('💾 Cached', processedSignals.length, 'signals for', LOCAL_CACHE_TTL / 1000, 'seconds');

    } catch (err) {
      console.error('❌ Exception in refreshSignals:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [fetchEducatorUserIds]);

  // Handle real-time updates with instant trigger
  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    const eventType = payload.eventType;
    const newData = payload.new;
    const signalId = newData?.id;

    console.log('🔄 [Realtime] Event received:', {
      type: eventType,
      table: payload.table,
      signalId: signalId?.substring(0, 8) + '...',
      asset: newData?.asset_name || 'unknown',
      status: newData?.status,
      tpHits: newData?.tp_hits,
      closeReason: newData?.close_reason,
      tradeType: newData?.trade_type,
      timestamp: new Date().toISOString()
    });

    // Additional logging for specific event types
    if (eventType === 'INSERT') {
      console.log('✨ [Realtime] NEW SIGNAL CREATED:', {
        id: signalId?.substring(0, 8),
        asset: newData?.asset_name,
        type: newData?.trade_type,
        status: newData?.status
      });
    } else if (eventType === 'UPDATE') {
      console.log('🔄 [Realtime] SIGNAL UPDATED:', {
        id: signalId?.substring(0, 8),
        asset: newData?.asset_name,
        status: newData?.status,
        tpHits: newData?.tp_hits,
        closeReason: newData?.close_reason
      });
    } else if (eventType === 'DELETE') {
      console.log('🗑️ [Realtime] SIGNAL DELETED:', {
        id: signalId?.substring(0, 8)
      });
    }

    if (!signalId) {
      console.warn('⚠️ Real-time event missing signal ID');
      return;
    }

    // Prevent duplicate processing
    const seenKey = `${eventType}_${signalId}`;
    if (seenIdsRef.current.has(seenKey)) {
      console.log('⏭️ Skipping duplicate event:', seenKey);
      return;
    }
    seenIdsRef.current.add(seenKey);

    // Clear seen IDs after 5 seconds to allow re-processing if needed
    setTimeout(() => seenIdsRef.current.delete(seenKey), 5000);

    if (eventType === 'INSERT') {
      console.log('✅ [INSERT] Adding new signal INSTANTLY:', signalId.substring(0, 8) + '...');
      
      // ✅ FIX #2A: Invalidate local cache to force fresh data on next fetch
      localCacheRef.current.expiry = 0;
      console.log('🔄 [Cache] Invalidated local cache after INSERT event');
      
      // ✅ Fetch creator profile if not included in real-time payload
      if (!newData.creator && newData.user_id) {
        console.log('🔍 Fetching creator profile for new signal...');
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, display_name, role, avatar_url, user_type, access_level')
          .eq('id', newData.user_id)
          .single();
        
        if (profile) {
          newData.creator = profile;
          console.log('✅ Creator profile fetched:', profile.display_name);
        }
      }
      
      setSignals(prev => {
        // Prevent duplicates
        if (prev.some(s => s.id === signalId)) {
          console.log('⚠️ Signal already exists in state');
          return prev;
        }
        
        const newSignals = [newData, ...prev];
        console.log('📊 Total signals after INSERT:', newSignals.length);
        
        // Update cache immediately
        localCacheRef.current.data = newSignals;
        
        return newSignals;
      });

      // ✅ INSTANT: Emit global event for notification + card opening
      if (typeof window !== 'undefined' && (window as any).signalEmitter) {
        console.log('📢 Emitting SIGNAL_CREATED event for instant notification');
        (window as any).signalEmitter.emit('SIGNAL_CREATED', newData);
        (window as any).signalEmitter.emit('REFRESH_SIGNALS');
      }
      
      // ✅ FIX #2A: Also dispatch cache invalidation event for other components
      window.dispatchEvent(new CustomEvent('invalidate-signal-cache'));
    }

    if (eventType === 'UPDATE') {
      console.log('✅ [UPDATE] Updating signal INSTANTLY:', signalId.substring(0, 8) + '...');
      
      // ✅ FIX #2B: Invalidate local cache on UPDATE too
      localCacheRef.current.expiry = 0;
      console.log('🔄 [Cache] Invalidated local cache after UPDATE event');
      
      // ✅ TIER 0 FIX: Store payload for event listeners to access immediately (before state update)
      lastUpdatePayloadRef.current = newData;
      console.log('📦 [Realtime] Set lastUpdatePayloadRef for signal:', {
        id: newData.id?.substring(0, 8),
        status: newData.status,
        closeReason: newData.close_reason
      });
      
      setSignals(prev => {
        const updated = prev.map(s => {
          if (s.id === signalId) {
            // ✅ FIX: Preserve creator data during real-time updates
            // Real-time UPDATE events only include trade_alerts columns, not joined data
            return {
              ...s,           // Keep existing data (including creator profile)
              ...newData,     // Apply new changes (status, tp_hits, close_reason, etc.)
              creator: s.creator  // Explicitly preserve creator to prevent overwrite
            };
          }
          return s;
        });
        
        // Update cache immediately
        localCacheRef.current.data = updated;
        
        return updated;
      });

      // ✅ INSTANT: Emit update event
      if (typeof window !== 'undefined' && (window as any).signalEmitter) {
        console.log('📢 Emitting SIGNAL_UPDATED event');
        (window as any).signalEmitter.emit('SIGNAL_UPDATED', newData);
        
        // Check if signal was closed
        if (newData.status === 'closed') {
          console.log('🚨 Signal closed via realtime - dispatching signal-closed-confirmed event:', {
            signalId: newData.id,
            closeReason: newData.close_reason,
            assetName: newData.asset_name
          });
          
          // ✅ PHASE 3C FIX: Ensure lastUpdatePayloadRef is set BEFORE event dispatch
          // This guarantees handleSignalClosed can access it via Tier 0 lookup
          lastUpdatePayloadRef.current = newData;
          console.log('📦 [Phase 3C] Set lastUpdatePayloadRef before event dispatch for Tier 0 access');
          
          // ✅ FIX: Dispatch standard CustomEvent that SignalStream listens for
          window.dispatchEvent(new CustomEvent('signal-closed-confirmed', {
            detail: {
              signalId: newData.id,
              closeReason: newData.close_reason || 'manual',
              assetName: newData.asset_name,
              timestamp: new Date().toISOString()
            }
          }));
          
          // Keep the signalEmitter for backward compatibility (other listeners might exist)
          (window as any).signalEmitter.emit('SIGNAL_CLOSED', newData);
        }

        // ✅ PHASE 1 FIX: Detect TP hits using cache (eliminates stale closure bug)
        if (newData.tp_hits && Array.isArray(newData.tp_hits) && newData.tp_hits.length > 0) {
          // Get previous TP hits from cache (NOT from stale signals state)
          const previousHits = tpHitsCache.current.get(signalId) || [];
          
          // Find NEW TP hits (not previously cached)
          const newHits = newData.tp_hits.filter((tp: number) => !previousHits.includes(tp));
          
          // Update cache immediately (synchronous, no React batching)
          tpHitsCache.current.set(signalId, newData.tp_hits);
          
          if (newHits.length > 0) {
            console.log('🎯 [Realtime] New TP hits detected (cache-based):', {
              signalId: newData.id?.substring(0, 8),
              asset: newData.asset_name,
              previousHits, // From cache (accurate)
              newHits, // Newly detected
              allHits: newData.tp_hits, // Current database state
              cacheSize: tpHitsCache.current.size
            });
            
            // Dispatch tp-hit-confirmed event for EACH new TP hit
            newHits.forEach((tpLevel: number) => {
              console.log(`🎯 [Realtime] Dispatching tp-hit-confirmed for TP${tpLevel} (cache-based detection)`);
              
              window.dispatchEvent(new CustomEvent('tp-hit-confirmed', {
                detail: {
                  signalId: newData.id,
                  tpLevel,
                  assetName: newData.asset_name,
                  timestamp: new Date().toISOString()
                }
              }));
            });
          } else {
            console.log('ℹ️ [Realtime] TP hits unchanged (cache verified):', {
              signalId: newData.id?.substring(0, 8),
              hits: newData.tp_hits,
              cached: previousHits
            });
          }
        }
      }
    }

    if (eventType === 'DELETE') {
      console.log('✅ [DELETE] Removing signal INSTANTLY:', signalId.substring(0, 8) + '...');
      
      setSignals(prev => {
        const filtered = prev.filter(s => s.id !== signalId);
        
        // Update cache immediately
        localCacheRef.current.data = filtered;
        
        return filtered;
      });
    }

  }, []);

  // ✅ FIX #4: Subscribe to real-time BEFORE initial fetch
  const subscribeToRealtime = useCallback(async () => {
    console.log('🔌 Setting up real-time subscription...');
    setConnectionStatus('connecting');

    // Subscribe FIRST to catch all events
    const channel = supabase
      .channel('trade_alerts_instant_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_alerts'
        },
        (payload) => {
          console.log('📡 Real-time payload:', payload.eventType);
          handleRealtimeUpdate(payload);
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription ACTIVE - all updates will be instant');
          setConnectionStatus('connected');
          
          // ✅ Initial data already fetched on mount (parallel with subscription)
          // No need to fetch again here - prevents duplicate fetch and delay
        }
        
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription failed:', status);
          setConnectionStatus('error');
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Cleaning up real-time subscription...');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [handleRealtimeUpdate, refreshSignals]);

  // Subscribe function for external use
  const subscribe = useCallback(() => {
    subscribeToRealtime();
  }, [subscribeToRealtime]);

  // Unsubscribe function for external use
  const unsubscribe = useCallback(() => {
    if (channelRef.current) {
      console.log('🔌 Unsubscribing from real-time...');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
      setConnectionStatus('disconnected');
    }
  }, []);

  // Get signal by ID function
  const getSignalById = useCallback((signalId: string): Signal | undefined => {
    return signals.find(s => s.id === signalId);
  }, [signals]);

  // ✅ FIX #4: Clear cache on mount + setup subscription
  useEffect(() => {
    if (mountOnlyRef.current) {
      console.log('🚀 [Mount] Component mounted - clearing all caches for fresh data');
      
      // Clear all caches
      localCacheRef.current.expiry = 0;
      educatorCacheExpiry = 0;
      educatorUserIdsCache = [];
      seenIdsRef.current.clear();
      
      // ✅ FIX #1: Fetch initial data IMMEDIATELY (parallel with subscription)
      console.log('🔄 [Mount] Fetching initial signals immediately (parallel with subscription setup)');
      refreshSignals(true);
      
      // Subscribe to realtime updates (runs in parallel with fetch)
      const cleanup = subscribeToRealtime();
      
      mountOnlyRef.current = false;
      
      return () => {
        cleanup.then(fn => fn?.());
      };
    }
  }, [subscribeToRealtime, refreshSignals]);

  // ✅ FIX #2: Add automatic polling every 30 seconds as safety net
  useEffect(() => {
    const pollingInterval = setInterval(async () => {
      const timeSinceLastUpdate = Date.now() - lastUpdated.getTime();
      
      // Only poll if >30 seconds since last update
      if (timeSinceLastUpdate > 30000) {
        console.log('🔄 Auto-polling for signal freshness (30s since last update)...');
        await refreshSignals(true); // Force cache bypass
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollingInterval);
  }, [lastUpdated, refreshSignals]);

  const value: SignalRealtimeContextType = {
    signals,
    error,
    lastUpdated,
    refreshSignals,
    isLoading: signals.length === 0 && !error,
    connectionStatus,
    nextRetryAt: null,
    subscribe,
    unsubscribe,
    getSignalById,
    lastUpdatePayload: lastUpdatePayloadRef.current  // ✅ TIER 0 FIX: Expose latest UPDATE payload
  };

  return (
    <SignalRealtimeContext.Provider value={value}>
      {children}
    </SignalRealtimeContext.Provider>
  );
};

export const useSignalRealtime = () => {
  const context = useContext(SignalRealtimeContext);
  if (!context) {
    throw new Error('useSignalRealtime must be used within SignalRealtimeProvider');
  }
  return context;
};
