import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use TRADERMADE_REST_API_KEY for HTTP fallback, TRADERMADE_API_KEY for WS
const WS_API_KEY = Deno.env.get('TRADERMADE_API_KEY') || '';
const HTTP_API_KEY = Deno.env.get('TRADERMADE_REST_API_KEY') || Deno.env.get('TRADERMADE_API_KEY') || '';

// Tradermade symbol configuration with normalization mapping
const TRADERMADE_SYMBOLS = ['XAUUSD', 'BTCUSD', 'USA30USD', 'NAS100USD', 'EURUSD'];

// Symbol normalization mapping: frontend symbol -> Tradermade symbol
const SYMBOL_MAPPING: Record<string, string> = {
  'XAUUSD': 'XAUUSD',
  'XAU/USD': 'XAUUSD', 
  'GOLD': 'XAUUSD',
  'BTCUSD': 'BTCUSD',
  'BTC/USD': 'BTCUSD',
  'BITCOIN': 'BTCUSD',
  'USA30': 'USA30USD',
  'USA30USD': 'USA30USD',
  'US30': 'USA30USD',
  'NAS100': 'NAS100USD', 
  'NAS100USD': 'NAS100USD',
  'NASDAQ': 'NAS100USD',
  'EURUSD': 'EURUSD',
  'EUR/USD': 'EURUSD'
};

// Reverse mapping for responses: Tradermade symbol -> canonical frontend symbol
const REVERSE_SYMBOL_MAPPING: Record<string, string> = {
  'XAUUSD': 'XAUUSD',
  'BTCUSD': 'BTCUSD', 
  'USA30USD': 'USA30',
  'NAS100USD': 'NAS100',
  'EURUSD': 'EURUSD'
};

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

// Cache configuration - optimized for ultra-fast 250ms ticks
const priceCache = new Map<string, TradermadePriceData>();
const CACHE_TTL = 1000; // 1 second for ultra-fast updates

let globalRateLimitCount = 0;
let lastRateLimitReset = Date.now();
const RATE_LIMIT_PER_MINUTE = 30;

// Validate and normalize symbols using mapping
function validateSymbol(symbol: string): string | null {
  const upperSymbol = symbol.toUpperCase().trim();
  const tradermadeSymbol = SYMBOL_MAPPING[upperSymbol];
  return tradermadeSymbol || null;
}

// Normalize frontend symbol to Tradermade symbol
function normalizeToTradermade(symbol: string): string {
  const upperSymbol = symbol.toUpperCase().trim();
  return SYMBOL_MAPPING[upperSymbol] || symbol;
}

// Convert Tradermade symbol back to frontend canonical symbol
function normalizeToFrontend(tradermadeSymbol: string): string {
  return REVERSE_SYMBOL_MAPPING[tradermadeSymbol] || tradermadeSymbol;
}

// Cache management
function getCachedPrice(symbol: string): TradermadePriceData | null {
  const cached = priceCache.get(symbol);
  if (!cached) return null;
  
  const age = Date.now() - new Date(cached.timestamp).getTime();
  if (age > CACHE_TTL) {
    priceCache.delete(symbol);
    return null;
  }
  
  return cached;
}

function setCachedPrice(symbol: string, data: TradermadePriceData): void {
  priceCache.set(symbol, data);
}

// Rate limiting
function isRateLimited(): boolean {
  const now = Date.now();
  if (now - lastRateLimitReset > 60000) {
    globalRateLimitCount = 0;
    lastRateLimitReset = now;
  }
  
  return globalRateLimitCount >= RATE_LIMIT_PER_MINUTE;
}

// Fetch price from Tradermade HTTP API with better error handling
async function fetchTradermadePrice(symbol: string): Promise<TradermadePriceData | null> {
  if (isRateLimited()) {
    console.log('⚠️ Rate limited - using cached data');
    return getCachedPrice(symbol);
  }

  const apiKey = HTTP_API_KEY;
  console.log('🔑 HTTP API Key check:', apiKey ? `Found (${apiKey.substring(0, 8)}...)` : 'Missing');
  
  if (!apiKey) {
    console.error('❌ TRADERMADE_HTTP_API_KEY/TRADERMADE_API_KEY not found for HTTP request');
    return getCachedPrice(symbol) || {
      symbol,
      price: 0,
      bid: 0,
      ask: 0,
      timestamp: new Date().toISOString(),
      change: 0,
      changePercent: 0
    };
  }

  try {
    globalRateLimitCount++;
    
    const url = `https://marketdata.tradermade.com/api/v1/live?currency=${symbol}&api_key=${apiKey}`;
    console.log(`🔄 Fetching HTTP price for ${symbol} (endpoint logged, API key masked)`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function'
      }
    });

    if (!response.ok) {
      console.error(`❌ HTTP request failed for ${symbol}: ${response.status} ${response.statusText}`);
      const errorText = await response.text().catch(() => 'No response body');
      console.error(`Response body:`, errorText);
      return getCachedPrice(symbol);
    }

    const data = await response.json();
    console.log(`✅ Tradermade HTTP response for ${symbol}:`, JSON.stringify(data, null, 2));

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
        console.log(`💰 Cached price for ${symbol}: $${price}`);
        return priceData;
      }
    }

    console.warn(`⚠️ No valid price data for ${symbol} in response:`, data);
    return getCachedPrice(symbol);
  } catch (error) {
    console.error(`❌ Error fetching price for ${symbol}:`, error.message || error);
    return getCachedPrice(symbol);
  }
}

serve(async (req) => {
  console.log(`📞 Incoming request: ${req.method} from ${req.headers.get('origin')}`);
  console.log(`📝 Headers:`, Object.fromEntries(req.headers.entries()));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight');
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

  console.log(`🔌 WebSocket upgrade request: "${upgradeHeader}"`);
  console.log(`📋 All headers:`, Object.fromEntries(headers.entries()));

  if (upgradeHeader.toLowerCase() !== "websocket") {
    console.error(`❌ Expected WebSocket upgrade, got: "${upgradeHeader}"`);
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
  const actionTracker = new Map<string, { type: 'subscribe' | 'unsubscribe'; ts: number }>();

  // Connect to Tradermade WebSocket with enhanced error handling
  async function connectToTradermade() {
    const apiKey = WS_API_KEY;
    console.log('🔑 WebSocket API Key check:', apiKey ? `Found (${apiKey.substring(0, 8)}...)` : 'Missing');
    
    if (!apiKey) {
      console.error('❌ TRADERMADE_WS_API_KEY/TRADERMADE_API_KEY not found in environment');
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Tradermade WS API key not configured - please check environment variables',
          timestamp: new Date().toISOString()
        }));
      }
      
      // Fall back to HTTP API for all symbols
      console.log('🔄 Falling back to HTTP API due to missing WS API key...');
      for (const symbol of TRADERMADE_SYMBOLS) {
        fetchTradermadePrice(symbol).then(data => {
          if (data && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'price_update',
              ...data
            }));
          }
        });
      }
      return;
    }

    try {
      console.log('🔌 Connecting to Tradermade WebSocket with API key...');
      tradermadeSocket = new WebSocket(`wss://marketdata.tradermade.com/feedadv`);

      tradermadeSocket.onopen = () => {
        console.log('✅ Connected to Tradermade WebSocket');
        connectionHealthy = true;
        
        // Authenticate
        if (tradermadeSocket) {
          tradermadeSocket.send(JSON.stringify({
            userKey: apiKey,
            symbol: TRADERMADE_SYMBOLS.join(',')
          }));
        }

        // Set up ultra-fast 250ms institutional tick updates
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
          if (tradermadeSocket?.readyState === WebSocket.OPEN) {
            // Send heartbeat every 12th tick (3 seconds) to maintain connection
            if (Date.now() % 3000 < 250) {
              tradermadeSocket.send(JSON.stringify({ type: 'ping' }));
            }
          }
          
          // Send ultra-fast institutional-grade tick prices every 250ms for all subscribed symbols
          if (socket.readyState === WebSocket.OPEN && clientSubscriptions.size > 0) {
            console.log('⚡ Sending ULTRA-FAST tick prices for', clientSubscriptions.size, 'symbols');
            for (const symbol of clientSubscriptions) {
              const cached = getCachedPrice(symbol);
              if (cached) {
                // Add micro-timestamp for ultra-fast institutional precision
                const tickData = {
                  type: 'price_update',
                  ...cached,
                  tick_timestamp: Date.now(),
                  is_institutional_tick: true,
                  is_ultra_fast_tick: true,
                  update_frequency: '250ms'
                };
                socket.send(JSON.stringify(tickData));
                console.log(`⚡ ULTRA-FAST TICK: ${symbol} = $${cached.price} @ ${new Date().toISOString()}`);
              } else {
                // Fetch fresh price if no cache available
                fetchTradermadePrice(symbol).then(data => {
                  if (data && socket.readyState === WebSocket.OPEN) {
                    const tickData = {
                      type: 'price_update',
                      ...data,
                      tick_timestamp: Date.now(),
                      is_institutional_tick: true,
                      is_ultra_fast_tick: true,
                      update_frequency: '250ms'
                    };
                    socket.send(JSON.stringify(tickData));
                    console.log(`⚡ FRESH ULTRA-FAST TICK: ${symbol} = $${data.price} @ ${new Date().toISOString()}`);
                  }
                });
              }
            }
          }
        }, 250); // Ultra-fast 250ms tick intervals

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
          // Handle raw text messages (like "Connected")
          if (typeof event.data === 'string' && !event.data.startsWith('{')) {
            console.log('📋 Tradermade text message:', event.data);
            
            if (event.data.toLowerCase().includes('connected')) {
              console.log('✅ Tradermade authentication successful');
            }
            return;
          }

          const data = JSON.parse(event.data);
          console.log('📊 Raw Tradermade message:', event.data);
          console.log('📊 Parsed Tradermade data:', JSON.stringify(data, null, 2));

          // Handle authentication response
          if (data.message && (data.message.includes('connected') || data.message.includes('Connected'))) {
            console.log('✅ Tradermade authentication successful');
            return;
          }

          // Handle heartbeat/ping responses
          if (data.type === 'pong' || data.message === 'pong') {
            console.log('💓 Heartbeat response from Tradermade');
            return;
          }

          // Handle price updates - support multiple formats
          let tradermadeSymbol = data.symbol || data.instrument;
          if (tradermadeSymbol && (data.bid || data.ask || data.price || data.mid)) {
            tradermadeSymbol = tradermadeSymbol.toUpperCase();
            
            // Calculate mid price from available data
            let price = data.mid || data.price;
            if (!price && data.bid && data.ask) {
              price = (parseFloat(data.bid) + parseFloat(data.ask)) / 2;
            } else if (!price) {
              price = data.bid || data.ask;
            }
            
            price = parseFloat(price);
            
            if (!price || price <= 0 || isNaN(price)) {
              console.log(`⚠️ Invalid price data for ${tradermadeSymbol}:`, data);
              return;
            }
            
            // Convert Tradermade symbol to frontend canonical symbol for consistency
            const frontendSymbol = normalizeToFrontend(tradermadeSymbol);
            
            const priceUpdate: TradermadePriceData = {
              symbol: frontendSymbol, // Use frontend canonical symbol
              price: price,
              bid: data.bid ? parseFloat(data.bid) : price,
              ask: data.ask ? parseFloat(data.ask) : price,
              timestamp: new Date().toISOString(),
              change: 0,
              changePercent: 0
            };

            // Cache using Tradermade symbol for API consistency
            setCachedPrice(tradermadeSymbol, priceUpdate);
            
            // Also cache using frontend symbol for client access
            setCachedPrice(frontendSymbol, priceUpdate);

            // Send to client if subscribed (check both symbol formats)
            if ((clientSubscriptions.has(tradermadeSymbol) || clientSubscriptions.has(frontendSymbol)) && socket.readyState === WebSocket.OPEN) {
              console.log(`💰 LIVE PRICE UPDATE: ${frontendSymbol} (${tradermadeSymbol}) = $${price}`);
              const tickTs = (typeof data.ts === 'string' || typeof data.ts === 'number') ? Number(data.ts) : Date.now();
              socket.send(JSON.stringify({
                type: 'price_update',
                ...priceUpdate,
                tick_timestamp: tickTs
              }));
            }
          } else {
            console.log('ℹ️ Non-price message from Tradermade:', JSON.stringify(data));
          }
        } catch (error) {
          console.error('❌ Error parsing Tradermade message:', error.message || error);
          console.error('❌ Raw message data:', event.data);
        }
      };

      tradermadeSocket.onclose = (event) => {
        console.log(`🔌 Tradermade WebSocket closed: ${event.code} ${event.reason}`);
        connectionHealthy = false;
        
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        // Enhanced ultra-fast reconnection for 250ms requirements
        if (!reconnectTimeout) {
          console.log('🚀 Ultra-fast reconnection - attempting immediate reconnect...');
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            if (socket.readyState === WebSocket.OPEN) {
              console.log('🔄 Reconnecting for ultra-fast 250ms ticks...');
              connectToTradermade();
            }
          }, 1000); // Reduced from 5000ms to 1000ms for ultra-fast recovery
        }

        // Notify client with enhanced status
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'connection_status',
            status: 'disconnected',
            reconnecting: true,
            ultra_fast_mode: true,
            timestamp: new Date().toISOString()
          }));
        }
      };

      tradermadeSocket.onerror = (error) => {
        console.error('❌ Tradermade WebSocket error:', error.message || error);
        console.error('❌ WebSocket error details:', {
          readyState: tradermadeSocket?.readyState,
          url: tradermadeSocket?.url
        });
        connectionHealthy = false;
        
        // Notify client of error
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Tradermade WebSocket connection error',
            timestamp: new Date().toISOString()
          }));
        }
      };

    } catch (error) {
      console.error('❌ Error connecting to Tradermade:', error.message || error);
      connectionHealthy = false;
      
      // Notify client of connection error
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to establish Tradermade connection',
          timestamp: new Date().toISOString()
        }));
      }
      
      // Fall back to HTTP for all symbols
      console.log('📡 Falling back to HTTP API for all symbols...');
      const symbolsToFetch = clientSubscriptions.size > 0 ? Array.from(clientSubscriptions) : TRADERMADE_SYMBOLS;
      
      for (const symbol of symbolsToFetch) {
        fetchTradermadePrice(symbol).then(data => {
          if (data && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'price_update',
              ...data
            }));
          }
        }).catch(err => {
          console.error(`Failed to fetch HTTP price for ${symbol}:`, err);
        });
      }
    }
  }

  // Client WebSocket handlers
  socket.onopen = () => {
    console.log('🎯 Client connected to Tradermade streaming');
    
    // Immediately send connection status
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'connection_status',
        status: 'connecting',
        dataSource: 'tradermade',
        timestamp: new Date().toISOString()
      }));
    }
    
    connectToTradermade();
  };

  socket.onmessage = async (event) => {
    try {
      const message: SubscriptionMessage = JSON.parse(event.data);
      console.log('📨 Client message:', message);

      if (message.action === 'subscribe' && Array.isArray(message.symbols)) {
        const now = Date.now();
        const validSymbols = message.symbols
          .map(validateSymbol)
          .filter((s): s is string => s !== null);

        const filtered = validSymbols.filter((symbol) => {
          const last = actionTracker.get(symbol);
          if (last && last.type === 'subscribe' && (now - last.ts) < 200) {
            // Ignore rapid duplicate subscribe
            return false;
          }
          actionTracker.set(symbol, { type: 'subscribe', ts: now });
          return true;
        });

        // Add both Tradermade and frontend symbols to subscriptions for dual lookup
        filtered.forEach(symbol => {
          const tradermadeSymbol = normalizeToTradermade(symbol);
          const frontendSymbol = normalizeToFrontend(tradermadeSymbol);
          clientSubscriptions.add(symbol);
          clientSubscriptions.add(tradermadeSymbol);
          clientSubscriptions.add(frontendSymbol);
        });
        console.log('✅ Client subscribed to:', filtered, '(normalized for dual lookup)');

        // Send cached data immediately if available, or fetch fresh data
        for (const symbol of filtered) {
          // Try both symbol formats for cache lookup
          const tradermadeSymbol = normalizeToTradermade(symbol);
          const frontendSymbol = normalizeToFrontend(symbol);
          
          let cached = getCachedPrice(symbol) || getCachedPrice(tradermadeSymbol) || getCachedPrice(frontendSymbol);
          
          if (cached) {
            console.log(`📋 Sending cached price for ${symbol}: $${cached.price}`);
            socket.send(JSON.stringify({
              type: 'price_update',
              ...cached
            }));
          } else {
            // Always fetch fresh data immediately for new subscriptions
            console.log(`🔄 Fetching fresh price for new subscription: ${symbol} (${tradermadeSymbol})`);
            const data = await fetchTradermadePrice(tradermadeSymbol);
            if (data) {
              // Ensure frontend symbol format for consistency
              const normalizedData = {
                ...data,
                symbol: normalizeToFrontend(data.symbol)
              };
              
              socket.send(JSON.stringify({
                type: 'price_update',
                ...normalizedData
              }));
              console.log(`✅ Sent fresh price for ${symbol}: $${data.price}`);
            }
          }
        }
      } else if (message.action === 'unsubscribe' && Array.isArray(message.symbols)) {
        const now = Date.now();
        const validSymbols = message.symbols
          .map(validateSymbol)
          .filter((s): s is string => s !== null);

        const filtered = validSymbols.filter((symbol) => {
          const last = actionTracker.get(symbol);
          // Ignore unsubscribe if just subscribed within 300ms, or repeated rapid unsubscribes
          if (last && ((last.type === 'subscribe' && (now - last.ts) < 300) || (last.type === 'unsubscribe' && (now - last.ts) < 200))) {
            return false;
          }
          actionTracker.set(symbol, { type: 'unsubscribe', ts: now });
          return true;
        });

        filtered.forEach(symbol => clientSubscriptions.delete(symbol));
        console.log('❌ Client unsubscribed from:', filtered);
      }
    } catch (error) {
      console.error('❌ Error handling client message:', error);
      const errorMsg: ErrorMessage = {
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      };
      socket.send(JSON.stringify(errorMsg));
    }
  };

  socket.onclose = () => {
    console.log('👋 Client disconnected');
    
    // Cleanup
    if (tradermadeSocket) {
      tradermadeSocket.close();
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    
    clientSubscriptions.clear();
  };

  socket.onerror = (error) => {
    console.error('❌ Client WebSocket error:', error.message || error);
    console.error('❌ Client socket details:', {
      readyState: socket.readyState,
      url: socket.url
    });
  };

  return response;
});
