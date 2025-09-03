import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { connect } from "https://deno.land/x/redis@v0.32.3/mod.ts";

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
const redisUrl = Deno.env.get('UPSTASH_REDIS_URL');
const redisPassword = Deno.env.get('UPSTASH_REDIS_PASSWORD');

// Trading symbols (only high-value pairs)
const TRADERMADE_SYMBOLS = ['XAUUSD', 'BTCUSD'];
const ALLOWED_CLIENT_SYMBOLS = new Set(TRADERMADE_SYMBOLS);

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
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
  private redisPublisher: any = null;
  private redisSubscriber: any = null;
  
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
    if (!redisUrl || !redisPassword) {
      console.warn('⚠️ Redis not configured, running in single-instance mode');
      this.isLeader = true;
      return;
    }

    try {
      const parsedUrl = new URL(redisUrl);
      const connectionConfig = {
        hostname: parsedUrl.hostname,
        port: parseInt(parsedUrl.port) || 6379,
        username: parsedUrl.username || 'default',
        password: redisPassword,
        tls: parsedUrl.protocol === 'rediss:',
      };

      // Publisher for leader election
      this.redisPublisher = await connect(connectionConfig);
      await this.redisPublisher.ping();
      
      // Subscriber for price distribution
      this.redisSubscriber = await connect(connectionConfig);
      await this.redisSubscriber.ping();
      
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
        'EX', 60, // 60 second TTL
        'NX'
      );

      if (result === 'OK') {
        console.log(`👑 Became leader: ${this.instanceId}`);
        this.isLeader = true;
        this.connectToTradermade();
        
        // Maintain leadership
        setInterval(async () => {
          try {
            await this.redisPublisher.expire('websocket:leader', 60);
          } catch (error) {
            console.error('❌ Failed to maintain leadership:', error);
          }
        }, 30000);
      } else {
        console.log('📡 Running as follower instance');
        this.isLeader = false;
        this.subscribeToRedisUpdates();
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
    if (!this.redisSubscriber) return;

    try {
      await this.redisSubscriber.subscribe('websocket:prices');
      
      for await (const message of this.redisSubscriber.receive()) {
        try {
          const priceData: PriceData = JSON.parse(message.message);
          this.priceCache.set(priceData.symbol, priceData);
          this.addToBatch(priceData);
        } catch (error) {
          console.error('❌ Failed to process Redis message:', error);
        }
      }
    } catch (error) {
      console.error('❌ Redis subscription failed:', error);
    }
  }

  private async handleTradermadeMessage(data: string): Promise<void> {
    try {
      const message = JSON.parse(data);
      
      if (message.symbol && message.bid && message.ask) {
        const priceData: PriceData = {
          symbol: message.symbol,
          bid: parseFloat(message.bid),
          ask: parseFloat(message.ask),
          mid: (parseFloat(message.bid) + parseFloat(message.ask)) / 2,
          timestamp: new Date().toISOString(),
          change: message.change ? parseFloat(message.change) : 0,
          changePercent: message.changePercent ? parseFloat(message.changePercent) : 0
        };

        // Cache the price with TTL for instant delivery
        const cachedPrice = { ...priceData, cachedAt: Date.now() };
        this.priceCache.set(priceData.symbol, cachedPrice);
        
        // Publish to Redis for followers
        if (this.redisPublisher && this.isLeader) {
          await this.redisPublisher.publish('websocket:prices', JSON.stringify(priceData));
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

        switch (message.type) {
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

  // Health endpoint
  if (url.pathname === '/health') {
    return handleHealthRequest();
  }

  return new Response('Enhanced WebSocket Streaming Service', {
    headers: corsHeaders
  });
});