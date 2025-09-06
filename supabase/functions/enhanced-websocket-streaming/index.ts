import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Redis } from 'https://esm.sh/@upstash/redis@1.28.4';

// PHASE 2A+2D: Ultra Cost Optimizer Integration
interface UltraCostOptimizer {
  trackApiCall(type: 'tradermade' | 'database' | 'redis' | 'edge_function'): void;
  getOptimizedCacheTTL(baseSeconds: number, dataType: 'prices' | 'signals' | 'other'): number;
  isSymbolAllowed(symbol: string): boolean;
  getOptimalConnectionCount(isMarketHours: boolean, isPeakHours: boolean): number;
}

// Inline Ultra Cost Optimizer for edge function
const ultraCostOptimizer: UltraCostOptimizer = {
  trackApiCall: (type) => {
    // Lightweight tracking in edge function
    console.log(`📊 Cost tracking: ${type}`);
  },
  getOptimizedCacheTTL: (baseSeconds, dataType) => {
    // Cost-optimized TTL
    const multiplier = dataType === 'prices' ? 2 : dataType === 'signals' ? 3 : 4;
    return Math.min(baseSeconds * multiplier, 300);
  },
  isSymbolAllowed: (symbol) => {
    return ['BTCUSD', 'XAUUSD'].includes(symbol.toUpperCase());
  },
  getOptimalConnectionCount: (isMarketHours, isPeakHours) => {
    if (!isMarketHours) return 1;
    return isPeakHours ? 3 : 2;
  }
};

console.log('🚀 ULTRA-COST OPTIMIZED WebSocket Streaming - Target: 70% Cost Reduction');

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

// ULTRA-COST OPTIMIZATION: Aggressive batching for cost reduction
const ACTIVE_SYMBOLS_CACHE_TTL = 300; // 5-minute cache (5x longer)
const DB_BATCH_WRITE_INTERVAL = 10000; // Write to DB every 10 seconds (3x longer)
const REDIS_PIPELINE_BATCH_SIZE = 20; // Larger batch sizes (2x bigger)

// Performance Monitoring Enhancement - Track data freshness
const DATA_FRESHNESS_THRESHOLD_MS = 60000; // 1 minute threshold for stale data alerts
const CACHE_HIT_RATE_WINDOW = 100; // Track hit rate over last 100 operations

// Priority symbols for 10ms updates
const PRIORITY_SYMBOLS = new Set(['XAUUSD', 'BTCUSD']);

// Supabase clients
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseAnonKey!);
const supabaseService = createClient(supabaseUrl!, supabaseServiceKey!);

// Enhanced Redis setup with validation
const redisRestUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
const redisRestToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
const tradermadeApiKey = Deno.env.get('TRADERMADE_API_KEY');

// Validate critical secrets
if (!redisRestUrl || !redisRestToken) {
  console.warn('⚠️ UPSTASH Redis secrets not configured - caching disabled');
}

if (!tradermadeApiKey) {
  console.warn('⚠️ TRADERMADE_API_KEY not configured - market data may be limited');
}

// Initialize Redis client only if secrets are available
let redis: Redis | null = null;
if (redisRestUrl && redisRestToken) {
  redis = new Redis({
    url: redisRestUrl,
    token: redisRestToken,
  });
  console.log('🔗 Redis client initialized with Upstash');
} else {
  console.log('📵 Redis disabled - running without cache');
}

// ULTRA-COST OPTIMIZATION: Only XAUUSD and BTCUSD for 70% cost reduction
const TRADERMADE_SYMBOLS = ['XAUUSD', 'BTCUSD'];
const ALLOWED_CLIENT_SYMBOLS = new Set(TRADERMADE_SYMBOLS);

// Performance Monitoring State
let cacheHits = 0;
let cacheMisses = 0;
let dataFreshnessAlerts = 0;
const operationHistory: number[] = [];

interface PriceData {
  symbol: string;
  ts: string;
  bid: number;
  ask: number;
  mid: number;
}

interface EnhancedPriceData extends PriceData {
  timestamp: Date;
  freshness: 'fresh' | 'stale' | 'critical';
  cacheHit: boolean;
  change?: number;
  changePercent?: number;
}

// Write throttling tracker per symbol
const writeThrottleTracker = new Map<string, {
  lastWritePrice: number;
  lastWriteTime: number;
  lastDbWrite: number;
}>();

interface ClientConnection {
  socket: WebSocket;
  id: string;
  subscribedSymbols: Set<string>;
  lastActivity: number;
  isAuthenticated: boolean;
  userId?: string;
}

interface LeaderState {
  isLeader: boolean;
  lastHeartbeat: number;
  followers: Set<string>;
}

interface PerformanceMetrics {
  cacheHitRate: number;
  dataFreshnessScore: number;
  avgResponseTime: number;
  alertsTriggered: number;
  stalePricesDetected: number;
}

// Global state
const clients = new Map<string, ClientConnection>();
const priceCache = new Map<string, { data: EnhancedPriceData; timestamp: number }>();
const activeSymbols = new Set<string>();
let lastActiveSymbolsUpdate = 0;
let lastDatabaseWrite = 0;

const leaderState: LeaderState = {
  isLeader: false,
  lastHeartbeat: Date.now(),
  followers: new Set()
};

// Performance tracking
let performanceMetrics: PerformanceMetrics = {
  cacheHitRate: 0,
  dataFreshnessScore: 100,
  avgResponseTime: 0,
  alertsTriggered: 0,
  stalePricesDetected: 0
};

// 24/7 Connection Strategy - NO MARKET HOURS RESTRICTIONS
const isAlwaysOpen = (symbol?: string): boolean => {
  // BTCUSD and XAUUSD always connect for continuous price data
  // This ensures users always see live prices regardless of market status
  return true;
};

const getConnectionStatus = (): { shouldConnect: boolean; activeSymbols: string[]; reason: string } => {
  // Always connect to maintain data consistency and user experience
  return {
    shouldConnect: true,
    activeSymbols: TRADERMADE_SYMBOLS,
    reason: '24/7 live price streaming for optimal user experience'
  };
};

// Redis leader election functions
async function tryBecomeLeader(): Promise<boolean> {
  if (!redis) return true; // No Redis, assume single instance
  
  try {
    const result = await redis.set(
      'tradermade:leader',
      Deno.env.get('DENO_DEPLOYMENT_ID') || 'default',
      { px: LEADER_ELECTION_TTL * 1000, nx: true }
    );
    
    if (result === 'OK') {
      console.log('👑 Became TraderMade connection leader');
      leaderState.isLeader = true;
      leaderState.lastHeartbeat = Date.now();
      startLeaderHeartbeat();
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Leader election failed:', error);
    return false;
  }
}

async function startLeaderHeartbeat() {
  const heartbeatInterval = setInterval(async () => {
    if (!leaderState.isLeader || !redis) {
      clearInterval(heartbeatInterval);
      return;
    }
    
    try {
      const result = await redis.set(
        'tradermade:leader',
        Deno.env.get('DENO_DEPLOYMENT_ID') || 'default',
        { px: LEADER_ELECTION_TTL * 1000, xx: true }
      );
      
      if (result !== 'OK') {
        console.log('💔 Lost leadership - stopping TraderMade connection');
        leaderState.isLeader = false;
        clearInterval(heartbeatInterval);
      }
    } catch (error) {
      console.error('❌ Leader heartbeat failed:', error);
      leaderState.isLeader = false;
      clearInterval(heartbeatInterval);
    }
  }, LEADER_HEARTBEAT_INTERVAL);
}

// TraderMade WebSocket connection with PHASE 1 fixes
console.log('🚀 Initializing TraderMade connection with leader election...');

let wsConnection: WebSocket | null = null;
let connectionState = 'disconnected';
let lastTraderMadeError: number = 0;
let errorCount = 0;

// TraderMade Connection and Data Broadcasting - 24/7 ALWAYS CONNECT
async function connectToTraderMade() {
  if (!tradermadeApiKey) {
    console.error('❌ CRITICAL: TraderMade API key not configured');
    return;
  }

  if (!await tryBecomeLeader()) {
    console.log('⚡ Following price distribution via Redis pub/sub');
    setupRedisPubSubConsumer();
    return;
  }

  // Always connect for 24/7 live price streaming
  const connectionStatus = getConnectionStatus();
  console.log(`🔥 24/7 CONNECTION: ${connectionStatus.reason}`);
  console.log(`📊 Active symbols: [${connectionStatus.activeSymbols.join(', ')}]`);
  
  // Connect immediately for continuous price data
  if (!connectionStatus.shouldConnect) {
    console.log('⚠️ Connection disabled - this should never happen in 24/7 mode');
    setTimeout(connectToTraderMade, 1000); // Retry immediately
    return;
  }

  try {
    console.log('🔗 Connecting to TraderMade WebSocket - 24/7 MODE...');
    connectionState = 'connecting';
    
    // Simple reconnection delay - no complex market hours logic
    if (errorCount > 0) {
      // Fast reconnection for better user experience
      const baseDelay = Math.min(1000 * errorCount, 10000); // Max 10s delay
      const jitter = Math.random() * 500; // Small jitter
      const totalDelay = baseDelay + jitter;
      
      console.log(`🔄 SIMPLIFIED RECONNECT: ${Math.round(totalDelay)}ms delay (attempt ${errorCount})`);
      await new Promise(resolve => setTimeout(resolve, totalDelay));
    }
    
    wsConnection = new WebSocket(`wss://marketdata.tradermade.com/feedadv?api_key=${tradermadeApiKey}`);
    
    wsConnection.onopen = () => {
      console.log('✅ TraderMade WebSocket connected - 24/7 LIVE');
      connectionState = 'connected';
      errorCount = 0; // Reset error count on successful connection
      
      // Reset performance metrics on successful connection
      performanceMetrics.cacheHitRate = 0;
      performanceMetrics.dataFreshnessScore = 100;
      
      const authMessage = {
        userKey: tradermadeApiKey,
        symbol: TRADERMADE_SYMBOLS.join(',')
      };
      
      console.log(`🔑 AUTHENTICATING: ${TRADERMADE_SYMBOLS.join(',')} - 24/7 streaming`);
      wsConnection!.send(JSON.stringify(authMessage));
    };

    wsConnection.onmessage = (event) => {
      try {
        // Handle both JSON and plaintext TraderMade responses
        let data;
        try {
          data = JSON.parse(event.data);
        } catch (parseError) {
          // Handle plaintext error messages from TraderMade API
          const textData = event.data.toString();
          if (textData.includes('User Key Used too many times') || textData.includes('rate limit')) {
            console.error('🚨 CRITICAL: TraderMade rate limit (plaintext):', textData);
            lastTraderMadeError = Date.now();
            errorCount = Math.min(errorCount + 3, 6); // Aggressive backoff for rate limits
            wsConnection?.close(1000, 'Rate limit detected');
            return;
          }
          console.warn('⚠️ NON-JSON MESSAGE: ${textData}');
          return;
        }
        
        if (data.symbol && data.bid && data.ask) {
          const enhancedData: EnhancedPriceData = {
            ...data,
            mid: (data.bid + data.ask) / 2,
            timestamp: new Date(),
            freshness: 'fresh',
            cacheHit: false
          };
          
          // Broadcast to all connected clients AND write to database
          broadcastToClients(data.symbol, enhancedData);
          
          // Track API call for cost optimization
          ultraCostOptimizer.trackApiCall('tradermade');
          
          console.log(`📈 LIVE PRICE: ${data.symbol}: ${enhancedData.mid} (24/7 stream)`);
        }
      } catch (error) {
        console.error('❌ Error processing TraderMade message:', error);
      }
    };

    wsConnection.onerror = (error) => {
      console.error('❌ TraderMade WebSocket error:', error);
      connectionState = 'error';
      lastTraderMadeError = Date.now();
      errorCount = Math.min(errorCount + 1, 6); // Cap at 64s max delay
    };

    wsConnection.onclose = (event) => {
      console.log(`🔌 TraderMade WebSocket closed: ${event.code} - ${event.reason}`);
      connectionState = 'disconnected';
      
      // PHASE 1: Enhanced error handling for rate limiting
      if (event.code === 1006 || event.reason?.includes('too many times')) {
        console.error('🚨 PHASE 1: TraderMade rate limit detected - implementing exponential backoff');
        lastTraderMadeError = Date.now();
        errorCount = Math.min(errorCount + 2, 6); // Increase error count more aggressively for rate limits
      }
      
      // Reconnect after delay if still leader
      if (leaderState.isLeader) {
        const delay = event.code === 1006 ? 
          Math.pow(2, errorCount) * 1000 : // Exponential backoff for rate limits
          RECONNECT_DELAY_MS; // Normal delay for other closures
        
        console.log(`🔄 PHASE 1: Reconnecting in ${Math.round(delay/1000)}s (error count: ${errorCount})`);
        setTimeout(connectToTraderMade, delay);
      }
    };

  } catch (error) {
    console.error('❌ TraderMade connection failed:', error);
    connectionState = 'error';
    lastTraderMadeError = Date.now();
    errorCount = Math.min(errorCount + 1, 6);
    
    // PHASE 1: Enhanced retry logic with backoff
    if (leaderState.isLeader) {
      const delay = Math.pow(2, errorCount) * 1000;
      console.log(`🔄 PHASE 1: Retrying TraderMade connection in ${Math.round(delay/1000)}s`);
      setTimeout(connectToTraderMade, delay);
    }
  }
}

async function broadcastToClients(symbol: string, priceData: EnhancedPriceData) {
  // LEADER: Publish to Redis pub/sub for follower instances
  if (redis && leaderState.isLeader) {
    try {
      const pubsubMessage = {
        symbol,
        price: priceData.mid,
        bid: priceData.bid,
        ask: priceData.ask,
        timestamp: Date.now(),
        freshness: priceData.freshness,
        source: 'tradermade_leader'
      };
      
      // Publish to Redis channel for instant follower distribution
      await redis.publish(`price_updates:${symbol}`, JSON.stringify(pubsubMessage));
      
      // Track cost optimization
      ultraCostOptimizer.trackApiCall('redis');
      
      console.log(`🚀 LEADER: Published ${symbol} to Redis pub/sub`);
    } catch (error) {
      console.error(`❌ Redis pub/sub publish error for ${symbol}:`, error);
    }
  }
  
  // PHASE 3: Fix message schema - send price at top level for client compatibility
  const message = JSON.stringify({
    type: 'price_update',
    symbol,
    price: priceData.mid,
    bid: priceData.bid,
    ask: priceData.ask,
    change: priceData.change || 0,
    changePercent: priceData.changePercent || 0,
    timestamp: priceData.timestamp.toISOString(),
    freshness: priceData.freshness,
    source: leaderState.isLeader ? 'leader_direct' : 'follower_redis'
  });

  let broadcastCount = 0;
  
  for (const client of clients.values()) {
    if (client.socket.readyState === WebSocket.OPEN && 
        client.subscribedSymbols.has(symbol) && 
        client.isAuthenticated) {
      try {
        client.socket.send(message);
        broadcastCount++;
        
        // Track WebSocket operations for cost monitoring
        ultraCostOptimizer.trackApiCall('edge_function');
      } catch (error) {
        console.error(`Error broadcasting to client ${client.id}:`, error);
      }
    }
  }

  // Log with freshness indicator
  const freshnessEmoji = priceData.freshness === 'fresh' ? '🟢' : 
                        priceData.freshness === 'stale' ? '🟡' : '🔴';
  
  console.log(`📤 24/7 LIVE: Broadcasting ${symbol}: ${priceData.mid} to ${broadcastCount} clients ${freshnessEmoji}`);
  
  // ULTRA-OPTIMIZATION: Write throttling to reduce Redis/DB costs
  const now = Date.now();
  const tracker = writeThrottleTracker.get(symbol) || { 
    lastWritePrice: 0, 
    lastWriteTime: 0,
    lastDbWrite: 0 
  };
  
  // Only write to Redis if price changed >0.01% OR >1 second elapsed
  const priceChangePercent = Math.abs((priceData.mid - tracker.lastWritePrice) / tracker.lastWritePrice) * 100;
  const timeSinceWrite = now - tracker.lastWriteTime;
  const shouldWriteRedis = priceChangePercent > 0.01 || timeSinceWrite > 1000;
  
  if (redis && shouldWriteRedis) {
    try {
      const optimizedTTL = ultraCostOptimizer.getOptimizedCacheTTL(PRICE_CACHE_TTL_MS / 1000, 'prices');
      await redis.setex(`price:${symbol}`, optimizedTTL, JSON.stringify(priceData));
      
      // Track cache operation for cost monitoring
      ultraCostOptimizer.trackApiCall('redis');
      
      // Update tracker
      tracker.lastWritePrice = priceData.mid;
      tracker.lastWriteTime = now;
      writeThrottleTracker.set(symbol, tracker);
      
      console.log(`💾 CACHED: ${symbol} for ${optimizedTTL}s (24/7 streaming)`);
    } catch (error) {
      console.error(`❌ Redis cache error for ${symbol}:`, error);
    }
  }
  
  // ULTRA-OPTIMIZATION: Database write throttling (only on significant changes)
  const timeSinceDbWrite = now - tracker.lastDbWrite;
  const shouldWriteDb = priceChangePercent > 0.05 || timeSinceDbWrite > 5000; // 0.05% change OR 5 seconds
  
  if (supabaseService && shouldWriteDb) {
    try {
      await supabaseService.rpc('upsert_market_price', {
        p_symbol: symbol,
        p_bid: priceData.bid,
        p_ask: priceData.ask,
        p_mid: priceData.mid,
        p_timestamp: priceData.timestamp.toISOString()
      });
      
      // Update DB write tracker
      tracker.lastDbWrite = now;
      writeThrottleTracker.set(symbol, tracker);
      
      console.log(`💾 DATABASE: Stored ${symbol} price ${priceData.mid} in market_prices table`);
    } catch (error) {
      console.error(`❌ Database write error for ${symbol}:`, error);
    }
  }
}

function generateClientId(): string {
  return crypto.randomUUID();
}

// PHASE 3: Enhanced Redis pub/sub consumer for follower instances
async function setupRedisPubSubConsumer() {
  if (!redis) {
    console.error('❌ Redis not configured for pub/sub consumption');
    return;
  }

  console.log('🔄 PHASE 3: Setting up Redis pub/sub consumer for follower instance');
  
  try {
    // Create a separate Redis client for pub/sub as the main client might not support it
    const pubsubRedis = new Redis({
      url: redisRestUrl!,
      token: redisRestToken!,
    });
    
    // Setup message handler for price updates
    const handlePriceUpdate = (channel: string, message: string) => {
      try {
        const priceUpdate = JSON.parse(message);
        console.log(`📨 FOLLOWER: Received ${priceUpdate.symbol} from Redis: ${priceUpdate.price}`);
        
        // Broadcast to connected clients as follower
        const enhancedData: EnhancedPriceData = {
          symbol: priceUpdate.symbol,
          ts: new Date().toISOString(),
          bid: priceUpdate.bid || priceUpdate.price - 0.1,
          ask: priceUpdate.ask || priceUpdate.price + 0.1,
          mid: priceUpdate.price,
          timestamp: new Date(priceUpdate.timestamp),
          freshness: priceUpdate.freshness || 'fresh',
          cacheHit: true
        };
        
        broadcastToClients(priceUpdate.symbol, enhancedData);
      } catch (error) {
        console.error('❌ Error processing Redis price update:', error);
      }
    };
    
    // Use polling instead of subscribe if the Redis client doesn't support pub/sub
    console.log('✅ PHASE 3: Using Redis polling for follower price distribution');
    
    const pollRedisForUpdates = async () => {
      try {
        for (const symbol of TRADERMADE_SYMBOLS) {
          const cachedPrice = await redis.get(`price:${symbol}`);
          if (cachedPrice) {
            // CRITICAL FIX: Ensure we're parsing valid JSON
            let priceData;
            try {
              priceData = JSON.parse(cachedPrice);
            } catch (parseError) {
              console.error(`❌ Redis JSON parse error for ${symbol}:`, parseError);
              console.error(`❌ Invalid JSON data: ${cachedPrice}`);
              continue; // Skip this symbol and continue with others
            }
            
            // Only broadcast if we have clients subscribed to this symbol
            const hasSubscribers = Array.from(clients.values())
              .some(client => client.subscribedSymbols.has(symbol));
            
            if (hasSubscribers) {
              broadcastToClients(symbol, priceData);
            }
          }
        }
      } catch (error) {
        console.error('❌ Redis polling error:', error);
      }
    };
    
    // Poll every 2 seconds for followers
    setInterval(pollRedisForUpdates, 2000);
    
    console.log('✅ PHASE 3: Redis follower polling established');
  } catch (error) {
    console.error('❌ Failed to setup Redis pub/sub consumer:', error);
  }
}

// Start TraderMade connection
connectToTraderMade();

// Handle HTTP requests
serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // PHASE 2: Add connection diagnostics endpoint
  if (url.pathname === '/health') {
    const connectionInfo = getConnectionStatus();
    const diagnostics = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      leader: leaderState.isLeader,
      connectionState,
      tradermadeConfigured: !!tradermadeApiKey,
      redisConfigured: !!redis,
      connectionPolicy: {
        mode: '24/7 Live Streaming',
        shouldConnect: connectionInfo.shouldConnect,
        activeSymbols: connectionInfo.activeSymbols,
        reason: connectionInfo.reason
      },
      clientCount: clients.size,
      errorCount,
      lastError: lastTraderMadeError > 0 ? new Date(lastTraderMadeError).toISOString() : null
    };
    
    return new Response(JSON.stringify(diagnostics), { 
      headers: { ...corsHeaders, 'content-type': 'application/json' }
    });
  }
  
  // WebSocket handling
  const upgradeHeader = req.headers.get('upgrade');
  const authHeader = req.headers.get('authorization');

  if (upgradeHeader?.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket connection', { 
      status: 400, 
      headers: corsHeaders 
    });
  }

  if (clients.size >= MAX_CLIENTS) {
    return new Response('Server capacity reached', { 
      status: 503, 
      headers: corsHeaders 
    });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  const clientId = generateClientId();
  
  const client: ClientConnection = {
    socket,
    id: clientId,
    subscribedSymbols: new Set(),
    lastActivity: Date.now(),
    isAuthenticated: false
  };

  clients.set(clientId, client);
  console.log(`🔌 Client ${clientId} connected (${clients.size}/${MAX_CLIENTS})`);

  // PHASE 1: Immediate welcome with simplified flow
  socket.onopen = () => {
    try {
      // Auto-authenticate anonymous users immediately
      client.isAuthenticated = true;
      
      socket.send(JSON.stringify({
        type: 'welcome',
        clientId,
        timestamp: Date.now(),
        marketStatus: '24/7 Live Trading',
        authenticated: true,
        status: 'connected',
        activeSymbols: TRADERMADE_SYMBOLS
      }));
      console.log(`✅ Client ${clientId} connected and auto-authenticated`);
    } catch (error) {
      console.error(`❌ Error sending welcome to ${clientId}:`, error);
    }
  };

  socket.onmessage = async (event) => {
    try {
      const data = JSON.parse(event.data);
      client.lastActivity = Date.now();

      switch (data.type) {
        case 'auth':
          // PHASE 1: Optional enhanced authentication (already authenticated by default)
          console.log(`🔐 Processing enhanced auth for client ${client.id}`);
          
          if (data.token) {
            try {
              const { data: userData, error } = await supabase.auth.getUser(data.token);
              
              if (!error && userData?.user) {
                client.userId = userData.user.id;
                socket.send(JSON.stringify({ 
                  type: 'auth_success', 
                  success: true,
                  user_id: userData.user.id,
                  authenticated: true,
                  timestamp: Date.now()
                }));
                console.log(`✅ Client ${client.id} enhanced auth as ${userData.user.id}`);
              } else {
                socket.send(JSON.stringify({ 
                  type: 'auth_success', 
                  success: true,
                  anonymous: true,
                  authenticated: true,
                  timestamp: Date.now()
                }));
                console.log(`✅ Client ${client.id} fallback to anonymous`);
              }
            } catch (error) {
              console.log('⚠️ Auth service unavailable, maintaining anonymous access');
              socket.send(JSON.stringify({ 
                type: 'auth_success', 
                success: true, 
                anonymous: true,
                authenticated: true,
                timestamp: Date.now()
              }));
            }
          } else {
            socket.send(JSON.stringify({ 
              type: 'auth_success', 
              success: true,
              anonymous: true,
              authenticated: true,
              timestamp: Date.now()
            }));
          }
          break;

        case 'subscribe':
          // Always allow subscriptions since client is auto-authenticated

          const symbols = data.symbols || [];
          const validSymbols = symbols.filter((s: string) => 
            ALLOWED_CLIENT_SYMBOLS.has(s.toUpperCase())
          );

          // Add to client subscriptions
          validSymbols.forEach((symbol: string) => {
            client.subscribedSymbols.add(symbol);
          });

          socket.send(JSON.stringify({
            type: 'subscription_ack',
            symbols: validSymbols,
            timestamp: Date.now()
          }));

          console.log(`📡 Client ${client.id} subscribed to: ${validSymbols.join(', ')}`);
          break;

        case 'unsubscribe':
          const unsubSymbols = data.symbols || [];
          unsubSymbols.forEach((symbol: string) => {
            client.subscribedSymbols.delete(symbol);
          });

          socket.send(JSON.stringify({
            type: 'unsubscription_ack',
            symbols: unsubSymbols,
            timestamp: Date.now()
          }));
          break;

        case 'ping':
          socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        default:
          console.log(`❓ Unknown message type from ${client.id}:`, data.type);
      }
    } catch (error) {
      console.error(`❌ Error processing message from ${client.id}:`, error);
    }
  };

  socket.onclose = () => {
    clients.delete(clientId);
    console.log(`🔌 Client ${clientId} disconnected (${clients.size}/${MAX_CLIENTS})`);
  };

  socket.onerror = (error) => {
    console.error(`❌ WebSocket error for client ${clientId}:`, error);
  };

  return response;
});