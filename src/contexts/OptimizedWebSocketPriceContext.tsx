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
  
  // PHASE 3: Track route-based subscription state
  const wasSubscriptionAllowedRef = useRef(isPriceSubscriptionAllowed);
  
  // 🔥 LEAK-PROOF: Deterministic channel ID for definitive logging
  const channelIdRef = useRef(generateChannelId('prices'));
  const mountOnlyRef = useRef(false); // 🔥 LEAK-PROOF: Prevent operations after unmount
  
  // REALTIME FALLBACK: Add postgres_changes subscription if no broadcast within 10s
  const privateFallbackChannelRef = useRef<RealtimeChannel | null>(null);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  
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
    
    console.log(`✅ OptimizedWebSocketPriceProvider ready (Init #${initCountRef.current})`);
    
    // 🚨 PHASE 1: Cleanup tracking on unmount
    return () => {
      console.log(`🧹 OptimizedWebSocketPriceProvider unmounting (Init #${initCountRef.current})`);
      mountOnlyRef.current = false;
      hasInitialized.current = false; // Reset for next mount
      
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
    if (channelRef.current || isConnectingRef.current) {
      console.log('🚫 Connection already exists or in progress');
      return;
    }

    const activeSymbols = Array.from(subscriptionsRef.current.keys());
    console.log(`🔗 Establishing realtime connection for symbols: ${activeSymbols.join(', ')}`);
    isConnectingRef.current = true;
    setConnectionStatus('connecting');

    // 🚨 PHASE 1 FIX: Correct channel name to match backend broadcast
    const channel = supabase
      .channel('live-prices-broadcast', {
        config: { 
          broadcast: { self: false },
          presence: { key: tabId }
        }
      })
      .on('broadcast', { event: 'price_update' }, (payload: any) => {
        // 🚨 PHASE 2: Enhanced connection diagnostics + robust payload parsing
        statsRef.current.messagesReceived++;
        const msg = payload?.payload ?? payload;
        console.log('📈 Live broadcast received:', msg);
        
        const {
          symbol,
          bid,
          ask,
          mid,
          price: rawPrice,
          timestamp,
        } = msg || {};
        
        if (!symbol || !subscriptionsRef.current.has(symbol)) return;
        
        // 🚨 PHASE 2: Timestamp State Lock - Only update if message is newer than database hydration
        const messageTimestamp = timestamp ? new Date(timestamp).getTime() : Date.now();
        const lastDbTimestamp = lastDatabaseTimestamp[symbol];
        
        if (lastDbTimestamp && messageTimestamp <= lastDbTimestamp) {
          console.log(`⏭️ Discarding old WebSocket message for ${symbol}: ${new Date(messageTimestamp).toISOString()} <= ${new Date(lastDbTimestamp).toISOString()}`);
          return;
        }
        
        const toNum = (v: any) => (v === null || v === undefined || v === '' ? undefined : Number(v));
        const nBid = toNum(bid);
        const nAsk = toNum(ask);
        const nMid = toNum(mid);
        const nPrice = toNum(rawPrice);
        
        const computedPrice =
          (typeof nMid === 'number' ? nMid : undefined) ??
          (typeof nBid === 'number' && typeof nAsk === 'number'
            ? (nBid + nAsk) / 2
            : undefined) ??
          (typeof nPrice === 'number' ? nPrice : undefined);
        
        if (typeof computedPrice !== 'number' || isNaN(computedPrice)) {
          console.warn('⚠️ Broadcast payload missing usable price fields:', msg);
          return;
        }
        
        const priceData: PriceData = {
          symbol,
          price: computedPrice,
          change: 0,
          changePercent: 0,
          timestamp: timestamp || new Date().toISOString(),
          receivedAt: Date.now(),
          bid: nBid,
          ask: nAsk,
          mid: nMid ?? (typeof nBid === 'number' && typeof nAsk === 'number' ? (nBid + nAsk) / 2 : undefined)
        };
        
        // Calculate change if we have previous price
        const previousPrice = internalPrices[symbol]?.price;
        if (typeof previousPrice === 'number') {
          priceData.change = priceData.price - previousPrice;
          priceData.changePercent = (priceData.change / previousPrice) * 100;
        }
        
        console.log(`✅ Accepting newer WebSocket message for ${symbol}: ${new Date(messageTimestamp).toISOString()}`);
        setInternalPrices(prev => ({ ...prev, [symbol]: priceData }));
        setPrices(prev => ({ ...prev, [symbol]: priceData }));
        setLastUpdated(new Date());
        arrivalTimestamps.current.set(symbol, Date.now());
        realtimeReceivedSymbols.current.add(symbol);
        
        console.log(`💰 Live price: ${symbol} = ${priceData.price} (${priceData.changePercent?.toFixed(2)}%)`);
      })
      .subscribe((status) => {
        // 🚨 PHASE 2: Enhanced connection status logging
        console.log(`📡 Channel subscription status: ${status}`);
        
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
          connectionStateRef.current.status = 'connected';
          connectionStateRef.current.lastSuccessAt = Date.now();
          connectionStateRef.current.errorCount = 0;
          isConnectingRef.current = false;
          // 🚨 PHASE 2: Clear any pending fallback timers on successful connection
          if (fallbackTimerRef.current) {
            clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          console.log(`✅ SUBSCRIBED on live-prices-broadcast`);
          console.log(`📊 Active subscriptions: ${Array.from(subscriptionsRef.current.keys()).join(', ')} (${subscriptionsRef.current.size} symbols)`);
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setConnectionStatus('error');
          setError('Failed to connect to price stream');
          isConnectingRef.current = false;
          console.error(`❌ WebSocket connection failed: ${status} on 'live-prices-broadcast'`);
          // 🚀 PHASE 2: Trigger fallback immediately on error
          enableFallbackMechanisms();
        }
      });

    channelRef.current = channel;
    
    // 🚀 PHASE 2: Start fallback timer - if not SUBSCRIBED within 5s, enable fallback
    fallbackTimerRef.current = setTimeout(() => {
      if (connectionStatus !== 'connected') {
        console.log('📡 Fallback activated: Not SUBSCRIBED within 5s');
        enableFallbackMechanisms();
      }
    }, 5000);
    
    // 🚀 PHASE 2: Start message watchdog - if SUBSCRIBED but no messages within 5s, enable fallback
    const messageWatchdog = setTimeout(() => {
      if (connectionStatus === 'connected' && statsRef.current.messagesReceived === 0) {
        console.log('📡 Fallback activated: SUBSCRIBED but no messages received');
        enableFallbackMechanisms();
      }
    }, 5000);
    
    // 🚀 PHASE 3: Connection status watchdog with route-gate guard
    watchdogTimerRef.current = setTimeout(() => {
      // PHASE 3 FIX: Don't fight with route-based subscription management
      if (!isPriceSubscriptionAllowed) {
        if (isDevToolsEnabled()) {
          console.log('🚦 Watchdog: Skipping restart - route gate is closed');
        }
        return;
      }
      
      if (connectionStatus === 'connecting' || connectionStatus === 'error') {
        console.log('🧯 Self-heal: restarting connection (stuck >10s)');
        restartConnection();
      }
    }, 10000);
    
    // Cleanup watchdogs when connection succeeds or fails
    const cleanupTimers = () => {
      clearTimeout(messageWatchdog);
      if (watchdogTimerRef.current) {
        clearTimeout(watchdogTimerRef.current);
        watchdogTimerRef.current = null;
      }
    };
    
    // Store cleanup for later use
    (channel as any)._customCleanup = cleanupTimers;
  }, [tabId, internalPrices, connectionStatus]);

  // 🚀 PHASE 2: Fallback mechanisms - postgres_changes + DB polling
  const enableFallbackMechanisms = useCallback(() => {
    if (hasTriggeredFallback.current) return;
    hasTriggeredFallback.current = true;
    
    console.log('📡 Fallback activated: postgres_changes');
    
    // Enable postgres_changes fallback for subscribed symbols
    const activeSymbols = Array.from(subscriptionsRef.current.keys());
    if (activeSymbols.length > 0) {
      fallbackChannelRef.current = supabase
        .channel('market_prices_fallback')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'market_prices',
          filter: `symbol=in.(${activeSymbols.join(',')})`
        }, (payload: any) => {
          console.log('📡 Fallback: postgres_changes received', payload);
          
          if (payload.new && payload.new.symbol) {
            const { symbol, bid, ask, mid, updated_at } = payload.new as any;
            const price = mid || (bid && ask ? (bid + ask) / 2 : bid || ask);
            
            if (price && subscriptionsRef.current.has(symbol)) {
              const priceData: PriceData = {
                symbol,
                price,
                change: 0,
                changePercent: 0,
                timestamp: updated_at,
                receivedAt: Date.now(),
                bid,
                ask,
                mid
              };
              
              setInternalPrices(prev => ({ ...prev, [symbol]: priceData }));
              setPrices(prev => ({ ...prev, [symbol]: priceData }));
              setLastUpdated(new Date());
            }
          }
        })
        .subscribe();
    }
    
    // 🚨 EMERGENCY ONLY: Poll every 10 seconds (reduced frequency) and ONLY if broadcast is dead
    const pollDatabase = async () => {
      const activeSymbols = Array.from(subscriptionsRef.current.keys());
      if (activeSymbols.length === 0) return;
      
      // 🔥 EMERGENCY CIRCUIT BREAKER: Only poll if no broadcast data received for 45+ seconds
      const now = Date.now();
      const timeSinceLastUpdate = lastUpdated ? now - lastUpdated.getTime() : Infinity;
      
      if (timeSinceLastUpdate < 45000) { // If we got data in last 45 seconds, don't poll
        console.log('✅ Broadcast recently active, skipping emergency database poll');
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
            setLastDatabaseTimestamp(prev => ({ ...prev, ...timestampUpdates }));
            setLastUpdated(new Date());
            console.log('🚨 EMERGENCY fallback: db_poll updated prices after broadcast failure');
          }
        }
      } catch (error) {
        console.warn('⚠️ Emergency DB polling error:', error);
      }
    };
    
    // 🚨 EMERGENCY: Poll every 10 seconds (was 2) - only when broadcast is completely dead
    fallbackPollingRef.current = setInterval(pollDatabase, 10000);
    console.log('🚨 Started EMERGENCY database polling (10s intervals) due to broadcast failure');
    
  }, [lastUpdated]);

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

  // 🚀 INSTANT DATABASE HYDRATION: Fetch prices immediately for new symbols
  const fetchPricesFromDatabase = useCallback(async (targetSymbols: string[]) => {
    if (targetSymbols.length === 0) return;

    try {
      console.log(`💾 Instant hydration fetching prices for: ${targetSymbols.join(', ')}`);
      const { data } = await supabase
        .from('market_prices')
        .select('symbol, bid, ask, mid, updated_at')
        .in('symbol', targetSymbols);
        
      if (data) {
        const hydratedPrices: Record<string, PriceData> = {};
        const timestampUpdates: Record<string, number> = {};
        
        data.forEach(row => {
          const price = row.mid || (row.bid && row.ask ? (row.bid + row.ask) / 2 : row.bid || row.ask);
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
            
            // 🚨 PHASE 2: Track database timestamp for race condition prevention
            timestampUpdates[row.symbol] = dbTimestamp;
            console.log(`⚡ INSTANT hydration for ${row.symbol}: ${new Date(dbTimestamp).toISOString()} (price: ${price})`);
          }
        });
        
        if (Object.keys(hydratedPrices).length > 0) {
          setInternalPrices(prev => ({ ...prev, ...hydratedPrices }));
          setPrices(prev => ({ ...prev, ...hydratedPrices }));
          setLastDatabaseTimestamp(prev => ({ ...prev, ...timestampUpdates }));
          setLastUpdated(new Date());
          console.log(`⚡ INSTANT hydration complete: ${Object.keys(hydratedPrices).length} prices loaded immediately`);
        }
      }
    } catch (error) {
      console.warn('⚠️ Instant hydration error:', error);
    }
  }, []);

  // SYMBOL SUBSCRIPTION MANAGEMENT: Reference counting system with instant hydration
  const subscribe = useCallback((symbols: string[]) => {
    if (!symbols?.length) return;

    // PHASE 3: Route gating check
    if (!isPriceSubscriptionAllowed) {
      if (isDevToolsEnabled()) {
        console.log('🚦 Price subscription blocked by route gating');
      }
      return;
    }

    console.log(`📊 Subscribing to symbols: ${symbols.join(', ')}`);
    console.log(`📊 Current subscriptions before: ${Array.from(subscriptionsRef.current.keys()).join(', ')}`);
    
    let needsConnection = false;
    let newSymbolsAdded = false;
    const newSymbolsForHydration: string[] = [];
    
    symbols.forEach(symbol => {
      const normalizedSymbol = normalizeSymbol(symbol);
      if (!normalizedSymbol || !ALLOWED_SYMBOLS.includes(normalizedSymbol as any)) {
        console.warn(`⚠️ Symbol ${symbol} -> ${normalizedSymbol} not in allowed list: ${ALLOWED_SYMBOLS.join(', ')}`);
        return;
      }

      const currentCount = subscriptionsRef.current.get(normalizedSymbol) || 0;
      subscriptionsRef.current.set(normalizedSymbol, currentCount + 1);
      
      if (currentCount === 0) {
        needsConnection = true;
        newSymbolsAdded = true;
        newSymbolsForHydration.push(normalizedSymbol);
        console.log(`➕ New subscription: ${normalizedSymbol} (refs: ${currentCount + 1})`);
      } else {
        console.log(`🔄 Existing subscription: ${normalizedSymbol} (refs: ${currentCount + 1})`);
      }
    });

    console.log(`📊 Current subscriptions after: ${Array.from(subscriptionsRef.current.keys()).join(', ')} (count: ${subscriptionsRef.current.size})`);

    // 🚀 INSTANT DATABASE HYDRATION: Immediately fetch prices for new symbols
    if (newSymbolsForHydration.length > 0) {
      console.log(`⚡ Triggering instant hydration for new symbols: ${newSymbolsForHydration.join(', ')}`);
      fetchPricesFromDatabase(newSymbolsForHydration);
    }

    // Establish connection if we have new symbols and no connection
    if (needsConnection && !channelRef.current && newSymbolsAdded) {
      console.log('🚀 Triggering connection establishment for new symbols...');
      connectToRealtimeChannel();
    } else if (subscriptionsRef.current.size > 0 && !channelRef.current) {
      console.log('🚀 Establishing connection for existing symbols...');
      connectToRealtimeChannel();
    }

    // Register activity for cost tracking
    registerInteraction();
  }, [connectToRealtimeChannel, registerInteraction, fetchPricesFromDatabase, isPriceSubscriptionAllowed]);

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
      // Clean up all subscriptions when route gate closes
      if (subscriptionsRef.current.size > 0) {
        const allSymbols = Array.from(subscriptionsRef.current.keys());
        unsubscribe(allSymbols);
      }
    }

    // Track previous state
    wasSubscriptionAllowedRef.current = isPriceSubscriptionAllowed;
  }, [isPriceSubscriptionAllowed]); // PHASE 2 FIX: Removed unsubscribe to break dependency loop

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

  // Setup realtime fallback for postgres_changes subscription
  const setupRealtimeFallback = useCallback(() => {
    if (fallbackChannelRef.current) return;
    
    console.log('🔄 Setting up realtime fallback for market_prices changes');
    
    const fallbackChannel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'market_prices' 
      }, (payload: any) => {
        const row = payload.new;
        if (row?.symbol && subscriptionsRef.current.has(row.symbol)) {
          const priceData: PriceData = {
            symbol: row.symbol,
            price: parseFloat(row.mid || row.ask || row.bid),
            change: 0,
            changePercent: 0,
            timestamp: row.timestamp,
            receivedAt: Date.now(),
            bid: row.bid ? parseFloat(row.bid) : undefined,
            ask: row.ask ? parseFloat(row.ask) : undefined,
            mid: row.mid ? parseFloat(row.mid) : undefined
          };
          
          setInternalPrices(prev => ({ ...prev, [row.symbol]: priceData }));
          setPrices(prev => ({ ...prev, [row.symbol]: priceData }));
          setLastUpdated(new Date());
          
          console.log(`📡 Fallback price update: ${row.symbol} = ${priceData.price}`);
        }
      })
      .subscribe();
      
    fallbackChannelRef.current = fallbackChannel;
  }, []);

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

  // 🎯 PHASE 4: Smart Database Polling with Strict Conditions
  useEffect(() => {
    const symbolsArray = Array.from(subscriptionsRef.current.keys());
    if (symbolsArray.length === 0) return;

    // 🎯 STRICT CONDITIONS: Only poll if ALL these are met
    const now = Date.now();
    const timeSinceLastUpdate = lastUpdated ? now - lastUpdated.getTime() : Infinity;
    const isBroadcastStaleFor60Seconds = timeSinceLastUpdate > 60000;
    const isConnectionBroken = connectionStatus === 'error' || connectionStatus === 'disconnected';
    
    // Only enable polling in extreme emergency when broadcast is completely dead
    if (isConnectionBroken && isBroadcastStaleFor60Seconds && symbolsArray.length > 0) {
      console.log('🚨 PHASE 4: Emergency database polling activated (broadcast dead 60+s)');
      
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
            });
            setLastUpdated(new Date());
            console.log('✅ Emergency polling: Updated prices for', criticalSymbols);
          }
        } catch (error) {
          console.error('Emergency polling failed:', error);
        }
      }, 15000); // Poll every 15 seconds (not too aggressive)
      
      return () => clearInterval(pollInterval);
    }
  }, [connectionStatus, lastUpdated]);

  // Start fallback timer when connected but no messages received
  useEffect(() => {
    if (connectionStatus === 'connected' && statsRef.current.messagesReceived === 0) {
      const timer = setTimeout(() => {
        if (statsRef.current.messagesReceived === 0) {
          console.log('🔄 No broadcast messages received, activating fallback');
          setupRealtimeFallback();
        }
      }, 5000); // Reduced to 5 seconds
      
      return () => clearTimeout(timer);
    }
  }, [connectionStatus, setupRealtimeFallback]);

  // Simple context value with all required functions
  const contextValue = useMemo<OptimizedWebSocketContextType>(() => ({
    prices,
    internalPrices,
    connectionStatus,
    error,
    lastUpdated,
    dataSource: 'optimized-websocket',
    uiThrottleMs: UI_UPDATE_THROTTLE_MS,
    isConnected: connectionStatus === 'connected',
    errors: {},
    subscribe,
    unsubscribe,
    getPrice: (symbol: string) => prices[normalizeSymbol(symbol) || ''] || null,
    getInternalPrice: (symbol: string) => internalPrices[normalizeSymbol(symbol) || ''] || null,
    refreshPrice: async () => {},
    getConnectionHealth: () => ({ isHealthy: connectionStatus === 'connected', lastUpdate: lastUpdated }),
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
      if (connectionStatus === 'connected' && lastUpdated) {
        const ageMs = Date.now() - lastUpdated.getTime();
        return ageMs < HEALTH_CONFIG.staleDataThreshold ? 'live' : 'hydrated';
      }
      return Object.keys(prices).length > 0 ? 'hydrated' : 'stale';
    },
    getArrivalAge: (symbol: string) => {
      const arrivalTime = arrivalTimestamps.current.get(normalizeSymbol(symbol) || '');
      return arrivalTime ? Date.now() - arrivalTime : Infinity;
    }
  }), [prices, internalPrices, connectionStatus, error, lastUpdated]);

  // Show loading state until provider is ready
  if (!isProviderReady) {
    return (
      <OptimizedWebSocketContext.Provider value={{
        prices: {},
        connectionStatus: 'connecting',
        error: null,
        lastUpdated: null,
        dataSource: 'initializing',
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