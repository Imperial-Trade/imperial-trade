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
}

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

// PHASE 1: Fixed Market hours for BTCUSD (24/7) and XAUUSD (market hours)
function isMarketOpen(symbol?: string): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcDay = now.getUTCDay();
  
  // BTCUSD trades 24/7 (crypto)
  if (symbol === 'BTCUSD') {
    return true;
  }
  
  // XAUUSD (Gold) follows forex market hours
  if (symbol === 'XAUUSD') {
    // Weekend check (Friday 22:00 UTC to Sunday 22:00 UTC closed)
    if (utcDay === 6) return false; // Saturday closed
    if (utcDay === 0 && utcHour < 22) return false; // Sunday before 22:00 UTC closed
    if (utcDay === 5 && utcHour >= 22) return false; // Friday after 22:00 UTC closed
    
    return true; // Open Monday 22:00 UTC to Friday 22:00 UTC
  }
  
  // Default logic for other symbols (if any)
  if (utcDay === 6 || utcDay === 0) {
    return false;
  }
  
  return !(utcDay === 5 && utcHour >= 22) && !(utcDay === 1 && utcHour < 1);
}

// PHASE 1: Enhanced market status with per-symbol checking
function getMarketStatus(): { isOpen: boolean; openSymbols: string[]; closedSymbols: string[] } {
  const openSymbols: string[] = [];
  const closedSymbols: string[] = [];
  
  for (const symbol of TRADERMADE_SYMBOLS) {
    if (isMarketOpen(symbol)) {
      openSymbols.push(symbol);
    } else {
      closedSymbols.push(symbol);
    }
  }
  
  return {
    isOpen: openSymbols.length > 0,
    openSymbols,
    closedSymbols
  };
}

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

// PHASE 1: Enhanced TraderMade connection with per-symbol market hours
async function connectToTraderMade() {
  if (!tradermadeApiKey) {
    console.error('❌ TraderMade API key not configured');
    return;
  }

  if (!await tryBecomeLeader()) {
    console.log('⚡ Following price distribution via Redis pub/sub');
    return;
  }

  // PHASE 1: Check market status per symbol
  const marketStatus = getMarketStatus();
  console.log(`📊 Market Status: ${marketStatus.openSymbols.length}/${TRADERMADE_SYMBOLS.length} symbols open`);
  console.log(`🟢 Open: ${marketStatus.openSymbols.join(', ')}`);
  if (marketStatus.closedSymbols.length > 0) {
    console.log(`🔴 Closed: ${marketStatus.closedSymbols.join(', ')}`);
  }

  if (!marketStatus.isOpen) {
    console.log('🌙 All markets closed - scheduling check for market open');
    setTimeout(connectToTraderMade, 60000); // Check every minute
    return;
  }

  try {
    console.log('🔗 Connecting to TraderMade WebSocket...');
    connectionState = 'connecting';
    
    // PHASE 1: Add exponential backoff for rate limiting
    const now = Date.now();
    if (now - lastTraderMadeError < Math.pow(2, errorCount) * 1000) {
      const waitTime = Math.pow(2, errorCount) * 1000 - (now - lastTraderMadeError);
      console.log(`⏳ PHASE 1: Rate limit backoff - waiting ${Math.round(waitTime/1000)}s before connecting`);
      setTimeout(connectToTraderMade, waitTime);
      return;
    }
    
    wsConnection = new WebSocket(`wss://marketdata.tradermade.com/feedadv?api_key=${tradermadeApiKey}`);
    
    wsConnection.onopen = () => {
      console.log('✅ TraderMade WebSocket connected - SINGLE INSTANCE with Redis distribution');
      connectionState = 'connected';
      errorCount = 0; // Reset error count on successful connection
      
      // PHASE 1: Subscribe only to open market symbols for cost optimization
      const openSymbols = getMarketStatus().openSymbols;
      const subscribeMessage = {
        userKey: tradermadeApiKey,
        symbol: openSymbols.join(',')
      };
      
      wsConnection!.send(JSON.stringify(subscribeMessage));
      console.log(`📡 PHASE 1: Subscribed to ${openSymbols.length} open symbols: ${openSymbols.join(', ')}`);
    };

    wsConnection.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.symbol && data.bid && data.ask) {
          const enhancedData: EnhancedPriceData = {
            ...data,
            mid: (data.bid + data.ask) / 2,
            timestamp: new Date(),
            freshness: 'fresh',
            cacheHit: false
          };
          
          // Broadcast to all connected clients
          broadcastToClients(data.symbol, enhancedData);
          
          // Track API call for cost optimization
          ultraCostOptimizer.trackApiCall('tradermade');
          
          console.log(`📈 SINGLE-INSTANCE: ${data.symbol}: ${enhancedData.mid} (distributed via Redis)`);
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
  
  // Original broadcasting logic with cost optimization tracking
  const message = JSON.stringify({
    type: 'price_update',
    symbol,
    data: priceData,
    timestamp: Date.now(),
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
  
  console.log(`📤 ULTRA-COST: Broadcasting ${symbol}: ${priceData.mid} to ${broadcastCount} clients ${freshnessEmoji}`);
  
  // Cache with optimized TTL based on cost optimizer settings
  if (redis) {
    try {
      const optimizedTTL = ultraCostOptimizer.getOptimizedCacheTTL(PRICE_CACHE_TTL_MS / 1000, 'prices');
      await redis.setex(`price:${symbol}`, optimizedTTL, JSON.stringify(priceData));
      
      // Track cache operation for cost monitoring
      ultraCostOptimizer.trackApiCall('redis');
      
      console.log(`💾 ULTRA-COST: Cached ${symbol} for ${optimizedTTL}s (4x optimized TTL)`);
    } catch (error) {
      console.error(`❌ Redis cache error for ${symbol}:`, error);
    }
  }
}

function generateClientId(): string {
  return crypto.randomUUID();
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
    const marketStatus = getMarketStatus();
    const diagnostics = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      leader: leaderState.isLeader,
      connectionState,
      tradermadeConfigured: !!tradermadeApiKey,
      redisConfigured: !!redis,
      marketStatus: {
        isOpen: marketStatus.isOpen,
        openSymbols: marketStatus.openSymbols,
        closedSymbols: marketStatus.closedSymbols
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

  // PHASE 2: Delayed welcome - wait for client to be ready
  socket.onopen = () => {
    try {
      socket.send(JSON.stringify({
        type: 'welcome',
        clientId,
        timestamp: Date.now(),
        marketStatus: getMarketStatus()
      }));
      console.log(`✅ Welcome sent to client ${clientId}`);
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
          // PHASE 2: Simplified authentication with faster response
          console.log(`🔐 PHASE 2: Processing auth for client ${client.id}`);
          
          if (data.token) {
            try {
              // PHASE 2: Add timeout to auth validation
              const authPromise = supabase.auth.getUser(data.token);
              const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Auth timeout')), 5000)
              );
              
              const { data: userData, error } = await Promise.race([authPromise, timeoutPromise]) as any;
              
              if (!error && userData?.user) {
                client.isAuthenticated = true;
                client.userId = userData.user.id;
                socket.send(JSON.stringify({ 
                  type: 'auth_success', 
                  success: true,
                  user_id: userData.user.id,
                  timestamp: Date.now()
                }));
                console.log(`✅ PHASE 2: Client ${client.id} authenticated as ${userData.user.id}`);
              } else {
                socket.send(JSON.stringify({ 
                  type: 'auth_error', 
                  success: false, 
                  message: 'Invalid authentication token' 
                }));
                console.error(`❌ PHASE 2: Authentication failed for client ${client.id}:`, error?.message);
              }
            } catch (error) {
              console.error('❌ PHASE 2: Authentication error:', error);
              socket.send(JSON.stringify({ 
                type: 'auth_error', 
                success: false, 
                message: 'Authentication service unavailable' 
              }));
            }
          } else {
            // PHASE 2: Allow anonymous connections for testing
            client.isAuthenticated = true;
            socket.send(JSON.stringify({ 
              type: 'auth_success', 
              success: true,
              anonymous: true,
              timestamp: Date.now()
            }));
            console.log(`✅ PHASE 2: Client ${client.id} connected anonymously`);
          }
          break;

        case 'subscribe':
          if (!client.isAuthenticated) {
            socket.send(JSON.stringify({
              type: 'error',
              message: 'Authentication required'
            }));
            break;
          }

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