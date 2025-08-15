import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Separate API keys for streaming and REST operations
const STREAMING_API_KEY = Deno.env.get('TRADERMADE_API_KEY') || '';
const REST_API_KEY = Deno.env.get('TRADERMADE_REST_API_KEY') || '';

console.log('🔑 API Key Configuration:');
console.log(`📡 Streaming key configured: ${STREAMING_API_KEY ? '✅' : '❌'}`);
console.log(`🌐 REST key configured: ${REST_API_KEY ? '✅' : '❌'}`);

// Tradermade symbol configuration
const TRADERMADE_SYMBOLS = ['XAUUSD', 'BTCUSD', 'USA30USD', 'NAS100USD', 'EURUSD'];

interface TradermadePriceData {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  timestamp: string;
  change: number;
  changePercent: number;
}

interface SubscriptionMessage {
  action: 'subscribe' | 'unsubscribe';
  symbols: string[];
}

interface ErrorMessage {
  type: 'error';
  message: string;
  timestamp: string;
}

// Global shared resources for the single Tradermade connection
let sharedTradermadeSocket: WebSocket | null = null;
let globalSubscribedSymbols = new Set<string>();
let clientConnections = new Set<WebSocket>();
let reconnectTimeout: number | null = null;
let heartbeatInterval: number | null = null;
let isConnectingToTradermade = false;

// Price cache for all symbols
const priceCache = new Map<string, { data: TradermadePriceData; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds
const STALE_CACHE_TTL = 300000; // 5 minutes - for fallback data

// Enhanced rate limiting with cooldown periods
let globalRateLimitCount = 0;
let lastRateLimitReset = Date.now();
let rateLimitCooldownUntil = 0;
const RATE_LIMIT_PER_MINUTE = 15; // Very conservative
const COOLDOWN_DURATION = 120000; // 2 minutes cooldown after hitting rate limit

// Validate and normalize symbols
function validateSymbol(symbol: string): string | null {
  const upperSymbol = symbol.toUpperCase().trim();
  return TRADERMADE_SYMBOLS.includes(upperSymbol) ? upperSymbol : null;
}

// Enhanced cache management
function getCachedPrice(symbol: string, allowStale = false): TradermadePriceData | null {
  const cached = priceCache.get(symbol);
  if (!cached) return null;
  
  const age = Date.now() - cached.timestamp;
  const maxAge = allowStale ? STALE_CACHE_TTL : CACHE_TTL;
  
  if (age > maxAge) {
    if (!allowStale) priceCache.delete(symbol);
    return null;
  }
  
  return cached.data;
}

function setCachedPrice(symbol: string, data: TradermadePriceData): void {
  priceCache.set(symbol, { data, timestamp: Date.now() });
}

// Enhanced rate limiting with backoff
function isRateLimited(): boolean {
  const now = Date.now();
  
  // Check if we're in cooldown period
  if (rateLimitCooldownUntil > now) {
    return true;
  }
  
  // Reset rate limit counter every minute
  if (now - lastRateLimitReset > 60000) {
    globalRateLimitCount = 0;
    lastRateLimitReset = now;
  }
  
  return globalRateLimitCount >= RATE_LIMIT_PER_MINUTE;
}

function activateRateLimitCooldown(): void {
  rateLimitCooldownUntil = Date.now() + COOLDOWN_DURATION;
  console.log(`🔴 Rate limit cooldown activated for ${COOLDOWN_DURATION / 1000}s`);
}

// HTTP API fetching with enhanced error handling
async function fetchTradermadePrice(symbol: string): Promise<TradermadePriceData | null> {
  if (isRateLimited()) {
    console.log(`⚠️ Rate limited - using cached data for ${symbol}`);
    return getCachedPrice(symbol, true);
  }

  if (!REST_API_KEY) {
    console.error('❌ TRADERMADE_REST_API_KEY not configured');
    return getCachedPrice(symbol, true);
  }

  try {
    globalRateLimitCount++;
    
    const url = `https://marketdata.tradermade.com/api/v1/live?currency=${symbol}&api_key=${REST_API_KEY}`;
    console.log(`🔄 HTTP request for ${symbol} (count: ${globalRateLimitCount})`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function'
      }
    });

    if (!response.ok) {
      console.error(`❌ HTTP ${response.status} for ${symbol}: ${response.statusText}`);
      
      if (response.status === 429) {
        activateRateLimitCooldown();
      }
      
      return getCachedPrice(symbol, true);
    }

    const data = await response.json();
    
    if (data.quotes && Array.isArray(data.quotes) && data.quotes.length > 0) {
      const quote = data.quotes[0];
      const mid = quote.mid || (quote.bid && quote.ask ? (quote.bid + quote.ask) / 2 : null);
      const price = mid || quote.ask || quote.bid || 0;
      
      if (price > 0) {
        const priceData: TradermadePriceData = {
          symbol: symbol,
          price: price,
          bid: quote.bid || price,
          ask: quote.ask || price,
          timestamp: new Date().toISOString(),
          change: 0,
          changePercent: 0
        };

        setCachedPrice(symbol, priceData);
        console.log(`✅ Fresh price for ${symbol}: $${price}`);
        return priceData;
      }
    }

    console.warn(`⚠️ No valid price data for ${symbol}`);
    return getCachedPrice(symbol, true);
    
  } catch (error) {
    console.error(`❌ Fetch error for ${symbol}:`, error.message);
    return getCachedPrice(symbol, true);
  }
}

// Single shared Tradermade WebSocket connection
async function connectSharedTradermadeSocket() {
  if (isConnectingToTradermade || sharedTradermadeSocket?.readyState === WebSocket.OPEN) {
    return;
  }

  if (!STREAMING_API_KEY) {
    console.error('❌ TRADERMADE_API_KEY not configured for WebSocket');
    startHttpFallbackForAllClients();
    return;
  }

  isConnectingToTradermade = true;

  try {
    console.log('🔌 Creating shared Tradermade WebSocket connection...');
    sharedTradermadeSocket = new WebSocket(`wss://marketdata.tradermade.com/feedadv`);

    sharedTradermadeSocket.onopen = () => {
      console.log('✅ Shared Tradermade WebSocket connected');
      isConnectingToTradermade = false;
      
      // Authenticate with all symbols to get general feed
      if (sharedTradermadeSocket) {
        console.log('📡 Authenticating shared WebSocket');
        sharedTradermadeSocket.send(JSON.stringify({
          userKey: STREAMING_API_KEY,
          symbol: TRADERMADE_SYMBOLS.join(',')
        }));
      }

      // Start heartbeat for shared connection
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      heartbeatInterval = setInterval(() => {
        if (sharedTradermadeSocket?.readyState === WebSocket.OPEN) {
          sharedTradermadeSocket.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);

      // Broadcast connection status to all clients
      broadcastToClients({
        type: 'connection_status',
        status: 'connected',
        dataSource: 'tradermade',
        timestamp: new Date().toISOString()
      });
    };

    sharedTradermadeSocket.onmessage = (event) => {
      try {
        // Handle text responses
        if (typeof event.data === 'string' && !event.data.startsWith('{')) {
          console.log('📋 Tradermade:', event.data);
          
          // Handle rate limit messages
          if (event.data.includes('User Key Used to many times')) {
            console.log('🔴 Shared connection hit rate limit - activating cooldown');
            activateRateLimitCooldown();
            startHttpFallbackForAllClients();
          }
          return;
        }

        const data = JSON.parse(event.data);
        
        // Process price updates
        let symbol = data.symbol || data.instrument;
        if (symbol && (data.bid || data.ask || data.price || data.mid)) {
          symbol = symbol.toUpperCase();
          
          let price = data.mid || data.price;
          if (!price && data.bid && data.ask) {
            price = (parseFloat(data.bid) + parseFloat(data.ask)) / 2;
          } else if (!price) {
            price = data.bid || data.ask;
          }
          
          price = parseFloat(price);
          
          if (price > 0 && !isNaN(price)) {
            const priceUpdate: TradermadePriceData = {
              symbol: symbol,
              price: price,
              bid: data.bid ? parseFloat(data.bid) : price,
              ask: data.ask ? parseFloat(data.ask) : price,
              timestamp: new Date().toISOString(),
              change: 0,
              changePercent: 0
            };

            // Cache the update
            setCachedPrice(symbol, priceUpdate);

            // Broadcast to all interested clients
            broadcastToClients({
              type: 'price_update',
              ...priceUpdate,
              dataSource: 'websocket_shared'
            });
          }
        }
      } catch (error) {
        console.error('❌ Error parsing shared Tradermade message:', error.message);
      }
    };

    sharedTradermadeSocket.onclose = (event) => {
      console.log(`🔌 Shared Tradermade WebSocket closed: ${event.code} ${event.reason}`);
      isConnectingToTradermade = false;
      
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }

      // Schedule reconnection with backoff
      if (!reconnectTimeout && clientConnections.size > 0) {
        const backoffMs = 10000; // 10 second fixed delay
        console.log(`🔄 Shared connection will reconnect in ${backoffMs}ms`);
        reconnectTimeout = setTimeout(() => {
          reconnectTimeout = null;
          if (clientConnections.size > 0) {
            connectSharedTradermadeSocket();
          }
        }, backoffMs);
      }

      // Start HTTP fallback for all clients
      startHttpFallbackForAllClients();

      // Notify all clients of disconnection
      broadcastToClients({
        type: 'connection_status',
        status: 'disconnected',
        reconnecting: true,
        timestamp: new Date().toISOString()
      });
    };

    sharedTradermadeSocket.onerror = (error) => {
      console.error('❌ Shared Tradermade WebSocket error:', error);
      isConnectingToTradermade = false;
      startHttpFallbackForAllClients();
    };

  } catch (error) {
    console.error('❌ Error creating shared Tradermade connection:', error);
    isConnectingToTradermade = false;
    startHttpFallbackForAllClients();
  }
}

// Broadcast message to all connected clients
function broadcastToClients(message: any) {
  for (const client of clientConnections) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Error broadcasting to client:', error);
      }
    }
  }
}

// HTTP fallback for all clients with smart batching
function startHttpFallbackForAllClients() {
  if (globalSubscribedSymbols.size === 0 || isRateLimited()) {
    return;
  }

  console.log('📡 Starting HTTP fallback for all clients...');
  
  const symbolsToFetch = Array.from(globalSubscribedSymbols);
  
  const batchFetch = async () => {
    if (isRateLimited()) {
      console.log('⚠️ HTTP fallback rate limited - broadcasting cached data');
      // Broadcast cached data
      for (const symbol of symbolsToFetch) {
        const cached = getCachedPrice(symbol, true);
        if (cached) {
          broadcastToClients({
            type: 'price_update',
            ...cached,
            dataSource: 'http_cached'
          });
        }
      }
      return;
    }

    // Fetch fresh data with delays between requests
    for (const symbol of symbolsToFetch) {
      try {
        const data = await fetchTradermadePrice(symbol);
        if (data) {
          broadcastToClients({
            type: 'price_update',
            ...data,
            dataSource: 'http_fallback'
          });
        }
      } catch (error) {
        console.error(`❌ HTTP fallback error for ${symbol}:`, error);
      }
      
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  // Execute batch fetch every 15 seconds during fallback
  const fallbackInterval = setInterval(() => {
    if (sharedTradermadeSocket?.readyState === WebSocket.OPEN || clientConnections.size === 0) {
      clearInterval(fallbackInterval);
      return;
    }
    batchFetch();
  }, 15000);
}

serve(async (req) => {
  console.log(`📞 ${req.method} request from ${req.headers.get('origin')}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle HTTP POST requests for direct price fetching
  if (req.method === 'POST') {
    try {
      const { symbols: requestedSymbols } = await req.json();
      
      if (!Array.isArray(requestedSymbols)) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid symbols format' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const validSymbols = requestedSymbols
        .map(validateSymbol)
        .filter((s): s is string => s !== null);

      const pricePromises = validSymbols.map(symbol => 
        fetchTradermadePrice(symbol).then(data => ({ symbol, data }))
      );

      const results = await Promise.all(pricePromises);
      const prices: Record<string, TradermadePriceData | null> = {};
      
      results.forEach(({ symbol, data }) => {
        prices[symbol] = data;
      });

      return new Response(JSON.stringify({
        success: true,
        prices,
        dataSource: 'tradermade_http',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('❌ Error in HTTP handler:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Handle WebSocket connections
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let clientSubscriptions = new Set<string>();

  // Client message handling
  socket.onmessage = (event) => {
    try {
      const message: SubscriptionMessage = JSON.parse(event.data);
      console.log('📨 Client message:', message);

      if (message.action === 'subscribe') {
        const validSymbols = message.symbols
          .map(validateSymbol)
          .filter((s): s is string => s !== null);
        
        // Update client subscriptions
        validSymbols.forEach(symbol => {
          clientSubscriptions.add(symbol);
          globalSubscribedSymbols.add(symbol);
        });
        
        console.log('📡 Client subscribed to:', validSymbols);
        
        // Send cached prices immediately if available
        validSymbols.forEach(symbol => {
          const cached = getCachedPrice(symbol);
          if (cached) {
            socket.send(JSON.stringify({
              type: 'price_update',
              ...cached,
              dataSource: 'cache'
            }));
          }
        });
        
      } else if (message.action === 'unsubscribe') {
        const validSymbols = message.symbols
          .map(validateSymbol)
          .filter((s): s is string => s !== null);
        
        // Update client subscriptions
        validSymbols.forEach(symbol => {
          clientSubscriptions.delete(symbol);
          
          // Remove from global subscriptions if no other clients need it
          let stillNeeded = false;
          for (const client of clientConnections) {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
              // Check if other clients need this symbol (simplified check)
              stillNeeded = true;
              break;
            }
          }
          if (!stillNeeded) {
            globalSubscribedSymbols.delete(symbol);
          }
        });
        
        console.log('📡 Client unsubscribed from:', validSymbols);
      }
    } catch (error) {
      console.error('❌ Error parsing client message:', error);
    }
  };

  socket.onopen = () => {
    console.log('🔌 Client WebSocket connected');
    clientConnections.add(socket);
    
    // Connect to shared Tradermade socket if needed
    if (!sharedTradermadeSocket || sharedTradermadeSocket.readyState !== WebSocket.OPEN) {
      connectSharedTradermadeSocket();
    }
  };

  socket.onclose = () => {
    console.log('🔌 Client WebSocket disconnected');
    
    // Remove client from connections
    clientConnections.delete(socket);
    
    // Update global subscriptions
    clientSubscriptions.forEach(symbol => {
      let stillNeeded = false;
      for (const client of clientConnections) {
        if (client.readyState === WebSocket.OPEN) {
          stillNeeded = true;
          break;
        }
      }
      if (!stillNeeded) {
        globalSubscribedSymbols.delete(symbol);
      }
    });
    
    // Close shared connection if no clients left
    if (clientConnections.size === 0) {
      console.log('🔌 No clients left - closing shared Tradermade connection');
      if (sharedTradermadeSocket) {
        sharedTradermadeSocket.close();
        sharedTradermadeSocket = null;
      }
      
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
      
      globalSubscribedSymbols.clear();
    }
    
    clientSubscriptions.clear();
  };

  return response;
});