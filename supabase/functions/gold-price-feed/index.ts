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
const GOLD_CACHE_TTL = 3000; // 3 seconds cache for gold

// Rate limiting for gold prices
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 30;

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

// Generate mock gold price data
function generateGoldMockData(): GoldPriceUpdate {
  console.log('🥇 Generating mock gold price data');
  
  const basePrice = 3240; // Current gold price
  const volatility = 0.02; // 2% volatility for gold
  
  const changePercent = (Math.random() - 0.5) * 2 * volatility * 100;
  const price = basePrice * (1 + changePercent / 100);
  
  return {
    symbol: 'XAU/USD',
    price: Math.round(price * 100) / 100,
    change: Math.round((price - basePrice) * 100) / 100,
    changePercent: Math.round(changePercent * 100) / 100,
    timestamp: new Date().toISOString()
  };
}

async function fetchGoldPrice(): Promise<GoldPriceUpdate | null> {
  console.log('🥇 Fetching gold price data');
  
  if (isRateLimited()) {
    console.warn('⚠️ Rate limit exceeded for gold price API');
    return null;
  }

  // Check cache first
  const cached = getCachedGoldPrice('XAU/USD');
  if (cached) {
    console.log('💾 Using cached gold price');
    return cached;
  }

  try {
    // For now, generate mock data - can be replaced with real API later
    const goldData = generateGoldMockData();
    setCachedGoldPrice('XAU/USD', goldData);
    console.log(`✅ Gold price generated: $${goldData.price.toFixed(2)} (${goldData.changePercent >= 0 ? '+' : ''}${goldData.changePercent}%)`);
    return goldData;
  } catch (error) {
    console.error('❌ Exception during gold price fetch:', error);
    return null;
  }
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

  socket.onopen = () => {
    console.log("🥇 Gold price WebSocket connection opened");
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
          
          // Send initial gold price
          const goldPrice = await fetchGoldPrice();
          if (goldPrice && socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({
              type: 'price_update',
              data: [goldPrice],
              source: 'gold_price_feed',
              timestamp: new Date().toISOString()
            }));
          }
          
          // Set up regular price updates every 3 seconds
          if (priceUpdateInterval) {
            clearInterval(priceUpdateInterval);
          }
          
          priceUpdateInterval = setInterval(async () => {
            if (subscribedSymbols.size > 0) {
              const goldPrice = await fetchGoldPrice();
              if (goldPrice && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({
                  type: 'price_update',
                  data: [goldPrice],
                  source: 'gold_price_feed',
                  timestamp: new Date().toISOString()
                }));
              }
            }
          }, 3000); // Update every 3 seconds
        }
        
      } else if (message.type === 'unsubscribe') {
        console.log('🥇 Gold price unsubscribe request for symbols:', message.symbols);
        
        message.symbols.forEach(symbol => subscribedSymbols.delete(symbol));
        
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