import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

// ========== TRADERMADE BUSINESS PLAN INFRASTRUCTURE ==========
// Ultra-fast cache configuration with tiered TTL based on asset volatility
const priceCache = new Map<string, TradermadePriceData>();
const CACHE_TTL_CRYPTO = 100; // 100ms for crypto (highest volatility)
const CACHE_TTL_GOLD = 200; // 200ms for gold (high volatility)
const CACHE_TTL_FOREX = 300; // 300ms for forex (medium volatility)
const CACHE_TTL_INDICES = 500; // 500ms for indices (lower volatility)

// Business Plan Rate Limiting - 1000+ requests/minute
let globalRateLimitCount = 0;
let lastRateLimitReset = Date.now();
const RATE_LIMIT_PER_MINUTE = 1200; // Business plan: 1200 requests/minute (20 req/s)

// Ultra-fast batching for business plan
const BATCH_SEND_INTERVAL_MS = 100; // Ultra-fast 100ms batching for real-time performance
const HEARTBEAT_INTERVAL_MS = 15000; // Optimized 15s heartbeat for better health monitoring
const WEBSOCKET_TIMEOUT_MS = 5000; // Reduced to 5s for faster failover

// Validate and normalize symbols
function validateSymbol(symbol: string): string | null {
  const upperSymbol = symbol.toUpperCase().trim();
  return TRADERMADE_SYMBOLS.includes(upperSymbol) ? upperSymbol : null;
}

// Business Plan Tiered Cache Management - Different TTLs based on asset volatility
function getCachedPrice(symbol: string): TradermadePriceData | null {
  const cached = priceCache.get(symbol);
  if (!cached) return null;
  
  const age = Date.now() - new Date(cached.timestamp).getTime();
  const cacheTTL = getCacheTTLForSymbol(symbol);
  
  if (age > cacheTTL) {
    priceCache.delete(symbol);
    return null;
  }
  
  return cached;
}

// Dynamic cache TTL based on asset volatility and market conditions
function getCacheTTLForSymbol(symbol: string): number {
  const upperSymbol = symbol.toUpperCase();
  
  // Crypto assets - highest volatility, fastest updates
  if (upperSymbol.includes('BTC') || upperSymbol.includes('ETH')) {
    return CACHE_TTL_CRYPTO; // 100ms
  }
  
  // Gold and precious metals - high volatility 
  if (upperSymbol.includes('XAU') || upperSymbol.includes('GOLD')) {
    return CACHE_TTL_GOLD; // 200ms
  }
  
  // Major forex pairs - medium volatility
  if (upperSymbol.includes('EUR') || upperSymbol.includes('GBP') || upperSymbol.includes('JPY')) {
    return CACHE_TTL_FOREX; // 300ms
  }
  
  // Indices - lower volatility during off-hours
  if (upperSymbol.includes('USA30') || upperSymbol.includes('NAS100') || upperSymbol.includes('SPX')) {
    return CACHE_TTL_INDICES; // 500ms
  }
  
  // Default to medium volatility
  return CACHE_TTL_FOREX;
}

function setCachedPrice(symbol: string, data: TradermadePriceData): void {
  priceCache.set(symbol, data);
}

// Improved rate limiting
function isRateLimited(): boolean {
  const now = Date.now();
  if (now - lastRateLimitReset > 60000) {
    globalRateLimitCount = 0;
    lastRateLimitReset = now;
  }
  
  return globalRateLimitCount >= RATE_LIMIT_PER_MINUTE;
}

// Optimized HTTP API fetching with better error handling
async function fetchTradermadePrice(symbol: string): Promise<TradermadePriceData | null> {
  if (isRateLimited()) {
    return getCachedPrice(symbol);
  }

  const apiKey = Deno.env.get('TRADERMADE_API_KEY');
  
  if (!apiKey) {
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
    
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), WEBSOCKET_TIMEOUT_MS); // Business plan: 5s timeout

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Supabase-Edge-Function'
      },
      signal: controller.signal
    });

    clearTimeout(abortTimer);

    if (!response.ok) {
      return getCachedPrice(symbol);
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
        return priceData;
      }
    }

    return getCachedPrice(symbol);
  } catch (error) {
    return getCachedPrice(symbol);
  }
}

serve(async (req) => {
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
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 10;

  // Optimized connection to Tradermade WebSocket
  async function connectToTradermade() {
    const apiKey = Deno.env.get('TRADERMADE_API_KEY');
    
    if (!apiKey) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Tradermade API key not configured',
          timestamp: new Date().toISOString()
        }));
      }
      
      // Fallback to HTTP API for all symbols with reduced frequency
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
      tradermadeSocket = new WebSocket(`wss://marketdata.tradermade.com/feedadv`);

      tradermadeSocket.onopen = () => {
        connectionHealthy = true;
        reconnectAttempts = 0;
        
        // Authenticate
        if (tradermadeSocket) {
          tradermadeSocket.send(JSON.stringify({
            userKey: apiKey,
            symbol: TRADERMADE_SYMBOLS.join(',')
          }));
        }

        // Optimized batching with reduced frequency
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        let lastPing = 0;
        heartbeatInterval = setInterval(() => {
          const now = Date.now();
          
          // Less frequent heartbeat
          if (tradermadeSocket?.readyState === WebSocket.OPEN && now - lastPing >= HEARTBEAT_INTERVAL_MS) {
            try { 
              tradermadeSocket.send(JSON.stringify({ type: 'ping' })); 
            } catch (_) {}
            lastPing = now;
          }

          // Optimized batch sending
          if (socket.readyState === WebSocket.OPEN && clientSubscriptions.size > 0) {
            const items: TradermadePriceData[] = [];
            for (const symbol of clientSubscriptions) {
              const cached = getCachedPrice(symbol);
              if (cached) items.push(cached);
            }
            if (items.length > 0) {
              socket.send(JSON.stringify({
                type: 'price_batch',
                items,
                tick_timestamp: now,
                update_frequency: `${BATCH_SEND_INTERVAL_MS}ms`
              }));
            }
          }
        }, BATCH_SEND_INTERVAL_MS);

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
          // Handle text messages (like "Connected") without parsing as JSON
          if (typeof event.data === 'string' && !event.data.startsWith('{')) {
            if (event.data.toLowerCase().includes('connected')) {
              console.log('✅ Tradermade authentication successful');
            }
            return;
          }

          const data = JSON.parse(event.data);

          // Handle authentication response
          if (data.message && (data.message.includes('connected') || data.message.includes('Connected'))) {
            return;
          }

          // Handle heartbeat/ping responses
          if (data.type === 'pong' || data.message === 'pong') {
            return;
          }

          // Handle price updates with optimized processing
          let symbol = data.symbol || data.instrument;
          if (symbol && (data.bid || data.ask || data.price || data.mid)) {
            symbol = symbol.toUpperCase();
            
            // Calculate mid price from available data
            let price = data.mid || data.price;
            if (!price && data.bid && data.ask) {
              price = (parseFloat(data.bid) + parseFloat(data.ask)) / 2;
            } else if (!price) {
              price = data.bid || data.ask;
            }
            
            price = parseFloat(price);
            
            if (!price || price <= 0 || isNaN(price)) {
              return;
            }
            
            const priceUpdate: TradermadePriceData = {
              symbol: symbol,
              price: price,
              bid: data.bid ? parseFloat(data.bid) : price,
              ask: data.ask ? parseFloat(data.ask) : price,
              timestamp: new Date().toISOString(),
              change: 0,
              changePercent: 0
            };

            // Cache the update (batching timer will deliver to client)
            setCachedPrice(symbol, priceUpdate);
          }
        } catch (error) {
          // Only log parsing errors for actual JSON messages
          if (event.data.startsWith('{')) {
            console.error('❌ Error parsing Tradermade message:', error);
          }
        }
      };

      tradermadeSocket.onclose = (event) => {
        connectionHealthy = false;
        
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        // Improved exponential backoff reconnection
        if (!reconnectTimeout && reconnectAttempts < maxReconnectAttempts) {
          const baseDelay = 1000; // 1s base
          const maxDelay = 30000; // 30s cap
          const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
          const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttempts) + jitter, maxDelay);
          
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            if (socket.readyState === WebSocket.OPEN) {
              reconnectAttempts++;
              connectToTradermade();
            }
          }, delay);
        }

        // Notify client with status
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'connection_status',
            status: 'disconnected',
            reconnecting: reconnectAttempts < maxReconnectAttempts,
            timestamp: new Date().toISOString()
          }));
        }
      };

      tradermadeSocket.onerror = (error) => {
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
      connectionHealthy = false;
      
      // Fallback to HTTP for all symbols
      const symbolsToFetch = clientSubscriptions.size > 0 ? Array.from(clientSubscriptions) : TRADERMADE_SYMBOLS;
      
      for (const symbol of symbolsToFetch) {
        fetchTradermadePrice(symbol).then(data => {
          if (data && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'price_update',
              ...data
            }));
          }
        }).catch(() => {
          // Silently handle errors to reduce log noise
        });
      }
    }
  }

  // Client WebSocket handlers
  socket.onopen = () => {
    connectToTradermade();
  };

  socket.onmessage = (event) => {
    try {
      const message: SubscriptionMessage = JSON.parse(event.data);
      
      if (message.action === 'subscribe') {
        for (const symbol of message.symbols) {
          const validSymbol = validateSymbol(symbol);
          if (validSymbol) {
            clientSubscriptions.add(validSymbol);
            
            // Send cached data immediately if available
            const cached = getCachedPrice(validSymbol);
            if (cached) {
              socket.send(JSON.stringify({
                type: 'price_update',
                ...cached
              }));
            }
          }
        }
      } else if (message.action === 'unsubscribe') {
        for (const symbol of message.symbols) {
          const validSymbol = validateSymbol(symbol);
          if (validSymbol) {
            clientSubscriptions.delete(validSymbol);
          }
        }
      }
    } catch (error) {
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  };

  socket.onclose = () => {
    // Cleanup resources
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
    }
    if (tradermadeSocket && tradermadeSocket.readyState === WebSocket.OPEN) {
      tradermadeSocket.close();
    }
  };

  return response;
});