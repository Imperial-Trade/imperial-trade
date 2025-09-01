import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const tradermadeApiKey = Deno.env.get('TRADERMADE_API_KEY');

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  timestamp: string;
}

let tradermadeWs: WebSocket | null = null;
let reconnectTimeout: number | null = null;
let isConnecting = false;
let connectionAttempts = 0;
const maxReconnectAttempts = 10;
const baseReconnectDelay = 1000;

// Global Realtime channel for efficient broadcasting
let globalRealtimeChannel: any = null;

// REST fallback configuration
let restFallbackInterval: number | null = null;
const REST_FALLBACK_INTERVAL_MS = 2000; // 2 seconds for professional trading

const connectToTraderMade = () => {
  if (isConnecting || tradermadeWs?.readyState === WebSocket.OPEN) {
    return;
  }

  if (connectionAttempts >= maxReconnectAttempts) {
    console.error('❌ Max reconnection attempts reached, stopping...');
    return;
  }

  isConnecting = true;
  connectionAttempts++;

  console.log(`🔗 Connecting to TraderMade (attempt ${connectionAttempts})...`);

  if (!tradermadeApiKey) {
    console.error('❌ TRADERMADE_API_KEY not found');
    isConnecting = false;
    return;
  }

  try {
    tradermadeWs = new WebSocket(`wss://ws.tradermade.com/feedadv?api_key=${tradermadeApiKey}`);

    tradermadeWs.onopen = () => {
      console.log('✅ Connected to TraderMade WebSocket');
      isConnecting = false;
      connectionAttempts = 0; // Reset on successful connection
      
      // Stop REST fallback when WebSocket connects
      stopRestFallback();
      
      // Subscribe to all major currency pairs
      const symbols = [
        'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
        'EURGBP', 'EURJPY', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD'
      ];
      
      const subscribeMessage = JSON.stringify({
        userKey: tradermadeApiKey,
        symbol: symbols.join(',')
      });
      
      tradermadeWs?.send(subscribeMessage);
      console.log('📡 Subscribed to symbols:', symbols.join(', '));
    };

    tradermadeWs.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.symbol && data.bid && data.ask) {
          const priceData: PriceData = {
            symbol: data.symbol,
            bid: parseFloat(data.bid),
            ask: parseFloat(data.ask),
            mid: (parseFloat(data.bid) + parseFloat(data.ask)) / 2,
            timestamp: new Date().toISOString()
          };

          // Broadcast to global Realtime channel
          if (!globalRealtimeChannel) {
            globalRealtimeChannel = supabase.channel('prices:live');
          }
          await globalRealtimeChannel.send({
            type: 'broadcast',
            event: 'price_update',
            payload: priceData
          });

          // Also update market_prices table for persistence
          await supabase.from('market_prices').upsert({
            symbol: priceData.symbol,
            bid: priceData.bid,
            ask: priceData.ask,
            mid: priceData.mid,
            timestamp: priceData.timestamp
          });

          console.log(`💰 Price update: ${priceData.symbol} - ${priceData.bid}/${priceData.ask}`);
        }
      } catch (error) {
        console.error('❌ Error processing price data:', error);
      }
    };

    tradermadeWs.onerror = (error) => {
      console.error('❌ TraderMade WebSocket error:', error);
      isConnecting = false;
    };

    tradermadeWs.onclose = (event) => {
      console.log(`🔌 TraderMade connection closed (${event.code}: ${event.reason})`);
      isConnecting = false;
      tradermadeWs = null;

      // Exponential backoff reconnection
      if (connectionAttempts < maxReconnectAttempts) {
        const delay = Math.min(baseReconnectDelay * Math.pow(2, connectionAttempts - 1), 30000);
        console.log(`⏰ Reconnecting in ${delay}ms...`);
        
        reconnectTimeout = setTimeout(() => {
          connectToTraderMade();
        }, delay);
      } else {
        // After max attempts, start REST fallback
        console.log('🔄 Max WebSocket attempts reached, starting REST fallback');
        startRestFallback();
      }
    };

  } catch (error) {
    console.error('❌ Error creating TraderMade WebSocket:', error);
    isConnecting = false;
  }
};

// REST fallback to fetch prices from TraderMade API
const fetchPricesViaRest = async () => {
  if (!tradermadeApiKey) {
    console.error('❌ TRADERMADE_API_KEY not found for REST fallback');
    return;
  }

  const symbols = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
    'EURGBP', 'EURJPY', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD'
  ];

  try {
    console.log('🔄 Fetching prices via REST fallback...');
    
    for (const symbol of symbols) {
      try {
        const response = await fetch(
          `https://marketdata.tradermade.com/api/v1/live?currency=${symbol}&api_key=${tradermadeApiKey}`
        );
        
        if (response.ok) {
          const data = await response.json();
          if (data.quotes && data.quotes.length > 0) {
            const quote = data.quotes[0];
            const priceData: PriceData = {
              symbol: quote.currency,
              bid: parseFloat(quote.bid),
              ask: parseFloat(quote.ask),
              mid: (parseFloat(quote.bid) + parseFloat(quote.ask)) / 2,
              timestamp: new Date().toISOString()
            };

            // Broadcast to global Realtime channel
            if (!globalRealtimeChannel) {
              globalRealtimeChannel = supabase.channel('prices:live');
            }
            await globalRealtimeChannel.send({
              type: 'broadcast',
              event: 'price_update',
              payload: priceData
            });

            // Update database
            await supabase.from('market_prices').upsert({
              symbol: priceData.symbol,
              bid: priceData.bid,
              ask: priceData.ask,
              mid: priceData.mid,
              timestamp: priceData.timestamp
            });

            console.log(`📈 REST price update: ${priceData.symbol} - ${priceData.bid}/${priceData.ask}`);
          }
        }
      } catch (error) {
        console.error(`❌ REST fetch error for ${symbol}:`, error);
      }
      
      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  } catch (error) {
    console.error('❌ REST fallback error:', error);
  }
};

// Start REST fallback when WebSocket connection fails
const startRestFallback = () => {
  if (restFallbackInterval) return;
  
  console.log('🔄 Starting REST fallback polling...');
  restFallbackInterval = setInterval(fetchPricesViaRest, REST_FALLBACK_INTERVAL_MS);
  
  // Fetch immediately
  fetchPricesViaRest();
};

// Stop REST fallback when WebSocket reconnects
const stopRestFallback = () => {
  if (restFallbackInterval) {
    clearInterval(restFallbackInterval);
    restFallbackInterval = null;
    console.log('⏹️ Stopped REST fallback polling');
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    // HTTP endpoint for health check or manual connection trigger
    if (req.method === 'GET') {
      const status = {
        connected: tradermadeWs?.readyState === WebSocket.OPEN,
        connectionAttempts,
        isConnecting,
        timestamp: new Date().toISOString()
      };
      
      return new Response(JSON.stringify(status), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (req.method === 'POST') {
      const { action } = await req.json();
      
      if (action === 'connect') {
        connectToTraderMade();
        return new Response(JSON.stringify({ message: 'Connection initiated' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      if (action === 'disconnect') {
        if (reconnectTimeout) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = null;
        }
        tradermadeWs?.close();
        return new Response(JSON.stringify({ message: 'Disconnected' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response("Expected WebSocket connection or valid HTTP request", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  // WebSocket upgrade for monitoring/debugging
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  socket.onopen = () => {
    console.log('🔍 Monitoring WebSocket connected');
    
    // Send initial status
    socket.send(JSON.stringify({
      type: 'status',
      connected: tradermadeWs?.readyState === WebSocket.OPEN,
      connectionAttempts,
      timestamp: new Date().toISOString()
    }));
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.action === 'connect') {
        connectToTraderMade();
        socket.send(JSON.stringify({ type: 'response', message: 'Connection initiated' }));
      } else if (message.action === 'status') {
        socket.send(JSON.stringify({
          type: 'status',
          connected: tradermadeWs?.readyState === WebSocket.OPEN,
          connectionAttempts,
          isConnecting,
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error('❌ Error handling monitoring message:', error);
    }
  };

  socket.onclose = () => {
    console.log('🔍 Monitoring WebSocket disconnected');
  };

  // Auto-connect on startup
  if (!tradermadeWs || tradermadeWs.readyState !== WebSocket.OPEN) {
    connectToTraderMade();
  }

  return response;
});