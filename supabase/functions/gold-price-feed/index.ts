import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GoldPriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

interface SubscriptionMessage {
  type: 'subscribe' | 'unsubscribe';
  symbols: string[];
}

interface ErrorMessage {
  type: 'error';
  message: string;
  code: 'API_UNAVAILABLE' | 'SYMBOL_UNSUPPORTED' | 'RATE_LIMIT_EXCEEDED';
}

// Gold-specific symbols
const SUPPORTED_GOLD_SYMBOLS = ['GOLD', 'XAU/USD', 'XAUUSD'];

// Cache for gold price data
const goldPriceCache = new Map<string, { data: GoldPriceUpdate, expires: number }>();
const GOLD_CACHE_TTL = 10000; // 10 seconds cache as requested

// Rate limiting for gold prices  
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 60; // Higher limit for real-time usage

function isRateLimited(): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get('gold_global');
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set('gold_global', { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (limit.count >= RATE_LIMIT_MAX) {
    return true;
  }
  
  limit.count++;
  return false;
}

function getCachedGoldPrice(symbol: string): GoldPriceUpdate | null {
  const cached = goldPriceCache.get(symbol);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  goldPriceCache.delete(symbol);
  return null;
}

function setCachedGoldPrice(symbol: string, data: GoldPriceUpdate): void {
  goldPriceCache.set(symbol, {
    data,
    expires: Date.now() + GOLD_CACHE_TTL
  });
}

// Fetch real gold price from Twelve Data API
async function fetchRealGoldPrice(): Promise<GoldPriceUpdate | null> {
  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  
  console.log('🥇 Fetching real gold price from Twelve Data API');
  console.log(`🔑 API Key available: ${apiKey ? 'YES' : 'NO'}`);
  
  if (!apiKey) {
    console.error('❌ TWELVE_DATA_API_KEY not configured - cannot fetch real gold prices');
    return null;
  }

  if (isRateLimited()) {
    console.warn('⚠️ Rate limit exceeded for Twelve Data gold API');
    return null;
  }

  try {
    const url = `https://api.twelvedata.com/quote?symbol=XAU/USD&apikey=${apiKey}`;
    console.log(`🌐 Making Gold API request to: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(8000) // 8 second timeout
    });
    
    console.log(`📊 Gold API Response Status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`❌ Twelve Data Gold API HTTP error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`📊 Gold API Response Data:`, JSON.stringify(data, null, 2));
    
    if (data.status === 'error') {
      console.error(`❌ Twelve Data Gold API error:`, data.message || data);
      return null;
    }
    
    if (!data.close) {
      console.error(`❌ No gold price data returned:`, data);
      return null;
    }
    
    const goldUpdate: GoldPriceUpdate = {
      symbol: 'XAU/USD',
      price: parseFloat(data.close) || 0,
      change: parseFloat(data.change) || 0,
      changePercent: parseFloat(data.percent_change) || 0,
      timestamp: new Date().toISOString()
    };
    
    console.log(`✅ SUCCESS: Real gold price: $${goldUpdate.price.toFixed(2)} (${goldUpdate.changePercent >= 0 ? '+' : ''}${goldUpdate.changePercent}%)`);
    return goldUpdate;
    
  } catch (error) {
    console.error(`❌ Exception during gold API fetch:`, error);
    return null;
  }
}

async function fetchGoldPrice(): Promise<GoldPriceUpdate | null> {
  console.log('🥇 Fetching gold price with caching');
  
  // Check cache first
  const cached = getCachedGoldPrice('XAU/USD');
  if (cached) {
    console.log('💾 Using cached gold price');
    return cached;
  }

  // Fetch real price from Twelve Data
  const goldData = await fetchRealGoldPrice();
  if (goldData) {
    setCachedGoldPrice('XAU/USD', goldData);
    return goldData;
  }
  
  console.warn('⚠️ Could not fetch real gold price, no fallback');
  return null;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  // Handle HTTP requests as fallback
  if (upgradeHeader.toLowerCase() !== "websocket") {
    if (req.method === 'POST') {
      try {
        const { symbols } = await req.json();
        console.log('🥇 HTTP gold price request for symbols:', symbols);
        
        const goldSymbols = symbols.filter((symbol: string) => 
          SUPPORTED_GOLD_SYMBOLS.includes(symbol)
        );
        
        if (goldSymbols.length === 0) {
          return new Response(JSON.stringify({ 
            error: 'No supported gold symbols found',
            supportedSymbols: SUPPORTED_GOLD_SYMBOLS 
          }), { 
            status: 400,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          });
        }

        const goldPrice = await fetchGoldPrice();
        if (!goldPrice) {
          return new Response(JSON.stringify({ 
            error: 'Failed to fetch gold price' 
          }), { 
            status: 500,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          });
        }

        return new Response(JSON.stringify({
          prices: [goldPrice],
          dataQuality: 'simulated',
          source: 'gold_price_feed',
          timestamp: new Date().toISOString()
        }), { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          error: 'Failed to process HTTP request',
          details: error.message 
        }), { 
          status: 500,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        });
      }
    }
    return new Response("Expected WebSocket connection or POST request", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let subscribedSymbols = new Set<string>();
  let priceUpdateInterval: number | null = null;
  let twelveDataWs: WebSocket | null = null;
  let reconnectTimeout: number | null = null;

  // Function to connect to Twelve Data WebSocket for Gold
  const connectToTwelveDataGold = () => {
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    if (!apiKey) {
      console.error('❌ TWELVE_DATA_API_KEY not configured for gold WebSocket');
      return;
    }

    try {
      console.log('🥇 Connecting to Twelve Data WebSocket for Gold...');
      twelveDataWs = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`);

      twelveDataWs.onopen = () => {
        console.log('✅ Connected to Twelve Data Gold WebSocket');
        
        // Subscribe to XAU/USD if we have subscribed clients
        if (subscribedSymbols.size > 0) {
          const subscribeMessage = {
            action: 'subscribe',
            params: {
              symbols: 'XAU/USD'
            }
          };
          console.log('📡 Subscribing to Twelve Data Gold symbols: XAU/USD');
          twelveDataWs?.send(JSON.stringify(subscribeMessage));
        }
      };

      twelveDataWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 Received Gold data from Twelve Data:', data);
          
          if (data.event === 'price' && data.symbol === 'XAU/USD' && data.price) {
            const goldUpdate: GoldPriceUpdate = {
              symbol: 'XAU/USD',
              price: parseFloat(data.price),
              change: parseFloat(data.day_change) || 0,
              changePercent: parseFloat(data.day_change_percent) || 0,
              timestamp: new Date().toISOString()
            };

            // Cache the update
            setCachedGoldPrice('XAU/USD', goldUpdate);

            // Forward to client
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'price_update',
                data: [goldUpdate],
                source: 'twelve_data_websocket',
                timestamp: new Date().toISOString()
              }));
            }
          }
        } catch (error) {
          console.error('❌ Error parsing Twelve Data Gold message:', error);
        }
      };

      twelveDataWs.onclose = () => {
        console.log('🥇 Twelve Data Gold WebSocket disconnected');
        // Reconnect after 3 seconds
        reconnectTimeout = setTimeout(connectToTwelveDataGold, 3000);
      };

      twelveDataWs.onerror = (error) => {
        console.error('❌ Twelve Data Gold WebSocket error:', error);
      };

    } catch (error) {
      console.error('❌ Failed to connect to Twelve Data Gold:', error);
    }
  };

  socket.onopen = () => {
    console.log("🥇 Gold price WebSocket connection opened");
    
    // Connect to Twelve Data WebSocket
    connectToTwelveDataGold();
  };

  socket.onmessage = async (event) => {
    try {
      const message: SubscriptionMessage = JSON.parse(event.data);
      
      if (message.type === 'subscribe') {
        console.log('🥇 Gold price subscribe request for symbols:', message.symbols);
        
        const validGoldSymbols = message.symbols.filter(symbol => 
          SUPPORTED_GOLD_SYMBOLS.includes(symbol)
        );
        
        const invalidSymbols = message.symbols.filter(symbol => 
          !SUPPORTED_GOLD_SYMBOLS.includes(symbol)
        );
        
        console.log('✅ Valid gold symbols:', validGoldSymbols);
        console.log('❌ Invalid symbols:', invalidSymbols);
        
        // Send error for invalid symbols
        invalidSymbols.forEach(symbol => {
          const errorMsg: ErrorMessage = {
            type: 'error',
            message: `Symbol ${symbol} is not supported. Only Gold symbols (GOLD, XAU/USD, XAUUSD) are available.`,
            code: 'SYMBOL_UNSUPPORTED'
          };
          socket.send(JSON.stringify(errorMsg));
        });
        
        if (validGoldSymbols.length > 0) {
          validGoldSymbols.forEach(symbol => subscribedSymbols.add(symbol));
          
          // Subscribe to Twelve Data WebSocket if connected
          if (twelveDataWs?.readyState === WebSocket.OPEN) {
            const subscribeMessage = {
              action: 'subscribe',
              params: {
                symbols: 'XAU/USD'
              }
            };
            console.log('📡 Subscribing to Twelve Data Gold WebSocket');
            twelveDataWs.send(JSON.stringify(subscribeMessage));
          } else {
            // If WebSocket not connected, use HTTP fallback for initial data
            console.log('🔄 Twelve Data Gold WebSocket not ready, using HTTP fallback');
            const goldPrice = await fetchGoldPrice();
            if (goldPrice && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'price_update',
                data: [goldPrice],
                source: 'twelve_data_api',
                timestamp: new Date().toISOString()
              }));
            }
          }
          
          // Set up regular price updates every 1 second for real-time feel
          if (priceUpdateInterval) {
            clearInterval(priceUpdateInterval);
          }
          
          priceUpdateInterval = setInterval(async () => {
            if (subscribedSymbols.size > 0) {
              // Only use HTTP fallback if WebSocket is not working
              if (!twelveDataWs || twelveDataWs.readyState !== WebSocket.OPEN) {
                const goldPrice = await fetchGoldPrice();
                if (goldPrice && socket.readyState === WebSocket.OPEN) {
                  socket.send(JSON.stringify({
                    type: 'price_update',
                    data: [goldPrice],
                    source: 'twelve_data_api',
                    timestamp: new Date().toISOString()
                  }));
                }
              }
            }
          }, 1000); // Update every 1 second for per-second live data
        }
        
      } else if (message.type === 'unsubscribe') {
        console.log('🥇 Gold price unsubscribe request for symbols:', message.symbols);
        
        message.symbols.forEach(symbol => subscribedSymbols.delete(symbol));
        
        // Unsubscribe from Twelve Data if connected
        if (twelveDataWs?.readyState === WebSocket.OPEN) {
          const unsubscribeMessage = {
            action: 'unsubscribe',
            params: {
              symbols: 'XAU/USD'
            }
          };
          console.log('📤 Unsubscribing from Twelve Data Gold');
          twelveDataWs.send(JSON.stringify(unsubscribeMessage));
        }
        
        // Clear interval if no symbols are subscribed
        if (subscribedSymbols.size === 0 && priceUpdateInterval) {
          clearInterval(priceUpdateInterval);
          priceUpdateInterval = null;
          console.log('🥇 Stopped gold price updates - no symbols subscribed');
        }
      }
    } catch (error) {
      console.error('❌ Error processing gold price message:', error);
      const errorMsg: ErrorMessage = {
        type: 'error',
        message: 'Invalid message format',
        code: 'API_UNAVAILABLE'
      };
      socket.send(JSON.stringify(errorMsg));
    }
  };

  socket.onclose = () => {
    console.log("🥇 Gold price WebSocket connection closed");
    
    // Close Twelve Data connection
    if (twelveDataWs) {
      twelveDataWs.close();
      twelveDataWs = null;
    }
    
    // Clear reconnect timeout
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
    
    if (priceUpdateInterval) {
      clearInterval(priceUpdateInterval);
      priceUpdateInterval = null;
    }
  };

  socket.onerror = (error) => {
    console.error("❌ Gold price WebSocket error:", error);
  };

  return response;
});