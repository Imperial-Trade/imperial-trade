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

  socket.onopen = () => {
    console.log('Account status WebSocket connected');
    
    // Send initial connection confirmation
    socket.send(JSON.stringify({
      type: 'connected',
      message: 'Account status WebSocket connected'
    }));

    // Start ping to keep connection alive
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
        return; // Handle pong responses
      }

      if (message.type === 'subscribe_status') {
        const { email } = message;
        
        // Get current status
        const { data: accountRequest } = await supabase
          .from('account_requests')
          .select('*')
          .eq('email', email.toLowerCase())
          .single();

        if (accountRequest) {
          socket.send(JSON.stringify({
            type: 'status_update',
            data: accountRequest
          }));
        } else {
          socket.send(JSON.stringify({
            type: 'status_not_found',
            message: 'No account request found with this email'
          }));
        }
      }

      if (message.type === 'check_status') {
        const { email } = message;
        
        const { data: requests } = await supabase
          .from('account_requests')
          .select('*')
          .eq('email', email.toLowerCase());

        socket.send(JSON.stringify({
          type: 'status_result',
          data: requests || []
        }));
      }

    } catch (error) {
      console.error('WebSocket message error:', error);
      socket.send(JSON.stringify({
        type: 'error',
        message: 'Failed to process message'
      }));
    }
  };

  socket.onclose = () => {
    console.log('Account status WebSocket disconnected');
    if (pingInterval) {
      clearInterval(pingInterval);
    }
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

  return response;
});
