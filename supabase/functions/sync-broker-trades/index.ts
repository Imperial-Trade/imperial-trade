/**
 * Sync Broker Trades Edge Function
 * 
 * FAST SYNC APPROACH:
 * 1. Returns existing synced trades immediately (no VPS call needed)
 * 2. Triggers Go Brain to sync new trades in background (via sync_priority)
 * 3. Frontend gets instant response, new trades appear when Go Brain finishes
 * 
 * This avoids the 50 second timeout issue with VPS Python/MT5
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get authenticated user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get connection_id from request body
    let body;
    try {
      body = await req.json()
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body. Expected JSON.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { connection_id } = body || {}

    if (!connection_id) {
      console.error('❌ Missing connection_id in request body')
      return new Response(
        JSON.stringify({ success: false, error: 'Missing connection_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get broker connection
    const { data: connection, error: connError } = await supabase
      .from('broker_connections')
      .select('*')
      .eq('id', connection_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (connError || !connection) {
      return new Response(
        JSON.stringify({ success: false, error: 'Broker connection not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get existing synced trades for this connection
    const { data: existingTrades, error: tradesError } = await supabase
      .from('trade_journal_entries')
      .select('*')
      .eq('broker_connection_id', connection_id)
      .eq('user_id', user.id)
      .order('trade_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (tradesError) {
      console.error('❌ Error fetching trades:', tradesError)
    }

    const tradesCount = existingTrades?.length || 0

    // Trigger background sync via Go Brain (set sync_priority = 1)
    // Go Brain will pick this up and sync new trades
    const { error: updateError } = await supabase
      .from('broker_connections')
      .update({ 
        sync_priority: 1, 
        is_syncing: false,
        last_sync_at: new Date().toISOString()
      })
      .eq('id', connection_id)

    if (updateError) {
      console.error('⚠️ Error triggering background sync:', updateError)
    }

    console.log(`✅ Sync response: ${tradesCount} existing trades, background sync triggered`)

    return new Response(
      JSON.stringify({
        success: true,
        trades_synced: tradesCount,
        message: tradesCount > 0 
          ? `Found ${tradesCount} trades. Background sync triggered for new trades.`
          : 'Background sync triggered. Trades will appear shortly.',
        connection_id: connection_id,
        connection_status: connection.connection_status
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Sync error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
