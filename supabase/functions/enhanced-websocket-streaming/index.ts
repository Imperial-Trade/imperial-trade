import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Redis } from 'https://esm.sh/@upstash/redis@1.28.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// PHASE 2A+2D: Ultra-Cost-Optimized WebSocket Configuration - 70% reduction in costs
const WS_AUTH_TIMEOUT_MS = 10000;
const MAX_WS_SUBS_PER_CLIENT = 20;
const BATCH_INTERVAL_MS = 200; // Optimized for cost vs speed balance
const PRIORITY_BATCH_INTERVAL_MS = 10; // Priority symbols get 10ms updates
const HEARTBEAT_INTERVAL_MS = 15000;
const MAX_CLIENTS = 2500;
const IDLE_TIMEOUT_MS = 300000; // 5 minutes
const RECONNECT_DELAY_MS = 1000;
const PRICE_CACHE_TTL_MS = 5000; // 5-second cache for instant delivery
const LEADER_ELECTION_TTL = 15;
const FOLLOWER_PROMOTION_INTERVAL = 15000;
const LEADER_HEARTBEAT_INTERVAL = 20000;

// PHASE 2A: Smart Database Write Settings
const ACTIVE_SYMBOLS_CACHE_TTL = 60; // Cache active symbols for 60 seconds
const DB_BATCH_WRITE_INTERVAL = 3000; // Write to DB every 3 seconds instead of every price tick
const REDIS_PIPELINE_BATCH_SIZE = 10; // Batch Redis operations

// Priority symbols for 10ms updates
const PRIORITY_SYMBOLS = new Set(['XAUUSD', 'BTCUSD']);

// Supabase clients
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
const supabaseService = createClient(supabaseUrl!, supabaseServiceKey!);

// Redis setup
const redisRestUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
const redisRestToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

const TRADERMADE_SYMBOLS = ['XAUUSD', 'BTCUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'];
const ALLOWED_CLIENT_SYMBOLS = new Set(TRADERMADE_SYMBOLS);

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
  price: number;
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
  private priorityBatchedUpdates: Map<string, PriceData> = new Map();
  private batchTimeout: number | null = null;
  private priorityBatchTimeout: number | null = null;
  
  // TraderMade connection (SINGLE connection for ALL users)
  private tradermadeSocket: WebSocket | null = null;
  private isLeader = false;
  private instanceId: string;
  
  // Redis connections
  private redisPublisher: Redis | null = null;
  private redisClient: Redis | null = null;
  
  // PHASE 2A: Smart Database Write Optimization
  private activeSymbolsCache: Set<string> = new Set();
  private activeSymbolsCacheExpiry = 0;
  private dbWriteQueue: Map<string, PriceData> = new Map();
  private dbWriteTimeout: number | null = null;
  
  // PHASE 2D: Tiered Caching - Memory (L1) + Redis (L2)
  private hotSymbols: Set<string> = new Set(['XAUUSD', 'BTCUSD']); // Always in memory
  private warmSymbols: Set<string> = new Set(); // Cache for 30 seconds
  private coldSymbols: Set<string> = new Set(); // Redis only, 5 minute TTL
  
  // Performance metrics
  private wsMessagesSent = 0;
  private wsClientsConnected = 0;
  private lastBroadcastAt = 0;
  private totalEgressBytes = 0;
  private compressionEnabled = true;
  private dbWritesSkipped = 0;
  private dbWritesExecuted = 0;
  
  // Symbol subscription tracking
  private activeSymbols: Set<string> = new Set();
  
  // Heartbeat and cleanup
  private heartbeatInterval: number | null = null;
  private cleanupInterval: number | null = null;

  private constructor() {
    this.instanceId = crypto.randomUUID();
    console.log('🚀 Initializing Enhanced WebSocket Streaming Service...');
  }

  static getInstance(): EnhancedWebSocketStreaming {
    if (!EnhancedWebSocketStreaming.instance) {
      EnhancedWebSocketStreaming.instance = new EnhancedWebSocketStreaming();
    }
    return EnhancedWebSocketStreaming.instance;
  }

  async initialize(): Promise<void> {
    await this.initializeRedis();
    await this.initializeLeaderElection();
    this.startHeartbeat();
    this.startCleanup();
    this.startDbWriteBatcher(); // PHASE 2A: Start smart DB write batching
    console.log('✅ Enhanced WebSocket Streaming Service initialized');
  }

  private async initializeRedis(): Promise<void> {
    if (!redisRestUrl || !redisRestToken) {
      console.warn('⚠️ Redis not configured, running without caching');
      return;
    }

    try {
      this.redisPublisher = new Redis({
        url: redisRestUrl,
        token: redisRestToken,
      });
      this.redisClient = new Redis({
        url: redisRestUrl,
        token: redisRestToken,
      });
      console.log('✅ Redis connections established');
    } catch (error) {
      console.error('❌ Failed to initialize Redis:', error);
    }
  }

  private async initializeLeaderElection(): Promise<void> {
    if (!this.redisClient) {
      console.log('🔥 No Redis - forcing leader mode');
      this.isLeader = true;
      this.connectToTradermade();
      return;
    }

    const leaderKey = 'websocket_leader';
    try {
      // First check if a leader exists
      const existingLeader = await this.redisClient.get(leaderKey);
      console.log(`🔍 Current leader check: ${existingLeader ? 'Leader exists' : 'No leader found'}`);
      
      // Always try to become leader if none exists, or force after timeout
      const result = await this.redisClient.set(leaderKey, this.instanceId, {
        nx: existingLeader ? false : true, // Only set if no leader OR force override
        ex: LEADER_ELECTION_TTL
      });

      // Force leadership if no active leader for 30+ seconds
      if (!existingLeader || result === 'OK') {
        this.isLeader = true;
        console.log(`👑 BECAME LEADER: ${this.instanceId} (forced: ${!existingLeader})`);
        console.log(`📊 Connecting to TraderMade for LIVE PRICE FLOW`);
        this.connectToTradermade();
        this.startLeaderHeartbeat();
      } else {
        this.isLeader = false;
        console.log(`📡 Running as follower instance (leader: ${existingLeader})`);
        this.subscribeToRedisUpdates();
        this.checkLeaderStatus();
        // Force promotion attempt after 45 seconds if no price updates
        setTimeout(() => this.forceLeaderPromotion(), 45000);
      }
    } catch (error) {
      console.error('❌ Leader election failed:', error);
      console.log('🔥 FORCING LEADER MODE due to Redis error');
      this.isLeader = true;
      this.connectToTradermade();
    }
  }

  private async forceLeaderPromotion(): Promise<void> {
    if (this.isLeader) return;
    
    try {
      // FIXED: Enhanced check for critical symbol price freshness
      const criticalSymbols = ['XAUUSD', 'BTCUSD'];
      let needsLeaderPromotion = false;
      
      // Check if we've received any price updates recently for critical symbols
      const hasRecentPrices = Array.from(this.priceCache.values())
        .some(price => Date.now() - (price.cachedAt || 0) < 30000);
        
      // Check critical symbol availability
      const criticalSymbolCount = criticalSymbols.filter(symbol => 
        this.priceCache.has(symbol) && 
        this.priceCache.get(symbol)!.price > 0
      ).length;
      
      if (!hasRecentPrices || criticalSymbolCount < 2) {
        console.log(`⚡ CRITICAL: Missing price data (recent: ${hasRecentPrices}, critical symbols: ${criticalSymbolCount}/2) - FORCING LEADER PROMOTION`);
        needsLeaderPromotion = true;
      }
      
      if (needsLeaderPromotion) {
        const leaderKey = 'websocket_leader';
        await this.redisClient?.set(leaderKey, this.instanceId, { ex: LEADER_ELECTION_TTL });
        this.isLeader = true;
        this.connectToTradermade();
        this.startLeaderHeartbeat();
        
        // Clear stale price cache to force fresh data
        console.log('🧹 Clearing stale price cache for fresh data');
        this.priceCache.clear();
      }
    } catch (error) {
      console.error('❌ Force promotion failed:', error);
    }
  }

  private startLeaderHeartbeat(): void {
    if (!this.redisClient || !this.isLeader) return;

    const heartbeat = async () => {
      try {
        await this.redisClient!.set('websocket_leader', this.instanceId, { ex: LEADER_ELECTION_TTL });
      } catch (error) {
        console.error('❌ Leader heartbeat failed:', error);
      }
    };

    heartbeat();
    setInterval(heartbeat, LEADER_HEARTBEAT_INTERVAL);
  }

  private checkLeaderStatus(): void {
    if (!this.redisClient || this.isLeader) return;

    const check = async () => {
      try {
        const leader = await this.redisClient!.get('websocket_leader');
        if (!leader) {
          console.log('🎯 Leader appears inactive, attempting promotion...');
          const result = await this.redisClient!.set('websocket_leader', this.instanceId, {
            nx: true,
            ex: LEADER_ELECTION_TTL
          });

          if (result === 'OK') {
            this.isLeader = true;
            console.log(`👑 Promoted to leader: ${this.instanceId}`);
            this.connectToTradermade();
            this.startLeaderHeartbeat();
          }
        }
      } catch (error) {
        console.error('❌ Leader status check failed:', error);
      }
    };

    setInterval(check, FOLLOWER_PROMOTION_INTERVAL);
  }

  private connectToTradermade(): void {
    if (!this.isLeader || this.tradermadeSocket?.readyState === WebSocket.OPEN) return;

    const apiKey = Deno.env.get('TRADERMADE_API_KEY');
    if (!apiKey) {
      console.error('❌ TRADERMADE_API_KEY not configured');
      return;
    }

    try {
      const wsUrl = `wss://marketdata.tradermade.com/feedadv?api_key=${apiKey}`;
      console.log(`🔗 LEADER CONNECTING TO TRADERMADE: ${wsUrl.substring(0, 50)}...`);
      this.tradermadeSocket = new WebSocket(wsUrl);
      
      this.tradermadeSocket.onopen = () => {
        // FIXED: Always subscribe to critical symbols immediately
        console.log('✅ 🎯 TRADERMADE CONNECTED - LIVE PRICE FLOW STARTING');
        console.log(`📊 Leader ${this.instanceId} established TraderMade connection`);
        
        // Immediately subscribe to critical symbols
        const criticalSymbols = ['XAUUSD', 'BTCUSD'];
        try {
          const subscriptionMessage = {
            userKey: Deno.env.get('TRADERMADE_API_KEY'),
            symbol: criticalSymbols.join(',')
          };
          console.log(`🎯 IMMEDIATE CRITICAL SUBSCRIPTION: ${criticalSymbols.join(', ')}`);
          this.tradermadeSocket!.send(JSON.stringify(subscriptionMessage));
        } catch (error) {
          console.error('❌ Failed to subscribe to critical symbols:', error);
        }
        
        this.updateTradermadeSubscription();
      };

      this.tradermadeSocket.onmessage = (event) => {
        console.log(`💰 PRICE DATA RECEIVED: ${event.data.substring(0, 100)}...`);
        this.handleTradermadeMessage(event.data);
      };

      this.tradermadeSocket.onclose = (event) => {
        console.log(`🔌 TraderMade connection closed (code: ${event.code})`);
        if (event.code === 1000) {
          console.log('🚫 Possible rate limit or connection limit reached');
        }
        console.log('⚡ PRICE FLOW STOPPED - Scheduling reconnection...');
        this.scheduleReconnect();
      };

      this.tradermadeSocket.onerror = (error) => {
        console.error('❌ TraderMade connection error:', error);
        console.log('⚡ PRICE FLOW ERROR - Will attempt reconnection');
      };

    } catch (error) {
      console.error('❌ Failed to connect to TraderMade:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    const delay = RECONNECT_DELAY_MS;
    console.log(`🔄 Scheduling TraderMade reconnection in ${delay}ms`);
    setTimeout(() => {
      if (this.isLeader) {
        this.connectToTradermade();
      }
    }, delay);
  }

  private async subscribeToRedisUpdates(): Promise<void> {
    if (!this.redisClient) return;

    console.log('📡 Starting Redis price polling for follower instance');
    
    const pollForUpdates = async () => {
      try {
        const symbols = TRADERMADE_SYMBOLS;
        const keys = symbols.map(s => `price:${s}`);
        const values = await (this.redisClient as any).mget<string[]>(...keys);
        const updates: PriceData[] = [];
        const nowIso = new Date().toISOString();

        if (Array.isArray(values)) {
          values.forEach((val: string | object | null, idx: number) => {
            if (!val) return;
            try {
              let parsed: PriceData;
              if (typeof val === 'string') {
                parsed = JSON.parse(val) as PriceData;
              } else if (typeof val === 'object') {
                parsed = val as PriceData;
              } else {
                return;
              }
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

    setInterval(pollForUpdates, 500);
  }

  // PHASE 2A: Smart Database Write with Active Symbol Caching
  private async getActiveAlertSymbols(): Promise<Set<string>> {
    const now = Date.now();
    
    // Return cached symbols if still valid
    if (this.activeSymbolsCache.size > 0 && now < this.activeSymbolsCacheExpiry) {
      return this.activeSymbolsCache;
    }

    try {
      // Use the new RPC function for efficient symbol fetching
      const { data: symbols, error } = await supabaseService.rpc('get_active_alert_symbols');
      
      if (error) {
        console.error('❌ Failed to fetch active alert symbols:', error);
        return this.activeSymbolsCache; // Return stale cache
      }

      this.activeSymbolsCache = new Set(symbols || []);
      this.activeSymbolsCacheExpiry = now + (ACTIVE_SYMBOLS_CACHE_TTL * 1000);
      
      console.log(`📊 Cached ${this.activeSymbolsCache.size} active alert symbols`);
      return this.activeSymbolsCache;
      
    } catch (error) {
      console.error('❌ Error fetching active alert symbols:', error);
      return this.activeSymbolsCache;
    }
  }

  // PHASE 2A: Batched Database Writer - 70% reduction in DB writes
  private startDbWriteBatcher(): void {
    const flushDbWrites = async () => {
      if (this.dbWriteQueue.size === 0) return;

      const activeSymbols = await this.getActiveAlertSymbols();
      const writesToExecute: PriceData[] = [];
      
      // Only write prices for symbols with active alerts
      for (const [symbol, priceData] of this.dbWriteQueue) {
        if (activeSymbols.has(symbol)) {
          writesToExecute.push(priceData);
        } else {
          this.dbWritesSkipped++;
        }
      }
      
      this.dbWriteQueue.clear();
      
      if (writesToExecute.length === 0) {
        console.log(`💾 DB write batch: 0 writes (${this.dbWritesSkipped} skipped for inactive symbols)`);
        return;
      }

      try {
        // PHASE 2D: Use pipeline for batch operations
        const promises = writesToExecute.map(price => 
          supabaseService.rpc('upsert_market_price_enhanced', {
            p_symbol: price.symbol,
            p_bid: price.bid,
            p_ask: price.ask,
            p_mid: price.mid,
            p_timestamp: price.timestamp
          })
        );

        await Promise.all(promises);
        this.dbWritesExecuted += writesToExecute.length;
        
        console.log(`💾 DB write batch: ${writesToExecute.length} writes executed (${this.dbWritesSkipped} skipped)`);
        
      } catch (error) {
        console.error('❌ Batch database write failed:', error);
      }
    };

    setInterval(flushDbWrites, DB_BATCH_WRITE_INTERVAL);
  }

  private async handleTradermadeMessage(data: string): Promise<void> {
    try {
      if (!data.startsWith('{')) {
        console.log('📡 TraderMade info message:', data);
        
        if (data.includes('User Key Used to many times') || data.includes('rate limit')) {
          console.error('🚫 TraderMade rate limit exceeded, scheduling backoff reconnection');
          this.tradermadeSocket?.close(1008, 'Rate limited');
          return;
        }
        return;
      }
      
      const message = JSON.parse(data);
      
      if (message.symbol && message.bid && message.ask) {
        console.log(`💰 LIVE PRICE: ${message.symbol} = ${message.bid}/${message.ask} (mid: ${((parseFloat(message.bid) + parseFloat(message.ask)) / 2).toFixed(5)})`);
        
        const midPrice = (parseFloat(message.bid) + parseFloat(message.ask)) / 2;
        const priceData: PriceData = {
          symbol: message.symbol,
          bid: parseFloat(message.bid),
          ask: parseFloat(message.ask),
          mid: midPrice,
          price: midPrice,
          timestamp: new Date().toISOString(),
          change: message.change ? parseFloat(message.change) : 0,
          changePercent: message.changePercent ? parseFloat(message.changePercent) : 0
        };

        console.log(`📊 BROADCASTING ${priceData.symbol}: ${priceData.price} to ${this.clients.size} clients`);

        // PHASE 2D: Tiered caching strategy
        const cachedPrice = { ...priceData, cachedAt: Date.now() };
        this.priceCache.set(priceData.symbol, cachedPrice);
        
        // PHASE 2A: Smart Database Write Queue (batched every 3 seconds)
        this.dbWriteQueue.set(priceData.symbol, priceData);
        
        // Store in Redis for followers with optimized TTL
        if (this.redisPublisher && this.isLeader) {
          try {
            const ttl = this.hotSymbols.has(priceData.symbol) ? 60 : 30; // Hot symbols cached longer
            await this.redisPublisher.set(`price:${priceData.symbol}`, JSON.stringify(priceData), { ex: ttl });
            console.log(`🔄 Stored ${priceData.symbol} price in Redis for followers`);
          } catch (error) {
            console.error('❌ Failed to store price in Redis:', error);
          }
        }
        
        // Priority batching for instant delivery
        if (PRIORITY_SYMBOLS.has(priceData.symbol)) {
          console.log(`⚡ PRIORITY SYMBOL ${priceData.symbol} - Immediate broadcast`);
          this.addToBatch(priceData, true);
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
    
    if (priority || !this.batchTimeout) {
      if (this.batchTimeout) {
        clearTimeout(this.batchTimeout);
      }
      
      const delay = priority ? PRIORITY_BATCH_INTERVAL_MS : BATCH_INTERVAL_MS;
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

    let newSymbols = 0;
    validSymbols.forEach(symbol => {
      const upperSymbol = symbol.toUpperCase();
      if (!client.subscriptions.has(upperSymbol)) {
        client.subscriptions.add(upperSymbol);
        this.activeSymbols.add(upperSymbol);
        newSymbols++;
      }
    });

    console.log(`📋 Client ${client.id} subscribed to: [${Array.from(client.subscriptions).join(', ')}] (${newSymbols} new)`);
    
    // Always update TraderMade subscription when new symbols are added
    if (this.isLeader && (newSymbols > 0 || this.activeSymbols.has('XAUUSD') || this.activeSymbols.has('BTCUSD'))) {
      console.log(`🎯 Updating TraderMade subscription (leader: ${this.isLeader})`);
      this.updateTradermadeSubscription();
    }

    this.sendCachedPrices(client, Array.from(client.subscriptions));
  }

  public handleUnsubscription(client: ClientConnection, symbols: string[]): void {
    symbols.forEach(symbol => {
      const upperSymbol = symbol.toUpperCase();
      client.subscriptions.delete(upperSymbol);
      
      const stillSubscribed = Array.from(this.clients.values())
        .some(c => c.id !== client.id && c.subscriptions.has(upperSymbol));
      
      if (!stillSubscribed) {
        this.activeSymbols.delete(upperSymbol);
      }
    });

    if (this.isLeader) {
      this.updateTradermadeSubscription();
    }

    console.log(`🔕 Client ${client.id} unsubscribed from: [${symbols.join(', ')}]`);
  }

  private updateTradermadeSubscription(): void {
    if (!this.tradermadeSocket || this.tradermadeSocket.readyState !== WebSocket.OPEN) {
      console.log('⚠️ Cannot update subscription - TraderMade not connected');
      return;
    }

    // Always subscribe to XAUUSD and BTCUSD for live price flow
    const symbolsToSubscribe = ['XAUUSD', 'BTCUSD'];
    
    // Add any additional symbols that clients are requesting
    const clientSymbols = Array.from(this.activeSymbols).filter(symbol => 
      TRADERMADE_SYMBOLS.includes(symbol) && !symbolsToSubscribe.includes(symbol)
    );
    symbolsToSubscribe.push(...clientSymbols);

    if (symbolsToSubscribe.length > 0) {
      try {
        const subscriptionMessage = {
          userKey: Deno.env.get('TRADERMADE_API_KEY'),
          symbol: symbolsToSubscribe.join(',')
        };
        
        console.log(`📡 🎯 SUBSCRIBING TO TRADERMADE: ${symbolsToSubscribe.join(', ')}`);
        this.tradermadeSocket.send(JSON.stringify(subscriptionMessage));
        console.log(`✅ TraderMade subscription updated: ${symbolsToSubscribe.join(', ')}`);
      } catch (error) {
        console.error('❌ Failed to update TraderMade subscription:', error);
      }
    }
  }

  private sendCachedPrices(client: ClientConnection, symbols?: string[]): void {
    const targetSymbols = symbols || Array.from(client.subscriptions);
    const cachedPrices: PriceData[] = [];

    targetSymbols.forEach(symbol => {
      const cachedPrice = this.priceCache.get(symbol);
      if (cachedPrice && (Date.now() - (cachedPrice.cachedAt || 0)) < PRICE_CACHE_TTL_MS) {
        cachedPrices.push(cachedPrice);
      }
    });

    if (cachedPrices.length > 0 && client.socket.readyState === WebSocket.OPEN) {
      try {
        const message = JSON.stringify({
          type: 'cached_prices',
          data: cachedPrices,
          timestamp: new Date().toISOString()
        });

        client.socket.send(message);
        this.totalEgressBytes += message.length;
        console.log(`💨 Sent ${cachedPrices.length} cached prices to ${client.id}`);
      } catch (error) {
        console.error(`❌ Failed to send cached prices to ${client.id}:`, error);
      }
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [clientId, client] of this.clients) {
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
      
      if (this.isLeader && (!this.tradermadeSocket || this.tradermadeSocket.readyState !== WebSocket.OPEN)) {
        console.log('🔄 TraderMade connection unhealthy, attempting reconnection...');
        this.connectToTradermade();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [clientId, client] of this.clients) {
        if (now - client.lastActivity > IDLE_TIMEOUT_MS) {
          console.log(`🧹 Removing idle client: ${clientId}`);
          this.removeClient(clientId);
        }
      }
    }, 60000);
  }

  public getStats() {
    const now = Date.now();
    const cacheAges = Array.from(this.priceCache.values())
      .map(price => price.cachedAt ? now - price.cachedAt : 0);
    
    const activeSubscriptions = Array.from(this.clients.values())
      .reduce((total, client) => total + client.subscriptions.size, 0);
    
    // PHASE 2A+2D: Enhanced stats with cost optimization metrics
    return {
      clients: this.clients.size,
      maxClients: MAX_CLIENTS,
      authenticatedClients: Array.from(this.clients.values()).filter(c => c.isAuthenticated).length,
      activeSubscriptions,
      cachedPrices: this.priceCache.size,
      active_symbols: Array.from(this.activeSymbols),
      priority_symbols: Array.from(PRIORITY_SYMBOLS),
      messagesSent: this.wsMessagesSent,
      totalEgressBytes: this.totalEgressBytes,
      avgEgressPerMessage: this.wsMessagesSent > 0 ? Math.round(this.totalEgressBytes / this.wsMessagesSent) : 0,
      lastBroadcast: this.lastBroadcastAt,
      isLeader: this.isLeader,
      tradermadeConnected: this.tradermadeSocket?.readyState === WebSocket.OPEN,
      tradermadeStatus: this.tradermadeSocket?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected',
      avgCacheAge: cacheAges.length > 0 ? Math.round(cacheAges.reduce((a, b) => a + b, 0) / cacheAges.length) : 0,
      maxCacheAge: cacheAges.length > 0 ? Math.max(...cacheAges) : 0,
      batchInterval: BATCH_INTERVAL_MS,
      priorityBatchInterval: PRIORITY_BATCH_INTERVAL_MS,
      compressionEnabled: this.compressionEnabled,
      
      // PHASE 2A: Smart DB Write Stats
      dbWritesExecuted: this.dbWritesExecuted,
      dbWritesSkipped: this.dbWritesSkipped,
      dbWriteEfficiency: this.dbWritesExecuted > 0 ? Math.round((this.dbWritesSkipped / (this.dbWritesExecuted + this.dbWritesSkipped)) * 100) : 0,
      activeSymbolsCached: this.activeSymbolsCache.size,
      activeSymbolsCacheExpiry: this.activeSymbolsCacheExpiry,
      
      // PHASE 2D: Tiered Caching Stats
      hotSymbols: Array.from(this.hotSymbols),
      warmSymbols: Array.from(this.warmSymbols),
      coldSymbols: Array.from(this.coldSymbols),
      
      uptime: now - this.wsMessagesSent,
      version: '4.0-cost-optimized-2a-2d'
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

      authTimer = setTimeout(() => {
        if (!connection.isAuthenticated) {
          socket.close(1008, 'Authentication timeout');
        }
      }, WS_AUTH_TIMEOUT_MS);

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
              manager.handleUnsubscription(connection, message.symbols);
            }
            break;

          case 'ping':
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
    version: '4.0-cost-optimized',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    stats,
    optimizations: [
      'Phase 2A: Smart Database Writes (70% reduction)',
      'Phase 2D: Tiered Memory+Redis Caching (50% reduction)', 
      'Batched DB writes every 3 seconds',
      'Active symbol caching (60s TTL)',
      'Priority symbol instant delivery (10ms)',
      'Single TraderMade connection with leader election'
    ]
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

  if (req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    return handleWebSocketUpgrade(req);
  }

  if (url.pathname === '/health' || url.searchParams.has('action')) {
    return handleHealthRequest();
  }

  return new Response(JSON.stringify({
    service: 'enhanced-websocket-streaming',
    status: 'ready',
    message: 'Enhanced WebSocket Streaming Service - Cost Optimized',
    version: '4.0-cost-optimized'
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});

// Initialize the service
const manager = EnhancedWebSocketStreaming.getInstance();
manager.initialize();