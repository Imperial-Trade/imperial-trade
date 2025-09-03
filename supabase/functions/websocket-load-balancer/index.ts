import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Configuration
const MAX_CONNECTIONS_PER_INSTANCE = 500;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const INSTANCE_TIMEOUT = 60000; // 1 minute

interface WebSocketInstance {
  id: string;
  url: string;
  connections: number;
  isHealthy: boolean;
  lastHealthCheck: Date;
  region: string;
}

class LoadBalancer {
  private static instance: LoadBalancer;
  private instances: Map<string, WebSocketInstance> = new Map();
  private healthCheckInterval: number | null = null;

  private constructor() {
    this.initializeInstances();
    this.startHealthChecking();
  }

  static getInstance(): LoadBalancer {
    if (!LoadBalancer.instance) {
      LoadBalancer.instance = new LoadBalancer();
    }
    return LoadBalancer.instance;
  }

  private initializeInstances(): void {
    // Enhanced WebSocket instances
    const enhancedInstances = [
      {
        id: 'enhanced-1',
        url: 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-websocket-streaming',
        connections: 0,
        isHealthy: true,
        lastHealthCheck: new Date(),
        region: 'us-east-1'
      },
      {
        id: 'enhanced-2', 
        url: 'https://kmuoqkcxguafxulqlbmi.supabase.co/functions/v1/enhanced-websocket-streaming',
        connections: 0,
        isHealthy: true,
        lastHealthCheck: new Date(),
        region: 'us-west-1'
      }
    ];

    enhancedInstances.forEach(instance => {
      this.instances.set(instance.id, instance);
    });

    console.log(`🎯 Load balancer initialized with ${this.instances.size} instances`);
  }

  private async startHealthChecking(): Promise<void> {
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, HEALTH_CHECK_INTERVAL);
  }

  private async performHealthChecks(): Promise<void> {
    const healthPromises = Array.from(this.instances.values()).map(async (instance) => {
      try {
        const response = await fetch(`${instance.url}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });

        const wasHealthy = instance.isHealthy;
        instance.isHealthy = response.ok;
        instance.lastHealthCheck = new Date();

        if (!wasHealthy && instance.isHealthy) {
          console.log(`✅ Instance ${instance.id} is back online`);
        } else if (wasHealthy && !instance.isHealthy) {
          console.log(`❌ Instance ${instance.id} went offline`);
        }

      } catch (error) {
        instance.isHealthy = false;
        instance.lastHealthCheck = new Date();
        console.warn(`🔍 Health check failed for ${instance.id}:`, error.message);
      }
    });

    await Promise.allSettled(healthPromises);
  }

  public getBestInstance(): WebSocketInstance | null {
    const healthyInstances = Array.from(this.instances.values())
      .filter(instance => 
        instance.isHealthy && 
        instance.connections < MAX_CONNECTIONS_PER_INSTANCE
      )
      .sort((a, b) => a.connections - b.connections);

    if (healthyInstances.length === 0) {
      console.warn('⚠️ No healthy instances available');
      return null;
    }

    const selected = healthyInstances[0];
    selected.connections++;
    
    console.log(`🎯 Selected instance ${selected.id} (${selected.connections} connections)`);
    return selected;
  }

  public releaseConnection(instanceId: string): void {
    const instance = this.instances.get(instanceId);
    if (instance && instance.connections > 0) {
      instance.connections--;
      console.log(`📉 Released connection from ${instanceId} (${instance.connections} remaining)`);
    }
  }

  public getStats() {
    const stats = {
      totalInstances: this.instances.size,
      healthyInstances: Array.from(this.instances.values()).filter(i => i.isHealthy).length,
      totalConnections: Array.from(this.instances.values()).reduce((sum, i) => sum + i.connections, 0),
      instances: Array.from(this.instances.values()).map(i => ({
        id: i.id,
        connections: i.connections,
        isHealthy: i.isHealthy,
        lastHealthCheck: i.lastHealthCheck,
        region: i.region
      }))
    };

    return stats;
  }
}

// WebSocket upgrade handler with load balancing
async function handleWebSocketUpgrade(req: Request): Promise<Response> {
  const loadBalancer = LoadBalancer.getInstance();
  const targetInstance = loadBalancer.getBestInstance();

  if (!targetInstance) {
    return new Response('No healthy instances available', {
      status: 503,
      headers: corsHeaders
    });
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req);
    const clientId = crypto.randomUUID();
    
    // Create WebSocket connection to target instance
    const wsUrl = targetInstance.url.replace('https://', 'wss://');
    const targetSocket = new WebSocket(wsUrl);

    let isConnected = false;

    // Connection timeout
    const connectionTimeout = setTimeout(() => {
      if (!isConnected) {
        socket.close(1008, 'Connection timeout');
        loadBalancer.releaseConnection(targetInstance.id);
      }
    }, 10000);

    socket.onopen = () => {
      console.log(`📱 Client ${clientId} connected via ${targetInstance.id}`);
    };

    targetSocket.onopen = () => {
      isConnected = true;
      clearTimeout(connectionTimeout);
      console.log(`🔗 Connected to instance ${targetInstance.id}`);
    };

    // Relay messages client -> instance
    socket.onmessage = (event) => {
      if (targetSocket.readyState === WebSocket.OPEN) {
        targetSocket.send(event.data);
      }
    };

    // Relay messages instance -> client
    targetSocket.onmessage = (event) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(event.data);
      }
    };

    // Handle disconnections
    const cleanup = () => {
      loadBalancer.releaseConnection(targetInstance.id);
      console.log(`🔌 Client ${clientId} disconnected from ${targetInstance.id}`);
    };

    socket.onclose = cleanup;
    socket.onerror = cleanup;
    
    targetSocket.onclose = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1011, 'Upstream connection lost');
      }
      cleanup();
    };

    targetSocket.onerror = (error) => {
      console.error(`❌ Target socket error:`, error);
      if (socket.readyState === WebSocket.OPEN) {
        socket.close(1011, 'Upstream error');
      }
      cleanup();
    };

    return response;

  } catch (error) {
    console.error('❌ WebSocket upgrade failed:', error);
    loadBalancer.releaseConnection(targetInstance.id);
    return new Response('WebSocket upgrade failed', {
      status: 500,
      headers: corsHeaders
    });
  }
}

// Stats endpoint
function handleStatsRequest(): Response {
  const loadBalancer = LoadBalancer.getInstance();
  const stats = loadBalancer.getStats();
  
  return new Response(JSON.stringify({
    service: 'websocket-load-balancer',
    version: '1.0.0',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    ...stats
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// Health endpoint
function handleHealthRequest(): Response {
  return new Response(JSON.stringify({
    service: 'websocket-load-balancer',
    status: 'healthy',
    timestamp: new Date().toISOString()
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

  // Stats endpoint
  if (url.pathname === '/stats') {
    return handleStatsRequest();
  }

  // Health endpoint
  if (url.pathname === '/health') {
    return handleHealthRequest();
  }

  return new Response('WebSocket Load Balancer Service', {
    headers: corsHeaders
  });
});