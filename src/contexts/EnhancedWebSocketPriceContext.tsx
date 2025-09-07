import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

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

interface ErrorData {
  type: 'error';
  message: string;
  code?: string;
}

interface EnhancedWebSocketContextType {
  prices: Record<string, PriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  dataSource: 'enhanced_websocket' | 'fallback' | 'unavailable';
  lastUpdated: Date | null;
  errors: Record<string, string>;
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  getPrice: (symbol: string) => PriceData | null;
  refreshPrice: (symbol: string) => void;
  getConnectionHealth: () => { isHealthy: boolean; lastUpdate: Date | null; connectedClients?: number };
  getStats: () => { messagesReceived: number; reconnections: number; avgLatency: number };
}

const EnhancedWebSocketPriceContext = createContext<EnhancedWebSocketContextType | null>(null);

export const useEnhancedWebSocketPrices = () => {
  const context = useContext(EnhancedWebSocketPriceContext);
  if (!context) {
    throw new Error('useEnhancedWebSocketPrices must be used within EnhancedWebSocketPriceProvider');
  }
  return context;
};

interface Props {
  children: React.ReactNode;
}

// Allowed symbols for cost optimization
const ALLOWED_SYMBOLS = new Set(['XAUUSD', 'BTCUSD']);

export const EnhancedWebSocketPriceProvider: React.FC<Props> = ({ children }) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [connectionStatus, setConnectionStatus] = useState<EnhancedWebSocketContextType['connectionStatus']>('disconnected');
  const [dataSource, setDataSource] = useState<'enhanced_websocket' | 'fallback' | 'unavailable'>('unavailable');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Enhanced WebSocket connection
  const websocketRef = useRef<WebSocket | null>(null);
  const subscribedSymbolsRef = useRef<Set<string>>(new Set());
  const refCountsRef = useRef<Map<string, number>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const maxReconnectAttempts = 5;
  
  // Connection state
  const isAuthenticatedRef = useRef<boolean>(false);
  const clientIdRef = useRef<string | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Statistics
  const statsRef = useRef({
    messagesReceived: 0,
    reconnections: 0,
    latencies: [] as number[],
    lastMessageAt: 0
  });

  // Normalize symbol names
  const normalizeSymbol = useCallback((symbol: string) => {
    const normalized = symbol.toUpperCase().trim();
    
    // Handle common variations
    switch (normalized) {
      case 'GOLD':
      case 'XAU/USD':
        return 'XAUUSD';
      case 'BTC/USD':
      case 'BITCOIN':
        return 'BTCUSD';
      default:
        return normalized;
    }
  }, []);

  // Setup enhanced WebSocket connection
  const setupWebSocketConnection = useCallback(async () => {
    if (websocketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log(`🔗 Setting up enhanced WebSocket connection (attempt ${reconnectAttemptsRef.current + 1})`);
    setConnectionStatus('connecting');

    try {
      // Get authentication token
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        console.warn('⚠️ No auth token available for WebSocket');
        setErrors(prev => ({ ...prev, auth: 'Authentication required' }));
        setConnectionStatus('error');
        return;
      }

      // Build WebSocket URL - pointing to enhanced service  
      const wsUrl = 'wss://kmuoqkcxguafxulqlbmi.fun/enhanced-websocket-streaming/ws';
      
      console.log(`🔗 Connecting to enhanced WebSocket: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);
      
      let connectionTimer: NodeJS.Timeout | null = null;
      
      // Connection timeout
      connectionTimer = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          console.error('❌ WebSocket connection timeout');
          setConnectionStatus('error');
          setErrors(prev => ({ ...prev, connection: 'Connection timeout' }));
          attemptReconnection();
        }
      }, 10000);

      ws.onopen = () => {
        console.log('✅ Enhanced WebSocket connection opened');
        websocketRef.current = ws;
        reconnectAttemptsRef.current = 0;
        
        if (connectionTimer) {
          clearTimeout(connectionTimer);
          connectionTimer = null;
        }
        
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Send authentication immediately
        ws.send(JSON.stringify({
          type: 'auth',
          token: token,
          timestamp: new Date().toISOString()
        }));
      };

      ws.onmessage = (event) => {
        let message;
        const messageAt = Date.now();
        
        try {
          message = JSON.parse(event.data);
        } catch (error) {
          console.warn('❌ Invalid WebSocket message:', event.data);
          return;
        }

        // Update statistics
        statsRef.current.messagesReceived++;
        statsRef.current.lastMessageAt = messageAt;

        switch (message.type) {
          case 'welcome':
            console.log(`🎉 Enhanced WebSocket welcomed with client ID: ${message.clientId}`);
            clientIdRef.current = message.clientId;
            break;

          case 'auth_response':
            if (message.success) {
              console.log('✅ Enhanced WebSocket authenticated successfully');
              isAuthenticatedRef.current = true;
              setConnectionStatus('connected');
              setDataSource('enhanced_websocket');
              
              // Clear auth errors
              setErrors(prev => {
                const cleaned = { ...prev };
                delete cleaned.auth;
                delete cleaned.connection;
                return cleaned;
              });
              
              // Subscribe to current symbols
              if (subscribedSymbolsRef.current.size > 0) {
                const symbols = Array.from(subscribedSymbolsRef.current);
                symbols.forEach((sym) => {
                  ws.send(JSON.stringify({
                    type: 'subscribe',
                    symbol: sym,
                    timestamp: new Date().toISOString()
                  }));
                });
              }
              
              // Start heartbeat
              startHeartbeat();
            } else {
              console.error('❌ Enhanced WebSocket authentication failed');
              setErrors(prev => ({ ...prev, auth: 'Authentication failed' }));
              ws.close();
            }
            break;

          case 'price_batch':
          case 'price_snapshot':
            if (message.updates || message.prices) {
              const updates = message.updates || message.prices;
              processPriceUpdates(updates, messageAt);
            }
            break;

          case 'price_update': {
            // Server sends { type, symbol, data: { bid, ask, mid, ... } }
            const u = message.data || {};
            const symbol = message.symbol || u.symbol;
            const price = u.mid ?? ((u.bid !== undefined && u.ask !== undefined) ? (u.bid + u.ask) / 2 : u.price);
            if (symbol && price) {
              processPriceUpdates([
                {
                  symbol,
                  mid: price,
                  bid: u.bid,
                  ask: u.ask,
                  change: u.change,
                  changePercent: u.changePercent,
                  timestamp: u.timestamp || new Date().toISOString()
                }
              ], messageAt);
            }
            break;
          }

          case 'ping':
            // Respond to heartbeat
            ws.send(JSON.stringify({
              type: 'pong',
              timestamp: new Date().toISOString()
            }));
            break;

          case 'error':
            console.error(`❌ Enhanced WebSocket error: ${message.message}`);
            setErrors(prev => ({ ...prev, websocket: message.message }));
            break;

          default:
            console.warn(`❓ Unknown message type: ${message.type}`);
        }
      };

      ws.onclose = (event) => {
        console.log(`🔌 Enhanced WebSocket connection closed (code: ${event.code}, reason: ${event.reason})`);
        websocketRef.current = null;
        isAuthenticatedRef.current = false;
        clientIdRef.current = null;
        
        if (connectionTimer) {
          clearTimeout(connectionTimer);
          connectionTimer = null;
        }
        
        stopHeartbeat();

        if (event.code !== 1000) { // Not a normal closure
          setConnectionStatus('disconnected');
          setDataSource('unavailable');
          attemptReconnection();
        }
      };

      ws.onerror = (error) => {
        console.error('❌ Enhanced WebSocket error:', error);
        setConnectionStatus('error');
        setDataSource('unavailable');
        setErrors(prev => ({ ...prev, connection: 'WebSocket connection error' }));
        
        if (connectionTimer) {
          clearTimeout(connectionTimer);
          connectionTimer = null;
        }
        
        if (websocketRef.current) {
          websocketRef.current = null;
          isAuthenticatedRef.current = false;
          clientIdRef.current = null;
        }
        
        stopHeartbeat();
        attemptReconnection();
      };

    } catch (error) {
      console.error('❌ Failed to setup enhanced WebSocket:', error);
      setConnectionStatus('error');
      setDataSource('unavailable');
      setErrors(prev => ({ ...prev, setup: 'Failed to establish WebSocket connection' }));
      attemptReconnection();
    }
  }, []);

  // Process incoming price updates
  const processPriceUpdates = useCallback((updates: any[], messageAt: number) => {
    const newPrices: Record<string, PriceData> = {};
    let hasUpdates = false;

    updates.forEach((update: any) => {
      const normalizedSymbol = normalizeSymbol(update.symbol);
      
      if (!ALLOWED_SYMBOLS.has(normalizedSymbol)) {
        return;
      }

      const price = update.mid || (update.bid && update.ask ? (update.bid + update.ask) / 2 : update.price);
      
      if (!price || price <= 0) {
        return;
      }

      const priceData: PriceData = {
        symbol: update.symbol,
        price,
        change: update.change || 0,
        changePercent: update.changePercent || 0,
        timestamp: update.timestamp || new Date().toISOString(),
        bid: update.bid,
        ask: update.ask,
        mid: update.mid || price
      };

      // Check if this is actually a new price
      const existingPrice = prices[normalizedSymbol];
      if (!existingPrice || Math.abs(price - existingPrice.price) > 0.00001) {
        newPrices[normalizedSymbol] = priceData;
        hasUpdates = true;
      }
    });

    if (hasUpdates) {
      setPrices(prev => ({ ...prev, ...newPrices }));
      setLastUpdated(new Date());
      
      // Calculate latency
      const latency = Date.now() - messageAt;
      statsRef.current.latencies.push(latency);
      
      // Keep only last 100 latency measurements
      if (statsRef.current.latencies.length > 100) {
        statsRef.current.latencies = statsRef.current.latencies.slice(-100);
      }
      
      // Clear symbol-specific errors on successful updates
      setErrors(prev => {
        const cleaned = { ...prev };
        Object.keys(newPrices).forEach(symbol => delete cleaned[symbol]);
        delete cleaned.global;
        return cleaned;
      });
      
      console.log(`💰 Enhanced WebSocket: Updated ${Object.keys(newPrices).length} prices`);
    }
  }, [normalizeSymbol, prices]);

  // Reconnection logic
  const attemptReconnection = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('🔥 Max reconnection attempts reached');
      setConnectionStatus('error');
      setErrors(prev => ({ ...prev, connection: 'Connection failed after multiple attempts' }));
      return;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    const delay = Math.pow(2, reconnectAttemptsRef.current) * 1000;
    console.log(`🔄 Attempting enhanced WebSocket reconnection in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current += 1;
      statsRef.current.reconnections++;
      setupWebSocketConnection();
    }, delay);
  }, [setupWebSocketConnection]);

  // Heartbeat management
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      if (websocketRef.current?.readyState === WebSocket.OPEN) {
        websocketRef.current.send(JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        }));
      }
    }, 30000); // 30 second heartbeat
  }, []);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
  }, []);

  // Symbol subscription management
  const subscribe = useCallback((symbols: string[]) => {
    const normalizedSymbols = symbols.map(normalizeSymbol).filter(s => ALLOWED_SYMBOLS.has(s));
    
    normalizedSymbols.forEach(symbol => {
      const currentCount = refCountsRef.current.get(symbol) || 0;
      refCountsRef.current.set(symbol, currentCount + 1);
      
      if (currentCount === 0) {
        subscribedSymbolsRef.current.add(symbol);
        console.log(`📈 Subscribed to ${symbol} via enhanced WebSocket`);
      }
    });
    
    // Send subscription update if authenticated
    if (websocketRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
      Array.from(subscribedSymbolsRef.current).forEach((sym) => {
        websocketRef.current!.send(JSON.stringify({
          type: 'subscribe',
          symbol: sym,
          timestamp: new Date().toISOString()
        }));
      });
    }
  }, [normalizeSymbol]);

  const unsubscribe = useCallback((symbols: string[]) => {
    const normalizedSymbols = symbols.map(normalizeSymbol).filter(s => ALLOWED_SYMBOLS.has(s));
    
    normalizedSymbols.forEach(symbol => {
      const currentCount = refCountsRef.current.get(symbol) || 0;
      
      if (currentCount <= 1) {
        refCountsRef.current.delete(symbol);
        subscribedSymbolsRef.current.delete(symbol);
        console.log(`📉 Unsubscribed from ${symbol}`);
      } else {
        refCountsRef.current.set(symbol, currentCount - 1);
      }
    });
    
    // Update subscription if authenticated
    if (websocketRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
      normalizedSymbols.forEach((sym) => {
        websocketRef.current!.send(JSON.stringify({
          type: 'unsubscribe',
          symbol: sym,
          timestamp: new Date().toISOString()
        }));
      });
    }
  }, [normalizeSymbol]);

  // Utility functions
  const getPrice = useCallback((symbol: string) => {
    const normalized = normalizeSymbol(symbol);
    return prices[normalized] || null;
  }, [prices, normalizeSymbol]);

  const refreshPrice = useCallback((symbol: string) => {
    // Enhanced WebSocket handles this automatically through subscriptions
    console.log(`🔄 Price refresh requested for ${symbol} (handled by enhanced WebSocket)`);
  }, []);

  const getConnectionHealth = useCallback(() => {
    const isHealthy = connectionStatus === 'connected' && 
                     websocketRef.current?.readyState === WebSocket.OPEN;
    
    return {
      isHealthy,
      lastUpdate: lastUpdated,
      connectedClients: 1 // This client
    };
  }, [connectionStatus, lastUpdated]);

  const getStats = useCallback(() => {
    const avgLatency = statsRef.current.latencies.length > 0
      ? statsRef.current.latencies.reduce((a, b) => a + b, 0) / statsRef.current.latencies.length
      : 0;
      
    return {
      messagesReceived: statsRef.current.messagesReceived,
      reconnections: statsRef.current.reconnections,
      avgLatency: Math.round(avgLatency)
    };
  }, []);

  // Initialize connection
  useEffect(() => {
    console.log('🚀 Initializing Enhanced WebSocket Price Provider...');
    
    // Load cached prices
    try {
      const cached = localStorage.getItem('enhanced_websocket_prices');
      if (cached) {
        const { prices: cachedPrices, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;
        
        if (age < 30000) { // Use if less than 30 seconds old
          console.log(`📦 Loaded ${Object.keys(cachedPrices).length} cached prices`);
          setPrices(cachedPrices);
          setLastUpdated(new Date(timestamp));
        }
      }
    } catch (error) {
      console.warn('Failed to load cached prices:', error);
    }
    
    // Start connection
    setupWebSocketConnection();
    
    return () => {
      // Cleanup
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      
      stopHeartbeat();
    };
  }, [setupWebSocketConnection, stopHeartbeat]);

  // Cache prices periodically
  useEffect(() => {
    if (Object.keys(prices).length > 0) {
      const cacheData = {
        prices,
        timestamp: Date.now()
      };
      
      try {
        localStorage.setItem('enhanced_websocket_prices', JSON.stringify(cacheData));
      } catch (error) {
        console.warn('Failed to cache prices:', error);
      }
    }
  }, [prices]);

  const contextValue: EnhancedWebSocketContextType = {
    prices,
    connectionStatus,
    dataSource,
    lastUpdated,
    errors,
    subscribe,
    unsubscribe,
    getPrice,
    refreshPrice,
    getConnectionHealth,
    getStats
  };

  return (
    <EnhancedWebSocketPriceContext.Provider value={contextValue}>
      {children}
    </EnhancedWebSocketPriceContext.Provider>
  );
};
