// PHASE 5: NUCLEAR OPTION - ALL Supabase Realtime ELIMINATED, custom WebSocket + database polling only
import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isDevToolsEnabled } from '@/utils/featureFlags';
import { useConnectionStability } from '@/hooks/useConnectionStability';
import { pricePerformanceMonitor } from '@/utils/pricePerformanceMonitor';
import { costTracker } from '@/services/CostTracker';
import { useRealtimeHealth } from '@/contexts/RealtimeHealthMonitor';
import { useSingleTabLeadership } from '@/hooks/useSingleTabLeadership';
import { useRealtimeGate } from '@/hooks/useRouteGatedSubscriptions';
import { useRealtimeTelemetry } from '@/hooks/useRealtimeTelemetry';
import { useTelemetry } from '@/contexts/TelemetryContext';
import { useGlobalPreviewControl } from '@/contexts/GlobalPreviewControlContext';
import { normalizeSymbol } from '@/utils/symbolUtils';
import { realtimeLogger, generateChannelId } from '@/utils/realtimeLogger';
import { emergencyRealtimeBreaker } from '@/services/EmergencyRealtimeBreaker';
import { useUIActivityRegistration } from '@/hooks/useUIActivityRegistration';
import { providerStabilityService } from '@/services/ProviderStabilityService';
import { realtimeMessageRateMonitor } from '@/services/RealtimeMessageRateMonitor';
import { realtimeMessageDiagnostics } from '@/services/RealtimeMessageDiagnostics';
import { useMonitoringRouteGate } from '@/hooks/useMonitoringRouteGate';
import { checkPriceIngestorHealth } from '@/utils/priceIngestorHealthCheck';

// ✅ GLOBAL SYMBOL WHITELIST - Extended for better compatibility
const ALLOWED_SYMBOLS = ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'EURJPY'] as const;
const MAX_SUBSCRIPTIONS = 12; // Increased for better coverage

// 🚀 FRONTEND THROTTLING (SMART TV STATION) CONFIGURATION
const UI_UPDATE_THROTTLE_MS = 3500; // 3.5 seconds for calm, professional trading experience
const SIGNIFICANCE_THRESHOLDS = {
  CRITICAL: 0.005, // 0.5% change bypasses throttling for immediate updates
  MAJOR: 0.003,    // 0.3% change gets priority in next UI update
  NORMAL: 0.001,   // Normal threshold for batch updates
};

// 🚀 ORDER ACTIVATION BYPASS: Critical trading events that bypass throttling
const CRITICAL_TRADING_EVENTS = {
  ORDER_STATUS_CHANGE: true, // pending → active, active → closed
  TP_HIT: true,             // Take profit hits
  SL_HIT: true,             // Stop loss hits
  LIVE_PRICE_WIDGET: true   // Live price displays for professional trading interface
};

// Enhanced price data interface with bid/ask support and arrival tracking
interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  receivedAt: number; // New: Client arrival timestamp for ultra-responsive freshness tracking
  bid?: number;
  ask?: number;
  mid?: number;
}

// Connection state management interface
interface ConnectionState {
  status: 'disconnected' | 'connecting' | 'connected' | 'error' | 'circuit-breaker';
  attempt: number;
  nextRetryAt: number | null;
  errorCount: number;
  lastSuccessAt: number | null;
  fallbackActivationCount?: number; // PHASE 3: Track retry attempts for smart escalation
}

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  maxConsecutiveFailures: 5,
  breakerOpenDuration: 30000, // 30 seconds
  maxReconnectAttempts: 10,
  baseRetryDelay: 2000, // Start with 2 seconds
  maxRetryDelay: 30000, // Cap at 30 seconds
  retryMultiplier: 1.8, // Gentle exponential backoff
  jitterRange: 0.3, // ±30% jitter
};

// 🚀 WATCHDOG FIX: Prevent flicker with stable thresholds
const HEALTH_CONFIG = {
  staleDataThreshold: 3000, // 🔥 FIXED: 3 seconds for "Live" status (down from 10s)
  healthCheckInterval: 30000, // Check health every 30 seconds
  maxSilentPeriod: 300000, // 5 minutes of no data before concern (INCREASED from 3min)
};

interface OptimizedWebSocketContextType {
  prices: Record<string, PriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling';
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  getPrice: (symbol: string) => PriceData | null;
  isConnected: boolean;
  error: string | null;
  // Enhanced features
  dataSource: string;
  lastUpdated: Date | null;
  errors: Record<string, string>;
  refreshPrice: (symbol: string) => void;
  getConnectionHealth: () => { isHealthy: boolean; lastUpdate: Date | null };
  getActiveSymbolsCount: () => number;
  getActiveSymbols: () => string[];
  getStats?: () => { 
    messagesReceived: number; 
    reconnections: number; 
    avgLatency: number;
    activeSymbols: number;
    connectionStatus: string;
  };
  restartConnection: () => void;
  // EMERGENCY FUNCTIONS: Force provider restart and stability reset
  emergencyRestart: () => void;
  getProviderStabilityStatus: () => { isBlocked: boolean; canMount: boolean; metrics: any };
  isUsingEnhancedSystem: boolean;
  // Enhanced "Hydrate and Highlight" indicators  
  getDataAge: (symbol: string) => number;
  getConnectionQuality: (symbol?: string) => 'hydrated' | 'live' | 'stale';
  // Sub-2s Live Guarantee - Arrival-based age tracking
  getArrivalAge: (symbol: string) => number;
  // 🚀 FRONTEND THROTTLING: New methods for dual-layer price management
  getInternalPrice: (symbol: string) => PriceData | null;
  internalPrices: Record<string, PriceData>;
  uiThrottleMs: number;
}

const OptimizedWebSocketContext = createContext<OptimizedWebSocketContextType | null>(null);

export const useOptimizedWebSocketPrices = (): OptimizedWebSocketContextType => {
  const context = useContext(OptimizedWebSocketContext);
  if (!context) {
    console.warn('🚨 useOptimizedWebSocketPrices: Context not available, returning fallback');
    
    // Return fallback context to prevent crashes
    return {
      prices: {},
      connectionStatus: 'disconnected',
      error: 'Context not available',
      lastUpdated: null,
      dataSource: 'none',
      uiThrottleMs: 3500,
      subscribe: () => {},
      unsubscribe: () => {},
      getPrice: () => null,
      getInternalPrice: () => null,
      getActiveSymbolsCount: () => 0,
      getActiveSymbols: () => [],
      getDataAge: () => Infinity,
      getConnectionQuality: () => 'stale',
      getArrivalAge: () => Infinity,
      internalPrices: {},
      restartConnection: () => Promise.resolve(),
      // Add missing properties from interface
      isConnected: false,
      errors: {},
      refreshPrice: () => {},
      getConnectionHealth: () => ({ isHealthy: false, lastUpdate: null }),
      getStats: () => ({ messagesReceived: 0, reconnections: 0, avgLatency: 0, activeSymbols: 0, connectionStatus: 'disconnected' }),
      isUsingEnhancedSystem: false,
      // Emergency functions
      emergencyRestart: () => {},
      getProviderStabilityStatus: () => ({ isBlocked: true, canMount: false, metrics: null })
    };
  }
  return context;
};

interface OptimizedWebSocketPriceProviderProps {
  children: React.ReactNode;
}

export const OptimizedWebSocketPriceProvider: React.FC<OptimizedWebSocketPriceProviderProps> = ({
  children
}) => {
  // 🚨 FIX: Stable initialization - prevent re-render loops
  const [isProviderReady, setIsProviderReady] = useState(false);
  const mountTimeRef = useRef(Date.now());
  const initCountRef = useRef(0);
  const hasInitialized = useRef(false);
  
  // Only log initialization once per mount
  if (!hasInitialized.current) {
    initCountRef.current++;
    console.log(`🚀 OptimizedWebSocketPriceProvider initializing... (Init #${initCountRef.current})`);
    hasInitialized.current = true;
  }
  
  const healthMonitor = useRealtimeHealth();
  const { isLeader, tabId, tabCount } = useSingleTabLeadership();
  const isPriceSubscriptionAllowed = useRealtimeGate('prices');
  const { recordConnection, recordClampActivation } = useRealtimeTelemetry();
  const telemetry = useTelemetry();
  const { isGlobalLeader, isEnforced } = useGlobalPreviewControl();
  const { shouldAllowQualityChange } = useConnectionStability();
  
  // ✅ PHASE 1 FIX: Route gate initialization state to prevent race conditions
  const [isRouteGateReady, setIsRouteGateReady] = useState(false);
  const pendingSubscriptionsRef = useRef<string[]>([]);
  
  // PHASE 3: Track route-based subscription state
  const wasSubscriptionAllowedRef = useRef(isPriceSubscriptionAllowed);
  const isPriceSubscriptionAllowedRef = useRef(isPriceSubscriptionAllowed);
  
  // 🔥 LEAK-PROOF: Deterministic channel ID for definitive logging
  const channelIdRef = useRef(generateChannelId('prices'));
  const mountOnlyRef = useRef(false); // 🔥 LEAK-PROOF: Prevent operations after unmount
  
  // REALTIME FALLBACK: Add postgres_changes subscription if no broadcast within 10s
  const privateFallbackChannelRef = useRef<RealtimeChannel | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  
  // 🎯 PHASE 4: Realtime usage monitoring
  const [realtimeStats, setRealtimeStats] = useState({
    messagesReceived: 0,
    hourlyAverage: 0,
    lastResetTime: Date.now(),
    peakHourlyRate: 0
  });
  
  // 🚀 FRONTEND THROTTLING: Dual-layer price state management
  // Internal prices: Always fresh, updated immediately from backend (for data integrity)
  const [internalPrices, setInternalPrices] = useState<Record<string, PriceData>>(() => {
    try {
      const cached = sessionStorage.getItem('cached_prices');
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        // Use cached prices that are less than 10 minutes old (increased from 5)
        if (parsed.timestamp && (now - parsed.timestamp) < 600000) {
          return parsed.prices || {};
        }
      }
    } catch (error) {
      console.warn('Failed to restore cached prices:', error);
    }
    return {};
  });
  
  // 🚨 FIX: Provider stability tracking moved to useEffect (not render)
  useEffect(() => {
    console.log(`🔧 Provider mounting (stable)... (Init #${initCountRef.current})`);
    
    // 🚨 PHASE 1: Track mount/unmount cycles
    mountOnlyRef.current = true;
    setIsProviderReady(true);
    
    // ⚡ PHASE 2: Initialize Realtime subscription on mount
    setupRealtimeSubscription();
    
    console.log(`✅ OptimizedWebSocketPriceProvider ready (Init #${initCountRef.current})`);
    
    // 🚨 PHASE 1: Cleanup tracking on unmount
    return () => {
      console.log(`🧹 OptimizedWebSocketPriceProvider unmounting (Init #${initCountRef.current})`);
      mountOnlyRef.current = false;
      hasInitialized.current = false; // Reset for next mount
      
      // ⚡ PHASE 2: Cleanup Realtime subscription
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
        realtimeChannelRef.current = null;
        console.log('⚡ [Realtime] Unsubscribed from postgres_changes');
      }
      
      // Cleanup channels
      if (privateFallbackChannelRef.current) {
        privateFallbackChannelRef.current.unsubscribe();
        privateFallbackChannelRef.current = null;
      }
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, []);
  
  // ✅ PHASE 1 FIX: Route gate initialization delay to prevent race conditions
  useEffect(() => {
    const initTimer = setTimeout(() => {
      setIsRouteGateReady(true);
      if (isDevToolsEnabled()) {
        console.log('✅ Route gate initialized, subscriptions now allowed');
      }
    }, 150); // 150ms delay ensures route context is fully initialized
    
    return () => clearTimeout(initTimer);
  }, []);
  
  // UI prices: Throttled updates for calm user experience (exposed to components)
  const [prices, setPrices] = useState<Record<string, PriceData>>(internalPrices);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // 🚨 PHASE 2: Timestamp State Lock - Track database hydration timestamp to prevent race conditions
  const [lastDatabaseTimestamp, setLastDatabaseTimestamp] = useState<Record<string, number>>({});
  
  // Connection state management
  const connectionStateRef = useRef<ConnectionState>({
    status: 'disconnected',
    attempt: 0,
    nextRetryAt: null,
    errorCount: 0,
    lastSuccessAt: null,
  });

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error' | 'polling'>('disconnected');
  
  // Core refs for connection management - PHASE 1: Ref-counting Map
  const channelRef = useRef<RealtimeChannel | null>(null);
  const subscriptionsRef = useRef<Map<string, number>>(new Map()); // symbol -> ref count
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isBackgroundDisconnected = useRef(false);
  const lastErrorLogRef = useRef<string>('');
  const errorLogCountRef = useRef(0);
  const manualCloseRef = useRef(false);
  
  // 🚀 FIXED: Track active subscriptions in state (not ref) for proper reactivity
  const [activeSubscriptions, setActiveSubscriptions] = useState<string[]>([]);
  
  // 🔥 PHASE 2: Removed duplicate useUIActivityRegistration - now managed by GlobalUIActivityManager in passive mode
  const { shouldEnableMonitoring, currentRoute, isLandingPage } = useMonitoringRouteGate();

  // 🚀 PHASE 2: Fallback mechanism refs
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackPollingRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackChannelRef = useRef<RealtimeChannel | null>(null);
  const watchdogTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredFallback = useRef(false);

  // Stats tracking + PHASE 4: Rate limiting state
  const statsRef = useRef({
    messagesReceived: 0,
    reconnections: 0,
    latencySum: 0,
    latencyCount: 0,
  });
  const priceUpdateTimestamps = useRef(new Map<string, number>());
  const arrivalTimestamps = useRef(new Map<string, number>()); // New: Track arrival times for sub-2s guarantee
  const watchdogIntervalRef = useRef<NodeJS.Timeout | null>(null); // New: Staleness watchdog
  const watchdogStaleCountRef = useRef(new Map<string, number>()); // New: Track consecutive stale checks
  
  // 🚀 FRONTEND THROTTLING: Smart UI update management
  const uiUpdateBuffer = useRef(new Map<string, PriceData>());
  const uiUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUIUpdateRef = useRef(new Map<string, number>());
  const significantUpdatesRef = useRef(new Set<string>()); // Track symbols with critical changes
  
  // 🎯 "Hydrate and Highlight" state tracking
  const realtimeReceivedSymbols = useRef(new Set<string>());
  
  // HYSTERESIS: Track quality states to prevent flicker
  const qualityStateRef = useRef<Map<string, { 
    quality: 'live' | 'hydrated' | 'stale', 
    lastPromotedToLive: number | null,
    lastDemotedFromLive: number | null 
  }>>(new Map());
  
  // 🚀 ANTI-FLICKER: 3-sample confirmation to prevent rapid oscillation
  const qualitySampleHistoryRef = useRef(new Map<string, string[]>());
  
  // 🚀 ANTI-FLICKER: 200ms result cache to prevent render-based micro-flips
  const qualityResultCacheRef = useRef(new Map<string, { quality: string; timestamp: number }>());

  // CORE WEBSOCKET CONNECTION: Establish realtime channel with price broadcasts
  const connectToRealtimeChannel = useCallback(() => {
    // ⚠️  PHASE 5: NO REALTIME CONNECTION - Database polling only
    console.log('ℹ️  [Connection] Using database polling for prices (no realtime)');
    channelRef.current = null;
    
    // Set status to 'polling' to reflect actual architecture
    setConnectionStatus('polling');
  }, []);

  // 🚀 PHASE 2: Fallback mechanisms - postgres_changes + DB polling
  const enableFallbackMechanisms = useCallback(() => {
    if (hasTriggeredFallback.current) return;
    hasTriggeredFallback.current = true;
    
    // PHASE 3: Track fallback activation count for smart retry
    if (!connectionStateRef.current.fallbackActivationCount) {
      connectionStateRef.current.fallbackActivationCount = 0;
    }
    connectionStateRef.current.fallbackActivationCount++;
    
    const activationCount = connectionStateRef.current.fallbackActivationCount;
    console.log(`📡 Fallback activated (attempt #${activationCount})`);
    
    // PHASE 3: After 3 failed attempts, increase polling frequency
    const isHighFrequencyMode = activationCount >= 3;
    const pollingInterval = isHighFrequencyMode ? 5000 : 10000; // 5s vs 10s
    
    console.log(`⏱️ Using ${isHighFrequencyMode ? 'HIGH' : 'NORMAL'} frequency polling: ${pollingInterval}ms`);
    
    // 🔒 CHECK ACTIVE UI SESSIONS: Only enable fallback if users are actually connected
    const checkActiveUISessions = async () => {
      try {
        const { data, error } = await supabase
          .from('ui_price_listeners')
          .select('session_id')
          .gte('last_seen_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());
        
        const hasActiveUsers = data && data.length > 0;
        console.log(`👥 Active UI sessions: ${data?.length || 0} - ${hasActiveUsers ? 'ENABLING' : 'SKIPPING'} fallback`);
        return hasActiveUsers;
      } catch (error) {
        console.error('❌ Error checking active sessions:', error);
        return true; // Fail-safe: enable fallback on error
      }
    };
    
    // 🎯 PHASE 1: Removed redundant market_prices_fallback subscription
    // This was causing 3x message duplication - only live-prices-broadcast is needed
    
    // 🚨 EMERGENCY ONLY: Poll every 10 seconds (reduced frequency) and ONLY if broadcast is dead
    const pollDatabase = async () => {
      // 🔒 COST OPTIMIZATION: Check if any UI sessions are active before polling
      const hasActiveUsers = await checkActiveUISessions();
      if (!hasActiveUsers) {
        console.log('✅ No active UI sessions detected - skipping emergency database poll');
        return;
      }
      
      const activeSymbols = Array.from(subscriptionsRef.current.keys());
      if (activeSymbols.length === 0) return;
      
      // 🎯 PHASE 2: EMERGENCY ONLY - Poll only if broadcast dead for 120+ seconds AND not connected
      const now = Date.now();
      const timeSinceLastUpdate = lastUpdated ? now - lastUpdated.getTime() : Infinity;
      
      if (connectionStatus === 'connected' || timeSinceLastUpdate < 120000) {
        console.log('✅ Broadcast active or recently updated, skipping emergency database poll');
        return;
      }
      
      try {
        const { data } = await supabase
          .from('market_prices')
          .select('symbol, bid, ask, mid, updated_at')
          .in('symbol', activeSymbols);
          
        if (data) {
          const polledPrices: Record<string, PriceData> = {};
          const timestampUpdates: Record<string, number> = {};
          
          data.forEach(row => {
            const price = row.mid || (row.bid && row.ask ? (row.bid + row.ask) / 2 : row.bid || row.ask);
            if (price) {
              const dbTimestamp = new Date(row.updated_at).getTime();
              polledPrices[row.symbol] = {
                symbol: row.symbol,
                price,
                change: 0,
                changePercent: 0,
                timestamp: row.updated_at,
                receivedAt: Date.now(),
                bid: row.bid,
                ask: row.ask,
                mid: row.mid
              };
              
              // 🚨 PHASE 2: Track database timestamp for race condition prevention
              timestampUpdates[row.symbol] = dbTimestamp;
              console.log(`📊 Database hydration for ${row.symbol}: ${new Date(dbTimestamp).toISOString()}`);
            }
          });
          
          if (Object.keys(polledPrices).length > 0) {
            setInternalPrices(prev => ({ ...prev, ...polledPrices }));
            setPrices(prev => ({ ...prev, ...polledPrices }));
            
            // 🔧 FIX: Update arrivalTimestamps for all polled symbols
            Object.keys(polledPrices).forEach(symbol => {
              arrivalTimestamps.current.set(symbol, Date.now());
            });
            console.log(`⏰ Updated arrivalTimestamps for ${Object.keys(polledPrices).length} symbols (db_poll fallback)`);
            
            // timestampUpdates already contains milliseconds (line 683)
            setLastDatabaseTimestamp(prev => ({ ...prev, ...timestampUpdates }));
            setLastUpdated(new Date());
            console.log('🚨 EMERGENCY fallback: db_poll updated prices after broadcast failure');
          }
        }
      } catch (error) {
        console.warn('⚠️ Emergency DB polling error:', error);
      }
    };
    
    // 🚨 EMERGENCY: Smart polling with dynamic interval based on retry count
    fallbackPollingRef.current = setInterval(pollDatabase, pollingInterval);
    console.log(`🚨 Started EMERGENCY database polling (${pollingInterval}ms intervals) due to broadcast failure`);
    
  }, [lastUpdated]);

  // ⚡ PHASE 2: Supabase Realtime Subscription for Instant Price Updates
  const realtimeChannelRef = useRef<any>(null);
  const lastRealtimeUpdateRef = useRef<Record<string, number>>({});

  const setupRealtimeSubscription = useCallback(() => {
    if (realtimeChannelRef.current) {
      console.log('⚡ [Realtime] Subscription already active, skipping setup');
      return;
    }

    console.log('⚡ [Realtime] Setting up postgres_changes subscription for market_prices');

    const channel = supabase
      .channel('market_prices_realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT and UPDATE
          schema: 'public',
          table: 'market_prices'
        },
        (payload) => {
          const { new: newRow, eventType } = payload as any;
          
          if (!newRow || !newRow.symbol) return;

          const symbol = newRow.symbol as string;
          const dbTimestamp = new Date(newRow.updated_at).getTime();
          const lastUpdate = lastRealtimeUpdateRef.current[symbol] || 0;
          const hydratedTimestamp = lastDatabaseTimestamp[symbol] || 0;

          // ✅ PHASE 2: Make realtime SECONDARY to instant hydration
          if (dbTimestamp <= hydratedTimestamp) {
            console.log(`⏭️ [Realtime] Skipped - hydrated data is fresher for ${symbol} (db: ${dbTimestamp}, hydrated: ${hydratedTimestamp})`);
            return;
          }

          // 🔥 DEDUPLICATION: Only process if timestamp is newer than last realtime update
          if (dbTimestamp <= lastUpdate) {
            console.log(`⏭️ [Realtime] Skipped duplicate update for ${symbol} (timestamp: ${dbTimestamp})`);
            return;
          }

          lastRealtimeUpdateRef.current[symbol] = dbTimestamp;

          // Extract price with mid-only support
          const price = newRow.mid || (newRow.bid && newRow.ask ? (newRow.bid + newRow.ask) / 2 : newRow.bid || newRow.ask);

          if (price) {
            const priceData: PriceData = {
              symbol,
              price,
              change: 0,
              changePercent: 0,
              timestamp: newRow.updated_at,
              receivedAt: Date.now(),
              bid: newRow.bid,
              ask: newRow.ask,
              mid: newRow.mid
            };

            console.log(`⚡ [Realtime ${eventType}] ${symbol}: $${price} (instant update from postgres_changes)`);

            // Update state instantly
            setInternalPrices(prev => ({ ...prev, [symbol]: priceData }));
            setPrices(prev => ({ ...prev, [symbol]: priceData }));
            setLastDatabaseTimestamp(prev => ({ ...prev, [symbol]: dbTimestamp }));
            arrivalTimestamps.current.set(symbol, Date.now());
            setLastUpdated(new Date());
            
            console.log(`✅ [Realtime] Applied instant update for ${symbol}`);
          }
        }
      )
      .subscribe((status) => {
        console.log(`⚡ [Realtime] Subscription status: ${status}`);
        if (status === 'SUBSCRIBED') {
          console.log('✅ [Realtime] Successfully subscribed to market_prices postgres_changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`❌ [Realtime] Subscription failed: ${status}`);
          // Retry after 5 seconds
          setTimeout(() => {
            realtimeChannelRef.current = null;
            setupRealtimeSubscription();
          }, 5000);
        }
      });

    realtimeChannelRef.current = channel;
  }, []);

  // 🚀 PHASE 2: Connection restart with cleanup
  const connectionRestart = useCallback(() => {
    console.log('🔄 Restarting connection...');
    
    // Clear all timers and reset state
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (fallbackPollingRef.current) {
      clearInterval(fallbackPollingRef.current);
      fallbackPollingRef.current = null;
    }
    if (fallbackChannelRef.current) {
      fallbackChannelRef.current.unsubscribe();
      fallbackChannelRef.current = null;
    }
    
    // Reset flags
    hasTriggeredFallback.current = false;
    statsRef.current.messagesReceived = 0;
    
    // Disconnect and reconnect
    if (channelRef.current) {
      (channelRef.current as any)._customCleanup?.();
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    isConnectingRef.current = false;
    setConnectionStatus('disconnected');
    
    // Reconnect if we have active subscriptions
    if (subscriptionsRef.current.size > 0) {
      setTimeout(() => connectToRealtimeChannel(), 1000);
    }
  }, [connectToRealtimeChannel]);

  // ⚡ PHASE 5: NUCLEAR CACHE-BUSTING - Force fresh database reads every poll
  const fetchPricesFromDatabase = useCallback(async (targetSymbols: string[]) => {
    if (targetSymbols.length === 0) return;

    try {
      console.log(`📡 [Database Poll] Fetching prices for: ${targetSymbols.join(', ')}`);
      
      // ✅ PHASE 1: Restored 60-second window for instant hydration
      const cacheBustNonce = Date.now();
      const oneMinuteAgo = new Date(cacheBustNonce - 60000).toISOString(); // ✅ Loosened to 60s for fresh data
      
      // ⚡ CRITICAL: Use timestamp in query to bypass HTTP cache
      const { data } = await supabase
        .from('market_prices')
        .select('symbol, mid, bid, ask, updated_at')
        .in('symbol', targetSymbols)
        .gte('updated_at', oneMinuteAgo) // ✅ Accept recent fresh data (60s window)
        .limit(50); // ⚡ Force query re-execution
      
      console.log(`🔥 [Cache-Bust] Query with nonce ${cacheBustNonce}, filter: ${oneMinuteAgo}`);
        
      if (data) {
        const hydratedPrices: Record<string, PriceData> = {};
        const timestampUpdates: Record<string, number> = {};
        
        data.forEach(row => {
          // 🔥 MID-ONLY SUPPORT: Prioritize mid, then calculate from bid/ask, then fallback
          const hasMidOnly = row.mid && (!row.bid || !row.ask);
          const price = row.mid || (row.bid && row.ask ? (row.bid + row.ask) / 2 : row.bid || row.ask);
          
          // 🚀 Enhanced logging for mid-only prices
          if (hasMidOnly) {
            console.log(`🎯 [Mid-Only Price] ${row.symbol}: mid=${row.mid}, bid=${row.bid}, ask=${row.ask}`);
          }
          
          if (price) {
            const dbTimestamp = new Date(row.updated_at).getTime();
            hydratedPrices[row.symbol] = {
              symbol: row.symbol,
              price,
              change: 0,
              changePercent: 0,
              timestamp: row.updated_at,
              receivedAt: Date.now(),
              bid: row.bid,
              ask: row.ask,
              mid: row.mid
            };
            
            timestampUpdates[row.symbol] = dbTimestamp;
            const ageSeconds = Math.round((Date.now() - dbTimestamp) / 1000);
            
            // 🚀 STEP 3: Aggressive logging to debug price ingestor
            const priceSource = hasMidOnly ? '[MID-ONLY]' : row.bid && row.ask ? '[BID/ASK]' : '[PARTIAL]';
            console.log(`💾 [Database Poll] ${row.symbol}: $${price} ${priceSource} (${ageSeconds}s old) [RAW updated_at: ${row.updated_at}]`);
            const oldPrice = internalPrices[row.symbol]?.price;
            if (oldPrice) {
              const priceDiff = Math.abs(oldPrice - price);
              console.log(`🔍 [Price Comparison] ${row.symbol} - Old: $${oldPrice.toFixed(4)}, New: $${price.toFixed(4)}, Diff: $${priceDiff.toFixed(6)} (${((priceDiff / oldPrice) * 100).toFixed(4)}%)`);
            }
          } else {
            // 🚨 Log when price extraction fails completely
            console.error(`❌ [Database Poll] Failed to extract price for ${row.symbol} - mid=${row.mid}, bid=${row.bid}, ask=${row.ask}`);
          }
        });
        
        // 🚀 STEP 2 & 4: Smart State Updates with enhanced sensitivity + debug mode
        if (Object.keys(hydratedPrices).length > 0) {
          // 🔥 AGGRESSIVE CACHE-BUSTING: Force updates on every poll
          const FORCE_UPDATE_MODE = true; // Enabled to force UI updates with fresh data
          const MINIMUM_CHANGE_THRESHOLD = 0.0001; // 0.01% minimum price change
          
          // Check for ANY changes: price OR timestamp updates
          const hasChanges = Object.keys(hydratedPrices).some(symbol => {
            const oldPrice = internalPrices[symbol]?.price;
            const newPrice = hydratedPrices[symbol]?.price;
            const oldTimestamp = lastDatabaseTimestamp[symbol];
            const newTimestamp = timestampUpdates[symbol];
            
            // Update if: price changed meaningfully OR timestamp changed (database was written to)
            const priceChanged = !oldPrice || (Math.abs(newPrice - oldPrice) / oldPrice > MINIMUM_CHANGE_THRESHOLD);
            const timestampChanged = oldTimestamp !== newTimestamp;
            
            if (timestampChanged && !priceChanged) {
              console.log(`⏰ [Timestamp Update] ${symbol} - Database updated but price unchanged`);
            }
            
            return priceChanged || timestampChanged;
          });

  // ✅ PHASE 1: Conditional timestamp updates - only update if ACTUALLY newer
          const now = Date.now();
          Object.keys(hydratedPrices).forEach(symbol => {
            const oldTimestamp = lastDatabaseTimestamp[symbol];
            const newTimestamp = timestampUpdates[symbol];
            if (!oldTimestamp || newTimestamp > oldTimestamp) {
              arrivalTimestamps.current.set(symbol, now);
              console.log(`🟢 [Timestamp] ${symbol} → ${now} (genuinely newer)`);
            } else {
              console.log(`⏭️ [Timestamp] ${symbol} skipped (same data)`);
            }
          });

          // 🔥 REACTIVE FIX: Always trigger re-renders after timestamp updates
          if (FORCE_UPDATE_MODE || hasChanges) {
            if (FORCE_UPDATE_MODE && !hasChanges) {
              console.log(`🚀 [Force Update] Forcing UI refresh despite no changes (every 2s)`);
            }
            setInternalPrices(prev => ({ ...prev, ...hydratedPrices }));
            setPrices(prev => ({ ...prev, ...hydratedPrices }));
            setLastDatabaseTimestamp(prev => ({ ...prev, ...timestampUpdates }));
            console.log(`✅ [Database Poll] Updated ${Object.keys(hydratedPrices).length} prices + arrivalTimestamps`);
          } else {
            console.log(`⏭️  [Database Poll] Skipped price update but refreshed arrivalTimestamps for ${Object.keys(hydratedPrices).length} symbols`);
          }
          
          // 🔥 CRITICAL: Always update lastUpdated to force component re-renders
          setLastUpdated(new Date());
          console.log(`♻️ [Reactive Update] Triggered component re-renders at ${new Date().toISOString()}`);

        }
      }
    } catch (error) {
      console.warn('⚠️ Database polling error:', error);
    }
  }, []);

  // SYMBOL SUBSCRIPTION MANAGEMENT: Reference counting system with instant hydration
  const subscribe = useCallback((symbols: string[], bypassRouteGate: boolean = false) => {
    if (!symbols?.length) return;

    console.log(`⚡ HYDRATE & SUBSCRIBE called for: ${symbols.join(', ')}`);
    console.log(`📊 Current subscriptions: ${Array.from(subscriptionsRef.current.keys()).join(', ')}`);
    
    let needsConnection = false;
    let newSymbolsAdded = false;
    const newSymbolsForHydration: string[] = [];
    const allRequestedSymbols: string[] = [];
    
    symbols.forEach(symbol => {
      const normalizedSymbol = normalizeSymbol(symbol);
      if (!normalizedSymbol || !ALLOWED_SYMBOLS.includes(normalizedSymbol as any)) {
        console.warn(`⚠️ Symbol ${symbol} -> ${normalizedSymbol} not in allowed list: ${ALLOWED_SYMBOLS.join(', ')}`);
        return;
      }

      allRequestedSymbols.push(normalizedSymbol);
      const currentCount = subscriptionsRef.current.get(normalizedSymbol) || 0;
      subscriptionsRef.current.set(normalizedSymbol, currentCount + 1);
      
      // 🔥 CRITICAL FIX: Synchronously update activeSubscriptions state
      setActiveSubscriptions(prev => {
        const updated = Array.from(subscriptionsRef.current.keys());
        if (JSON.stringify(prev) !== JSON.stringify(updated)) {
          console.log(`🔄 [Subscribe] Synchronously updated activeSubscriptions: ${updated.join(', ')}`);
          return updated;
        }
        return prev;
      });
      
      // Check if this symbol needs immediate hydration (new subscription OR no price data exists)
      const needsHydration = currentCount === 0 || !internalPrices[normalizedSymbol];
      
      if (currentCount === 0) {
        needsConnection = true;
        newSymbolsAdded = true;
        console.log(`➕ NEW SUBSCRIPTION: ${normalizedSymbol} (refs: ${currentCount + 1})`);
      } else {
        console.log(`🔄 Existing subscription: ${normalizedSymbol} (refs: ${currentCount + 1})`);
      }
      
      if (needsHydration) {
        newSymbolsForHydration.push(normalizedSymbol);
        console.log(`⚡ Symbol ${normalizedSymbol} needs immediate hydration`);
      }
    });

    // 🚀 CRITICAL: INSTANT DATABASE HYDRATION - Fetch prices IMMEDIATELY for any symbols without data
    if (newSymbolsForHydration.length > 0) {
      console.log(`⚡⚡⚡ EXECUTING INSTANT HYDRATION for: ${newSymbolsForHydration.join(', ')}`);
      
      // 🚀 CRITICAL FIX: Initialize arrivalTimestamps immediately to prevent "Stale" flash
      newSymbolsForHydration.forEach(symbol => {
        arrivalTimestamps.current.set(symbol, Date.now());
      });
      
      // Call immediately - don't wait for WebSocket or route gates
      fetchPricesFromDatabase(newSymbolsForHydration).catch(err => {
        console.error('❌ Instant hydration failed:', err);
      });
    } else {
      console.log(`✅ All requested symbols already have price data - skipping hydration`);
    }

    // ✅ Route gating check (only for WebSocket connection, NOT for hydration)
    if (!bypassRouteGate && !isPriceSubscriptionAllowed) {
      if (isDevToolsEnabled()) {
        console.log('🚦 WebSocket subscription blocked by route gating (hydration still completed)');
      }
      emergencyRealtimeBreaker.recordRouteGateBlock('prices');
      return;
    }

    // ✅ Check route gate readiness for WebSocket (hydration already done above)
    if (!isRouteGateReady) {
      if (isDevToolsEnabled()) {
        console.log('⏳ Route gate not ready yet, deferring WebSocket connection (hydration already completed)');
      }
      pendingSubscriptionsRef.current = [
        ...new Set([...pendingSubscriptionsRef.current, ...allRequestedSymbols])
      ];
      return;
    }

    // Establish WebSocket connection if needed
    if (needsConnection && !channelRef.current && newSymbolsAdded) {
      console.log('🚀 Triggering WebSocket connection for new symbols...');
      connectToRealtimeChannel();
    } else if (subscriptionsRef.current.size > 0 && !channelRef.current) {
      console.log('🚀 Establishing WebSocket connection for existing symbols...');
      connectToRealtimeChannel();
    }

    // Activity registration now handled by GlobalUIActivityManager in passive mode
  }, [connectToRealtimeChannel, fetchPricesFromDatabase, isPriceSubscriptionAllowed, isRouteGateReady, internalPrices]);

  const unsubscribe = useCallback((symbols: string[]) => {
    if (!symbols?.length) return;

    console.log(`📊 Unsubscribing from symbols: ${symbols.join(', ')}`);
    
    let hasActiveSubscriptions = false;
    symbols.forEach(symbol => {
      const normalizedSymbol = normalizeSymbol(symbol);
      if (!normalizedSymbol) return;

      const currentCount = subscriptionsRef.current.get(normalizedSymbol) || 0;
      if (currentCount > 1) {
        subscriptionsRef.current.set(normalizedSymbol, currentCount - 1);
        hasActiveSubscriptions = true;
        console.log(`➖ Decremented subscription: ${normalizedSymbol} (refs: ${currentCount - 1})`);
      } else if (currentCount === 1) {
        subscriptionsRef.current.delete(normalizedSymbol);
        console.log(`🗑️ Removed subscription: ${normalizedSymbol} (refs: 0)`);
      }
    });

    // 🔥 CRITICAL FIX: Synchronously update activeSubscriptions state
    setActiveSubscriptions(prev => {
      const updated = Array.from(subscriptionsRef.current.keys());
      if (JSON.stringify(prev) !== JSON.stringify(updated)) {
        console.log(`🔄 [Unsubscribe] Synchronously updated activeSubscriptions: ${updated.join(', ')}`);
        return updated;
      }
      return prev;
    });

    // Check if we still have active subscriptions
    hasActiveSubscriptions = hasActiveSubscriptions || subscriptionsRef.current.size > 0;

    // Disconnect if no active subscriptions
    if (!hasActiveSubscriptions && channelRef.current) {
      console.log('🔌 No active subscriptions, disconnecting...');
      channelRef.current.unsubscribe();
      channelRef.current = null;
      setConnectionStatus('disconnected');
    }
  }, []);

  // PHASE 3: Route-aware subscription management - React to route gate changes
  useEffect(() => {
    if (!mountOnlyRef.current) return;

    if (isPriceSubscriptionAllowed) {
      if (isDevToolsEnabled()) {
        console.log('🚦 DIAGNOSTIC: Route gate OPENED for prices', {
          timestamp: new Date().toISOString(),
          activeSubscriptions: subscriptionsRef.current.size
        });
      }
      // Price subscriptions are managed through subscribe() calls from components
      // No action needed here - just log the gate status
    } else {
      if (isDevToolsEnabled()) {
        console.log('🚦 DIAGNOSTIC: Route gate CLOSED for prices - Cleaning up subscriptions', {
          timestamp: new Date().toISOString(),
          subscriptionsBeforeCleanup: subscriptionsRef.current.size
        });
      }
      // PHASE 4: Record route-gate block (not a connection failure)
      emergencyRealtimeBreaker.recordRouteGateBlock('prices');
      // Clean up all subscriptions when route gate closes
      if (subscriptionsRef.current.size > 0) {
        const allSymbols = Array.from(subscriptionsRef.current.keys());
        unsubscribe(allSymbols);
      }
    }

    // Track previous state
    wasSubscriptionAllowedRef.current = isPriceSubscriptionAllowed;
  }, [isPriceSubscriptionAllowed]); // PHASE 2 FIX: Removed unsubscribe to break dependency loop

  // ✅ PHASE 1 FIX: Process pending subscriptions when route gate becomes ready
  useEffect(() => {
    if (isRouteGateReady && pendingSubscriptionsRef.current.length > 0) {
      const pending = [...pendingSubscriptionsRef.current];
      pendingSubscriptionsRef.current = [];
      
      if (isDevToolsEnabled()) {
        console.log('🚀 Route gate ready, processing pending subscriptions:', pending);
      }
      
      // Process all pending subscriptions now that gate is ready
      subscribe(pending, true); // Bypass stale route gate check
    }
  }, [isRouteGateReady, subscribe]);

  // ⚡ PHASE 5: Optimized Polling with Route Detection
  useEffect(() => {
    if (!isProviderReady) {
      console.log('⏸️  [Polling] Provider not ready');
      return;
    }

    const symbolList = Array.from(subscriptionsRef.current.keys());
    if (symbolList.length === 0) {
      console.log('⏸️  [Polling] No symbols subscribed');
      return;
    }

    // ✅ PHASE 2: Dynamic polling frequency based on data freshness
    const isSignalStreamPage = window.location.pathname.includes('/signal-stream');
    
    // Check if we have recent fresh data (within 5 seconds)
    const hasRecentData = Object.values(lastDatabaseTimestamp).some(
      ts => ts && (Date.now() - ts < 5000)
    );
    
    // 🚀 Smart polling strategy:
    // - Signal stream with fresh data: 5s (slow backup polling)
    // - Signal stream without fresh data: 500ms (fast initial hydration)
    // - Other pages: 30s
    const pollingInterval = isSignalStreamPage 
      ? (hasRecentData ? 5000 : 500)  // ✅ Dynamic: 5s if fresh, 500ms during hydration
      : 30000;
    
    const modeLabel = hasRecentData ? 'BACKUP' : 'HYDRATION';
    console.log(`🔄 [Polling] Starting ${modeLabel} mode (${pollingInterval}ms) for ${symbolList.length} symbols`);
    
    if (!hasRecentData) {
      console.log(`⚡ [Hydration Mode] Fast polling active until fresh data received`);
    } else {
      console.log(`✅ [Backup Mode] Slow polling - realtime handling updates`);
    }
    
    // Immediate fetch
    console.log(`🚀 [Polling] Immediate fetch on effect trigger`);
    fetchPricesFromDatabase(symbolList);

    // Set up polling interval
    const intervalId = setInterval(() => {
      console.log(`⏰ [Polling] Interval tick (${pollingInterval}ms)`);
      
      // Pause polling if tab is hidden
      if (document.hidden) {
        console.log('⏸️  [Polling] Tab hidden, skipping fetch');
        return;
      }

      const currentSymbols = Array.from(subscriptionsRef.current.keys());
      if (currentSymbols.length > 0) {
        console.log(`📡 [Polling] Fetching ${currentSymbols.length} symbols: ${currentSymbols.join(', ')}`);
        fetchPricesFromDatabase(currentSymbols);
      } else {
        console.log('⏸️  [Polling] No symbols to fetch');
      }
    }, pollingInterval);

    return () => {
      console.log('🧹 [Polling] Stopping polling interval');
      clearInterval(intervalId);
    };
  }, [fetchPricesFromDatabase, isProviderReady, activeSubscriptions, connectionStatus, lastDatabaseTimestamp]);


  // CONNECTION MANAGEMENT: Enhanced restart and emergency functions
  const restartConnection = useCallback(() => {
    console.log('🔄 Restarting connection...');
    
    // Clear all timers and reset state
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (watchdogTimerRef.current) {
      clearTimeout(watchdogTimerRef.current);
      watchdogTimerRef.current = null;
    }
    if (fallbackPollingRef.current) {
      clearInterval(fallbackPollingRef.current);
      fallbackPollingRef.current = null;
    }
    if (fallbackChannelRef.current) {
      fallbackChannelRef.current.unsubscribe();
      fallbackChannelRef.current = null;
    }
    
    // Reset flags
    hasTriggeredFallback.current = false;
    statsRef.current.messagesReceived = 0;
    
    // Disconnect and reconnect
    if (channelRef.current) {
      (channelRef.current as any)._customCleanup?.();
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    
    isConnectingRef.current = false;
    setConnectionStatus('disconnected');
    
    // Reconnect if we have active subscriptions
    if (subscriptionsRef.current.size > 0) {
      setTimeout(() => connectToRealtimeChannel(), 1000);
    }
  }, [connectToRealtimeChannel]);

  // Emergency restart function
  const emergencyRestart = useCallback(() => {
    console.log('🚨 EMERGENCY RESTART: Clearing all state and restarting...');
    
    // Close all connections
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    if (fallbackChannelRef.current) {
      fallbackChannelRef.current.unsubscribe();
      fallbackChannelRef.current = null;
    }
    
    // Reset all state
    subscriptionsRef.current.clear();
    setInternalPrices({});
    setPrices({});
    setConnectionStatus('disconnected');
    setError(null);
    setLastUpdated(null);
    isConnectingRef.current = false;
    
    // Reset stability service
    providerStabilityService.emergencyReset('OptimizedWebSocketPriceProvider');
    
    console.log('🔄 Emergency restart complete');
  }, []);

  // PHASE 3: Periodic health check for external price feed
  useEffect(() => {
    if (!isProviderReady || !isRouteGateReady) return;
    
    const healthCheckInterval = setInterval(async () => {
      const health = await checkPriceIngestorHealth();
      
      if (!health.isHealthy) {
        console.warn(`⚠️ HEALTH CHECK: Price feed ${health.severity.toUpperCase()} - data is ${(health.lastUpdateAge / 1000).toFixed(0)}s old`);
        console.warn(`📋 Recommendation: ${health.recommendedAction}`);
        
        if (health.severity === 'critical') {
          console.error('🚨 CRITICAL: External price feed appears to be down');
          console.error('🔧 ACTION REQUIRED: Check DigitalOcean price-ingestor service');
        }
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(healthCheckInterval);
  }, [isProviderReady, isRouteGateReady]);

  // 🚀 STABILIZATION FIX: Periodic sync of activeSubscriptions with subscriptionsRef
  // This ensures useUIActivityRegistration always has current symbols without causing infinite loops
  useEffect(() => {
    const syncInterval = setInterval(() => {
      const currentSubscriptions = Array.from(subscriptionsRef.current.keys());
      setActiveSubscriptions(prevSubs => {
        // Only update if actually changed to prevent unnecessary re-renders
        if (JSON.stringify(prevSubs) !== JSON.stringify(currentSubscriptions)) {
          console.log('🔄 Syncing activeSubscriptions:', currentSubscriptions);
          return currentSubscriptions;
        }
        return prevSubs;
      });
    }, 3000); // Sync every 3 seconds instead of on every price update
    
    return () => clearInterval(syncInterval);
  }, []); // ✅ No dependencies - stable periodic sync

  // 🎯 PHASE 1: Removed setupRealtimeFallback - redundant subscription causing 3x duplication

  // 🚨 CRITICAL FIX: Add cleanup for reconnect timeout
  useEffect(() => {
    // Cleanup any existing timeouts when component unmounts
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }
      if (uiUpdateTimeoutRef.current) {
        clearTimeout(uiUpdateTimeoutRef.current);
        uiUpdateTimeoutRef.current = null;
      }
      if (watchdogIntervalRef.current) {
        clearInterval(watchdogIntervalRef.current);
        watchdogIntervalRef.current = null;
      }
    };
  }, []);

  // PHASE 3: Sync isPriceSubscriptionAllowed to ref for watchdog
  useEffect(() => {
    isPriceSubscriptionAllowedRef.current = isPriceSubscriptionAllowed;
  }, [isPriceSubscriptionAllowed]);

  // 🎯 PHASE 4: Smart Database Polling with Strict Conditions
  useEffect(() => {
    const symbolsArray = Array.from(subscriptionsRef.current.keys());
    if (symbolsArray.length === 0) return;

    // 🎯 PHASE 2: STRICT CONDITIONS - Only poll if ALL these are met
    const now = Date.now();
    const timeSinceLastUpdate = lastUpdated ? now - lastUpdated.getTime() : Infinity;
    // Emergency trigger only after 120 seconds (2 minutes) of no updates
    const isBroadcastStale = timeSinceLastUpdate > 120000;
    const isConnectionBroken = connectionStatus === 'error' || connectionStatus === 'disconnected';
    
    // Only enable polling in extreme emergency when broadcast is completely dead
    if (isConnectionBroken && isBroadcastStale && symbolsArray.length > 0) {
      console.log('🚨 PHASE 2: Emergency database polling activated (broadcast stale > 2 minutes)');
      
      const pollInterval = setInterval(async () => {
        try {
          // Only poll for top 2 critical symbols to minimize load
          const criticalSymbols = symbolsArray.slice(0, 2);
          
          const { data, error } = await supabase
            .from('market_prices')
            .select('*')
            .in('symbol', criticalSymbols)
            .order('timestamp', { ascending: false })
            .limit(2);
          
          if (error) throw error;
          
          if (data && data.length > 0) {
            data.forEach(row => {
              const toNum = (v: any) => (v === null || v === undefined || v === '' ? undefined : Number(v));
              const nBid = toNum(row.bid);
              const nAsk = toNum(row.ask);
              const nMid = toNum(row.mid);
              
              const price = nMid ?? (nBid && nAsk ? (nBid + nAsk) / 2 : nBid ?? nAsk ?? 0);
              
              const priceData: PriceData = {
                symbol: row.symbol,
                price,
                change: 0,
                changePercent: 0,
                timestamp: row.timestamp,
                receivedAt: Date.now(),
                bid: nBid,
                ask: nAsk,
                mid: nMid
              };
              
              setInternalPrices(prev => ({ ...prev, [row.symbol]: priceData }));
              setPrices(prev => ({ ...prev, [row.symbol]: priceData }));
              
              // 🔧 FIX: Update arrivalTimestamp for accurate age calculation
              arrivalTimestamps.current.set(row.symbol, Date.now());
            });
            console.log(`⏰ Updated arrivalTimestamps for ${criticalSymbols.length} symbols (emergency polling)`);
            setLastUpdated(new Date());
            console.log('✅ Emergency polling: Updated prices for', criticalSymbols);
          }
        } catch (error) {
          console.error('Emergency polling failed:', error);
        }
      }, 30000); // 🎯 PHASE 2: Poll every 30 seconds (reduced from 15s)
      
      return () => clearInterval(pollInterval);
    }
  }, [connectionStatus, lastUpdated]);

  // 🎯 PHASE 1: Removed fallback timer - no longer needed without setupRealtimeFallback
  
  // 🎯 PHASE 4: Realtime usage monitoring - reset stats hourly and warn on high usage
  useEffect(() => {
    const resetInterval = setInterval(() => {
      setRealtimeStats(prev => {
        const hourlyRate = prev.messagesReceived;
        const newPeak = Math.max(hourlyRate, prev.peakHourlyRate);
        
        // Warn if usage exceeds 400 messages/hour
        if (hourlyRate > 400) {
          console.warn(`⚠️ High Realtime usage detected: ${hourlyRate} messages/hour (target: <400)`);
        }
        
        console.log(`📊 Realtime Stats - Messages this hour: ${hourlyRate}, Peak: ${newPeak}, Avg: ${prev.hourlyAverage}`);
        
        return {
          messagesReceived: 0,
          hourlyAverage: hourlyRate,
          lastResetTime: Date.now(),
          peakHourlyRate: newPeak
        };
      });
    }, 3600000); // Reset every hour
    
    return () => clearInterval(resetInterval);
  }, []);

  // 🔥 PHASE 4: Removed health check interval to reduce Realtime message overhead

  // 🔧 FIX: Stable callback functions to prevent infinite re-render loops
  const getConnectionHealth = useCallback(() => ({ 
    isHealthy: connectionStatus === 'connected', 
    lastUpdate: lastUpdated 
  }), [connectionStatus, lastUpdated]);

  const getArrivalAge = useCallback((symbol: string) => {
    const arrivalTime = arrivalTimestamps.current.get(normalizeSymbol(symbol) || '');
    return arrivalTime ? Date.now() - arrivalTime : Infinity;
  }, [lastUpdated]); // 🔥 REACTIVE FIX: Depends on lastUpdated to force re-creation

  const getInternalPrice = useCallback((symbol: string) => {
    return internalPrices[normalizeSymbol(symbol) || ''] || null;
  }, [internalPrices]);

  // Simple context value with all required functions
  const contextValue = useMemo<OptimizedWebSocketContextType>(() => ({
    prices,
    internalPrices,
    connectionStatus,
    error,
    lastUpdated,
    dataSource: 'database_polling',
    uiThrottleMs: UI_UPDATE_THROTTLE_MS,
    isConnected: connectionStatus === 'connected',
    errors: {},
    subscribe,
    unsubscribe,
    getPrice: (symbol: string) => prices[normalizeSymbol(symbol) || ''] || null,
    getInternalPrice,
    refreshPrice: async () => {},
    getConnectionHealth,
    // 🚨 PHASE 3: Enhanced Active Symbols tracking with logging
    getActiveSymbolsCount: () => {
      const count = subscriptionsRef.current.size;
      console.log(`📊 Active symbols count: ${count}`, Array.from(subscriptionsRef.current.keys()));
      return count;
    },
    getActiveSymbols: () => {
      const symbols = Array.from(subscriptionsRef.current.keys());
      console.log(`📋 Active symbols:`, symbols);
      return symbols;
    },
    getStats: () => ({
      messagesReceived: statsRef.current.messagesReceived,
      reconnections: statsRef.current.reconnections,
      avgLatency: statsRef.current.latencyCount > 0 
        ? statsRef.current.latencySum / statsRef.current.latencyCount 
        : 0,
      activeSymbols: subscriptionsRef.current.size,
      connectionStatus
    }),
    restartConnection,
    emergencyRestart,
    getProviderStabilityStatus: () => ({ 
      isBlocked: false, 
      canMount: true, 
      metrics: providerStabilityService.getProviderMetrics('OptimizedWebSocketPriceProvider') 
    }),
    isUsingEnhancedSystem: true,
    getDataAge: (symbol: string) => {
      const priceData = internalPrices[normalizeSymbol(symbol) || ''];
      if (!priceData) return Infinity;
      return Math.floor((Date.now() - new Date(priceData.timestamp).getTime()) / 1000);
    },
    getConnectionQuality: () => {
      // 🚀 CRITICAL FIX: Support 'polling' status for database polling mode
      if ((connectionStatus === 'connected' || connectionStatus === 'polling') && lastUpdated) {
        const ageMs = Date.now() - lastUpdated.getTime();
        // 🚀 Adjust threshold for 2s polling: 6s = 3 missed polls before showing "hydrated"
        return ageMs < 6000 ? 'live' : 'hydrated';
      }
      return Object.keys(prices).length > 0 ? 'hydrated' : 'stale';
    },
    getArrivalAge
  }), [prices, internalPrices, connectionStatus, error, lastUpdated, subscribe, unsubscribe, getConnectionHealth, getArrivalAge, getInternalPrice]);

  // Show loading state until provider is ready
  if (!isProviderReady) {
    return (
      <OptimizedWebSocketContext.Provider value={{
        prices: {},
        connectionStatus: 'connecting',
        error: null,
        lastUpdated: null,
        dataSource: 'database_polling',
        uiThrottleMs: UI_UPDATE_THROTTLE_MS,
        subscribe: () => {},
        unsubscribe: () => {},
        getPrice: () => null,
        getInternalPrice: () => null,
        getDataAge: () => 0,
        getConnectionQuality: () => 'stale',
        getArrivalAge: () => 0,
        internalPrices: {},
        restartConnection: () => Promise.resolve(),
        isConnected: false,
        errors: {},
        refreshPrice: () => {},
        getConnectionHealth: () => ({ isHealthy: false, lastUpdate: null }),
        getActiveSymbolsCount: () => 0,
        getActiveSymbols: () => [],
        getStats: () => ({ messagesReceived: 0, reconnections: 0, avgLatency: 0, activeSymbols: 0, connectionStatus: 'connecting' }),
        isUsingEnhancedSystem: false,
        // Emergency functions
        emergencyRestart: () => {},
        getProviderStabilityStatus: () => ({ isBlocked: false, canMount: true, metrics: null })
      }}>
        {children}
      </OptimizedWebSocketContext.Provider>
    );
  }

  return (
    <OptimizedWebSocketContext.Provider value={contextValue}>
      {children}
    </OptimizedWebSocketContext.Provider>
  );
};