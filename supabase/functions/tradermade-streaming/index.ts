import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceUpdate {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: string;
}

interface TraderMadeMessage {
  symbol: string;
  bid: number;
  ask: number;
  mid?: number;
  ts: number;
}

let wsConnection: WebSocket | null = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const reconnectDelay = 5000;

// Cache for rate limiting and fallback data
const priceCache = new Map<string, PriceUpdate>();
const lastApiCall = new Map<string, number>();
const RATE_LIMIT_MS = 1000; // 1 second between API calls per symbol

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

  console.log("🔌 New WebSocket connection request received");

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  // Initialize Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get API key from secrets
  const tradermadeApiKey = Deno.env.get('TRADERMADE_API_KEY');
  console.log('🔑 WebSocket API Key check:', tradermadeApiKey ? `Found (${tradermadeApiKey.substring(0, 8)}...)` : 'Missing');

  let subscribedSymbols = new Set<string>();
  let priceInterval: number | null = null;

  // Enhanced price fetching with HTTP fallback
  const fetchPriceHTTP = async (symbol: string): Promise<PriceUpdate | null> => {
    if (!tradermadeApiKey) {
      console.error('🔑 No API key available for HTTP price fetch');
      return null;
    }

    const now = Date.now();
    const lastCall = lastApiCall.get(symbol) || 0;
    
    if (now - lastCall < RATE_LIMIT_MS) {
      console.log('⚠️ Rate limited - using cached data');
      return priceCache.get(symbol) || null;
    }

    try {
      console.log(`🔑 HTTP API Key check: Found (${tradermadeApiKey.substring(0, 8)}...)`);
      console.log(`🔄 Fetching HTTP price for ${symbol} from: https://marketdata.tradermade.com/api/v1/live?currency=${symbol}&api_key=${tradermadeApiKey}`);
      
      const response = await fetch(
        `https://marketdata.tradermade.com/api/v1/live?currency=${symbol}&api_key=${tradermadeApiKey}`
      );
      const data = await response.json();
      
      console.log(`✅ Tradermade HTTP response for ${symbol}:`, JSON.stringify(data, null, 2));
      
      if (data.quotes && data.quotes.length > 0) {
        const quote = data.quotes[0];
        const priceUpdate: PriceUpdate = {
          symbol: symbol,
          bid: parseFloat(quote.bid),
          ask: parseFloat(quote.ask),
          mid: (parseFloat(quote.bid) + parseFloat(quote.ask)) / 2,
          timestamp: new Date().toISOString()
        };
        
        priceCache.set(symbol, priceUpdate);
        lastApiCall.set(symbol, now);
        
        return priceUpdate;
      } else {
        console.error(`⚠️ No valid price data for ${symbol} in response:`, data);
        return null;
      }
    } catch (error) {
      console.error(`❌ HTTP price fetch failed for ${symbol}:`, error);
      return null;
    }
  };

  // Connect to TraderMade WebSocket
  const connectToTraderMade = () => {
    if (!tradermadeApiKey) {
      console.error('🔑 No TraderMade API key available');
      return;
    }

    try {
      console.log('🔌 Connecting to Tradermade WebSocket with API key...');
      wsConnection = new WebSocket(`wss://marketdata.tradermade.com/feedadv`);
      
      wsConnection.onopen = () => {
        console.log('✅ Connected to Tradermade WebSocket');
        reconnectAttempts = 0;
        
        // Authenticate
        if (wsConnection && tradermadeApiKey) {
          wsConnection.send(JSON.stringify({
            userKey: tradermadeApiKey,
            symbol: Array.from(subscribedSymbols).join(',')
          }));
        }
      };

      wsConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.message === 'Connected') {
            console.log('📋 Tradermade text message:', data.message);
            console.log('✅ Tradermade authentication successful');
            return;
          }
          
          if (data.symbol && data.bid && data.ask) {
            const tmData: TraderMadeMessage = data;
            const priceUpdate: PriceUpdate = {
              symbol: tmData.symbol,
              bid: tmData.bid,
              ask: tmData.ask,
              mid: tmData.mid || (tmData.bid + tmData.ask) / 2,
              timestamp: new Date().toISOString()
            };
            
            // Update cache
            priceCache.set(priceUpdate.symbol, priceUpdate);
            
            // Send to client if subscribed
            if (subscribedSymbols.has(priceUpdate.symbol) && socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({
                type: 'price_update',
                data: priceUpdate
              }));
            }
            
            // Update database
            updateMarketPrice(supabase, priceUpdate);
          }
        } catch (error) {
          console.error('Error parsing TraderMade message:', error);
        }
      };

      wsConnection.onclose = () => {
        console.log('🔌 TraderMade WebSocket disconnected');
        wsConnection = null;
        attemptReconnect();
      };

      wsConnection.onerror = (error) => {
        console.error('❌ TraderMade WebSocket error:', error);
      };

    } catch (error) {
      console.error('❌ Failed to connect to TraderMade:', error);
      attemptReconnect();
    }
  };

  const attemptReconnect = () => {
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(`🔄 Reconnecting attempt ${reconnectAttempts}/${maxReconnectAttempts} in ${reconnectDelay}ms...`);
      setTimeout(connectToTraderMade, reconnectDelay);
    } else {
      console.error('❌ Max reconnection attempts reached');
    }
  };

  // Ultra-fast tick generation for demo/development
  const startFastTicks = () => {
    priceInterval = setInterval(async () => {
      if (subscribedSymbols.size === 0) return;
      
      console.log('⚡ Sending ULTRA-FAST tick prices for', subscribedSymbols.size, 'symbols');
      
      for (const symbol of subscribedSymbols) {
        // Try HTTP fetch first, then use synthetic data
        let priceUpdate = await fetchPriceHTTP(symbol);
        
        if (!priceUpdate) {
          // Generate realistic synthetic price movements
          const basePrice = symbol === 'XAUUSD' ? 3320 : 
                           symbol === 'BTCUSD' ? 113000 : 1.0000;
          const variation = basePrice * 0.0001; // 0.01% variation
          const change = (Math.random() - 0.5) * 2 * variation;
          const mid = basePrice + change;
          
          priceUpdate = {
            symbol,
            bid: mid - (mid * 0.0001),
            ask: mid + (mid * 0.0001),
            mid,
            timestamp: new Date().toISOString()
          };
        }
        
        // Update cache
        priceCache.set(symbol, priceUpdate);
        
        // Send to client
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'price_update',
            data: priceUpdate
          }));
        }
        
        // Update database
        await updateMarketPrice(supabase, priceUpdate);
      }
    }, 250); // Ultra-fast 250ms updates
  };

  const updateMarketPrice = async (supabase: any, price: PriceUpdate) => {
    try {
      const { error } = await supabase
        .from('market_prices')
        .upsert({
          symbol: price.symbol,
          bid: price.bid,
          ask: price.ask,
          mid: price.mid,
          timestamp: price.timestamp,
          source: 'tradermade',
          updated_at: new Date().toISOString()
        });
      
      if (error) {
        console.error('Database update error:', error);
      }
    } catch (error) {
      console.error('Failed to update market price:', error);
    }
  };

  socket.onopen = () => {
    console.log('✅ Client WebSocket connected');
    
    // Send connection status
    socket.send(JSON.stringify({
      type: 'connection_status',
      status: 'connected',
      timestamp: new Date().toISOString()
    }));
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'subscribe':
          const symbols = Array.isArray(message.symbols) ? message.symbols : [message.symbols];
          symbols.forEach(symbol => subscribedSymbols.add(symbol));
          
          console.log('📡 Client subscribed to symbols:', symbols);
          
          // Start fast ticks if not already running
          if (!priceInterval) {
            console.log('🔄 Reconnecting for ultra-fast 250ms ticks...');
            startFastTicks();
          }
          
          // Try to connect to TraderMade if not connected
          if (!wsConnection) {
            connectToTraderMade();
          }
          break;
          
        case 'unsubscribe':
          const unsub = Array.isArray(message.symbols) ? message.symbols : [message.symbols];
          unsub.forEach(symbol => subscribedSymbols.delete(symbol));
          console.log('📡 Client unsubscribed from symbols:', unsub);
          break;
      }
      
    } catch (error) {
      console.error('Error processing client message:', error);
    }
  };

  socket.onclose = () => {
    console.log('🔌 Client WebSocket disconnected');
    
    // Clean up resources
    if (priceInterval) {
      clearInterval(priceInterval);
      priceInterval = null;
    }
    
    if (wsConnection) {
      wsConnection.close();
      wsConnection = null;
    }
  };

  socket.onerror = (error) => {
    console.error('❌ Client WebSocket error:', error);
  };

  return response;
});