/**
 * MT5 Sync Edge Function
 * 
 * Receives trade data from MQL5 Expert Advisor running in Docker containers
 * - Authenticates via x-ingest-key header
 * - Processes trades from MQL5 EA
 * - Upserts to trade_journal_entries with deduplication
 * - Updates broker_connections last_sync_at and last_ping
 * 
 * Called by: MQL5 Expert Advisor (ImperialSync.mq5)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decryptCredential } from '../_shared/decrypt.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ingest-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const INGEST_SECRET = Deno.env.get('INGEST_SECRET') || 'Imperial_Secret_2026'

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Authenticate via ingest key
  const ingestKey = req.headers.get('x-ingest-key')
  if (ingestKey !== INGEST_SECRET) {
    return new Response('Unauthorized', { status: 401, headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const body = await req.json()
    const { account, trades, connection_id, heartbeat } = body

    // Handle heartbeat (for connection status updates) - FAST CONNECTION VERIFICATION
    if (req.url.includes('/heartbeat') || heartbeat === true) {
      if (!account) {
        return new Response(JSON.stringify({ error: 'Account number required for heartbeat' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Find connection by account/login - prioritize 'connecting' status (most recent sync request)
      const { data: connections, error: connError } = await supabase
        .from('broker_connections')
        .select('id, user_id, encrypted_login, connection_status, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false }) // Most recent first

      if (connError) {
        console.error('Error fetching connections for heartbeat:', connError)
        return new Response(JSON.stringify({ error: 'Connection lookup failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      if (!connections || connections.length === 0) {
        return new Response(JSON.stringify({ error: 'No active connections found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Decrypt and match account - prioritize connections with status 'connecting'
      let connection = null
      let connectingConnection = null
      
      for (const conn of connections) {
        try {
          const decryptedLogin = await decryptCredential(conn.encrypted_login, conn.user_id)
          if (decryptedLogin === account) {
            // Prefer connection with 'connecting' status (waiting for heartbeat)
            if (conn.connection_status === 'connecting') {
              connectingConnection = conn
              break // Found connecting connection, use it immediately
            }
            // Otherwise keep track of first match
            if (!connection) {
              connection = conn
            }
          }
        } catch (decryptError) {
          console.warn(`Failed to decrypt login for connection ${conn.id}:`, decryptError)
          continue
        }
      }

      // Use connecting connection if found, otherwise use first match
      connection = connectingConnection || connection

      if (!connection) {
        return new Response(JSON.stringify({ error: 'Connection not found for account' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Update connection status to 'connected' and last_ping - FAST VERIFICATION
      // If sync_complete is true, also update last_sync_at to signal Go Brain that sync is done
      const updateData: Record<string, unknown> = { 
        connection_status: 'connected',
        last_ping: new Date().toISOString(),
        is_syncing: false,
        last_error: null,
      }

      // If sync_complete flag is set, update last_sync_at to signal container can be cleaned up
      if (body.sync_complete === true) {
        updateData.last_sync_at = new Date().toISOString()
        console.log(`📊 Sync complete for ${connection.id} - updating last_sync_at`)
      }

      const { error: updateError } = await supabase
        .from('broker_connections')
        .update(updateData)
        .eq('id', connection.id)

      if (updateError) {
        console.error('Error updating connection status:', updateError)
        return new Response(JSON.stringify({ error: 'Failed to update connection status' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log(`✅ Connection heartbeat: ${connection.id} (account: ${account}) - Status updated to 'connected'${body.sync_complete ? ' (sync complete)' : ''}`)
      
      return new Response(JSON.stringify({ 
        success: true,
        connection_id: connection.id,
        message: 'Connection status updated to connected',
        account: account
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Process trades
    if (!trades || !Array.isArray(trades)) {
      return new Response('Invalid payload: trades array required', { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    if (trades.length === 0) {
      return new Response(JSON.stringify({ success: true, trades_synced: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get connection by account/login
    // Note: account is the MT5 login number (plain text from MQL5 EA)
    // We decrypt encrypted_login for each connection and compare with account
    // Only accept trades if connection is actually connected to VPS MT5
    const { data: connections, error: connError } = await supabase
      .from('broker_connections')
      .select('id, user_id, encrypted_login, connection_status')
      .eq('is_active', true)
      .eq('connection_status', 'connected')

    if (connError) {
      console.error('Error fetching connections:', connError)
      return new Response('Connection lookup failed', { status: 500, headers: corsHeaders })
    }

    if (!connections || connections.length === 0) {
      console.warn(`No active connected connections found for account: ${account}`)
      // Connection should be connected before EA starts sending trades
      // This is a validation check - connections should be connected proactively
      return new Response(
        JSON.stringify({ 
          error: 'Connection not connected to VPS MT5',
          message: 'The broker connection must be connected to VPS MT5 before the EA can send trade data. Please ensure the connection is established first.',
          action_required: 'Connect the broker connection to VPS MT5 before the EA can sync trades'
        }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Decrypt and match encrypted_login with account from MQL5 EA
    let connection = null
    for (const conn of connections) {
      try {
        const decryptedLogin = await decryptCredential(conn.encrypted_login, conn.user_id)
        if (decryptedLogin === account) {
          connection = conn
          break
        }
      } catch (decryptError) {
        console.warn(`Failed to decrypt login for connection ${conn.id}:`, decryptError)
        // Continue to next connection
        continue
      }
    }

    if (!connection) {
      console.warn(`Connection not found for account: ${account} (checked ${connections.length} connected connections)`)
      // Connection should be connected before EA starts sending trades
      return new Response(
        JSON.stringify({ 
          error: 'Connection not found for this account',
          message: 'No connected broker connection found matching this account. The connection must be connected to VPS MT5 before the EA can send trade data.',
          action_required: 'Ensure the broker connection is connected to VPS MT5 before the EA starts syncing'
        }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Validation check: Connection should already be connected (proactive, not reactive)
    // This ensures connections are connected before EA starts sending trades
    if (connection.connection_status !== 'connected') {
      console.warn(`Connection ${connection.id} is not connected (status: ${connection.connection_status}) - EA should not be sending trades yet`)
      return new Response(
        JSON.stringify({ 
          error: 'Connection not connected to VPS MT5',
          message: `Broker connection status is '${connection.connection_status}'. The connection must be 'connected' before the EA can send trade data. Please ensure the connection is established first.`,
          action_required: 'Connect the broker connection to VPS MT5 before the EA can sync trades'
        }), 
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transform trades to journal format with full details
    // File-Relay v3: Now includes swap, commission, entry/exit prices, and times
    const journalEntries = trades.map((trade: any) => {
      // Calculate net PnL (profit + swap + commission)
      const profit = parseFloat(trade.profit) || parseFloat(trade.pnl) || 0
      const swap = parseFloat(trade.swap) || 0
      const commission = parseFloat(trade.comm) || parseFloat(trade.commission) || 0
      const netPnl = profit + swap + commission
      
      // Parse trade date from exit_t (exit time) or use current date
      let tradeDate = new Date().toISOString().split('T')[0]
      if (trade.exit_t) {
        // MT5 format: "YYYY.MM.DD HH:MM:SS"
        const exitTime = trade.exit_t.replace(/\./g, '-').split(' ')[0]
        if (exitTime && exitTime.match(/^\d{4}-\d{2}-\d{2}$/)) {
          tradeDate = exitTime
        }
      }
      
      return {
        user_id: connection.user_id,
        asset_ticker: trade.symbol || trade.Symbol,
        trade_type: (trade.dir === 'Long' || trade.direction === 'Long') ? 'Long' : 'Short',
        pnl: netPnl, // Use net PnL (includes swap + commission)
        position_size: parseFloat(trade.lots) || null,
        entry_price: parseFloat(trade.entry_p) || null,
        exit_price: parseFloat(trade.exit_p) || null,
        broker_trade_id: trade.ticket?.toString() || trade.Ticket?.toString(),
        broker_connection_id: connection.id,
        is_synced: true,
        trade_date: tradeDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    })

    // Upsert trades (deduplication via unique constraint on broker_trade_id + broker_connection_id)
    const { error: upsertError } = await supabase
      .from('trade_journal_entries')
      .upsert(journalEntries, {
        onConflict: 'broker_trade_id,broker_connection_id',
        ignoreDuplicates: false,
      })

    if (upsertError) {
      console.error('Error upserting trades:', upsertError)
      return new Response(
        JSON.stringify({ error: upsertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update broker connection last_sync_at, set status to connected, and clear is_syncing flag
    await supabase
      .from('broker_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        connection_status: 'connected',
        is_syncing: false,
        last_error: null,
      })
      .eq('id', connection.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        trades_synced: journalEntries.length,
        connection_id: connection.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing MT5 sync:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
