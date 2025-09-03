import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Redis } from "https://esm.sh/@upstash/redis";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Configuration constants
const WS_AUTH_TIMEOUT_MS = parseInt(Deno.env.get('WS_AUTH_TIMEOUT_MS') || '30000'); // 30 seconds
const MAX_WS_SUBS_PER_CLIENT = parseInt(Deno.env.get('MAX_WS_SUBS_PER_CLIENT') || '20'); // Max subscriptions per client
const IDLE_DISCONNECT_DELAY_MS = parseInt(Deno.env.get('IDLE_DISCONNECT_DELAY_MS') || '600000'); // 10 minutes
const PRICE_CACHE_TTL_MS = parseInt(Deno.env.get('PRICE_CACHE_TTL_MS') || '45000'); // 45 seconds

// Redis pub/sub constants
const REDIS_PRICE_CHANNEL = 'tradermade:price_updates';
const LEADER_LOCK_KEY = 'tradermade:leader:lock';
const LEADER_LOCK_TTL = 60; // 60 seconds (increased for stability)
const LEADER_HEARTBEAT_INTERVAL = 5000; // 5 seconds (critical: faster heartbeat)

// New guardrail constants
const FORCEFETCH_INTERNAL_KEY = Deno.env.get('FORCEFETCH_INTERNAL_KEY') || 'imperial-internal-2024';
const REST_COOLDOWN_MS = parseInt(Deno.env.get('REST_COOLDOWN_MS') || '10000'); // 10 seconds per symbol
const MAX_SYMBOLS_PER_POST = parseInt(Deno.env.get('MAX_SYMBOLS_PER_POST') || '5'); // Symbol cap
const CIRCUIT_BREAKER_ERRORS = parseInt(Deno.env.get('CIRCUIT_BREAKER_ERRORS') || '3'); // Errors before disable
const CIRCUIT_BREAKER_WINDOW_MS = parseInt(Deno.env.get('CIRCUIT_BREAKER_WINDOW_MS') || '60000'); // 1 minute window

// Supabase clients
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
const supabaseService = createClient(supabaseUrl!, supabaseServiceKey!);

console.log('🔐 SUPABASE_SERVICE_ROLE_KEY configured:', !!supabaseServiceKey && supabaseServiceKey.length > 50);

// Redis client setup
const UPSTASH_REDIS_REST_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
const UPSTASH_REDIS_REST_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

// Tradermade symbol configuration - ONLY tradermade-streaming connects to TraderMade
const TRADERMADE_SYMBOLS = ['XAUUSD', 'BTCUSD'];

// Client-side symbol allowlist for cost optimization
const ALLOWED_CLIENT_SYMBOLS = new Set(['XAUUSD', 'BTCUSD']);

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
  lastPingAt: number;
  lastActivity: number;
}

interface WebSocketClientManager {
  connections: Map<string, ClientConnection>;
  addConnection: (connection: ClientConnection) => void;
  removeConnection: (id: string) => void;
  broadcastToSubscribers: (symbol: string, priceData: TradermadePriceData) => void;
  getConnectionCount: () => number;
  getSubscriberCount: (symbol: string) => number;
}

// ========== ENHANCED CONNECTION MANAGER WITH STABILIZED LEADERSHIP ==========
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

  // Redis pub/sub integration with enhanced leadership stability
  private redisPublisher: any = null;
  private redisSubscriber: any = null;
  private isLeader = false;
  private leaderHeartbeatInterval: number | null = null;
  private instanceId: string;
  
  // Leadership stability enhancements
  private leaderElectionInProgress = false;
  private redisDegradedMode = false;
  private leaderConflictCount = 0;
  private leaderFlips: number[] = [];
  private publishErrors: number[] = [];
  
  // Always-on Realtime broadcasting (kept as fallback)
  private realtimeChannel: any = null;
  private realtimeChannelInitialized = false;
  private realtimeChannelSubscribed = false;
  private alwaysOnConnection = true;

  // Enhanced WebSocket client management
  private wsClients: Map<string, ClientConnection> = new Map();
  private wsConnectionCount = 0;
  private wsMessagesSent = 0;
  private wsLastBroadcastAt = 0;
  private batchedUpdates: Map<string, TradermadePriceData> = new Map();
  private batchTimeout: number | null = null;
  private readonly BATCH_INTERVAL_MS = 50; // 50ms batching
  
  // Light throttling and error guarding
  private lastSentMid: Map<string, number> = new Map();
  private lastSentAtMs: Map<string, number> = new Map();
  private duplicateDropCount = 0;
  private broadcastErrorTimestamps: number[] = [];
  private safeModeUntilMs = 0;

  // Enhanced diagnostics and observability
  private lastRestFetchAt: Map<string, number> = new Map();
  private restErrorTimestamps: number[] = [];
  private isRestDisabled = false;
  private fallbackHttpTotal = 0;
  private fallbackForceFetchTotal = 0;
  private wsFirstTickLatenciesMs: number[] = [];
  private wsUpdatesTotal = 0;
  private httpUpdatesTotal = 0;
  private upstreamIdleReconnects = 0;
  private realtimeBroadcastsTotal = 0;
  private clientSubscriptionTimes: Map<string, Map<string, number>> = new Map();

  // Enhanced connection diagnostics
  private lastUpstreamCloseCode: number | null = null;
  private lastUpstreamCloseReason: string | null = null;
  private lastUpstreamErrorMessage: string | null = null;
  private lastConnectivityProbeAt: number = 0;
  private lastConnectivityProbeError: string | null = null;
  private connectGuardReason: string | null = null;

  // Per-symbol tick tracking with 60-second windows (capped arrays)
  private symbolTickTimes: Map<string, number[]> = new Map();
  private symbolLatencies: Map<string, number[]> = new Map();

  // Rate limiting for health endpoint (in-memory fallback)
  private healthRateLimitMap: Map<string, number[]> = new Map();
  private configurableSymbols: string[];

  private constructor() {
    this.instanceId = crypto.randomUUID();
    
    // Make health snapshot symbol list configurable
    const healthSymbolsEnv = Deno.env.get('HEALTH_SNAPSHOT_SYMBOLS');
    this.configurableSymbols = healthSymbolsEnv 
      ? healthSymbolsEnv.split(',').map(s => s.trim())
      : ['XAUUSD', 'BTCUSD'];
      
    this.initializeAlwaysOnService();
  }

  static getInstance(): TradermadeConnectionManager {
    if (!TradermadeConnectionManager.instance) {
      TradermadeConnectionManager.instance = new TradermadeConnectionManager();
    }
    return TradermadeConnectionManager.instance;
  }

  // Initialize always-on service (Redis + Realtime + TraderMade)
  private async initializeAlwaysOnService(): Promise<void> {
    console.log('🚀 Initializing always-on TraderMade service...');
    
    // Setup Realtime channel for broadcasting
    this.setupRealtimeChannel();
    
    // Initialize Redis connections with degraded mode fallback
    await this.initializeRedis();
    
    // Start connectivity probe
    this.startConnectivityProbe();
    
    // Start leader election (unless in degraded mode)
    if (!this.redisDegradedMode) {
      this.startLeaderElection();
    }
    
    // Always-on: connect to TraderMade immediately if leader (no client-count gate)
    console.log('🎯 Always-on mode: Connecting to TraderMade immediately');
    if (this.isLeader) {
      this.connectToTradermade();
    }
    
    console.log('✅ Always-on service initialized');
  }

  // DNS/TLS-only connectivity probe (no API calls)
  private async probeConnectivity(): Promise<void> {
    try {
      this.lastConnectivityProbeAt = Date.now();
      this.lastConnectivityProbeError = null;
      this.connectGuardReason = null;

      // Check if API key is configured
      const traderMadeKeyConfigured = !!Deno.env.get('TRADERMADE_API_KEY');
      if (!traderMadeKeyConfigured) {
        this.connectGuardReason = 'missing_api_key';
        return;
      }

      // DNS resolution test
      try {
        await Deno.resolveDns('marketdata.tradermade.com', 'A');
      } catch (error) {
        this.connectGuardReason = 'dns_failed';
        this.lastConnectivityProbeError = `DNS: ${error.message}`;
        return;
      }

      // TLS connectivity test
      try {
        const conn = await Deno.connectTls({ 
          hostname: 'marketdata.tradermade.com', 
          port: 443 
        });
        conn.close();
      } catch (error) {
        this.connectGuardReason = 'tls_failed';
        this.lastConnectivityProbeError = `TLS: ${error.message}`;
        return;
      }

      // All checks passed
      this.connectGuardReason = null;
      
    } catch (error) {
      this.lastConnectivityProbeError = `Probe: ${error.message}`;
      this.connectGuardReason = 'probe_failed';
    }
  }

  // Start connectivity probe (runs every 60s)
  private startConnectivityProbe(): void {
    // Initial probe
    this.probeConnectivity();
    
    // Periodic probe
    setInterval(() => {
      this.probeConnectivity();
    }, 60000); // 60 seconds
  }

  // Setup Realtime channel for price broadcasting (idempotent)
  private setupRealtimeChannel(): void {
    if (this.realtimeChannelInitialized) {
      return; // Already initialized
    }

    try {
      if (supabaseServiceKey && supabaseServiceKey.length > 50) {
        this.realtimeChannel = supabaseService.channel('prices:live');
        
        // Subscribe to ensure readiness
        this.realtimeChannel.subscribe((status: string) => {
          console.log('📡 Realtime channel status:', status);
          if (status === 'SUBSCRIBED') {
            this.realtimeChannelSubscribed = true;
            console.log('✅ Realtime channel SUBSCRIBED');
          }
        });
        
        this.realtimeChannelInitialized = true;
        console.log('📡 Realtime channel setup for price broadcasting');
      } else {
        console.error('❌ SUPABASE_SERVICE_ROLE_KEY not properly configured for Realtime');
      }
    } catch (error) {
      console.error('❌ Failed to setup Realtime channel:', error);
    }
  }

  // Enhanced broadcasting: WebSocket clients first, Realtime as fallback
  private async broadcastPriceUpdate(priceData: TradermadePriceData): Promise<void> {
    // Primary: Direct WebSocket broadcasting with server-side filtering
    await this.broadcastToWebSocketClients(priceData);
    
    // Fallback: Realtime broadcasting (for legacy clients)
    await this.broadcastPriceToRealtime(priceData);
  }

  // Direct WebSocket broadcasting with server-side filtering
  private async broadcastToWebSocketClients(priceData: TradermadePriceData): Promise<void> {
    if (this.wsClients.size === 0) return;

    const symbol = priceData.symbol;
    const now = Date.now();

    // Add to batch for subscribers
    this.batchedUpdates.set(symbol, priceData);

    // Immediate send for real-time critical updates or batch timeout
    if (!this.batchTimeout) {
      this.batchTimeout = setTimeout(() => {
        this.flushBatchedUpdates();
      }, this.BATCH_INTERVAL_MS);
    }
  }

  // Flush batched updates to WebSocket clients
  private flushBatchedUpdates(): void {
    if (this.batchedUpdates.size === 0) return;

    const updates = Array.from(this.batchedUpdates.entries());
    this.batchedUpdates.clear();
    this.batchTimeout = null;

    // Send batched updates to each client based on their subscriptions
    for (const [clientId, client] of this.wsClients) {
      if (client.socket.readyState !== WebSocket.OPEN) {
        this.removeWebSocketClient(clientId);
        continue;
      }

      const clientUpdates: TradermadePriceData[] = [];
      
      for (const [symbol, priceData] of updates) {
        if (client.subscriptions.has(symbol)) {
          clientUpdates.push(priceData);
        }
      }

      if (clientUpdates.length > 0) {
        try {
          client.socket.send(JSON.stringify({
            type: 'price_batch',
            updates: clientUpdates.map(data => ({
              symbol: data.symbol,
              bid: data.bid,
              ask: data.ask,
              mid: data.bid && data.ask ? (data.bid + data.ask) / 2 : data.price,
              timestamp: data.timestamp,
              change: data.change,
              changePercent: data.changePercent
            })),
            timestamp: new Date().toISOString()
          }));

          client.lastActivity = Date.now();
          this.wsMessagesSent++;
        } catch (error) {
          console.error(`❌ Failed to send to WebSocket client ${clientId}:`, error);
          this.removeWebSocketClient(clientId);
        }
      }
    }

    this.wsLastBroadcastAt = Date.now();
  }

  // Add WebSocket client
  private addWebSocketClient(connection: ClientConnection): void {
    this.wsClients.set(connection.id, connection);
    this.wsConnectionCount++;
    console.log(`📱 WebSocket client connected: ${connection.id} (total: ${this.wsClients.size})`);
  }

  // Remove WebSocket client
  private removeWebSocketClient(clientId: string): void {
    const client = this.wsClients.get(clientId);
    if (client) {
      try {
        if (client.socket.readyState === WebSocket.OPEN) {
          client.socket.close();
        }
      } catch (error) {
        console.warn(`Warning closing WebSocket for ${clientId}:`, error);
      }
      
      this.wsClients.delete(clientId);
      console.log(`📱 WebSocket client disconnected: ${clientId} (total: ${this.wsClients.size})`);
    }
  }

  // Handle WebSocket client authentication
  private async authenticateWebSocketClient(client: ClientConnection, token: string): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      
      if (error || !user) {
        console.warn(`❌ WebSocket auth failed for ${client.id}: ${error?.message}`);
        return false;
      }

      client.userId = user.id;
      client.isAuthenticated = true;
      console.log(`✅ WebSocket client authenticated: ${client.id} (user: ${user.id})`);
      return true;
    } catch (error) {
      console.error(`❌ WebSocket authentication error for ${client.id}:`, error);
      return false;
    }
  }

  // Handle WebSocket client subscription
  private handleWebSocketSubscription(client: ClientConnection, symbols: string[]): void {
    // Validate and normalize symbols
    const validSymbols = symbols
      .map(s => s.toUpperCase().trim())
      .filter(s => ALLOWED_CLIENT_SYMBOLS.has(s))
      .slice(0, MAX_WS_SUBS_PER_CLIENT);

    // Update client subscriptions
    client.subscriptions.clear();
    validSymbols.forEach(symbol => client.subscriptions.add(symbol));

    console.log(`📋 Client ${client.id} subscribed to: [${Array.from(client.subscriptions).join(', ')}]`);

    // Send current prices for subscribed symbols
    const currentPrices: TradermadePriceData[] = [];
    for (const symbol of client.subscriptions) {
      const cached = this.priceCache.get(symbol);
      if (cached) {
        currentPrices.push(cached);
      }
    }

    if (currentPrices.length > 0) {
      try {
        client.socket.send(JSON.stringify({
          type: 'price_snapshot',
          prices: currentPrices.map(data => ({
            symbol: data.symbol,
            bid: data.bid,
            ask: data.ask,
            mid: data.bid && data.ask ? (data.bid + data.ask) / 2 : data.price,
            timestamp: data.timestamp,
            change: data.change,
            changePercent: data.changePercent
          })),
          timestamp: new Date().toISOString()
        }));
      } catch (error) {
        console.error(`❌ Failed to send snapshot to ${client.id}:`, error);
      }
    }
  }

  // Legacy Realtime broadcasting (kept as fallback)
  private async broadcastPriceToRealtime(priceData: TradermadePriceData): Promise<void> {
    if (!this.realtimeChannel || !supabaseServiceKey) return;

    try {
      // Compute mid server-side
      const mid = priceData.bid && priceData.ask ? (priceData.bid + priceData.ask) / 2 : priceData.price;
      const roundedMid = Math.round(mid * 1000000) / 1000000; // Round to 6 decimals for comparison
      
      const now = Date.now();
      const symbol = priceData.symbol;
      
      // DEFENSIVE FILTER: Only broadcast allowed symbols to Realtime
      if (!ALLOWED_CLIENT_SYMBOLS.has(symbol)) {
        return;
      }
      
      // Light throttling: drop identical consecutive ticks
      const lastMid = this.lastSentMid.get(symbol);
      if (lastMid && Math.abs(roundedMid - lastMid) < 0.000001) {
        this.duplicateDropCount++;
        return;
      }
      
      // Safe mode: enforce minimum interval if errors are spiking
      const isSafeMode = now < this.safeModeUntilMs;
      if (isSafeMode) {
        const lastSent = this.lastSentAtMs.get(symbol) || 0;
        if (now - lastSent < 100) { // 100ms min interval in safe mode
          return;
        }
      }
      
      // Broadcast minimal payload with only client-used fields
      await this.realtimeChannel.send({
        type: 'broadcast',
        event: 'price_update',
        payload: {
          symbol: priceData.symbol,
          bid: priceData.bid,
          ask: priceData.ask,
          mid: roundedMid,
          timestamp: priceData.timestamp
        }
      });
      
      // Update tracking
      this.lastSentMid.set(symbol, roundedMid);
      this.lastSentAtMs.set(symbol, now);
      this.realtimeBroadcastsTotal++;
      
    } catch (error) {
      // Track broadcast errors in sliding window
      const now = Date.now();
      this.broadcastErrorTimestamps.push(now);
      
      // Keep only errors from last 5 seconds
      this.broadcastErrorTimestamps = this.broadcastErrorTimestamps.filter(ts => now - ts < 5000);
      
      // Enable safe mode if > 5 errors in 5 seconds
      if (this.broadcastErrorTimestamps.length > 5) {
        this.safeModeUntilMs = now + 10000; // 10 seconds of safe mode
        console.warn('⚠️ Broadcast safe mode enabled due to error spike');
      }
      
      console.error('❌ Failed to broadcast price to Realtime:', error);
    }
  }

  // Initialize Redis connections with degraded mode fallback
  private async initializeRedis(): Promise<void> {
    try {
      if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
        console.error('❌ Upstash Redis REST credentials not configured');
        this.enableRedisDegradedMode();
        return;
      }

      console.log('🔌 Initializing Upstash Redis REST client...');
      
      // Initialize Upstash Redis client
      this.redisPublisher = new Redis({
        url: UPSTASH_REDIS_REST_URL,
        token: UPSTASH_REDIS_REST_TOKEN,
      });

      // Use same client for subscriber (REST API doesn't need separate connections)
      this.redisSubscriber = this.redisPublisher;
      
      // Test connection with a simple ping
      await this.redisPublisher.ping();
      console.log('✅ Upstash Redis REST client connected and tested');

      console.log('✅ Redis connections established successfully');
      
      // Subscribe to price updates channel (for non-leader instances)
      await this.subscribeToRedisChannel();
      
    } catch (error) {
      console.error('❌ Upstash Redis initialization failed:', error);
      console.error('❌ Entering degraded mode');
      this.enableRedisDegradedMode();
    }
  }

  // Enable degraded single-instance mode
  private enableRedisDegradedMode(): void {
    console.warn('⚠️ Entering Redis degraded mode - single instance operation');
    this.redisDegradedMode = true;
    this.isLeader = true;
    console.log('👑 Assumed leadership in degraded mode');
  }

  // Enhanced leader election with conflict guard
  private async startLeaderElection(): Promise<void> {
    if (this.leaderElectionInProgress) {
      console.log('🗳️ Leader election already in progress, skipping');
      return;
    }

    if (this.redisDegradedMode) {
      console.log('🗳️ Skipping leader election (degraded mode)');
      return;
    }

    if (!this.redisPublisher) {
      console.warn('⚠️ No Redis publisher available, entering degraded mode');
      this.enableRedisDegradedMode();
      this.connectToTradermade();
      return;
    }

    this.leaderElectionInProgress = true;

    try {
      console.log(`🗳️ Starting leader election for instance ${this.instanceId}`);
      
      // Try to acquire leadership lock
      const result = await this.redisPublisher.set(
        LEADER_LOCK_KEY, 
        this.instanceId,
        { ex: LEADER_LOCK_TTL, nx: true }
      );

      if (result === 'OK') {
        console.log(`👑 Became TraderMade connection leader (instance: ${this.instanceId})`);
        this.isLeader = true;
        this.leaderConflictCount = 0;
        
        // Always-on mode: Connect to TraderMade immediately (no client-count gate)
        console.log('🎯 Always-on mode: Connecting to TraderMade immediately');
        this.connectToTradermade();
        
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
      
      // If Redis is unavailable, enter degraded mode
      if (error.message?.includes('connection') || error.message?.includes('timeout')) {
        console.warn('⚠️ Redis unavailable during leader election, entering degraded mode');
        this.enableRedisDegradedMode();
        this.connectToTradermade();
      } else {
        // Retry after delay for other errors
        setTimeout(() => this.startLeaderElection(), 5000);
      }
    } finally {
      this.leaderElectionInProgress = false;
    }
  }

  // Enhanced leadership heartbeat with conflict detection
  private startLeaderHeartbeat(): void {
    if (this.leaderHeartbeatInterval) {
      clearInterval(this.leaderHeartbeatInterval);
    }

    this.leaderHeartbeatInterval = setInterval(async () => {
      if (!this.isLeader || !this.redisPublisher || this.redisDegradedMode) return;

      try {
        // Check current leader
        const currentLeader = await this.redisPublisher.get(LEADER_LOCK_KEY);
        if (currentLeader === this.instanceId) {
          // Successfully renew lock
          await this.redisPublisher.expire(LEADER_LOCK_KEY, LEADER_LOCK_TTL);
          
          // Publish heartbeat to Redis for monitoring
          await this.redisPublisher.set(
            `leader:heartbeat:${this.instanceId}`,
            JSON.stringify({
              timestamp: Date.now(),
              connectedClients: this.clients.size,
              authenticatedClients: Array.from(this.clients.values()).filter(c => c.isAuthenticated).length,
              tradermadeStatus: this.connectionStatus,
              pricesCached: this.priceCache.size
            }),
            { ex: 60 } // 60 second TTL for heartbeat
          );
          
          // Publish leader snapshot for follower health queries  
          await this.publishLeaderSnapshot();
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`💓 Leader heartbeat sent (clients: ${this.clients.size}, cached prices: ${this.priceCache.size})`);
          }
        } else {
          console.warn(`⚠️ Lost leadership, stepping down (current leader: ${currentLeader || 'none'})`);
          this.trackLeaderFlip();
          this.isLeader = false;
          this.disconnectTradermadeOnStepDown(); // Explicit close with stepping_down reason
          clearInterval(this.leaderHeartbeatInterval);
          this.leaderHeartbeatInterval = null;
          
          // Increment conflict counter
          this.leaderConflictCount++;
          
          // Try to become leader again if there's no leader
          if (!currentLeader) {
            setTimeout(() => this.startLeaderElection(), 2000 + (this.leaderConflictCount * 1000)); // Backoff on conflicts
          }
        }
      } catch (error) {
        console.error('❌ Leader heartbeat failed:', error);
        
        // On heartbeat failure, step down and retry leader election
        this.trackLeaderFlip();
        this.isLeader = false;
        this.disconnectTradermadeOnStepDown(); // Explicit close with stepping_down reason
        clearInterval(this.leaderHeartbeatInterval);
        this.leaderHeartbeatInterval = null;
        setTimeout(() => this.startLeaderElection(), 5000);
      }
    }, LEADER_HEARTBEAT_INTERVAL);
  }

  // Track leader flips for alerting
  private trackLeaderFlip(): void {
    const now = Date.now();
    this.leaderFlips.push(now);
    
    // Keep only flips from last 10 minutes
    this.leaderFlips = this.leaderFlips.filter(ts => now - ts < 600000);
  }

  // Track publish errors for alerting
  private trackPublishError(): void {
    const now = Date.now();
    this.publishErrors.push(now);
    
    // Keep only errors from last 5 seconds
    this.publishErrors = this.publishErrors.filter(ts => now - ts < 5000);
  }

  // Rate limiting for health endpoint (Redis INCR/EXPIRE with in-memory fallback)
  private async checkHealthRateLimit(ip: string): Promise<boolean> {
    if (ip === 'unknown') {
      return true; // Skip rate limiting for unknown IPs to avoid shared client 429s
    }

    const key = `health_rl:${ip}`;
    const now = Date.now();
    const windowStart = Math.floor(now / 2000) * 2000; // 2-second window
    
    try {
      if (this.redisPublisher && !this.redisDegradedMode) {
        // Redis-based rate limiting with INCR/EXPIRE
        const count = await this.redisPublisher.incr(key);
        if (count === 1) {
          await this.redisPublisher.expire(key, 2); // 2-second window
        }
        return count <= 10; // Max 10 requests per 2 seconds per IP
      }
    } catch (error) {
      console.warn('❌ Redis rate limit check failed, using in-memory fallback:', error);
    }

    // In-memory fallback
    const timestamps = this.healthRateLimitMap.get(ip) || [];
    const validTimestamps = timestamps.filter(ts => now - ts < 2000);
    
    if (validTimestamps.length >= 10) {
      return false; // Rate limited
    }
    
    validTimestamps.push(now);
    this.healthRateLimitMap.set(ip, validTimestamps);
    
    // Cleanup old entries periodically
    if (Math.random() < 0.1) { // 10% chance to cleanup
      this.cleanupRateLimitMap();
    }
    
    return true;
  }

  // Clean up old rate limit entries
  private cleanupRateLimitMap(): void {
    const now = Date.now();
    for (const [ip, timestamps] of this.healthRateLimitMap.entries()) {
      const validTimestamps = timestamps.filter(ts => now - ts < 2000);
      if (validTimestamps.length === 0) {
        this.healthRateLimitMap.delete(ip);
      } else {
        this.healthRateLimitMap.set(ip, validTimestamps);
      }
    }
  }

  // Get trusted IP with precedence: CF-Connecting-IP → X-Forwarded-For[0] → X-Real-IP → unknown
  private getTrustedIp(request: Request): string {
    const headers = request.headers;
    
    // Prefer Cloudflare's trusted header first
    const cfIp = headers.get('cf-connecting-ip');
    if (cfIp) return cfIp.trim();
    
    // Then X-Forwarded-For (first IP only)
    const xffHeader = headers.get('x-forwarded-for');
    if (xffHeader) {
      const firstIp = xffHeader.split(',')[0]?.trim();
      if (firstIp) return firstIp;
    }
    
    // Then X-Real-IP
    const realIp = headers.get('x-real-ip');
    if (realIp) return realIp.trim();
    
    return 'unknown';
  }

  // Publish leader health snapshot to Redis (trimmed)
  private async publishLeaderSnapshot(): Promise<void> {
    if (!this.isLeader || !this.redisPublisher || this.redisDegradedMode) return;
    
    try {
      const now = Date.now();
      const authenticatedClients = Array.from(this.clients.values()).filter(c => c.isAuthenticated);
      
      // Calculate per-symbol metrics for configurable symbols
      const symbolMetrics: any = {};
      for (const symbol of this.configurableSymbols) {
        const tickTimes = this.symbolTickTimes.get(symbol) || [];
        const lastBroadcast = this.lastSentAtMs.get(symbol);
        
        symbolMetrics[symbol] = {
          ticks_per_sec: tickTimes.length > 0 ? Math.round((tickTimes.length / 60) * 100) / 100 : 0,
          cache_freshness_ms: lastBroadcast ? now - lastBroadcast : null,
          last_broadcast_ts: lastBroadcast
        };
      }
      
      const snapshot = {
        timestamp: now,
        leader_instance_id: this.instanceId,
        is_leader: true,
        tradermade_status: this.connectionStatus,
        connected_clients: this.clients.size,
        authenticated_clients: authenticatedClients.length,
        cached_prices: this.priceCache.size,
        last_tick_time: this.lastTickTime,
        time_since_last_tick: this.lastTickTime ? now - this.lastTickTime : null,
        upstream_connected: this.tradermadeSocket?.readyState === WebSocket.OPEN,
        redis_degraded_mode: this.redisDegradedMode,
        symbol_metrics: symbolMetrics,
        ws_updates_total: this.wsUpdatesTotal,
        realtime_broadcasts_total: this.realtimeBroadcastsTotal,
        alerting_thresholds: {
          time_since_last_tick_exceeded: this.lastTickTime ? (now - this.lastTickTime) > 15000 : true,
          leader_flips_last_10m: this.leaderFlips.length,
          publish_errors_last_5s: this.publishErrors.length
        }
      };
      
      await this.redisPublisher.set(
        'tradermade:health:latest',
        JSON.stringify(snapshot),
        { ex: 20 } // 20 second TTL as specified
      );
      
    } catch (error) {
      console.warn('❌ Failed to publish leader snapshot to Redis:', error);
    }
  }
  private async checkLeaderStatus(): Promise<void> {
    if (this.leaderElectionInProgress || this.redisDegradedMode) return;

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

  // Subscribe to Redis price updates (REST API uses polling instead of pub/sub)
  private async subscribeToRedisChannel(): Promise<void> {
    if (this.isLeader) return; // Leaders don't need to poll, they generate the data
    
    try {
      // For Upstash REST API, we'll use polling instead of pub/sub
      console.log('📡 Setting up Redis polling mechanism (REST API compatible)');
      
      // Poll for price updates every 500ms for non-leader instances
      setInterval(async () => {
        if (this.isLeader) return; // Stop polling if we become leader
        
        try {
          // Get all price keys from Redis
          const symbols = ['XAUUSD', 'BTCUSD']; // Add other symbols as needed
          
          for (const symbol of symbols) {
            const cacheKey = `price:${symbol}`;
            const cachedPrice = await this.redisSubscriber.get(cacheKey);
            
            if (cachedPrice) {
              try {
                const priceUpdate: TradermadePriceData = JSON.parse(cachedPrice);
                // Only update if this is newer than our cached version
                const existingPrice = this.priceCache.get(symbol);
                if (!existingPrice || new Date(priceUpdate.timestamp).getTime() > new Date(existingPrice.timestamp).getTime()) {
                  this.priceCache.set(symbol, priceUpdate);
                  this.broadcastPriceUpdate(priceUpdate);
                }
              } catch (parseError) {
                console.error(`❌ Error parsing cached price for ${symbol}:`, parseError);
              }
            }
          }
        } catch (pollError) {
          // Don't log every polling error, just occasional ones
          if (Math.random() < 0.01) { // 1% chance to log
            console.warn('⚠️ Redis polling error:', pollError);
          }
        }
      }, 500); // Poll every 500ms
      
      console.log('📡 Redis polling mechanism started');
    } catch (error) {
      console.error('❌ Failed to setup Redis polling:', error);
    }
  }

  // Enhanced price publishing to Redis with consistency checks (leader only)
  private async publishPriceToRedis(priceUpdate: TradermadePriceData): Promise<void> {
    if (!this.isLeader || !this.redisPublisher) return;

    try {
      // Store in Redis cache with TTL for other instances to pick up
      const cacheKey = `price:${priceUpdate.symbol}`;
      await this.redisPublisher.set(
        cacheKey,
        JSON.stringify(priceUpdate),
        { ex: Math.floor(PRICE_CACHE_TTL_MS / 1000) } // Convert to seconds
      );
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`📤 Published ${priceUpdate.symbol} = $${priceUpdate.price} to Redis cache`);
      }
    } catch (error) {
      this.trackPublishError();
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

      // NOTE: Always-on mode - no idle disconnects, leader keeps connection always
      console.info(`🔌 Client disconnected. Remaining: ${this.clients.size}. Leader maintains always-on connection.`);
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
      console.log('📡 Only leader connects to TraderMade upstream');
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
          console.log('📡 Auth symbols:', upstreamSymbols);
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
        this.handleTradermadeMessage(event.data).catch((err) => {
          console.error('❌ handleTradermadeMessage error (non-blocking):', err.message);
        });
      };

      this.tradermadeSocket.onclose = (event) => {
        const logLevel = event.code === 1000 || event.code === 1005 ? 'info' : 'warn';
        const closeReason = event.reason || 'No reason provided';
        console[logLevel](`🔌❌ TraderMade connection closed: ${event.code} - ${closeReason}`);
        
        // Store close diagnostics
        this.lastUpstreamCloseCode = event.code;
        this.lastUpstreamCloseReason = closeReason;
        
        this.connectionStatus = 'disconnected';
        this.stopHeartbeat();
        
        this.broadcastToAllClients({
          type: 'connection_status',
          status: 'disconnected',
          timestamp: new Date().toISOString(),
          closeCode: event.code,
          closeReason
        });

        // Always-on: Reconnect immediately if still leader (no client-count gate)
        if (this.isLeader && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log('🔄 Always-on reconnect (no client-count gate)');
          this.scheduleReconnect();
        }
      };

      this.tradermadeSocket.onerror = (error) => {
        console.error('❌ TraderMade WebSocket error:', error);
        this.lastUpstreamErrorMessage = error.toString();
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
  private async handleTradermadeMessage(data: string): Promise<void> {
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
      
      // DEFENSIVE FILTER: Only process allowed symbols for cost optimization
      if (!ALLOWED_CLIENT_SYMBOLS.has(clientSymbol)) {
        return;
      }
      
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

      // Track per-symbol ticks and latencies (capped arrays)
      this.trackSymbolMetrics(clientSymbol, now);

      // ALWAYS: Broadcast to Realtime (always-on service)
      await this.broadcastPriceToRealtime(priceUpdate);

      // LEADER: Publish to Redis for all instances
      this.publishPriceToRedis(priceUpdate);

    } catch (error) {
      if (data.startsWith('{')) {
        console.error('❌ Error parsing TraderMade message:', error);
      }
    }
  }

  // Track per-symbol tick metrics with capped arrays
  private trackSymbolMetrics(symbol: string, timestamp: number): void {
    // Track tick times per symbol (last 60 seconds)
    if (!this.symbolTickTimes.has(symbol)) {
      this.symbolTickTimes.set(symbol, []);
    }
    const tickTimes = this.symbolTickTimes.get(symbol)!;
    tickTimes.push(timestamp);
    
    // Cap to last 60 seconds
    const cutoff = timestamp - 60000;
    while (tickTimes.length > 0 && tickTimes[0] < cutoff) {
      tickTimes.shift();
    }

    // Track latencies per symbol (last 30 minutes for p50/p95)
    if (!this.symbolLatencies.has(symbol)) {
      this.symbolLatencies.set(symbol, []);
    }
    const latencies = this.symbolLatencies.get(symbol)!;
    latencies.push(timestamp); // Simplified latency tracking
    
    // Cap to last 30 minutes
    const latencyCutoff = timestamp - 1800000; // 30 minutes
    while (latencies.length > 0 && latencies[0] < latencyCutoff) {
      latencies.shift();
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
        
        // Always-on: Force reconnect on idle upstream (no client-count gate)
        const sinceTick = this.lastTickTime ? now - this.lastTickTime : Infinity;
        if (sinceTick > 12000) {
          console.warn(`⏱️ Upstream idle >12s (${sinceTick}ms). Always-on reconnect...`);
          this.upstreamIdleReconnects++;
          this.disconnectTradermade();
          // Always-on mode: reconnect immediately
          this.connectToTradermade();
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

  // Schedule reconnection (idempotent)
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) return; // Already scheduled

    this.reconnectAttempts++;
    const delay = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts), 60000);
    
    console.log(`🔄 Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      // Always-on mode: always reconnect
      if (this.isLeader) {
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

      // Always-on: Leader maintains connection regardless of client count

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

  // Handle client messages with error catching
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
      console.error(`❌ handleClientMessage error for ${clientId}:`, error);
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

  // Robust log sanitization to prevent sensitive data exposure
  private sanitizeLogData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    const sanitized = { ...data };
    
    // Remove sensitive authentication data
    delete sanitized.token;
    delete sanitized.access_token;
    delete sanitized.refresh_token;
    delete sanitized.apikey;
    delete sanitized.api_key;
    delete sanitized.userKey;
    delete sanitized.password;
    delete sanitized.secret;
    
    // Redact PII and sensitive headers
    if (sanitized.headers) {
      const headers = { ...sanitized.headers };
      delete headers.authorization;
      delete headers.Authorization;
      delete headers['x-api-key'];
      delete headers['X-API-Key'];
      sanitized.headers = headers;
    }
    
    // Truncate very long strings to prevent log flooding
    for (const [key, value] of Object.entries(sanitized)) {
      if (typeof value === 'string' && value.length > 500) {
        sanitized[key] = value.substring(0, 500) + '...[truncated]';
      }
    }
    
    return sanitized;
  }

  // Consistent logging with event names and sanitization
  private logEvent(event: string, data: any): void {
    const sanitizedData = this.sanitizeLogData(data);
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
      
      console.log(`📊 POST request received:`, {
        symbols: requestedSymbols,
        forceFetch,
        isLeader: this.isLeader,
        redisConnected: !!this.redisPublisher,
        cachedPrices: this.priceCache.size
      });
      
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
        } else if (forceFetch) {
          // If no cached data and forceFetch is true, try REST API (with cooldown)
          console.log(`🔄 Force fetch requested for ${symbol}, attempting REST API...`);
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
              console.log(`❌ REST API returned null for ${symbol}`);
              prices[symbol] = {
                served_from: 'rest_api_failed',
                stale: true
              };
            }
          } catch (error) {
            console.error(`❌ REST fallback failed for ${symbol}:`, error);
            prices[symbol] = {
              served_from: 'rest_api_error', 
              stale: true,
              error: error.message
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

  // Calculate percentiles for array
  private calculatePercentiles(values: number[]): { p50: number | null, p95: number | null } {
    if (values.length === 0) return { p50: null, p95: null };
    
    const sorted = [...values].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    
    return { p50, p95 };
  }

  // Enhanced health status with alerting thresholds and leader-aware diagnostics
  async getHealthStatus(preferLeader: boolean = false): Promise<any> {
    const now = Date.now();
    const authenticatedClients = Array.from(this.clients.values()).filter(c => c.isAuthenticated);
    const totalSubscriptions = Array.from(this.clients.values())
      .reduce((sum, client) => sum + client.subscriptions.size, 0);

    // Calculate WS vs HTTP ratio
    const totalUpdates = this.wsUpdatesTotal + this.httpUpdatesTotal;
    const wsVsHttpRatio = totalUpdates > 0 ? (this.wsUpdatesTotal / totalUpdates) * 100 : 0;

    // Calculate percentiles for WebSocket first tick latencies
    const { p50: wsP50, p95: wsP95 } = this.calculatePercentiles(this.wsFirstTickLatenciesMs);

    // Per-symbol metrics for configurable symbols
    const symbolMetrics: any = {};
    
    for (const symbol of this.configurableSymbols) {
      const tickTimes = this.symbolTickTimes.get(symbol) || [];
      const latencies = this.symbolLatencies.get(symbol) || [];
      const lastBroadcast = this.lastSentAtMs.get(symbol);
      
      // Calculate ticks per second over last 60s
      const ticksPerSec = tickTimes.length > 0 ? tickTimes.length / 60 : 0;
      
      // Calculate cache freshness
      const cacheFreshnessMs = lastBroadcast ? now - lastBroadcast : null;
      
      // Calculate latency percentiles
      const { p50: latencyP50, p95: latencyP95 } = this.calculatePercentiles(latencies);
      
      symbolMetrics[symbol] = {
        ticks_per_sec: Math.round(ticksPerSec * 100) / 100,
        cache_freshness_ms: cacheFreshnessMs,
        ws_first_tick_latency_p50_ms: latencyP50,
        ws_first_tick_latency_p95_ms: latencyP95,
        last_broadcast_ts: lastBroadcast
      };
    }

    // Connectivity probe results
    const traderMadeKeyConfigured = !!Deno.env.get('TRADERMADE_API_KEY');
    const dnsOk = this.connectGuardReason !== 'dns_failed';
    const tlsOk = this.connectGuardReason !== 'tls_failed';

    // Alerting thresholds
    const timeSinceLastTick = this.lastTickTime ? now - this.lastTickTime : null;
    const alertingThresholds = {
      time_since_last_tick_exceeded: timeSinceLastTick ? timeSinceLastTick > 15000 : true,
      leader_flips_last_10m: this.leaderFlips.length,
      publish_errors_last_5s: this.publishErrors.length
    };

    // Determine response structure based on prefer_leader flag
    let leaderInstanceId = this.isLeader ? this.instanceId : null;
    let respondedByInstanceId = this.instanceId;
    let responderInstanceId = this.instanceId;
    let healthSource = 'direct'; // Track actual health source for headers

    // If prefer_leader=true and we're a follower, try to get leader snapshot
    if (preferLeader && !this.isLeader && this.redisPublisher && !this.redisDegradedMode) {
      try {
        const leaderSnapshot = await this.redisPublisher.get('tradermade:health:latest');
        if (leaderSnapshot) {
          const snapshot = JSON.parse(leaderSnapshot);
          
          // Use leader's instance ID for consistency with Step-2 verification
          leaderInstanceId = snapshot.leader_instance_id;
          respondedByInstanceId = snapshot.leader_instance_id;
          healthSource = 'leader_snapshot'; // Mark as leader snapshot response
          
          return {
            // Service identification
            service: 'tradermade-streaming',
            version: '5.1.0-enhanced-polling',
            mode: 'always_on_single_dialer',
            
            // Response metadata
            responded_by_instance_id: respondedByInstanceId,
            responder_instance_id: responderInstanceId,
            leader_snapshot: true,
            health_source: healthSource,
            snapshot_age_ms: now - snapshot.timestamp,
            
            // Core health metrics from leader snapshot
            tradermadeStatus: snapshot.tradermade_status,
            connectedClients: snapshot.connected_clients,
            authenticatedClients: snapshot.authenticated_clients,
            totalSubscriptions: 0, // Not in snapshot
            cachedPrices: snapshot.cached_prices,
            lastTickTime: snapshot.last_tick_time,
            timeSinceLastTick: snapshot.time_since_last_tick,
            upstreamConnected: snapshot.upstream_connected,
            reconnectAttempts: 0, // Not in snapshot
            isWarmingUp: false,
            
            // Leader-aware diagnostics
            leader: {
              is_leader: snapshot.is_leader,
              leader_instance_id: snapshot.leader_instance_id,
              is_leader_response: snapshot.is_leader,
              from_instance_id: responderInstanceId,
              redis_degraded_mode: snapshot.redis_degraded_mode,
              leader_election_in_progress: false,
              leader_conflict_count: 0
            },
            
            // Redis and distributed system status
            redis: {
              publisher_connected: !!this.redisPublisher,
              subscriber_connected: !!this.redisSubscriber,
              degraded_mode: this.redisDegradedMode
            },
            
            // Alerting thresholds from snapshot
            alerting_thresholds: snapshot.alerting_thresholds,
            
            // Connectivity probe results (local follower data)
            connectivity: {
              tradermade_key_configured: traderMadeKeyConfigured,
              dns_ok: dnsOk,
              tls_ok: tlsOk,
              connect_guard_reason: this.connectGuardReason,
              last_probe_at: this.lastConnectivityProbeAt,
              last_probe_error: this.lastConnectivityProbeError
            },
            
            // Symbol metrics from snapshot
            symbol_metrics: snapshot.symbol_metrics,
            
            // Metrics from snapshot
            metrics: {
              ws_updates_total: snapshot.ws_updates_total,
              realtime_broadcasts_total: snapshot.realtime_broadcasts_total,
              symbols: snapshot.symbol_metrics
            },
            
            timestamp: now
          };
        }
      } catch (error) {
        console.warn('❌ Failed to fetch leader snapshot, returning follower data:', error);
      }
    }

    // Standard response (leader or follower without prefer_leader)
    return {
      // Service identification
      service: 'tradermade-streaming',
      version: '5.1.0-enhanced-polling',
      mode: 'always_on_single_dialer',
      
      // Response metadata
      responded_by_instance_id: respondedByInstanceId,
      responder_instance_id: responderInstanceId,
      leader_snapshot: false,
      health_source: healthSource,
      
      // Core health metrics
      tradermadeStatus: this.connectionStatus,
      connectedClients: this.clients.size,
      authenticatedClients: authenticatedClients.length,
      totalSubscriptions,
      cachedPrices: this.priceCache.size,
      lastTickTime: this.lastTickTime,
      timeSinceLastTick,
      upstreamConnected: this.tradermadeSocket?.readyState === WebSocket.OPEN,
      reconnectAttempts: this.reconnectAttempts,
      isWarmingUp: this.isWarmingUp,
      
      // Leader-aware diagnostics
      leader: {
        is_leader: this.isLeader,
        leader_instance_id: leaderInstanceId,
        is_leader_response: this.isLeader,
        from_instance_id: this.instanceId,
        redis_degraded_mode: this.redisDegradedMode,
        leader_election_in_progress: this.leaderElectionInProgress,
        leader_conflict_count: this.leaderConflictCount
      },
      
      // Redis and distributed system status
      redis: {
        publisher_connected: !!this.redisPublisher,
        subscriber_connected: !!this.redisSubscriber,
        degraded_mode: this.redisDegradedMode
      },
      
      // Upstream connection diagnostics
      upstream: {
        connected: this.tradermadeSocket?.readyState === WebSocket.OPEN,
        last_close_code: this.lastUpstreamCloseCode,
        last_close_reason: this.lastUpstreamCloseReason,
        last_error_message: this.lastUpstreamErrorMessage,
        reconnect_attempts: this.reconnectAttempts
      },
      
      // Connectivity probe results (DNS/TLS-only)
      connectivity: {
        tradermade_key_configured: traderMadeKeyConfigured,
        dns_ok: dnsOk,
        tls_ok: tlsOk,
        connect_guard_reason: this.connectGuardReason,
        last_probe_at: this.lastConnectivityProbeAt,
        last_probe_error: this.lastConnectivityProbeError
      },
      
      // Alerting thresholds
      alerting_thresholds: alertingThresholds,
      
      // Enhanced metrics with per-symbol breakdowns
      metrics: {
        fallback_http_total: this.fallbackHttpTotal,
        fallback_force_fetch_total: this.fallbackForceFetchTotal,
        ws_updates_total: this.wsUpdatesTotal,
        http_updates_total: this.httpUpdatesTotal,
        realtime_broadcasts_total: this.realtimeBroadcastsTotal,
        ws_vs_http_ratio_percent: Math.round(wsVsHttpRatio * 100) / 100,
        ws_first_tick_latency_p50_ms: wsP50,
        ws_first_tick_latency_p95_ms: wsP95,
        latency_samples: this.wsFirstTickLatenciesMs.length,
        upstream_idle_reconnects: this.upstreamIdleReconnects,
        duplicate_drop_count: this.duplicateDropCount,
        broadcast_error_window_5s: this.broadcastErrorTimestamps.length,
        safe_mode_active: now < this.safeModeUntilMs,
        symbols: symbolMetrics
      },
      
      // Always-on connection status
      always_on: {
        mode: 'always_on',
        realtime_channel_ready: !!this.realtimeChannel,
        realtime_channel_subscribed: this.realtimeChannelSubscribed,
        supabase_service_key_configured: !!supabaseServiceKey && supabaseServiceKey.length > 50,
        always_on_enabled: this.alwaysOnConnection
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
      
      timestamp: now
    };
  }

  // Disconnect TraderMade WebSocket on leadership step-down
  private disconnectTradermadeOnStepDown(): void {
    console.log('🔌 Disconnecting TraderMade on leadership step-down...');
    
    // Clear any active timeouts and intervals
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Close WebSocket connection with stepping_down reason
    if (this.tradermadeSocket && this.tradermadeSocket.readyState === WebSocket.OPEN) {
      this.tradermadeSocket.close(1000, 'stepping_down');
    }
    
    // Reset connection state
    this.tradermadeSocket = null;
    this.connectionStatus = 'disconnected';
  }
}

// ========== EDGE FUNCTION HANDLER ==========
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Handle GET requests for enhanced health status with rate limiting
  if (req.method === 'GET') {
    const manager = TradermadeConnectionManager.getInstance();
    const clientIp = manager.getTrustedIp(req);
    
    // Check rate limit
    const rateLimitPassed = await manager.checkHealthRateLimit(clientIp);
    if (!rateLimitPassed) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Rate limit exceeded',
        message: 'Too many health check requests. Max 10 per 2 seconds per IP.',
        retry_after: 2
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-transform',
          'Retry-After': '2'
        }
      });
    }
    
    // Parse query parameters
    const url = new URL(req.url);
    const preferLeader = url.searchParams.get('prefer_leader') === 'true';
    
    const health = await manager.getHealthStatus(preferLeader);
    
    return new Response(JSON.stringify({
      success: true,
      health,
      service: 'tradermade-streaming',
      version: '5.1.0-enhanced-polling',
      mode: 'always_on_single_dialer'
    }), {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store, no-transform', // Prevent health caching and transformations
        'X-Health-Source': health.health_source || 'direct',
        'X-Responder-Instance': health.responder_instance_id
      }
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
    try {
      await manager.handleClientMessage(clientId, event.data);
    } catch (error) {
      console.error(`❌ Client message handler error for ${clientId}:`, error);
    }
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
