import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
  dataSource: string;
  volume?: number;
}

interface SubscriptionMessage {
  type: 'subscribe' | 'unsubscribe';
  symbols: string[];
}

// Optimized symbol configuration for 610 calls/minute
const SYMBOL_CONFIG = {
  // Tier 1: High-frequency symbols (5-second cache, WebSocket priority)
  'BTC/USD': { 
    cacheTTL: 5000, 
    priority: 1, 
    wsSymbol: 'BTC/USD',
    maxCallsPerMinute: 200 
  },
  'XAU/USD': { 
    cacheTTL: 5000, 
    priority: 1, 
    wsSymbol: 'XAU/USD',
    maxCallsPerMinute: 200 
  },
  // Tier 2: Standard frequency (15-second cache)
  'EUR/USD': { 
    cacheTTL: 15000, 
    priority: 2, 
    wsSymbol: 'EUR/USD',
    maxCallsPerMinute: 100 
  }
};

const SUPPORTED_SYMBOLS = Object.keys(SYMBOL_CONFIG);

// Enhanced caching with tier-based TTL
const priceCache = new Map<string, { data: PriceUpdate, expires: number }>();

// Request rate limiting and deduplication
const requestQueue = new Map<string, Promise<PriceUpdate | null>>();
const lastApiCall = new Map<string, number>();

// WebSocket connection pool
const wsConnections = new Map<string, WebSocket>();

function getCachedPrice(symbol: string): PriceUpdate | null {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  priceCache.delete(symbol);
  return null;
}

function setCachedPrice(symbol: string, data: PriceUpdate): void {
  const config = SYMBOL_CONFIG[symbol];
  if (config) {
    priceCache.set(symbol, {
      data,
      expires: Date.now() + config.cacheTTL
    });
  }
}

// Smart request deduplication
async function fetchPriceWithDeduplication(symbol: string): Promise<PriceUpdate | null> {
  // Check if request is already in progress
  if (requestQueue.has(symbol)) {
    console.log(`🔄 Deduplicating request for ${symbol}`);
    return await requestQueue.get(symbol)!;
  }

  // Check rate limiting per symbol
  const config = SYMBOL_CONFIG[symbol];
  const lastCall = lastApiCall.get(symbol) || 0;
  const minInterval = 60000 / config.maxCallsPerMinute; // ms between calls
  
  if (Date.now() - lastCall < minInterval) {
    console.log(`⏱️ Rate limiting ${symbol}, using cache`);
    return getCachedPrice(symbol);
  }

  // Create and queue the request
  const requestPromise = fetchRealPrice(symbol);
  requestQueue.set(symbol, requestPromise);

  try {
    const result = await requestPromise;
    lastApiCall.set(symbol, Date.now());
    return result;
  } finally {
    requestQueue.delete(symbol);
  }
}

async function fetchRealPrice(symbol: string): Promise<PriceUpdate | null> {
  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  
  if (!apiKey) {
    console.error('❌ TWELVE_DATA_API_KEY not configured');
    return null;
  }

  try {
    const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`;
    console.log(`🌐 API call for ${symbol}`);
    
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(8000)
    });
    
    if (!response.ok) {
      console.error(`❌ API error for ${symbol}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status === 'error' || !data.close) {
      console.error(`❌ Invalid data for ${symbol}:`, data);
      return null;
    }
    
    const priceUpdate: PriceUpdate = {
      symbol,
      price: parseFloat(data.close) || 0,
      change: parseFloat(data.change) || 0,
      changePercent: parseFloat(data.percent_change) || 0,
      timestamp: new Date().toISOString(),
      dataSource: 'twelve_data',
      volume: parseFloat(data.volume) || undefined
    };
    
    console.log(`✅ Success ${symbol}: $${priceUpdate.price} (${priceUpdate.changePercent >= 0 ? '+' : ''}${priceUpdate.changePercent}%)`);
    setCachedPrice(symbol, priceUpdate);
    
    return priceUpdate;
    
  } catch (error) {
    console.error(`❌ Exception for ${symbol}:`, error);
    return null;
  }
}

// WebSocket management per symbol
function connectWebSocket(symbol: string, clientSocket: WebSocket): WebSocket | null {
  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  if (!apiKey) {
    console.error('❌ TWELVE_DATA_API_KEY not configured for WebSocket');
    return null;
  }

  try {
    console.log(`🔌 Connecting Twelve Data WebSocket for ${symbol}`);
    const ws = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`);
    
    ws.onopen = () => {
      console.log(`✅ Twelve Data WebSocket connected for ${symbol}`);
      ws.send(JSON.stringify({
        action: 'subscribe',
        params: { symbols: symbol }
      }));
      console.log(`📡 Subscribed to Twelve Data WebSocket for ${symbol}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log(`📊 Twelve Data WebSocket data for ${symbol}:`, data);
        
        if (data.event === 'price' && data.symbol === symbol && data.price) {
          const priceUpdate: PriceUpdate = {
            symbol,
            price: parseFloat(data.price),
            change: parseFloat(data.day_change) || 0,
            changePercent: parseFloat(data.day_change_percent) || 0,
            timestamp: new Date().toISOString(),
            dataSource: 'twelve_data_websocket'
          };
          
          setCachedPrice(symbol, priceUpdate);
          console.log(`🔥 Live WebSocket update ${symbol}: $${priceUpdate.price} (${priceUpdate.changePercent >= 0 ? '+' : ''}${priceUpdate.changePercent}%)`);
          
          // Forward to client if connected
          if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(JSON.stringify({
              type: 'price_update',
              data: [priceUpdate],
              source: 'twelve_data_websocket',
              timestamp: new Date().toISOString()
            }));
          }
        } else if (data.event === 'subscribe-status') {
          console.log(`📋 Twelve Data subscription status for ${symbol}:`, data);
        }
      } catch (error) {
        console.error(`❌ WebSocket message error for ${symbol}:`, error);
      }
    };

    ws.onclose = () => {
      console.log(`🔌 Twelve Data WebSocket disconnected for ${symbol}`);
      // Reconnect after 3 seconds
      setTimeout(() => connectWebSocket(symbol, clientSocket), 3000);
    };

    ws.onerror = (error) => {
      console.error(`❌ Twelve Data WebSocket error for ${symbol}:`, error);
    };

    return ws;

  } catch (error) {
    console.error(`❌ Failed to create Twelve Data WebSocket for ${symbol}:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // HTTP endpoint for price requests
  if (upgradeHeader.toLowerCase() !== "websocket") {
    if (req.method === 'POST') {
      try {
        const { symbols } = await req.json();
        console.log('📊 HTTP price request for symbols:', symbols);
        
        const validSymbols = symbols.filter((symbol: string) => 
          SUPPORTED_SYMBOLS.includes(symbol)
        );
        
        if (validSymbols.length === 0) {
          return new Response(JSON.stringify({ 
            error: 'No supported symbols found',
            supportedSymbols: SUPPORTED_SYMBOLS 
          }), { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        // Fetch prices with smart deduplication and caching
        const pricePromises = validSymbols.map(async (symbol: string) => {
          // Check cache first
          let price = getCachedPrice(symbol);
          
          // If not cached or expired, fetch with deduplication
          if (!price) {
            price = await fetchPriceWithDeduplication(symbol);
          }
          
          return price;
        });

        const prices = (await Promise.all(pricePromises)).filter(Boolean);

        return new Response(JSON.stringify({
          prices,
          dataQuality: 'optimized',
          cacheHitRatio: (symbols.length - pricePromises.length) / symbols.length,
          timestamp: new Date().toISOString()
        }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });

      } catch (error) {
        return new Response(JSON.stringify({ 
          error: 'Failed to process request',
          details: error.message 
        }), { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }
    return new Response("Expected WebSocket connection or POST request", { status: 400 });
  }

  // WebSocket handling
  const { socket, response } = Deno.upgradeWebSocket(req);
  let subscribedSymbols = new Set<string>();

  socket.onopen = () => {
    console.log("🔗 Unified price WebSocket connection opened");
  };

  socket.onmessage = async (event) => {
    try {
      const message: SubscriptionMessage = JSON.parse(event.data);
      
      if (message.type === 'subscribe') {
        console.log('📡 Subscribe request for symbols:', message.symbols);
        
        const validSymbols = message.symbols.filter(symbol => 
          SUPPORTED_SYMBOLS.includes(symbol)
        );
        
        validSymbols.forEach(symbol => {
          subscribedSymbols.add(symbol);
          
          // Connect WebSocket for this symbol if not already connected
          if (!wsConnections.has(symbol)) {
            const ws = connectWebSocket(symbol, socket);
            if (ws) {
              wsConnections.set(symbol, ws);
            }
          }
          
          // Send initial cached data if available
          const cachedPrice = getCachedPrice(symbol);
          if (cachedPrice && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'price_update',
              data: [cachedPrice],
              source: 'cache',
              timestamp: new Date().toISOString()
            }));
          }
        });
        
      } else if (message.type === 'unsubscribe') {
        console.log('📤 Unsubscribe request for symbols:', message.symbols);
        
        message.symbols.forEach(symbol => {
          subscribedSymbols.delete(symbol);
          
          // Close WebSocket if no other clients need it
          const ws = wsConnections.get(symbol);
          if (ws && subscribedSymbols.size === 0) {
            ws.close();
            wsConnections.delete(symbol);
          }
        });
      }
    } catch (error) {
      console.error('❌ Error processing WebSocket message:', error);
    }
  };

  socket.onclose = () => {
    console.log("🔗 Unified price WebSocket connection closed");
    subscribedSymbols.clear();
  };

  return response;
});