import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tradermade symbol configuration
const TRADERMADE_SYMBOLS = ['XAUUSD', 'BTCUSD', 'USA30', 'NAS100', 'EURUSD'];

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

// Cache configuration
const priceCache = new Map<string, TradermadePriceData>();
const CACHE_TTL = 5000; // 5 seconds

let globalRateLimitCount = 0;
let lastRateLimitReset = Date.now();
const RATE_LIMIT_PER_MINUTE = 30;

// Validate and normalize symbols
function validateSymbol(symbol: string): string | null {
  const upperSymbol = symbol.toUpperCase().trim();
  return TRADERMADE_SYMBOLS.includes(upperSymbol) ? upperSymbol : null;
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

// Fetch price from Tradermade HTTP API
async function fetchTradermadePrice(symbol: string): Promise<TradermadePriceData | null> {
  if (isRateLimited()) {
    console.log('⚠️ Rate limited - using cached data');
    return getCachedPrice(symbol);
  }

  const apiKey = Deno.env.get('TRADERMADE_API_KEY');
  console.log('🔑 HTTP API Key check:', apiKey ? 'Found' : 'Missing');
  
  if (!apiKey) {
    console.error('❌ TRADERMADE_API_KEY not found in environment for HTTP request');
    return null;
  }

  try {
    globalRateLimitCount++;
    
    const url = `https://marketdata.tradermade.com/api/v1/live?currency=${symbol}&api_key=${apiKey}`;
    console.log(`🔄 Fetching HTTP price for ${symbol}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`❌ HTTP request failed: ${response.status} ${response.statusText}`);
      return getCachedPrice(symbol);
    }

    const data = await response.json();
    console.log(`📦 Tradermade HTTP response for ${symbol}:`, data);

    if (data.quotes && data.quotes.length > 0) {
      const quote = data.quotes[0];
      const priceData: TradermadePriceData = {
        symbol: symbol,
        price: quote.mid || quote.ask || quote.bid || 0,
        bid: quote.bid,
        ask: quote.ask,
        timestamp: new Date().toISOString(),
        change: 0, // Will calculate later
        changePercent: 0
      };

      setCachedPrice(symbol, priceData);
      return priceData;
    }

    return getCachedPrice(symbol);
  } catch (error) {
    console.error(`❌ Error fetching price for ${symbol}:`, error);
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

  console.log(`🔌 WebSocket upgrade request: ${upgradeHeader}`);

  if (upgradeHeader.toLowerCase() !== "websocket") {
    console.log(`❌ Expected WebSocket, got: ${upgradeHeader}`);
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

  // Connect to Tradermade WebSocket
  async function connectToTradermade() {
    const apiKey = Deno.env.get('TRADERMADE_API_KEY');
    console.log('🔑 API Key check:', apiKey ? 'Found' : 'Missing');
    
    if (!apiKey) {
      console.error('❌ TRADERMADE_API_KEY not found in environment');
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Tradermade API key not configured',
        timestamp: new Date().toISOString()
      }));
      return;
    }

    try {
      console.log('🔌 Connecting to Tradermade WebSocket...');
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

        // Set up heartbeat and 1-second price updates
        if (heartbeatInterval) clearInterval(heartbeatInterval);
        heartbeatInterval = setInterval(() => {
          if (tradermadeSocket?.readyState === WebSocket.OPEN) {
            tradermadeSocket.send(JSON.stringify({ type: 'ping' }));
          }
          
          // Send cached prices every 1 second for subscribed symbols
          if (socket.readyState === WebSocket.OPEN && clientSubscriptions.size > 0) {
            for (const symbol of clientSubscriptions) {
              const cached = getCachedPrice(symbol);
              if (cached) {
                socket.send(JSON.stringify({
                  type: 'price_update',
                  ...cached
                }));
              }
            }
          }
        }, 1000); // 1-second interval for price updates

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
          const data = JSON.parse(event.data);
          console.log('📊 Received from Tradermade:', data);

          // Handle different message types
          if (data.symbol && data.bid && data.ask) {
            const symbol = data.symbol.toUpperCase();
            const price = (data.bid + data.ask) / 2;
            
            const priceUpdate: TradermadePriceData = {
              symbol: symbol,
              price: price,
              bid: data.bid,
              ask: data.ask,
              timestamp: new Date().toISOString(),
              change: 0,
              changePercent: 0
            };

            // Cache the update
            setCachedPrice(symbol, priceUpdate);

            // Send to client if subscribed
            if (clientSubscriptions.has(symbol) && socket.readyState === WebSocket.OPEN) {
              console.log(`💰 LIVE PRICE UPDATE for: ${symbol} Price: ${price}`);
              socket.send(JSON.stringify({
                type: 'price_update',
                ...priceUpdate
              }));
            }
          }
        } catch (error) {
          console.error('❌ Error parsing Tradermade message:', error);
        }
      };

      tradermadeSocket.onclose = (event) => {
        console.log(`🔌 Tradermade WebSocket closed: ${event.code} ${event.reason}`);
        connectionHealthy = false;
        
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }

        // Attempt reconnection
        if (!reconnectTimeout) {
          reconnectTimeout = setTimeout(() => {
            reconnectTimeout = null;
            if (socket.readyState === WebSocket.OPEN) {
              connectToTradermade();
            }
          }, 5000);
        }

        // Notify client
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'connection_status',
            status: 'disconnected',
            timestamp: new Date().toISOString()
          }));
        }
      };

      tradermadeSocket.onerror = (error) => {
        console.error('❌ Tradermade WebSocket error:', error);
        connectionHealthy = false;
      };

    } catch (error) {
      console.error('❌ Error connecting to Tradermade:', error);
      
      // Fall back to HTTP for initial data
      if (clientSubscriptions.size > 0) {
        console.log('📡 Falling back to HTTP API...');
        for (const symbol of clientSubscriptions) {
          fetchTradermadePrice(symbol).then(data => {
            if (data && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'price_update',
                ...data
              }));
            }
          });
        }
      }
    }
  }

  // Client WebSocket handlers
  socket.onopen = () => {
    console.log('🎯 Client connected to Tradermade streaming');
    
    // Immediately send connection status
    socket.send(JSON.stringify({
      type: 'connection_status',
      status: 'connecting',
      dataSource: 'tradermade',
      timestamp: new Date().toISOString()
    }));
    
    connectToTradermade();
  };

  socket.onmessage = async (event) => {
    try {
      const message: SubscriptionMessage = JSON.parse(event.data);
      console.log('📨 Client message:', message);

      if (message.action === 'subscribe' && Array.isArray(message.symbols)) {
        const validSymbols = message.symbols
          .map(validateSymbol)
          .filter((s): s is string => s !== null);

        validSymbols.forEach(symbol => clientSubscriptions.add(symbol));
        console.log('✅ Client subscribed to:', validSymbols);

        // Send cached data immediately if available
        for (const symbol of validSymbols) {
          const cached = getCachedPrice(symbol);
          if (cached) {
            socket.send(JSON.stringify({
              type: 'price_update',
              ...cached
            }));
          } else if (!connectionHealthy) {
            // Fetch via HTTP if WebSocket is down
            const data = await fetchTradermadePrice(symbol);
            if (data) {
              socket.send(JSON.stringify({
                type: 'price_update',
                ...data
              }));
            }
          }
        }
      } else if (message.action === 'unsubscribe' && Array.isArray(message.symbols)) {
        const validSymbols = message.symbols
          .map(validateSymbol)
          .filter((s): s is string => s !== null);

        validSymbols.forEach(symbol => clientSubscriptions.delete(symbol));
        console.log('❌ Client unsubscribed from:', validSymbols);
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
    console.error('❌ Client WebSocket error:', error);
  };

  return response;
});