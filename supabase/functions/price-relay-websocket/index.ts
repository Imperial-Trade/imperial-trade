import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

console.log('🎯 price-relay-websocket: TraderMade connection DISABLED');
console.log('📡 All price data now comes from always-on tradermade-streaming service');

// REST fallback to fetch prices from TraderMade API
const fetchPricesViaRest = async () => {
  const tradermadeApiKey = Deno.env.get('TRADERMADE_API_KEY');
  
  if (!tradermadeApiKey) {
    console.error('❌ TRADERMADE_API_KEY not found for REST fallback');
    return;
  }

  const symbols = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'NZDUSD', 'USDCAD',
    'EURGBP', 'EURJPY', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'BTCUSD', 'ETHUSD'
  ];

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
          console.log(`📈 REST price update: ${quote.currency} - ${quote.bid}/${quote.ask}`);
        }
      }
    } catch (error) {
      console.error(`❌ REST fetch error for ${symbol}:`, error);
    }
    
    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // HTTP endpoint for health check or manual connection trigger
  if (req.method === 'GET') {
    const status = {
      service: 'price-relay-websocket',
      status: 'disabled',
      message: 'TraderMade connection disabled - using always-on tradermade-streaming service',
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(status), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (req.method === 'POST') {
    const { action } = await req.json();
    
    if (action === 'connect') {
      return new Response(JSON.stringify({ 
        message: 'TraderMade connection disabled - using always-on tradermade-streaming service' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    
    if (action === 'rest_fallback') {
      await fetchPricesViaRest();
      return new Response(JSON.stringify({ message: 'REST fallback executed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
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
      service: 'price-relay-websocket',
      status: 'disabled',
      message: 'TraderMade connection disabled - using always-on tradermade-streaming service',
      timestamp: new Date().toISOString()
    }));
  };

  socket.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.action === 'status') {
        socket.send(JSON.stringify({
          type: 'status',
          service: 'price-relay-websocket',
          status: 'disabled',
          message: 'TraderMade connection disabled - using always-on tradermade-streaming service',
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

  return response;
});