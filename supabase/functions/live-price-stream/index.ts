
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
}

interface SubscriptionMessage {
  type: 'subscribe' | 'unsubscribe';
  symbols: string[];
}

interface ErrorMessage {
  type: 'error';
  message: string;
  code: 'API_KEY_MISSING' | 'API_UNAVAILABLE' | 'SYMBOL_UNSUPPORTED' | 'RATE_LIMIT_EXCEEDED';
}

// Simple in-memory cache for price data
const priceCache = new Map<string, { data: PriceUpdate, expires: number }>();
const CACHE_TTL = 8000; // 8 seconds cache

// Rate limiting
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 30; // 30 requests per minute

function isRateLimited(): boolean {
  const now = Date.now();
  const limit = rateLimitMap.get('global');
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set('global', { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return false;
  }
  
  if (limit.count >= RATE_LIMIT_MAX) {
    return true;
  }
  
  limit.count++;
  return false;
}

function getCachedPrice(symbol: string): PriceUpdate | null {
  const cached = priceCache.get(symbol);
  if (cached && Date.now() < cached.expires) {
    return cached.data;
  }
  priceCache.delete(symbol);
  return null;
}

function setCachedPrice(symbol: string, data: PriceUpdate): void {
  priceCache.set(symbol, {
    data,
    expires: Date.now() + CACHE_TTL
  });
}

async function fetchRealPrice(symbol: string): Promise<PriceUpdate | null> {
  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  
  if (!apiKey) {
    console.error('TWELVE_DATA_API_KEY not configured');
    return null;
  }

  if (isRateLimited()) {
    console.warn('Rate limit exceeded for Twelve Data API');
    return null;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(
      `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`,
      { signal: controller.signal }
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Twelve Data API error: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    
    if (data.status === 'error') {
      console.error(`Twelve Data API error for ${symbol}:`, data.message);
      return null;
    }
    
    const priceUpdate: PriceUpdate = {
      symbol: data.symbol || symbol,
      price: parseFloat(data.close) || 0,
      change: parseFloat(data.change) || 0,
      changePercent: parseFloat(data.percent_change) || 0,
      timestamp: new Date().toISOString()
    };
    
    // Cache the result
    setCachedPrice(symbol, priceUpdate);
    console.log(`Fetched real price for ${symbol}: $${priceUpdate.price}`);
    
    return priceUpdate;
    
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
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

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  let subscribedSymbols = new Set<string>();
  let priceInterval: number | null = null;

  socket.onopen = () => {
    console.log("WebSocket connection opened");
    
    // Check if API key is available on connection
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    if (!apiKey) {
      const errorMsg: ErrorMessage = {
        type: 'error',
        message: 'Live price data unavailable - API key not configured',
        code: 'API_KEY_MISSING'
      };
      socket.send(JSON.stringify(errorMsg));
    }
  };

  socket.onmessage = async (event) => {
    try {
      const message: SubscriptionMessage = JSON.parse(event.data);
      
      if (message.type === 'subscribe') {
        message.symbols.forEach(symbol => subscribedSymbols.add(symbol));
        console.log(`Subscribed to symbols: ${Array.from(subscribedSymbols)}`);
        
        // Start price updates if not already running
        if (!priceInterval && subscribedSymbols.size > 0) {
          priceInterval = setInterval(async () => {
            const updates: PriceUpdate[] = [];
            const errors: ErrorMessage[] = [];
            
            for (const symbol of subscribedSymbols) {
              // Check cache first
              let priceData = getCachedPrice(symbol);
              
              // If not cached, fetch real data
              if (!priceData) {
                priceData = await fetchRealPrice(symbol);
              }
              
              if (priceData) {
                updates.push(priceData);
              } else {
                // Send specific error for this symbol
                const errorMsg: ErrorMessage = {
                  type: 'error',
                  message: `Live price for ${symbol} is not available right now`,
                  code: 'API_UNAVAILABLE'
                };
                errors.push(errorMsg);
              }
            }
            
            // Send updates if we have any
            if (updates.length > 0) {
              socket.send(JSON.stringify({
                type: 'price_update',
                data: updates,
                source: 'twelve_data_api',
                timestamp: new Date().toISOString()
              }));
            }
            
            // Send errors if any
            errors.forEach(error => {
              socket.send(JSON.stringify(error));
            });
            
          }, 10000); // Update every 10 seconds to respect API limits
        }
      } else if (message.type === 'unsubscribe') {
        message.symbols.forEach(symbol => subscribedSymbols.delete(symbol));
        console.log(`Unsubscribed from symbols: ${message.symbols}`);
        
        // Stop updates if no symbols subscribed
        if (subscribedSymbols.size === 0 && priceInterval) {
          clearInterval(priceInterval);
          priceInterval = null;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMsg: ErrorMessage = {
        type: 'error',
        message: 'Invalid message format',
        code: 'API_UNAVAILABLE'
      };
      socket.send(JSON.stringify(errorMsg));
    }
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed");
    if (priceInterval) {
      clearInterval(priceInterval);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  return response;
});
