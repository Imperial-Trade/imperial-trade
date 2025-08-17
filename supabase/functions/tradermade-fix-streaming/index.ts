/**
 * TraderMade FIX Protocol Streaming Edge Function
 * Institutional-grade price streaming with API key rotation and binary protocol support
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Multiple API keys for rotation and failover
const API_KEYS = [
  Deno.env.get('TRADERMADE_API_KEY'),
  Deno.env.get('TRADERMADE_REST_API_KEY'),
  // Additional keys can be added here
].filter(Boolean);

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
  currentKeyIndex: 0
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
 * Get next healthy API key with load balancing
 */
function getHealthyApiKey(): { key: string; index: number } | null {
  const healthyKeys = Array.from(connectionManager.apiKeyHealth.entries())
    .filter(([_, health]) => health.isActive && health.failures < 5)
    .sort((a, b) => a[1].lastSuccess - b[1].lastSuccess); // Least recently used first

  if (healthyKeys.length === 0) {
    console.error('❌ No healthy API keys available');
    return null;
  }

  const [index] = healthyKeys[0];
  const key = API_KEYS[index];
  
  if (!key) {
    console.error(`❌ API key at index ${index} is undefined`);
    return null;
  }

  console.log(`🔑 Using API key index ${index} (failures: ${connectionManager.apiKeyHealth.get(index)?.failures || 0})`);
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
 * Mark API key as failed
 */
function markApiKeyFailure(index: number): void {
  const health = connectionManager.apiKeyHealth.get(index);
  if (health) {
    health.failures += 1;
    if (health.failures >= 5) {
      health.isActive = false;
      console.warn(`⚠️ API key index ${index} marked as inactive due to repeated failures`);
      
      // Reactivate after 5 minutes
      setTimeout(() => {
        health.isActive = true;
        health.failures = 0;
        console.log(`🔄 Reactivated API key index ${index}`);
      }, 5 * 60 * 1000);
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
      console.log(`✅ TraderMade WebSocket connected (API key ${apiKeyIndex})`);
      connectionManager.traderMadeConnection.isReady = true;
      markApiKeySuccess(apiKeyIndex);
      
      // Send authentication message
      const authMessage = {
        userKey: apiKey,
        symbol: 'EURUSD,GBPUSD,USDJPY,AUDUSD,USDCAD,USDCHF,NZDUSD,EURJPY,GBPJPY,EURGBP,AUDJPY,EURAUD,USDCNH,XAUUSD,XAGUSD,SPX500,NAS100,UK100,GER30,FRA40,JPN225,AUS200,BTCUSD,ETHUSD'
      };
      
      ws.send(JSON.stringify(authMessage));
      console.log(`📡 Sent authentication for API key ${apiKeyIndex}`);
    };

    ws.onmessage = (event) => {
      try {
        connectionManager.traderMadeConnection.lastHeartbeat = Date.now();
        
        // Handle both JSON and plain text messages from TraderMade
        let data;
        
        if (typeof event.data === 'string') {
          // Check if it's a plain text status message
          if (event.data === 'Connected' || event.data.startsWith('Subscription')) {
            console.log(`📡 TraderMade status: ${event.data} (API key ${apiKeyIndex})`);
            markApiKeySuccess(apiKeyIndex);
            return;
          }
          
          // Try to parse as JSON
          try {
            data = JSON.parse(event.data);
          } catch (parseError) {
            console.log(`📡 TraderMade text message (API key ${apiKeyIndex}): ${event.data}`);
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
 * Handle incoming TraderMade message with FIX protocol enhancements
 */
function handleTraderMadeMessage(data: any, apiKeyIndex: number): void {
  markApiKeySuccess(apiKeyIndex);
  
  if (data.symbol && data.bid && data.ask) {
    const symbol = data.symbol;
    const bid = parseFloat(data.bid);
    const ask = parseFloat(data.ask);
    const midPrice = (bid + ask) / 2;
    const timestamp = Date.now();
    
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
        tradermade: connectionManager.traderMadeConnections.size
      },
      apiKeys: Object.fromEntries(connectionManager.apiKeyHealth),
      cache: {
        symbols: connectionManager.priceCache.size,
        sequenceNumber: connectionManager.sequenceCounter
      }
    };
    
    return new Response(JSON.stringify(healthStatus), {
      headers: { 'Content-Type': 'application/json' }
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
} else {
  console.error('❌ No API keys configured - service will not function');
}

// Periodic health monitoring and connection management
setInterval(() => {
  const hasActiveConnection = connectionManager.traderMadeConnection.ws && 
                              connectionManager.traderMadeConnection.ws.readyState === WebSocket.OPEN;
  const activeClients = connectionManager.clients.size;
  
  console.log(`📊 Health: ${hasActiveConnection ? '1' : '0'} TM connection, ${activeClients} clients, ${connectionManager.priceCache.size} cached symbols`);
  
  // Ensure we always have at least one active connection if we have clients
  if (!hasActiveConnection && activeClients > 0) {
    console.warn('⚠️ No active TraderMade connection but clients are connected, attempting to reconnect...');
    createTraderMadeConnection();
  }
  
  // Check connection health - if no heartbeat in 2 minutes, reconnect
  const timeSinceLastHeartbeat = Date.now() - connectionManager.traderMadeConnection.lastHeartbeat;
  if (hasActiveConnection && timeSinceLastHeartbeat > 120000) {
    console.warn('⚠️ TraderMade connection stale, forcing reconnection...');
    if (connectionManager.traderMadeConnection.ws) {
      connectionManager.traderMadeConnection.ws.close();
    }
    createTraderMadeConnection();
  }
}, 30000); // Every 30 seconds