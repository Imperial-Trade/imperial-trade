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
  const { recordConnection, recordClampActivation } = useRealtimeTelemetry(); // Removed per-message recording
  const telemetry = useTelemetry();
  const { isGlobalLeader, isEnforced } = useGlobalPreviewControl();
  
  // 🔥 LEAK-PROOF: Deterministic channel ID for definitive logging
  const channelIdRef = useRef(generateChannelId('prices'));
  const mountOnlyRef = useRef(false); // 🔥 LEAK-PROOF: Prevent operations after unmount
  
  // Initialize with cached prices from sessionStorage
  const [prices, setPrices] = useState<Record<string, PriceData>>(() => {
    try {
      const cached = sessionStorage.getItem('cached_prices');
      if (cached) {
        const parsed = JSON.parse(cached);
        const now = Date.now();
        // Only use cached prices that are less than 5 minutes old
        if (parsed.timestamp && (now - parsed.timestamp) < 300000) {
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
    
    // Guard: Block connect if background disconnect timer is pending
    if (visibilityTimeoutRef.current) {
      if (isDevToolsEnabled()) {
        console.log('WS-P: connect blocked (background disconnect pending)');
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

        // 🚨 EMERGENCY RATE LIMITING: Max 0.5 updates/sec per symbol
        const now = Date.now();
        const lastUpdate = priceUpdateTimestamps.current.get(normalizedSymbol) || 0;
        if (now - lastUpdate < 2000) { // 2000ms = max 0.5 updates/sec
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

          const newErrorCount = state.errorCount + 1;
          
          // PHASE 5: Throttle connection error logs
          const errorMsg = `Connection failed: ${status} (error #${newErrorCount})`;
          if (lastErrorLogRef.current === errorMsg) {
            errorLogCountRef.current++;
            if (errorLogCountRef.current % 5 === 0) {
              console.error(`❌ ${errorMsg} (repeated ${errorLogCountRef.current} times)`);
            }
          } else {
            console.error('❌', errorMsg);
            lastErrorLogRef.current = errorMsg;
            errorLogCountRef.current = 1;
          }
          
          // Update error state
          updateConnectionState({
            status: newErrorCount >= CIRCUIT_BREAKER_CONFIG.maxConsecutiveFailures ? 'circuit-breaker' : 'error',
            errorCount: newErrorCount,
          });
          
          setError(`Connection failed: ${status}`);
          isConnectingRef.current = false;
          channelRef.current = null;
          
          // Schedule reconnect if under limits
          if (state.attempt < CIRCUIT_BREAKER_CONFIG.maxReconnectAttempts && !isCircuitBreakerOpen()) {
            scheduleReconnect();
          }
        }
      });

    } catch (err) {
      console.error('❌ Connection setup failed:', err);
      updateConnectionState({ 
        status: 'error',
        errorCount: connectionStateRef.current.errorCount + 1 
      });
      setError('Failed to establish connection');
      isConnectingRef.current = false;
      scheduleReconnect();
    }
  }, [updateConnectionState, isCircuitBreakerOpen]);

  // PHASE 4: Enhanced reconnection with circuit breaker
  const scheduleReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current || isCircuitBreakerOpen()) {
      return;
    }

    const state = connectionStateRef.current;
    const delay = calculateRetryDelay(state.attempt);
    const nextRetryAt = Date.now() + delay;
    
    updateConnectionState({
      attempt: state.attempt + 1,
      nextRetryAt,
    });

    if (isDevToolsEnabled()) {
      console.log(`🔄 Scheduling reconnect in ${Math.round(delay)}ms (attempt ${state.attempt + 1})`);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectTimeoutRef.current = null;
      disconnect();
      setTimeout(connect, 100); // Small delay before reconnect
    }, delay);
  }, [updateConnectionState, isCircuitBreakerOpen, calculateRetryDelay, disconnect, connect]);

  // PHASE 1: Health monitoring without aggressive reconnections
  const startHealthMonitoring = useCallback(() => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }

    healthCheckIntervalRef.current = setInterval(() => {
      const state = connectionStateRef.current;
      
      if (state.status === 'connected' && lastUpdated) {
        const staleness = Date.now() - lastUpdated.getTime();
        
        // Only trigger reconnect if data is extremely stale and we're not already reconnecting
        if (staleness > HEALTH_CONFIG.maxSilentPeriod && !isConnectingRef.current) {
          if (isDevToolsEnabled()) {
            console.warn(`⚠️ Data silent for ${Math.round(staleness/1000)}s, connection may be dead`);
          }
          
          // Gentle reconnection - don't increment error count for stale data
          disconnect();
          setTimeout(connect, 2000); // 2 second delay
        }
      }
    }, HEALTH_CONFIG.healthCheckInterval);
  }, [lastUpdated, disconnect, connect]);

  // PHASE 1: Ref-counting subscription management with SYMBOL FILTERING + Route Gating (Leadership only affects connection)
  const subscribe = useCallback((symbols: string[]) => {
    // 🚦 GATE 1: Route gating - only subscribe if current route allows it
    if (!isPriceSubscriptionAllowed) {
      if (isDevToolsEnabled()) {
        console.log('🚦 Price subscription blocked by route gating');
      }
      return;
    }

    // 🚦 GATE 3: Background tab detection (non-blocking)
    if (document.hidden) {
      if (isDevToolsEnabled()) {
        console.log('👀 Tab is in background - proceeding with subscription (will auto-pause after 20s if still hidden)');
      }
      // Do not block; visibility handler pauses later to avoid race conditions in previews/iframes
    }

    // ✅ STEP 1: Filter, normalize, and validate symbols - ONLY ALLOW AUTHORIZED SYMBOLS
    const requestedSymbols = symbols
      .map(s => normalizeSymbol(s))
      .filter(Boolean);
    const allowedSymbols = requestedSymbols.filter(symbol => {
      if (!ALLOWED_SYMBOLS.includes(symbol as any)) {
        if (isDevToolsEnabled()) {
          console.warn(`🚫 Rejected subscription to unauthorized symbol: ${symbol}. Only ${ALLOWED_SYMBOLS.join(', ')} are allowed.`);
        }
        return false;
      }
      return true;
    });

    // ✅ STEP 2: Enforce subscription cap with partial acceptance
    const currentSubscriptions = Array.from(subscriptionsRef.current.keys());
    const newSymbolsToAdd = allowedSymbols.filter(s => !currentSubscriptions.includes(s));
    const availableSlots = MAX_SUBSCRIPTIONS - currentSubscriptions.length;
    
    if (newSymbolsToAdd.length > availableSlots) {
      if (availableSlots > 0) {
        const acceptedSymbols = newSymbolsToAdd.slice(0, availableSlots);
        console.warn(`⚠️ SUBSCRIPTION LIMIT: Can only accept ${acceptedSymbols.length} of ${newSymbolsToAdd.length} requested symbols. Accepted: ${acceptedSymbols.join(', ')}`);
        // Continue with partial subscription
        allowedSymbols.splice(0, allowedSymbols.length, ...acceptedSymbols, ...allowedSymbols.filter(s => currentSubscriptions.includes(s)));
      } else {
        console.error(`🛑 SUBSCRIPTION LIMIT EXCEEDED! Cannot subscribe to more than ${MAX_SUBSCRIPTIONS} symbols. Currently: ${currentSubscriptions.length}`);
        return;
      }
    }

    if (allowedSymbols.length === 0) {
      if (isDevToolsEnabled()) {
        console.warn('📭 No valid symbols to subscribe to after filtering');
      }
      return;
    }

    let hasNewSubscriptions = false;

    allowedSymbols.forEach(symbol => {
      const currentCount = subscriptionsRef.current.get(symbol) || 0;
      if (currentCount === 0) hasNewSubscriptions = true;
      subscriptionsRef.current.set(symbol, currentCount + 1);
    });

    // Connect on demand if we have subscriptions and not connected (only if leader)
    if (hasNewSubscriptions && subscriptionsRef.current.size > 0 && connectionStateRef.current.status === 'disconnected' && isLeader) {
      connect();
    }

    if (isDevToolsEnabled()) {
      const newSymbols = allowedSymbols.filter(s => (subscriptionsRef.current.get(s) || 0) === 1);
      console.log('✅ Subscribed to:', newSymbols, `(${subscriptionsRef.current.size}/${MAX_SUBSCRIPTIONS} total)`);
      console.log('🔒 Active subscriptions:', Array.from(subscriptionsRef.current.keys()));
    }

    // Track subscription costs
    allowedSymbols.forEach(() => costTracker.recordRealtimeMessage('subscription'));
  }, [connect, isPriceSubscriptionAllowed, isLeader]);

  const unsubscribe = useCallback((symbols: string[]) => {
    const actuallyRemovedSymbols: string[] = [];
    
    // Normalize symbols for consistent handling
    const normalizedSymbols = symbols
      .map(s => normalizeSymbol(s))
      .filter(Boolean);
    
    // Always handle ref count decrements (idempotent regardless of leadership)
    normalizedSymbols.forEach(symbol => {
      const currentCount = subscriptionsRef.current.get(symbol) || 0;
      if (currentCount > 0) {
        const newCount = currentCount - 1;
        if (newCount === 0) {
          subscriptionsRef.current.delete(symbol);
          actuallyRemovedSymbols.push(symbol);
        } else {
          subscriptionsRef.current.set(symbol, newCount);
        }
      }
    });

    // Remove prices for unsubscribed symbols
    if (actuallyRemovedSymbols.length > 0) {
      setPrices(prev => {
        const updated = { ...prev };
        actuallyRemovedSymbols.forEach(symbol => delete updated[symbol]);
        return updated;
      });
    }

    // Only leader can trigger actual disconnect
    if (isLeader && subscriptionsRef.current.size === 0 && channelRef.current) {
      disconnect();
    }

    if (isDevToolsEnabled()) {
      console.log('📝 Unsubscribed from:', actuallyRemovedSymbols, `(${subscriptionsRef.current.size} remaining)${!isLeader ? ' [follower]' : ''}`);
    }
  }, [disconnect, isLeader]);

  // Light guard against background-disconnect timer
  const backgroundDisconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-disconnect effect (watches isLeader/route) - depends on stable functions only
  useEffect(() => {
    // Clear any pending background disconnect
    if (backgroundDisconnectTimerRef.current) {
      clearTimeout(backgroundDisconnectTimerRef.current);
      backgroundDisconnectTimerRef.current = null;
    }

    const debounceTimeoutRef = { current: null as NodeJS.Timeout | null };
    
    const handleConnectionChange = () => {
      // Disconnect if we lose leadership or route doesn't allow subscriptions
      if (!isLeader || !isPriceSubscriptionAllowed) {
        if (channelRef.current) {
          if (isDevToolsEnabled()) {
            console.log('🚦 Disconnecting due to leadership change or route gating', {isLeader, isPriceSubscriptionAllowed});
          }
          disconnect();
        }
        return;
      }

      if (!subscriptionsRef.current.size) return;
      
      // Guard: do not attempt new connect if background-disconnect timer is pending
      if (!backgroundDisconnectTimerRef.current) {
        // Connect on leadership change - if we're leader and have subscriptions
        if (subscriptionsRef.current.size > 0 && connectionStateRef.current.status === 'disconnected') {
          connect();
        }
      }
    };

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce connect/disconnect operations
    debounceTimeoutRef.current = setTimeout(handleConnectionChange, 150);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [isLeader, isPriceSubscriptionAllowed, disconnect, connect]);

  // Stable utility functions
  const getPrice = useCallback((symbol: string): PriceData | null => {
    const normalizedSymbol = normalizeSymbol(symbol);
    return prices[normalizedSymbol] || null;
  }, [prices]);

  const refreshPrice = useCallback((symbol: string) => {
    // Simply re-subscribe to refresh
    if (subscriptionsRef.current.has(symbol)) {
      unsubscribe([symbol]);
      setTimeout(() => subscribe([symbol]), 100);
    }
  }, [subscribe, unsubscribe]);

  const getConnectionHealth = useCallback(() => ({
    isHealthy: connectionStateRef.current.status === 'connected',
    lastUpdate: lastUpdated
  }), [lastUpdated]);

  const getStats = useCallback(() => ({
    messagesReceived: statsRef.current.messagesReceived,
    reconnections: statsRef.current.reconnections,
    avgLatency: statsRef.current.latencyCount > 0 
      ? statsRef.current.latencySum / statsRef.current.latencyCount 
      : 50
  }), []);

  const restartConnection = useCallback(() => {
    if (isDevToolsEnabled()) {
      console.log('🔄 Manual connection restart requested');
    }
    
    // Reset circuit breaker
    updateConnectionState({
      status: 'disconnected',
      attempt: 0,
      errorCount: 0,
      nextRetryAt: null,
    });
    
    disconnect();
    setTimeout(connect, 500);
  }, [updateConnectionState, disconnect, connect]);

  // PHASE 3: Page Visibility API for adaptive background disconnect
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Tab went to background - start timer to disconnect after 20 seconds
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
      
      visibilityTimeoutRef.current = setTimeout(() => {
        if (document.hidden && channelRef.current) {
          if (isDevToolsEnabled()) {
            console.log('📱 Background disconnect: Pausing WebSocket to save quota');
          }
          disconnect();
          isBackgroundDisconnected.current = true;
        }
      }, 20000); // 20 seconds
      
    } else {
      // Tab came to foreground - cancel disconnect timer and reconnect if needed
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }
      
      if (isBackgroundDisconnected.current && subscriptionsRef.current.size > 0) {
        if (isDevToolsEnabled()) {
          console.log('📱 Foreground reconnect: Resuming WebSocket');
        }
        isBackgroundDisconnected.current = false;
        updateConnectionState({ errorCount: 0, attempt: 0 });
        setTimeout(connect, 500);
      }
    }
  }, [disconnect, updateConnectionState, connect]);

  // PHASE 2: Stable network event handlers (only for recovery, not aggressive reconnection)
  const handleOnline = useCallback(() => {
    if (connectionStateRef.current.status === 'disconnected' && subscriptionsRef.current.size > 0 && !document.hidden) {
      if (isDevToolsEnabled()) {
        console.log('🌐 Network recovered, reconnecting');
      }
      // Reset circuit breaker on network recovery
      updateConnectionState({ errorCount: 0, attempt: 0 });
      setTimeout(connect, 1000); // 1 second delay
    }
  }, [updateConnectionState, connect]);

  // Setup event listeners (stable, no dependency array changes)
  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    
    // PHASE B: Initialize BroadcastChannel for tab coordination
    if (!broadcastChannelRef.current) {
      try {
        broadcastChannelRef.current = new BroadcastChannel('prices-bc');
        
        // Listen for price updates from leader tab
        broadcastChannelRef.current.onmessage = (event) => {
          const { type, data, timestamp } = event.data;
          
          if (type === 'prices-batch' && !isLeader && data) {
            // Followers receive price updates via BroadcastChannel
            if (isDevToolsEnabled()) {
              console.log('📻 Received price batch from leader:', Object.keys(data));
            }
            
            setPrices(prev => ({ ...prev, ...data }));
            setLastUpdated(new Date(timestamp));
            isFollowerRef.current = true;
          }
        };
        
        if (isDevToolsEnabled()) {
          console.log('📡 BroadcastChannel initialized for tab coordination');
        }
      } catch (error) {
        if (isDevToolsEnabled()) {
          console.warn('⚠️ BroadcastChannel not available:', error);
        }
      }
    }
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      
      // Cleanup BroadcastChannel
      if (broadcastChannelRef.current) {
        broadcastChannelRef.current.close();
        broadcastChannelRef.current = null;
      }
    };
  }, [handleVisibilityChange, handleOnline, isLeader]);

  // Create disconnectRef for mount-only cleanup
  const disconnectRef = useRef(disconnect);
  useEffect(() => { disconnectRef.current = disconnect; }, [disconnect]);

  // Register/unregister and disconnect on unmount - truly mount-only effect
  useEffect(() => {
    mountOnlyRef.current = true;
    
    realtimeLogger.logStatus('OptimizedWebSocketPriceProvider MOUNT');
    healthMonitor.registerConnection('OptimizedWebSocketPrice');
    recordConnection();

    return () => {
      mountOnlyRef.current = false;
      
      realtimeLogger.logStatus('OptimizedWebSocketPriceProvider UNMOUNT');
      
      // 🔥 LEAK-PROOF: Clear all timers first
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
      if (updateBatchTimeoutRef.current) {
        clearTimeout(updateBatchTimeoutRef.current);
        updateBatchTimeoutRef.current = null;
      }
      
      // 🔥 LEAK-PROOF: Force disconnect and cleanup
      disconnect();
      healthMonitor.unregisterConnection('OptimizedWebSocketPrice');
    };
  }, []); // 🔥 LEAK-PROOF: Mount-only, never re-run

  // PHASE B: Periodic telemetry sync (90s fixed interval while connected)
  // 🔥 TELEMETRY SYNC DISABLED: Removed to eliminate message overhead
  // Periodic telemetry sync has been disabled to reduce realtime message volume
  // This was contributing to the 37,680+ messages/hour overhead

  // Stable context value
  const contextValue = useMemo<OptimizedWebSocketContextType>(() => ({
    prices,
    connectionStatus,
    subscribe,
    unsubscribe,
    getPrice,
    isConnected: connectionStatus === 'connected',
    error,
    dataSource: 'Optimized Real-Time WebSocket',
    lastUpdated,
    errors: error ? { connection: error } : {},
    refreshPrice,
    getConnectionHealth,
    getStats,
    restartConnection,
    isUsingEnhancedSystem: true
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
    restartConnection
  ]);

  return (
    <OptimizedWebSocketContext.Provider value={contextValue}>
      {children}
    </OptimizedWebSocketContext.Provider>
  );
};