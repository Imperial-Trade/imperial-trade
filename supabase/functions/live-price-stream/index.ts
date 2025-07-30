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

// Standard symbol definitions for Gold and Bitcoin as distinct assets
const ASSET_REGISTRY = {
  GOLD: {
    symbol: 'XAU/USD',
    category: 'commodities',
    name: 'Gold',
    displaySymbol: 'XAU/USD'
  },
  BITCOIN: {
    symbol: 'BTC/USD', 
    category: 'crypto',
    name: 'Bitcoin',
    displaySymbol: 'BTC/USD'
  }
} as const;

// Enhanced symbol validation with Gold-specific debugging
function validateAndNormalizeSymbol(symbol: string): string | null {
  const upperSymbol = symbol.toUpperCase();
  
  console.log(`🔍 Symbol validation: ${symbol} -> ${upperSymbol}`);
  
  // Exact mapping for Gold variations with debugging
  if (upperSymbol === 'XAU/USD' || upperSymbol === 'GOLD') {
    console.log(`🥇 GOLD SYMBOL VALIDATED: ${symbol} -> XAU/USD`);
    return 'XAU/USD';
  }
  
  // Exact mapping for Bitcoin variations
  if (upperSymbol === 'BTC/USD' || upperSymbol === 'BITCOIN') {
    console.log(`₿ BITCOIN SYMBOL VALIDATED: ${symbol} -> BTC/USD`);
    return 'BTC/USD';
  }
  
  console.log(`❌ UNSUPPORTED SYMBOL: ${symbol}`);
  return null;
}

// Symbol mapping for API calls - strict mapping only
const TWELVE_DATA_SYMBOL_MAP: Record<string, string> = {
  'XAU/USD': 'XAU/USD',
  'BTC/USD': 'BTC/USD'
};

// Supported symbols - only these two distinct assets
const SUPPORTED_SYMBOLS = ['XAU/USD', 'BTC/USD'];

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

function getApiSymbol(symbol: string): string {
  const normalized = validateAndNormalizeSymbol(symbol);
  return normalized ? TWELVE_DATA_SYMBOL_MAP[normalized] : symbol;
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

// 🚫 DISABLED MOCK DATA - FORCE REAL API USAGE ONLY
function generateMockData(symbols: string[]): PriceUpdate[] {
  console.log('🚫 MOCK DATA DISABLED - Must use real Twelve Data API');
  console.log('❌ Returning empty array to force real API usage');
  
  // Return empty array to force real API calls
  return [];
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
    const apiSymbol = getApiSymbol(symbol);
    
    if (!apiSymbol || !SUPPORTED_SYMBOLS.includes(apiSymbol)) {
      console.error(`❌ Unsupported symbol: ${symbol}`);
      return null;
    }
    
    console.log(`📡 Symbol validation: ${symbol} -> ${apiSymbol}`);
    
    const url = `https://api.twelvedata.com/quote?symbol=${apiSymbol}&apikey=${apiKey}`;
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
  let heartbeatInterval: number | null = null;
  let goldRetryTimeout: number | null = null;

  // Connection retry state with Gold-specific tracking
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const baseDelay = 5000;
  let goldSubscriptionFailed = false;

  // Function to connect to Twelve Data WebSocket with optimizations for Pro plan
  const connectToTwelveData = () => {
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    if (!apiKey) {
      console.error('❌ TWELVE_DATA_API_KEY not configured');
      return;
    }

    // Circuit breaker: stop if too many failures
    if (reconnectAttempts >= maxReconnectAttempts) {
      console.error('🚫 Circuit breaker: Max reconnection attempts reached');
      return;
    }

    try {
      console.log('🔌 Connecting to Twelve Data WebSocket...');
      console.log('🔑 Using API Key:', apiKey ? 'YES (length: ' + apiKey.length + ')' : 'NO');
      console.log('🔄 Reconnect attempt:', reconnectAttempts + 1);
      
      // Connect to Twelve Data WebSocket - Pro plan optimized
      twelveDataWs = new WebSocket(`wss://ws.twelvedata.com/v1/quotes/price?apikey=${apiKey}`);

      twelveDataWs.onopen = () => {
        console.log('✅ Connected to Twelve Data WebSocket');
        reconnectAttempts = 0; // Reset on successful connection
        goldSubscriptionFailed = false;
        
        // Clear any existing timeouts
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
        if (goldRetryTimeout) {
          clearTimeout(goldRetryTimeout);
          goldRetryTimeout = null;
        }
        
        // Start heartbeat to maintain connection stability
        heartbeatInterval = setInterval(() => {
          if (twelveDataWs?.readyState === WebSocket.OPEN) {
            console.log('💓 Sending WebSocket heartbeat');
            twelveDataWs.send(JSON.stringify({ action: 'heartbeat' }));
          }
        }, 30000);
        
        // Subscribe to validated symbols if any (batch subscription for efficiency)
        if (subscribedSymbols.size > 0) {
          const symbols = Array.from(subscribedSymbols);
          
          console.log('📡 Subscribing to symbols:', symbols);
          
          // Special Gold logging
          if (symbols.includes('XAU/USD')) {
            console.log('🥇 GOLD SUBSCRIPTION ATTEMPT: Attempting to subscribe to XAU/USD via WebSocket');
            console.log('🥇 GOLD CONNECTION STATE: WebSocket readyState =', twelveDataWs?.readyState);
          }
          
          const subscribeMessage = {
            action: 'subscribe',
            params: {
              symbols: symbols.join(',')
            }
          };
          console.log('📡 Subscription message:', JSON.stringify(subscribeMessage, null, 2));
          twelveDataWs?.send(JSON.stringify(subscribeMessage));
        }
      };

      twelveDataWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 Received from Twelve Data:', data);
          
          // Handle subscription status responses with Gold-specific debugging
          if (data.event === 'subscribe-status') {
            console.log('📋 Subscription status:', data.status);
            
            if (data.success && data.success.length > 0) {
              console.log('✅ Successfully subscribed to:', data.success);
              
              // Check if Gold was successfully subscribed
              const goldSuccess = data.success.find((s: any) => 
                (typeof s === 'object' && s.symbol === 'XAU/USD') || s === 'XAU/USD'
              );
              if (goldSuccess) {
                console.log('🥇 GOLD SUCCESS: XAU/USD subscription confirmed via WebSocket');
                goldSubscriptionFailed = false;
                if (goldRetryTimeout) {
                  clearTimeout(goldRetryTimeout);
                  goldRetryTimeout = null;
                }
              }
            }
            
            if (data.fails && data.fails.length > 0) {
              console.log('❌ Failed to subscribe to:', data.fails);
              console.log('❌ Failure details:', JSON.stringify(data.fails, null, 2));
              
              // Special handling for Gold subscription failures
              const goldFailed = data.fails.find((f: any) => 
                (typeof f === 'object' && f.symbol === 'XAU/USD') || f === 'XAU/USD'
              );
              
              if (goldFailed) {
                console.log('🥇 GOLD FAILURE: XAU/USD WebSocket subscription failed');
                console.log('🥇 GOLD FALLBACK: Implementing HTTP fallback strategy');
                goldSubscriptionFailed = true;
                
                // Immediate HTTP fallback for Gold
                const goldPrice = await fetchRealPrice('XAU/USD');
                if (goldPrice && socket.readyState === WebSocket.OPEN) {
                  console.log('🥇 GOLD HTTP SUCCESS: Sending Gold price via HTTP fallback');
                  socket.send(JSON.stringify({
                    type: 'price_update',
                    data: [goldPrice],
                    source: 'twelve_data_http_fallback_gold',
                    timestamp: new Date().toISOString()
                  }));
                }
                
                // Set up periodic HTTP polling for Gold as backup
                const pollGoldPrice = async () => {
                  if (goldSubscriptionFailed) {
                    console.log('🥇 GOLD POLLING: Fetching Gold price via HTTP');
                    const price = await fetchRealPrice('XAU/USD');
                    if (price && socket.readyState === WebSocket.OPEN) {
                      socket.send(JSON.stringify({
                        type: 'price_update',
                        data: [price],
                        source: 'twelve_data_http_polling_gold',
                        timestamp: new Date().toISOString()
                      }));
                    }
                  }
                };
                
                // Poll every 10 seconds for Gold
                goldRetryTimeout = setInterval(pollGoldPrice, 10000);
              }
              
              // Handle other failed symbols with HTTP fallback
              data.fails.forEach(async (fail: any) => {
                const failSymbol = typeof fail === 'object' ? fail.symbol : fail;
                if (failSymbol && failSymbol !== 'XAU/USD') {
                  console.log(`🔄 WebSocket failed for ${failSymbol}, trying HTTP...`);
                  const realPrice = await fetchRealPrice(failSymbol);
                  if (realPrice && socket.readyState === WebSocket.OPEN) {
                    socket.send(JSON.stringify({
                      type: 'price_update',
                      data: [realPrice],
                      source: 'twelve_data_http_fallback',
                      timestamp: new Date().toISOString()
                    }));
                  }
                }
              });
            }
            return;
          }
          
          // Handle REAL-TIME price updates with Gold-specific logging
          if (data.event === 'price' && data.symbol && data.price) {
            console.log('💰 LIVE PRICE UPDATE for:', data.symbol, 'Price:', data.price);
            
            // Special logging for Gold updates
            if (data.symbol === 'XAU/USD') {
              console.log('🥇 GOLD LIVE UPDATE: Received real-time Gold price via WebSocket');
              console.log('🥇 GOLD DATA:', {
                symbol: data.symbol,
                price: data.price,
                change: data.day_change,
                timestamp: new Date().toISOString()
              });
              // Gold is working via WebSocket, stop HTTP polling
              goldSubscriptionFailed = false;
              if (goldRetryTimeout) {
                clearInterval(goldRetryTimeout);
                goldRetryTimeout = null;
                console.log('🥇 GOLD WEBSOCKET RESUMED: Stopping HTTP polling');
              }
            }
            
            // Map back to frontend symbol format  
            let frontendSymbol = data.symbol;
            
            // Keep standardized symbol format for consistency
            frontendSymbol = data.symbol; // XAU/USD or BTC/USD

            const priceUpdate: PriceUpdate = {
              symbol: frontendSymbol,
              price: parseFloat(data.price),
              change: parseFloat(data.day_change) || 0,
              changePercent: parseFloat(data.day_change_percent) || 0,
              timestamp: new Date().toISOString()
            };

            console.log('📤 Sending LIVE price update:', priceUpdate);

            // Forward to client with enhanced data
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'price_update',
                data: [priceUpdate],
                source: 'twelve_data_websocket_live',
                dataQuality: 'real_time',
                timestamp: new Date().toISOString()
              }));
            }
            
            // Cache for backup
            setCachedPrice(frontendSymbol, priceUpdate);
          }
        } catch (error) {
          console.error('❌ Error parsing Twelve Data message:', error);
        }
      };

      twelveDataWs.onclose = () => {
        console.log('🔌 Twelve Data WebSocket disconnected');
        
        // Clear heartbeat interval
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval);
          heartbeatInterval = null;
        }
        
        reconnectAttempts++;
        
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(baseDelay * Math.pow(2, reconnectAttempts - 1), 30000);
          console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
          reconnectTimeout = setTimeout(connectToTwelveData, delay);
        } else {
          console.error('🚫 Max reconnection attempts reached, implementing full HTTP fallback');
          
          // Implement full HTTP fallback for all symbols
          if (subscribedSymbols.size > 0) {
            const symbols = Array.from(subscribedSymbols);
            console.log('🔄 FULL HTTP FALLBACK: Starting polling for all symbols:', symbols);
            
            const pollAllPrices = async () => {
              for (const symbol of symbols) {
                const price = await fetchRealPrice(symbol);
                if (price && socket.readyState === WebSocket.OPEN) {
                  socket.send(JSON.stringify({
                    type: 'price_update',
                    data: [price],
                    source: 'twelve_data_http_fallback_full',
                    timestamp: new Date().toISOString()
                  }));
                }
              }
            };
            
            // Poll every 15 seconds as full fallback
            setInterval(pollAllPrices, 15000);
            pollAllPrices(); // Initial call
          }
        }
      };

      twelveDataWs.onerror = (error) => {
        console.error('❌ Twelve Data WebSocket error:', error);
        // Let onclose handle the reconnection
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
        
        // Strict symbol validation - Gold and Bitcoin only
        const validSymbols: string[] = [];
        const invalidSymbols: string[] = [];
        
        message.symbols.forEach(symbol => {
          const normalizedSymbol = validateAndNormalizeSymbol(symbol);
          if (normalizedSymbol && SUPPORTED_SYMBOLS.includes(normalizedSymbol)) {
            validSymbols.push(normalizedSymbol); // Use normalized symbol
            subscribedSymbols.add(normalizedSymbol);
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
        
        // Subscribe to Twelve Data WebSocket with validated symbols
        if (twelveDataWs?.readyState === WebSocket.OPEN && validSymbols.length > 0) {
          const subscribeMessage = {
            action: 'subscribe',
            params: {
              symbols: validSymbols.join(',')
            }
          };
          console.log('📡 Subscribing to validated symbols:', validSymbols);
          twelveDataWs.send(JSON.stringify(subscribeMessage));
        } else if (validSymbols.length > 0) {
          console.log('⚠️ Twelve Data WebSocket not ready - waiting for connection...');
          // Wait for connection and retry
          setTimeout(() => {
            if (twelveDataWs?.readyState === WebSocket.OPEN) {
              const subscribeMessage = {
                action: 'subscribe',
                params: {
                  symbols: validSymbols.join(',')
                }
              };
              console.log('📡 RETRY subscribing to validated symbols:', validSymbols);
              twelveDataWs.send(JSON.stringify(subscribeMessage));
            }
          }, 2000);
        }
        
      } else if (message.type === 'unsubscribe') {
        console.log('📤 Unsubscribe request for symbols:', message.symbols);
        
        message.symbols.forEach(symbol => subscribedSymbols.delete(symbol));
        
        // Unsubscribe from Twelve Data if connected
        if (twelveDataWs?.readyState === WebSocket.OPEN) {
          const validSymbols = message.symbols
            .map(s => validateAndNormalizeSymbol(s))
            .filter(s => s && SUPPORTED_SYMBOLS.includes(s));
          
          if (validSymbols.length > 0) {
            const unsubscribeMessage = {
              action: 'unsubscribe',
              params: {
                symbols: validSymbols.join(',')
              }
            };
            console.log('📤 Unsubscribing from Twelve Data:', validSymbols);
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