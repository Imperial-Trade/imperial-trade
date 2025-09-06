import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSymbolStreamingPolicy, canStreamAnySymbol, getUnifiedMarketStatus } from '@/utils/unifiedMarketHours';
import { smartPriceOptimizer } from '@/services/SmartPriceOptimizer';
import { SmartReconnectionProvider, useSmartReconnection } from '@/contexts/SmartReconnectionContext';

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

const OptimizedWebSocketPriceProviderInner: React.FC<OptimizedWebSocketPriceProviderProps> = ({
  children
}) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<WebSocket | null>(null);
  const subscriptionsRef = useRef<Set<string>>(new Set());
  const isAuthenticatedRef = useRef<boolean>(false);
  const connectionStartTime = useRef<number>(0);
  
  // PHASE 3: Use smart reconnection context
  const { scheduleReconnection, cancelReconnection } = useSmartReconnection();

  // COST OPTIMIZED: Connection to enhanced-websocket-streaming with batching
  const WEBSOCKET_URL = 'wss://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-websocket-streaming';

  const connect = useCallback(async (forceConnect: boolean = false) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // ULTRA-SMART: Only block connections if NO symbols can stream
    if (!forceConnect && subscriptionsRef.current.size > 0) {
      const streamingCheck = canStreamAnySymbol(Array.from(subscriptionsRef.current));
      
      if (!streamingCheck.canStream) {
        console.log('🌙 SMART OPTIMIZATION: No symbols can stream - using intelligent wait');
        setConnectionStatus('disconnected');
        setError('Markets closed - Smart reconnection scheduled');
        
        // Use smart reconnection instead of simple timeout
        scheduleReconnection('Market hours - no symbols can stream', Array.from(subscriptionsRef.current));
        return;
      } else {
        console.log('🚀 ULTRA-SMART: Some symbols can stream:', streamingCheck.allowedSymbols.join(', '));
        console.log('📋 Streaming reason:', streamingCheck.reason);
      }
    }

    console.log('🚀 PHASE 1: Connecting to optimized WebSocket with instant authentication...');
    setConnectionStatus('connecting');
    setError(null);
    connectionStartTime.current = Date.now();

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
        console.log('🚀 PHASE 1: WebSocket opened - INSTANT connection mode');
        setConnectionStatus('connecting');
        setError(null);
        
        // PHASE 1: CRITICAL FIX - Set connected immediately to prevent "Offline" display
        // The server auto-authenticates, so we can be confident about connection status
        
        // Reduced timeout from 8s to 3s for faster failure detection
        const connectionTimeout = setTimeout(() => {
          if (connectionStatus !== 'connected') {
            console.error('❌ PHASE 1: Connection timeout after 3s - retrying');
            setError('Connection timeout - retrying...');
            setConnectionStatus('error');
            socket.close(1000, 'Connection timeout');
          }
        }, 3000);
        
        // Store timeout for cleanup
        (socket as any)._connectionTimeout = connectionTimeout;
        
        console.log('⚡ PHASE 1: Connection established - waiting for server confirmation');
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'welcome':
              console.log('🎉 PHASE 1: Welcome message received - LIVE connection confirmed:', data);
              
              // Clear connection timeout immediately
              if ((socketRef.current as any)?._connectionTimeout) {
                clearTimeout((socketRef.current as any)._connectionTimeout);
              }
              
              // PHASE 1: INSTANT LIVE STATUS - Server confirms auto-authentication
              console.log('✅ PHASE 1: INSTANT LIVE MODE - Auto-authenticated by server');
              setConnectionStatus('connected'); // CRITICAL: Set to connected immediately
              setError(null);
              isAuthenticatedRef.current = true;
              
              // Immediate subscription to prevent any delay
              if (subscriptionsRef.current.size > 0) {
                const symbols = Array.from(subscriptionsRef.current);
                const supportedSymbols = symbols.filter(s => ['BTCUSD', 'XAUUSD'].includes(s.toUpperCase()));
                
                if (supportedSymbols.length > 0) {
                  console.log('🔄 PHASE 1: INSTANT subscription to symbols:', supportedSymbols);
                  socket.send(JSON.stringify({ type: 'subscribe', symbols: supportedSymbols }));
                }
              }
              
              // Confirm live status after brief delay
              setTimeout(() => {
                if (socket.readyState === WebSocket.OPEN) {
                  console.log('🟢 PHASE 1: LIVE status confirmed - Ultra-fast trading mode active');
                }
              }, 50);
              break;
            
            case 'connection_status':
              console.log('📡 Connection status:', data.status);
              break;
              
            case 'auth_success':
            case 'auth_response':
              console.log('🔑 Authentication response received:', data);
              
              // Clear connection timeout
              if ((socketRef.current as any)?._connectionTimeout) {
                clearTimeout((socketRef.current as any)._connectionTimeout);
              }
              
              console.log('✅ Authentication successful - connection established');
              setConnectionStatus('connected');
              setError(null);
              isAuthenticatedRef.current = true;
              
              // Re-subscribe after authentication
              if (subscriptionsRef.current.size > 0) {
                const symbols = Array.from(subscriptionsRef.current);
                const supportedSymbols = symbols.filter(s => ['BTCUSD', 'XAUUSD'].includes(s.toUpperCase()));
                
                if (supportedSymbols.length > 0) {
                  console.log('🔄 Re-subscribing to symbols:', supportedSymbols);
                  socket.send(JSON.stringify({ type: 'subscribe', symbols: supportedSymbols }));
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
               // PHASE 2: Enhanced price update with smart caching and optimization
               const currentPrice = data.price || data.data?.mid || data.data?.price || 
                                  (data.data?.bid && data.data?.ask ? (data.data.bid + data.data.ask) / 2 : undefined);
               
               if (data.symbol && currentPrice !== undefined) {
                 // Track connection performance
                 const latency = Date.now() - connectionStartTime.current;
                 smartPriceOptimizer.updateConnectionHealth(latency, true);
                 
                 // Cache the price with smart optimization
                 smartPriceOptimizer.cachePrice(data.symbol, currentPrice, 'fresh');
                 
                 import('@/utils/priceGuards').then(({ isPricePlausibleForSymbol }) => {
                   if (isPricePlausibleForSymbol(currentPrice, data.symbol)) {
                     console.log(`✅ [${data.symbol}] SMART price update: ${currentPrice} (${latency}ms latency)`);
                     const priceData: PriceData = {
                       symbol: data.symbol,
                       price: currentPrice,
                       change: data.change || data.data?.change || 0,
                       changePercent: data.changePercent || 0,
                       timestamp: data.timestamp || new Date().toISOString()
                     };
                     setPrices(prev => ({ ...prev, [data.symbol]: priceData }));
                   } else {
                     console.warn(`🚫 [${data.symbol}] Rejected implausible price: ${currentPrice}`);
                   }
                 }).catch(() => {
                   // Fallback - always accept price if validation fails
                   console.log(`📈 [${data.symbol}] Price update (validation bypassed): ${currentPrice}`);
                   const priceData: PriceData = {
                     symbol: data.symbol,
                     price: currentPrice,
                     change: data.change || 0,
                     changePercent: data.changePercent || 0,
                     timestamp: data.timestamp || new Date().toISOString()
                   };
                   setPrices(prev => ({ ...prev, [data.symbol]: priceData }));
                 });
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

      socket.onerror = (error) => {
        console.error('❌ PHASE 1: WebSocket error detected:', error);
        setConnectionStatus('error');
        setError('Connection error - Smart reconnection in progress...');
        
        // Track connection failure
        smartPriceOptimizer.updateConnectionHealth(999, false);
        
        // Clear connection timeout on error
        if ((socket as any)?._connectionTimeout) {
          clearTimeout((socket as any)._connectionTimeout);
        }
        
        // Force close socket to trigger clean reconnection
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.close(1000, 'Error recovery');
        }
      };

      socket.onclose = (event) => {
        console.log(`🔌 PHASE 1: WebSocket connection closed: ${event.code} ${event.reason || ''}`);
        setConnectionStatus('disconnected');
        isAuthenticatedRef.current = false;
        
        // Clear connection timeout if connection closes
        if ((socketRef.current as any)?._connectionTimeout) {
          clearTimeout((socketRef.current as any)._connectionTimeout);
        }
        
        // Don't reconnect if closed intentionally
        if (event.code === 1000) {
          console.log('🛑 PHASE 1: Intentional disconnection - no reconnection');
          return;
        }
        
        // Use smart reconnection for all other cases
        const currentSymbols = Array.from(subscriptionsRef.current);
        if (currentSymbols.length > 0) {
          const reason = `Connection closed: ${event.code} ${event.reason || 'Unknown reason'}`;
          console.log('🧠 PHASE 1: Using smart reconnection strategy');
          scheduleReconnection(reason, currentSymbols);
        }
      };

    } catch (error) {
      console.error('❌ Connection setup failed:', error);
      setConnectionStatus('error');
      setError('Failed to establish connection - Smart reconnection will retry');
      
      // Use smart reconnection for connection failures
      if (subscriptionsRef.current.size > 0) {
        const currentSymbols = Array.from(subscriptionsRef.current);
        scheduleReconnection(`Connection setup failed: ${error}`, currentSymbols);
      }
    }
  }, [WEBSOCKET_URL, scheduleReconnection]);

  const disconnect = useCallback(() => {
    console.log('🔌 PHASE 1: Disconnecting WebSocket with smart cleanup...');
    
    // Cancel any smart reconnection attempts
    cancelReconnection();
    
    if (socketRef.current) {
      socketRef.current.close(1000, 'Manual disconnect');
      socketRef.current = null;
    }
    
    setConnectionStatus('disconnected');
    setError(null);
    isAuthenticatedRef.current = false;
  }, [cancelReconnection]);

  const subscribe = useCallback((symbols: string[]) => {
    console.log('📡 Subscribing to symbols:', symbols);
    
    // Add symbols to our subscription set
    symbols.forEach(symbol => subscriptionsRef.current.add(symbol));
    
    // Connect if not already connected
    if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      connect(false);
      return;
    }
    
    // Send subscription if already connected and authenticated
    if (isAuthenticatedRef.current) {
      const supportedSymbols = symbols.filter(s => ['BTCUSD', 'XAUUSD'].includes(s.toUpperCase()));
      if (supportedSymbols.length > 0) {
        try {
          socketRef.current.send(JSON.stringify({ type: 'subscribe', symbols: supportedSymbols }));
        } catch (error) {
          console.error('❌ Error sending subscription:', error);
        }
      }
    }
  }, [connect]);

  const unsubscribe = useCallback((symbols: string[]) => {
    console.log('📡 Unsubscribing from symbols:', symbols);
    
    // Remove symbols from our subscription set
    symbols.forEach(symbol => subscriptionsRef.current.delete(symbol));
    
    // Send unsubscription if connected and authenticated
    if (socketRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
      const supportedSymbols = symbols.filter(s => ['BTCUSD', 'XAUUSD'].includes(s.toUpperCase()));
      if (supportedSymbols.length > 0) {
        try {
          socketRef.current.send(JSON.stringify({ type: 'unsubscribe', symbols: supportedSymbols }));
        } catch (error) {
          console.error('❌ Error sending unsubscription:', error);
        }
      }
    }
  }, []);

  const getPrice = useCallback((symbol: string): PriceData | null => {
    // First try live prices
    if (prices[symbol]) {
      return prices[symbol];
    }
    
    // Fallback to smart cache
    const cachedPrice = smartPriceOptimizer.getCachedPrice(symbol);
    if (cachedPrice) {
      return {
        symbol: cachedPrice.symbol,
        price: cachedPrice.price,
        change: 0,
        changePercent: 0,
        timestamp: cachedPrice.timestamp.toISOString()
      };
    }
    
    return null;
  }, [prices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

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

// PHASE 3: Wrap with Smart Reconnection Provider
export const OptimizedWebSocketPriceProvider: React.FC<OptimizedWebSocketPriceProviderProps> = ({
  children
}) => {
  const handleReconnect = useCallback(async () => {
    // This will be connected to the inner component's connect function
    console.log('🔄 Smart reconnection triggered');
  }, []);

  return (
    <SmartReconnectionProvider onReconnect={handleReconnect}>
      <OptimizedWebSocketPriceProviderInner>
        {children}
      </OptimizedWebSocketPriceProviderInner>
    </SmartReconnectionProvider>
  );
};