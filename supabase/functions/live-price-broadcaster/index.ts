import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

// Global cache for price data - ONE SOURCE OF TRUTH
const priceCache = new Map<string, { data: PriceUpdate, expires: number }>();
const CACHE_TTL = 5000; // 5 seconds cache

// Track all connected clients for broadcasting
const connectedClients = new Set<WebSocket>();

// Track which symbols are actively requested
const activeSymbols = new Set<string>();
let priceUpdateInterval: number | null = null;

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
  
  socket.onopen = () => {
    console.log("📡 New client connected for live price broadcasts");
    connectedClients.add(socket);
    
    // Send current cached prices immediately
    priceCache.forEach((cached, symbol) => {
      if (Date.now() < cached.expires) {
        socket.send(JSON.stringify({
          type: 'price_update',
          data: [cached.data]
        }));
      }
    });
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'subscribe' && message.symbols) {
        console.log('🎯 Client subscribing to symbols:', message.symbols);
        
        // Add symbols to active set
        message.symbols.forEach((symbol: string) => {
          const normalizedSymbol = symbol === 'GOLD' ? 'XAU/USD' : symbol;
          activeSymbols.add(normalizedSymbol);
        });
        
        // Start price fetching if not already running
        if (!priceUpdateInterval && activeSymbols.size > 0) {
          startPriceFetching();
        }
        
        // Send immediate response for subscribed symbols
        const symbolArray = Array.from(activeSymbols);
        await fetchAndBroadcastPrices(symbolArray);
      }
      
      if (message.type === 'unsubscribe' && message.symbols) {
        console.log('🚫 Client unsubscribing from symbols:', message.symbols);
        message.symbols.forEach((symbol: string) => {
          const normalizedSymbol = symbol === 'GOLD' ? 'XAU/USD' : symbol;
          activeSymbols.delete(normalizedSymbol);
        });
        
        // Stop fetching if no active symbols
        if (activeSymbols.size === 0 && priceUpdateInterval) {
          clearInterval(priceUpdateInterval);
          priceUpdateInterval = null;
          console.log('⏹️ Stopped price fetching - no active symbols');
        }
      }
    } catch (error) {
      console.error('❌ Error processing client message:', error);
    }
  };

  socket.onclose = () => {
    console.log("🔌 Client disconnected from price broadcast");
    connectedClients.delete(socket);
    
    // If no clients connected, stop fetching
    if (connectedClients.size === 0 && priceUpdateInterval) {
      clearInterval(priceUpdateInterval);
      priceUpdateInterval = null;
      activeSymbols.clear();
      console.log('⏹️ No clients - stopped all price fetching');
    }
  };

  socket.onerror = (error) => {
    console.error('❌ WebSocket error:', error);
    connectedClients.delete(socket);
  };

  return response;
});

// EFFICIENT: Single API call serves ALL users
async function fetchAndBroadcastPrices(symbols: string[]) {
  if (symbols.length === 0 || connectedClients.size === 0) return;
  
  try {
    console.log(`💎 SINGLE API CALL for ${connectedClients.size} users, symbols:`, symbols);
    
    const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
    if (!apiKey) {
      console.error('❌ TWELVE_DATA_API_KEY not configured');
      return;
    }

    // ONE API CALL FOR ALL SYMBOLS
    const promises = symbols.map(async (symbol) => {
      // Check cache first
      const cached = priceCache.get(symbol);
      if (cached && Date.now() < cached.expires) {
        return cached.data;
      }

      // Fetch fresh data
      const url = `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${apiKey}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API Error for ${symbol}: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status === 'error') {
        console.error(`❌ API error for ${symbol}:`, data.message);
        return null;
      }
      
      const priceUpdate: PriceUpdate = {
        symbol,
        price: parseFloat(data.close) || 0,
        change: parseFloat(data.change) || 0,
        changePercent: parseFloat(data.percent_change) || 0,
        timestamp: new Date().toISOString()
      };
      
      // Cache the result
      priceCache.set(symbol, {
        data: priceUpdate,
        expires: Date.now() + CACHE_TTL
      });
      
      console.log(`✅ Updated ${symbol}: $${priceUpdate.price} (${priceUpdate.changePercent}%)`);
      return priceUpdate;
    });

    const priceUpdates = (await Promise.all(promises)).filter(Boolean);
    
    if (priceUpdates.length > 0) {
      // BROADCAST TO ALL CONNECTED CLIENTS
      const broadcastMessage = JSON.stringify({
        type: 'price_update',
        data: priceUpdates,
        timestamp: new Date().toISOString(),
        clients: connectedClients.size
      });
      
      let successfulBroadcasts = 0;
      connectedClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(broadcastMessage);
            successfulBroadcasts++;
          } catch (error) {
            console.error('❌ Broadcast error:', error);
            connectedClients.delete(client);
          }
        } else {
          connectedClients.delete(client);
        }
      });
      
      console.log(`📡 Broadcasted to ${successfulBroadcasts}/${connectedClients.size} clients`);
    }
    
  } catch (error) {
    console.error('❌ Error fetching and broadcasting prices:', error);
  }
}

function startPriceFetching() {
  console.log('🚀 Starting efficient price fetching for broadcast');
  
  priceUpdateInterval = setInterval(async () => {
    if (activeSymbols.size > 0 && connectedClients.size > 0) {
      await fetchAndBroadcastPrices(Array.from(activeSymbols));
    }
  }, 10000); // Every 10 seconds for ALL users (efficient!)
}