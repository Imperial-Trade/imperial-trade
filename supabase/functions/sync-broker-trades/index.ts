/**
 * Sync Broker Trades Edge Function
 * 
 * Fetches trades from MT5 broker and saves to database
 * - Gets user's broker connection
 * - Calls VPS service to fetch trades
 * - Transforms MT5 trade data to journal format
 * - Saves to trade_journal_entries table
 * - Updates last_sync_at timestamp
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const VPS_MT5_SERVICE_URL = Deno.env.get('VPS_MT5_SERVICE_URL') || 'http://your-vps-ip:3000'

interface MT5Trade {
  ticket: number;
  symbol: string;
  type: number; // 0=Buy, 1=Sell
  volume: number;
  price_open: number;
  price_current: number;
  price_close?: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  commission: number;
  time: number;
  time_close?: number;
  comment?: string;
}

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
    const { connection_id } = await req.json()

    if (!connection_id) {
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

    // Call VPS service to fetch trades
    const vpsResponse = await fetch(`${VPS_MT5_SERVICE_URL}/fetch-trades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': Deno.env.get('VPS_API_KEY') || ''
      },
      body: JSON.stringify({
        connection_id: connection.id,
        broker_type: connection.broker_type,
        encrypted_login: connection.encrypted_login,
        encrypted_password: connection.encrypted_password,
        encrypted_server: connection.encrypted_server,
        user_id: user.id
      })
    })

    if (!vpsResponse.ok) {
      const error = await vpsResponse.text()
      
      // Update connection with error
      await supabase
        .from('broker_connections')
        .update({ last_error: error })
        .eq('id', connection.id)

      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch trades',
          details: error 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { trades, account_balance } = await vpsResponse.json()

    if (!Array.isArray(trades)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid trades data from VPS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transform MT5 trades to journal format
    const journalEntries = trades.map((trade: MT5Trade) => {
      const entryTime = new Date(trade.time * 1000)
      const exitTime = trade.time_close ? new Date(trade.time_close * 1000) : null
      
      // Calculate P&L percentage (if account balance available)
      const pnlPercent = account_balance > 0 
        ? (trade.profit / account_balance) * 100 
        : 0

      return {
        user_id: user.id,
        asset_ticker: trade.symbol,
        trade_type: trade.type === 0 ? 'Long' : 'Short',
        position_size: trade.volume,
        entry_price: trade.price_open,
        exit_price: trade.price_close || trade.price_current,
        stop_loss: trade.sl > 0 ? trade.sl : null,
        take_profit: trade.tp > 0 ? trade.tp : null,
        pnl: trade.profit,
        pnl_percent: pnlPercent,
        commission: trade.commission || 0,
        swap_fees: trade.swap || 0,
        trade_date: entryTime.toISOString().split('T')[0],
        entry_time: entryTime.toISOString(),
        exit_time: exitTime ? exitTime.toISOString() : null,
        broker_trade_id: trade.ticket.toString(),
        broker_connection_id: connection.id,
        is_synced: true,
        sync_source: 'broker_sync',
        notes: trade.comment || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

    // Upsert trades (avoid duplicates by broker_trade_id + broker_connection_id)
    if (journalEntries.length > 0) {
      const { error: upsertError } = await supabase
        .from('trade_journal_entries')
        .upsert(journalEntries, {
          onConflict: 'broker_trade_id,broker_connection_id',
          ignoreDuplicates: false
        })
      
      if (upsertError) {
        console.error('❌ Error upserting trades:', upsertError)
        
        // Fallback: try individual inserts/updates
        let successCount = 0
        for (const entry of journalEntries) {
          const { error: singleError } = await supabase
            .from('trade_journal_entries')
            .upsert(entry, {
              onConflict: 'broker_trade_id,broker_connection_id',
              ignoreDuplicates: false
            })
          
          if (!singleError) successCount++
        }
        
        if (successCount === 0) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Failed to save trades',
              details: upsertError.message 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        console.log(`✅ Saved ${successCount} of ${journalEntries.length} trades`)
      } else {
        console.log(`✅ Successfully upserted ${journalEntries.length} trades`)
      }
    }

    // Update connection with success
    await supabase
      .from('broker_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        last_error: null
      })
      .eq('id', connection.id)

    return new Response(
      JSON.stringify({
        success: true,
        trades_synced: journalEntries.length,
        account_balance: account_balance || null,
        message: `Successfully synced ${journalEntries.length} trades`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error syncing broker trades:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

 * Sync Broker Trades Edge Function
 * 
 * Fetches trades from MT5 broker and saves to database
 * - Gets user's broker connection
 * - Calls VPS service to fetch trades
 * - Transforms MT5 trade data to journal format
 * - Saves to trade_journal_entries table
 * - Updates last_sync_at timestamp
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const VPS_MT5_SERVICE_URL = Deno.env.get('VPS_MT5_SERVICE_URL') || 'http://your-vps-ip:3000'

interface MT5Trade {
  ticket: number;
  symbol: string;
  type: number; // 0=Buy, 1=Sell
  volume: number;
  price_open: number;
  price_current: number;
  price_close?: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  commission: number;
  time: number;
  time_close?: number;
  comment?: string;
}

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
    const { connection_id } = await req.json()

    if (!connection_id) {
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

    // Call VPS service to fetch trades
    const vpsResponse = await fetch(`${VPS_MT5_SERVICE_URL}/fetch-trades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': Deno.env.get('VPS_API_KEY') || ''
      },
      body: JSON.stringify({
        connection_id: connection.id,
        broker_type: connection.broker_type,
        encrypted_login: connection.encrypted_login,
        encrypted_password: connection.encrypted_password,
        encrypted_server: connection.encrypted_server,
        user_id: user.id
      })
    })

    if (!vpsResponse.ok) {
      const error = await vpsResponse.text()
      
      // Update connection with error
      await supabase
        .from('broker_connections')
        .update({ last_error: error })
        .eq('id', connection.id)

      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch trades',
          details: error 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { trades, account_balance } = await vpsResponse.json()

    if (!Array.isArray(trades)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid trades data from VPS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transform MT5 trades to journal format
    const journalEntries = trades.map((trade: MT5Trade) => {
      const entryTime = new Date(trade.time * 1000)
      const exitTime = trade.time_close ? new Date(trade.time_close * 1000) : null
      
      // Calculate P&L percentage (if account balance available)
      const pnlPercent = account_balance > 0 
        ? (trade.profit / account_balance) * 100 
        : 0

      return {
        user_id: user.id,
        asset_ticker: trade.symbol,
        trade_type: trade.type === 0 ? 'Long' : 'Short',
        position_size: trade.volume,
        entry_price: trade.price_open,
        exit_price: trade.price_close || trade.price_current,
        stop_loss: trade.sl > 0 ? trade.sl : null,
        take_profit: trade.tp > 0 ? trade.tp : null,
        pnl: trade.profit,
        pnl_percent: pnlPercent,
        commission: trade.commission || 0,
        swap_fees: trade.swap || 0,
        trade_date: entryTime.toISOString().split('T')[0],
        entry_time: entryTime.toISOString(),
        exit_time: exitTime ? exitTime.toISOString() : null,
        broker_trade_id: trade.ticket.toString(),
        broker_connection_id: connection.id,
        is_synced: true,
        sync_source: 'broker_sync',
        notes: trade.comment || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

    // Upsert trades (avoid duplicates by broker_trade_id + broker_connection_id)
    if (journalEntries.length > 0) {
      const { error: upsertError } = await supabase
        .from('trade_journal_entries')
        .upsert(journalEntries, {
          onConflict: 'broker_trade_id,broker_connection_id',
          ignoreDuplicates: false
        })
      
      if (upsertError) {
        console.error('❌ Error upserting trades:', upsertError)
        
        // Fallback: try individual inserts/updates
        let successCount = 0
        for (const entry of journalEntries) {
          const { error: singleError } = await supabase
            .from('trade_journal_entries')
            .upsert(entry, {
              onConflict: 'broker_trade_id,broker_connection_id',
              ignoreDuplicates: false
            })
          
          if (!singleError) successCount++
        }
        
        if (successCount === 0) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Failed to save trades',
              details: upsertError.message 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        console.log(`✅ Saved ${successCount} of ${journalEntries.length} trades`)
      } else {
        console.log(`✅ Successfully upserted ${journalEntries.length} trades`)
      }
    }

    // Update connection with success
    await supabase
      .from('broker_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        last_error: null
      })
      .eq('id', connection.id)

    return new Response(
      JSON.stringify({
        success: true,
        trades_synced: journalEntries.length,
        account_balance: account_balance || null,
        message: `Successfully synced ${journalEntries.length} trades`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error syncing broker trades:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

 * Sync Broker Trades Edge Function
 * 
 * Fetches trades from MT5 broker and saves to database
 * - Gets user's broker connection
 * - Calls VPS service to fetch trades
 * - Transforms MT5 trade data to journal format
 * - Saves to trade_journal_entries table
 * - Updates last_sync_at timestamp
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const VPS_MT5_SERVICE_URL = Deno.env.get('VPS_MT5_SERVICE_URL') || 'http://your-vps-ip:3000'

interface MT5Trade {
  ticket: number;
  symbol: string;
  type: number; // 0=Buy, 1=Sell
  volume: number;
  price_open: number;
  price_current: number;
  price_close?: number;
  sl: number;
  tp: number;
  profit: number;
  swap: number;
  commission: number;
  time: number;
  time_close?: number;
  comment?: string;
}

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
    const { connection_id } = await req.json()

    if (!connection_id) {
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

    // Call VPS service to fetch trades
    const vpsResponse = await fetch(`${VPS_MT5_SERVICE_URL}/fetch-trades`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': Deno.env.get('VPS_API_KEY') || ''
      },
      body: JSON.stringify({
        connection_id: connection.id,
        broker_type: connection.broker_type,
        encrypted_login: connection.encrypted_login,
        encrypted_password: connection.encrypted_password,
        encrypted_server: connection.encrypted_server,
        user_id: user.id
      })
    })

    if (!vpsResponse.ok) {
      const error = await vpsResponse.text()
      
      // Update connection with error
      await supabase
        .from('broker_connections')
        .update({ last_error: error })
        .eq('id', connection.id)

      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch trades',
          details: error 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { trades, account_balance } = await vpsResponse.json()

    if (!Array.isArray(trades)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid trades data from VPS' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Transform MT5 trades to journal format
    const journalEntries = trades.map((trade: MT5Trade) => {
      const entryTime = new Date(trade.time * 1000)
      const exitTime = trade.time_close ? new Date(trade.time_close * 1000) : null
      
      // Calculate P&L percentage (if account balance available)
      const pnlPercent = account_balance > 0 
        ? (trade.profit / account_balance) * 100 
        : 0

      return {
        user_id: user.id,
        asset_ticker: trade.symbol,
        trade_type: trade.type === 0 ? 'Long' : 'Short',
        position_size: trade.volume,
        entry_price: trade.price_open,
        exit_price: trade.price_close || trade.price_current,
        stop_loss: trade.sl > 0 ? trade.sl : null,
        take_profit: trade.tp > 0 ? trade.tp : null,
        pnl: trade.profit,
        pnl_percent: pnlPercent,
        commission: trade.commission || 0,
        swap_fees: trade.swap || 0,
        trade_date: entryTime.toISOString().split('T')[0],
        entry_time: entryTime.toISOString(),
        exit_time: exitTime ? exitTime.toISOString() : null,
        broker_trade_id: trade.ticket.toString(),
        broker_connection_id: connection.id,
        is_synced: true,
        sync_source: 'broker_sync',
        notes: trade.comment || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    })

    // Upsert trades (avoid duplicates by broker_trade_id + broker_connection_id)
    if (journalEntries.length > 0) {
      const { error: upsertError } = await supabase
        .from('trade_journal_entries')
        .upsert(journalEntries, {
          onConflict: 'broker_trade_id,broker_connection_id',
          ignoreDuplicates: false
        })
      
      if (upsertError) {
        console.error('❌ Error upserting trades:', upsertError)
        
        // Fallback: try individual inserts/updates
        let successCount = 0
        for (const entry of journalEntries) {
          const { error: singleError } = await supabase
            .from('trade_journal_entries')
            .upsert(entry, {
              onConflict: 'broker_trade_id,broker_connection_id',
              ignoreDuplicates: false
            })
          
          if (!singleError) successCount++
        }
        
        if (successCount === 0) {
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Failed to save trades',
              details: upsertError.message 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        
        console.log(`✅ Saved ${successCount} of ${journalEntries.length} trades`)
      } else {
        console.log(`✅ Successfully upserted ${journalEntries.length} trades`)
      }
    }

    // Update connection with success
    await supabase
      .from('broker_connections')
      .update({ 
        last_sync_at: new Date().toISOString(),
        last_error: null
      })
      .eq('id', connection.id)

    return new Response(
      JSON.stringify({
        success: true,
        trades_synced: journalEntries.length,
        account_balance: account_balance || null,
        message: `Successfully synced ${journalEntries.length} trades`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error syncing broker trades:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})




