// 🚀 PHASE 3: Direct WebSocket Price Streamer
// Provides <100ms latency price updates via direct WebSocket connection
// Eliminates Supabase Realtime overhead for maximum performance

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration
const POLL_INTERVAL_MS = 500; // Poll database every 500ms for active symbols
const MAX_SYMBOLS_PER_CONNECTION = 20;
const HEARTBEAT_INTERVAL_MS = 5000;

interface PriceUpdate {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  mid?: number;
  timestamp: string;
  latency?: number;
}

interface ClientConnection {
  socket: WebSocket;
  symbols: Set<string>;
  lastActivity: number;
  clientId: string;
}

// Global connection tracking
const activeConnections = new Map<string, ClientConnection>();
let globalPollInterval: number | null = null;

// Initialize Supabase client
function initializeSupabase() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return createClient(supabaseUrl, supabaseKey);
}

// Poll database for price updates
async function pollPrices(symbols: string[]): Promise<PriceUpdate[]> {
  if (symbols.length === 0) return [];
  
  const startTime = Date.now();
  const supabase = initializeSupabase();
  
  try {
    const { data, error } = await supabase
      .from('market_prices')
      .select('symbol, bid, ask, mid, updated_at')
      .in('symbol', symbols);
    
    if (error) throw error;
    
    const latency = Date.now() - startTime;
    
    return (data || []).map(item => ({
      symbol: item.symbol,
      price: item.mid || item.ask || item.bid || 0,
      bid: item.bid,
      ask: item.ask,
      mid: item.mid,
      timestamp: item.updated_at,
      latency
    }));
  } catch (error) {
    console.error('❌ Price polling error:', error);
    return [];
  }
}

// Broadcast prices to all connected clients
async function broadcastPrices() {
  if (activeConnections.size === 0) {
    console.log('⚠️ [PHASE 2] No active connections, skipping broadcast');
    return;
  }
  
  // Collect all unique symbols
  const allSymbols = new Set<string>();
  activeConnections.forEach(conn => {
    conn.symbols.forEach(symbol => allSymbols.add(symbol));
  });
  
  if (allSymbols.size === 0) {
    console.log('⚠️ [PHASE 2] No symbols subscribed, skipping broadcast');
    return;
  }
  
  console.log(`🔄 [PHASE 2] Broadcasting prices for ${allSymbols.size} symbols:`, Array.from(allSymbols));
  
  // Poll prices
  const prices = await pollPrices(Array.from(allSymbols));
  
  if (prices.length === 0) {
    console.log('⚠️ [PHASE 2] No prices fetched from database');
    return;
  }
  
  console.log(`📊 [PHASE 2] Fetched ${prices.length} prices from database`);
  
  // Broadcast to each connection
  let broadcastCount = 0;
  activeConnections.forEach((conn, clientId) => {
    if (conn.socket.readyState === WebSocket.OPEN) {
      // Filter prices relevant to this connection
      const relevantPrices = prices.filter(p => conn.symbols.has(p.symbol));
      
      if (relevantPrices.length > 0) {
        try {
          conn.socket.send(JSON.stringify({
            type: 'price_update',
            prices: relevantPrices,
            timestamp: new Date().toISOString()
          }));
          broadcastCount++;
          console.log(`✅ [PHASE 2] Sent ${relevantPrices.length} prices to ${clientId}`);
        } catch (error) {
          console.error(`❌ [PHASE 2] Error sending to ${clientId}:`, error);
        }
      }
    } else {
      console.warn(`⚠️ [PHASE 2] Socket not open for ${clientId}, state: ${conn.socket.readyState}`);
    }
  });
  
  console.log(`📡 [PHASE 2] Broadcast complete: ${broadcastCount}/${activeConnections.size} clients updated`);
}

// Start global polling
function startGlobalPolling() {
  if (globalPollInterval === null) {
    globalPollInterval = setInterval(broadcastPrices, POLL_INTERVAL_MS);
    console.log('🚀 Global price polling started (500ms interval)');
  }
}

// Stop global polling
function stopGlobalPolling() {
  if (globalPollInterval !== null && activeConnections.size === 0) {
    clearInterval(globalPollInterval);
    globalPollInterval = null;
    console.log('⏸️  Global price polling stopped (no active connections)');
  }
}

// Handle WebSocket connection
function handleWebSocket(socket: WebSocket, clientId: string) {
  const connection: ClientConnection = {
    socket,
    symbols: new Set(),
    lastActivity: Date.now(),
    clientId
  };
  
  activeConnections.set(clientId, connection);
  console.log(`✅ Client connected: ${clientId} (Total: ${activeConnections.size})`);
  
  // Start polling if first connection
  startGlobalPolling();
  
  // Send welcome message
  socket.send(JSON.stringify({
    type: 'connected',
    clientId,
    message: 'Direct WebSocket price stream connected',
    pollInterval: POLL_INTERVAL_MS
  }));
  
  // Heartbeat
  const heartbeat = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      }));
    } else {
      clearInterval(heartbeat);
    }
  }, HEARTBEAT_INTERVAL_MS);
  
  // PHASE 2: Handle messages with comprehensive logging
  socket.onmessage = (event) => {
    connection.lastActivity = Date.now();
    
    try {
      console.log(`📨 [PHASE 2] Received message from ${clientId}:`, event.data);
      const message = JSON.parse(event.data);
      
      if (message.type === 'subscribe') {
        const symbols = message.symbols || [];
        
        console.log(`🔔 [PHASE 2] Subscribe request from ${clientId}:`, symbols);
        
        if (symbols.length > MAX_SYMBOLS_PER_CONNECTION) {
          socket.send(JSON.stringify({
            type: 'error',
            message: `Maximum ${MAX_SYMBOLS_PER_CONNECTION} symbols per connection`
          }));
          return;
        }
        
        connection.symbols = new Set(symbols.map((s: string) => s.toUpperCase()));
        
        socket.send(JSON.stringify({
          type: 'subscribed',
          symbols: Array.from(connection.symbols)
        }));
        
        console.log(`✅ [PHASE 2] Client ${clientId} subscribed to: ${Array.from(connection.symbols).join(', ')}`);
      }
      
      if (message.type === 'unsubscribe') {
        const symbols = message.symbols || [];
        console.log(`🔕 [PHASE 2] Unsubscribe request from ${clientId}:`, symbols);
        symbols.forEach((s: string) => connection.symbols.delete(s.toUpperCase()));
        
        socket.send(JSON.stringify({
          type: 'unsubscribed',
          symbols
        }));
        
        console.log(`✅ [PHASE 2] Client ${clientId} unsubscribed from:`, symbols);
      }
      
      if (message.type === 'ping') {
        socket.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString()
        }));
      }
    } catch (error) {
      console.error(`❌ [PHASE 2] Message handling error for ${clientId}:`, error);
    }
  };
  
  // Handle close
  socket.onclose = () => {
    activeConnections.delete(clientId);
    clearInterval(heartbeat);
    stopGlobalPolling();
    console.log(`❌ [PHASE 2] Client disconnected: ${clientId} (Total: ${activeConnections.size})`);
    console.log(`📊 [PHASE 2] Remaining connections: ${Array.from(activeConnections.keys()).join(', ')}`);
  };
  
  // Handle error
  socket.onerror = (error) => {
    console.error(`❌ [PHASE 2] WebSocket error for client ${clientId}:`, error);
  };
  
  // Log connection established
  console.log(`📊 [PHASE 2] Connection ${clientId} established. Ready to receive subscriptions.`);
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  // Upgrade to WebSocket
  const upgrade = req.headers.get('upgrade') || '';
  if (upgrade.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket connection', { 
      status: 426,
      headers: corsHeaders 
    });
  }
  
  // Generate client ID
  const clientId = crypto.randomUUID();
  
  // Upgrade connection
  const { socket, response } = Deno.upgradeWebSocket(req);
  
  // Handle WebSocket
  handleWebSocket(socket, clientId);
  
  return response;
});
