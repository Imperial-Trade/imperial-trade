// PHASE 5: NUCLEAR OPTION - ALL Supabase Realtime ELIMINATED, 30-second polling for signals
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { unstable_batchedUpdates } from 'react-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { TradeAlertWithProfile } from '@/api/services/TradingApiService';
import { useSharedRealtime } from './SharedRealtimeContext';
import { useRealtimeHealth } from './RealtimeHealthMonitor';
import { useRealtimeGate } from '@/hooks/useRouteGatedSubscriptions';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { isDevToolsEnabled } from '@/utils/featureFlags';
import { useRealtimeTelemetry } from '@/hooks/useRealtimeTelemetry';
import { realtimeLogger, generateChannelId } from '@/utils/realtimeLogger';
import { signalCacheManager } from '@/utils/signalCacheManager';
import { emergencyRealtimeBreaker } from '@/services/EmergencyRealtimeBreaker';

// PHASE 3: Massive Realtime Usage Reduction - 90% cost savings
// Enhanced caching and shared connection strategy
let educatorUserIdsCache: string[] = [];
let educatorCacheExpiry = 0;
const EDUCATOR_CACHE_TTL = 15 * 60 * 1000; // Extended to 15 minutes
const LOCAL_CACHE_TTL = 30 * 1000; // ✅ FIX: Reduced to 30 seconds for fresh data on refresh
const SIGNAL_REFRESH_THROTTLE = 5000; // ✅ FIX #4: Reduced to 5 seconds for instant UI updates

// PHASE 1: Profile cache with 5-minute TTL for instant signal rendering
const profileCache = new Map<string, { profile: any; expiry: number }>();
const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to get cached or fetch profile
async function getCachedProfile(userId: string): Promise<any | null> {
  const now = Date.now();
  const cached = profileCache.get(userId);
  
  // Return cached if valid
  if (cached && cached.expiry > now) {
    return cached.profile;
  }
  
  // Fetch from Supabase
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  // Store in cache
  if (profile) {
    profileCache.set(userId, {
      profile,
      expiry: now + PROFILE_CACHE_TTL
    });
  }
  
  return profile;
}

// PHASE 6: PRODUCTION-READY RELIABILITY - Connection Management & Fallbacks
const CONNECTION_CONFIG = {
  maxConsecutiveFailures: 5,
  breakerOpenDuration: 30000, // 30 seconds
  maxReconnectAttempts: 10,
  baseRetryDelay: 2000, // Start with 2 seconds
  maxRetryDelay: 30000, // Cap at 30 seconds
  retryMultiplier: 1.8, // Gentle exponential backoff
  jitterRange: 0.3, // ±30% jitter
  heartbeatInterval: 30000, // 30 second heartbeat
  pollingFallbackInterval: 10000, // 10 second polling when real-time fails
  healthCheckInterval: 60000, // 1 minute health check
};

// PHASE 6: Connection state interface for production reliability
interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'circuit-breaker' | 'polling-fallback';
  attempt: number;
  nextRetryAt: number | null;
  errorCount: number;
  lastSuccessAt: number | null;
  consecutiveFailures: number;
  isPollingMode: boolean;
  lastHeartbeatAt: number | null;
}

async function getEducatorUserIds(): Promise<string[]> {
  const now = Date.now();
  
  // Return cached IDs if still valid
  if (educatorUserIdsCache.length > 0 && now < educatorCacheExpiry) {
    return educatorUserIdsCache;
  }

  try {
    const { data: educators, error } = await supabase
      .from('profiles')
      .select('id')
      .or('access_level.eq.admin,access_level.eq.moderator,user_type.eq.educator');

    if (error) throw error;

    educatorUserIdsCache = educators?.map(e => e.id) || [];
    educatorCacheExpiry = now + EDUCATOR_CACHE_TTL;
    
    console.log(`📊 Cached ${educatorUserIdsCache.length} educator user IDs`);
    return educatorUserIdsCache;
  } catch (error) {
    console.error('❌ Failed to fetch educator user IDs:', error);
    return educatorUserIdsCache; // Return stale cache if available
  }
}

interface SignalRealtimeContextType {
  signals: TradeAlertWithProfile[];
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback';
  lastUpdated: Date | null;
  error: string | null;
  nextRetryAt: number | null;
  subscribe: () => void;
  unsubscribe: () => void;
  refreshSignals: () => Promise<void>;
  // PHASE 6: Enhanced reliability methods
  restartConnection: () => void;
  getConnectionHealth: () => { isHealthy: boolean; lastUpdate: Date | null; mode: string };
  forcePollingMode: () => void;
  isInPollingMode: boolean;
  // PHASE 7: Signal retrieval for instant UI updates
  getSignalById: (signalId: string) => TradeAlertWithProfile | undefined;
  // PHASE 1 CLEANUP: Shared profile cache
  getCachedProfile: (userId: string) => Promise<any | null>;
}

const SignalRealtimeContext = createContext<SignalRealtimeContextType | null>(null);

interface SignalRealtimeProviderProps {
  children: React.ReactNode;
}

export const SignalRealtimeProvider: React.FC<SignalRealtimeProviderProps> = ({ children }) => {
  // 🔥 LEAK-PROOF: Deterministic channel ID for definitive logging
  const channelIdRef = useRef(generateChannelId('signal'));
  
  const [signals, setSignals] = useState<TradeAlertWithProfile[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nextRetryAt, setNextRetryAt] = useState<number | null>(null);
  const mountOnlyRef = useRef(false); // 🔥 LEAK-PROOF: Prevent operations after unmount
  
  // PHASE 2: Memory leak prevention - cleanup tracker
  const cleanupTrackerRef = useRef({ 
    hasUnmounted: false,
    activeTimers: new Set<NodeJS.Timeout>()
  });
  
  // 🚨 PHASE 2B FIX (Bug #6): Strong deduplication - track ALL signal IDs we've ever seen
  const seenSignalIdsRef = useRef(new Set<string>());
  
  // ✅ BUG FIX #15: Profile fetch batch queue and timer refs
  const profileFetchQueueRef = useRef<Array<{
    signalId: string;
    userId: string;
    assetName: string;
    timestamp: number;
  }>>([]);
  const profileBatchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // PHASE 1 CLEANUP: Automatic cache cleanup every 5 minutes
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      let removedCount = 0;
      
      profileCache.forEach((value, key) => {
        if (value.expiry <= now) {
          profileCache.delete(key);
          removedCount++;
        }
      });
      
      if (removedCount > 0 && isDevToolsEnabled()) {
        console.log(`🧹 Profile cache cleanup: Removed ${removedCount} expired entries`);
      }
      
      // 🚨 PHASE 2D FIX (Bug #7): Enforce max cache size (prevent unbounded growth)
      const MAX_CACHE_SIZE = 1000;
      if (profileCache.size > MAX_CACHE_SIZE) {
        const sortedEntries = Array.from(profileCache.entries())
          .sort((a, b) => a[1].expiry - b[1].expiry);
        
        const toRemove = sortedEntries.slice(0, profileCache.size - MAX_CACHE_SIZE);
        toRemove.forEach(([key]) => profileCache.delete(key));
        
        if (isDevToolsEnabled()) {
          console.log(`🧹 [Cache Limit] Removed ${toRemove.length} oldest entries - Cache size: ${profileCache.size}`);
        }
      }
    }, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(cleanupInterval);
  }, []);

  // PHASE 6: Enhanced connection state management for production reliability
  const connectionStateRef = useRef<ConnectionState>({
    status: 'disconnected',
    attempt: 0,
    nextRetryAt: null,
    errorCount: 0,
    lastSuccessAt: null,
    consecutiveFailures: 0,
    isPollingMode: false,
    lastHeartbeatAt: null,
  });
  
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback'>('disconnected');
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // PHASE 3: Use shared Realtime connection to eliminate duplicate channels + HEALTH MONITORING
  const { connectionState, subscribeToTable } = useSharedRealtime();
  const healthMonitor = useRealtimeHealth();
  const { recordMessage, recordConnection } = useRealtimeTelemetry();
  const telemetry = useTelemetry();
  
  // PHASE B: Route gating for signal subscriptions
  const isSignalSubscriptionAllowed = useRealtimeGate('signals');
  
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const lastSubscribeAttemptRef = useRef<number>(0); // PHASE 4: Cooldown tracking
  
  // ============================================
  // FIX #5: NETWORK RESILIENCE (Phase 3)
  // Track last successful update timestamp for gap filling on reconnection
  // ============================================
  const lastUpdateTimestampRef = useRef<string | null>(null);
  
  // PHASE 3: Enhanced local caching to minimize database queries
  const localCacheRef = useRef<{ 
    data: TradeAlertWithProfile[], 
    expiry: number,
    educatorIds: string[],
    educatorExpiry: number 
  }>({ data: [], expiry: 0, educatorIds: [], educatorExpiry: 0 });

  const refreshSignals = useCallback(async () => {
    // PHASE 2: Performance monitoring start
    const perfStart = performance.now();
    
    try {
      // PHASE 3: Throttle refresh requests to reduce database load
      const now = Date.now();
      if (now - lastRefreshRef.current < SIGNAL_REFRESH_THROTTLE) {
        if (isDevToolsEnabled()) {
          console.log('⏱️ Refresh throttled, using cached data');
        }
        return;
      }
      
      lastRefreshRef.current = now;
      
      if (isDevToolsEnabled()) {
        console.log('🔄 PHASE 3: SignalRealtime refresh with maximum cost optimization...');
      }
      
      healthMonitor.recordDatabaseQuery('SignalRealtime', 'refresh');
      
      // PHASE 3: Enhanced cache checking with educator IDs
      const cache = localCacheRef.current;
      if (cache.data.length > 0 && now < cache.expiry && cache.educatorIds.length > 0) {
        if (isDevToolsEnabled()) {
          console.log('📊 Using comprehensive cached signals, skipping all database queries');
        }
unstable_batchedUpdates(() => {
  setSignals(cache.data);
  setLastUpdated(new Date());
  setError(null);
});
return;
      }
      
      // PHASE 3: Use cached educator IDs or fetch fresh ones
      let educatorUserIds = cache.educatorIds;
      if (educatorUserIds.length === 0 || now >= cache.educatorExpiry) {
        educatorUserIds = await getEducatorUserIds();
        localCacheRef.current.educatorIds = educatorUserIds;
        localCacheRef.current.educatorExpiry = now + EDUCATOR_CACHE_TTL;
      }
      
      // 🔥 FIX CLOSED SIGNALS: Filter out old closed signals to prevent reappearing
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: alertsData, error: alertsError } = await supabase
        .from('trade_alerts')
        .select('*')
        .in('user_id', educatorUserIds)
        .or(`status.neq.closed,and(status.eq.closed,updated_at.gte.${oneHourAgo})`)
        .order('created_at', { ascending: false })
        .limit(50);

      if (alertsError) {
        console.error('SignalRealtimeContext - Error fetching alerts:', alertsError);
        throw alertsError;
      }

      console.log('SignalRealtimeContext - Fetched educator alerts:', alertsData?.length || 0);

if (!alertsData || alertsData.length === 0) {
  console.log('SignalRealtimeContext - No educator alerts found');
  unstable_batchedUpdates(() => {
    setLastUpdated(new Date());
    setError(null);
  });
  return;
}

      // Get profiles for these alerts
      const userIds = [...new Set(alertsData.map(alert => alert.user_id))];
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (profilesError) {
        console.error('SignalRealtimeContext - Error fetching profiles:', profilesError);
      }

      // Create profile map
      const profilesMap = new Map();
      if (profilesData) {
        profilesData.forEach(profile => {
          profilesMap.set(profile.id, profile);
        });
      }

      // Map alerts with their profiles
      const allAlertsWithProfiles: TradeAlertWithProfile[] = alertsData.map(alert => {
        const profile = profilesMap.get(alert.user_id);
        
        return {
          id: alert.id,
          userId: alert.user_id,
          assetName: alert.asset_name,
          tradermadeSymbol: alert.tradermade_symbol,
          tradeType: alert.trade_type,
          entryPrice: Number(alert.entry_price),
          stopLoss: Number(alert.stop_loss),
          status: alert.status,
          tp1: alert.tp1 ? Number(alert.tp1) : undefined,
          tp2: alert.tp2 ? Number(alert.tp2) : undefined,
          tp3: alert.tp3 ? Number(alert.tp3) : undefined,
          tp4: alert.tp4 ? Number(alert.tp4) : undefined,
          tp5: alert.tp5 ? Number(alert.tp5) : undefined,
          tpHits: alert.tp_hits || [],
          notes: alert.notes,
          closeReason: alert.close_reason,
          createdAt: alert.created_at,
          updatedAt: alert.updated_at,
          creator: profile ? {
            id: profile.id,
            display_name: profile.display_name || 'Anonymous User',
            role: profile.role || 'user',
            avatar_url: profile.avatar_url,
            user_type: profile.user_type,
            access_level: profile.access_level
          } : {
            id: alert.user_id,
            display_name: 'Unknown User',
            role: 'user',
            avatar_url: null,
            user_type: null,
            access_level: null
          }
        };
      });

      // 🔥 RESTORED: Let database 1-hour window handle closed signals filtering
      // SignalCacheManager now only prevents flicker during WebSocket updates
      const filteredAlerts = allAlertsWithProfiles;
      
      // PHASE 3: Update comprehensive local cache with filtered results
      localCacheRef.current = {
        data: filteredAlerts,
        expiry: now + LOCAL_CACHE_TTL,
        educatorIds: educatorUserIds,
        educatorExpiry: localCacheRef.current.educatorExpiry || now + EDUCATOR_CACHE_TTL
      };
      
console.log('🔍 DEBUG [SignalRealtimeContext] Setting signals in state:', {
  totalSignals: filteredAlerts.length,
  signalIds: filteredAlerts.map(s => s.id).slice(0, 5),
  firstSignalSample: filteredAlerts[0] ? {
    id: filteredAlerts[0].id,
    status: filteredAlerts[0].status,
    tradermadeSymbol: filteredAlerts[0].tradermadeSymbol
  } : null
});

// ============================================
// FIX #4: RACE CONDITION GUARD (Phase 3)
// Filter out older updates to prevent stale data overwrites
// ============================================

// ============================================
// FIX #5: Add Supabase Real-Time subscription for INSERT + UPDATE
// ============================================
useEffect(() => {
  console.log('🔌 Setting up Supabase real-time subscription...');

  const subscription = supabase
    .channel('trade_alerts_realtime')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'trade_alerts'
    }, async (payload) => {
      console.log('🆕 Real-time INSERT detected:', payload);
      
      const newRecord = payload.new as any;
      
      // BUG #8 FIX: Fetch creator profile data for the new signal
      try {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, role, user_type, access_level')
          .eq('id', newRecord.user_id)
          .single();
        
        // Merge profile data with signal
        const signalWithProfile: TradeAlertWithProfile = {
          ...newRecord,
          profiles: profileData || null
        };
        
        // Add new signal to the top of the list
        setSignals(prev => {
          // Check if signal already exists (prevent duplicates)
          if (prev.some(s => s.id === signalWithProfile.id)) {
            console.log('⚠️ Signal already exists, skipping INSERT');
            return prev;
          }
          
          console.log('✅ Adding new signal with profile to list:', newRecord.asset_name);
          return [signalWithProfile, ...prev];
        });
        
        // Dispatch event for new signal
        window.dispatchEvent(new CustomEvent('signal-created-confirmed', {
          detail: {
            signalId: signalWithProfile.id,
            assetName: newRecord.asset_name,
            status: signalWithProfile.status
          }
        }));
      } catch (error) {
        console.error('❌ Failed to fetch profile for new signal:', error);
        
        // Fallback: Add signal without profile
        setSignals(prev => {
          if (prev.some(s => s.id === newRecord.id)) {
            return prev;
          }
          return [newRecord, ...prev];
        });
      }
    })
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'trade_alerts'
    }, (payload) => {
      console.log('🔄 Real-time UPDATE detected:', payload);
      
      const newRecord = payload.new as any;
      const oldRecord = payload.old as any;
      
      // Update existing signal in place
      setSignals(prev => prev.map(signal => 
        signal.id === newRecord.id 
          ? { ...signal, ...newRecord, updatedAt: newRecord.updated_at }
          : signal
      ));
      
      // Detect status changes and dispatch events
      if (oldRecord.status !== newRecord.status) {
        if (newRecord.status === 'closed') {
          window.dispatchEvent(new CustomEvent('signal-closed-confirmed', {
            detail: {
              signalId: newRecord.id,
              closeReason: newRecord.close_reason,
              assetName: newRecord.asset_name
            }
          }));
        } else if (oldRecord.status === 'pending' && newRecord.status === 'active') {
          window.dispatchEvent(new CustomEvent('order-activation-confirmed', {
            detail: {
              signalId: newRecord.id,
              assetName: newRecord.asset_name
            }
          }));
        }
      }
      
      // Detect TP hits
      const oldTPs = oldRecord.tp_hits || [];
      const newTPs = newRecord.tp_hits || [];
      if (JSON.stringify(oldTPs) !== JSON.stringify(newTPs)) {
        const hitTPs = newTPs.filter((tp: number) => !oldTPs.includes(tp));
        hitTPs.forEach((tp: number) => {
          window.dispatchEvent(new CustomEvent('tp-hit-confirmed', {
            detail: {
              signalId: newRecord.id,
              tpLevel: tp,
              assetName: newRecord.asset_name
            }
          }));
        });
      }
    })
    .subscribe((status) => {
      console.log('🔌 Subscription status:', status);
    });

  return () => {
    console.log('🔌 Cleaning up Supabase subscription...');
    subscription.unsubscribe();
  };
}, []); // ✅ FIX: Empty dependency array - subscribe once on mount

// ============================================
// FIX #6: Cache Invalidation Listener
// ============================================
useEffect(() => {
  const handleCacheInvalidation = () => {
    console.log('🗑️ Cache invalidation triggered - clearing local cache');
    localCacheRef.current = { data: [], expiry: 0, educatorIds: [], educatorExpiry: 0 };
    
    // Force immediate refresh
    refreshSignals();
  };
  
  window.addEventListener('invalidate-signal-cache', handleCacheInvalidation);
  
  return () => {
    window.removeEventListener('invalidate-signal-cache', handleCacheInvalidation);
  };
}, [refreshSignals]);
const filteredWithTimestamps = filteredAlerts.filter(newSignal => {
  const existingSignal = signals.find(s => s.id === newSignal.id);
  if (!existingSignal) return true; // New signal, keep it
  
  // Compare timestamps - only keep if newer or equal
  return new Date(newSignal.updatedAt) >= new Date(existingSignal.updatedAt);
});

console.log('🛡️ Race Condition Guard:', {
  totalIncoming: filteredAlerts.length,
  afterTimestampFilter: filteredWithTimestamps.length,
  blocked: filteredAlerts.length - filteredWithTimestamps.length
});

unstable_batchedUpdates(() => {
  setSignals(filteredWithTimestamps);
  setLastUpdated(new Date());
  setError(null);
});
      
// Update timestamp for network resilience tracking
lastUpdateTimestampRef.current = new Date().toISOString();

      // PHASE 2: Performance monitoring end
      const { perfMonitor } = await import('@/utils/performanceMonitor');
      perfMonitor.mark('signal-refresh', perfStart);
      
    } catch (err) {
      console.error('SignalRealtimeContext - Failed to refresh signals:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh signals');
      
      // PHASE 2: Track error performance
      const { perfMonitor } = await import('@/utils/performanceMonitor');
      perfMonitor.mark('signal-refresh-error', perfStart);
    }
  }, []);

  // PHASE 6: Connection state management utilities
  const updateConnectionState = useCallback((updates: Partial<ConnectionState>) => {
    connectionStateRef.current = { ...connectionStateRef.current, ...updates };
    const newStatus = connectionStateRef.current.status === 'circuit-breaker' ? 'error' : connectionStateRef.current.status;
    setConnectionStatus(newStatus);
  }, []);

  const isCircuitBreakerOpen = useCallback(() => {
    const state = connectionStateRef.current;
    return state.status === 'circuit-breaker' || 
           (state.consecutiveFailures >= CONNECTION_CONFIG.maxConsecutiveFailures &&
            Date.now() < (state.nextRetryAt || 0));
  }, []);

  const calculateRetryDelay = useCallback((attempt: number): number => {
    const baseDelay = Math.min(
      CONNECTION_CONFIG.baseRetryDelay * Math.pow(CONNECTION_CONFIG.retryMultiplier, attempt),
      CONNECTION_CONFIG.maxRetryDelay
    );
    
    const jitter = baseDelay * CONNECTION_CONFIG.jitterRange * (Math.random() - 0.5);
    return Math.max(baseDelay + jitter, 1000); // Minimum 1 second
  }, []);

  // PHASE 6: Enhanced reliability methods
  const restartConnection = useCallback(() => {
    console.log('🔄 SignalRealtime: Manual connection restart requested');
    unsubscribe();
    // Reset connection state
    connectionStateRef.current = {
      status: 'disconnected',
      attempt: 0,
      nextRetryAt: null,
      errorCount: 0,
      lastSuccessAt: null,
      consecutiveFailures: 0,
      isPollingMode: false,
      lastHeartbeatAt: null,
    };
    setError(null);
    setTimeout(() => subscribe(), 1000);
  }, []);

  const getConnectionHealth = useCallback(() => {
    const state = connectionStateRef.current;
    const now = Date.now();
    const isHealthy = state.status === 'connected' && 
                     state.lastSuccessAt && 
                     (now - state.lastSuccessAt) < CONNECTION_CONFIG.healthCheckInterval;
    
    return {
      isHealthy,
      lastUpdate: lastUpdated,
      mode: state.isPollingMode ? 'polling' : 'realtime'
    };
  }, [lastUpdated]);

  const forcePollingMode = useCallback(() => {
    // 🔒 ROUTE GATING: Only enable polling on signal-related routes
    const currentPath = window.location.pathname;
    const signalRoutes = ['/dashboard/signal-stream', '/dashboard/signals', '/admin'];
    const isSignalRoute = signalRoutes.some(route => currentPath.startsWith(route));
    
    if (!isSignalRoute) {
      console.log('🚫 SignalRealtime: Route gating blocked polling mode on', currentPath);
      return;
    }
    
    console.log('🔄 SignalRealtime: Forcing polling mode on', currentPath);
    connectionStateRef.current.isPollingMode = true;
    setConnectionStatus('polling-fallback');
    
    // Start polling interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(() => {
      if (mountOnlyRef.current && !isCircuitBreakerOpen()) {
        refreshSignals();
      }
    }, CONNECTION_CONFIG.pollingFallbackInterval);
  }, [refreshSignals, isCircuitBreakerOpen]);

  const isInPollingMode = connectionStateRef.current.isPollingMode;

  // PHASE 7: Get signal by ID for instant UI updates
  const getSignalById = useCallback((signalId: string) => {
    return signals.find(signal => signal.id === signalId);
  }, [signals]);

  // ✅ BUG FIX #15: Batch profile fetch processor (defined outside handleRealtimeUpdate)
  const processBatchedProfileFetches = useCallback(async () => {
    const queue = profileFetchQueueRef.current || [];
    if (queue.length === 0) return;
    
    console.log(`🚀 [BUG #15] Processing ${queue.length} queued signals in batch`);
    
    // Clear queue immediately to prevent duplicates
    profileFetchQueueRef.current = [];
    
    // Get unique user IDs
    const userIds = [...new Set(queue.map(item => item.userId))];
    
    try {
      // Single profile fetch for all users
      const profiles = await Promise.all(
        userIds.map(userId => 
          Promise.race([
            getCachedProfile(userId),
            new Promise<null>((_, reject) => 
              setTimeout(() => reject(new Error('Profile fetch timeout after 5s')), 5000)
            )
          ]).catch(() => null)
        )
      );
      
      // Create profile map
      const profileMap = new Map();
      profiles.forEach((profile, index) => {
        if (profile) {
          profileMap.set(userIds[index], profile);
        }
      });
      
      console.log(`✅ [BUG #15] Fetched ${profileMap.size} profiles for ${queue.length} signals`);
      
      // ✅ SINGLE setState call for all profile updates
      setSignals(prev => {
        let updated = [...prev];
        let changesMade = false;
        
        queue.forEach(item => {
          const profile = profileMap.get(item.userId);
          if (profile) {
            const index = updated.findIndex(s => s.id === item.signalId);
            if (index !== -1 && updated[index].creator?.display_name === '⏳ Loading...') {
              updated[index] = {
                ...updated[index],
                creator: {
                  id: profile.id,
                  display_name: profile.display_name || 'Anonymous User',
                  role: profile.role || 'user',
                  avatar_url: profile.avatar_url,
                  user_type: profile.user_type,
                  access_level: profile.access_level
                }
              };
              changesMade = true;
            }
          }
        });
        
        console.log(`✅ [BUG #15] Batch update complete: ${changesMade ? 'profiles updated' : 'no changes needed'}`);
        return changesMade ? updated : prev;
      });
      
      // Batch update cache
      const cache = localCacheRef.current;
      queue.forEach(item => {
        const profile = profileMap.get(item.userId);
        if (profile) {
          const index = cache.data.findIndex(s => s.id === item.signalId);
          if (index !== -1) {
            cache.data[index] = {
              ...cache.data[index],
              creator: {
                id: profile.id,
                display_name: profile.display_name || 'Anonymous User',
                role: profile.role || 'user',
                avatar_url: profile.avatar_url,
                user_type: profile.user_type,
                access_level: profile.access_level
              }
            };
          }
        }
      });
      
      // ✅ BUG FIX #15: Single batch notification for all new signals
      queue.forEach(item => {
        const profile = profileMap.get(item.userId);
        if (profile) {
          const notificationData = {
            type: 'signal_created',
            title: `🚨 New Signal`,
            message: `${profile.display_name || 'Educator'} posted ${item.assetName}`,
            signalId: item.signalId,
            assetName: item.assetName,
            authorName: profile.display_name || 'Educator',
            priority: 'high',
            autoRemove: true,
          };
          
          if ((window as any).addNotification) {
            (window as any).addNotification(notificationData);
          }
          
          toast({
            title: '🎯 New Signal Created',
            description: `${profile.display_name || 'Educator'} posted ${item.assetName}`,
          });
          
          // Dispatch custom event for UI listeners
          window.dispatchEvent(new CustomEvent('signal-created-confirmed', {
            detail: {
              signalId: item.signalId,
              assetName: item.assetName,
              id: item.signalId
            }
          }));
        }
      });
      
    } catch (error) {
      console.error('❌ [BUG #15] Batch profile fetch failed:', error);
    }
  }, []);

  // 🚀 BATCHED UPDATE HANDLER: Prevent React rendering storms
  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    const signalId = payload?.new?.id || payload?.old?.id;
    
    if (isDevToolsEnabled()) {
      console.log('🔄 SignalRealtime event:', {
        type: payload.eventType,
        signalId,
        timestamp: new Date().toISOString()
      });
    }
    
    if (isDevToolsEnabled()) {
      console.log('SignalRealtimeContext - Processing real-time update:', payload.eventType, signalId);
    }
    
    healthMonitor.recordRealtimeMessage('SignalRealtime', payload.eventType || 'unknown');
    telemetry.record('signal_change_v3'); // PHASE C: Per-channel telemetry with versioning
    
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      if (eventType === 'INSERT' && newRecord) {
        // 🚨 PHASE 2B FIX (Bug #6): Strong deduplication - check if we've seen this ID from ANY source
        if (seenSignalIdsRef.current.has(newRecord.id)) {
          console.log(`⚠️  [DUPLICATE BLOCKED] Signal ${newRecord.id} already exists`);
          return; // ✅ Block duplicate immediately
        }
        
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Processing INSERT for alert:', newRecord.id);
        }
        
        // ✅ BUG FIX #15: Queue signal for batched profile fetch
        console.log(`📋 [BUG #15] Queueing signal ${newRecord.id} for batched profile fetch`);
        
        // PHASE 1: OPTIMISTIC RENDER - Create signal with placeholder profile IMMEDIATELY
        const optimisticSignal: TradeAlertWithProfile = {
          id: newRecord.id,
          userId: newRecord.user_id,
          assetName: newRecord.asset_name,
          tradermadeSymbol: newRecord.tradermade_symbol,
          tradeType: newRecord.trade_type,
          entryPrice: Number(newRecord.entry_price),
          stopLoss: Number(newRecord.stop_loss),
          status: newRecord.status,
          tp1: newRecord.tp1 ? Number(newRecord.tp1) : undefined,
          tp2: newRecord.tp2 ? Number(newRecord.tp2) : undefined,
          tp3: newRecord.tp3 ? Number(newRecord.tp3) : undefined,
          tp4: newRecord.tp4 ? Number(newRecord.tp4) : undefined,
          tp5: newRecord.tp5 ? Number(newRecord.tp5) : undefined,
          tpHits: newRecord.tp_hits || [],
          notes: newRecord.notes,
          closeReason: newRecord.close_reason,
          createdAt: newRecord.created_at,
          updatedAt: newRecord.updated_at,
          creator: {
            id: newRecord.user_id,
            display_name: '⏳ Loading...',
            role: 'user',
            avatar_url: null,
            user_type: null,
            access_level: null
          }
        };

        // Render signal IMMEDIATELY
        setSignals(prev => {
          const existsInState = prev.find(s => s.id === newRecord.id);
          if (existsInState) {
            console.log(`⚠️ [DUPLICATE BLOCKED] Signal ${newRecord.id} already in state`);
            return prev; // ✅ Return unchanged state
          }
          
          // ✅ BUG FIX #7: Mark as seen BEFORE adding to state (race condition fix)
          seenSignalIdsRef.current.add(newRecord.id);
          console.log(`✅ [INSERT] Adding NEW signal ${newRecord.id} - ${newRecord.asset_name}`);
          
          return [optimisticSignal, ...prev];
        });
        
        // Update local cache with optimistic signal
        const cache = localCacheRef.current;
        if (cache.data.length > 0) {
          cache.data = [optimisticSignal, ...cache.data];
        }
        
        // ✅ BUG FIX #15: Add to profile fetch queue instead of individual fetch
        if (!profileFetchQueueRef.current) {
          profileFetchQueueRef.current = [];
        }
        
        profileFetchQueueRef.current.push({
          signalId: newRecord.id,
          userId: newRecord.user_id,
          assetName: newRecord.asset_name,
          timestamp: Date.now()
        });
        
        // Debounce batch processing (100ms window to collect multiple inserts)
        if (profileBatchTimerRef.current) {
          clearTimeout(profileBatchTimerRef.current);
        }
        
        profileBatchTimerRef.current = setTimeout(() => {
          processBatchedProfileFetches();
        }, 100);
      }
      else if (eventType === 'UPDATE' && newRecord) {
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Processing UPDATE for alert:', newRecord.id);
        }
        
        setSignals(prev => {
          // PHASE 3: CRITICAL SIGNAL ISOLATION - Only update the specific signal being modified
          const targetSignalId = newRecord.id;
          const currentSignal = prev.find(signal => signal.id === targetSignalId);
          
          if (!currentSignal) {
            if (isDevToolsEnabled()) {
              console.log('SignalRealtimeContext - UPDATE: Signal not found in state, ignoring:', targetSignalId);
            }
            return prev; // CRITICAL: Don't affect other signals if target not found
          }
          
          const isOrderActivation = currentSignal.status === 'pending' && newRecord.status === 'active';
          const isCriticalStatusChange = newRecord.status === 'closed' || isOrderActivation;
          const isNotesUpdate = currentSignal.notes !== newRecord.notes;
          
          if (isDevToolsEnabled() && isCriticalStatusChange) {
            console.log(`🚀 ISOLATED STATUS CHANGE: ${currentSignal.status} → ${newRecord.status} for ${newRecord.asset_name} (ID: ${targetSignalId})`);
          }
          
          if (isDevToolsEnabled() && isNotesUpdate) {
            console.log(`📝 ISOLATED NOTES UPDATE: "${currentSignal.notes}" → "${newRecord.notes}" for ${newRecord.asset_name} (ID: ${targetSignalId})`);
          }

          // PHASE 3: CRITICAL - Signal isolation during order activation
          if (isOrderActivation) {
            console.log(`🎯 ISOLATED ACTIVATION: Processing ONLY signal ${targetSignalId} - ${newRecord.asset_name}`);
            
            // Dispatch activation event with signal isolation
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('order-activation-confirmed', {
                detail: {
                  signalId: targetSignalId,
                  assetName: newRecord.asset_name,
                  status: 'active',
                  timestamp: new Date().toISOString(),
                  priority: 'high',
                  isolation: 'enforced'
                }
              }));
              
              // ✅ BUG FIX #4: Enhanced activation notification with logging
              const activationNotification = {
                type: 'order_activated',
                title: `🚀 Order Activated!`,
                message: `${newRecord.asset_name} ${newRecord.trade_type} is now ACTIVE`,
                signalId: targetSignalId,
                priority: 'high',
                autoRemove: true,
                duration: 5000
              };
              
              if ((window as any).addNotification) {
                (window as any).addNotification(activationNotification);
                console.log('✅ [BUG FIX #4] Custom activation notification dispatched:', targetSignalId);
              } else {
                console.warn('⚠️ [BUG FIX #4] Custom notification system not available, using toast fallback');
              }
              
              // ✅ BUG FIX #8: Always show toast as fallback
              toast({
                title: '📈 Order Activated',
                description: `${newRecord.asset_name} order is now active at market price`,
              });
              console.log('✅ [BUG FIX #4] Toast activation notification shown:', targetSignalId);
            }, 0);
          }

          // PHASE 7: CRITICAL - Signal isolation during closure
          const isSignalClosure = currentSignal.status === 'active' && newRecord.status === 'closed';
          if (isSignalClosure) {
            // 🔍 PHASE 4 DIAGNOSTIC: Check if closure is being processed
            console.log(`🔍 [PHASE 4 - Realtime Closure] Detected for ${newRecord.asset_name}:`, {
              signalId: newRecord.id,
              oldStatus: currentSignal.status,
              newStatus: newRecord.status,
              closeReason: newRecord.close_reason,
              tpHits: newRecord.tp_hits,
              allTPs: { 
                tp1: newRecord.tp1, 
                tp2: newRecord.tp2, 
                tp3: newRecord.tp3, 
                tp4: newRecord.tp4, 
                tp5: newRecord.tp5 
              }
            });
            
            console.log(`🔴 ISOLATED CLOSURE: Processing ONLY signal ${targetSignalId} - ${newRecord.asset_name}`);
            
            // Dispatch closure event with signal isolation
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('signal-closed-confirmed', {
                detail: {
                  signalId: targetSignalId,
                  assetName: newRecord.asset_name,
                  status: 'closed',
                  closeReason: newRecord.close_reason,
                  timestamp: new Date().toISOString(),
                  priority: 'high',
                  isolation: 'enforced'
                }
              }));
              
              // ✅ HYBRID MODE: Instant toast notification for closure
              if ((window as any).addNotification) {
                (window as any).addNotification({
                  type: 'signal_closed',
                  title: `🔴 Signal Closed`,
                  message: `${newRecord.asset_name} closed - ${newRecord.close_reason || 'manual'}`,
                  signalId: targetSignalId,
                  priority: 'high',
                  autoRemove: true,
                  duration: 5000
                });
              }
            }, 0);
          }
          
          const updatedSignals = prev.map(signal =>
            signal.id === newRecord.id ? {
              ...signal,
              assetName: newRecord.asset_name,
              tradermadeSymbol: newRecord.tradermade_symbol,
              tradeType: newRecord.trade_type,
              entryPrice: Number(newRecord.entry_price),
              stopLoss: Number(newRecord.stop_loss),
              status: newRecord.status,
              tp1: newRecord.tp1 ? Number(newRecord.tp1) : undefined,
              tp2: newRecord.tp2 ? Number(newRecord.tp2) : undefined,
              tp3: newRecord.tp3 ? Number(newRecord.tp3) : undefined,
              tp4: newRecord.tp4 ? Number(newRecord.tp4) : undefined,
              tp5: newRecord.tp5 ? Number(newRecord.tp5) : undefined,
              tpHits: newRecord.tp_hits || [],
              notes: newRecord.notes,
              closeReason: newRecord.close_reason,
              updatedAt: newRecord.updated_at
            } : signal
          );
          
          // ✅ HYBRID MODE: Check for new TP hits and log instant notifications
          const oldTpHits = currentSignal.tpHits || [];
          const newTpHits = newRecord.tp_hits || [];
          const newHitsDetected = newTpHits.filter(tp => !oldTpHits.includes(tp));
          
          if (newHitsDetected.length > 0) {
            newHitsDetected.forEach(tp => {
              // ✅ HYBRID MODE: Instant toast notification for TP hits
              if ((window as any).addNotification) {
                (window as any).addNotification({
                  type: 'tp_hit',
                  title: `🎯 TP${tp} Hit!`,
                  message: `${newRecord.asset_name} reached Take Profit ${tp}`,
                  signalId: targetSignalId,
                  priority: 'high',
                  autoRemove: true,
                  duration: 6000
                });
              }
            });
          }
          
          // PHASE 3: CRITICAL SIGNAL ISOLATION - Validate TP progression ONLY for target signal
          const validatedSignals = updatedSignals.map(signal => {
            // STRICT ISOLATION: Only validate TP hits for the exact signal being updated
            if (signal.id === targetSignalId && newRecord.tp_hits) {
              // Ensure TP hits are sequential and valid for THIS signal only
              const validTpHits = [];
              const sortedTpHits = [...newRecord.tp_hits].sort((a, b) => a - b);
              
              // Only allow sequential TP hits (1, then 2, then 3, etc.) for THIS signal
              for (let i = 0; i < sortedTpHits.length; i++) {
                const expectedTp = i + 1;
                if (sortedTpHits[i] === expectedTp) {
                  validTpHits.push(expectedTp);
                } else {
                  // Invalid TP sequence detected for THIS signal only
                  console.warn(`🚨 INVALID TP SEQUENCE for signal ${targetSignalId}: Expected TP${expectedTp}, got TP${sortedTpHits[i]}`);
                  break;
                }
              }
              
              return {
                ...signal,
                tpHits: validTpHits // Use validated TP hits for THIS signal only
              };
            }
            // CRITICAL: All other signals remain completely untouched
            return signal;
          });
          
          // PHASE 3: ISOLATED FEEDBACK - Only dispatch event for the specific signal
          if (isOrderActivation) {
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('order-activated', {
                detail: {
                  signalId: targetSignalId, // CRITICAL: Signal isolation
                  assetName: newRecord.asset_name,
                  status: newRecord.status,
                  timestamp: new Date().toISOString(),
                  priority: 'high',
                  isolation: 'enforced'
                }
              }));
            }, 0);
          }

          // PHASE 4: NOTES UPDATE NOTIFICATIONS - Only for THIS signal
          if (isNotesUpdate && !isCriticalStatusChange) {
            if ((window as any).addNotification) {
              (window as any).addNotification({
                type: 'notes_updated',
                title: `📝 Signal Notes Updated`,
                message: `${newRecord.asset_name} notes have been updated`,
                signalId: targetSignalId, // CRITICAL: Signal isolation
                priority: 'medium',
                autoRemove: true,
                duration: 4000
              });
            }
          }
          
          // 🔥 FLICKER PREVENTION: Apply cache filtering only during WebSocket updates
          return signalCacheManager.filterExpiredClosedSignals(updatedSignals);
        });
        
        // 🔥 FIX CLOSED SIGNALS: Mark signal as closed in cache manager
        if (eventType === 'UPDATE' && newRecord?.status === 'closed') {
          signalCacheManager.markSignalClosed(newRecord.id, newRecord.updated_at);
        }
        
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Updated signal in state:', newRecord.id);
        }
      }
      else if (eventType === 'DELETE' && oldRecord) {
        if (isDevToolsEnabled()) {
          console.log('SignalRealtimeContext - Processing DELETE for alert:', oldRecord.id);
        }
        
        // 🚨 PHASE 2B FIX (Bug #2): INSTANT UI UPDATE - Remove immediately
        setSignals(prev => {
          const filtered = prev.filter(signal => signal.id !== oldRecord.id);
          console.log(`✅ [DELETE] Removed signal ${oldRecord.id} - ${filtered.length} signals remaining`);
          return filtered;
        });
        
        // ✅ Update local cache
        const cache = localCacheRef.current;
        if (cache.data.length > 0) {
          cache.data = cache.data.filter(signal => signal.id !== oldRecord.id);
          console.log(`✅ [DELETE] Cache updated - ${cache.data.length} cached signals`);
        }
        
        // 🚨 PHASE 2B FIX (Bug #6): Remove from seen IDs when deleted (allows re-creation if needed)
        seenSignalIdsRef.current.delete(oldRecord.id);
        console.log(`✅ [DELETE] Removed ${oldRecord.id} from seen IDs`);
        
        // ✅ Dispatch in-app notification
        if (typeof window !== 'undefined' && (window as any).addNotification) {
          (window as any).addNotification({
            type: 'info',
            title: '🗑️ Signal Removed',
            message: `${oldRecord.asset_name || 'Signal'} has been canceled`
          });
        }
      }

unstable_batchedUpdates(() => {
  setLastUpdated(new Date());
  setError(null);
});
    } catch (err) {
      console.error('SignalRealtimeContext - Failed to handle realtime update:', err);
    }
  }, []);

  // 🔥 LEAK-PROOF: Subscribe with mount guards and definitive logging
  const subscribe = useCallback(async () => {
    // 🔥 LEAK-PROOF: Block subscription after unmount
    if (!mountOnlyRef.current) {
      if (isDevToolsEnabled()) {
        console.log('Signal subscription blocked: component unmounted');
      }
      return;
    }
    
    // PHASE B: Route gating - only subscribe if current route allows signals
    if (!isSignalSubscriptionAllowed) {
      if (isDevToolsEnabled()) {
        console.log('🚦 Signal subscription blocked by route gating');
      }
      // PHASE 4: Record route-gate block (not a connection failure)
      emergencyRealtimeBreaker.recordRouteGateBlock('signals');
      return;
    }

    // PHASE 4: Subscription cooldown - prevent rapid subscribe attempts
    const now = Date.now();
    const timeSinceLastAttempt = now - lastSubscribeAttemptRef.current;
    if (timeSinceLastAttempt < 5000) {
      if (isDevToolsEnabled()) {
        console.log(`⏱️ Signal subscription cooldown active (${Math.round((5000 - timeSinceLastAttempt) / 1000)}s remaining)`);
      }
      return;
    }
    lastSubscribeAttemptRef.current = now;

    // 🔥 LEAK-PROOF: Idempotent subscription check
    if (unsubscribeRef.current) {
      if (isDevToolsEnabled()) {
        console.log('SignalRealtimeContext - Already subscribed via shared connection');
      }
      return;
    }

    // 🔥 DEFINITIVE LOGGING: Log subscription attempt
    realtimeLogger.logSubscribe(channelIdRef.current, 'trade_alerts', 'SignalRealtimeProvider');

    try {
      // PHASE 3: Get educator IDs with enhanced caching
      const cache = localCacheRef.current;
      const now = Date.now();
      
      let educatorUserIds = cache.educatorIds;
      if (educatorUserIds.length === 0 || now >= cache.educatorExpiry) {
        educatorUserIds = await getEducatorUserIds();
        localCacheRef.current.educatorIds = educatorUserIds;
        localCacheRef.current.educatorExpiry = now + EDUCATOR_CACHE_TTL;
      }
      
      // PHASE 4: FIX #6 - Fix Polling Mode Conflict (early exit when polling enabled)
      const pollingEnabled = localStorage.getItem('polling_mode_enabled') === 'true';
      if (pollingEnabled) {
        console.log('⏸️ PHASE 4: Polling mode active - Realtime DISABLED (early exit)');
        setConnectionStatus('polling-fallback');
        
        // 🔄 Start polling mode immediately (no Realtime at all)
        let pollingInterval: NodeJS.Timeout | null = null;
        let previousSignals: any[] = [];
        
        // Poll function to check for signal changes
        const pollSignals = async () => {
        try {
          const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
          
          const { data: currentSignals, error } = await supabase
            .from('trade_alerts')
            .select('*')
            .in('user_id', educatorUserIds)
            .or(`status.neq.closed,and(status.eq.closed,updated_at.gte.${oneHourAgo})`)
            .order('created_at', { ascending: false })
            .limit(50);
          
          if (error) {
            console.error('❌ Polling error:', error);
            return;
          }
          
          if (!currentSignals || currentSignals.length === 0) return;
          
          // Detect changes by comparing with previous poll
          if (previousSignals.length > 0) {
            // Check for new signals (INSERT)
            const newSignals = currentSignals.filter(
              current => !previousSignals.some(prev => prev.id === current.id)
            );
            
            // Check for updated signals (UPDATE)
            const updatedSignals = currentSignals.filter(current => {
              const prev = previousSignals.find(p => p.id === current.id);
              return prev && prev.updated_at !== current.updated_at;
            });
            
            // Trigger handleRealtimeUpdate for detected changes
            for (const signal of newSignals) {
              console.log('📥 Polling detected INSERT:', signal.id);
              await handleRealtimeUpdate({ eventType: 'INSERT', new: signal, old: null });
            }
            
            for (const signal of updatedSignals) {
              const oldSignal = previousSignals.find(p => p.id === signal.id);
              console.log('🔄 Polling detected UPDATE:', signal.id);
              await handleRealtimeUpdate({ eventType: 'UPDATE', new: signal, old: oldSignal });
            }
          }
          
          previousSignals = currentSignals;
        } catch (error) {
          console.error('❌ Polling exception:', error);
        }
        };
        
        // Start polling every 60 seconds (Realtime handles instant updates)
        pollingInterval = setInterval(pollSignals, 60000);
        
        // Initial poll
        pollSignals();
        
        // Cleanup function
        const unsubscribe = () => {
          if (pollingInterval) {
            console.log('🛑 PHASE 4: Stopping signal polling');
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
        };
        
        unsubscribeRef.current = unsubscribe;
        recordConnection();
        
        // Load initial data with caching
        refreshSignals();
        
        console.log('✅ PHASE 4 HYBRID MODE: Polling (60s backup) + Realtime (instant) both enabled');
        // ⚠️ DO NOT RETURN - Allow Realtime to also start for instant updates
      }
      
      // Start Realtime subscriptions for instant updates (works with or without polling)
      console.log('🚀 PHASE 4: Starting Realtime subscriptions for instant updates');
      
      // ✅ FIX BUG #17: Add missing subscribeToTable() call with correct arguments
      const unsubscribeFn = subscribeToTable(
        {
          table: 'trade_alerts',
          event: '*',
          schema: 'public'
        },
        handleRealtimeUpdate
      );
      
      if (unsubscribeFn) {
        // ✅ HYBRID MODE: Combine both Realtime and Polling cleanup
        const existingPollingCleanup = unsubscribeRef.current;
        
        unsubscribeRef.current = () => {
          // Cleanup Realtime subscription
          console.log('🛑 HYBRID MODE: Stopping Realtime subscription');
          unsubscribeFn();
          
          // Cleanup Polling if it exists
          if (existingPollingCleanup && typeof existingPollingCleanup === 'function') {
            console.log('🛑 HYBRID MODE: Stopping polling backup');
            existingPollingCleanup();
          }
        };
        
        // Set connection status to connected
        updateConnectionState({
          status: 'connected',
          consecutiveFailures: 0
        });
        
        // ============================================
        // FIX #5: NETWORK RESILIENCE - Add reconnection handler
        // Fetch missed updates when reconnecting after network issues
        // ============================================
        if (typeof window !== 'undefined') {
          const reconnectionHandler = async () => {
            console.log('🔄 Network Resilience: Detected reconnection, checking for missed updates');
            
            if (lastUpdateTimestampRef.current) {
              try {
                const { data: missedSignals, error } = await supabase
                  .from('trade_alerts')
                  .select('*')
                  .in('user_id', educatorUserIds)
                  .gte('updated_at', lastUpdateTimestampRef.current)
                  .order('updated_at', { ascending: false });
                
                if (error) {
                  console.error('❌ Network Resilience: Failed to fetch missed updates', error);
                } else if (missedSignals && missedSignals.length > 0) {
                  console.log(`✅ Network Resilience: Fetched ${missedSignals.length} missed updates`);
                  
                  // Process each missed update through the realtime handler
                  for (const signal of missedSignals) {
                    await handleRealtimeUpdate({
                      eventType: 'UPDATE',
                      new: signal,
                      old: null
                    });
                  }
                }
              } catch (err) {
                console.error('❌ Network Resilience: Error during reconnection sync', err);
              }
            }
          };
          
          // Listen for reconnection events from Supabase Realtime
          window.addEventListener('supabase:realtime:reconnect', reconnectionHandler);
          
          // Cleanup listener on unmount
          const originalUnsubscribe = unsubscribeRef.current;
          unsubscribeRef.current = () => {
            window.removeEventListener('supabase:realtime:reconnect', reconnectionHandler);
            if (originalUnsubscribe) originalUnsubscribe();
          };
        }
        
        // Populate initial signal data (only if not already populated by polling)
        const pollingEnabled = localStorage.getItem('polling_mode_enabled') === 'true';
        if (!pollingEnabled) {
          await refreshSignals();
        }
        
        // Update timestamp tracking for network resilience
        lastUpdateTimestampRef.current = new Date().toISOString();
        
        console.log('✅ HYBRID MODE ACTIVE: Realtime (instant) + Polling (60s backup)');
      }
      
    } catch (error) {
      console.error('❌ Failed to subscribe to signals:', error);
      setError('Failed to initialize realtime connection');
      updateConnectionState({
        status: 'error',
        consecutiveFailures: connectionStateRef.current.consecutiveFailures + 1
      });
    }
  }, [subscribeToTable, handleRealtimeUpdate, refreshSignals, isSignalSubscriptionAllowed, updateConnectionState]);

  // 🔥 LEAK-PROOF: Deterministic unsubscribe with definitive logging
  const unsubscribe = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (unsubscribeRef.current) {
      // 🔥 DEFINITIVE LOGGING: Always log unsubscription
      realtimeLogger.logUnsubscribe(channelIdRef.current, 'SignalRealtimeProvider');
      
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    
    setNextRetryAt(null);
  }, []); // 🔥 LEAK-PROOF: No dependencies to prevent stale closures

  // PHASE 3: Simplified reconnection via shared connection (automatic)
  const attemptReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    const delay = 5000; // Simple 5 second delay
    const target = Date.now() + delay;
    setNextRetryAt(target);

    if (isDevToolsEnabled()) {
      console.log(`🔄 PHASE 3: Reconnecting via shared connection in ${Math.round(delay)}ms`);
    }
    
    reconnectTimeoutRef.current = setTimeout(() => {
      unsubscribe();
      subscribe();
    }, delay);
  }, [subscribe, unsubscribe]);

  // 🔥 LEAK-PROOF: Mount-only lifecycle with definitive cleanup
  useEffect(() => {
    mountOnlyRef.current = true;
    
    realtimeLogger.logStatus('SignalRealtimeProvider MOUNT');
    healthMonitor.registerConnection('SignalRealtime');
    
    return () => {
      mountOnlyRef.current = false;
      
      realtimeLogger.logStatus('SignalRealtimeProvider UNMOUNT');
      
      // 🔥 LEAK-PROOF: Clear all timers first
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      // 🔥 LEAK-PROOF: Force unsubscribe
      unsubscribe();
      
      healthMonitor.unregisterConnection('SignalRealtime');
    };
  }, []); // 🔥 LEAK-PROOF: Mount-only, never re-run

  // PHASE 1: Route-aware subscription management - React to route gate changes
  useEffect(() => {
    if (!mountOnlyRef.current) return;

    if (isSignalSubscriptionAllowed) {
      if (isDevToolsEnabled()) {
        console.log('🚦 DIAGNOSTIC: Route gate OPENED for signals - Subscribing...', {
          timestamp: new Date().toISOString(),
          currentSignals: signals.length
        });
      }
      subscribe();
    } else {
      if (isDevToolsEnabled()) {
        console.log('🚦 DIAGNOSTIC: Route gate CLOSED for signals - Unsubscribing...', {
          timestamp: new Date().toISOString(),
          hadSignals: signals.length
        });
      }
      // PHASE 4: Record route-gate block (not a connection failure)
      emergencyRealtimeBreaker.recordRouteGateBlock('signals');
      unsubscribe();
    }
  }, [isSignalSubscriptionAllowed]); // PHASE 1 FIX: Removed subscribe/unsubscribe to break dependency loop

  const contextValue: SignalRealtimeContextType = {
    signals,
    connectionStatus: connectionStateRef.current.status === 'circuit-breaker' ? 'error' : connectionStateRef.current.status,
    lastUpdated,
    error: error || connectionStateRef.current?.status === 'error' ? 'Connection error' : null,
    nextRetryAt,
    subscribe,
    unsubscribe,
    refreshSignals,
    // PHASE 6: Enhanced reliability methods
    restartConnection,
    getConnectionHealth,
    forcePollingMode,
    isInPollingMode,
    // PHASE 7: Signal retrieval for instant UI updates
    getSignalById,
    // PHASE 1 CLEANUP: Shared profile cache
    getCachedProfile
  };

  return (
    <SignalRealtimeContext.Provider value={contextValue}>
      {children}
    </SignalRealtimeContext.Provider>
  );
};

export const useSignalRealtime = () => {
  const context = useContext(SignalRealtimeContext);
  if (!context) {
    // Instead of throwing, return a safe fallback object
    console.warn('useSignalRealtime used outside of SignalRealtimeProvider, returning fallback');
    return {
      signals: [],
      connectionStatus: 'disconnected' as const,
      lastUpdated: null,
      error: 'SignalRealtimeProvider not initialized',
      nextRetryAt: null,
      subscribe: () => console.warn('SignalRealtimeProvider not available'),
      unsubscribe: () => console.warn('SignalRealtimeProvider not available'),
      refreshSignals: async () => console.warn('SignalRealtimeProvider not available'),
      restartConnection: () => console.warn('SignalRealtimeProvider not available'),
      getConnectionHealth: () => ({ isHealthy: false, lastUpdate: null, mode: 'disconnected' }),
      forcePollingMode: () => console.warn('SignalRealtimeProvider not available'),
      isInPollingMode: false,
      getSignalById: () => undefined,
      getCachedProfile: async () => null
    };
  }
  return context;
};
