import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Simple price data interface
interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

// Optimized context type - much simpler than the hybrid version
interface OptimizedWebSocketContextType {
  prices: Record<string, PriceData>;
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  subscribe: (symbols: string[]) => void;
  unsubscribe: (symbols: string[]) => void;
  getPrice: (symbol: string) => PriceData | null;
  isConnected: boolean;
  error: string | null;
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
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const reconnectAttempts = useRef<number>(0);
  const isAuthenticatedRef = useRef<boolean>(false);

  // COST OPTIMIZED: Connection to enhanced-websocket-streaming with batching
  const WEBSOCKET_URL = 'wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-websocket-streaming';

  const connect = useCallback(async () => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('🔗 Connecting to optimized WebSocket...');
    setConnectionStatus('connecting');
    setError(null);

    try {
      // Get authentication session with retry logic
      let session = null;
      let authAttempts = 0;
      const maxAuthAttempts = 3;
      
      while (!session && authAttempts < maxAuthAttempts) {
        const { data } = await supabase.auth.getSession();
        session = data.session;
        
        if (!session) {
          authAttempts++;
          console.log(`🔐 Auth attempt ${authAttempts}/${maxAuthAttempts} - waiting for session...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      const socket = new WebSocket(WEBSOCKET_URL);
      socketRef.current = socket;

      socket.onopen = async () => {
        console.log('✅ WebSocket opened, authenticating...');
        setConnectionStatus('connecting');
        setError(null);
        reconnectAttempts.current = 0;
        isAuthenticatedRef.current = false;

        // Send authentication message first (support both legacy and new schemas)
        try {
          const token = session?.access_token;
          
          // Primary: legacy-compatible schema
          socket.send(JSON.stringify({
            type: 'auth',
            token: token || null
          }));
          
          // Compatibility: also send newer action-based schema if server expects it
          try {
            socket.send(JSON.stringify({ action: 'auth', token: token || null }));
          } catch {}
          
          console.log('🔐 Authentication message sent');
        } catch (error) {
          console.error('❌ Authentication error:', error);
          setError('Authentication failed - please refresh and try again');
          setConnectionStatus('error');
        }
      };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'welcome':
            console.log('🎉 WebSocket welcomed:', data.clientId || data.client_id);
            break;
          
          case 'connection_status':
            console.log('📡 Connection status:', data.status);
            break;
            
          case 'auth_success':
          case 'auth_response':
            if (data.success === false) {
              console.error('❌ Authentication failed:', data.message);
              setError(data.message || 'Authentication failed');
              setConnectionStatus('error');
            } else {
              console.log('🔑 Authentication successful');
              setConnectionStatus('connected');
              isAuthenticatedRef.current = true;
              // Re-subscribe to any previous subscriptions after authentication
              if (subscriptionsRef.current.size > 0) {
                const symbols = Array.from(subscriptionsRef.current);
                socket.send(JSON.stringify({ type: 'subscribe', symbols }));
                // Compatibility: also support action schema
                try { socket.send(JSON.stringify({ action: 'subscribe', symbols })); } catch {}
              }
            }
            break;
            
          case 'auth_error':
            console.error('❌ Authentication failed:', data.message);
            setError(data.message);
            setConnectionStatus('error');
            break;
            
          case 'subscription_ack':
          case 'subscription_response':
            console.log('✅ Subscription confirmed:', data.symbols || data.subscribedSymbols);
            break;
            
           case 'price_snapshot':
           case 'price_batch': {
             // Enhanced batch price updates with plausibility validation
             const updates = data.updates || data.prices;
             if (Array.isArray(updates)) {
               // Process synchronously first to avoid async issues with merged object
               const validUpdates = updates.filter(u => {
                 const price = u.price ?? u.mid ?? ((u.bid !== undefined && u.ask !== undefined) ? (u.bid + u.ask) / 2 : undefined);
                 return u.symbol && price !== undefined;
               });
               
               // Apply validation and update prices
               validUpdates.forEach(u => {
                 const price = u.price ?? u.mid ?? ((u.bid !== undefined && u.ask !== undefined) ? (u.bid + u.ask) / 2 : undefined);
                 
                 import('@/utils/priceGuards').then(({ isPricePlausibleForSymbol }) => {
                   if (isPricePlausibleForSymbol(price, u.symbol)) {
                     console.log(`✅ [${u.symbol}] Valid batch price: ${price}`);
                     const priceData: PriceData = {
                       symbol: u.symbol,
                       price,
                       change: u.change || 0,
                       changePercent: u.changePercent || 0,
                       timestamp: u.timestamp || new Date().toISOString()
                     };
                     setPrices(prev => ({ ...prev, [u.symbol]: priceData }));
                   } else {
                     console.warn(`🚫 [${u.symbol}] Rejected implausible batch price: ${price}`);
                   }
                 }).catch(() => {
                   // Fallback if import fails - accept price
                   console.log(`📊 [${u.symbol}] Batch price (validation bypassed): ${price}`);
                   const priceData: PriceData = {
                     symbol: u.symbol, 
                     price,
                     change: u.change || 0,
                     changePercent: u.changePercent || 0,
                     timestamp: u.timestamp || new Date().toISOString()
                   };
                   setPrices(prev => ({ ...prev, [u.symbol]: priceData }));
                 });
               });
               
               console.log('📈 Processing batch price update for symbols:', validUpdates.map(u => u.symbol).join(', '));
             } else if (updates && typeof updates === 'object') {
               console.log('📈 Object batch price update for symbols:', Object.keys(updates).join(', '));
               setPrices(prev => ({ ...prev, ...updates }));
             }
             break;
           }
            
           case 'price_update':
             // Enhanced individual real-time price update with plausibility validation
             if (data.symbol && data.price !== undefined) {
               import('@/utils/priceGuards').then(({ isPricePlausibleForSymbol }) => {
                 if (isPricePlausibleForSymbol(data.price, data.symbol)) {
                   console.log(`✅ [${data.symbol}] Valid direct price update: ${data.price}`);
                   const priceData: PriceData = {
                     symbol: data.symbol,
                     price: data.price,
                     change: data.change || 0,
                     changePercent: data.changePercent || 0,
                     timestamp: data.timestamp || new Date().toISOString()
                   };
                   setPrices(prev => ({ ...prev, [data.symbol]: priceData }));
                 } else {
                   console.warn(`🚫 [${data.symbol}] Rejected implausible direct price: ${data.price}`);
                 }
               }).catch(() => {
                 // Fallback if import fails
                 console.log(`📈 [${data.symbol}] Direct price update (validation failed): ${data.price}`);
                 const priceData: PriceData = {
                   symbol: data.symbol,
                   price: data.price,
                   change: data.change || 0,
                   changePercent: data.changePercent || 0,
                   timestamp: data.timestamp || new Date().toISOString()
                 };
                 setPrices(prev => ({ ...prev, [data.symbol]: priceData }));
               });
             } else if (data.update) {
               const u = data.update;
               const price = u.price ?? u.mid ?? ((u.bid !== undefined && u.ask !== undefined) ? (u.bid + u.ask) / 2 : undefined);
               if (u.symbol && price !== undefined) {
                 import('@/utils/priceGuards').then(({ isPricePlausibleForSymbol }) => {
                   if (isPricePlausibleForSymbol(price, u.symbol)) {
                     console.log(`✅ [${u.symbol}] Valid nested price update: ${price}`);
                     const priceData: PriceData = {
                       symbol: u.symbol,
                       price,
                       change: u.change || 0,
                       changePercent: u.changePercent || 0,
                       timestamp: u.timestamp || new Date().toISOString()
                     };
                     setPrices(prev => ({ ...prev, [u.symbol]: priceData }));
                   } else {
                     console.warn(`🚫 [${u.symbol}] Rejected implausible nested price: ${price}`);
                   }
                 }).catch(() => {
                   // Fallback if import fails
                   console.log(`📈 [${u.symbol}] Nested price update (validation failed): ${price}`);
                   const priceData: PriceData = {
                     symbol: u.symbol,
                     price,
                     change: u.change || 0,
                     changePercent: u.changePercent || 0,
                     timestamp: u.timestamp || new Date().toISOString()
                   };
                   setPrices(prev => ({ ...prev, [u.symbol]: priceData }));
                 });
               }
             }
             break;
            
          case 'pong':
            // Health check response
            break;
            
          case 'ping':
            // Respond to server heartbeat
            try {
              socketRef.current?.send(JSON.stringify({ type: 'pong' }));
            } catch {}
            break;
            
          case 'error':
            console.error('❌ WebSocket error:', data.message);
            setError(data.message);
            break;
            
          default:
            console.log('📦 Unknown message type:', data.type, data);
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    socket.onclose = (event) => {
      console.log('🔌 WebSocket connection closed:', event.code, event.reason);
      setConnectionStatus('disconnected');
      
      // Zero-pause: Immediate reconnection for critical disconnections
      if (event.code !== 1000) { // Not a normal closure
        // Zero-pause: Faster reconnection with reduced backoff
        const delay = Math.min(500 * Math.pow(1.5, reconnectAttempts.current), 5000); // Max 5s delay
        reconnectAttempts.current++;
        
        console.log(`🔄 Zero-pause reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        reconnectTimeoutRef.current = window.setTimeout(connect, delay);
      }
    };

    socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setConnectionStatus('error');
      setError('WebSocket connection failed - TraderMade may be disconnected');
    };
  } catch (error) {
    console.error('❌ Connection setup failed:', error);
    setConnectionStatus('error');
    setError('Failed to establish connection - please check your network');
    
    // Retry connection after delay
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current), 8000);
    reconnectAttempts.current++;
    reconnectTimeoutRef.current = window.setTimeout(connect, delay);
  }
}, [WEBSOCKET_URL]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close(1000, 'Manual disconnect');
      socketRef.current = null;
    }
    
    setConnectionStatus('disconnected');
  }, []);

  const subscribe = useCallback((symbols: string[]) => {
    // FIXED: Add strict symbol validation and logging
    const validatedSymbols = symbols.filter(symbol => {
      const isValid = symbol && symbol.trim().length > 0;
      console.log(`🎯 [Subscribe] Symbol: ${symbol} → Valid: ${isValid}`);
      return isValid;
    });
    
    // Add to local subscription tracking
    validatedSymbols.forEach(symbol => {
      console.log(`📝 [Subscribe] Adding ${symbol} to subscription set`);
      subscriptionsRef.current.add(symbol);
    });
    
    // Send subscription message if connected and authenticated
    if (socketRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
      console.log(`📤 [Subscribe] Sending subscription for symbols:`, validatedSymbols);
      // Primary: legacy-compatible schema
      socketRef.current.send(JSON.stringify({ type: 'subscribe', symbols: validatedSymbols }));
      // Compatibility: also support action-based schema
      try { socketRef.current.send(JSON.stringify({ action: 'subscribe', symbols: validatedSymbols })); } catch {}
    }
  }, []);

  const unsubscribe = useCallback((symbols: string[]) => {
    // Remove from local subscription tracking
    symbols.forEach(symbol => subscriptionsRef.current.delete(symbol));
    
    // Send unsubscription message if connected and authenticated
    if (socketRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
      // Primary: legacy-compatible schema
      socketRef.current.send(JSON.stringify({ type: 'unsubscribe', symbols }));
      // Compatibility: also support action-based schema
      try { socketRef.current.send(JSON.stringify({ action: 'unsubscribe', symbols })); } catch {}
    }
    
    // Remove prices for unsubscribed symbols
    setPrices(prev => {
      const updated = { ...prev };
      symbols.forEach(symbol => delete updated[symbol]);
      return updated;
    });
  }, []);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    return prices[symbol] || null;
  }, [prices]);

  // Initialize connection on mount
  useEffect(() => {
    connect();
    
    // Zero-pause: Faster health check ping every 15 seconds (vs 30s)
    const pingInterval = setInterval(() => {
      if (socketRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
        socketRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 15000);
    
    return () => {
      clearInterval(pingInterval);
      disconnect();
    };
  }, [connect, disconnect]);

  const contextValue: OptimizedWebSocketContextType = {
    prices,
    connectionStatus,
    subscribe,
    unsubscribe,
    getPrice,
    isConnected: connectionStatus === 'connected',
    error
  };

  return (
    <OptimizedWebSocketContext.Provider value={contextValue}>
      {children}
    </OptimizedWebSocketContext.Provider>
  );
};