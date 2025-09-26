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
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
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
  getStats?: () => { 
    messagesReceived: number; 
    reconnections: number; 
    avgLatency: number;
  };
  restartConnection: () => void;
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
      isUsingEnhancedSystem: false
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
  // 🚨 PHASE 1: Provider stability tracking - moved BEFORE any hooks
  const mountTimeRef = useRef(Date.now());
  const initCountRef = useRef(0);
  
  initCountRef.current++;
  const initTime = Date.now();
  const timeSinceMount = initTime - mountTimeRef.current;
  
  // 🚨 CRITICAL: Check provider stability BEFORE any hooks to prevent hook violations
  const canMount = providerStabilityService.registerProviderMount('OptimizedWebSocketPriceProvider');
  
  // 🚨 CRITICAL: Detect rapid re-initialization (restart loop)
  if (initCountRef.current > 1 && timeSinceMount < 10000) {
    console.error(`🚨 PROVIDER RESTART LOOP DETECTED: Init #${initCountRef.current} after only ${timeSinceMount}ms`);
    console.error('🔍 Restart cause investigation needed - parent component re-rendering');
  }
  
  console.log(`🚀 OptimizedWebSocketPriceProvider initializing... (Init #${initCountRef.current}, ${timeSinceMount}ms since mount)`);
  
  // 🚨 CRITICAL FIX: Create fallback value before hooks to avoid hook violations
  const fallbackValue: OptimizedWebSocketContextType = {
    prices: {},
    connectionStatus: 'disconnected',
    error: canMount ? null : 'Provider restart loop detected - temporarily disabled',
    lastUpdated: null,
    dataSource: 'fallback',
    uiThrottleMs: 3500,
    subscribe: () => {},
    unsubscribe: () => {},
    getPrice: () => null,
    getInternalPrice: () => null,
    getDataAge: () => Infinity,
    getConnectionQuality: () => 'stale',
    getArrivalAge: () => Infinity,
    internalPrices: {},
    restartConnection: () => Promise.resolve(),
    isConnected: false,
    errors: {},
    refreshPrice: () => {},
    getConnectionHealth: () => ({ isHealthy: false, lastUpdate: null }),
    isUsingEnhancedSystem: false
  };

  // 🚨 CRITICAL FIX: Return fallback BEFORE any hooks if can't mount
  if (!canMount) {
    console.error('🚨 OptimizedWebSocketPriceProvider mount blocked due to restart loop');
    
    return (
      <OptimizedWebSocketContext.Provider value={fallbackValue}>
        {children}
      </OptimizedWebSocketContext.Provider>
    );
  }
  
  // Provider initialization state
  const [isProviderReady, setIsProviderReady] = useState(false);
  
  const healthMonitor = useRealtimeHealth();
  const { isLeader, tabId, tabCount } = useSingleTabLeadership();
  const isPriceSubscriptionAllowed = useRealtimeGate('prices');
  const { recordConnection, recordClampActivation } = useRealtimeTelemetry();
  const telemetry = useTelemetry();
  const { isGlobalLeader, isEnforced } = useGlobalPreviewControl();
  const { shouldAllowQualityChange } = useConnectionStability();
  
  // 🔥 LEAK-PROOF: Deterministic channel ID for definitive logging
  const channelIdRef = useRef(generateChannelId('prices'));
  const mountOnlyRef = useRef(false); // 🔥 LEAK-PROOF: Prevent operations after unmount
  
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
  
  // Mark provider as ready after initial state setup
  useEffect(() => {
    console.log(`🔧 Provider mounting... (Init #${initCountRef.current})`);
    
    // 🚨 PHASE 1: Log mount event
    realtimeMessageDiagnostics.logEvent('OptimizedWebSocketPriceProvider', 'mount', {
      initCount: initCountRef.current,
      tabId,
      tabCount,
      isLeader
    });
    
    // 🚨 PHASE 1: Track mount/unmount cycles
    mountOnlyRef.current = true;
    setIsProviderReady(true);
    
    console.log(`✅ OptimizedWebSocketPriceProvider ready (Init #${initCountRef.current})`);
    
    // 🚨 PHASE 1: Cleanup tracking on unmount
    return () => {
      console.log(`🧹 OptimizedWebSocketPriceProvider unmounting (Init #${initCountRef.current})`);
      realtimeMessageDiagnostics.logEvent('OptimizedWebSocketPriceProvider', 'unmount', {
        initCount: initCountRef.current
      });
      mountOnlyRef.current = false;
      providerStabilityService.registerProviderUnmount('OptimizedWebSocketPriceProvider');
    };
  }, []);
  
  // UI prices: Throttled updates for calm user experience (exposed to components)
  const [prices, setPrices] = useState<Record<string, PriceData>>(internalPrices);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Connection state management
  const connectionStateRef = useRef<ConnectionState>({
    status: 'disconnected',
    attempt: 0,
    nextRetryAt: null,
    errorCount: 0,
    lastSuccessAt: null,
  });

  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
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
  
  // 🚀 ACTIVITY-BASED RESOURCE MANAGEMENT: Register UI activity for cost optimization
  const { registerInteraction } = useUIActivityRegistration(Array.from(subscriptionsRef.current.keys()));

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
  
  // PHASE B: BroadcastChannel for leader/follower fanout
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isFollowerRef = useRef(false);
  
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

  // 🚀 PHASE 2: "Hydrate and Subscribe" - Database-first price loading
  const hydrateFromDatabase = useCallback(async (symbols: string[]) => {
    if (symbols.length === 0) return;
    
    console.log('🔄 Hydrating prices from database for:', symbols);
    
    try {
      const promises = symbols.map(async (symbol) => {
        const { data, error } = await supabase.rpc('get_latest_market_price', { 
          p_symbol: symbol.toUpperCase() 
        });
        
        if (error) {
          console.warn(`❌ Database hydration failed for ${symbol}:`, error);
          return null;
        }
        
        if (data && data.length > 0) {
          const priceInfo = data[0];
          console.log(`💾 Database hydration: ${symbol} = $${priceInfo.price} (${priceInfo.age_seconds}s old)`);
          
          return {
            symbol: priceInfo.symbol,
            price: parseFloat(priceInfo.price.toString()),
            change: 0, // We don't calculate change from database
            changePercent: 0,
            timestamp: priceInfo.last_updated,
            bid: priceInfo.bid ? parseFloat(priceInfo.bid.toString()) : undefined,
            ask: priceInfo.ask ? parseFloat(priceInfo.ask.toString()) : undefined,
            mid: priceInfo.mid ? parseFloat(priceInfo.mid.toString()) : undefined,
          };
        }
        
        return null;
      });
      
      const results = await Promise.all(promises);
      const validPrices = results.filter(Boolean) as PriceData[];
      
      if (validPrices.length > 0) {
        // 🚀 FRONTEND THROTTLING: Update both internal and UI prices immediately for database hydration
        setInternalPrices(prev => {
          const updated = { ...prev };
          validPrices.forEach(priceData => {
            updated[priceData.symbol] = priceData;
            
            // 🚀 CRITICAL FIX: Set timestamp for quality detection to prevent flicker
            // This ensures getConnectionQuality() sees fresh data from database hydration
            const arrivalTime = Date.now();
            priceUpdateTimestamps.current.set(priceData.symbol, Date.parse(priceData.timestamp));
            arrivalTimestamps.current.set(priceData.symbol, arrivalTime); // Track arrival time for sub-2s guarantee
          });
          return updated;
        });
        
        // For initial hydration, update UI prices immediately
        setPrices(prev => {
          const updated = { ...prev };
          validPrices.forEach(priceData => {
            updated[priceData.symbol] = priceData;
          });
          return updated;
        });
        
        setLastUpdated(new Date());
        console.log(`✅ Database hydration complete: ${validPrices.length}/${symbols.length} symbols loaded`);
      } else {
        console.log('ℹ️ No prices found in database for requested symbols');
      }
      
    } catch (error) {
      console.error('❌ Database hydration error:', error);
    }
  }, []);

  // PHASE 1: Connection State Management with Circuit Breaker
  const updateConnectionState = useCallback((updates: Partial<ConnectionState>) => {
    connectionStateRef.current = { ...connectionStateRef.current, ...updates };
    setConnectionStatus(connectionStateRef.current.status === 'circuit-breaker' ? 'error' : connectionStateRef.current.status);
  }, []);

  const isCircuitBreakerOpen = useCallback(() => {
    const state = connectionStateRef.current;
    return state.status === 'circuit-breaker' || 
           (state.errorCount >= CIRCUIT_BREAKER_CONFIG.maxConsecutiveFailures &&
            Date.now() < (state.nextRetryAt || 0));
  }, []);

  const calculateRetryDelay = useCallback((attempt: number): number => {
    const baseDelay = Math.min(
      CIRCUIT_BREAKER_CONFIG.baseRetryDelay * Math.pow(CIRCUIT_BREAKER_CONFIG.retryMultiplier, attempt),
      CIRCUIT_BREAKER_CONFIG.maxRetryDelay
    );
    
    const jitter = baseDelay * CIRCUIT_BREAKER_CONFIG.jitterRange * (Math.random() - 0.5);
    return Math.max(baseDelay + jitter, 1000); // Minimum 1 second
  }, []);

  // 🔥 LEAK-PROOF: Stable disconnect function with definitive logging
  const disconnect = useCallback(() => {
    // Clear all timers first
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }

    // Mark as intentional close to ignore CLOSED/TIMED_OUT noise
    manualCloseRef.current = true;

    // 🔥 DEFINITIVE LOGGING: Clean up channel with deterministic logging
    if (channelRef.current) {
      realtimeLogger.logUnsubscribe(channelIdRef.current, 'OptimizedWebSocketPriceProvider');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    isConnectingRef.current = false;
    updateConnectionState({ status: 'disconnected' });
    
    // Track telemetry (health monitor unregistration only happens on unmount)
    recordConnection();

    // Reset manual close flag shortly after cleanup
    setTimeout(() => { manualCloseRef.current = false; }, 1000);
  }, [updateConnectionState]); // 🔥 LEAK-PROOF: Minimal dependencies

  // 🔥 LEAK-PROOF: Connection with mount guards and emergency breaker
  const connect = useCallback(async () => {
    // 🚨 PHASE 1: Provider-level circuit breaker for restart loops
    const timeSinceMount = Date.now() - mountTimeRef.current;
    if (timeSinceMount < 5000 && initCountRef.current > 2) {
      console.error(`🚨 Provider restart loop detected - blocking connection (${initCountRef.current} inits in ${timeSinceMount}ms)`);
      emergencyRealtimeBreaker.recordFailure('Provider restart loop detected');
      return;
    }
    
    // 🚨 EMERGENCY BREAKER: Check if realtime operations are allowed
    if (!emergencyRealtimeBreaker.canAllowRealtimeOperation('connection')) {
      if (isDevToolsEnabled()) {
        console.log('WS-P: connect blocked by emergency breaker');
      }
      return;
    }
    
    // 🔥 LEAK-PROOF: Block connect after unmount
    if (!mountOnlyRef.current) {
      if (isDevToolsEnabled()) {
        console.log('WS-P: connect blocked (component unmounted)');
      }
      return;
    }
    
    // Guard: Block connect if actually background disconnected (not just timer pending)
    if (isBackgroundDisconnected.current) {
      if (isDevToolsEnabled()) {
        console.log('WS-P: connect blocked (background disconnected)');
      }
      return;
    }
    
    // 🔥 LEAK-PROOF: Connection guards with better logging
    if (isConnectingRef.current || channelRef.current || isCircuitBreakerOpen()) {
      if (isDevToolsEnabled()) {
        console.log('🚫 Connection attempt blocked:', {
          isConnecting: isConnectingRef.current,
          hasChannel: !!channelRef.current,
          circuitOpen: isCircuitBreakerOpen()
        });
      }
      return;
    }

    isConnectingRef.current = true;
    updateConnectionState({ status: 'connecting' });
    setError(null);

    try {
      // 🔥 DEFINITIVE LOGGING: Always log subscription attempts
      realtimeLogger.logSubscribe(channelIdRef.current, 'live-prices-broadcast', 'OptimizedWebSocketPriceProvider');

      // PHASE 2: Create optimized channel WITHOUT presence (reduces 90% of messages)
      const channel = supabase.channel('live-prices-broadcast', {
        config: {
          broadcast: { self: false }, // Don't echo our own messages
          // NO PRESENCE - this was causing message explosion
        }
      });

      channelRef.current = channel;

      // PHASE 4: Set up rate-limited message handler with batching
      // V2 event listener for legacy compatibility
      channel.on('broadcast', { event: 'price_update' }, ({ payload }) => {
        handlePriceUpdate(payload, 'price_update');
      });

      // V3 event listener for new versioned events
      channel.on('broadcast', { event: 'price_update_v3' }, ({ payload }) => {
        handlePriceUpdate(payload, 'price_update_v3');
      });

      const handlePriceUpdate = (payload: any, eventVersion: 'price_update' | 'price_update_v3') => {
        try {
          const normalizedSymbol = normalizeSymbol(payload?.symbol);
          if (!normalizedSymbol || !subscriptionsRef.current.has(normalizedSymbol)) {
            return; // Skip unsubscribed symbols
          }

        // 🚀 FRONTEND THROTTLING: No rate limiting here - let all backend data through
        const now = Date.now();

        // 🚨 EMERGENCY MESSAGE FILTER: Block messages not allowed by breaker
        if (!emergencyRealtimeBreaker.recordMessage(eventVersion)) {
          return; // Message blocked by emergency breaker
        }
        // 🔥 SAMPLED TELEMETRY: Only record 1 in 50 price messages to reduce overhead
        if (Math.random() < 0.02) { // 2% sampling rate for price events
          telemetry.record(eventVersion);
          costTracker.recordRealtimeMessage('price_update');
          pricePerformanceMonitor.recordPriceUpdate();
          
          // Dev-only logging with session info (sampled)
          if (isDevToolsEnabled()) {
            console.log(`📊 Price event: ${eventVersion} | Session: ${telemetry.sessionInfo.sessionId} | Build: ${telemetry.sessionInfo.buildVersion}`);
          }
        }
          
          // 🔥 SAMPLED LATENCY: Only calculate latency for 1 in 20 messages
          if (payload.ts && Math.random() < 0.05) { // 5% sampling rate for latency
            const latency = Date.now() - new Date(payload.ts).getTime();
            statsRef.current.latencySum += latency;
            statsRef.current.latencyCount++;
            pricePerformanceMonitor.recordLatency(latency);
          }
          
          const arrivalTime = now; // Capture arrival time for sub-2s guarantee
          const priceData: PriceData = {
            symbol: normalizedSymbol,
            price: payload.price,
            change: payload.change || 0,
            changePercent: payload.changePercent || 0,
            timestamp: payload.ts || new Date().toISOString(),
            receivedAt: arrivalTime, // New: Track client arrival time
            bid: payload.bid,
            ask: payload.ask,
            mid: payload.mid
          };
          
          // Track arrival timestamp for ultra-responsive age calculation
          arrivalTimestamps.current.set(normalizedSymbol, arrivalTime);

          // 🎯 Mark symbol as having received realtime update
          realtimeReceivedSymbols.current.add(normalizedSymbol);
          
          // 🚀 FRONTEND THROTTLING: Update internal prices immediately (maintain data freshness)
          setInternalPrices(prev => ({ ...prev, [normalizedSymbol]: priceData }));
          setLastUpdated(new Date());
          
          // Track price update timestamp for quality detection
          priceUpdateTimestamps.current.set(normalizedSymbol, Date.parse(priceData.timestamp));
          
          // 🚀 SMART UI THROTTLING: Determine if this update needs immediate UI visibility
          const previousPrice = prices[normalizedSymbol]?.price;
          let shouldUpdateUI = false;
          
          if (previousPrice) {
            const changePercent = Math.abs((priceData.price - previousPrice) / previousPrice);
            
            // Critical changes bypass throttling for immediate UI updates
            if (changePercent >= SIGNIFICANCE_THRESHOLDS.CRITICAL) {
              significantUpdatesRef.current.add(normalizedSymbol);
              shouldUpdateUI = true;
            }
            // Major changes get priority in next scheduled update
            else if (changePercent >= SIGNIFICANCE_THRESHOLDS.MAJOR) {
              significantUpdatesRef.current.add(normalizedSymbol);
            }
            // 🔥 LIVE PRICE WIDGET BYPASS: Always update immediately for live price displays
            else if (CRITICAL_TRADING_EVENTS.LIVE_PRICE_WIDGET) {
              shouldUpdateUI = true;
            }
          } else {
            // First time receiving this symbol - show immediately
            shouldUpdateUI = true;
          }
          
          // Add to UI buffer for throttled updates
          uiUpdateBuffer.current.set(normalizedSymbol, priceData);
          
          // Immediate UI update for critical changes
          if (shouldUpdateUI) {
            setPrices(prev => ({ ...prev, [normalizedSymbol]: priceData }));
            lastUIUpdateRef.current.set(normalizedSymbol, Date.now());
            uiUpdateBuffer.current.delete(normalizedSymbol); // Remove from buffer since we updated immediately
          } else {
            // Schedule throttled UI updates for non-critical changes
            scheduleUIUpdate();
          }
          
          // 🔥 SAMPLED UI TRACKING: Only record 1 in 10 UI updates
          if (Math.random() < 0.1) {
            pricePerformanceMonitor.recordUIUpdate();
          }
          
          // Cache internal prices to sessionStorage with timestamp and arrival times
          try {
            const cacheData = {
              prices: { [normalizedSymbol]: priceData },
              timestamp: Date.now(),
              arrivalTimes: { [normalizedSymbol]: arrivalTimestamps.current.get(normalizedSymbol) }
            };
            const existingCache = sessionStorage.getItem('cached_prices');
            const existingData = existingCache ? JSON.parse(existingCache) : { prices: {}, arrivalTimes: {} };
            
            sessionStorage.setItem('cached_prices', JSON.stringify({
              prices: { ...existingData.prices, ...cacheData.prices },
              timestamp: cacheData.timestamp,
              arrivalTimes: { ...existingData.arrivalTimes, ...cacheData.arrivalTimes }
            }));
          } catch (error) {
            // Ignore sessionStorage errors (quota exceeded, etc.)
          }
      
          // PHASE B: BroadcastChannel fanout - Leader broadcasts to followers
          if (isLeader && broadcastChannelRef.current) {
            try {
              broadcastChannelRef.current.postMessage({
                type: 'price-update',
                data: { [normalizedSymbol]: priceData },
                timestamp: Date.now()
              });
            } catch (error) {
              if (isDevToolsEnabled()) {
                console.warn('📡 BroadcastChannel send failed:', error);
              }
            }
          }
          
        } catch (err) {
          // PHASE 5: Throttle identical error logs
          const errorMsg = `Error processing price update: ${err}`;
          if (lastErrorLogRef.current === errorMsg) {
            errorLogCountRef.current++;
            if (errorLogCountRef.current % 10 === 0) {
              console.error(`❌ ${errorMsg} (${errorLogCountRef.current} times)`);
            }
          } else {
            console.error('❌', errorMsg);
            lastErrorLogRef.current = errorMsg;
            errorLogCountRef.current = 1;
          }
        }
      };

      // Subscribe with enhanced error handling
      channel.subscribe((status) => {
        if (isDevToolsEnabled()) {
          console.log('🔌 Connection status:', status);
        }
        
        if (status === 'SUBSCRIBED') {
          // Deterministic subscribe logging
          if (isDevToolsEnabled()) {
            console.log(`WS-P: SUBSCRIBE [${channelIdRef.current}] name=live-prices-broadcast`);
          }
          
          // Success: Reset circuit breaker
          updateConnectionState({
            status: 'connected',
            attempt: 0,
            errorCount: 0,
            nextRetryAt: null,
            lastSuccessAt: Date.now()
          });
          
          statsRef.current.reconnections++;
          recordConnection(); // Track telemetry
          isConnectingRef.current = false;
          startHealthMonitoring();
          
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          const state = connectionStateRef.current;

          // Ignore intentional closes to prevent false errors
          if (manualCloseRef.current && status === 'CLOSED') {
            if (isDevToolsEnabled()) {
              console.log('ℹ️ Channel closed intentionally');
            }
            updateConnectionState({ status: 'disconnected' });
            setError(null);
            isConnectingRef.current = false;
            channelRef.current = null;
            manualCloseRef.current = false;
            return;
          }

          // Handle connection errors with exponential backoff
          const newAttempt = state.attempt + 1;
          const newErrorCount = state.errorCount + 1;
          
          if (newErrorCount >= CIRCUIT_BREAKER_CONFIG.maxConsecutiveFailures) {
            const retryDelay = CIRCUIT_BREAKER_CONFIG.breakerOpenDuration;
            updateConnectionState({
              status: 'circuit-breaker',
              attempt: newAttempt,
              errorCount: newErrorCount,
              nextRetryAt: Date.now() + retryDelay
            });
            
            setError(`Connection failed ${newErrorCount} times. Circuit breaker opened. Retrying in ${retryDelay/1000}s`);
            
            setTimeout(() => {
              if (mountOnlyRef.current && subscriptionsRef.current.size > 0) {
                connect();
              }
            }, retryDelay);
          } else {
            updateConnectionState({ 
              status: 'error', 
              attempt: newAttempt,
              errorCount: newErrorCount
            });
            
            const retryDelay = calculateRetryDelay(newAttempt);
            setError(`Connection ${status.toLowerCase()}. Retrying in ${Math.round(retryDelay/1000)}s (attempt ${newAttempt})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (mountOnlyRef.current && subscriptionsRef.current.size > 0) {
                connect();
              }
            }, retryDelay);
          }
          
          isConnectingRef.current = false;
          channelRef.current = null;
        }
      });

    } catch (error) {
      console.error('❌ Connection setup error:', error);
      updateConnectionState({ status: 'error', errorCount: connectionStateRef.current.errorCount + 1 });
      setError(`Setup failed: ${error.message}`);
      isConnectingRef.current = false;
      
      // Retry with exponential backoff
      const retryDelay = calculateRetryDelay(connectionStateRef.current.attempt + 1);
      reconnectTimeoutRef.current = setTimeout(() => {
        if (mountOnlyRef.current && subscriptionsRef.current.size > 0) {
          connect();
        }
      }, retryDelay);
    }
  }, [updateConnectionState, calculateRetryDelay]); // 🔥 LEAK-PROOF: Minimal dependencies

  // Health monitoring function
  const startHealthMonitoring = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }
    
    healthCheckIntervalRef.current = setInterval(() => {
      const now = Date.now();
      const lastSuccess = connectionStateRef.current.lastSuccessAt;
      
      if (lastSuccess && (now - lastSuccess) > HEALTH_CONFIG.maxSilentPeriod) {
        if (isDevToolsEnabled()) {
          console.warn('🔄 Health check: No updates for too long, reconnecting...');
        }
        disconnect();
        if (subscriptionsRef.current.size > 0) {
          setTimeout(() => connect(), 1000);
        }
      }
    }, HEALTH_CONFIG.healthCheckInterval);
  }, [disconnect, connect]);

  // PHASE 1: Enhanced subscription management with ref counting
  const subscribe = useCallback((symbols: string[]) => {
    if (!isPriceSubscriptionAllowed) {
      if (isDevToolsEnabled()) {
        console.log('WS-P: subscription blocked by route gate');
      }
      return;
    }

    const validSymbols = symbols
      .map(s => normalizeSymbol(s))
      .filter(s => s && ALLOWED_SYMBOLS.includes(s as any));

    if (validSymbols.length === 0) {
      if (isDevToolsEnabled()) {
        console.warn('WS-P: no valid symbols to subscribe to');
      }
      return;
    }

    // Update subscription ref counts
    let newSubscriptions = false;
    validSymbols.forEach(symbol => {
      const currentCount = subscriptionsRef.current.get(symbol) || 0;
      if (currentCount === 0) {
        newSubscriptions = true;
      }
      subscriptionsRef.current.set(symbol, currentCount + 1);
    });

    // 🚀 PHASE 2: Hydrate from database FIRST, then connect to Realtime
    hydrateFromDatabase(validSymbols).then(() => {
      // Only connect if we have new subscriptions and no active connection
      if (newSubscriptions && !channelRef.current && !isConnectingRef.current) {
        connect();
      }
    });

    if (isDevToolsEnabled()) {
      console.log('WS-P: subscribed to:', validSymbols.map(s => 
        `${s}(${subscriptionsRef.current.get(s)})`
      ).join(', '));
    }
  }, [isPriceSubscriptionAllowed, connect, hydrateFromDatabase]);

  const unsubscribe = useCallback((symbols: string[]) => {
    const validSymbols = symbols
      .map(s => normalizeSymbol(s))
      .filter(s => s);

    validSymbols.forEach(symbol => {
      const currentCount = subscriptionsRef.current.get(symbol) || 0;
      if (currentCount <= 1) {
        subscriptionsRef.current.delete(symbol);
      } else {
        subscriptionsRef.current.set(symbol, currentCount - 1);
      }
    });

    // Disconnect if no active subscriptions
    if (subscriptionsRef.current.size === 0 && channelRef.current) {
      disconnect();
    }

    if (isDevToolsEnabled()) {
      console.log('WS-P: unsubscribed from:', validSymbols);
    }
  }, [disconnect]);

  // 🚀 FRONTEND THROTTLING: Smart UI update scheduler
  const scheduleUIUpdate = useCallback(() => {
    if (uiUpdateTimeoutRef.current) return; // Already scheduled
    
    uiUpdateTimeoutRef.current = setTimeout(() => {
      if (uiUpdateBuffer.current.size > 0) {
        const bufferedUpdates = Object.fromEntries(uiUpdateBuffer.current);
        
        // Prioritize significant updates
        const prioritizedUpdates: Record<string, PriceData> = {};
        const normalUpdates: Record<string, PriceData> = {};
        
        Object.entries(bufferedUpdates).forEach(([symbol, priceData]) => {
          if (significantUpdatesRef.current.has(symbol)) {
            prioritizedUpdates[symbol] = priceData;
            significantUpdatesRef.current.delete(symbol);
          } else {
            normalUpdates[symbol] = priceData;
          }
        });
        
        // Update UI with prioritized updates first, then normal updates
        const allUpdates = { ...normalUpdates, ...prioritizedUpdates };
        
        setPrices(prev => ({ ...prev, ...allUpdates }));
        
        // Update timestamps for UI updates
        Object.keys(allUpdates).forEach(symbol => {
          lastUIUpdateRef.current.set(symbol, Date.now());
        });
        
        uiUpdateBuffer.current.clear();
        
        if (isDevToolsEnabled()) {
          console.log(`📺 UI Update: ${Object.keys(allUpdates).length} symbols (${Object.keys(prioritizedUpdates).length} priority)`);
        }
      }
      
      uiUpdateTimeoutRef.current = null;
    }, UI_UPDATE_THROTTLE_MS);
  }, []);

  // Get price function (returns UI-throttled prices for user experience)
  const getPrice = useCallback((symbol: string): PriceData | null => {
    const normalizedSymbol = normalizeSymbol(symbol);
    return normalizedSymbol ? (prices[normalizedSymbol] || null) : null;
  }, [prices]);

  // Get internal price function (always fresh data for trading logic)
  const getInternalPrice = useCallback((symbol: string): PriceData | null => {
    const normalizedSymbol = normalizeSymbol(symbol);
    return normalizedSymbol ? (internalPrices[normalizedSymbol] || null) : null;
  }, [internalPrices]);

  // 🚀 Enhanced "Hydrate and Highlight" data age and connection quality functions
  const getDataAge = useCallback((symbol: string): number => {
    // 🔥 CRITICAL FIX: Use internal price for accurate data age (not throttled UI price)
    const priceData = getInternalPrice(symbol);
    if (!priceData) return Infinity;
    
    const ageMs = Date.now() - new Date(priceData.timestamp).getTime();
    return Math.floor(ageMs / 1000); // Return age in seconds
  }, [getInternalPrice]);

  const getConnectionQuality = useCallback((symbol?: string): 'hydrated' | 'live' | 'stale' => {
    // Symbol-specific quality detection with hysteresis (sticky live) logic
    if (symbol) {
      const normalizedSymbol = normalizeSymbol(symbol);
      const now = Date.now();
      
      // 🔥 OPTIMIZED: Reduced quality cache duration for faster responsiveness
      const cachedResult = qualityResultCacheRef.current.get(normalizedSymbol);
      if (cachedResult && (now - cachedResult.timestamp) < 100) { // 100ms cache for faster updates (down from 200ms)
        return cachedResult.quality as 'live' | 'hydrated' | 'stale';
      }
      
      const priceData = getPrice(normalizedSymbol);
      
      // Get or initialize quality state for this symbol
      const currentState = qualityStateRef.current.get(normalizedSymbol) || {
        quality: 'stale',
        lastPromotedToLive: null,
        lastDemotedFromLive: null
      };

      let proposedQuality: 'live' | 'hydrated' | 'stale' = 'stale';

      if (priceData && connectionStatus === 'connected') {
        const lastTick = priceUpdateTimestamps.current.get(normalizedSymbol);
        const hasReceivedRealtime = realtimeReceivedSymbols.current.has(normalizedSymbol);
        
        if (lastTick) {
          const ageMs = now - lastTick;
          
          // 🔥 FIXED: Use 3 second threshold instead of stale threshold
          if (ageMs < 3000 && hasReceivedRealtime) {
            proposedQuality = 'live';
          }
          // DELAYED DEMOTION: live → hydrated only after 2.5+ seconds without ticks (Sub-2s guarantee)
          else if (currentState.quality === 'live') {
            const liveDemotionGraceMs = 2500; // 2.5 seconds grace period for ultra-responsive feel
            if (ageMs < liveDemotionGraceMs) {
              proposedQuality = 'live'; // Stay live during grace period
            } else {
              proposedQuality = 'hydrated';
            }
          }
          // FRESH DATA: Promote stale to hydrated for fresh data
          else if (ageMs < HEALTH_CONFIG.staleDataThreshold) {
            proposedQuality = 'hydrated';
          } else {
            proposedQuality = currentState.quality || 'stale';
          }
        } else if (priceData) {
          // Have price data but no recent tick - consider it hydrated
          proposedQuality = 'hydrated';
        }
      }
      
      // 🚀 STABILITY CHECK: Only allow quality changes if stability management approves
      if (!shouldAllowQualityChange(normalizedSymbol, currentState.quality || 'stale', proposedQuality)) {
        qualityResultCacheRef.current.set(normalizedSymbol, { 
          quality: currentState.quality || 'stale', 
          timestamp: now 
        });
        return currentState.quality || 'stale';
      }

      // Immediate promotion from stale -> hydrated when fresh data present
      if (currentState.quality === 'stale' && proposedQuality === 'hydrated') {
        const newState = {
          quality: 'hydrated' as const,
          lastPromotedToLive: null,
          lastDemotedFromLive: null
        };
        qualityStateRef.current.set(normalizedSymbol, newState);
        qualityResultCacheRef.current.set(normalizedSymbol, { quality: newState.quality, timestamp: now });
        return newState.quality;
      }

      // 🚀 ANTI-FLICKER: Use sample confirmation only when transitioning to/from live (OPTIMIZED)
      const useSamples = (proposedQuality === 'live' || currentState.quality === 'live');
      if (useSamples) {
        const sampleHistory = qualitySampleHistoryRef.current.get(normalizedSymbol) || [];
        sampleHistory.push(proposedQuality);
        if (sampleHistory.length > 2) sampleHistory.shift(); // 🔥 OPTIMIZED: Reduced from 3 to 2 samples
        qualitySampleHistoryRef.current.set(normalizedSymbol, sampleHistory);

        let finalQuality = currentState.quality || 'stale';
        const allSamplesMatch = sampleHistory.length >= 2 && sampleHistory.every(sample => sample === proposedQuality); // 🔥 OPTIMIZED: 2-sample confirmation
        if (allSamplesMatch && proposedQuality !== currentState.quality) {
          finalQuality = proposedQuality;
          const newState = {
            ...currentState,
            quality: finalQuality,
            ...(finalQuality === 'live' && currentState.quality !== 'live' ? { lastPromotedToLive: now } : {}),
            ...(finalQuality !== 'live' && currentState.quality === 'live' ? { lastDemotedFromLive: now } : {})
          };
          qualityStateRef.current.set(normalizedSymbol, newState);
        }
        qualityResultCacheRef.current.set(normalizedSymbol, { quality: finalQuality, timestamp: now });
        return finalQuality;
      }

      // For non-live transitions, apply immediate change
      if (proposedQuality !== currentState.quality) {
        const newState = {
          ...currentState,
          quality: proposedQuality,
          lastPromotedToLive: proposedQuality === 'live' ? now : currentState.lastPromotedToLive,
          lastDemotedFromLive: currentState.quality === 'live' && proposedQuality !== 'live' ? now : currentState.lastDemotedFromLive
        };
        qualityStateRef.current.set(normalizedSymbol, newState);
        qualityResultCacheRef.current.set(normalizedSymbol, { quality: newState.quality, timestamp: now });
        return newState.quality;
      }

      // No change
      qualityResultCacheRef.current.set(normalizedSymbol, { quality: currentState.quality, timestamp: now });
      return currentState.quality;
    }
    
    // Global quality detection (backward compatibility) - no hysteresis for global
    if (connectionStatus === 'connected' && lastUpdated) {
      const ageMs = Date.now() - lastUpdated.getTime();
      if (ageMs < HEALTH_CONFIG.staleDataThreshold) {
        return 'live';
      }
    }
    
    if (Object.keys(prices).length > 0) {
      return 'hydrated';
    }
    
    return 'stale';
  }, [connectionStatus, lastUpdated, prices, getPrice]);

  // Refresh price function with database fallback
  const refreshPrice = useCallback(async (symbol: string) => {
    const normalizedSymbol = normalizeSymbol(symbol);
    if (!normalizedSymbol) return;
    
    // Try to refresh from database
    await hydrateFromDatabase([normalizedSymbol]);
  }, [hydrateFromDatabase]);

  // Connection health function
  const getConnectionHealth = useCallback(() => {
    return {
      isHealthy: connectionStatus === 'connected' && !error,
      lastUpdate: lastUpdated
    };
  }, [connectionStatus, error, lastUpdated]);

  // Get arrival age function for sub-2s guarantee
  const getArrivalAge = useCallback((symbol: string): number => {
    const normalizedSymbol = normalizeSymbol(symbol);
    if (!normalizedSymbol) return Infinity;
    
    const arrivalTime = arrivalTimestamps.current.get(normalizedSymbol);
    if (!arrivalTime) return Infinity;
    
    return Date.now() - arrivalTime; // Return age in milliseconds
  }, []);

  // Get stats function
  const getStats = useCallback(() => {
    const stats = statsRef.current;
    return {
      messagesReceived: stats.messagesReceived,
      reconnections: stats.reconnections,
      avgLatency: stats.latencyCount > 0 ? Math.round(stats.latencySum / stats.latencyCount) : 0
    };
  }, []);

  // Restart connection function
  const restartConnection = useCallback(() => {
    disconnect();
    if (subscriptionsRef.current.size > 0) {
      setTimeout(() => connect(), 1000);
    }
  }, [disconnect, connect]);

  // PHASE B: Set up BroadcastChannel for multi-tab coordination
  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      broadcastChannelRef.current = new BroadcastChannel('optimized-ws-prices');
      
      broadcastChannelRef.current.onmessage = (event) => {
        if (!isLeader && event.data.type === 'prices-batch') {
          // Follower tabs receive price updates from leader
          setPrices(prev => ({ ...prev, ...event.data.data }));
          setLastUpdated(new Date(event.data.timestamp));
          isFollowerRef.current = true;
          
          // CRITICAL FIX: Update arrival timestamps for follower tabs to prevent false staleness
          const now = Date.now();
          Object.keys(event.data.data).forEach(symbol => {
            arrivalTimestamps.current.set(symbol, now);
          });
        }
      };
      
      return () => {
        if (broadcastChannelRef.current) {
          broadcastChannelRef.current.close();
          broadcastChannelRef.current = null;
        }
      };
    }
  }, [isLeader]);

  // Stabilized watchdog with 30s cooldown and individual symbol refresh
  const lastRestartTimeRef = useRef(0);
  
  useEffect(() => {
    if (connectionStatus === 'connected' && subscriptionsRef.current.size > 0) {
      watchdogIntervalRef.current = setInterval(() => {
        const now = Date.now();
        let allSymbolsStale = true;
        const staleSymbols: string[] = [];
        
        // Check all subscribed symbols
        subscriptionsRef.current.forEach((_, symbol) => {
          const arrivalAge = getArrivalAge(symbol);
          const currentStaleCount = watchdogStaleCountRef.current.get(symbol) || 0;
          
          if (arrivalAge > 6000) { // More than 6 seconds old (less aggressive)
            const newStaleCount = currentStaleCount + 1;
            watchdogStaleCountRef.current.set(symbol, newStaleCount);
            staleSymbols.push(symbol);
            
            // Individual symbol refresh before restarting connection
            if (newStaleCount >= 2 && newStaleCount < 4) {
              if (Math.random() < 0.1 && isDevToolsEnabled()) { // 10% sampling
                console.log(`🔄 Refreshing stale symbol: ${symbol} (age: ${arrivalAge}ms)`);
              }
              refreshPrice(symbol);
            }
          } else {
            // Fresh data found - not all symbols are stale
            allSymbolsStale = false;
            watchdogStaleCountRef.current.set(symbol, 0);
          }
        });
        
        // Only restart if ALL symbols are stale for 4+ checks (24s total) and no recent restart
        if (allSymbolsStale && staleSymbols.length > 0 && now - lastRestartTimeRef.current > 30000) {
          const worstStaleCount = Math.max(...staleSymbols.map(s => watchdogStaleCountRef.current.get(s) || 0));
          
          if (worstStaleCount >= 4) {
            if (Math.random() < 0.1 && isDevToolsEnabled()) { // 10% sampling
              console.log(`🚨 Watchdog: All ${staleSymbols.length} symbols stale for 24s+, restarting connection`);
            }
            watchdogStaleCountRef.current.clear();
            lastRestartTimeRef.current = now;
            restartConnection();
          }
        }
      }, 6000); // Check every 6 seconds (less frequent)

      return () => {
        if (watchdogIntervalRef.current) {
          clearInterval(watchdogIntervalRef.current);
          watchdogIntervalRef.current = null;
        }
      };
    }
  }, [connectionStatus, getArrivalAge, restartConnection, refreshPrice]);

  // Mount/unmount lifecycle management
  useEffect(() => {
    mountOnlyRef.current = true;

    return () => {
      mountOnlyRef.current = false;
      disconnect();
      
      // Clear all timers
      if (uiUpdateTimeoutRef.current) {
        clearTimeout(uiUpdateTimeoutRef.current);
      }
      
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
      
      if (watchdogIntervalRef.current) {
        clearInterval(watchdogIntervalRef.current);
        watchdogIntervalRef.current = null;
      }
    };
  }, [disconnect]);

  // Page visibility handling for background disconnection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Start disconnect timer when page becomes hidden
        visibilityTimeoutRef.current = setTimeout(() => {
          if (channelRef.current) {
            disconnect();
            isBackgroundDisconnected.current = true;
          }
        }, 60000); // Disconnect after 1 minute of being hidden
      } else {
        // Clear disconnect timer and reconnect when page becomes visible
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current);
          visibilityTimeoutRef.current = null;
        }
        
        // Always attempt reconnection if we have subscriptions and aren't connected
        if (subscriptionsRef.current.size > 0 && connectionStatus !== 'connected') {
          connect();
        }
        isBackgroundDisconnected.current = false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [connect, disconnect]);

  // Context value
  const contextValue: OptimizedWebSocketContextType = useMemo(() => ({
    prices, // UI-throttled prices for calm user experience
    connectionStatus,
    subscribe,
    unsubscribe,
    getPrice, // Returns UI-throttled prices
    isConnected: connectionStatus === 'connected',
    error,
    dataSource: isFollowerRef.current ? 'broadcast-follower' : 'realtime-leader',
    lastUpdated,
    errors: {},
    refreshPrice,
    getConnectionHealth,
    getStats,
    restartConnection,
    isUsingEnhancedSystem: true,
    // New graceful failure indicators
    getDataAge,
    getConnectionQuality,
    // Sub-2s Live Guarantee
    getArrivalAge,
    // 🚀 FRONTEND THROTTLING: Internal price access for trading logic
    getInternalPrice, // Returns always-fresh internal prices
    internalPrices, // Direct access to internal prices for advanced use cases
    uiThrottleMs: UI_UPDATE_THROTTLE_MS, // Expose throttling configuration
  }), [
    prices,
    connectionStatus,
    subscribe,
    unsubscribe,
    getPrice,
    error,
    lastUpdated,
    refreshPrice,
    getConnectionHealth,
    getStats,
    restartConnection,
    getDataAge,
    getConnectionQuality,
    getArrivalAge,
    getInternalPrice,
    internalPrices,
  ]);

  // Show loading state until provider is ready OR if provider is blocked
  if (!isProviderReady || !canMount) {
    if (!canMount) {
      console.error('🚨 OptimizedWebSocketPriceProvider blocked due to restart loop - serving minimal context');
    }
    
    return (
      <OptimizedWebSocketContext.Provider value={{
        prices: {},
        connectionStatus: 'connecting',
        error: null,
        lastUpdated: null,
        dataSource: canMount ? 'initializing' : 'blocked',
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
        isUsingEnhancedSystem: false
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