import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const { headers } = req;
  const upgradeHeader = headers.get("upgrade") || "";

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  let pingInterval: number;
  let clientIdentifier: string = '';

  socket.onopen = () => {
    console.log('Rate limit WebSocket connected');
    
    socket.send(JSON.stringify({
      type: 'connected',
      message: 'Rate limit WebSocket connected'
    }));

    // Keep connection alive
    pingInterval = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);
  };

  socket.onmessage = async (event) => {
    try {
      const message = JSON.parse(event.data);
      
      if (message.type === 'pong') {
        return;
      }

      if (message.type === 'check_rate_limit') {
        const { identifier, email } = message;
        clientIdentifier = identifier;

        // Check rate limits
        const now = new Date();
        const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);

        // Check email rate limit (1 per day)
        const { data: emailLimits } = await supabase
          .from('rate_limits')
          .select('*')
          .eq('identifier', email.toLowerCase())
          .eq('limit_type', 'email')
          .gte('window_start', dayAgo.toISOString());

        // Check IP rate limit (10 per hour)
        const { data: ipLimits } = await supabase
          .from('rate_limits')
          .select('*')
          .eq('identifier', identifier)
          .eq('limit_type', 'ip')
          .gte('window_start', hourAgo.toISOString());

        const emailAllowed = !emailLimits || emailLimits.length === 0;
        const ipAllowed = !ipLimits || ipLimits.reduce((sum, limit) => sum + limit.attempt_count, 0) < 10;

        socket.send(JSON.stringify({
          type: 'rate_limit_status',
          data: {
            canSubmit: emailAllowed && ipAllowed,
            emailAllowed,
            ipAllowed,
            attemptsLeft: ipAllowed ? Math.max(0, 10 - (ipLimits?.reduce((sum, limit) => sum + limit.attempt_count, 0) || 0)) : 0,
            resetTime: emailAllowed ? null : new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
          }
        }));
      }

      if (message.type === 'get_threat_level') {
        // Simulate threat level check (in production, this would check real threat intelligence)
        const currentHour = new Date().getHours();
        const systemLoad = Math.random() * 100;
        
        let threatLevel = 'low';
        if (systemLoad > 80) threatLevel = 'medium';
        if (systemLoad > 95) threatLevel = 'high';
        
        socket.send(JSON.stringify({
          type: 'threat_level_update',
          data: {
            current: threatLevel,
            systemLoad: {
              cpuUsage: systemLoad,
              timestamp: new Date().toISOString()
            },
            recommendedAction: threatLevel === 'high' ? 'throttle' : 'allow'
          }
        }));
      }

    } catch (error) {
      console.error('Rate limit WebSocket error:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process rate limit check'
      }));
    }
  };

  socket.onclose = () => {
    console.log('Rate limit WebSocket disconnected');
    if (pingInterval) {
      clearInterval(pingInterval);
    }
  };

  return response;
});
