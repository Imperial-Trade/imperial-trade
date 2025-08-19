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
    const baseDelay = 5000;
    const maxDelay = 30000;
    const delay = Math.min(baseDelay * Math.pow(2, reconnectAttemptsRef.current), maxDelay);
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
            
            // Check if this is an ultra-fast institutional tick
            const isInstitutionalTick = data.is_institutional_tick === true;
            const isUltraFastTick = data.is_ultra_fast_tick === true;
            const tickTimestamp = data.tick_timestamp || Date.now();
            
            if (isUltraFastTick) {
              console.log(`⚡ ULTRA-FAST TICK RECEIVED: ${symbol} = $${data.price} @ ${new Date(tickTimestamp).toISOString()}`);
            } else if (isInstitutionalTick) {
              console.log(`💎 INSTITUTIONAL TICK RECEIVED: ${symbol} = $${data.price} @ ${new Date(tickTimestamp).toISOString()}`);
            } else {
              console.log(`💰 LIVE PRICE UPDATE: ${symbol} = $${data.price}`);
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
      }, 50);
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