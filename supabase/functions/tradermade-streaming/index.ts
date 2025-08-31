
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration constants
const WS_AUTH_TIMEOUT_MS = parseInt(Deno.env.get('WS_AUTH_TIMEOUT_MS') || '30000'); // 30 seconds
const MAX_WS_SUBS_PER_CLIENT = parseInt(Deno.env.get('MAX_WS_SUBS_PER_CLIENT') || '20'); // Max subscriptions per client

// Supabase client for JWT verification
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
const supabase = createClient(supabaseUrl!, supabaseAnonKey!);

// Tradermade symbol configuration
const TRADERMADE_SYMBOLS = ['XAUUSD', 'BTCUSD', 'USA30USD', 'NAS100USD', 'EURUSD'];

// Mapping between client-standard symbols and TraderMade upstream symbols
const CLIENT_TO_UPSTREAM: Record<string, string> = {
  XAUUSD: 'XAUUSD',
  BTCUSD: 'BTCUSD',
  EURUSD: 'EURUSD',
  USA30USD: 'US30',
  NAS100USD: 'NAS100',
};

const UPSTREAM_TO_CLIENT: Record<string, string> = {
  XAUUSD: 'XAUUSD',
  BTCUSD: 'BTCUSD',
  EURUSD: 'EURUSD',
  US30: 'USA30USD',
  NAS100: 'NAS100USD',
};

interface TradermadePriceData {
  symbol: string;
  price: number;
  bid?: number;
  ask?: number;
  timestamp: string;
  change: number;
  changePercent: number;
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

// ========== SINGLETON CONNECTION MANAGER ==========
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

  private constructor() {}

  static getInstance(): TradermadeConnectionManager {
    if (!TradermadeConnectionManager.instance) {
      TradermadeConnectionManager.instance = new TradermadeConnectionManager();
    }
    return TradermadeConnectionManager.instance;
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
      total_clients: this.clients.size
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
      
      this.clients.delete(clientId);
      this.logEvent('disconnect', { 
        client_id: clientId, 
        ip_hash: client.ipHash,
        was_authenticated: client.isAuthenticated,
        remaining_clients: this.clients.size
      });

      // If no clients remain, close TraderMade connection after delay
      if (this.clients.size === 0) {
        console.log('⏱️ No clients remaining, scheduling TraderMade disconnect in 30s...');
        setTimeout(() => {
          if (this.clients.size === 0) {
            console.log('🔌 Disconnecting TraderMade connection (no clients)');
            this.disconnectTradermade();
          }
        }, 30000); // 30 second grace period
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
        
        // Send cached price if available
        const cached = this.priceCache.get(normalized);
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

  // Connect to TraderMade (SINGLETON - only one connection)
  private async connectToTradermade(): Promise<void> {
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
      console.log('🔌 Connecting to TraderMade WebSocket...');
      this.connectionStatus = 'connecting';
      this.broadcastToAllClients({
        type: 'connection_status',
        status: 'connecting',
        timestamp: new Date().toISOString()
      });

      this.tradermadeSocket = new WebSocket('wss://marketdata.tradermade.com/feedadv');

      this.tradermadeSocket.onopen = () => {
        console.log('✅ Connected to TraderMade');
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
        console.warn(`🔌❌ TraderMade connection closed: ${event.code} - ${event.reason}`);
        this.connectionStatus = 'disconnected';
        this.stopHeartbeat();
        
        this.broadcastToAllClients({
          type: 'connection_status',
          status: 'disconnected',
          timestamp: new Date().toISOString()
        });

        // Attempt reconnection if we have clients
        if (this.clients.size > 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
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

  // Handle incoming TraderMade messages
  private handleTradermadeMessage(data: string): void {
    try {
      // Handle text messages (like "Connected") without parsing as JSON
      if (!data.startsWith('{')) {
        if (data.toLowerCase().includes('connected')) {
          console.log('✅ TraderMade authentication successful');
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

      const priceUpdate: TradermadePriceData = {
        symbol: clientSymbol,
        price,
        bid: parsed.bid ? parseFloat(parsed.bid) : price,
        ask: parsed.ask ? parseFloat(parsed.ask) : price,
        timestamp: new Date().toISOString(),
        change: 0,
        changePercent: 0
      };

      // Cache the price
      this.priceCache.set(clientSymbol, priceUpdate);

      // Broadcast to subscribed clients
      this.broadcastPriceUpdate(priceUpdate);

    } catch (error) {
      if (data.startsWith('{')) {
        console.error('❌ Error parsing TraderMade message:', error);
      }
    }
  }

  // Broadcast price update to subscribed clients
  private broadcastPriceUpdate(priceUpdate: TradermadePriceData): void {
    let broadcastCount = 0;

    this.clients.forEach((client, clientId) => {
      if (client.subscriptions.has(priceUpdate.symbol)) {
        this.sendToClient(clientId, {
          type: 'price_update',
          ...priceUpdate
        });
        broadcastCount++;
      }
    });

    if (broadcastCount > 0) {
      this.logEvent('broadcast_summary', {
        symbol: priceUpdate.symbol,
        price: priceUpdate.price,
        client_count: broadcastCount,
        total_clients: this.clients.size
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
      cachedPrices.push(priceData);
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
        if (now - this.lastPingTime >= 30000) { // 30 second intervals
          try {
            this.tradermadeSocket.send(JSON.stringify({ type: 'ping' }));
            this.lastPingTime = now;
          } catch (error) {
            console.error('❌ Heartbeat failed:', error);
          }
        }
      }
    }, 30000);
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
      if (this.clients.size > 0) {
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
    
    this.stopHeartbeat();
    
    if (this.tradermadeSocket) {
      this.tradermadeSocket.close();
      this.tradermadeSocket = null;
    }
    
    this.connectionStatus = 'disconnected';
    console.log('🔌❌ TraderMade connection closed');
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

      // Now start TraderMade connection if this is the first authenticated client
      const authenticatedClients = Array.from(this.clients.values()).filter(c => c.isAuthenticated);
      if (authenticatedClients.length === 1 && this.connectionStatus === 'disconnected') {
        console.log('🚀 First authenticated client, starting TraderMade connection...');
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
}

// ========== EDGE FUNCTION HANDLER ==========
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle HTTP POST requests for direct price fetching
  if (req.method === 'POST') {
    try {
      const { symbols: requestedSymbols } = await req.json();
      
      if (!Array.isArray(requestedSymbols)) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Invalid symbols format' 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const manager = TradermadeConnectionManager.getInstance();
      const prices: Record<string, TradermadePriceData | null> = {};
      
      // Get cached prices
      requestedSymbols.forEach(symbol => {
        const normalized = manager['normalizeClientSymbol'](symbol);
        if (normalized) {
          const cached = manager['priceCache'].get(normalized);
          prices[normalized] = cached || null;
        }
      });

      return new Response(JSON.stringify({
        success: true,
        prices,
        dataSource: 'singleton_cache',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Internal server error'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
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
