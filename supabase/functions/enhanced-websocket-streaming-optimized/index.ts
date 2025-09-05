import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface StreamingConfig {
  MAX_CLIENTS: number;
  BATCH_INTERVAL: number;
  PRICE_TTL: number;
  MAX_RETRIES: number;
  IDLE_TIMEOUT: number;
}

// COST OPTIMIZED CONFIG (reduced from 1000 clients to 100)
const config: StreamingConfig = {
  MAX_CLIENTS: 100,        // Reduced from 1000 (you have 29 active users)
  BATCH_INTERVAL: 500,     // Increased from 50ms to batch more updates
  PRICE_TTL: 30000,        // Increased from 15s to 30s (reduce Redis ops)
  MAX_RETRIES: 2,          // Reduced from 5 (prevent TraderMade rate limits)
  IDLE_TIMEOUT: 600000     // Increased from 180s to 10min (reduce churn)
};

interface ClientConnection {
  id: string;
  socket: WebSocket;
  subscriptions: Set<string>;
  lastSeen: number;
  userId?: string;
  isAuthenticated: boolean;
}

interface PriceData {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  mid?: number;
  change: number;
  changePercent: number;
  timestamp: string;
}

// In-memory client management (cost optimized)
const clients = new Map<string, ClientConnection>();
const subscriptions = new Map<string, Set<string>>(); // symbol -> client IDs
let priceCache = new Map<string, PriceData>();
let lastPriceFetch = 0;

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// COST OPTIMIZED: Smart user targeting (only active users)
async function getActiveSubscribers(): Promise<string[]> {
  try {
    const { data: activeUsers } = await supabase
      .rpc('get_active_users_for_broadcasting');
    
    return (activeUsers || []).map((user: any) => user.user_id);
  } catch (error) {
    console.error('Failed to get active subscribers:', error);
    return [];
  }
}

// REDIS-ONLY: Pure Redis subscriber (NO TraderMade calls)
async function fetchPricesFromRedis(symbols: string[]): Promise<PriceData[]> {
  if (Date.now() - lastPriceFetch < config.BATCH_INTERVAL) {
    return []; // Rate limit Redis polling
  }

  lastPriceFetch = Date.now();
  
  const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
  const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
  
  if (!redisUrl || !redisToken) {
    console.warn('⚠️ Redis not configured - using cache only');
    return symbols.map(symbol => priceCache.get(symbol)).filter(Boolean) as PriceData[];
  }

  try {
    console.log(`📡 Fetching Redis prices for ${symbols.length} symbols (Redis-only mode)`);
    
    const prices: PriceData[] = [];
    
    // Fetch prices from Redis keys
    for (const symbol of symbols) {
      try {
        const response = await fetch(`${redisUrl}/get/price:${symbol}`, {
          headers: {
            'Authorization': `Bearer ${redisToken}`,
          },
          signal: AbortSignal.timeout(3000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.result) {
            const priceData = JSON.parse(data.result);
            prices.push({
              symbol: priceData.symbol,
              price: priceData.price || priceData.mid,
              bid: priceData.bid,
              ask: priceData.ask,
              mid: priceData.mid,
              change: priceData.change || 0,
              changePercent: priceData.changePercent || 0,
              timestamp: priceData.timestamp || new Date().toISOString()
            });
            
            // Update cache
            priceCache.set(symbol, prices[prices.length - 1]);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch Redis price for ${symbol}:`, error.message);
      }
    }

    return prices;
  } catch (error) {
    console.error('❌ Redis fetch failed:', error);
    
    // Fallback to cache
    return symbols.map(symbol => priceCache.get(symbol)).filter(Boolean) as PriceData[];
  }
}

// REDIS-ONLY: No database writes (UI-only function)
async function skipDatabaseWrites(prices: PriceData[]): Promise<void> {
  // COST OPTIMIZATION: This function is UI-only, no database writes
  // Database writes are handled by enhanced-websocket-streaming (single source)
  console.log(`🚀 Redis-only mode: Serving ${prices.length} prices to UI (no DB writes)`);
}

// COST OPTIMIZED: Batch broadcasting with smart targeting
function broadcastPricesToClients(prices: PriceData[]): void {
  if (prices.length === 0) return;

  let messagesSent = 0;
  const now = Date.now();

  for (const [clientId, client] of clients.entries()) {
    try {
      // Skip inactive clients (cost optimization)
      if (now - client.lastSeen > config.IDLE_TIMEOUT) {
        clients.delete(clientId);
        continue;
      }

      if (client.socket.readyState !== WebSocket.OPEN) {
        clients.delete(clientId);
        continue;
      }

      // Only send to clients with matching subscriptions
      const relevantPrices = prices.filter(price => 
        client.subscriptions.has(price.symbol)
      );

      if (relevantPrices.length > 0) {
        client.socket.send(JSON.stringify({
          type: 'price_batch',
          updates: relevantPrices,
          timestamp: new Date().toISOString()
        }));
        messagesSent++;
        client.lastSeen = now;
      }
    } catch (error) {
      console.error(`❌ Failed to send to client ${clientId}:`, error);
      clients.delete(clientId);
    }
  }

  console.log(`📡 Broadcasted batch to ${messagesSent} clients (${prices.length} prices)`);
}

// COST OPTIMIZED: Main streaming loop with longer intervals
async function startPriceStreaming(): Promise<void> {
  setInterval(async () => {
    try {
      // Get all unique subscribed symbols
      const allSymbols = new Set<string>();
      for (const client of clients.values()) {
        client.subscriptions.forEach(symbol => allSymbols.add(symbol));
      }

      if (allSymbols.size === 0) {
        return; // No active subscriptions
      }

      const symbolsArray = Array.from(allSymbols);
      console.log(`🔄 Processing ${symbolsArray.length} symbols for ${clients.size} clients`);

      // Fetch from Redis and broadcast to clients (NO TraderMade, NO DB writes)
      const prices = await fetchPricesFromRedis(symbolsArray);
      
      if (prices.length > 0) {
        await skipDatabaseWrites(prices); // No-op for cost optimization
        broadcastPricesToClients(prices);
      }

    } catch (error) {
      console.error('❌ Streaming loop error:', error);
    }
  }, config.BATCH_INTERVAL);
}

serve(async (req) => {
  const upgrade = req.headers.get("upgrade") || "";
  
  if (upgrade.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  // COST OPTIMIZED: Connection limits
  if (clients.size >= config.MAX_CLIENTS) {
    console.warn(`⚠️ Max clients reached (${config.MAX_CLIENTS}), rejecting connection`);
    return new Response("Server at capacity", { status: 503 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const clientId = generateClientId();

  console.log(`🔗 New WebSocket connection: ${clientId} (${clients.size + 1}/${config.MAX_CLIENTS})`);

  const client: ClientConnection = {
    id: clientId,
    socket,
    subscriptions: new Set(),
    lastSeen: Date.now(),
    isAuthenticated: false
  };

  clients.set(clientId, client);

  socket.onopen = () => {
    console.log(`✅ WebSocket opened for client ${clientId}`);
    socket.send(JSON.stringify({
      type: 'welcome',
      clientId: clientId,
      server: 'enhanced-websocket-streaming-cost-optimized',
      maxClients: config.MAX_CLIENTS,
      batchInterval: config.BATCH_INTERVAL
    }));
  };

  socket.onmessage = async (event) => {
    try {
      client.lastSeen = Date.now();
      const message = JSON.parse(event.data);

      switch (message.type || message.action) {
        case 'auth':
          try {
            if (message.token) {
              const { data: { user }, error } = await supabase.auth.getUser(message.token);
              if (user && !error) {
                client.userId = user.id;
                client.isAuthenticated = true;
                console.log(`🔐 Client ${clientId} authenticated as user ${user.id}`);
                
                socket.send(JSON.stringify({
                  type: 'auth_success',
                  success: true,
                  userId: user.id
                }));
              } else {
                throw new Error('Invalid token');
              }
            } else {
              // Allow anonymous connections for demo
              client.isAuthenticated = true;
              socket.send(JSON.stringify({
                type: 'auth_success',
                success: true,
                userId: null
              }));
            }
          } catch (error) {
            console.error(`❌ Auth failed for ${clientId}:`, error);
            socket.send(JSON.stringify({
              type: 'auth_error',
              success: false,
              message: 'Authentication failed'
            }));
          }
          break;

        case 'subscribe':
          if (!client.isAuthenticated) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'Must authenticate first'
            }));
            break;
          }

          const subscribeSymbols = message.symbols || [];
          for (const symbol of subscribeSymbols) {
            client.subscriptions.add(symbol);
            
            // Add to global subscriptions
            if (!subscriptions.has(symbol)) {
              subscriptions.set(symbol, new Set());
            }
            subscriptions.get(symbol)!.add(clientId);
          }

          console.log(`📊 Client ${clientId} subscribed to ${subscribeSymbols.length} symbols:`, subscribeSymbols);
          
          socket.send(JSON.stringify({
            type: 'subscription_ack',
            symbols: subscribeSymbols,
            total: client.subscriptions.size
          }));

          // Send cached prices immediately if available
          const cachedPrices = subscribeSymbols
            .map((symbol: string) => priceCache.get(symbol))
            .filter(Boolean);
          
          if (cachedPrices.length > 0) {
            socket.send(JSON.stringify({
              type: 'price_snapshot',
              updates: cachedPrices
            }));
          }
          break;

        case 'unsubscribe':
          const unsubscribeSymbols = message.symbols || [];
          for (const symbol of unsubscribeSymbols) {
            client.subscriptions.delete(symbol);
            subscriptions.get(symbol)?.delete(clientId);
            
            // Clean up empty subscriptions
            if (subscriptions.get(symbol)?.size === 0) {
              subscriptions.delete(symbol);
            }
          }
          
          console.log(`📊 Client ${clientId} unsubscribed from ${unsubscribeSymbols.length} symbols`);
          break;

        case 'ping':
          socket.send(JSON.stringify({ type: 'pong' }));
          break;

        default:
          console.log(`❓ Unknown message type from ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`❌ Message handling error for ${clientId}:`, error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  };

  socket.onclose = () => {
    console.log(`🔌 WebSocket closed for client ${clientId}`);
    
    // Clean up subscriptions
    for (const [symbol, clientSet] of subscriptions.entries()) {
      clientSet.delete(clientId);
      if (clientSet.size === 0) {
        subscriptions.delete(symbol);
      }
    }
    
    clients.delete(clientId);
    console.log(`📊 Active clients: ${clients.size}/${config.MAX_CLIENTS}`);
  };

  socket.onerror = (error) => {
    console.error(`❌ WebSocket error for ${clientId}:`, error);
    clients.delete(clientId);
  };

  return response;
});

// Start the Redis-only streaming loop (NO TraderMade connection)
console.log('🚀 Starting Redis-Only WebSocket Streaming (UI Distribution)');
console.log(`⚙️ Config: ${config.MAX_CLIENTS} max clients, ${config.BATCH_INTERVAL}ms batch interval`);
console.log('📡 Mode: Redis subscriber only - TraderMade handled by enhanced-websocket-streaming');
startPriceStreaming();