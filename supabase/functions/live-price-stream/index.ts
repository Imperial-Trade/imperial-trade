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

// Auto-detect and normalize currency symbols to remove redundancy
function normalizeSymbol(symbol: string): string {
  const normalized = symbol.toUpperCase().replace(/[^A-Z]/g, '');
  
  // Auto-detect Gold variations
  if (normalized.includes('GOLD') || normalized === 'XAU' || normalized === 'XAUUSD') {
    return 'XAU/USD';
  }
  
  // Auto-detect Bitcoin variations  
  if (normalized.includes('BITCOIN') || normalized === 'BTC' || normalized === 'BTCUSD') {
    return 'BTC/USD';
  }
  
  // Return original if no auto-detection needed
  return symbol;
}

// Simplified symbol mapping - auto-detection handles redundancy
const SYMBOL_MAPPING: Record<string, string> = {
  'XAU/USD': 'XAU/USD',
  'BTC/USD': 'BTC/USD'
};

// Supported symbols for Twelve Data WebSocket - simplified list
const SUPPORTED_TWELVE_DATA_SYMBOLS = ['XAU/USD', 'BTC/USD'];

// Multi-tier cache for price data with Gold priority
const priceCache = new Map<string, { data: PriceUpdate, expires: number }>();
const GOLD_CACHE_TTL = 2000; // 2 seconds cache for Gold
const REGULAR_CACHE_TTL = 8000; // 8 seconds cache for others

// High-priority symbols for faster caching
const HIGH_PRIORITY_SYMBOLS = new Set(['XAU/USD', 'BTC/USD']);

// Rate limiting
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 50; // Increased for WebSocket usage

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

function translateSymbol(symbol: string): string {
  const normalized = normalizeSymbol(symbol);
  return SYMBOL_MAPPING[normalized] || normalized;
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
  const ttl = (symbol === 'XAU/USD' || HIGH_PRIORITY_SYMBOLS.has(symbol)) ? GOLD_CACHE_TTL : REGULAR_CACHE_TTL;
  priceCache.set(symbol, {
    data,
    expires: Date.now() + ttl
  });
}

// ⚠️ EMERGENCY MOCK DATA ONLY - Current Google Finance prices
function generateMockData(symbols: string[]): PriceUpdate[] {
  console.log('🚨 WARNING: Generating mock data for symbols:', symbols);
  console.log('🚨 API is not working - real prices should be fetched instead');
  
  const basePrices: Record<string, number> = {
    'XAU/USD': 3312.565,  // CURRENT TRADINGVIEW PRICE - UPDATED
    'GOLD': 3312.565,     // Legacy symbol mapping
    'BTC/USD': 117881.00, // CURRENT GOOGLE FINANCE PRICE  
    'BTCUSD': 117881.00, // Alternative Bitcoin symbol
    'BTC': 117881.00     // Short Bitcoin symbol
  };
  
  return symbols.map((symbol: string) => {
    const apiSymbol = translateSymbol(symbol);
    const basePrice = basePrices[apiSymbol] || 150;
    
    // Asset-specific volatility
    const volatilityRange = apiSymbol === 'BTCUSD' ? 0.08 : 0.04;
    
    const changePercent = (Math.random() - 0.5) * 2 * volatilityRange * 100;
    const price = basePrice * (1 + changePercent / 100);
    
    return {
      symbol: symbol, // Return original symbol format
      price: Math.round(price * 100) / 100,
      change: Math.round((price - basePrice) * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      timestamp: new Date().toISOString()
    };
  });
}

async function fetchRealPrice(symbol: string): Promise<PriceUpdate | null> {
  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  
  console.log(`🚀 fetchRealPrice called for: ${symbol}`);
  console.log(`🔑 API Key available: ${apiKey ? 'YES' : 'NO'}`);
  
  if (!apiKey) {
    console.error('❌ TWELVE_DATA_API_KEY not configured - cannot fetch real prices');
    return null;
  }

  if (isRateLimited()) {
    console.warn('⚠️ Rate limit exceeded for Twelve Data API');
    return null;
  }

  try {
    const formattedSymbol = translateSymbol(symbol);
    
    console.log(`📡 API call mapping: ${symbol} -> ${formattedSymbol}`);
    
    const url = `https://api.twelvedata.com/quote?symbol=${formattedSymbol}&apikey=${apiKey}`;
    console.log(`🌐 Making API request to: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    
    console.log(`📊 API Response Status: ${response.status}`);
    
    if (!response.ok) {
      console.error(`❌ Twelve Data API HTTP error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`❌ Error response body: ${errorText}`);
      return null;
    }
    
    const data = await response.json();
    console.log(`📊 API Response Data for ${symbol}:`, JSON.stringify(data, null, 2));
    
    if (data.status === 'error') {
      console.error(`❌ Twelve Data API error for ${symbol}:`, data.message || data);
      return null;
    }
    
    if (!data.close) {
      console.error(`❌ No price data returned for ${symbol}:`, data);
      return null;
    }
    
    const priceUpdate: PriceUpdate = {
      symbol: symbol, // Return original symbol format
      price: parseFloat(data.close) || 0,
      change: parseFloat(data.change) || 0,
      changePercent: parseFloat(data.percent_change) || 0,
      timestamp: new Date().toISOString()
    };
    
    // Cache the result
    setCachedPrice(symbol, priceUpdate);
    console.log(`✅ SUCCESS: Real price for ${symbol}: $${priceUpdate.price.toFixed(2)} (${priceUpdate.changePercent >= 0 ? '+' : ''}${priceUpdate.changePercent}%)`);
    
    return priceUpdate;
    
  } catch (error) {
    console.error(`❌ Exception during API fetch for ${symbol}:`, error);
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

  // Handle HTTP requests as fallback to get-market-data
  if (upgradeHeader.toLowerCase() !== "websocket") {
    if (req.method === 'POST') {
      try {
        const { symbols } = await req.json();
        console.log('📊 HTTP fallback request for symbols:', symbols);
        
        // Forward to get-market-data function
        const response = await fetch(`https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/get-market-data`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symbols })
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), { 
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
  let twelveDataWs: WebSocket | null = null;
  let reconnectTimeout: number | null = null;

  // Function to connect to Twelve Data WebSocket
  const connectToTwelveData = () => {
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    if (!apiKey) {
      console.error('❌ TWELVE_DATA_API_KEY not configured');
      return;
    }

    try {
      console.log('🔌 Connecting to Twelve Data WebSocket...');
      console.log('🔑 Using API Key:', apiKey ? 'YES (length: ' + apiKey.length + ')' : 'NO');
      
      twelveDataWs = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`);

      twelveDataWs.onopen = () => {
        console.log('✅ Connected to Twelve Data WebSocket');
        
        // Subscribe to symbols if any
        if (subscribedSymbols.size > 0) {
          const originalSymbols = Array.from(subscribedSymbols);
          const normalizedSymbols = originalSymbols.map(s => normalizeSymbol(s));
          
          console.log('🔍 Original symbols:', originalSymbols);
          console.log('🔍 Auto-detected normalized symbols:', normalizedSymbols);
          
          const subscribeMessage = {
            action: 'subscribe',
            params: {
              symbols: normalizedSymbols.join(',')
            }
          };
          console.log('📡 Subscribing to Twelve Data with normalized symbols:', normalizedSymbols);
          console.log('📡 Full subscription message:', JSON.stringify(subscribeMessage, null, 2));
          twelveDataWs?.send(JSON.stringify(subscribeMessage));
        }
      };

      twelveDataWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 Received from Twelve Data:', data);
          
          // Handle subscription status responses
          if (data.event === 'subscribe-status') {
            console.log('📋 Subscription status:', data.status);
            if (data.success && data.success.length > 0) {
              console.log('✅ Successfully subscribed to:', data.success);
            }
            if (data.fails && data.fails.length > 0) {
              console.log('❌ Failed to subscribe to:', data.fails);
              console.log('❌ Failure details:', JSON.stringify(data.fails, null, 2));
              
              // Send error for failed symbols
              data.fails.forEach((fail: any) => {
                const errorMsg: ErrorMessage = {
                  type: 'error',
                  message: `Failed to subscribe to ${fail.symbol}: ${fail.message || 'Unknown error'}`,
                  code: 'SYMBOL_UNSUPPORTED'
                };
                if (socket.readyState === WebSocket.OPEN) {
                  socket.send(JSON.stringify(errorMsg));
                }
              });
            }
            return;
          }
          
          // Handle price updates
          if (data.event === 'price' && data.symbol && data.price) {
            console.log('💰 Price update for:', data.symbol, 'Price:', data.price);
            
            // Map back to frontend symbol format
            const frontendSymbol = Object.keys(SYMBOL_MAPPING).find(key => 
              SYMBOL_MAPPING[key] === data.symbol
            ) || data.symbol;

            const priceUpdate: PriceUpdate = {
              symbol: frontendSymbol,
              price: parseFloat(data.price),
              change: parseFloat(data.day_change) || 0,
              changePercent: parseFloat(data.day_change_percent) || 0,
              timestamp: new Date().toISOString()
            };

            console.log('📤 Sending price update:', priceUpdate);

            // Forward to client
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'price_update',
                data: [priceUpdate],
                source: 'twelve_data_websocket',
                timestamp: new Date().toISOString()
              }));
            }
          }
        } catch (error) {
          console.error('❌ Error parsing Twelve Data message:', error);
        }
      };

      twelveDataWs.onclose = () => {
        console.log('🔌 Twelve Data WebSocket disconnected - RECONNECTING IMMEDIATELY');
        // Immediate reconnect for critical connection
        reconnectTimeout = setTimeout(connectToTwelveData, 1000); // Faster reconnect
      };

      twelveDataWs.onerror = (error) => {
        console.error('❌ Twelve Data WebSocket error:', error);
        console.log('🔄 Force reconnecting due to error...');
        // Force reconnect on any error
        setTimeout(connectToTwelveData, 2000);
      };

    } catch (error) {
      console.error('❌ Failed to connect to Twelve Data:', error);
      console.log('🔄 Retrying connection in 3 seconds...');
      // Retry connection after short delay
      setTimeout(connectToTwelveData, 3000);
    }
  };

  // FORCE IMMEDIATE CONNECTION on socket open
  socket.onopen = () => {
    console.log("🔗 Client WebSocket connection opened");
    console.log("🚀 FORCE CONNECTING TO TWELVE DATA IMMEDIATELY");
    
    // Check API key and connect to Twelve Data IMMEDIATELY
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    if (!apiKey) {
      const errorMsg: ErrorMessage = {
        type: 'error',
        message: 'Live price data unavailable - API key not configured',
        code: 'API_KEY_MISSING'
      };
      socket.send(JSON.stringify(errorMsg));
    } else {
      // FORCE CONNECT WITHOUT DELAY
      connectToTwelveData();
    }
  };

  socket.onmessage = async (event) => {
    try {
      const message: SubscriptionMessage = JSON.parse(event.data);
      
      if (message.type === 'subscribe') {
        console.log('📡 Subscribe request for symbols:', message.symbols);
        
        // Validate and normalize symbols
        const validSymbols: string[] = [];
        const invalidSymbols: string[] = [];
        
        message.symbols.forEach(symbol => {
          const normalizedSymbol = normalizeSymbol(symbol);
          if (SUPPORTED_TWELVE_DATA_SYMBOLS.includes(normalizedSymbol)) {
            validSymbols.push(symbol); // Keep original for subscription tracking
            subscribedSymbols.add(symbol);
          } else {
            invalidSymbols.push(symbol);
          }
        });
        
        console.log('✅ Valid symbols:', validSymbols);
        console.log('❌ Invalid symbols:', invalidSymbols);
        
        // Send error for invalid symbols
        invalidSymbols.forEach(symbol => {
          const errorMsg: ErrorMessage = {
            type: 'error',
            message: `Symbol ${symbol} is not supported. Only Gold (XAU/USD) and Bitcoin (BTC/USD) are available.`,
            code: 'SYMBOL_UNSUPPORTED'
          };
          socket.send(JSON.stringify(errorMsg));
        });
        
        // FORCE SUBSCRIBE TO TWELVE DATA - ENSURE CONNECTION
        if (twelveDataWs?.readyState === WebSocket.OPEN && validSymbols.length > 0) {
          const normalizedSymbols = validSymbols.map(s => normalizeSymbol(s));
          const subscribeMessage = {
            action: 'subscribe',
            params: {
              symbols: normalizedSymbols.join(',')
            }
          };
          console.log('📡 FORCE SUBSCRIBING to Twelve Data:', normalizedSymbols);
          twelveDataWs.send(JSON.stringify(subscribeMessage));
        } else if (validSymbols.length > 0) {
          console.log('⚠️ Twelve Data WebSocket not ready - waiting for connection...');
          // Wait for connection and retry
          setTimeout(() => {
            if (twelveDataWs?.readyState === WebSocket.OPEN) {
              const normalizedSymbols = validSymbols.map(s => normalizeSymbol(s));
              const subscribeMessage = {
                action: 'subscribe',
                params: {
                  symbols: normalizedSymbols.join(',')
                }
              };
              console.log('📡 RETRY SUBSCRIBING to Twelve Data:', normalizedSymbols);
              twelveDataWs.send(JSON.stringify(subscribeMessage));
            }
          }, 2000);
        }
        
      } else if (message.type === 'unsubscribe') {
        console.log('📤 Unsubscribe request for symbols:', message.symbols);
        
        message.symbols.forEach(symbol => subscribedSymbols.delete(symbol));
        
        // Unsubscribe from Twelve Data if connected
        if (twelveDataWs?.readyState === WebSocket.OPEN) {
          const normalizedSymbols = message.symbols
            .map(s => normalizeSymbol(s))
            .filter(s => SUPPORTED_TWELVE_DATA_SYMBOLS.includes(s));
          
          if (normalizedSymbols.length > 0) {
            const unsubscribeMessage = {
              action: 'unsubscribe',
              params: {
                symbols: normalizedSymbols.join(',')
              }
            };
            console.log('📤 Unsubscribing from Twelve Data:', normalizedSymbols);
            twelveDataWs.send(JSON.stringify(unsubscribeMessage));
          }
        }
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);
      const errorMsg: ErrorMessage = {
        type: 'error',
        message: 'Invalid message format',
        code: 'API_UNAVAILABLE'
      };
      socket.send(JSON.stringify(errorMsg));
    }
  };

  socket.onclose = () => {
    console.log("🔌 Client WebSocket connection closed");
    
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
  };

  socket.onerror = (error) => {
    console.error("❌ Client WebSocket error:", error);
  };

  return response;
});