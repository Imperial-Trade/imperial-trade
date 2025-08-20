import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log(`👋 Hello function called: ${req.method} ${req.url}`)
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  return new Response(JSON.stringify({ 
    message: 'Hello from Supabase Edge Functions!',
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    status: 'Function deployed successfully'
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
})