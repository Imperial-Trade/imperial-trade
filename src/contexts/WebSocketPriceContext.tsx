import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';

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
  
  // Enhanced stability constants for improved USA30/NAS100 performance
  const MAX_RECONNECT_ATTEMPTS = 10;
  const RECONNECT_BASE_DELAY = 2000; // 2 seconds base delay  
  const MAX_RECONNECT_DELAY = 60000; // Max 60 seconds delay
  const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds health check
  const STALE_DATA_THRESHOLD = 10000; // 10 seconds stale threshold
  // Enhanced health check mechanism for connection stability
  const healthCheckRef = useRef<NodeJS.Timeout | null>(null);
  
  const startHealthCheck = useCallback(() => {
    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current);
    }
    
    healthCheckRef.current = setInterval(() => {
      const now = Date.now();
      const timeSinceLastMessage = now - websocketHealthRef.current.lastSuccessfulMessage;
      
      if (timeSinceLastMessage > STALE_DATA_THRESHOLD && connectionStatus === 'connected') {
        console.warn('🚨 WebSocket connection appears stale, triggering reconnect...');
        if (socketRef.current) {
          socketRef.current.close();
        }
      }
    }, HEALTH_CHECK_INTERVAL);
  }, [connectionStatus]);

  const stopHealthCheck = useCallback(() => {
    if (healthCheckRef.current) {
      clearInterval(healthCheckRef.current);
      healthCheckRef.current = null;
    }
  }, []);

  // US Market Hours detection for USA30/NAS100
  const isUSMarketOpen = useCallback(() => {
    const now = new Date();
    const utc = new Date(now.getTime() + (now.getTimezoneOffset() * 60000));
    const est = new Date(utc.getTime() + (-5 * 3600000)); // EST timezone
    
    const hour = est.getHours();
    const day = est.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Market closed on weekends
    if (day === 0 || day === 6) return false;
    
    // Regular trading hours: 9:30 AM - 4:00 PM EST (Mon-Fri)
    // Pre-market: 4:00 AM - 9:30 AM EST 
    // After-market: 4:00 PM - 8:00 PM EST
    return (hour >= 4 && hour < 20); // Extended hours 4 AM - 8 PM EST
  }, []);

  const flushPendingSubscriptions = useCallback(() => {
    if (socketRef.current?.readyState !== WebSocket.OPEN) return;
    const pending = Array.from(pendingSubscribeBatchRef.current);
    if (pending.length === 0) return;
    console.log('📤 Sending batched subscription for:', pending);
    socketRef.current.send(JSON.stringify({ action: 'subscribe', symbols: pending }));
    pendingSubscribeBatchRef.current.clear();
    subscribeFlushTimerRef.current = null;
  }, []);

  const normalizeSymbol = useCallback((s: string) => {
    const up = (s || '').toUpperCase().trim();
    
    // Create compact form for advanced matching
    const compact = up.replace(/[^A-Z0-9]/g, '');
    
    // Enhanced matching logic
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
        // Enhanced composite label fallback matching
        if (compact.includes('USA30') || compact.includes('US30') || compact.includes('DOWJONES')) {
          console.log(`🔄 WebSocket normalized composite '${s}' → 'USA30USD'`);
          return 'USA30USD';
        }
        if (compact.includes('NAS100') || compact.includes('NASDAQ100') || compact.includes('NASDAQ')) {
          console.log(`🔄 WebSocket normalized composite '${s}' → 'NAS100USD'`);
          return 'NAS100USD';
        }
        return compact;
    }
  }, []);

  const getReconnectDelay = useCallback(() => {
    // Enhanced exponential backoff with jitter for improved stability
    const jitter = Math.random() * 1000; // Add 0-1s jitter to prevent thundering herd
    const delay = Math.min(RECONNECT_BASE_DELAY * Math.pow(2, reconnectAttemptsRef.current) + jitter, MAX_RECONNECT_DELAY);
    return delay;
  }, []);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN || socketRef.current?.readyState === WebSocket.CONNECTING) {
      console.log('🔄 WebSocket already connected or connecting, skipping duplicate connection');
      return;
    }

    setConnectionStatus('connecting');
    
    try {
      // Connect to Tradermade streaming WebSocket
      const wsUrl = `wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/tradermade-streaming`;
      console.log('🔌 Connecting to Tradermade WebSocket:', wsUrl);
      console.log('🔍 WebSocket readyState before connection:', socketRef.current?.readyState);
      
      socketRef.current = new WebSocket(wsUrl);
      console.log('🆕 Created new WebSocket instance');

      socketRef.current.onopen = () => {
        console.log('✅ WebSocket connected to Tradermade streaming');
        setConnectionStatus('connected');
        setDataSource('tradermade');
        reconnectAttemptsRef.current = 0;
        websocketHealthRef.current = { lastSuccessfulMessage: Date.now(), isHealthy: true };
        
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
          
          if (data.type === 'connection_status') {
            console.log('🔗 Connection status update:', data.status);
            const status = data.status === 'connected' ? 'connected' : 
                          data.status === 'connecting' ? 'connecting' : 'disconnected';
            setConnectionStatus(status);
            setDataSource(data.dataSource || 'tradermade');
            return;
          }
          
          if (data.type === 'price_update' && data.symbol && typeof data.price === 'number') {
            const symbol = normalizeSymbol(data.symbol);
            
            // Business Plan: Enhanced ultra-fast institutional tick detection
            const isInstitutionalTick = data.is_institutional_tick === true;
            const isUltraFastTick = data.is_ultra_fast_tick === true;
            const tickTimestamp = data.tick_timestamp || Date.now();
            const updateFrequency = data.update_frequency || '100ms';
            
            if (isUltraFastTick) {
              console.log(`⚡ BUSINESS PLAN ULTRA-FAST TICK: ${symbol} = $${data.price} [${updateFrequency}] @ ${new Date(tickTimestamp).toISOString()}`);
            } else if (isInstitutionalTick) {
              console.log(`💎 BUSINESS PLAN INSTITUTIONAL TICK: ${symbol} = $${data.price} [${updateFrequency}] @ ${new Date(tickTimestamp).toISOString()}`);
            } else {
              console.log(`🚀 BUSINESS PLAN PRICE UPDATE: ${symbol} = $${data.price} [${updateFrequency}]`);
            }
            
            // Calculate percentage change if we have previous price
            setPrices(prev => {
              const prevPrice = prev[symbol]?.price || data.price;
              const change = data.price - prevPrice;
              const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;
              return {
                ...prev,
                [symbol]: {
                  symbol: data.symbol,
                  price: data.price,
                  change: data.change ?? change,
                  changePercent: data.changePercent ?? changePercent,
                  timestamp: data.timestamp || new Date().toISOString(),
                  bid: data.bid,
                  ask: data.ask,
                  // Enhanced ultra-fast tick data
                  tick_timestamp: tickTimestamp,
                  is_institutional_tick: isInstitutionalTick,
                  is_ultra_fast_tick: isUltraFastTick,
                  update_frequency: data.update_frequency || '250ms'
                }
              };
            });
            
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
          } else if (data.type === 'price_batch' && Array.isArray(data.items)) {
            const nowTs = data.tick_timestamp || Date.now();
            const items = data.items as any[];
            setPrices(prev => {
              const next = { ...prev } as Record<string, PriceData>;
              items.forEach((it) => {
                const sym = normalizeSymbol(it.symbol);
                const prevPrice = next[sym]?.price || it.price;
                const change = it.price - prevPrice;
                const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : 0;
                next[sym] = {
                  symbol: it.symbol,
                  price: it.price,
                  change: it.change ?? change,
                  changePercent: it.changePercent ?? changePercent,
                  timestamp: it.timestamp || new Date().toISOString(),
                  bid: it.bid,
                  ask: it.ask,
                  tick_timestamp: nowTs,
                  is_institutional_tick: false,
                  is_ultra_fast_tick: false,
                  update_frequency: data.update_frequency || `${Math.max(1, Math.floor((nowTs - (websocketHealthRef.current.lastSuccessfulMessage || nowTs)) / 1000))}s`
                };
              });
              return next;
            });
            setPriceUpdateSources(prev => {
              const next = { ...prev } as Record<string, 'websocket' | 'websocket_institutional' | 'http'>;
              items.forEach((it) => {
                const sym = normalizeSymbol(it.symbol);
                next[sym] = 'websocket';
              });
              return next;
            });
            setLastUpdated(new Date());
            websocketHealthRef.current.lastSuccessfulMessage = Date.now();
            websocketHealthRef.current.isHealthy = true;
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
          connect();
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
  }, [getReconnectDelay]);

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
      }, 10); // Business Plan: Ultra-fast 10ms batching
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

  const refreshPrice = useCallback((symbol: string) => {
    const norm = normalizeSymbol(symbol);
    // Clear any existing error for this symbol
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[norm];
      return newErrors;
    });
    // Force re-subscription for this symbol
    subscribe([norm]);
  }, [subscribe, normalizeSymbol]);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    const norm = normalizeSymbol(symbol);
    return prices[norm] || null;
  }, [prices, normalizeSymbol]);

  // Auto-connect on mount and add connection health monitoring
  useEffect(() => {
    connect();
    
    // Health monitoring - check connection every 30 seconds and reconnect if needed
    const healthCheckInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastMessage = now - websocketHealthRef.current.lastSuccessfulMessage;
      
      if (socketRef.current?.readyState === WebSocket.OPEN && timeSinceLastMessage > 60000) {
        console.log('⚠️ No messages received for 60 seconds, reconnecting...');
        socketRef.current.close();
        connect();
      } else if (socketRef.current?.readyState !== WebSocket.OPEN && socketRef.current?.readyState !== WebSocket.CONNECTING) {
        console.log('🔄 Connection lost, attempting reconnection...');
        connect();
      }
    }, 30000); // Check every 30 seconds

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