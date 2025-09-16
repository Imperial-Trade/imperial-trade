import React, { createContext, useContext, useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { isDevToolsEnabled } from '@/utils/featureFlags';
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

// ✅ GLOBAL SYMBOL WHITELIST - Extended for better compatibility
const ALLOWED_SYMBOLS = ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'NZDUSD', 'USDCHF', 'EURJPY'] as const;
const MAX_SUBSCRIPTIONS = 12; // Increased for better coverage

// Enhanced price data interface with bid/ask support
interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
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

// Health monitoring configuration
const HEALTH_CONFIG = {
  staleDataThreshold: 45000, // 45 seconds before considering data stale
  healthCheckInterval: 30000, // Check health every 30 seconds
  maxSilentPeriod: 180000, // 3 minutes of no data before concern (was 60s)
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

  // Stats tracking + PHASE 4: Rate limiting state
  const statsRef = useRef({
    messagesReceived: 0,
    reconnections: 0,
    latencySum: 0,
    latencyCount: 0,
  });
  const priceUpdateTimestamps = useRef(new Map<string, number>());
  const batchedUpdates = useRef(new Map<string, PriceData>());
  const updateBatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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
            priceUpdateTimestamps.current.set(priceData.symbol, Date.parse(priceData.timestamp));
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

        // 🚀 ENHANCED RATE LIMITING: Progressive rate limiting for better initial connections
        const now = Date.now();
        const lastUpdate = priceUpdateTimestamps.current.get(normalizedSymbol) || 0;
        
        // Progressive rate limiting: 500ms for first messages, then 2000ms 
        const messageCount = statsRef.current.messagesReceived;
        const isInitialConnection = messageCount < 10; // First 10 messages per session
        const rateLimitMs = isInitialConnection ? 500 : 2000; // 2Hz initial, then 0.5Hz
        
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
          
          const priceData: PriceData = {
            symbol: normalizedSymbol,
            price: payload.price,
            change: payload.change || 0,
            changePercent: payload.changePercent || 0,
            timestamp: payload.ts || new Date().toISOString(),
            bid: payload.bid,
            ask: payload.ask,
            mid: payload.mid
          };

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
                  
                  // Cache prices to sessionStorage with timestamp
                  try {
                    sessionStorage.setItem('cached_prices', JSON.stringify({
                      prices: updatedPrices,
                      timestamp: Date.now()
                    }));
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
      
      // 🚀 ANTI-FLICKER: Check 200ms result cache first
      const cachedResult = qualityResultCacheRef.current.get(normalizedSymbol);
      if (cachedResult && (now - cachedResult.timestamp) < 200) {
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
          
          // 🚀 ANTI-FLICKER FIX: Only promote to 'live' if symbol has received real-time updates
          // This prevents database hydration from causing immediate 'live' promotion
          if (ageMs < HEALTH_CONFIG.staleDataThreshold && hasReceivedRealtime) {
            proposedQuality = 'live';
          }
          // DELAYED DEMOTION: live → hydrated only after 10+ seconds without ticks
          else if (currentState.quality === 'live') {
            const liveDemotionGraceMs = 10000; // 10 seconds grace period
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
      
      // 🚀 ANTI-FLICKER: 3-sample confirmation before quality transitions
      const sampleHistory = qualitySampleHistoryRef.current.get(normalizedSymbol) || [];
      sampleHistory.push(proposedQuality);
      
      // Keep only last 3 samples
      if (sampleHistory.length > 3) {
        sampleHistory.shift();
      }
      qualitySampleHistoryRef.current.set(normalizedSymbol, sampleHistory);
      
      let finalQuality = currentState.quality || 'stale';
      
      // Require 3 consecutive matching samples for quality change (except initial state)
      if (sampleHistory.length >= 3) {
        const allSamplesMatch = sampleHistory.every(sample => sample === proposedQuality);
        if (allSamplesMatch && proposedQuality !== currentState.quality) {
          finalQuality = proposedQuality;
          
          // Update quality state
          const newState = {
            ...currentState,
            quality: finalQuality,
            ...(finalQuality === 'live' && currentState.quality !== 'live' ? { lastPromotedToLive: now } : {}),
            ...(finalQuality !== 'live' && currentState.quality === 'live' ? { lastDemotedFromLive: now } : {})
          };
          qualityStateRef.current.set(normalizedSymbol, newState);
        }
      } else if (!currentState.quality) {
        // Initial state - allow immediate transition
        finalQuality = proposedQuality;
        qualityStateRef.current.set(normalizedSymbol, {
          quality: finalQuality,
          lastPromotedToLive: finalQuality === 'live' ? now : null,
          lastDemotedFromLive: null
        });
      }
      
      // 🚀 ANTI-FLICKER: Cache result for 200ms
      qualityResultCacheRef.current.set(normalizedSymbol, {
        quality: finalQuality,
        timestamp: now
      });
      
      return finalQuality;
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
  ]);

  return (
    <OptimizedWebSocketContext.Provider value={contextValue}>
      {children}
    </OptimizedWebSocketContext.Provider>
  );
};