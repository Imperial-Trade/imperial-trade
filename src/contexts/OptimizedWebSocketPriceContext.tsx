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
import { useGlobalPreviewControl } from '@/contexts/GlobalPreviewControlContext';

// ✅ GLOBAL SYMBOL WHITELIST - Only these symbols are allowed
const ALLOWED_SYMBOLS = ['XAUUSD', 'BTCUSD'] as const;
const MAX_SUBSCRIPTIONS = 2; // Hard cap to prevent overuse

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
  maxSilentPeriod: 60000, // 1 minute of no data before concern
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
  const { recordMessage, recordConnection, recordClampActivation, syncTelemetry } = useRealtimeTelemetry();
  const { isGlobalLeader, isEnforced } = useGlobalPreviewControl();
  
  // Deterministic channel ID for logging
  const channelIdRef = useRef(`prices-${Date.now()}-${Math.random().toString(36).slice(-4)}`);
  
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
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

  // Stable disconnect function - only depends on updateConnectionState
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

    // Clean up channel with deterministic logging
    if (channelRef.current) {
      if (isDevToolsEnabled()) {
        console.log(`WS-P: UNSUBSCRIBE [${channelIdRef.current}]`);
      }
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    isConnectingRef.current = false;
    updateConnectionState({ status: 'disconnected' });
    
    // Track telemetry (health monitor unregistration only happens on unmount)
    recordConnection();

    // Reset manual close flag shortly after cleanup
    setTimeout(() => { manualCloseRef.current = false; }, 1000);
  }, [updateConnectionState]);

  // PHASE 3: Optimized connection with circuit breaker
  const connect = useCallback(async () => {
    // Guard: Block connect if background disconnect timer is pending
    if (visibilityTimeoutRef.current) {
      if (isDevToolsEnabled()) {
        console.log('WS-P: connect blocked (background disconnect pending)');
      }
      return;
    }
    
    // Connection guards
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
      if (isDevToolsEnabled()) {
        console.log('🔗 Initiating WebSocket connection...');
      }

      // PHASE 2: Create optimized channel WITHOUT presence (reduces 90% of messages)
      const channel = supabase.channel('live-prices-broadcast', {
        config: {
          broadcast: { self: false }, // Don't echo our own messages
          // NO PRESENCE - this was causing message explosion
        }
      });

      channelRef.current = channel;

      // PHASE 4: Set up rate-limited message handler with batching
      channel.on('broadcast', { event: 'price_update' }, ({ payload }) => {
        try {
          if (!payload?.symbol || !subscriptionsRef.current.has(payload.symbol)) {
            return; // Skip unsubscribed symbols
          }

          // 🔥 FURTHER RATE LIMITING: Max 2 updates/sec per symbol instead of 10
          const now = Date.now();
          const lastUpdate = priceUpdateTimestamps.current.get(payload.symbol) || 0;
          if (now - lastUpdate < 500) { // 500ms = max 2 updates/sec (was 100ms)
            recordClampActivation(); // Record when we drop updates due to rate limiting
            return;
          }
          priceUpdateTimestamps.current.set(payload.symbol, now);

          statsRef.current.messagesReceived++;
          
          // Track telemetry
          recordMessage('price_update');
          
          // Track cost for price updates
          costTracker.recordRealtimeMessage('price_update');
          pricePerformanceMonitor.recordPriceUpdate();
          
          // Calculate latency if timestamp provided
          if (payload.ts) {
            const latency = Date.now() - new Date(payload.ts).getTime();
            statsRef.current.latencySum += latency;
            statsRef.current.latencyCount++;
            pricePerformanceMonitor.recordLatency(latency);
          }
          
          const priceData: PriceData = {
            symbol: payload.symbol,
            price: payload.price,
            change: payload.change || 0,
            changePercent: payload.changePercent || 0,
            timestamp: payload.ts || new Date().toISOString(),
            bid: payload.bid,
            ask: payload.ask,
            mid: payload.mid
          };

          // PHASE 4: Batch state updates to reduce React renders
          batchedUpdates.current.set(payload.symbol, priceData);
          
          if (!updateBatchTimeoutRef.current) {
            updateBatchTimeoutRef.current = setTimeout(() => {
              const updatedPrices = { ...Object.fromEntries(batchedUpdates.current) };
              setPrices(prev => ({ ...prev, ...updatedPrices }));
              setLastUpdated(new Date());
              pricePerformanceMonitor.recordUIUpdate();
              
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
      });

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

    // ✅ STEP 1: Filter and validate symbols - ONLY ALLOW XAUUSD/BTCUSD
    const requestedSymbols = symbols.filter(s => s && s.trim().length > 0);
    const allowedSymbols = requestedSymbols.filter(symbol => {
      if (!ALLOWED_SYMBOLS.includes(symbol as any)) {
        if (isDevToolsEnabled()) {
          console.warn(`🚫 Rejected subscription to unauthorized symbol: ${symbol}. Only ${ALLOWED_SYMBOLS.join(', ')} are allowed.`);
        }
        return false;
      }
      return true;
    });

    // ✅ STEP 2: Enforce subscription cap
    const currentSubscriptions = Array.from(subscriptionsRef.current.keys());
    const newSymbolsToAdd = allowedSymbols.filter(s => !currentSubscriptions.includes(s));
    
    if (currentSubscriptions.length + newSymbolsToAdd.length > MAX_SUBSCRIPTIONS) {
      console.error(`🛑 SUBSCRIPTION LIMIT EXCEEDED! Cannot subscribe to more than ${MAX_SUBSCRIPTIONS} symbols. Currently: ${currentSubscriptions.length}, requested: ${newSymbolsToAdd.length}`);
      return;
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
    
    // Always handle ref count decrements (idempotent regardless of leadership)
    symbols.forEach(symbol => {
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
    return prices[symbol] || null;
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
    healthMonitor.registerConnection('OptimizedWebSocketPrice');
    recordConnection();

    return () => {
      healthMonitor.unregisterConnection('OptimizedWebSocketPrice');
      disconnectRef.current();
    };
  }, []);

  // PHASE B: Periodic telemetry sync (90s fixed interval while connected)
  useEffect(() => {
    let telemetrySyncInterval: NodeJS.Timeout | null = null;
    
    if (connectionStatus === 'connected') {
      // Fixed 90s interval for stability
      const intervalMs = 90000;
      
      telemetrySyncInterval = setInterval(() => {
        if (connectionStatus === 'connected') {
          syncTelemetry();
        }
      }, intervalMs);
      
      if (isDevToolsEnabled()) {
        console.log(`📊 Periodic telemetry sync started (90s interval)`);
      }
    }
    
    return () => {
      if (telemetrySyncInterval) {
        clearInterval(telemetrySyncInterval);
      }
    };
  }, [connectionStatus, syncTelemetry]);

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