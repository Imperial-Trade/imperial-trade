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

// Optimized cache configuration - balance freshness vs API limits
const priceCache = new Map<string, { data: TradermadePriceData; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds - more reasonable for API limits
const STALE_CACHE_TTL = 300000; // 5 minutes - for fallback data

// Smart rate limiting
let globalRateLimitCount = 0;
let lastRateLimitReset = Date.now();
const RATE_LIMIT_PER_MINUTE = 25; // Conservative limit
const circuitBreakerUntil = { timestamp: 0 }; // Circuit breaker state

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

// Smart rate limiting with circuit breaker
function isRateLimited(): boolean {
  const now = Date.now();
  
  // Check circuit breaker
  if (circuitBreakerUntil.timestamp > now) {
    return true;
  }
  
  // Reset rate limit counter every minute
  if (now - lastRateLimitReset > 60000) {
    globalRateLimitCount = 0;
    lastRateLimitReset = now;
  }
  
  return globalRateLimitCount >= RATE_LIMIT_PER_MINUTE;
}

function activateCircuitBreaker(durationMs = 60000): void {
  circuitBreakerUntil.timestamp = Date.now() + durationMs;
  console.log(`🔴 Circuit breaker activated for ${durationMs}ms`);
}

// Enhanced HTTP API fetching with circuit breaker
async function fetchTradermadePrice(symbol: string): Promise<TradermadePriceData | null> {
  // Check rate limiting and circuit breaker
  if (isRateLimited()) {
    console.log(`⚠️ Rate limited/circuit breaker - using cached data for ${symbol}`);
    return getCachedPrice(symbol, true); // Allow stale data when rate limited
  }

  if (!REST_API_KEY) {
    console.error('❌ TRADERMADE_REST_API_KEY not configured for HTTP requests');
    return getCachedPrice(symbol, true);
  }

  try {
    globalRateLimitCount++;
    
    const url = `https://marketdata.tradermade.com/api/v1/live?currency=${symbol}&api_key=${REST_API_KEY}`;
    console.log(`🔄 Fetching HTTP price for ${symbol} using REST API key`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function'
      }
    });

    if (!response.ok) {
      console.error(`❌ HTTP request failed for ${symbol}: ${response.status} ${response.statusText}`);
      
      // Handle rate limiting
      if (response.status === 429) {
        activateCircuitBreaker(); // Activate circuit breaker on 429
        console.log('🔴 Rate limit hit - circuit breaker activated');
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
        console.log(`✅ Fresh price cached for ${symbol}: $${price}`);
        return priceData;
      }
    }

    console.warn(`⚠️ No valid price data for ${symbol}`);
    return getCachedPrice(symbol, true);
    
  } catch (error) {
    console.error(`❌ Error fetching price for ${symbol}:`, error.message || error);
    return getCachedPrice(symbol, true);
  }
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
  let tradermadeSocket: WebSocket | null = null;
  let reconnectTimeout: number | null = null;
  let heartbeatInterval: number | null = null;
  let connectionHealthy = true;

  // Enhanced Tradermade WebSocket connection with streaming API key
  async function connectToTradermade() {
    if (!STREAMING_API_KEY) {
      console.error('❌ TRADERMADE_API_KEY (streaming) not configured for WebSocket connections');
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Tradermade streaming API key not configured',
          timestamp: new Date().toISOString()
        }));
      }
      
      // Start HTTP fallback with smart batching
      startHttpFallback();
      return;
    }

    try {
      console.log('🔌 Connecting to Tradermade WebSocket using streaming API key...');
      tradermadeSocket = new WebSocket(`wss://marketdata.tradermade.com/feedadv`);

      tradermadeSocket.onopen = () => {
        console.log('✅ Connected to Tradermade WebSocket with streaming key');
        connectionHealthy = true;
        
        // Authenticate with proper symbol subscription using streaming key
        if (tradermadeSocket) {
          console.log('📡 Authenticating WebSocket with streaming API key');
          tradermadeSocket.send(JSON.stringify({
            userKey: STREAMING_API_KEY,
            symbol: TRADERMADE_SYMBOLS.join(',')
          }));
        }

        // Optimized heartbeat and price updates (reduced frequency to avoid rate limits)
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
          if (tradermadeSocket?.readyState === WebSocket.OPEN) {
            // Send heartbeat every 30 seconds to maintain connection
            if (Date.now() % 30000 < 2000) {
              tradermadeSocket.send(JSON.stringify({ type: 'ping' }));
            }
          }
          
          // Send cached price updates every 2 seconds instead of 250ms to avoid spam
          if (socket.readyState === WebSocket.OPEN && clientSubscriptions.size > 0) {
            for (const symbol of clientSubscriptions) {
              const cached = getCachedPrice(symbol);
              if (cached) {
                socket.send(JSON.stringify({
                  type: 'price_update',
                  ...cached,
                  dataSource: 'websocket_cached'
                }));
              }
            }
          }
        }, 2000); // Reduced from 250ms to 2000ms

        // Notify client of connection
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'connection_status',
            status: 'connected',
            dataSource: 'tradermade',
            timestamp: new Date().toISOString()
          }));
        }
      };

      tradermadeSocket.onmessage = (event) => {
        try {
          // Handle authentication responses
          if (typeof event.data === 'string' && !event.data.startsWith('{')) {
            console.log('📋 Tradermade message:', event.data);
            return;
          }

          const data = JSON.parse(event.data);
          
          // Handle price updates
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

              // Send to client if subscribed
              if (clientSubscriptions.has(symbol) && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: 'price_update',
                  ...priceUpdate,
                  dataSource: 'websocket_live'
                }));
              }
            }
          }
        } catch (error) {
          console.error('❌ Error parsing Tradermade message:', error.message || error);
        }
      };

      tradermadeSocket.onclose = (event) => {
        console.log(`🔌 Tradermade WebSocket closed: ${event.code} ${event.reason}`);
        connectionHealthy = false;
        
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        // Smart reconnection with exponential backoff
        if (!reconnectTimeout) {
          const backoffMs = Math.min(5000 * Math.pow(2, 0), 30000); // Start with 5s, max 30s
          console.log(`🔄 Reconnecting in ${backoffMs}ms...`);
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            if (socket.readyState === WebSocket.OPEN) {
              connectToTradermade();
            }
          }, backoffMs);
        }

        // Start HTTP fallback while reconnecting
        startHttpFallback();

        // Notify client
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'connection_status',
            status: 'disconnected',
            reconnecting: true,
            timestamp: new Date().toISOString()
          }));
        }
      };

      tradermadeSocket.onerror = (error) => {
        console.error('❌ Tradermade WebSocket error:', error);
        connectionHealthy = false;
        startHttpFallback();
      };

    } catch (error) {
      console.error('❌ Error connecting to Tradermade:', error);
      connectionHealthy = false;
      startHttpFallback();
    }
  }

  // HTTP fallback mechanism
  function startHttpFallback() {
    console.log('📡 Starting HTTP fallback for subscribed symbols...');
    
    // Only fetch for actively subscribed symbols to minimize API calls
    if (clientSubscriptions.size === 0) return;
    
    const symbolsToFetch = Array.from(clientSubscriptions);
    
    // Batch HTTP requests with smart timing
    const fetchBatch = async () => {
      if (isRateLimited()) {
        console.log('⚠️ HTTP fallback rate limited, using cached data');
        // Send cached data to maintain connection
        for (const symbol of symbolsToFetch) {
          const cached = getCachedPrice(symbol, true);
          if (cached && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'price_update',
              ...cached,
              dataSource: 'http_cached'
            }));
          }
        }
        return;
      }

      // Fetch prices for subscribed symbols only
      for (const symbol of symbolsToFetch) {
        try {
          const data = await fetchTradermadePrice(symbol);
          if (data && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'price_update',
              ...data,
              dataSource: 'http_fallback'
            }));
          }
        } catch (error) {
          console.error(`❌ HTTP fallback error for ${symbol}:`, error);
        }
        
        // Add small delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    };

    // Execute batch fetch every 10 seconds (instead of every 250ms)
    const httpInterval = setInterval(() => {
      if (connectionHealthy || socket.readyState !== WebSocket.OPEN) {
        clearInterval(httpInterval);
        return;
      }
      fetchBatch();
    }, 10000);
  }

  // Client message handling
  socket.onmessage = (event) => {
    try {
      const message: SubscriptionMessage = JSON.parse(event.data);
      console.log('📨 Client message:', message);

      if (message.action === 'subscribe') {
        const validSymbols = message.symbols
          .map(validateSymbol)
          .filter((s): s is string => s !== null);
        
        validSymbols.forEach(symbol => clientSubscriptions.add(symbol));
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
        
        validSymbols.forEach(symbol => clientSubscriptions.delete(symbol));
        console.log('📡 Client unsubscribed from:', validSymbols);
      }
    } catch (error) {
      console.error('❌ Error parsing client message:', error);
    }
  };

  socket.onopen = () => {
    console.log('🔌 Client WebSocket connected');
    connectToTradermade();
  };

  socket.onclose = () => {
    console.log('🔌 Client WebSocket disconnected');
    
    // Cleanup
    if (tradermadeSocket) {
      tradermadeSocket.close();
      tradermadeSocket = null;
    }
    
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    
    clientSubscriptions.clear();
  };

  return response;
});