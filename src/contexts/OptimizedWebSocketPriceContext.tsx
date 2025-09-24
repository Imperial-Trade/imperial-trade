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

// ✅ GLOBAL SYMBOL WHITELIST - Extended for better compatibility
const ALLOWED_SYMBOLS = ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'EURJPY'] as const;
const MAX_SUBSCRIPTIONS = 12; // Increased for better coverage

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
}

const OptimizedWebSocketContext = createContext<OptimizedWebSocketContextType | null>(null);

export const useOptimizedWebSocketPrices = () => {
  const context = useContext(OptimizedWebSocketContext);
  if (!context) {
    throw new Error('useOptimizedWebSocketPrices must be used within OptimizedWebSocketPriceProvider');
  }
  return context;
};

interface OptimizedWebSocketPriceProviderProps {
  children: React.ReactNode;
}

export const OptimizedWebSocketPriceProvider: React.FC<OptimizedWebSocketPriceProviderProps> = ({
  children
}) => {
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
  
  // 🚀 PHASE 2: Initialize with database-first hydration
  const [prices, setPrices] = useState<Record<string, PriceData>>(() => {
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
  const batchedUpdates = useRef(new Map<string, PriceData>());
  const updateBatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const watchdogIntervalRef = useRef<NodeJS.Timeout | null>(null); // New: Staleness watchdog
  const watchdogStaleCountRef = useRef(new Map<string, number>()); // New: Track consecutive stale checks
  
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
        setPrices(prev => {
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

        // 🚀 STATIC 1Hz RATE LIMITING: Consistent 1-second updates for professional trading experience
        const now = Date.now();
        const lastUpdate = priceUpdateTimestamps.current.get(normalizedSymbol) || 0;
        
        // 🚀 ULTRA-FAST: 200ms for professional 5Hz updates
        const rateLimitMs = 200; // Enhanced 5Hz updates for institutional feel
        
        if (now - lastUpdate < rateLimitMs) {
          recordClampActivation(); // Record when we drop updates due to rate limiting
          telemetry.record('clamp_activation');
          return;
        }
        priceUpdateTimestamps.current.set(normalizedSymbol, now);

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
          
          // PHASE 4: Batch state updates to reduce React renders
          batchedUpdates.current.set(normalizedSymbol, priceData);
              
              if (!updateBatchTimeoutRef.current) {
                updateBatchTimeoutRef.current = setTimeout(() => {
                  const updatedPrices = { ...Object.fromEntries(batchedUpdates.current) };
                  setPrices(prev => ({ ...prev, ...updatedPrices }));
                  setLastUpdated(new Date());
                  
                  // 🔥 SAMPLED UI TRACKING: Only record 1 in 10 UI updates
                  if (Math.random() < 0.1) {
                    pricePerformanceMonitor.recordUIUpdate();
                  }
                  
                  // Cache prices to sessionStorage with timestamp and arrival times
                  try {
                    const cacheData = {
                      prices: updatedPrices,
                      timestamp: Date.now(),
                      arrivalTimes: Object.fromEntries(arrivalTimestamps.current) // Cache arrival times for freshness
                    };
                    sessionStorage.setItem('cached_prices', JSON.stringify(cacheData));
                  } catch (error) {
                    // Ignore sessionStorage errors (quota exceeded, etc.)
                  }
              
              // PHASE B: BroadcastChannel fanout - Leader broadcasts to followers
              if (isLeader && broadcastChannelRef.current) {
                try {
                  broadcastChannelRef.current.postMessage({
                    type: 'prices-batch',
                    data: updatedPrices,
                    timestamp: Date.now()
                  });
                } catch (error) {
                  if (isDevToolsEnabled()) {
                    console.warn('📡 BroadcastChannel send failed:', error);
                  }
                }
              }
              
              batchedUpdates.current.clear();
              updateBatchTimeoutRef.current = null;
            }, 200); // 🔥 SLOWER BATCHING: Every 200ms instead of 50ms
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

  // Get price function
  const getPrice = useCallback((symbol: string): PriceData | null => {
    const normalizedSymbol = normalizeSymbol(symbol);
    return normalizedSymbol ? (prices[normalizedSymbol] || null) : null;
  }, [prices]);

  // 🚀 Enhanced "Hydrate and Highlight" data age and connection quality functions
  const getDataAge = useCallback((symbol: string): number => {
    const priceData = getPrice(symbol);
    if (!priceData) return Infinity;
    
    const ageMs = Date.now() - new Date(priceData.timestamp).getTime();
    return Math.floor(ageMs / 1000); // Return age in seconds
  }, [getPrice]);

  const getConnectionQuality = useCallback((symbol?: string): 'hydrated' | 'live' | 'stale' => {
    // Symbol-specific quality detection with hysteresis (sticky live) logic
    if (symbol) {
      const normalizedSymbol = normalizeSymbol(symbol);
      const now = Date.now();
      
      // PATH A: Eliminate quality cache delay for ultra-responsive updates
      const cachedResult = qualityResultCacheRef.current.get(normalizedSymbol);
      if (cachedResult && (now - cachedResult.timestamp) < 0) { // 0ms cache = instant updates
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

      // 🚀 ANTI-FLICKER: Use sample confirmation only when transitioning to/from live
      const useSamples = (proposedQuality === 'live' || currentState.quality === 'live');
      if (useSamples) {
        const sampleHistory = qualitySampleHistoryRef.current.get(normalizedSymbol) || [];
        sampleHistory.push(proposedQuality);
        if (sampleHistory.length > 3) sampleHistory.shift();
        qualitySampleHistoryRef.current.set(normalizedSymbol, sampleHistory);

        let finalQuality = currentState.quality || 'stale';
        const allSamplesMatch = sampleHistory.length >= 3 && sampleHistory.every(sample => sample === proposedQuality);
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
      if (updateBatchTimeoutRef.current) {
        clearTimeout(updateBatchTimeoutRef.current);
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
    prices,
    connectionStatus,
    subscribe,
    unsubscribe,
    getPrice,
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
  ]);

  return (
    <OptimizedWebSocketContext.Provider value={contextValue}>
      {children}
    </OptimizedWebSocketContext.Provider>
  );
};