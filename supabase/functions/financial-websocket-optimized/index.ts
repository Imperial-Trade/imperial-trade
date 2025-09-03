import { Redis } from "npm:@upstash/redis@1.20.6";

// Initialize Redis client with REST API (Deno compatible)
const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL") ?? "",
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN") ?? "",
});

// Constants for configuration
const REDIS_SERVER_ID = crypto.randomUUID();
const REDIS_PRICES_KEY = "financial:prices";
const REDIS_LEADER_KEY = "financial:leader"; 
const REDIS_PRICE_UPDATES_CHANNEL = "financial:price_updates";
const ALLOWED_SYMBOLS = ['XAUUSD', 'BTCUSD'];
const BATCH_INTERVAL_MS = 250; // Faster for realtime feel

// TraderMade API setup
const TRADERMADE_API_KEY = Deno.env.get("TRADERMADE_API_KEY") ?? "";
const TRADERMADE_WS_URL = "wss://marketdata.tradermade.com/feedadv";

// WebSocket connections and subscriptions
const connections = new Map();
let traderMadeSocket = null;

// Price data cache and batch mechanism
let priceCache = {};
let batchedUpdates = {};

// Connect to TraderMade WebSocket with simplified leader election
async function connectToTraderMade() {
  try {
    // Simple leader election - only one server connects to TraderMade
    const isLeader = await redis.set(REDIS_LEADER_KEY, REDIS_SERVER_ID, { 
      ex: 60,
      nx: true
    });

    if (!isLeader) {
      console.log("Another server is handling TraderMade connection");
      return;
    }

    console.log("🚀 This server is now the TraderMade connection leader");
    
    // Simple heartbeat to maintain leadership
    setInterval(async () => {
      const currentLeader = await redis.get(REDIS_LEADER_KEY);
      if (currentLeader === REDIS_SERVER_ID) {
        await redis.expire(REDIS_LEADER_KEY, 60);
      }
    }, 30000);

    // Connect to TraderMade WebSocket
    if (traderMadeSocket === null) {
      traderMadeSocket = new WebSocket(TRADERMADE_WS_URL);

      traderMadeSocket.onopen = () => {
        console.log("✅ Connected to TraderMade WebSocket");
        
        // Subscribe to allowed symbols only
        const subscribeMsg = {
          userKey: TRADERMADE_API_KEY,
          symbol: ALLOWED_SYMBOLS.join(',')
        };
        
        traderMadeSocket.send(JSON.stringify(subscribeMsg));
      };

      traderMadeSocket.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.symbol && data.mid && ALLOWED_SYMBOLS.includes(data.symbol)) {
            const priceData = {
              symbol: data.symbol,
              price: parseFloat(data.mid),
              change: data.change ? parseFloat(data.change) : 0,
              changePercent: data.change_percentage ? parseFloat(data.change_percentage) : 0,
              timestamp: new Date().toISOString()
            };
            
            // Update local cache
            priceCache[data.symbol] = priceData;
            batchedUpdates[data.symbol] = priceData;
            
            // Store in Redis with simple key pattern (REST API)
            await redis.hset(REDIS_PRICES_KEY, data.symbol, JSON.stringify(priceData));
            
            // Note: REST API doesn't support PUBLISH, so followers will poll for updates
          }
        } catch (error) {
          console.error("❌ Error processing TraderMade message:", error);
        }
      };

      traderMadeSocket.onclose = () => {
        console.log("🔌 Disconnected from TraderMade WebSocket");
        traderMadeSocket = null;
        setTimeout(connectToTraderMade, 5000);
      };

      traderMadeSocket.onerror = (error) => {
        console.error("❌ TraderMade WebSocket error:", error);
        traderMadeSocket.close();
      };
    }
  } catch (error) {
    console.error("❌ Error connecting to TraderMade:", error);
    setTimeout(connectToTraderMade, 5000);
  }
}

// Simple Redis subscription for price updates (REST API compatible)
async function setupRedisSubscription() {
  try {
    console.log("🔔 Setting up Redis polling mechanism (REST API compatible)");
    
    // Since REST API doesn't support pub/sub, we'll use a polling mechanism
    // for non-leader servers to get price updates from Redis
    setInterval(async () => {
      try {
        const currentLeader = await redis.get(REDIS_LEADER_KEY);
        if (currentLeader !== REDIS_SERVER_ID) {
          // We're not the leader, poll for price updates
          const allPrices = await redis.hgetall(REDIS_PRICES_KEY);
          if (allPrices) {
            // Handle both object and array responses from Redis REST API
            const entries = Array.isArray(allPrices) 
              ? allPrices.reduce((acc, item, index, arr) => {
                  if (index % 2 === 0 && index + 1 < arr.length) {
                    acc.push([item, arr[index + 1]]);
                  }
                  return acc;
                }, [])
              : Object.entries(allPrices);
              
            for (const [symbol, dataStr] of entries) {
              try {
                const priceData = JSON.parse(dataStr as string);
                const cached = priceCache[symbol];
                
                // Only update if this is newer data
                if (!cached || new Date(priceData.timestamp) > new Date(cached.timestamp)) {
                  priceCache[symbol] = priceData;
                  batchedUpdates[symbol] = priceData;
                }
              } catch (parseError) {
                console.error(`❌ Error parsing price data for ${symbol}:`, parseError);
              }
            }
          }
        }
      } catch (pollError) {
        console.error("❌ Error polling Redis for price updates:", pollError);
      }
    }, 500); // Poll every 500ms for faster non-leader updates
    
  } catch (error) {
    console.error("❌ Error setting up Redis polling:", error);
    setTimeout(setupRedisSubscription, 5000);
  }
}

// Simple batching mechanism
function initializeBatching() {
  setInterval(() => {
    if (Object.keys(batchedUpdates).length === 0) {
      return;
    }
    
    // Send updates to all connected clients
    for (const [clientId, client] of connections.entries()) {
      try {
        const clientUpdates = {};
        let hasUpdates = false;
        
        // Filter updates for subscribed symbols
        for (const symbol of client.symbols) {
          if (batchedUpdates[symbol]) {
            clientUpdates[symbol] = batchedUpdates[symbol];
            hasUpdates = true;
          }
        }
        
        if (hasUpdates) {
          client.socket.send(JSON.stringify({
            type: "price_updates",
            updates: clientUpdates,
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.error(`❌ Error sending to client ${clientId}:`, error);
        
        // Clean up dead connections
        if (error.message?.includes("Socket has been closed")) {
          connections.delete(clientId);
        }
      }
    }
    
    // Reset batch
    batchedUpdates = {};
  }, BATCH_INTERVAL_MS);
}

// Initialize server
async function initialize() {
  try {
    console.log("🔧 Initializing optimized financial WebSocket server...");
    
    // Load initial prices from Redis
    const allPrices = await redis.hgetall(REDIS_PRICES_KEY);
    if (allPrices) {
      // Handle both object and array responses from Redis REST API
      const entries = Array.isArray(allPrices) 
        ? allPrices.reduce((acc, item, index, arr) => {
            if (index % 2 === 0 && index + 1 < arr.length) {
              acc.push([item, arr[index + 1]]);
            }
            return acc;
          }, [])
        : Object.entries(allPrices);
        
      for (const [symbol, dataStr] of entries) {
        try {
          priceCache[symbol] = JSON.parse(dataStr as string);
        } catch (parseError) {
          console.error(`❌ Error parsing cached price for ${symbol}:`, parseError);
        }
      }
    }
    
    // Setup Redis subscription
    await setupRedisSubscription();
    
    // Try to become TraderMade connection leader
    await connectToTraderMade();
    
    // Initialize batching
    initializeBatching();
    
    console.log(`🎯 Optimized Financial WebSocket server ${REDIS_SERVER_ID} initialized`);
    console.log(`📊 Loaded ${Object.keys(priceCache).length} symbols from cache`);
  } catch (error) {
    console.error("❌ Error initializing server:", error);
  }
}

// Start initialization
initialize();

// Handle WebSocket connections - NO AUTHENTICATION REQUIRED
Deno.serve(async (req) => {
  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname === '/health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      connections: connections.size,
      cached_symbols: Object.keys(priceCache),
      server_id: REDIS_SERVER_ID,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // WebSocket upgrade
  const upgrade = req.headers.get("upgrade") || "";
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const connectionId = crypto.randomUUID();
  
  socket.onopen = () => {
    console.log(`🔗 Client connected: ${connectionId}`);
    
    connections.set(connectionId, {
      socket,
      symbols: new Set(),
      lastActivity: Date.now()
    });
    
    socket.send(JSON.stringify({
      type: "connected",
      connectionId,
      available_symbols: ALLOWED_SYMBOLS
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      const client = connections.get(connectionId);
      
      if (!client) {
        socket.send(JSON.stringify({ type: "error", message: "Connection not found" }));
        return;
      }
      
      client.lastActivity = Date.now();

      switch (message.type) {
        case "subscribe": {
          if (Array.isArray(message.symbols)) {
            // Only allow valid symbols
            const validSymbols = message.symbols.filter(symbol => ALLOWED_SYMBOLS.includes(symbol));
            
            if (message.clearPrevious) {
              client.symbols.clear();
            }
            
            validSymbols.forEach(symbol => client.symbols.add(symbol));
            
            // Send current prices immediately
            const currentPrices = {};
            for (const symbol of client.symbols) {
              if (priceCache[symbol]) {
                currentPrices[symbol] = priceCache[symbol];
              }
            }
            
            socket.send(JSON.stringify({
              type: "subscribed",
              symbols: [...client.symbols],
              prices: currentPrices
            }));
          }
          break;
        }
          
        case "unsubscribe": {
          if (Array.isArray(message.symbols)) {
            message.symbols.forEach(symbol => client.symbols.delete(symbol));
            
            // Send acknowledgment (frontend will ignore unknown message types)
            socket.send(JSON.stringify({
              type: "unsubscribe_ack", 
              symbols: message.symbols,
              remaining: [...client.symbols]
            }));
          }
          break;
        }
          
        case "ping": {
          socket.send(JSON.stringify({
            type: "pong",
            timestamp: new Date().toISOString()
          }));
          break;
        }
          
        default:
          socket.send(JSON.stringify({
            type: "error",
            message: "Unknown message type: " + message.type
          }));
      }
    } catch (error) {
      console.error(`❌ Error handling message from ${connectionId}:`, error);
      socket.send(JSON.stringify({
        type: "error",
        message: "Invalid message format"
      }));
    }
  };

  socket.onclose = () => {
    console.log(`🔌 Client disconnected: ${connectionId}`);
    connections.delete(connectionId);
  };

  socket.onerror = (error) => {
    console.error(`❌ WebSocket error for ${connectionId}:`, error);
    connections.delete(connectionId);
  };

  return response;
});

// Clean up inactive connections (simple approach)
setInterval(() => {
  const now = Date.now();
  const inactiveTimeout = 5 * 60 * 1000; // 5 minutes
  
  for (const [socketId, client] of connections.entries()) {
    if (now - client.lastActivity > inactiveTimeout) {
      console.log(`🧹 Cleaning up inactive connection: ${socketId}`);
      try {
        client.socket.close(1000, "Inactive timeout");
      } catch (error) {
        // Ignore close errors
      }
      connections.delete(socketId);
    }
  }
}, 60000); // Check every minute

console.log("🚀 Optimized Financial WebSocket server started");