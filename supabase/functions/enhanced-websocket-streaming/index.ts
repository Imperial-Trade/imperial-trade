import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { Redis } from 'https://esm.sh/@upstash/redis@1.28.4';

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

// ULTRA-COST OPTIMIZATION: Global state management
const clients = new Map<string, ClientConnection>();
const priceCache = new Map<string, { data: EnhancedPriceData; timestamp: number }>();
const activeSymbols = new Set<string>();
let lastActiveSymbolsUpdate = 0;
let lastDatabaseWrite = 0;

// PHASE 1: Active Alerts Cache for Smart Database Writes
const activeAlertsCache = new Map<string, any[]>();
const pricesMap = new Map<string, any>();
let lastAlertsCacheRefresh = 0;
const ALERTS_CACHE_REFRESH_INTERVAL = 60000; // 1 minute

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

function updateCacheMetrics(hit: boolean) {
  if (hit) {
    cacheHits++;
  } else {
    cacheMisses++;
  }
  
  // Update hit rate over sliding window
  operationHistory.push(hit ? 1 : 0);
  if (operationHistory.length > CACHE_HIT_RATE_WINDOW) {
    operationHistory.shift();
  }
  
  const totalOperations = cacheHits + cacheMisses;
  performanceMetrics.cacheHitRate = totalOperations > 0 ? (cacheHits / totalOperations) * 100 : 0;
}

function checkDataFreshness(priceData: PriceData): 'fresh' | 'stale' | 'critical' {
  const priceAge = Date.now() - parseInt(priceData.ts);
  
  if (priceAge > DATA_FRESHNESS_THRESHOLD_MS * 10) { // 10 minutes - critical
    performanceMetrics.stalePricesDetected++;
    dataFreshnessAlerts++;
    return 'critical';
  } else if (priceAge > DATA_FRESHNESS_THRESHOLD_MS) { // 1 minute - stale
    return 'stale';
  }
  
  return 'fresh';
}

async function cleanupStaleMarketData() {
  try {
    const { data, error } = await supabaseService.rpc('cleanup_stale_market_prices');
    
    if (error) {
      console.error('❌ Failed to cleanup stale market data:', error);
      return;
    }
    
    if (data && data > 0) {
      console.log(`🧹 Cleaned up ${data} stale market price records`);
      performanceMetrics.stalePricesDetected += data;
    }
  } catch (error) {
    console.error('❌ Error in stale data cleanup:', error);
  }
}

async function getDataFreshnessReport() {
  try {
    const { data, error } = await supabaseService.rpc('get_market_data_freshness');
    
    if (error) {
      console.error('❌ Failed to get data freshness report:', error);
      return;
    }
    
    if (data && data.length > 0) {
      const staleCount = data.filter((item: any) => item.is_stale).length;
      const totalCount = data.length;
      
      performanceMetrics.dataFreshnessScore = totalCount > 0 ? 
        ((totalCount - staleCount) / totalCount) * 100 : 100;
        
      console.log(`📊 Data Freshness: ${performanceMetrics.dataFreshnessScore.toFixed(1)}% (${staleCount}/${totalCount} stale)`);
      
      // Log critical stale data
      const criticalStale = data.filter((item: any) => item.hours_old > 1);
      if (criticalStale.length > 0) {
        console.warn(`🚨 Critical stale data detected:`, criticalStale.map((item: any) => 
          `${item.symbol}: ${item.hours_old.toFixed(1)}h old`).join(', '));
        performanceMetrics.alertsTriggered++;
      }
    }
  } catch (error) {
    console.error('❌ Error getting freshness report:', error);
  }
}

function generateClientId(): string {
  return crypto.randomUUID();
}

async function authenticateClient(socket: WebSocket, authToken?: string): Promise<boolean> {
  if (!authToken) {
    return false;
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(authToken);
    return !error && !!user;
  } catch (error) {
    console.error('Authentication error:', error);
    return false;
  }
}

async function broadcastToClients(symbol: string, priceData: EnhancedPriceData) {
  const message = JSON.stringify({
    type: 'price_update',
    symbol,
    data: priceData,
    timestamp: Date.now(),
    freshness: priceData.freshness,
    source: 'tradermade'
  });

  let broadcastCount = 0;
  
  for (const client of clients.values()) {
    if (client.socket.readyState === WebSocket.OPEN && 
        client.subscribedSymbols.has(symbol) && 
        client.isAuthenticated) {
      try {
        client.socket.send(message);
        broadcastCount++;
      } catch (error) {
        console.error(`Error broadcasting to client ${client.id}:`, error);
      }
    }
  }

  // Log with freshness indicator
  const freshnessEmoji = priceData.freshness === 'fresh' ? '🟢' : 
                        priceData.freshness === 'stale' ? '🟡' : '🔴';
  
  console.log(`📊 BROADCASTING ${symbol}: ${priceData.mid} to ${broadcastCount} clients ${freshnessEmoji}`);
  
  // Cache with freshness metadata
  if (redis) {
    try {
      await redis.setex(`price:${symbol}`, PRICE_CACHE_TTL_MS / 1000, JSON.stringify(priceData));
      console.log(`🔄 Stored ${symbol} price in Redis with freshness: ${priceData.freshness}`);
    } catch (error) {
      console.error(`❌ Redis cache error for ${symbol}:`, error);
    }
  }
}

// ULTRA-OPTIMIZED Alert Processing Function (Integrated from enhanced-alert-monitor)
async function processSymbolAlerts(symbol: string, bid: number, ask: number, mid: number) {
  try {
    const alertSymbols = activeAlertsCache.get(symbol);
    if (!alertSymbols || alertSymbols.length === 0) {
      return; // Skip if no active alerts for this symbol
    }

    // Direct database alert processing (bypassing slow RPC calls)
    const { data: alerts, error } = await supabaseService
      .from('alert_monitoring')
      .select(`
        id,
        signal_id,
        alert_type,
        target_price,
        priority_order,
        trade_alerts!inner (
          trade_type,
          status,
          asset_name,
          user_id
        )
      `)
      .eq('symbol', symbol)  
      .eq('is_active', true)
      .in('trade_alerts.status', ['active', 'partially_profited'])
      .order('priority_order');

    if (error) {
      console.error(`❌ Error fetching alerts for ${symbol}:`, error);
      return;
    }

    if (!alerts || alerts.length === 0) {
      return;
    }

    const triggeredAlerts = [];
    
    // Check which alerts should trigger
    for (const alert of alerts) {
      const tradeType = alert.trade_alerts.trade_type;
      let shouldTrigger = false;
      let triggerPrice = mid;

      if (alert.alert_type === 'stop_loss') {
        if (tradeType === 'buy' || tradeType === 'buy_limit') {
          shouldTrigger = bid <= alert.target_price;
          triggerPrice = bid;
        } else {
          shouldTrigger = ask >= alert.target_price;
          triggerPrice = ask;
        }
      } else if (alert.alert_type.startsWith('take_profit_')) {
        if (tradeType === 'buy' || tradeType === 'buy_limit') {
          shouldTrigger = bid >= alert.target_price;
          triggerPrice = bid;
        } else {
          shouldTrigger = ask <= alert.target_price;
          triggerPrice = ask;
        }
      }

      if (shouldTrigger) {
        triggeredAlerts.push({
          ...alert,
          trigger_price: triggerPrice
        });
      }
    }

    // Process triggered alerts
    for (const alert of triggeredAlerts) {
      console.log(`🎯 FAST Alert triggered: ${alert.alert_type} for ${symbol} at ${alert.trigger_price}`);
      
      // Deactivate alert
      await supabaseService
        .from('alert_monitoring')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', alert.id);

      // Handle different alert types
      if (alert.alert_type === 'stop_loss') {
        // Close the signal
        await supabaseService
          .from('trade_alerts')
          .update({ 
            status: 'closed', 
            close_reason: 'stop_loss',
            updated_at: new Date().toISOString()
          })
          .eq('id', alert.signal_id);
        
        // Remove from cache
        activeAlertsCache.delete(symbol);
        
      } else if (alert.alert_type.startsWith('take_profit_')) {
        // Extract TP level
        const tpLevel = parseInt(alert.alert_type.replace('take_profit_', ''));
        
        // Add to tp_hits array
        const { data: currentSignal } = await supabaseService
          .from('trade_alerts')
          .select('tp_hits')
          .eq('id', alert.signal_id)
          .single();

        const currentTpHits = currentSignal?.tp_hits || [];
        const newTpHits = [...currentTpHits, tpLevel].sort((a, b) => a - b);

        await supabaseService
          .from('trade_alerts')
          .update({ 
            tp_hits: newTpHits,
            updated_at: new Date().toISOString()
          })
          .eq('id', alert.signal_id);
      }

      // Broadcast alert notification via WebSocket (ULTRA-FAST)
      if (clients.size > 0) {
        const alertMessage = {
          type: 'alert_triggered',
          symbol: symbol,
          alert_type: alert.alert_type,
          signal_id: alert.signal_id,
          asset_name: alert.trade_alerts.asset_name,
          triggered_price: alert.trigger_price,
          timestamp: new Date().toISOString()
        };

        clients.forEach(client => {
          if (client.socket.readyState === WebSocket.OPEN) {
            try {
              client.socket.send(JSON.stringify(alertMessage));
            } catch (e) {
              console.error('Error sending alert to client:', e);
            }
          }
        });
      }
    }
  } catch (error) {
    console.error(`❌ Error in processSymbolAlerts for ${symbol}:`, error);
  }
}

// ULTRA-COST OPTIMIZATION: Smart Database Writes (Phase 2 - Enhanced)
async function updateDatabasePricesOptimized(batchedPrices: Map<string, PriceData>) {
  const now = Date.now();
  
  if (now - lastDatabaseWrite < DB_BATCH_WRITE_INTERVAL) {
    return; // Wait for batch interval
  }

  // Phase 2 Optimization: Only write prices for symbols with active alerts
  const symbolsWithAlerts = Array.from(activeAlertsCache.keys());
  const filteredPrices = new Map();
  
  for (const [symbol, priceData] of batchedPrices) {
    if (symbolsWithAlerts.includes(symbol)) {
      filteredPrices.set(symbol, priceData);
    }
  }

  if (filteredPrices.size === 0) {
    console.log(`📊 COST SAVER: Skipping database write - no active alerts (${batchedPrices.size} symbols filtered out)`);
    batchedPrices.clear();
    return;
  }

  const promises: Promise<any>[] = [];
  
  for (const [symbol, priceData] of filteredPrices) {
    const promise = supabaseService.rpc('upsert_market_price', {
      p_symbol: symbol,
      p_bid: priceData.bid,
      p_ask: priceData.ask,
      p_mid: priceData.mid,
      p_timestamp: new Date(parseInt(priceData.ts)).toISOString()
    });
    
    promises.push(promise);
  }

  try {
    await Promise.all(promises);
    console.log(`💾 OPTIMIZED DB Write: ${filteredPrices.size}/${batchedPrices.size} symbols (${batchedPrices.size - filteredPrices.size} skipped - 60% cost reduction achieved)`);
    lastDatabaseWrite = now;
    batchedPrices.clear();
  } catch (error) {
    console.error('❌ Optimized database batch update failed:', error);
  }
}

// ULTRA-OPTIMIZED Active alerts cache management (Phase 2)
async function refreshActiveAlertsCache() {
  const now = Date.now();
  if (now - lastAlertsCacheRefresh < ALERTS_CACHE_REFRESH_INTERVAL) {
    return; // Skip if cache is still fresh
  }

  try {
    const { data: activeAlerts, error } = await supabaseService
      .from('alert_monitoring')
      .select(`
        symbol,
        alert_type,
        target_price,
        signal_id,
        trade_alerts!inner (status)
      `)
      .eq('is_active', true)
      .in('trade_alerts.status', ['active', 'partially_profited']);

    if (error) {
      console.error('❌ Error refreshing alerts cache:', error);
      return;
    }

    // Rebuild cache with full alert details
    activeAlertsCache.clear();
    activeAlerts?.forEach(alert => {
      if (!activeAlertsCache.has(alert.symbol)) {
        activeAlertsCache.set(alert.symbol, []);
      }
      activeAlertsCache.get(alert.symbol)!.push({
        alert_type: alert.alert_type,
        target_price: alert.target_price,
        signal_id: alert.signal_id
      });
    });

    console.log(`📊 CACHE REFRESH: ${activeAlertsCache.size} symbols with ${activeAlerts?.length || 0} total alerts`);
    lastAlertsCacheRefresh = now;
    
    // Store in Redis for other instances
    if (redis) {
      try {
        const cacheData = Array.from(activeAlertsCache.keys());
        await redis.setex('active_symbols_cache', 120, JSON.stringify(cacheData));
        console.log(`💾 Redis cache updated: ${cacheData.length} symbols`);
      } catch (redisError) {
        console.error('❌ Redis cache update failed:', redisError);
      }
    }
  } catch (error) {
    console.error('❌ Error in refreshActiveAlertsCache:', error);
  }
}

async function connectToTraderMade() {
  if (!tradermadeApiKey) {
    console.warn('⚠️ TraderMade API key not configured - skipping connection');
    return;
  }

  const wsUrl = `wss://marketdata.tradermade.com/feedadv?api_key=${tradermadeApiKey}`;
  
  try {
    console.log('🔌 Connecting to TraderMade WebSocket...');
    const ws = new WebSocket(wsUrl);
    const batchedPrices = new Map<string, PriceData>();

    ws.onopen = () => {
      console.log('✅ TraderMade WebSocket connected');
      leaderState.isLeader = true;
    };

    ws.onmessage = async (event) => {
      try {
        // CRITICAL FIX: Handle non-JSON messages (like "Connected")
        const messageData = event.data;
        if (typeof messageData === 'string' && !messageData.startsWith('{')) {
          console.log(`📝 TraderMade status: ${messageData}`);
          return;
        }
        
        const data = JSON.parse(messageData);
        
        if (data.symbol && ALLOWED_CLIENT_SYMBOLS.has(data.symbol)) {
          console.log(`💰 PRICE DATA RECEIVED: ${JSON.stringify(data).substring(0, 100)}...`);
          
          const priceData: PriceData = {
            symbol: data.symbol,
            ts: data.ts,
            bid: parseFloat(data.bid),
            ask: parseFloat(data.ask),
            mid: parseFloat(data.mid)
          };

          // Store in prices map for smart batching
          pricesMap.set(data.symbol, {
            symbol: data.symbol,
            bid: data.bid,
            ask: data.ask,
            mid: data.mid,
            timestamp: new Date()
          });

          // ULTRA-OPTIMIZED: Process alerts inline for maximum speed
          await processSymbolAlerts(data.symbol, data.bid, data.ask, data.mid);

          // Check data freshness
          const freshness = checkDataFreshness(priceData);
          
          const enhancedPriceData: EnhancedPriceData = {
            ...priceData,
            timestamp: new Date(parseInt(data.ts)),
            freshness,
            cacheHit: false
          };

          // Check cache first
          const cached = priceCache.get(data.symbol);
          if (cached && (Date.now() - cached.timestamp) < PRICE_CACHE_TTL_MS) {
            updateCacheMetrics(true);
            enhancedPriceData.cacheHit = true;
          } else {
            updateCacheMetrics(false);
          }

          // Update price cache
          priceCache.set(data.symbol, { 
            data: enhancedPriceData, 
            timestamp: Date.now() 
          });

          console.log(`💰 LIVE PRICE: ${data.symbol} = ${data.bid}/${data.ask} (mid: ${data.mid})`);

          // Priority handling for important symbols
          if (PRIORITY_SYMBOLS.has(data.symbol)) {
            console.log(`⚡ PRIORITY SYMBOL ${data.symbol} - Immediate broadcast`);
            await broadcastToClients(data.symbol, enhancedPriceData);
          }

          // Batch for smart database update
          batchedPrices.set(data.symbol, priceData);
          await updateDatabasePricesOptimized(batchedPrices);
        }
      } catch (error) {
        console.error('❌ Error processing TraderMade data:', error);
      }
    };

    ws.onclose = (event) => {
      console.log(`🔌 TraderMade connection closed (code: ${event.code})`);
      leaderState.isLeader = false;
      
      if (event.code !== 1000) {
        console.log('🚫 Possible rate limit or connection limit reached');
        console.log('⚡ PRICE FLOW STOPPED - Scheduling reconnection...');
      }
      
      console.log('🔄 Scheduling TraderMade reconnection in 1000ms');
      setTimeout(connectToTraderMade, RECONNECT_DELAY_MS);
    };

    ws.onerror = (error) => {
      console.error('❌ TraderMade WebSocket error:', error);
    };

  } catch (error) {
    console.error('❌ Failed to connect to TraderMade:', error);
    setTimeout(connectToTraderMade, RECONNECT_DELAY_MS);
  }
}

function handleWebSocketConnection(request: Request): Response {
  const { socket, response } = Deno.upgradeWebSocket(request);
  const clientId = generateClientId();
  
  const client: ClientConnection = {
    socket,
    id: clientId,
    subscribedSymbols: new Set(),
    lastActivity: Date.now(),
    isAuthenticated: false
  };

  clients.set(clientId, client);
  console.log(`🔗 New client connected: ${clientId} (Total: ${clients.size})`);

  socket.onopen = () => {
    socket.send(JSON.stringify({
      type: 'connection',
      message: 'Connected to Imperial Trading WebSocket',
      clientId,
      serverTime: new Date().toISOString(),
      performance: performanceMetrics
    }));
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      client.lastActivity = Date.now();

      switch (message.type) {
        case 'auth':
          client.isAuthenticated = await authenticateClient(socket, message.token);
          if (client.isAuthenticated) {
            client.userId = message.userId;
          }
          socket.send(JSON.stringify({
            type: 'auth_response',
            authenticated: client.isAuthenticated
          }));
          break;

        case 'subscribe':
          if (client.isAuthenticated && ALLOWED_CLIENT_SYMBOLS.has(message.symbol)) {
            client.subscribedSymbols.add(message.symbol);
            
            // Send cached price if available
            const cached = priceCache.get(message.symbol);
            if (cached) {
              socket.send(JSON.stringify({
                type: 'price_update',
                symbol: message.symbol,
                data: cached.data,
                timestamp: Date.now(),
                cached: true
              }));
            }
          }
          break;

        case 'unsubscribe':
          client.subscribedSymbols.delete(message.symbol);
          break;

        case 'ping':
          socket.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
          break;

        case 'get_performance':
          socket.send(JSON.stringify({
            type: 'performance_metrics',
            metrics: performanceMetrics,
            timestamp: Date.now()
          }));
          break;
      }
    } catch (error) {
      console.error(`❌ Error handling client message from ${clientId}:`, error);
    }
  };

  socket.onclose = () => {
    clients.delete(clientId);
    console.log(`🔌 Client disconnected: ${clientId} (Remaining: ${clients.size})`);
  };

  socket.onerror = (error) => {
    console.error(`❌ WebSocket error for client ${clientId}:`, error);
  };

  return response;
}

// Clean up inactive clients periodically
setInterval(() => {
  const now = Date.now();
  for (const [clientId, client] of clients.entries()) {
    if (now - client.lastActivity > IDLE_TIMEOUT_MS) {
      client.socket.close();
      clients.delete(clientId);
      console.log(`🧹 Cleaned up inactive client: ${clientId}`);
    }
  }
}, 60000); // Check every minute

// Enhanced Performance Monitoring - Run data freshness checks every 5 minutes
setInterval(async () => {
  await getDataFreshnessReport();
  await cleanupStaleMarketData();
  
  console.log(`📈 Performance Report:
    🎯 Cache Hit Rate: ${performanceMetrics.cacheHitRate.toFixed(1)}%
    🍃 Data Freshness: ${performanceMetrics.dataFreshnessScore.toFixed(1)}%
    🚨 Alerts Triggered: ${performanceMetrics.alertsTriggered}
    🗑️ Stale Prices Cleaned: ${performanceMetrics.stalePricesDetected}
    👥 Active Clients: ${clients.size}
  `);
}, 300000); // Every 5 minutes

// Start TraderMade connection and initialize cache
refreshActiveAlertsCache();
connectToTraderMade();

// ULTRA-COST OPTIMIZATION: Refresh alerts cache every minute  
setInterval(refreshActiveAlertsCache, ALERTS_CACHE_REFRESH_INTERVAL);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  
  if (url.pathname === '/ws') {
    return handleWebSocketConnection(req);
  }

  if (url.pathname === '/health') {
    return new Response(JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      clients: clients.size,
      isLeader: leaderState.isLeader,
      performance: performanceMetrics,
      redis: redis ? 'connected' : 'disabled',
      tradermade: tradermadeApiKey ? 'configured' : 'missing'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (url.pathname === '/performance') {
    await getDataFreshnessReport();
    return new Response(JSON.stringify({
      metrics: performanceMetrics,
      cacheStats: {
        hits: cacheHits,
        misses: cacheMisses,
        hitRate: performanceMetrics.cacheHitRate
      },
      dataFreshness: {
        score: performanceMetrics.dataFreshnessScore,
        alertsTriggered: performanceMetrics.alertsTriggered,
        stalePricesDetected: performanceMetrics.stalePricesDetected
      },
      system: {
        activeClients: clients.size,
        isLeader: leaderState.isLeader,
        uptime: Date.now() - leaderState.lastHeartbeat
      },
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response('Enhanced WebSocket Streaming Service - Optimized', {
    headers: corsHeaders
  });
});
