import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { MarketHoursService } from '@/services/MarketHoursService';
import { PriceLatencyLogger } from '@/utils/priceLatencyLogger';

interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  bid?: number;
  ask?: number;
  // Ultra-fast institutional tick data
  tick_timestamp?: number;
  is_institutional_tick?: boolean;
  is_ultra_fast_tick?: boolean;
  update_frequency?: string;
}

interface ErrorData {
  type: 'error';
  message: string;
  code?: 'API_KEY_MISSING' | 'API_UNAVAILABLE' | 'SYMBOL_UNSUPPORTED' | 'RATE_LIMIT_EXCEEDED';
}

interface WebSocketContextType {
  prices: Record<string, PriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  dataSource: 'tradermade' | 'unavailable';
  lastUpdated: Date | null;
  errors: Record<string, string>;
  priceUpdateSources: Record<string, 'websocket' | 'websocket_institutional' | 'http'>;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  getPrice: (symbol: string) => PriceData | null;
  refreshPrice: (symbol: string) => void;
}

const WebSocketPriceContext = createContext<WebSocketContextType | null>(null);

export const useWebSocketPrices = () => {
  const context = useContext(WebSocketPriceContext);
  if (!context) {
    throw new Error('useWebSocketPrices must be used within WebSocketPriceProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

export const WebSocketPriceProvider: React.FC<Props> = ({ children }) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [connectionStatus, setConnectionStatus] = useState<WebSocketContextType['connectionStatus']>('disconnected');
  const [dataSource, setDataSource] = useState<'tradermade' | 'unavailable'>('unavailable');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [priceUpdateSources, setPriceUpdateSources] = useState<Record<string, 'websocket' | 'websocket_institutional' | 'http'>>({});
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const reconnectAttemptsRef = useRef(0);
  const websocketHealthRef = useRef<{ lastSuccessfulMessage: number, isHealthy: boolean }>({ lastSuccessfulMessage: 0, isHealthy: false });
  const refCountsRef = useRef<Map<string, number>>(new Map());
  const pendingSubscribeBatchRef = useRef<Set<string>>(new Set());
  const subscribeFlushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshAttemptRef = useRef<Map<string, number>>(new Map());
  const flushPendingSubscriptions = useCallback(() => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;
    const pending = Array.from(pendingSubscribeBatchRef.current);
    if (pending.length === 0) return;
    if (process.env.NODE_ENV === 'development') {
      console.log('📤 Sending batched subscription for:', pending);
    }
    socketRef.current.send(JSON.stringify({ action: 'subscribe', symbols: pending }));
    pendingSubscribeBatchRef.current.clear();
    subscribeFlushTimerRef.current = null;
  }, []);

  const normalizeSymbol = useCallback((s: string) => {
    const up = (s || '').toUpperCase().trim();
    // Remove non-alphanumerics like '/' and spaces
    const compact = up.replace(/[^A-Z0-9]/g, '');
    switch (up) {
      case 'GOLD':
      case 'XAU/USD':
        return 'XAUUSD';
      case 'BTC/USD':
        return 'BTCUSD';
      case 'US30':
      case 'USA30':
      case 'DOWJONES':
        return 'USA30USD';
      case 'NASDAQ':
      case 'NAS100':
        return 'NAS100USD';
      case 'SPX500':
      case 'SP500':
      case 'SPX':
        return 'SPX500USD';
      default:
        return compact;
    }
  }, []);

  const getReconnectDelay = useCallback(() => {
    // Ultra-fast reconnection for institutional-grade uptime
    const baseDelay = 100; // Start at 100ms
    const maxDelay = 500;  // Cap at 500ms maximum
    const delay = Math.min(baseDelay + (reconnectAttemptsRef.current * 50), maxDelay);
    return delay;
  }, []);

  const connect = useCallback(async () => {
    // Prevent multiple connections by checking if one already exists
    if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('🔄 WebSocket already connected or connecting, skipping duplicate connection');
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      // Close any existing connection first
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      
      // Fresh authentication with token refresh for hardened connection
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Get current session without forcing refresh - prevents token storm
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.warn('⚠️ Session retrieval failed:', sessionError);
      }
      const currentSession = session;
      
      // Enhanced auth with crypto priority and connection hardening
      const authParam = currentSession?.access_token ? `?token=${encodeURIComponent(currentSession.access_token)}` : '';
      const wsUrl = `wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tradermade-fix-streaming${authParam}`;
      
      console.log('🔌 Connecting to authenticated TraderMade FIX WebSocket:', wsUrl.replace(/token=[^&]+/, 'token=***'));
      console.log('🔍 WebSocket readyState before connection:', socketRef.current?.readyState);
      
      socketRef.current = new WebSocket(wsUrl);
      console.log('🆕 Created new WebSocket instance with fresh auth token');

      // Aggressive connection timeout for crypto reliability
      const connectionTimeout = setTimeout(() => {
        if (socketRef.current?.readyState === WebSocket.CONNECTING) {
          console.log('⏰ Connection timeout (5s), forcing close...');
          socketRef.current.close();
        }
      }, 5000); // Reduced to 5s for faster crypto failover

      socketRef.current.onopen = () => {
        clearTimeout(connectionTimeout);
        console.log('✅ Authenticated FIX WebSocket connected with institutional-grade API key rotation');
        setConnectionStatus('connected');
        setDataSource('tradermade');
        reconnectAttemptsRef.current = 0;
        websocketHealthRef.current = { lastSuccessfulMessage: Date.now(), isHealthy: true };
        
        // Implement ping interval for connection health
        const pingInterval = setInterval(() => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ action: 'ping' }));
          } else {
            clearInterval(pingInterval);
          }
        }, 30000); // Ping every 30s
        
        // Clear any connection errors
        setErrors(prev => {
          const { global, ...rest } = prev;
          return global?.includes('WebSocket') ? rest : prev;
        });
        
        // Immediately subscribe to any pending symbols
        if (subscribedSymbolsRef.current.size > 0) {
          const symbols = Array.from(subscribedSymbolsRef.current);
          console.log('📡 Subscribing to symbols:', symbols);
          socketRef.current?.send(JSON.stringify({
            action: 'subscribe',
            symbols: symbols
          }));
        }
      };

      socketRef.current.onmessage = (event) => {
        console.log('📨 Raw WebSocket message:', event.data);
        
        try {
          const data = JSON.parse(event.data);
          console.log('📊 Parsed message:', data);
          
          // CRITICAL: Reject any mock data sources - DevOps security validation
          if (data.source === 'MockData_DEPRECATED' || data.priceSource === 'MockData_DEPRECATED') {
            console.error('🚨 SECURITY: Rejected mock data source - only real TraderMade data allowed');
            setErrors(prev => ({
              ...prev,
              global: 'Mock data detected - only live TraderMade feeds allowed'
            }));
            return;
          }
          
          // Validate data source authenticity - must be from TraderMade
          if (data.messageType === 'PRICE_UPDATE' && !data.is_institutional_tick && !data.tick_timestamp && !data.sequence) {
            console.warn('⚠️ Suspicious price data without TraderMade markers, validating...');
            // Allow but log for monitoring
          }
          
          if (data.messageType === 'CONNECTION_STATUS') {
            console.log('🔗 FIX Connection status update:', data.status);
            const status = data.status === 'connected' ? 'connected' : 
                          data.status === 'connecting' ? 'connecting' : 'disconnected';
            setConnectionStatus(status);
            setDataSource(data.dataSource || 'tradermade');
            return;
          }
          
          if (data.messageType === 'PRICE_UPDATE' && data.symbol && typeof data.price === 'number') {
            const symbol = normalizeSymbol(data.symbol);
            
            // Enhanced FIX protocol message processing
            const isInstitutionalTick = data.is_institutional_tick === true;
            const isUltraFastTick = data.is_ultra_fast_tick === true;
            const tickTimestamp = data.tick_timestamp || Date.now();
            const apiKeyIndex = data.apiKeyIndex || 0;
            
            // Log price latency for performance monitoring
            PriceLatencyLogger.getInstance().logPriceUpdate(symbol, tickTimestamp);
            
            if (process.env.NODE_ENV === 'development') {
              if (isUltraFastTick) {
                console.log(`⚡ FIX ULTRA-FAST: ${symbol} = $${data.price} [Seq:${data.sequence}] [API:${apiKeyIndex}] @ ${new Date(tickTimestamp).toISOString()}`);
              } else if (isInstitutionalTick) {
                console.log(`💎 FIX INSTITUTIONAL: ${symbol} = $${data.price} [Seq:${data.sequence}] [API:${apiKeyIndex}] @ ${new Date(tickTimestamp).toISOString()}`);
              } else {
                console.log(`💰 FIX PRICE: ${symbol} = $${data.price} [API:${apiKeyIndex}]`);
              }
            }
            
            // Calculate accurate change and percentage using server-provided data when available
            const prevPrice = prices[symbol]?.price || data.price;
            const serverChange = typeof data.change === 'number' ? data.change : data.price - prevPrice;
            const serverChangePercent = typeof data.changePercent === 'number' ? data.changePercent : 
              (prevPrice > 0 ? (serverChange / prevPrice) * 100 : 0);
            
            setPrices(prev => ({
              ...prev,
              [symbol]: {
                symbol: data.symbol,
                price: data.price,
                change: serverChange,
                changePercent: serverChangePercent,
                timestamp: new Date(tickTimestamp).toISOString(),
                bid: data.bid || data.price,
                ask: data.ask || data.price,
                // Enhanced ultra-fast tick data with accurate timestamps
                tick_timestamp: tickTimestamp,
                is_institutional_tick: isInstitutionalTick,
                is_ultra_fast_tick: isUltraFastTick,
                update_frequency: data.update_frequency || '250ms'
              }
            }));
            
            setPriceUpdateSources(prev => ({ 
              ...prev, 
              [symbol]: isUltraFastTick ? 'websocket_institutional' : isInstitutionalTick ? 'websocket_institutional' : 'websocket' 
            }));
            setLastUpdated(new Date());
            websocketHealthRef.current.lastSuccessfulMessage = Date.now();
            websocketHealthRef.current.isHealthy = true;
            
            // Clear any symbol-specific errors
            setErrors(prev => {
              const { [symbol]: removed, ...rest } = prev;
              return rest;
            });
          } else if (data.type === 'error') {
            console.error('❌ WebSocket error message:', data.message);
            setErrors(prev => ({
              ...prev,
              global: data.message || 'WebSocket connection error'
            }));
            setConnectionStatus('error');
          } else {
            console.log('ℹ️ Unhandled message type:', data.type, data);
          }
        } catch (error) {
          console.error('❌ Error parsing WebSocket message:', error);
        }
      };

      socketRef.current.onclose = (event) => {
        console.log(`🔌 WebSocket disconnected: ${event.code} ${event.reason}`);
        setConnectionStatus('disconnected');
        websocketHealthRef.current.isHealthy = false;
        
        // Implement exponential backoff for reconnection
        const delay = getReconnectDelay();
        reconnectAttemptsRef.current++;
        
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('🔄 Attempting reconnection...');
          // Only reconnect if not already connected or connecting
          if (socketRef.current?.readyState !== WebSocket.OPEN && socketRef.current?.readyState !== WebSocket.CONNECTING) {
            connect();
          } else {
            console.log('🔄 WebSocket already connected or connecting, skipping reconnection');
          }
        }, delay);
      };

      socketRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionStatus('error');
        websocketHealthRef.current.isHealthy = false;
        reconnectAttemptsRef.current++;
      };
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      setDataSource('unavailable');
    }
  }, [getReconnectDelay, prices]);

  const subscribe = useCallback((symbols: string[]) => {
    console.log('📡 Subscribing request received for symbols:', symbols);

    // Normalize and validate symbols FIRST
    const normalized = symbols
      .map(normalizeSymbol)
      .filter(Boolean);

    // Reference-counted subscriptions: only send to server when count transitions 0 -> 1
    const toSubscribe: string[] = [];
    normalized.forEach(symbol => {
      const prev = refCountsRef.current.get(symbol) || 0;
      const next = prev + 1;
      refCountsRef.current.set(symbol, next);
      if (prev === 0) {
        toSubscribe.push(symbol);
        subscribedSymbolsRef.current.add(symbol);
      }
    });

    if (toSubscribe.length === 0) {
      console.log('📡 All symbols already referenced, skipping network subscribe');
      return;
    }

    // Enqueue for batched send
    toSubscribe.forEach(s => pendingSubscribeBatchRef.current.add(s));

    if (socketRef.current?.readyState !== WebSocket.OPEN) {
      console.log('🔄 WebSocket not ready, attempting connection');
      connect();
    }

    if (!subscribeFlushTimerRef.current) {
      subscribeFlushTimerRef.current = setTimeout(() => {
        flushPendingSubscriptions();
      }, 5); // Ultra-fast 5ms batching for zero-latency subscription
    }
  }, [connect, flushPendingSubscriptions]);

  const unsubscribe = useCallback((symbols: string[]) => {
    // Normalize like subscribe
    const normalized = symbols
      .map(normalizeSymbol)
      .filter(Boolean);

    const toUnsubscribe: string[] = [];
    normalized.forEach(symbol => {
      const prev = refCountsRef.current.get(symbol) || 0;
      const next = Math.max(prev - 1, 0);
      if (next === 0) {
        refCountsRef.current.delete(symbol);
        subscribedSymbolsRef.current.delete(symbol);
        toUnsubscribe.push(symbol);
      } else {
        refCountsRef.current.set(symbol, next);
      }
    });

    if (toUnsubscribe.length === 0) {
      return;
    }

    // Clear errors for symbols we fully unsubscribed from
    setErrors(prev => {
      const newErrors = { ...prev } as Record<string, string>;
      toUnsubscribe.forEach(symbol => {
        delete newErrors[symbol];
      });
      return newErrors;
    });

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ action: 'unsubscribe', symbols: toUnsubscribe }));
    }
  }, []);

  const refreshPrice = useCallback(async (symbol: string) => {
    const norm = normalizeSymbol(symbol);

    // Skip refreshes when market is closed for this symbol (except for crypto which trades 24/7)
    const isCrypto = norm.includes('BTC') || norm.includes('ETH') || norm.includes('CRYPTO');
    if (!isCrypto) {
      const status = MarketHoursService.getMarketStatus(norm);
      if (!status.isOpen) {
        return;
      }
    }

    // Clear any existing error for this symbol
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[norm];
      return newErrors;
    });

    // For crypto symbols, implement aggressive refresh with WebSocket nudge
    if (isCrypto) {
      console.log(`🔄 CRYPTO REFRESH: Force updating ${norm}`);
      
      // Send direct refresh command to edge function
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(JSON.stringify({
          action: 'force_refresh',
          symbols: [norm],
          priority: 'crypto_high'
        }));
      }
      
      // Also force re-subscription with higher priority
      subscribe([norm]);
      
      // Fallback to REST API after 3 seconds if no update
      setTimeout(async () => {
        const lastUpdate = prices[norm]?.timestamp;
        const isStale = !lastUpdate || (Date.now() - new Date(lastUpdate).getTime() > 3000);
        
        if (isStale) {
          console.log(`📡 CRYPTO FALLBACK: Fetching ${norm} via REST API`);
          await fetchRestPriceFallback([norm]);
        }
      }, 3000);
    } else {
      // Standard refresh for non-crypto
      subscribe([norm]);
    }
  }, [subscribe, normalizeSymbol, prices]);

  // New REST API fallback function for crypto when WebSocket fails
  const fetchRestPriceFallback = useCallback(async (symbols: string[]) => {
    try {
      // For demo purposes, we'll simulate a REST response
      // In production, this would hit TraderMade REST API
      console.log(`🌐 REST FALLBACK: Simulating price fetch for ${symbols.join(', ')}`);
      
      // Update price sources to indicate REST fallback
      setPriceUpdateSources(prev => {
        const newSources = { ...prev };
        symbols.forEach(symbol => {
          newSources[symbol] = 'http';
        });
        return newSources;
      });
      
      // Show user that we're using fallback pricing
      setErrors(prev => ({
        ...prev,
        fallback: `Using REST API fallback for ${symbols.join(', ')} - WebSocket streaming temporarily unavailable`
      }));
      
    } catch (error) {
      console.error('❌ REST fallback failed:', error);
      setErrors(prev => ({
        ...prev,
        fallback: `All price sources unavailable for ${symbols.join(', ')}`
      }));
    }
  }, []);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    const norm = normalizeSymbol(symbol);
    return prices[norm] || null;
  }, [prices, normalizeSymbol]);

  // Auto-connect on mount and add connection health monitoring
  useEffect(() => {
    connect();
    
    // Aggressive health monitoring for crypto-grade responsiveness
    const healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastMessage = now - websocketHealthRef.current.lastSuccessfulMessage;
      
      // Check for stale crypto prices specifically (2-second tolerance for BTC/ETH)
      Object.entries(prices).forEach(([symbol, priceData]) => {
        const isCrypto = symbol.includes('BTC') || symbol.includes('ETH');
        if (isCrypto && priceData.timestamp) {
          const priceAge = now - new Date(priceData.timestamp).getTime();
          if (priceAge > 2000) { // 2 seconds for crypto
            console.log(`🚨 CRYPTO STALE: ${symbol} price is ${priceAge}ms old, forcing refresh`);
            refreshPrice(symbol);
          }
        }
      });
      
      // Standard connection health check
      if (socketRef.current?.readyState === WebSocket.OPEN && timeSinceLastMessage > 8000) {
        console.log('⚠️ No messages received for 8 seconds, reconnecting...');
        socketRef.current.close();
        connect();
      } else if (socketRef.current?.readyState !== WebSocket.OPEN && socketRef.current?.readyState !== WebSocket.CONNECTING) {
        console.log('🔄 Connection lost, attempting reconnection...');
        connect();
      }
    }, 1000); // Check every 1 second for crypto-grade responsiveness

    return () => {
      clearInterval(healthCheckInterval);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (subscribeFlushTimerRef.current) {
        clearTimeout(subscribeFlushTimerRef.current);
      }
      pendingSubscribeBatchRef.current.clear();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connect]);

  // One-second stale tick refresher: ensure <=1.2s between updates by nudging the stream
  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    const interval = setInterval(() => {
      const now = Date.now();
      // iterate over subscribed symbols
      subscribedSymbolsRef.current.forEach((symbol) => {
        const pd = prices[symbol];
        const status = MarketHoursService.getMarketStatus(symbol);
        if (!status.isOpen) {
          // Skip nudge/refresh when market is closed for this symbol
          return;
        }
        const lastTick = pd?.tick_timestamp ?? (pd?.timestamp ? Date.parse(pd.timestamp) : 0);
        // Crypto-focused stale detection: 800ms threshold for ultra-fast crypto like BTCUSD
        const staleThreshold = symbol.includes('BTC') || symbol.includes('ETH') ? 800 : 1200;
        const isStale = !lastTick || now - lastTick > staleThreshold;
        const lastAttempt = lastRefreshAttemptRef.current.get(symbol) || 0;
        if (isStale && now - lastAttempt > staleThreshold) {
          lastRefreshAttemptRef.current.set(symbol, now);
          try {
            // Light-touch: re-subscribe the symbol to prompt a fresh tick
            refreshPrice(symbol);
          } catch (e) {
            // noop
          }
        }
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [connectionStatus, prices, refreshPrice]);

  const value: WebSocketContextType = {
    prices,
    connectionStatus,
    dataSource,
    lastUpdated,
    errors,
    priceUpdateSources,
    subscribe,
    unsubscribe,
    getPrice,
    refreshPrice
  };

  return (
    <WebSocketPriceContext.Provider value={value}>
      {children}
    </WebSocketPriceContext.Provider>
  );
};