import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getSymbolStreamingPolicy, canStreamAnySymbol, getUnifiedMarketStatus } from '@/utils/unifiedMarketHours';

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

  const connect = useCallback(async (forceConnect: boolean = false) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // ULTRA-SMART: Only block connections if NO symbols can stream
    if (!forceConnect && subscriptionsRef.current.size > 0) {
      const streamingCheck = canStreamAnySymbol(Array.from(subscriptionsRef.current));
      
      if (!streamingCheck.canStream) {
        console.log('🌙 No symbols can stream - connections blocked for cost optimization');
        setConnectionStatus('disconnected');
        setError('All requested assets are currently closed - connection blocked for cost optimization');
        
        // Schedule intelligent reconnection
        const timeUntilNextCheck = getNextReconnectionTime(Array.from(subscriptionsRef.current));
        console.log(`⏰ ULTRA-SMART: Scheduling connection check in ${Math.round(timeUntilNextCheck/1000/60)} minutes`);
        setTimeout(() => connect(false), timeUntilNextCheck);
        return;
      } else {
        console.log('🚀 ULTRA-SMART: Some symbols can stream:', streamingCheck.allowedSymbols.join(', '));
        console.log('📋 Streaming reason:', streamingCheck.reason);
      }
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
        console.log('✅ WebSocket opened, waiting for welcome...');
        setConnectionStatus('connecting');
        setError(null);
        reconnectAttempts.current = 0;
        isAuthenticatedRef.current = false;

        // PHASE 4: Enhanced authentication with immediate fallback
        let welcomeReceived = false;
        
        // PHASE 4: Aggressive auth timeout - much faster
        const authTimeout = setTimeout(() => {
          if (!isAuthenticatedRef.current) {
            console.error('❌ PHASE 4: Authentication timeout after 8s - retrying');
            setError('Connection timeout - retrying...');
            setConnectionStatus('error');
            socket.close(1000, 'Auth timeout');
          }
        }, 8000); // Reduced from 15s to 8s

        // Store auth data to send after welcome
        const authData = {
          token: session?.access_token || null,
          user_id: session?.user?.id || null,
          timestamp: Date.now(),
          clientId: crypto.randomUUID()
        };
        
        // PHASE 4: Send auth immediately if no welcome within 2 seconds
        const immediateAuthTimeout = setTimeout(() => {
          if (!welcomeReceived && !isAuthenticatedRef.current && socket.readyState === WebSocket.OPEN) {
            try {
              socket.send(JSON.stringify({
                type: 'auth',
                token: authData.token,
                user_id: authData.user_id,
                timestamp: Date.now(),
                clientId: authData.clientId
              }));
              console.log('🚀 PHASE 4: Immediate auth sent without waiting for welcome');
            } catch (error) {
              console.error('❌ Error sending immediate auth:', error);
            }
          }
        }, 2000);
        
        // Store timeout references for cleanup
        (socket as any)._authTimeout = authTimeout;
        (socket as any)._immediateAuthTimeout = immediateAuthTimeout;
        (socket as any)._authData = authData;
      };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'welcome':
            console.log('🎉 Welcome message received:', data);
            
            // Clear connection timeout
            if ((socketRef.current as any)?._connectionTimeout) {
              clearTimeout((socketRef.current as any)._connectionTimeout);
            }
            
            // PHASE 1: Check if already authenticated from server
            if (data.authenticated || data.status === 'connected') {
              console.log('✅ Auto-authenticated by server');
              setConnectionStatus('connected');
              setError(null);
              isAuthenticatedRef.current = true;
              
              // Subscribe immediately since we're already authenticated
              if (subscriptionsRef.current.size > 0) {
                const symbols = Array.from(subscriptionsRef.current);
                const supportedSymbols = symbols.filter(s => ['BTCUSD', 'XAUUSD'].includes(s.toUpperCase()));
                
                if (supportedSymbols.length > 0) {
                  console.log('🔄 Subscribing to symbols:', supportedSymbols);
                  socket.send(JSON.stringify({ type: 'subscribe', symbols: supportedSymbols }));
                }
              }
            } else {
              // Optional enhanced authentication
              if (socket.readyState === WebSocket.OPEN && session?.access_token) {
                const authMessage = { type: 'auth', token: session.access_token };
                socket.send(JSON.stringify(authMessage));
                console.log('🔑 Sending optional enhanced auth');
              }
            }
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
              // PHASE 3: Enhanced price update handling with multiple price sources
              const currentPrice = data.price || data.data?.mid || data.data?.price || 
                                 (data.data?.bid && data.data?.ask ? (data.data.bid + data.data.ask) / 2 : undefined);
              
              if (data.symbol && currentPrice !== undefined) {
                import('@/utils/priceGuards').then(({ isPricePlausibleForSymbol }) => {
                  if (isPricePlausibleForSymbol(currentPrice, data.symbol)) {
                    console.log(`✅ [${data.symbol}] Valid price update: ${currentPrice} (source: ${data.source || 'unknown'})`);
                    const priceData: PriceData = {
                      symbol: data.symbol,
                      price: currentPrice,
                      change: data.change || data.data?.change || 0,
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

    socket.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setConnectionStatus('error');
      setError('Connection error - retrying...');
      
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
      console.log(`🔌 WebSocket connection closed: ${event.code} ${event.reason || ''}`);
      setConnectionStatus('disconnected');
      isAuthenticatedRef.current = false;
      
      // Clear connection timeout if connection closes
      if ((socketRef.current as any)?._connectionTimeout) {
        clearTimeout((socketRef.current as any)._connectionTimeout);
      }
      const authTimeout = (socketRef.current as any)?._authTimeout;
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
      
      // Check if any symbols can stream before attempting reconnection
      const currentSymbols = Array.from(subscriptionsRef.current);
      const streamingCheck = canStreamAnySymbol(currentSymbols);
      
      // Always attempt reconnection unless it was a normal closure
      if (event.code !== 1000 && streamingCheck.canStream) {
        setError('Connection lost - reconnecting...');
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current), 10000);
        reconnectAttempts.current++;
        
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
        reconnectTimeoutRef.current = window.setTimeout(() => connect(false), delay);
      } else if (!streamingCheck.canStream) {
        console.log('📴 No symbols can stream - stopping reconnection attempts');
        setError('No symbols available for streaming - connection paused');
      }
    };
  } catch (error) {
    console.error('❌ Connection setup failed:', error);
    setConnectionStatus('error');
    setError('Failed to establish connection - please check your network');
    
    // Retry connection after delay
    const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts.current), 8000);
    reconnectAttempts.current++;
    reconnectTimeoutRef.current = window.setTimeout(() => connect(false), delay);
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
    console.log('🎯 ULTRA-SMART: Subscribe request for symbols:', symbols);
    
    // 🎯 Filter to only BTCUSD and XAUUSD immediately
    const supportedSymbols = symbols.filter(symbol => 
      symbol && ['BTCUSD', 'XAUUSD'].includes(symbol.toUpperCase())
    );
    
    if (supportedSymbols.length === 0) {
      console.log('🚫 No supported symbols (only BTCUSD and XAUUSD allowed)');
      return;
    }

    console.log('✅ Supported symbols found:', supportedSymbols);

    // ULTRA-SMART: Check streaming policy for supported symbols only
    const streamingCheck = canStreamAnySymbol(supportedSymbols);
    console.log('🎯 ULTRA-SMART Streaming Policy:', streamingCheck);
    
    // Add to local subscription tracking (only supported symbols)
    supportedSymbols.forEach(symbol => {
      const policy = getSymbolStreamingPolicy(symbol);
      console.log(`📝 [Subscribe] Adding ${symbol} to subscription set (${policy.reason})`);
      subscriptionsRef.current.add(symbol);
    });
    
    // Only send subscription for symbols that can actually stream
    if (streamingCheck.canStream) {
      // Send subscription message if connected and authenticated
      if (socketRef.current?.readyState === WebSocket.OPEN && isAuthenticatedRef.current) {
        console.log(`📤 [Subscribe] Sending subscription for streaming symbols:`, streamingCheck.allowedSymbols);
        // Primary: legacy-compatible schema
        socketRef.current.send(JSON.stringify({ type: 'subscribe', symbols: streamingCheck.allowedSymbols }));
        // Compatibility: also support action-based schema
        try { socketRef.current.send(JSON.stringify({ action: 'subscribe', symbols: streamingCheck.allowedSymbols })); } catch {}
      } else {
        console.log('⏳ Connection not ready, will subscribe after connection');
        connect(); // Attempt to connect
      }
    } else {
      console.log('🚫 ULTRA-SMART: No symbols can stream right now, scheduling retry');
      setConnectionStatus('disconnected');
      setError(`No symbols available for streaming: ${streamingCheck.reason}`);
      
      // Schedule retry for when markets might be open
      const retryTime = getNextReconnectionTime(supportedSymbols);
      setTimeout(() => connect(false), retryTime);
    }
  }, [connect]);

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

  // Helper function to get next reconnection time based on symbol types
  const getNextReconnectionTime = (symbols: string[]): number => {
    let minTime = 3600000; // Default: 1 hour

    for (const symbol of symbols) {
      const status = getUnifiedMarketStatus(symbol);
      if (status.nextOpenTime) {
        const timeUntilOpen = status.nextOpenTime.getTime() - Date.now();
        minTime = Math.min(minTime, timeUntilOpen);
      }
    }

    // Cap at 1 hour max, minimum 1 minute
    return Math.max(60000, Math.min(minTime, 3600000));
  };

  // ULTRA-SMART: Initialize connection - only connects if symbols can stream
  useEffect(() => {
    console.log('🚀 ULTRA-SMART: Initializing optimized WebSocket system');
    
    // Don't auto-connect on mount - wait for actual symbol subscriptions
    // This prevents unnecessary connections when no symbols are needed
    console.log('⏸️ ULTRA-SMART: Waiting for symbol subscriptions before connecting');
    setConnectionStatus('disconnected');
    setError('Waiting for symbol subscriptions...');
    
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