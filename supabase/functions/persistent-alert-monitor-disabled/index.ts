import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// DISABLED: This function is redundant and causes duplicate TraderMade connections
// The enhanced-websocket-streaming function handles all price streaming and alert monitoring
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  const url = new URL(req.url);
  const action = url.searchParams.get('action') || 'health';

  return new Response(JSON.stringify({
    status: 'disabled',
    version: '4.0.0-disabled',
    message: 'This function has been disabled to prevent redundant TraderMade connections. Use enhanced-websocket-streaming instead.',
    action: action,
    reason: 'Cost optimization - single TraderMade connection policy',
    alternatives: [
      'enhanced-websocket-streaming (single TraderMade connection)',
      'enhanced-websocket-streaming-optimized (Redis-only UI distribution)',
      'enhanced-alert-monitor (database-based alert processing)'
    ],
    timestamp: new Date().toISOString()
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});