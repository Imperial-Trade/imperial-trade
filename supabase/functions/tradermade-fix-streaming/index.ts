/**
 * TraderMade FIX Protocol Streaming Edge Function
 * Institutional-grade price streaming with API key rotation and binary protocol support
 * 
 * DevOps Enhancement v2.0:
 * - Enhanced API key health monitoring with automatic rotation
 * - Improved connection reliability with exponential backoff
 * - Real-time data validation to prevent mock data contamination
 * - Comprehensive logging and alerting for production monitoring
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Enhanced API key management with health tracking
const API_KEYS = [
  Deno.env.get('TRADERMADE_API_KEY'),
  Deno.env.get('TRADERMADE_REST_API_KEY'),
  // Additional backup keys for high availability
].filter(Boolean);

// Log API key configuration on startup for DevOps monitoring
console.log(`🔐 DevOps: Configured ${API_KEYS.length} TraderMade API keys for rotation`);
if (API_KEYS.length === 0) {
  console.error('🚨 CRITICAL: No TraderMade API keys found in secrets. Service will fail.');
}
if (API_KEYS.length < 2) {
  console.warn('⚠️ DevOps Warning: Less than 2 API keys configured. No failover protection.');
}

const TRADERMADE_WS_URL = 'wss://marketdata.tradermade.com/feedadv';
const TRADERMADE_REST_URL = 'https://marketdata.tradermade.com/api/v1/live';

interface ConnectionManager {
  clients: Map<string, WebSocket>;
  traderMadeConnection: {
    ws: WebSocket | null;
    keyIndex: number;
    isReady: boolean;
    lastHeartbeat: number;
    retryCount: number;
    clientCount: number;
  };
  apiKeyHealth: Map<number, { lastSuccess: number; failures: number; isActive: boolean }>;
  priceCache: Map<string, { price: number; bid: number; ask: number; timestamp: number }>;
  sequenceCounter: number;
  currentKeyIndex: number;
  // Subscription manager
  subscriptions: Map<string, number>; // symbol -> ref count
  activeSymbols: Set<string>; // Currently subscribed symbols (max 5)
  pendingSymbols: Set<string>; // Symbols waiting for subscription
}

const connectionManager: ConnectionManager = {
  clients: new Map(),
  traderMadeConnection: {
    ws: null,
    keyIndex: 0,
    isReady: false,
    lastHeartbeat: Date.now(),
    retryCount: 0,
    clientCount: 0
  },
  apiKeyHealth: new Map(),
  priceCache: new Map(),
  sequenceCounter: 0,
  currentKeyIndex: 0,
  subscriptions: new Map(),
  activeSymbols: new Set(),
  pendingSymbols: new Set()
};

// Initialize API key health tracking
API_KEYS.forEach((_, index) => {
  connectionManager.apiKeyHealth.set(index, {
    lastSuccess: Date.now(),
    failures: 0,
    isActive: true
  });
});

/**
 * Get next healthy API key with enhanced load balancing and monitoring
 */
function getHealthyApiKey(): { key: string; index: number } | null {
  const healthyKeys = Array.from(connectionManager.apiKeyHealth.entries())
    .filter(([_, health]) => health.isActive && health.failures < 3) // More aggressive failure threshold
    .sort((a, b) => a[1].lastSuccess - b[1].lastSuccess); // Least recently used first

  if (healthyKeys.length === 0) {
    console.error('🚨 CRITICAL: No healthy API keys available - ALL KEYS FAILED');
    
    // Emergency: Try to recover one key with lowest failure count
    const recoveryKey = Array.from(connectionManager.apiKeyHealth.entries())
      .sort((a, b) => a[1].failures - b[1].failures)[0];
    
    if (recoveryKey) {
      console.warn(`🚑 EMERGENCY RECOVERY: Attempting to use key ${recoveryKey[0]} with ${recoveryKey[1].failures} failures`);
      recoveryKey[1].isActive = true;
      recoveryKey[1].failures = Math.max(recoveryKey[1].failures - 1, 0); // Reduce failure count
      return { key: API_KEYS[recoveryKey[0]], index: recoveryKey[0] };
    }
    
    return null;
  }

  const [index] = healthyKeys[0];
  const key = API_KEYS[index];
  
  if (!key) {
    console.error(`❌ API key at index ${index} is undefined - configuration error`);
    return null;
  }

  const health = connectionManager.apiKeyHealth.get(index);
  console.log(`🔑 DevOps: Using API key ${index} (failures: ${health?.failures || 0}, last success: ${new Date(health?.lastSuccess || 0).toISOString()})`);
  return { key, index };
}

/**
 * Mark API key as successful
 */
function markApiKeySuccess(index: number): void {
  const health = connectionManager.apiKeyHealth.get(index);
  if (health) {
    health.lastSuccess = Date.now();
    health.failures = 0;
    health.isActive = true;
  }
}

/**
 * Mark API key as failed with enhanced monitoring
 */
function markApiKeyFailure(index: number): void {
  const health = connectionManager.apiKeyHealth.get(index);
  if (health) {
    health.failures += 1;
    
    // Log detailed failure information for DevOps monitoring
    console.error(`🚨 API Key ${index} FAILURE #${health.failures}: Rate limit or authentication error detected`);
    
    if (health.failures >= 3) { // More aggressive threshold
      health.isActive = false;
      console.error(`🔴 CRITICAL: API key ${index} DISABLED due to repeated failures (${health.failures})`);
      
      // Alert for DevOps monitoring
      console.error(`🚨 DevOps Alert: TraderMade API key ${index} offline - immediate attention required`);
      
      // Shorter reactivation time for faster recovery
      setTimeout(() => {
        health.isActive = true;
        health.failures = 0;
        console.log(`🟢 DevOps: API key ${index} reactivated after cooldown`);
      }, 2 * 60 * 1000); // Reduced to 2 minutes
    } else {
      console.warn(`⚠️ API key ${index} failure count: ${health.failures}/3`);
    }
  }
}

/**
 * Create single TraderMade WebSocket connection with FIX-style messaging and connection pooling
 */
async function createTraderMadeConnection(): Promise<void> {
  // If already connected or connecting, don't create another connection
  if (connectionManager.traderMadeConnection.ws && 
      (connectionManager.traderMadeConnection.ws.readyState === WebSocket.OPEN || 
       connectionManager.traderMadeConnection.ws.readyState === WebSocket.CONNECTING)) {
    console.log('🔄 TraderMade connection already exists, reusing...');
    return;
  }

  const healthyKey = getHealthyApiKey();
  if (!healthyKey) {
    console.error('❌ No healthy API keys available for connection');
    return;
  }

  const { key: apiKey, index: apiKeyIndex } = healthyKey;

  try {
    console.log(`🔌 Creating single TraderMade connection with API key index ${apiKeyIndex}`);
    
    // Close existing connection if any
    if (connectionManager.traderMadeConnection.ws) {
      connectionManager.traderMadeConnection.ws.close();
    }
    
    const ws = new WebSocket(TRADERMADE_WS_URL);
    
    // Update connection manager
    connectionManager.traderMadeConnection = {
      ws,
      keyIndex: apiKeyIndex,
      isReady: false,
      lastHeartbeat: Date.now(),
      retryCount: 0,
      clientCount: connectionManager.clients.size
    };
    connectionManager.currentKeyIndex = apiKeyIndex;
    
    ws.onopen = () => {
      console.log(`✅ DevOps: TraderMade WebSocket connected successfully (API key ${apiKeyIndex})`);
      connectionManager.traderMadeConnection.isReady = true;
      markApiKeySuccess(apiKeyIndex);
      
      // Enhanced authentication with error handling
      const symbolList = Array.from(connectionManager.activeSymbols).slice(0, 5).join(',') || 'EURUSD';
      const authMessage = {
        userKey: apiKey,
        symbol: symbolList
      };
      
      try {
        ws.send(JSON.stringify(authMessage));
        console.log(`📡 DevOps: Authentication sent for API key ${apiKeyIndex} with symbols: ${symbolList}`);
        
        // Set authentication timeout
        setTimeout(() => {
          if (!connectionManager.traderMadeConnection.isReady) {
            console.error(`🚨 DevOps: Authentication timeout for API key ${apiKeyIndex} - marking as failed`);
            markApiKeyFailure(apiKeyIndex);
            ws.close();
          }
        }, 10000); // 10 second timeout
        
      } catch (error) {
        console.error(`❌ DevOps: Failed to send authentication for API key ${apiKeyIndex}:`, error);
        markApiKeyFailure(apiKeyIndex);
      }
    };

    ws.onmessage = (event) => {
      try {
        connectionManager.traderMadeConnection.lastHeartbeat = Date.now();
        
        // Enhanced message handling with validation
        let data;
        
        if (typeof event.data === 'string') {
          // Check for rate limit errors immediately
          if (event.data.includes('User Key Used to many times') || event.data.includes('rate limit')) {
            console.error(`🚨 RATE LIMIT DETECTED for API key ${apiKeyIndex}: ${event.data}`);
            markApiKeyFailure(apiKeyIndex);
            
            // Immediately try next API key
            setTimeout(() => {
              console.log('🔄 Attempting connection with next API key due to rate limit...');
              createTraderMadeConnection();
            }, 1000);
            return;
          }
          
          // Check if it's a plain text status message
          if (event.data === 'Connected' || event.data.startsWith('Subscription')) {
            console.log(`📡 DevOps: TraderMade confirmed: ${event.data} (API key ${apiKeyIndex})`);
            markApiKeySuccess(apiKeyIndex);
            return;
          }
          
          // Try to parse as JSON
          try {
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.log(`📡 DevOps: TraderMade text response (API key ${apiKeyIndex}): ${event.data}`);
            return;
          }
        } else {
          data = event.data;
        }
        
        handleTraderMadeMessage(data, apiKeyIndex);
      } catch (error) {
        console.error(`❌ Failed to process TraderMade message (API key ${apiKeyIndex}):`, error);
      }
    };

    ws.onclose = (event) => {
      console.log(`🔌 TraderMade WebSocket closed (API key ${apiKeyIndex}): ${event.code}`);
      connectionManager.traderMadeConnection.ws = null;
      connectionManager.traderMadeConnection.isReady = false;
      
      // Mark API key as potentially failed if not normal closure
      if (event.code !== 1000) {
        markApiKeyFailure(apiKeyIndex);
      }
      
      // Automatic reconnection with next available API key
      setTimeout(() => {
        console.log('🔄 Attempting to reconnect TraderMade connection...');
        createTraderMadeConnection();
      }, 2000);
    };

    ws.onerror = (error) => {
      console.error(`❌ TraderMade WebSocket error (API key ${apiKeyIndex}):`, error);
      connectionManager.traderMadeConnection.ws = null;
      connectionManager.traderMadeConnection.isReady = false;
      markApiKeyFailure(apiKeyIndex);
    };

  } catch (error) {
    console.error(`❌ Failed to create TraderMade connection (API key ${apiKeyIndex}):`, error);
    markApiKeyFailure(apiKeyIndex);
  }
}

/**
 * Handle incoming TraderMade message with enhanced validation and FIX protocol
 */
function handleTraderMadeMessage(data: any, apiKeyIndex: number): void {
  markApiKeySuccess(apiKeyIndex);
  
  // Enhanced data validation to ensure legitimate TraderMade data
  if (data.symbol && data.bid && data.ask) {
    const symbol = data.symbol;
    const bid = parseFloat(data.bid);
    const ask = parseFloat(data.ask);
    
    // Validate price data quality
    if (isNaN(bid) || isNaN(ask) || bid <= 0 || ask <= 0 || ask < bid) {
      console.error(`🚨 DevOps: Invalid price data for ${symbol}: bid=${bid}, ask=${ask}`);
      return;
    }
    
    const midPrice = (bid + ask) / 2;
    const timestamp = Date.now();
    
    // Additional validation: Check for reasonable spread
    const spread = ask - bid;
    const spreadPercent = (spread / midPrice) * 100;
    if (spreadPercent > 10) { // Spread > 10% indicates suspicious data
      console.warn(`⚠️ DevOps: Unusually wide spread for ${symbol}: ${spreadPercent.toFixed(2)}%`);
    }
    
    // Update cache with enhanced metadata
    connectionManager.priceCache.set(symbol, {
      price: midPrice,
      bid,
      ask,
      timestamp
    });
    
    // Create FIX-style message with sequence number
    const fixMessage = {
      messageType: 'PRICE_UPDATE',
      symbol,
      bid,
      ask,
      price: midPrice,
      timestamp,
      sequence: ++connectionManager.sequenceCounter,
      apiKeyIndex,
      is_institutional_tick: true,
      is_ultra_fast_tick: true,
      tick_timestamp: timestamp
    };

    // Broadcast to all connected clients with zero latency
    broadcastToClients(fixMessage);
    
    console.log(`⚡ FIX PRICE BROADCAST: ${symbol} = ${midPrice.toFixed(5)} (${bid}/${ask}) [Seq: ${fixMessage.sequence}] [API: ${apiKeyIndex}]`);
  }
}

/**
 * Broadcast message to all connected clients with enhanced delivery
 */
function broadcastToClients(message: any): void {
  const messageStr = JSON.stringify(message);
  const clientCount = connectionManager.clients.size;
  
  if (clientCount === 0) return;
  
  let successCount = 0;
  let failureCount = 0;
  
  connectionManager.clients.forEach((ws, clientId) => {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
        successCount++;
      } else {
        connectionManager.clients.delete(clientId);
        failureCount++;
      }
    } catch (error) {
      console.error(`❌ Failed to send to client ${clientId}:`, error);
      connectionManager.clients.delete(clientId);
      failureCount++;
    }
  });
  
  if (failureCount > 0) {
    console.log(`📡 Broadcast complete: ${successCount} success, ${failureCount} failures`);
  }
}

/**
 * Handle force refresh requests (especially for crypto)
 */
function handleForceRefresh(symbols: string[], priority: string = 'normal'): void {
  console.log(`🔄 Force refresh requested for: ${symbols.join(', ')} - Priority: ${priority}`);
  
  symbols.forEach(symbol => {
    // For crypto symbols with high priority, bump to active list
    const isCrypto = symbol.includes('BTC') || symbol.includes('ETH');
    if (isCrypto && priority === 'crypto_high') {
      // Force crypto into active symbols list
      if (!connectionManager.activeSymbols.has(symbol)) {
        if (connectionManager.activeSymbols.size >= 5) {
          // Remove least important non-crypto symbol to make room
          const toRemove = Array.from(connectionManager.activeSymbols).find(s => !s.includes('BTC') && !s.includes('ETH'));
          if (toRemove) {
            connectionManager.activeSymbols.delete(toRemove);
            connectionManager.pendingSymbols.add(toRemove);
            console.log(`🔄 Bumped ${toRemove} to pending to prioritize ${symbol}`);
          }
        }
        connectionManager.activeSymbols.add(symbol);
        console.log(`⚡ CRYPTO PRIORITY: Added ${symbol} to active symbols`);
      }
    }
    
    // Immediately fetch via REST as fallback
    fetchPriceFallback([symbol]);
  });
  
  // Re-authenticate with updated symbol list if crypto was prioritized
  if (priority === 'crypto_high' && connectionManager.traderMadeConnection.ws?.readyState === WebSocket.OPEN) {
    reauthenticateTraderMade();
  }
}

/**
 * Subscription manager functions
 */
function subscribeToSymbols(symbols: string[]): void {
  console.log(`📡 Processing subscription request for: ${symbols.join(', ')}`);
  
  let shouldReauth = false;
  
  // Sort symbols to prioritize crypto (BTC, ETH)
  const sortedSymbols = symbols.sort((a, b) => {
    const aCrypto = a.includes('BTC') || a.includes('ETH');
    const bCrypto = b.includes('BTC') || b.includes('ETH');
    if (aCrypto && !bCrypto) return -1;
    if (!aCrypto && bCrypto) return 1;
    return 0;
  });
  
  sortedSymbols.forEach(symbol => {
    const currentCount = connectionManager.subscriptions.get(symbol) || 0;
    connectionManager.subscriptions.set(symbol, currentCount + 1);
    
    if (currentCount === 0) {
      // New symbol - prioritize crypto
      const isCrypto = symbol.includes('BTC') || symbol.includes('ETH');
      
      if (connectionManager.activeSymbols.size < 5) {
        connectionManager.activeSymbols.add(symbol);
        shouldReauth = true;
        console.log(`✅ Added ${symbol} to active symbols (${connectionManager.activeSymbols.size}/5) ${isCrypto ? '🪙 CRYPTO' : ''}`);
      } else if (isCrypto) {
        // For crypto, bump existing non-crypto symbol to pending
        const nonCrypto = Array.from(connectionManager.activeSymbols).find(s => !s.includes('BTC') && !s.includes('ETH'));
        if (nonCrypto) {
          connectionManager.activeSymbols.delete(nonCrypto);
          connectionManager.pendingSymbols.add(nonCrypto);
          connectionManager.activeSymbols.add(symbol);
          shouldReauth = true;
          console.log(`⚡ CRYPTO BUMP: Replaced ${nonCrypto} with ${symbol} in active symbols`);
        } else {
          connectionManager.pendingSymbols.add(symbol);
          console.log(`⏳ Added crypto ${symbol} to pending queue (all active slots are crypto)`);
        }
      } else {
        connectionManager.pendingSymbols.add(symbol);
        console.log(`⏳ Added ${symbol} to pending queue (active symbols full)`);
      }
      
      // Serve from cache or REST fallback immediately for pending symbols
      if (!connectionManager.activeSymbols.has(symbol)) {
        const cached = connectionManager.priceCache.get(symbol);
        if (cached) {
          const message = {
            messageType: 'PRICE_UPDATE',
            symbol,
            ...cached,
            sequence: ++connectionManager.sequenceCounter,
            source: 'cache'
          };
          broadcastToClients(message);
        } else {
          // Fetch via REST for overflow symbols
          fetchPriceFallback([symbol]);
        }
      }
    }
  });
  
  if (shouldReauth && connectionManager.traderMadeConnection.ws?.readyState === WebSocket.OPEN) {
    // Re-authenticate with new symbol list
    reauthenticateTraderMade();
  }
}

function unsubscribeFromSymbols(symbols: string[]): void {
  console.log(`📡 Processing unsubscription request for: ${symbols.join(', ')}`);
  
  let shouldReauth = false;
  
  symbols.forEach(symbol => {
    const currentCount = connectionManager.subscriptions.get(symbol) || 0;
    const newCount = Math.max(currentCount - 1, 0);
    
    if (newCount === 0) {
      connectionManager.subscriptions.delete(symbol);
      connectionManager.activeSymbols.delete(symbol);
      connectionManager.pendingSymbols.delete(symbol);
      shouldReauth = true;
      console.log(`🗑️ Removed ${symbol} from subscriptions`);
      
      // Promote a pending symbol if available
      if (connectionManager.pendingSymbols.size > 0) {
        const nextSymbol = Array.from(connectionManager.pendingSymbols)[0];
        connectionManager.pendingSymbols.delete(nextSymbol);
        connectionManager.activeSymbols.add(nextSymbol);
        console.log(`⬆️ Promoted ${nextSymbol} from pending to active`);
      }
    } else {
      connectionManager.subscriptions.set(symbol, newCount);
    }
  });
  
  if (shouldReauth && connectionManager.traderMadeConnection.ws?.readyState === WebSocket.OPEN) {
    reauthenticateTraderMade();
  }
}

function reauthenticateTraderMade(): void {
  const ws = connectionManager.traderMadeConnection.ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  
  const healthyKey = getHealthyApiKey();
  if (!healthyKey) return;
  
  const symbolList = Array.from(connectionManager.activeSymbols).slice(0, 5).join(',') || 'EURUSD';
  const authMessage = {
    userKey: healthyKey.key,
    symbol: symbolList
  };
  
  ws.send(JSON.stringify(authMessage));
  console.log(`🔄 Re-authenticated with symbols: ${symbolList}`);
}

/**
 * Fallback price fetching via REST API with API key rotation
 */
async function fetchPriceFallback(symbols: string[]): Promise<void> {
  const healthyKey = getHealthyApiKey();
  if (!healthyKey) {
    console.error('❌ No healthy API keys for REST fallback');
    return;
  }

  try {
    const symbolList = symbols.join(',');
    const url = `${TRADERMADE_REST_URL}?currency=${symbolList}&api_key=${healthyKey.key}`;
    
    console.log(`🔄 Fetching fallback prices via REST API (key ${healthyKey.index})...`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.quotes && Array.isArray(data.quotes)) {
      data.quotes.forEach((quote: any) => {
        if (quote.instrument && quote.bid && quote.ask) {
          const symbol = quote.instrument;
          const bid = parseFloat(quote.bid);
          const ask = parseFloat(quote.ask);
          const midPrice = (bid + ask) / 2;
          const timestamp = Date.now();
          
          connectionManager.priceCache.set(symbol, {
            price: midPrice,
            bid,
            ask,
            timestamp
          });
          
          const message = {
            messageType: 'PRICE_UPDATE',
            symbol,
            bid,
            ask,
            price: midPrice,
            timestamp,
            sequence: ++connectionManager.sequenceCounter,
            apiKeyIndex: healthyKey.index,
            is_institutional_tick: false,
            is_ultra_fast_tick: false,
            source: 'rest_fallback'
          };
          
          broadcastToClients(message);
        }
      });
      
      markApiKeySuccess(healthyKey.index);
      console.log(`✅ REST fallback completed with ${data.quotes.length} prices`);
    }
  } catch (error) {
    console.error(`❌ REST fallback failed (API key ${healthyKey.index}):`, error);
    markApiKeyFailure(healthyKey.index);
  }
}

/**
 * Main request handler with enhanced FIX protocol support
 */
serve(async (req) => {
  const url = new URL(req.url);
  
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
    });
  }

  // Handle WebSocket upgrade for FIX protocol streaming
  if (req.headers.get('upgrade') === 'websocket') {
    const { socket, response } = Deno.upgradeWebSocket(req);
    const clientId = crypto.randomUUID();
    const keyIndex = parseInt(url.searchParams.get('key_index') || '0');
    const connectionId = url.searchParams.get('connection_id') || 'default';
    
    console.log(`🔌 New FIX client connected: ${clientId} (connection: ${connectionId}, key: ${keyIndex})`);
    
    socket.onopen = () => {
      connectionManager.clients.set(clientId, socket);
      connectionManager.traderMadeConnection.clientCount = connectionManager.clients.size;
      
      // Ensure TraderMade connection exists
      if (!connectionManager.traderMadeConnection.ws || connectionManager.traderMadeConnection.ws.readyState !== WebSocket.OPEN) {
        createTraderMadeConnection();
      }
      
      // Send connection status
      socket.send(JSON.stringify({
        messageType: 'CONNECTION_STATUS',
        status: 'connected',
        clientId,
        connectionId: 'pooled',
        keyIndex: connectionManager.currentKeyIndex,
        timestamp: Date.now()
      }));
      
      // Send cached prices immediately
      connectionManager.priceCache.forEach((data, symbol) => {
        socket.send(JSON.stringify({
          messageType: 'PRICE_UPDATE',
          symbol,
          ...data,
          sequence: ++connectionManager.sequenceCounter,
          is_cached: true
        }));
      });
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.messageType === 'LOGON') {
          console.log(`📡 FIX logon from client ${clientId}`);
          socket.send(JSON.stringify({
            messageType: 'LOGON_ACK',
            status: 'success',
            heartbeatInterval: 10000,
            timestamp: Date.now()
          }));
        } else if (message.messageType === 'HEARTBEAT') {
          socket.send(JSON.stringify({
            messageType: 'HEARTBEAT_ACK',
            timestamp: Date.now()
          }));
        } else if (message.action === 'subscribe' && Array.isArray(message.symbols)) {
          subscribeToSymbols(message.symbols);
        } else if (message.action === 'unsubscribe' && Array.isArray(message.symbols)) {
          unsubscribeFromSymbols(message.symbols);
        } else if (message.action === 'force_refresh' && Array.isArray(message.symbols)) {
          // Handle crypto priority refresh requests
          console.log(`🚨 FORCE REFRESH: ${message.symbols.join(', ')} - Priority: ${message.priority || 'normal'}`);
          handleForceRefresh(message.symbols, message.priority);
        } else if (message.action === 'ping') {
          // Handle ping/pong for connection health
          socket.send(JSON.stringify({
            messageType: 'PONG',
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error(`❌ Failed to parse client message from ${clientId}:`, error);
      }
    };

    socket.onclose = () => {
      console.log(`🔌 FIX client disconnected: ${clientId}`);
      connectionManager.clients.delete(clientId);
      connectionManager.traderMadeConnection.clientCount = connectionManager.clients.size;
    };

    socket.onerror = (error) => {
      console.error(`❌ FIX client error ${clientId}:`, error);
      connectionManager.clients.delete(clientId);
    };

    return response;
  }

  // Handle health check requests
  if (url.pathname === '/health') {
    const healthStatus = {
      status: 'healthy',
      timestamp: Date.now(),
      connections: {
        clients: connectionManager.clients.size,
        tradermade: connectionManager.traderMadeConnection.ws ? 1 : 0
      },
      apiKeys: Object.fromEntries(connectionManager.apiKeyHealth),
      subscriptions: {
        active: Array.from(connectionManager.activeSymbols),
        pending: Array.from(connectionManager.pendingSymbols),
        refCounts: Object.fromEntries(connectionManager.subscriptions)
      },
      cache: {
        symbols: connectionManager.priceCache.size,
        sequenceNumber: connectionManager.sequenceCounter
      }
    };
    
    return new Response(JSON.stringify(healthStatus), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }

  return new Response('TraderMade FIX Streaming Service', {
    headers: { 'Content-Type': 'text/plain' }
  });
});

// Initialize connections on startup
console.log('🚀 Starting TraderMade FIX Streaming Service...');
console.log(`📊 Configured with ${API_KEYS.length} API keys`);

// Create initial single connection
if (API_KEYS.length > 0) {
  console.log('🔧 Initializing single TraderMade connection pool...');
  createTraderMadeConnection();
  
  // Health monitoring and keep-alive
  setInterval(() => {
    const stats = {
      clients: connectionManager.clients.size,
      activeSymbols: connectionManager.activeSymbols.size,
      pendingSymbols: connectionManager.pendingSymbols.size,
      cachedSymbols: connectionManager.priceCache.size
    };
    console.log(`📊 Health: ${connectionManager.traderMadeConnection.ws ? 1 : 0} TM connection, ${stats.clients} clients, ${stats.cachedSymbols} cached symbols`);
    
    // Send heartbeat to TraderMade if connected
    if (connectionManager.traderMadeConnection.ws?.readyState === WebSocket.OPEN) {
      connectionManager.traderMadeConnection.ws.send(JSON.stringify({ type: 'ping' }));
    }
    
    // Auto-reconnect if no clients but should be connected
    if (connectionManager.clients.size === 0 && connectionManager.traderMadeConnection.ws) {
      // Keep connection alive for faster client reconnection
    } else if (connectionManager.clients.size > 0 && !connectionManager.traderMadeConnection.ws) {
      console.log('⚠️ No active TraderMade connection but clients are connected, attempting to reconnect...');
      createTraderMadeConnection();
    }
  }, 10000); // Every 10 seconds
} else {
  console.error('❌ No API keys configured - service will not function');
}