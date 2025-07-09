
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

// Mock price generator for demonstration
function generateMockPrice(symbol: string): PriceUpdate {
  const basePrice = symbol === 'XAU/USD' ? 2050 : 43500;
  const variation = symbol === 'XAU/USD' ? 20 : 1000;
  
  const price = basePrice + (Math.random() - 0.5) * variation;
  const change = (Math.random() - 0.5) * 20;
  const changePercent = (change / price) * 100;
  
  return {
    symbol,
    price,
    change,
    changePercent,
    timestamp: new Date().toISOString()
  };
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
  };

  socket.onmessage = (event) => {
    try {
      const message: SubscriptionMessage = JSON.parse(event.data);
      
      if (message.type === 'subscribe') {
        message.symbols.forEach(symbol => subscribedSymbols.add(symbol));
        console.log(`Subscribed to symbols: ${Array.from(subscribedSymbols)}`);
        
        // Start price updates if not already running
        if (!priceInterval && subscribedSymbols.size > 0) {
          priceInterval = setInterval(() => {
            const updates: PriceUpdate[] = [];
            subscribedSymbols.forEach(symbol => {
              updates.push(generateMockPrice(symbol));
            });
            
            socket.send(JSON.stringify({
              type: 'price_update',
              data: updates
            }));
          }, 2000); // Update every 2 seconds for real-time feel
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
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
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
