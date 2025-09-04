import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Redis } from 'https://esm.sh/@upstash/redis@1.28.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Zero-Pause Optimized Configuration
const WS_AUTH_TIMEOUT_MS = 15000; // Faster auth timeout
const MAX_WS_SUBS_PER_CLIENT = 10; // Reduced from 20
const BATCH_INTERVAL_MS = 50; // Ultra-fast 50ms batching
const HEARTBEAT_INTERVAL_MS = 10000; // Faster 10s heartbeat for quick detection
const MAX_CLIENTS = 1000; // Connection limit
const IDLE_TIMEOUT_MS = 180000; // 3 minutes idle timeout
const RECONNECT_DELAY_MS = 2000; // Fast reconnection
const PRICE_CACHE_TTL_MS = 5000; // 5-second cache for instant delivery

// Supabase clients
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
const supabaseService = createClient(supabaseUrl!, supabaseServiceKey!);

// Redis setup
const redisRestUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
const redisRestToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

// Trading symbols (only high-value pairs)
const TRADERMADE_SYMBOLS = ['XAUUSD', 'BTCUSD'];
const ALLOWED_CLIENT_SYMBOLS = new Set(TRADERMADE_SYMBOLS);

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  price: number; // CRITICAL: Add price field for frontend compatibility
  timestamp: string;
  change?: number;
  changePercent?: number;
}

interface ClientConnection {
  socket: WebSocket;
  id: string;
  userId?: string;
  subscriptions: Set<string>;
  isAuthenticated: boolean;
  lastActivity: number;
  lastPing: number;
  messageCount: number;
}

class EnhancedWebSocketStreaming {
  private static instance: EnhancedWebSocketStreaming;
  private clients: Map<string, ClientConnection> = new Map();
  private priceCache: Map<string, PriceData> = new Map();
  private batchedUpdates: Map<string, PriceData> = new Map();
  private batchTimeout: number | null = null;
  
  // TraderMade connection
  private tradermadeSocket: WebSocket | null = null;
  private isLeader = false;
  private instanceId: string;
  
  // Redis connections
  private redisPublisher: Redis | null = null;
  private redisClient: Redis | null = null;
  
  // Metrics
  private wsMessagesSent = 0;
  private wsClientsConnected = 0;
  private lastBroadcastAt = 0;
  
  // Heartbeat and cleanup
  private heartbeatInterval: number | null = null;
  private cleanupInterval: number | null = null;

  private constructor() {
    this.instanceId = crypto.randomUUID();
    this.initialize();
  }

  static getInstance(): EnhancedWebSocketStreaming {
    if (!EnhancedWebSocketStreaming.instance) {
      EnhancedWebSocketStreaming.instance = new EnhancedWebSocketStreaming();
    }
    return EnhancedWebSocketStreaming.instance;
  }

  private async initialize(): Promise<void> {
    console.log('🚀 Initializing Enhanced WebSocket Streaming Service...');
    
    // Initialize Redis for leader election
    await this.initializeRedis();
    
    // Start leader election
    await this.startLeaderElection();
    
    // Start periodic tasks
    this.startHeartbeat();
    this.startCleanup();
    
    console.log('✅ Enhanced WebSocket Streaming Service initialized');
  }

  private async initializeRedis(): Promise<void> {
    if (!redisRestUrl || !redisRestToken) {
      console.warn('⚠️ Redis not configured, running in single-instance mode');
      this.isLeader = true;
      return;
    }

    try {
      // Initialize Upstash Redis with REST API
      this.redisPublisher = new Redis({
        url: redisRestUrl,
        token: redisRestToken,
      });
      
      // Use the same client for both publishing and operations (REST API is stateless)
      this.redisClient = this.redisPublisher;
      
      // Test connection
      await this.redisClient.ping();
      
      console.log('✅ Redis connections established');
    } catch (error) {
      console.error('❌ Redis initialization failed:', error);
      this.isLeader = true; // Fallback to single instance
    }
  }

  private async startLeaderElection(): Promise<void> {
    if (!this.redisPublisher) {
      this.isLeader = true;
      this.connectToTradermade();
      return;
    }

    try {
      const result = await this.redisPublisher.set(
        'websocket:leader',
        this.instanceId,
        { ex: 60, nx: true } // 60 second TTL, only if not exists
      );

      if (result === 'OK') {
        console.log(`👑 Became leader: ${this.instanceId}`);
        this.isLeader = true;
        this.connectToTradermade();
        
        // Maintain leadership
        setInterval(async () => {
          try {
            await this.redisPublisher!.expire('websocket:leader', 60);
          } catch (error) {
            console.error('❌ Failed to maintain leadership:', error);
          }
        }, 30000);
      } else {
        console.log('📡 Running as follower instance');
        this.isLeader = false;
        this.subscribeToRedisUpdates();

        // Periodically attempt re-election in case the leader goes down
        setInterval(async () => {
          try {
            const res = await this.redisPublisher!.set('websocket:leader', this.instanceId, { ex: 60, nx: true });
            if (res === 'OK') {
              console.log(`👑 Promoted to leader: ${this.instanceId}`);
              this.isLeader = true;
              this.connectToTradermade();
            }
          } catch (e) {
            // ignore errors, will try again next interval
          }
        }, 30000);
      }
    } catch (error) {
      console.error('❌ Leader election failed:', error);
      this.isLeader = true; // Fallback
      this.connectToTradermade();
    }
  }

  private async connectToTradermade(): Promise<void> {
    if (!this.isLeader) return;

    const apiKey = Deno.env.get('TRADERMADE_API_KEY');
    if (!apiKey) {
      console.error('❌ TraderMade API key not configured');
      return;
    }

    try {
      console.log('🔌 Connecting to TraderMade WebSocket...');
      this.tradermadeSocket = new WebSocket('wss://marketdata.tradermade.com/feedadv');

      this.tradermadeSocket.onopen = () => {
        console.log('✅ Connected to TraderMade');
        
        // Authenticate and subscribe
        this.tradermadeSocket!.send(JSON.stringify({
          userKey: apiKey,
          symbol: TRADERMADE_SYMBOLS.join(',')
        }));
      };

      this.tradermadeSocket.onmessage = (event) => {
        this.handleTradermadeMessage(event.data);
      };

      this.tradermadeSocket.onclose = (event) => {
        console.log(`🔌 TraderMade connection closed (code: ${event.code}), fast reconnecting...`);
        // Zero-pause: Immediate reconnection attempt
        setTimeout(() => this.connectToTradermade(), RECONNECT_DELAY_MS);
      };

      this.tradermadeSocket.onerror = (error) => {
        console.error('❌ TraderMade error:', error);
      };

    } catch (error) {
      console.error('❌ Failed to connect to TraderMade:', error);
      setTimeout(() => this.connectToTradermade(), 10000);
    }
  }

  private async subscribeToRedisUpdates(): Promise<void> {
    if (!this.redisClient) return;

    console.log('📡 Starting Redis price polling for follower instance');
    
    // Poll for the latest prices for known symbols and rebroadcast to clients
    const pollForUpdates = async () => {
      try {
        const symbols = TRADERMADE_SYMBOLS;
        const keys = symbols.map(s => `price:${s}`);
        // Upstash REST client supports mget
        // @ts-ignore - types for spread tuple
        const values = await (this.redisClient as any).mget<string[]>(...keys);
        const updates: PriceData[] = [];
        const nowIso = new Date().toISOString();

        if (Array.isArray(values)) {
          values.forEach((val: string | null, idx: number) => {
            if (!val) return;
            try {
              const parsed = JSON.parse(val) as PriceData;
              const symbol = symbols[idx];
              const price = parsed.price ?? parsed.mid ?? ((parsed.bid !== undefined && parsed.ask !== undefined) ? (Number(parsed.bid) + Number(parsed.ask)) / 2 : undefined);
              if (!symbol || price === undefined) return;

              const priceData: PriceData = {
                symbol,
                bid: Number((parsed as any).bid ?? 0),
                ask: Number((parsed as any).ask ?? 0),
                mid: Number((parsed as any).mid ?? price),
                price: Number(price),
                timestamp: (parsed as any).timestamp || nowIso,
                change: (parsed as any).change,
                changePercent: (parsed as any).changePercent,
              };

              // Update local cache with freshness marker
              const cachedPrice = { ...priceData, cachedAt: Date.now() } as any;
              this.priceCache.set(symbol, cachedPrice);
              updates.push(priceData);
            } catch (e) {
              console.warn('⚠️ Failed to parse Redis price value', e);
            }
          });
        }

        if (updates.length === 0) return;

        // Broadcast only relevant symbols per client
        for (const [clientId, client] of this.clients) {
          if (client.socket.readyState !== WebSocket.OPEN) {
            this.removeClient(clientId);
            continue;
          }
          const relevant = updates.filter(u => client.subscriptions.has(u.symbol));
          if (relevant.length === 0) continue;

          try {
            client.socket.send(JSON.stringify({
              type: 'price_batch',
              updates: relevant,
              timestamp: nowIso,
              cached: true
            }));
            client.lastActivity = Date.now();
            client.messageCount++;
            this.wsMessagesSent++;
          } catch (err) {
            console.error(`❌ Failed to send follower update to ${clientId}:`, err);
            this.removeClient(clientId);
          }
        }
      } catch (error) {
        console.error('❌ Failed to poll Redis for updates:', error);
      }
    };

    // Poll periodically (every 3s to keep UI fresh without overloading)
    setInterval(pollForUpdates, 3000);
  }

  private async handleTradermadeMessage(data: string): Promise<void> {
    try {
      // Skip non-JSON messages like "Connected" from TraderMade
      if (!data.startsWith('{')) {
        console.log('📡 TraderMade info message:', data);
        return;
      }
      
      const message = JSON.parse(data);
      
      if (message.symbol && message.bid && message.ask) {
        const midPrice = (parseFloat(message.bid) + parseFloat(message.ask)) / 2;
        const priceData: PriceData = {
          symbol: message.symbol,
          bid: parseFloat(message.bid),
          ask: parseFloat(message.ask),
          mid: midPrice,
          price: midPrice, // CRITICAL: Add price field for frontend compatibility
          timestamp: new Date().toISOString(),
          change: message.change ? parseFloat(message.change) : 0,
          changePercent: message.changePercent ? parseFloat(message.changePercent) : 0
        };

        // Cache the price with TTL for instant delivery
        const cachedPrice = { ...priceData, cachedAt: Date.now() };
        this.priceCache.set(priceData.symbol, cachedPrice);
        
        // Store in Redis for followers + Database for alert system consistency
        if (this.redisPublisher && this.isLeader) {
          try {
            // Store in Redis for fast access by priority-alert-monitor
            await this.redisPublisher.set(`price:${priceData.symbol}`, JSON.stringify(priceData), { ex: 60 });
            
            // CRITICAL: Store in database to trigger alert processing via enhanced RPC
            await supabaseService.rpc('upsert_market_price_enhanced', {
              p_symbol: priceData.symbol,
              p_bid: priceData.bid,
              p_ask: priceData.ask,
              p_mid: priceData.mid,
              p_timestamp: new Date().toISOString()
            });
            
          } catch (error) {
            console.error('❌ Failed to store price in Redis/Database:', error);
          }
        }
        
        // Zero-pause: Immediate priority updates for critical symbols
        if (priceData.symbol === 'XAUUSD' || priceData.symbol === 'BTCUSD') {
          this.addToBatch(priceData, true); // Priority flag
        } else {
          this.addToBatch(priceData);
        }
      }
    } catch (error) {
      console.error('❌ Failed to handle TraderMade message:', error);
    }
  }

  private addToBatch(priceData: PriceData, priority: boolean = false): void {
    this.batchedUpdates.set(priceData.symbol, priceData);
    
    // Zero-pause: Priority updates get immediate delivery
    if (priority || !this.batchTimeout) {
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }
      
      const delay = priority ? 10 : BATCH_INTERVAL_MS; // 10ms for priority, 50ms for normal
      this.batchTimeout = setTimeout(() => {
        this.flushBatch();
      }, delay);
    }
  }

  private flushBatch(): void {
    if (this.batchedUpdates.size === 0) return;

    const updates = Array.from(this.batchedUpdates.values());
    this.batchedUpdates.clear();
    this.batchTimeout = null;

    // Send to subscribed clients only
    for (const [clientId, client] of this.clients) {
      if (client.socket.readyState !== WebSocket.OPEN) {
        this.removeClient(clientId);
        continue;
      }

      const relevantUpdates = updates.filter(update => 
        client.subscriptions.has(update.symbol)
      );

      if (relevantUpdates.length > 0) {
        try {
          client.socket.send(JSON.stringify({
            type: 'price_batch',
            updates: relevantUpdates,
            timestamp: new Date().toISOString()
          }));
          
          client.lastActivity = Date.now();
          client.messageCount++;
          this.wsMessagesSent++;
        } catch (error) {
          console.error(`❌ Failed to send to client ${clientId}:`, error);
          this.removeClient(clientId);
        }
      }
    }

    this.lastBroadcastAt = Date.now();
  }

  public addClient(connection: ClientConnection): void {
    if (this.clients.size >= MAX_CLIENTS) {
      connection.socket.close(1013, 'Server capacity exceeded');
      return;
    }

    this.clients.set(connection.id, connection);
    this.wsClientsConnected++;
    console.log(`📱 Client connected: ${connection.id} (total: ${this.clients.size})`);
  }

  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.close();
        }
      } catch (error) {
        console.warn(`Warning closing socket for ${clientId}:`, error);
      }
      
      this.clients.delete(clientId);
      console.log(`📱 Client disconnected: ${clientId} (total: ${this.clients.size})`);
    }
  }

  public async authenticateClient(client: ClientConnection, token: string): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        return false;
      }

      client.userId = user.id;
      client.isAuthenticated = true;
      console.log(`✅ Client authenticated: ${client.id}`);
      return true;
    } catch (error) {
      console.error(`❌ Authentication error for ${client.id}:`, error);
      return false;
    }
  }

  public handleSubscription(client: ClientConnection, symbols: string[]): void {
    const validSymbols = symbols
      .filter(s => ALLOWED_CLIENT_SYMBOLS.has(s.toUpperCase()))
      .slice(0, MAX_WS_SUBS_PER_CLIENT);

    client.subscriptions.clear();
    validSymbols.forEach(symbol => client.subscriptions.add(symbol.toUpperCase()));

    console.log(`📋 Client ${client.id} subscribed to: [${Array.from(client.subscriptions).join(', ')}]`);

    // Zero-pause: Send cached prices immediately for seamless experience
    const currentPrices = Array.from(client.subscriptions)
      .map(symbol => {
        const cached = this.priceCache.get(symbol);
        // Check cache freshness (5-second TTL for instant delivery)
        if (cached && cached.cachedAt && (Date.now() - cached.cachedAt) < PRICE_CACHE_TTL_MS) {
          return cached;
        }
        return cached; // Return even stale data for zero-pause experience
      })
      .filter(Boolean);

    if (currentPrices.length > 0) {
      try {
        client.socket.send(JSON.stringify({
          type: 'price_snapshot',
          prices: currentPrices,
          timestamp: new Date().toISOString(),
          cached: true // Indicate this is cached data
        }));
        console.log(`📸 Sent cached snapshot to ${client.id}: ${currentPrices.length} prices`);
      } catch (error) {
        console.error(`❌ Failed to send snapshot to ${client.id}:`, error);
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [clientId, client] of this.clients) {
        // Zero-pause: Faster connection health detection
        if (client.socket.readyState === WebSocket.OPEN) {
          try {
            client.socket.send(JSON.stringify({
              type: 'ping',
              timestamp: new Date().toISOString(),
              server_time: now
            }));
            client.lastPing = now;
          } catch (error) {
            console.error(`❌ Failed to ping client ${clientId}:`, error);
            this.removeClient(clientId);
          }
        } else {
          console.log(`🔌 Removing client with closed connection: ${clientId}`);
          this.removeClient(clientId);
        }
      }
      
      // Zero-pause: Monitor TraderMade connection health
      if (this.isLeader && (!this.tradermadeSocket || this.tradermadeSocket.readyState !== WebSocket.OPEN)) {
        console.log('🔄 TraderMade connection unhealthy, attempting reconnection...');
        this.connectToTradermade();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      // Remove idle clients
      for (const [clientId, client] of this.clients) {
        if (now - client.lastActivity > IDLE_TIMEOUT_MS) {
          console.log(`🧹 Removing idle client: ${clientId}`);
          this.removeClient(clientId);
        }
      }
    }, 60000); // Check every minute
  }

  public getStats() {
    const now = Date.now();
    const cacheAges = Array.from(this.priceCache.values())
      .map(price => price.cachedAt ? now - price.cachedAt : 0);
    
    return {
      clients: this.clients.size,
      authenticatedClients: Array.from(this.clients.values()).filter(c => c.isAuthenticated).length,
      cachedPrices: this.priceCache.size,
      active_symbols: Array.from(this.priceCache.keys()),
      messagesSent: this.wsMessagesSent,
      lastBroadcast: this.lastBroadcastAt,
      isLeader: this.isLeader,
      tradermadeConnected: this.tradermadeSocket?.readyState === WebSocket.OPEN,
      tradermadeStatus: this.tradermadeSocket?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected',
      avgCacheAge: cacheAges.length > 0 ? Math.round(cacheAges.reduce((a, b) => a + b, 0) / cacheAges.length) : 0,
      maxCacheAge: cacheAges.length > 0 ? Math.max(...cacheAges) : 0,
      uptime: now - this.wsMessagesSent, // Rough uptime estimate
      version: '2.0-zero-pause'
    };
  }
}

// WebSocket connection handler
async function handleWebSocketUpgrade(req: Request): Promise<Response> {
  try {
    const { socket, response } = Deno.upgradeWebSocket(req);
    const clientId = crypto.randomUUID();
    const manager = EnhancedWebSocketStreaming.getInstance();
    
    const connection: ClientConnection = {
      socket,
      id: clientId,
      subscriptions: new Set(),
      isAuthenticated: false,
      lastActivity: Date.now(),
      lastPing: Date.now(),
      messageCount: 0
    };

    let authTimer: number | null = null;

    socket.onopen = () => {
      manager.addClient(connection);

      // Auth timeout
      authTimer = setTimeout(() => {
        if (!connection.isAuthenticated) {
          socket.close(1008, 'Authentication timeout');
        }
      }, WS_AUTH_TIMEOUT_MS);

      // Welcome message
      socket.send(JSON.stringify({
        type: 'welcome',
        clientId,
        maxSubscriptions: MAX_WS_SUBS_PER_CLIENT,
        timestamp: new Date().toISOString()
      }));
    };

    socket.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);
        connection.lastActivity = Date.now();

        const msgType = message.type || message.action;

        switch (msgType) {
          case 'auth':
            if (message.token) {
              const authenticated = await manager.authenticateClient(connection, message.token);
              if (authenticated && authTimer) {
                clearTimeout(authTimer);
                authTimer = null;
              }
              socket.send(JSON.stringify({
                type: 'auth_response',
                success: authenticated,
                timestamp: new Date().toISOString()
              }));
            }
            break;

          case 'subscribe':
            if (connection.isAuthenticated && message.symbols) {
              manager.handleSubscription(connection, message.symbols);
            }
            break;

          case 'unsubscribe':
            if (connection.isAuthenticated && message.symbols) {
              // Remove only the specified symbols from the client's subscriptions
              message.symbols.forEach((s: string) => connection.subscriptions.delete(String(s).toUpperCase()));
            }
            break;

          case 'ping':
            // Respond to client health check
            socket.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
            break;

          case 'pong':
            connection.lastPing = Date.now();
            break;
        }
      } catch (error) {
        console.error(`❌ Message error for ${clientId}:`, error);
      }
    };

    socket.onclose = () => {
      if (authTimer) clearTimeout(authTimer);
      manager.removeClient(clientId);
    };

    socket.onerror = (error) => {
      console.error(`❌ Socket error for ${clientId}:`, error);
      if (authTimer) clearTimeout(authTimer);
      manager.removeClient(clientId);
    };

    return response;
  } catch (error) {
    console.error('❌ WebSocket upgrade failed:', error);
    return new Response('WebSocket upgrade failed', { status: 500, headers: corsHeaders });
  }
}

// Health endpoint
function handleHealthRequest(): Response {
  const manager = EnhancedWebSocketStreaming.getInstance();
  const stats = manager.getStats();
  
  return new Response(JSON.stringify({
    service: 'enhanced-websocket-streaming',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Main handler
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // WebSocket upgrade
  if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    return handleWebSocketUpgrade(req);
  }

  // Health endpoint - handle both /health and default path
  if (url.pathname === '/health' || url.searchParams.has('action')) {
    return handleHealthRequest();
  }

  // Default response should also be JSON for consistency
  return new Response(JSON.stringify({
    service: 'enhanced-websocket-streaming',
    status: 'ready',
    message: 'Enhanced WebSocket Streaming Service'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});