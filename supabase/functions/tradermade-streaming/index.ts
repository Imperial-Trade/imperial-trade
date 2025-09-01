import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { connect } from "https://deno.land/x/redis@v0.32.3/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration constants
const WS_AUTH_TIMEOUT_MS = parseInt(Deno.env.get('WS_AUTH_TIMEOUT_MS') || '30000'); // 30 seconds
const MAX_WS_SUBS_PER_CLIENT = parseInt(Deno.env.get('MAX_WS_SUBS_PER_CLIENT') || '20'); // Max subscriptions per client
const IDLE_DISCONNECT_DELAY_MS = parseInt(Deno.env.get('IDLE_DISCONNECT_DELAY_MS') || '600000'); // 10 minutes
const PRICE_CACHE_TTL_MS = parseInt(Deno.env.get('PRICE_CACHE_TTL_MS') || '45000'); // 45 seconds

// Redis pub/sub constants
const REDIS_PRICE_CHANNEL = 'tradermade:price_updates';
const LEADER_LOCK_KEY = 'tradermade:leader:lock';
const LEADER_LOCK_TTL = 15; // 15 seconds (reduced for faster failover)
const LEADER_HEARTBEAT_INTERVAL = 5000; // 5 seconds (critical: faster heartbeat)

// New guardrail constants
const FORCEFETCH_INTERNAL_KEY = Deno.env.get('FORCEFETCH_INTERNAL_KEY') || 'imperial-internal-2024';
const REST_COOLDOWN_MS = parseInt(Deno.env.get('REST_COOLDOWN_MS') || '10000'); // 10 seconds per symbol
const MAX_SYMBOLS_PER_POST = parseInt(Deno.env.get('MAX_SYMBOLS_PER_POST') || '5'); // Symbol cap
const CIRCUIT_BREAKER_ERRORS = parseInt(Deno.env.get('CIRCUIT_BREAKER_ERRORS') || '3'); // Errors before disable
const CIRCUIT_BREAKER_WINDOW_MS = parseInt(Deno.env.get('CIRCUIT_BREAKER_WINDOW_MS') || '60000'); // 1 minute window

// Supabase client for JWT verification
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

// Redis client setup
const redisUrl = Deno.env.get('UPSTASH_REDIS_URL');
const redisPassword = Deno.env.get('UPSTASH_REDIS_PASSWORD');

// Tradermade symbol configuration
const TRADERMADE_SYMBOLS = ['XAUUSD', 'BTCUSD', 'USA30USD', 'NAS100USD', 'EURUSD'];

// Enhanced client-to-server symbol mapping for BTC/XAU consistency
const CLIENT_TO_UPSTREAM: Record<string, string> = {
  // Core mappings
  XAUUSD: 'XAUUSD',
  BTCUSD: 'BTCUSD',
  EURUSD: 'EURUSD',
  USA30USD: 'US30',
  NAS100USD: 'NAS100',
  
  // Enhanced BTC/XAU normalization
  BTC: 'BTCUSD',
  'BTC/USD': 'BTCUSD',
  BITCOIN: 'BTCUSD',
  XAU: 'XAUUSD',
  'XAU/USD': 'XAUUSD',
  GOLD: 'XAUUSD',
  
  // Additional common variants
  GBPUSD: 'GBPUSD',
  USDJPY: 'USDJPY',
};

// Server-to-client symbol mapping for response normalization
const UPSTREAM_TO_CLIENT: Record<string, string> = {
  XAUUSD: 'XAUUSD',
  BTCUSD: 'BTCUSD', 
  EURUSD: 'EURUSD',
  US30: 'USA30USD',
  NAS100: 'NAS100USD',
  GBPUSD: 'GBPUSD',
  USDJPY: 'USDJPY',
};

interface TradermadePriceData {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  timestamp: string;
  change: number;
  changePercent: number;
  cachedAt?: number; // Unix timestamp for TTL tracking
}

interface ClientConnection {
  socket: WebSocket;
  subscriptions: Set<string>;
  id: string;
  isAuthenticated: boolean;
  authTimer?: number;
  userId?: string;
  ipHash?: string;
}

// ========== UNIFIED CONNECTION MANAGER WITH REDIS PUB/SUB ==========
class TradermadeConnectionManager {
  private static instance: TradermadeConnectionManager;
  private tradermadeSocket: WebSocket | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private priceCache: Map<string, TradermadePriceData> = new Map();
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private reconnectTimeout: number | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private heartbeatInterval: number | null = null;
  private lastPingTime = 0;
  private idleDisconnectTimeout: number | null = null;
  private lastTickTime = 0;
  private isWarmingUp = false;

  // Redis pub/sub integration
  private redisPublisher: any = null;
  private redisSubscriber: any = null;
  private isLeader = false;
  private leaderHeartbeatInterval: number | null = null;
  private instanceId: string;

  // ===== GUARDRAILS & METRICS =====
  private lastRestFetchAt: Map<string, number> = new Map();
  private restErrorTimestamps: number[] = [];
  private isRestDisabled = false;
  private fallbackHttpTotal = 0;
  private fallbackForceFetchTotal = 0;
  private wsFirstTickLatenciesMs: number[] = [];
  private wsUpdatesTotal = 0;
  private httpUpdatesTotal = 0;
  private upstreamIdleReconnects = 0;
  private clientSubscriptionTimes: Map<string, Map<string, number>> = new Map();

  private constructor() {
    this.instanceId = crypto.randomUUID();
    this.initializeRedis();
  }

  static getInstance(): TradermadeConnectionManager {
    if (!TradermadeConnectionManager.instance) {
      TradermadeConnectionManager.instance = new TradermadeConnectionManager();
    }
    return TradermadeConnectionManager.instance;
  }

  // Initialize Redis connections for pub/sub with enhanced error handling
  private async initializeRedis(): Promise<void> {
    let attempt = 0;
    const maxAttempts = 3;
    
    while (attempt < maxAttempts) {
      try {
        if (!redisUrl || !redisPassword) {
          console.error('❌ Redis credentials not configured');
          return;
        }

        console.log(`🔌 Initializing Redis connections... (attempt ${attempt + 1}/${maxAttempts})`);
        
        // Parse Redis URL with validation
        const parsedUrl = new URL(redisUrl!);
        console.log(`🔍 Redis connection: ${parsedUrl.hostname}:${parsedUrl.port} (TLS: ${parsedUrl.protocol === 'rediss:'})`);
        
        const connectionConfig = {
          hostname: parsedUrl.hostname,
          port: parseInt(parsedUrl.port) || 6379,
          username: parsedUrl.username || 'default',
          password: redisPassword || parsedUrl.password,
          tls: parsedUrl.protocol === 'rediss:',
        };
        
        // Publisher connection for sending price updates to Redis
        console.log('📤 Connecting Redis publisher...');
        this.redisPublisher = await connect(connectionConfig);
        
        // Test publisher connection
        await this.redisPublisher.ping();
        console.log('✅ Redis publisher connected and tested');

        // Subscriber connection for receiving price updates from Redis
        console.log('📥 Connecting Redis subscriber...');
        this.redisSubscriber = await connect(connectionConfig);
        
        // Test subscriber connection
        await this.redisSubscriber.ping();
        console.log('✅ Redis subscriber connected and tested');

        console.log('✅ Redis connections established successfully');
        
        // Start leader election process
        await this.startLeaderElection();
        
        // Subscribe to price updates channel
        await this.subscribeToRedisChannel();
        
        return; // Success, exit retry loop
        
      } catch (error) {
        attempt++;
        console.error(`❌ Redis initialization attempt ${attempt} failed:`, error);
        
        if (attempt >= maxAttempts) {
          console.error('❌ All Redis connection attempts failed, continuing without Redis');
          // Continue without Redis - fall back to single instance mode
          this.isLeader = true;
          console.log('🔄 Falling back to single instance mode (no Redis)');
          return;
        }
        
        // Wait before retry
        const delay = 2000 * attempt;
        console.log(`⏱️ Retrying Redis connection in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Enhanced leader election mechanism using Redis SETNX with validation
  private async startLeaderElection(): Promise<void> {
    if (!this.redisPublisher) {
      console.warn('⚠️ No Redis publisher available, assuming leader role');
      this.isLeader = true;
      await this.connectToTradermade();
      return;
    }

    try {
      console.log(`🗳️ Starting leader election for instance ${this.instanceId}`);
      
      // Try to acquire leadership lock
      const result = await this.redisPublisher.set(
        LEADER_LOCK_KEY, 
        this.instanceId,
        'EX', LEADER_LOCK_TTL,
        'NX'
      );

      if (result === 'OK') {
        console.log(`👑 Became TraderMade connection leader (instance: ${this.instanceId})`);
        this.isLeader = true;
        
        // Connect to TraderMade only if we have clients
        const authenticatedClients = Array.from(this.clients.values()).filter(c => c.isAuthenticated);
        if (authenticatedClients.length > 0) {
          await this.connectToTradermade();
        }
        
        this.startLeaderHeartbeat();
      } else {
        // Check who is the current leader
        const currentLeader = await this.redisPublisher.get(LEADER_LOCK_KEY);
        console.log(`📡 Following leader for TraderMade connection (current leader: ${currentLeader || 'unknown'})`);
        this.isLeader = false;
        
        // Check leader status periodically
        setTimeout(() => this.checkLeaderStatus(), 5000);
      }
    } catch (error) {
      console.error('❌ Leader election failed:', error);
      
      // If Redis is unavailable, assume leadership to prevent service disruption
      if (error.message?.includes('connection') || error.message?.includes('timeout')) {
        console.warn('⚠️ Redis unavailable during leader election, assuming leader role');
        this.isLeader = true;
        await this.connectToTradermade();
      } else {
        // Retry after delay for other errors
        setTimeout(() => this.startLeaderElection(), 5000);
      }
    }
  }

  // Enhanced leadership heartbeat with health monitoring
  private startLeaderHeartbeat(): void {
    if (this.leaderHeartbeatInterval) {
      clearInterval(this.leaderHeartbeatInterval);
    }

    this.leaderHeartbeatInterval = setInterval(async () => {
      if (!this.isLeader || !this.redisPublisher) return;

      try {
        // Renew leadership lock
        const currentLeader = await this.redisPublisher.get(LEADER_LOCK_KEY);
        if (currentLeader === this.instanceId) {
          // Successfully renew lock
          await this.redisPublisher.expire(LEADER_LOCK_KEY, LEADER_LOCK_TTL);
          
          // Also publish a heartbeat to Redis for monitoring
          await this.redisPublisher.set(
            `leader:heartbeat:${this.instanceId}`, 
            JSON.stringify({
              timestamp: Date.now(),
              connectedClients: this.clients.size,
              authenticatedClients: Array.from(this.clients.values()).filter(c => c.isAuthenticated).length,
              tradermadeStatus: this.connectionStatus,
              pricesCached: this.priceCache.size
            }),
            'EX', 60 // 60 second TTL for heartbeat
          );
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`💓 Leader heartbeat sent (clients: ${this.clients.size}, cached prices: ${this.priceCache.size})`);
          }
        } else {
          console.warn(`⚠️ Lost leadership, stepping down (current leader: ${currentLeader || 'none'})`);
          this.isLeader = false;
          this.disconnectTradermade();
          clearInterval(this.leaderHeartbeatInterval);
          this.leaderHeartbeatInterval = null;
          
          // Try to become leader again if there's no leader
          if (!currentLeader) {
            setTimeout(() => this.startLeaderElection(), 2000);
          }
        }
      } catch (error) {
        console.error('❌ Leader heartbeat failed:', error);
        
        // On heartbeat failure, step down and retry leader election
        this.isLeader = false;
        this.disconnectTradermade();
        clearInterval(this.leaderHeartbeatInterval);
        this.leaderHeartbeatInterval = null;
        setTimeout(() => this.startLeaderElection(), 5000);
      }
    }, LEADER_HEARTBEAT_INTERVAL);
  }

  // Check if current leader is still alive
  private async checkLeaderStatus(): Promise<void> {
    try {
      const currentLeader = await this.redisPublisher.get(LEADER_LOCK_KEY);
      if (!currentLeader) {
        // No leader, attempt to become leader
        await this.startLeaderElection();
      } else {
        // Leader exists, check again later
        setTimeout(() => this.checkLeaderStatus(), 10000);
      }
    } catch (error) {
      console.error('❌ Failed to check leader status:', error);
    }
  }

  // Subscribe to Redis pub/sub channel for price updates
  private async subscribeToRedisChannel(): Promise<void> {
    try {
      await this.redisSubscriber.subscribe(REDIS_PRICE_CHANNEL, (channel: string, message: string) => {
        try {
          const priceUpdate: TradermadePriceData = JSON.parse(message);
          // Update local cache
          this.priceCache.set(priceUpdate.symbol, priceUpdate);
          // Broadcast to connected clients (all instances do this)
          this.broadcastPriceUpdate(priceUpdate);
        } catch (error) {
          console.error('❌ Failed to process Redis price update:', error);
        }
      });
      console.log('📡 Subscribed to Redis price updates channel');
    } catch (error) {
      console.error('❌ Failed to subscribe to Redis channel:', error);
    }
  }

  // Enhanced price publishing to Redis with consistency checks (leader only)
  private async publishPriceToRedis(priceUpdate: TradermadePriceData): Promise<void> {
    if (!this.isLeader || !this.redisPublisher) return;

    try {
      // Publish to Redis channel for real-time distribution
      await this.redisPublisher.publish(REDIS_PRICE_CHANNEL, JSON.stringify(priceUpdate));
      
      // Also store in Redis cache with TTL for HTTP requests
      const cacheKey = `price:${priceUpdate.symbol}`;
      await this.redisPublisher.set(
        cacheKey,
        JSON.stringify(priceUpdate),
        'EX', Math.floor(PRICE_CACHE_TTL_MS / 1000) // Convert to seconds
      );
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📤 Published ${priceUpdate.symbol} = $${priceUpdate.price} to Redis (pub/sub + cache)`);
      }
    } catch (error) {
      console.error('❌ Failed to publish price to Redis:', error);
    }
  }

  // Add client connection
  addClient(clientId: string, socket: WebSocket, request: Request): void {
    const ipHash = this.getIpHash(request);
    
    const client: ClientConnection = {
      socket,
      subscriptions: new Set(),
      id: clientId,
      isAuthenticated: false,
      ipHash
    };
    
    this.clients.set(clientId, client);
    
    // Set authentication timeout
    client.authTimer = setTimeout(() => {
      this.logEvent('unauth_timeout', { client_id: clientId, ip_hash: ipHash });
      this.sendAuthError(clientId, 'Authentication timeout');
      this.removeClient(clientId);
    }, WS_AUTH_TIMEOUT_MS);
    
    this.logEvent('auth_required', { 
      client_id: clientId, 
      ip_hash: ipHash,
      timeout_ms: WS_AUTH_TIMEOUT_MS,
      total_clients: this.clients.size,
      is_leader: this.isLeader
    });

    // Send auth required message
    this.sendToClient(clientId, {
      type: 'auth_required',
      message: 'Authentication required'
    });
  }

  // Remove client connection
  removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      // Clear auth timer if exists
      if (client.authTimer) {
        clearTimeout(client.authTimer);
      }
      
      // Clean up first-tick latency tracking
      this.clientSubscriptionTimes.delete(clientId);
      
      this.clients.delete(clientId);
      this.logEvent('disconnect', { 
        client_id: clientId, 
        ip_hash: client.ipHash,
        was_authenticated: client.isAuthenticated,
        remaining_clients: this.clients.size
      });

      // Leader manages TraderMade connection based on client count
      if (this.isLeader && this.clients.size === 0) {
        console.info(`⏱️ No clients remaining, scheduling TraderMade disconnect in ${IDLE_DISCONNECT_DELAY_MS/1000}s...`);
        this.idleDisconnectTimeout = setTimeout(() => {
          if (this.clients.size === 0) {
            console.info('🔌 Disconnecting TraderMade connection (no clients)');
            this.disconnectTradermade();
          }
        }, IDLE_DISCONNECT_DELAY_MS);
      }
    }
  }

  // Subscribe client to symbols
  subscribeClient(clientId: string, symbols: string[]): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (!client.isAuthenticated) {
      this.sendAuthError(clientId, 'Authentication required');
      return;
    }

    // Check subscription limit
    const newSymbols = symbols.filter(s => {
      const normalized = this.normalizeClientSymbol(s);
      return normalized && TRADERMADE_SYMBOLS.includes(normalized) && !client.subscriptions.has(normalized);
    });

    if (client.subscriptions.size + newSymbols.length > MAX_WS_SUBS_PER_CLIENT) {
      const errorMsg = `Subscription limit exceeded (max: ${MAX_WS_SUBS_PER_CLIENT})`;
      this.sendToClient(clientId, {
        type: 'error',
        code: 'max_subscriptions_exceeded',
        message: errorMsg
      });
      
      // Close after short delay to ensure error is received
      setTimeout(() => {
        client.socket.close();
      }, 75);
      
      this.logEvent('subscribe', { 
        client_id: clientId,
        ip_hash: client.ipHash,
        user_id: client.userId,
        error: 'max_subscriptions_exceeded',
        current_count: client.subscriptions.size,
        requested_count: newSymbols.length,
        max_allowed: MAX_WS_SUBS_PER_CLIENT
      });
      return;
    }

    symbols.forEach(symbol => {
      const normalized = this.normalizeClientSymbol(symbol);
      if (normalized && TRADERMADE_SYMBOLS.includes(normalized)) {
        client.subscriptions.add(normalized);
        
        // Track subscription start time for first-tick latency measurement
        if (!this.clientSubscriptionTimes.has(clientId)) {
          this.clientSubscriptionTimes.set(clientId, new Map());
        }
        this.clientSubscriptionTimes.get(clientId)!.set(normalized, Date.now());
        
        // Send cached price if available and not expired
        const cached = this.getCachedPrice(normalized);
        if (cached) {
          this.sendToClient(clientId, {
            type: 'price_update',
            ...cached
          });
        }
      }
    });

    this.logEvent('subscribe', { 
      client_id: clientId,
      ip_hash: client.ipHash,
      user_id: client.userId,
      symbols: symbols.length,
      total_subscriptions: client.subscriptions.size
    });
  }

  // Unsubscribe client from symbols
  unsubscribeClient(clientId: string, symbols: string[]): void {
    const client = this.clients.get(clientId);
    if (!client || !client.isAuthenticated) return;

    symbols.forEach(symbol => {
      const normalized = this.normalizeClientSymbol(symbol);
      if (normalized) {
        client.subscriptions.delete(normalized);
      }
    });

    this.logEvent('unsubscribe', { 
      client_id: clientId,
      ip_hash: client.ipHash,
      user_id: client.userId,
      symbols: symbols.length,
      total_subscriptions: client.subscriptions.size
    });
  }

  // Connect to TraderMade (LEADER ONLY - single connection across all instances)
  private async connectToTradermade(): Promise<void> {
    if (!this.isLeader) {
      console.log('📡 Not leader, skipping TraderMade connection');
      return;
    }

    if (this.connectionStatus === 'connecting' || this.connectionStatus === 'connected') {
      console.log('⚠️ TraderMade connection already exists, skipping...');
      return;
    }

    const apiKey = Deno.env.get('TRADERMADE_API_KEY');
    if (!apiKey) {
      console.error('❌ TRADERMADE_API_KEY not configured');
      this.connectionStatus = 'error';
      this.broadcastToAllClients({
        type: 'connection_status',
        status: 'error',
        message: 'API key not configured',
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      console.log('🔌 Connecting to TraderMade WebSocket... (LEADER)');
      this.connectionStatus = 'connecting';
      this.broadcastToAllClients({
        type: 'connection_status',
        status: 'connecting',
        timestamp: new Date().toISOString()
      });

      this.tradermadeSocket = new WebSocket('wss://marketdata.tradermade.com/feedadv');

      this.tradermadeSocket.onopen = () => {
        console.log('✅ Connected to TraderMade (LEADER)');
        this.connectionStatus = 'connected';
        this.reconnectAttempts = 0;

        // Authenticate and subscribe to all symbols
        if (this.tradermadeSocket) {
          const upstreamSymbols = TRADERMADE_SYMBOLS.map(s => CLIENT_TO_UPSTREAM[s] || s).join(',');
          this.tradermadeSocket.send(JSON.stringify({
            userKey: apiKey,
            symbol: upstreamSymbols
          }));
        }

        // Start heartbeat
        this.startHeartbeat();

        // Notify all clients
        this.broadcastToAllClients({
          type: 'connection_status',
          status: 'connected',
          dataSource: 'tradermade',
          timestamp: new Date().toISOString()
        });
      };

      this.tradermadeSocket.onmessage = (event) => {
        this.handleTradermadeMessage(event.data);
      };

      this.tradermadeSocket.onclose = (event) => {
        const logLevel = event.code === 1000 || event.code === 1005 ? 'info' : 'warn';
        const closeReason = event.reason || 'No reason provided';
        console[logLevel](`🔌❌ TraderMade connection closed: ${event.code} - ${closeReason}`);
        this.connectionStatus = 'disconnected';
        this.stopHeartbeat();
        
        this.broadcastToAllClients({
          type: 'connection_status',
          status: 'disconnected',
          timestamp: new Date().toISOString(),
          closeCode: event.code,
          closeReason
        });

        // Attempt reconnection if we have clients and are still leader
        if (this.isLeader && this.clients.size > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.tradermadeSocket.onerror = (error) => {
        console.error('❌ TraderMade WebSocket error:', error);
        this.connectionStatus = 'error';
        
        this.broadcastToAllClients({
          type: 'connection_status',
          status: 'error',
          timestamp: new Date().toISOString()
        });
      };

    } catch (error) {
      console.error('❌ Failed to connect to TraderMade:', error);
      this.connectionStatus = 'error';
      this.broadcastToAllClients({
        type: 'connection_status',
        status: 'error',
        message: 'Connection failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  // Handle incoming TraderMade messages (LEADER ONLY)
  private handleTradermadeMessage(data: string): void {
    if (!this.isLeader) return;

    try {
      // Handle text messages (like "Connected") without parsing as JSON
      if (!data.startsWith('{')) {
        if (data.toLowerCase().includes('connected')) {
          console.log('✅ TraderMade authentication successful (LEADER)');
        }
        return;
      }

      const parsed = JSON.parse(data);

      // Handle heartbeat responses
      if (parsed.type === 'pong' || parsed.message === 'pong') {
        return;
      }

      // Extract price data
      const upstreamSymbol = (parsed.symbol || parsed.instrument)?.toUpperCase();
      if (!upstreamSymbol) return;

      const clientSymbol = UPSTREAM_TO_CLIENT[upstreamSymbol] || upstreamSymbol;
      
      let price = parsed.mid || parsed.price;
      if (price === undefined && parsed.bid && parsed.ask) {
        price = (parseFloat(parsed.bid) + parseFloat(parsed.ask)) / 2;
      } else if (price === undefined) {
        price = parsed.bid || parsed.ask;
      }
      
      price = price !== undefined ? parseFloat(price) : undefined;
      
      if (!price || isNaN(price) || price <= 0) return;

      // Validate price ranges for indices
      if (clientSymbol === 'USA30USD' && (price < 10000 || price > 100000)) return;
      if (clientSymbol === 'NAS100USD' && (price < 5000 || price > 50000)) return;

      const now = Date.now();
      const priceUpdate: TradermadePriceData = {
        symbol: clientSymbol,
        price,
        bid: parsed.bid ? parseFloat(parsed.bid) : price,
        ask: parsed.ask ? parseFloat(parsed.ask) : price,
        timestamp: new Date().toISOString(),
        change: 0,
        changePercent: 0,
        cachedAt: now
      };

      // Cache the price with TTL
      this.priceCache.set(clientSymbol, priceUpdate);
      this.lastTickTime = now;

      // LEADER: Publish to Redis for all instances
      this.publishPriceToRedis(priceUpdate);

    } catch (error) {
      if (data.startsWith('{')) {
        console.error('❌ Error parsing TraderMade message:', error);
      }
    }
  }

  // Broadcast price update to subscribed clients (ALL INSTANCES)
  private broadcastPriceUpdate(priceUpdate: TradermadePriceData): void {
    let broadcastCount = 0;
    const now = Date.now();

    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(priceUpdate.symbol)) {
        this.sendToClient(clientId, {
          type: 'price_update',
          ...priceUpdate
        });
        broadcastCount++;

        // Track first-tick latency for this client/symbol combination
        const clientTimes = this.clientSubscriptionTimes.get(clientId);
        if (clientTimes?.has(priceUpdate.symbol)) {
          const subscriptionStartTime = clientTimes.get(priceUpdate.symbol)!;
          const firstTickLatency = now - subscriptionStartTime;
          
          // Store latency (keep last 100 samples)
          this.wsFirstTickLatenciesMs.push(firstTickLatency);
          if (this.wsFirstTickLatenciesMs.length > 100) {
            this.wsFirstTickLatenciesMs.shift();
          }
          
          // Remove tracking since we got the first tick
          clientTimes.delete(priceUpdate.symbol);
          if (clientTimes.size === 0) {
            this.clientSubscriptionTimes.delete(clientId);
          }
        }
      }
    });

    if (broadcastCount > 0) {
      this.wsUpdatesTotal++; // Track WebSocket updates
      this.logEvent('broadcast_summary', {
        symbol: priceUpdate.symbol,
        price: priceUpdate.price,
        client_count: broadcastCount,
        total_clients: this.clients.size,
        is_leader: this.isLeader,
        instance_id: this.instanceId
      });
    }
  }

  // Send message to specific client
  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (client && client.socket.readyState === WebSocket.OPEN) {
      try {
        client.socket.send(JSON.stringify(message));
      } catch (error) {
        console.error(`❌ Failed to send message to client ${clientId}:`, error);
        this.removeClient(clientId);
      }
    }
  }

  // Broadcast message to all clients
  private broadcastToAllClients(message: any): void {
    this.clients.forEach((client, clientId) => {
      this.sendToClient(clientId, message);
    });
  }

  // Send cached prices to new client
  private sendCachedPricesToClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const cachedPrices: TradermadePriceData[] = [];
    this.priceCache.forEach((priceData) => {
      // Only send non-expired prices
      if (this.isPriceFresh(priceData)) {
        cachedPrices.push(priceData);
      }
    });

    if (cachedPrices.length > 0) {
      this.sendToClient(clientId, {
        type: 'price_batch',
        items: cachedPrices,
        timestamp: Date.now(),
        source: 'cache'
      });
      console.log(`💾 Sent ${cachedPrices.length} cached prices to client ${clientId}`);
    }
  }

  // Start heartbeat for TraderMade connection
  private startHeartbeat(): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    
    this.heartbeatInterval = setInterval(() => {
      if (this.tradermadeSocket?.readyState === WebSocket.OPEN) {
        const now = Date.now();
        // Send ping every 15s
        if (now - this.lastPingTime >= 15000) {
          try {
            this.tradermadeSocket.send(JSON.stringify({ type: 'ping' }));
            this.lastPingTime = now;
          } catch (error) {
            console.error('❌ Heartbeat failed:', error);
          }
        }
        
        // Upstream idle watchdog: if no ticks for >12s, force reconnect
        const sinceTick = this.lastTickTime ? now - this.lastTickTime : Infinity;
        if (sinceTick > 12000) {
          console.warn(`⏱️ Upstream idle >12s (${sinceTick}ms). Forcing reconnect...`);
          this.upstreamIdleReconnects++;
          this.disconnectTradermade();
          if (this.clients.size > 0) {
            this.connectToTradermade();
          }
        }
      }
    }, 15000);
  }

  // Stop heartbeat
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Schedule reconnection
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return;

    this.reconnectAttempts++;
    const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts), 60000);
    
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (this.isLeader && this.clients.size > 0) {
        this.connectToTradermade();
      }
    }, delay);
  }

  // Disconnect from TraderMade
  private disconnectTradermade(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.idleDisconnectTimeout) {
      clearTimeout(this.idleDisconnectTimeout);
      this.idleDisconnectTimeout = null;
    }
    
    this.stopHeartbeat();
    
    if (this.tradermadeSocket) {
      this.tradermadeSocket.close();
      this.tradermadeSocket = null;
    }
    
    this.connectionStatus = 'disconnected';
    console.info('🔌❌ TraderMade connection closed');
  }

  // Utility methods
  private normalizeClientSymbol(input: string): string | null {
    const up = (input || '').toUpperCase().trim();
    if (!up) return null;
    const compact = up.replace(/[^A-Z0-9]/g, '');

    // Direct known symbols
    if (TRADERMADE_SYMBOLS.includes(up)) return up;

    // Indices synonyms
    if (compact.includes('US30') || compact.includes('USA30') || compact.includes('DOWJONES') || compact === 'DJI') {
      return 'USA30USD';
    }
    if (compact.includes('NAS100') || compact.includes('NASDAQ100') || compact.includes('NASDAQ')) {
      return 'NAS100USD';
    }

    // Passthrough common formats
    if (up === 'XAU/USD') return 'XAUUSD';
    if (up === 'EUR/USD') return 'EURUSD';
    if (up === 'BTC/USD') return 'BTCUSD';

    // Upstream codes typed by clients
    if (up === 'US30') return 'USA30USD';
    if (up === 'NAS100') return 'NAS100USD';

    return null;
  }

  // Authenticate client with JWT
  async authenticateClient(clientId: string, token: string): Promise<boolean> {
    const client = this.clients.get(clientId);
    if (!client) return false;

    // Idempotent: already authenticated
    if (client.isAuthenticated) {
      this.logEvent('auth_ok', { 
        client_id: clientId,
        ip_hash: client.ipHash,
        user_id: client.userId,
        note: 'already_authenticated'
      });
      return true;
    }

    try {
      // Verify JWT using Supabase
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        this.logEvent('auth_failed', { 
          client_id: clientId,
          ip_hash: client.ipHash,
          error: 'invalid_token'
        });
        this.sendAuthError(clientId, 'Invalid authentication token');
        return false;
      }

      // Clear auth timer
      if (client.authTimer) {
        clearTimeout(client.authTimer);
        client.authTimer = undefined;
      }

      // Update client state
      client.isAuthenticated = true;
      client.userId = user.id;

      this.logEvent('auth_ok', { 
        client_id: clientId,
        ip_hash: client.ipHash,
        user_id: user.id
      });

      // Send auth success
      this.sendToClient(clientId, {
        type: 'auth_success',
        message: 'Authentication successful'
      });

      // Cancel any pending idle disconnect
      if (this.idleDisconnectTimeout) {
        clearTimeout(this.idleDisconnectTimeout);
        this.idleDisconnectTimeout = null;
      }

      // Leader starts TraderMade connection if this is the first authenticated client
      const authenticatedClients = Array.from(this.clients.values()).filter(c => c.isAuthenticated);
      if (this.isLeader && authenticatedClients.length === 1 && this.connectionStatus === 'disconnected') {
        console.log('🚀 First authenticated client, starting TraderMade connection... (LEADER)');
        this.connectToTradermade();
      }

      // Send cached prices and connection status
      this.sendCachedPricesToClient(clientId);
      this.sendToClient(clientId, {
        type: 'connection_status',
        status: this.connectionStatus,
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      this.logEvent('auth_failed', { 
        client_id: clientId,
        ip_hash: client.ipHash,
        error: 'jwt_verification_error'
      });
      this.sendAuthError(clientId, 'Authentication failed');
      return false;
    }
  }

  // Handle client messages
  async handleClientMessage(clientId: string, message: any): Promise<void> {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      const data = JSON.parse(message);

      if (data.action === 'authenticate' && data.token) {
        await this.authenticateClient(clientId, data.token);
        return;
      }

      if (!client.isAuthenticated) {
        this.sendAuthError(clientId, 'Authentication required');
        return;
      }

      if (data.action === 'subscribe' && Array.isArray(data.symbols)) {
        this.subscribeClient(clientId, data.symbols);
      } else if (data.action === 'unsubscribe' && Array.isArray(data.symbols)) {
        this.unsubscribeClient(clientId, data.symbols);
      }
    } catch (error) {
      this.sendToClient(clientId, {
        type: 'error',
        message: 'Invalid message format'
      });
    }
  }

  // Send authentication error (never echo token)
  private sendAuthError(clientId: string, message: string): void {
    this.sendToClient(clientId, {
      type: 'auth_error',
      message
    });
  }

  // Get IP hash with precedence: cf-connecting-ip → x-forwarded-for[0] → x-real-ip → client_id
  private getIpHash(request: Request): string {
    const headers = request.headers;
    let ip = headers.get('cf-connecting-ip') || 
             headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             headers.get('x-real-ip') ||
             'unknown';
    
    if (ip === 'unknown') {
      return `fallback_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    // Create a simple hash (PII-safe)
    const encoder = new TextEncoder();
    const data = encoder.encode(ip + 'salt_imperial_trading');
    return Array.from(new Uint8Array(data.slice(0, 8)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  // Consistent logging with event names
  private logEvent(event: string, data: any): void {
    const sanitizedData = { ...data };
    // Never log tokens or sensitive data
    delete sanitizedData.token;
    delete sanitizedData.access_token;
    
    console.log(`📊 ${event}:`, JSON.stringify(sanitizedData));
  }

  // Get cached price with TTL check
  private getCachedPrice(symbol: string): TradermadePriceData | null {
    const cached = this.priceCache.get(symbol);
    if (!cached) return null;
    
    if (this.isPriceFresh(cached)) {
      return cached;
    } else {
      // Remove expired price
      this.priceCache.delete(symbol);
      return null;
    }
  }

  // Check if cached price is still fresh
  private isPriceFresh(priceData: TradermadePriceData): boolean {
    if (!priceData.cachedAt) return true; // Legacy prices without TTL
    return (Date.now() - priceData.cachedAt) < PRICE_CACHE_TTL_MS;
  }

  // Non-blocking warm-up of TraderMade connection
  private warmUpConnection(): void {
    if (this.isWarmingUp || this.connectionStatus !== 'disconnected' || !this.isLeader) return;
    
    this.isWarmingUp = true;
    console.log('🔥 Pre-warming TraderMade connection... (LEADER)');
    
    // Don't await - non-blocking
    this.connectToTradermade().finally(() => {
      this.isWarmingUp = false;
    });
  }

  // ===== REST API FALLBACK METHOD =====
  
  // Fetch price from TraderMade REST API with cooldown protection
  private async fetchPriceFromRestApi(symbol: string): Promise<TradermadePriceData | null> {
    if (this.isRestDisabled) {
      console.warn(`🚨 REST API disabled due to circuit breaker for ${symbol}`);
      return null;
    }

    // Check cooldown
    const cooldownRemaining = this.isSymbolInCooldown(symbol);
    if (cooldownRemaining > 0) {
      console.warn(`⏱️ ${symbol} in cooldown for ${cooldownRemaining}ms`);
      return null;
    }

    const apiKey = Deno.env.get('TRADERMADE_API_KEY');
    if (!apiKey) {
      console.error('❌ TRADERMADE_API_KEY not configured for REST fallback');
      return null;
    }

    try {
      console.log(`🔄 Fetching ${symbol} via REST API...`);
      this.lastRestFetchAt.set(symbol, Date.now());

      // Map client symbol to upstream symbol for REST API
      const upstreamSymbol = CLIENT_TO_UPSTREAM[symbol] || symbol;
      
      const response = await fetch(
        `https://marketdata.tradermade.com/api/v1/live?currency=${upstreamSymbol}&api_key=${apiKey}`,
        { 
          method: 'GET',
          headers: { 'User-Agent': 'Imperial-Trading-Platform/3.0' }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.quotes && data.quotes.length > 0) {
        const quote = data.quotes[0];
        const bid = parseFloat(quote.bid);
        const ask = parseFloat(quote.ask);
        const price = (bid + ask) / 2;

        if (isNaN(bid) || isNaN(ask) || price <= 0) {
          throw new Error(`Invalid price data: bid=${bid}, ask=${ask}`);
        }

        const now = Date.now();
        const priceData: TradermadePriceData = {
          symbol,
          price,
          bid,
          ask,
          timestamp: new Date().toISOString(),
          change: 0,
          changePercent: 0,
          cachedAt: now
        };

        this.updateCircuitBreaker(false); // Success
        this.httpUpdatesTotal++;
        
        console.log(`✅ REST API success: ${symbol} = $${price} (${quote.bid}/${quote.ask})`);
        return priceData;
      } else {
        throw new Error('No quotes in response');
      }
    } catch (error) {
      console.error(`❌ REST API error for ${symbol}:`, error);
      this.updateCircuitBreaker(true); // Error
      return null;
    }
  }

  // ===== GUARDRAILS METHODS =====

  // Check if symbol is within REST cooldown period
  private isSymbolInCooldown(symbol: string): number {
    const lastFetch = this.lastRestFetchAt.get(symbol);
    if (!lastFetch) return 0;
    
    const elapsed = Date.now() - lastFetch;
    const remaining = REST_COOLDOWN_MS - elapsed;
    return remaining > 0 ? remaining : 0;
  }

  // Update circuit breaker state based on REST errors
  private updateCircuitBreaker(isError: boolean): void {
    const now = Date.now();
    
    if (isError) {
      this.restErrorTimestamps.push(now);
    }
    
    // Clean old timestamps outside the window
    this.restErrorTimestamps = this.restErrorTimestamps.filter(
      timestamp => now - timestamp < CIRCUIT_BREAKER_WINDOW_MS
    );
    
    // Check if we should disable REST
    const shouldDisable = this.restErrorTimestamps.length >= CIRCUIT_BREAKER_ERRORS;
    if (shouldDisable && !this.isRestDisabled) {
      this.isRestDisabled = true;
      console.warn(`🚨 Circuit breaker activated: ${this.restErrorTimestamps.length} REST errors in ${CIRCUIT_BREAKER_WINDOW_MS/1000}s`);
    } else if (!shouldDisable && this.isRestDisabled) {
      this.isRestDisabled = false;
      console.info('✅ Circuit breaker reset: REST errors below threshold');
    }
  }

  // Enhanced POST handler with Redis cache consistency
  async handlePostRequest(req: Request): Promise<Response> {
    try {
      const body = await req.json();
      const { symbols: requestedSymbols, forceFetch } = body;
      
      // Symbol validation
      if (!Array.isArray(requestedSymbols)) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'symbols must be an array' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Symbol count cap
      if (requestedSymbols.length > MAX_SYMBOLS_PER_POST) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: `Maximum ${MAX_SYMBOLS_PER_POST} symbols allowed per request` 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Normalize and validate symbols
      const validSymbols: string[] = [];
      const invalidSymbols: string[] = [];
      
      requestedSymbols.forEach((sym: string) => {
        const normalized = this.normalizeClientSymbol(sym);
        if (normalized && TRADERMADE_SYMBOLS.includes(normalized)) {
          validSymbols.push(normalized);
        } else {
          invalidSymbols.push(sym);
        }
      });

      if (validSymbols.length === 0) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'No valid symbols provided',
          invalid_symbols: invalidSymbols
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Pre-warm connection if cold and no clients (leader only)
      if (this.isLeader) {
        const health = this.getHealthStatus();
        if (health.tradermadeStatus === 'disconnected' && health.connectedClients === 0) {
          this.warmUpConnection();
        }
      }

      // Get prices from both local cache and Redis cache for consistency
      const prices: Record<string, any> = {};
      
      for (const symbol of validSymbols) {
        let priceData = null;
        let servedFrom = 'local_cache';
        
        // Try local cache first
        const localCached = this.getCachedPrice(symbol);
        if (localCached && this.isPriceFresh(localCached)) {
          priceData = localCached;
          servedFrom = 'local_cache';
        } else if (this.redisPublisher) {
          // Fallback to Redis cache if local cache is stale/missing
          try {
            const redisCached = await this.redisPublisher.get(`price:${symbol}`);
            if (redisCached) {
              const parsedPrice = JSON.parse(redisCached);
              if (this.isPriceFresh(parsedPrice)) {
                priceData = parsedPrice;
                servedFrom = 'redis_cache';
                // Update local cache
                this.priceCache.set(symbol, parsedPrice);
              }
            }
          } catch (error) {
            console.warn(`⚠️ Failed to fetch ${symbol} from Redis cache:`, error);
          }
        }
        
        if (priceData) {
          prices[symbol] = {
            symbol: priceData.symbol,
            price: priceData.price,
            bid: priceData.bid,
            ask: priceData.ask,
            timestamp: priceData.timestamp,
            change: priceData.change,
            changePercent: priceData.changePercent,
            cachedAt: priceData.cachedAt,
            served_from: servedFrom,
            stale: !this.isPriceFresh(priceData)
          };
        } else if (body.forceFetch) {
          // If no cached data and forceFetch is true, try REST API (with cooldown)
          try {
            const restPrice = await this.fetchPriceFromRestApi(symbol);
            if (restPrice) {
              prices[symbol] = {
                symbol: restPrice.symbol,
                price: restPrice.price,
                bid: restPrice.bid,
                ask: restPrice.ask,
                timestamp: restPrice.timestamp,
                change: restPrice.change,
                changePercent: restPrice.changePercent,
                cachedAt: restPrice.cachedAt,
                served_from: 'rest_api_fallback',
                stale: false
              };
              // Cache the fresh data
              this.priceCache.set(symbol, restPrice);
              await this.publishPriceToRedis(restPrice);
            } else {
              prices[symbol] = {
                served_from: 'not_available',
                stale: true
              };
            }
          } catch (error) {
            console.warn(`⚠️ REST fallback failed for ${symbol}:`, error);
            prices[symbol] = {
              served_from: 'not_available',
              stale: true
            };
          }
        } else {
          // No price available
          prices[symbol] = {
            served_from: 'not_available',
            stale: true
          };
        }
      }

      return new Response(JSON.stringify({
        success: true,
        prices,
        dataSource: 'redis_distributed_cache',
        timestamp: new Date().toISOString(),
        invalid_symbols: invalidSymbols.length > 0 ? invalidSymbols : undefined,
        is_leader: this.isLeader,
        instance_id: this.instanceId
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
      
    } catch (error) {
      console.error('❌ POST request error:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }

  // Get health status for diagnostics
  getHealthStatus(): any {
    const authenticatedClients = Array.from(this.clients.values()).filter(c => c.isAuthenticated);
    const totalSubscriptions = Array.from(this.clients.values())
      .reduce((sum, client) => sum + client.subscriptions.size, 0);

    // Calculate WS vs HTTP ratio
    const totalUpdates = this.wsUpdatesTotal + this.httpUpdatesTotal;
    const wsVsHttpRatio = totalUpdates > 0 ? (this.wsUpdatesTotal / totalUpdates) * 100 : 0;

    // Calculate percentiles for WebSocket first tick latencies
    const sortedLatencies = [...this.wsFirstTickLatenciesMs].sort((a, b) => a - b);
    const p50 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.5)] : null;
    const p95 = sortedLatencies.length > 0 ? sortedLatencies[Math.floor(sortedLatencies.length * 0.95)] : null;

    return {
      // Original health metrics
      tradermadeStatus: this.connectionStatus,
      connectedClients: this.clients.size,
      authenticatedClients: authenticatedClients.length,
      totalSubscriptions,
      cachedPrices: this.priceCache.size,
      lastTickTime: this.lastTickTime,
      timeSinceLastTick: this.lastTickTime ? Date.now() - this.lastTickTime : null,
      upstreamConnected: this.tradermadeSocket?.readyState === WebSocket.OPEN,
      reconnectAttempts: this.reconnectAttempts,
      isWarmingUp: this.isWarmingUp,
      
      // Redis and leader election status
      redis: {
        is_leader: this.isLeader,
        instance_id: this.instanceId,
        publisher_connected: !!this.redisPublisher,
        subscriber_connected: !!this.redisSubscriber,
      },
      
      // Metrics
      metrics: {
        fallback_http_total: this.fallbackHttpTotal,
        fallback_force_fetch_total: this.fallbackForceFetchTotal,
        ws_updates_total: this.wsUpdatesTotal,
        http_updates_total: this.httpUpdatesTotal,
        ws_vs_http_ratio_percent: Math.round(wsVsHttpRatio * 100) / 100,
        ws_first_tick_latency_p50_ms: p50,
        ws_first_tick_latency_p95_ms: p95,
        latency_samples: sortedLatencies.length,
        upstream_idle_reconnects: this.upstreamIdleReconnects
      },
      
      // Guardrails status
      guardrails: {
        rest_disabled: this.isRestDisabled,
        circuit_breaker_errors: this.restErrorTimestamps.length,
        circuit_breaker_window_ms: CIRCUIT_BREAKER_WINDOW_MS,
        rest_cooldown_ms: REST_COOLDOWN_MS,
        max_symbols_per_post: MAX_SYMBOLS_PER_POST,
        active_cooldowns: this.lastRestFetchAt.size
      },
      
      timestamp: Date.now()
    };
  }
}

// ========== EDGE FUNCTION HANDLER ==========
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET requests for health status
  if (req.method === 'GET') {
    const manager = TradermadeConnectionManager.getInstance();
    const health = manager.getHealthStatus();
    
    return new Response(JSON.stringify({
      success: true,
      health,
      service: 'tradermade-streaming',
      version: '3.0.0-redis-pubsub'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Handle HTTP POST requests for direct price fetching
  if (req.method === 'POST') {
    const manager = TradermadeConnectionManager.getInstance();
    return await manager.handlePostRequest(req);
  }

  // Handle WebSocket connections
  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const manager = TradermadeConnectionManager.getInstance();
  const clientId = crypto.randomUUID();

  socket.onopen = () => {
    manager.addClient(clientId, socket, req);
  };

  socket.onmessage = async (event) => {
    await manager.handleClientMessage(clientId, event.data);
  };

  socket.onclose = () => {
    manager.removeClient(clientId);
  };

  socket.onerror = (error) => {
    console.error(`❌ Client ${clientId} WebSocket error:`, error);
    manager.removeClient(clientId);
  };

  return response;
});
