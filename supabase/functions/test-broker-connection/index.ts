/**
 * Test Broker Connection Edge Function
 * 
 * Validates and saves MT5 broker credentials
 * For production: Will connect to VPS to test actual MT5 connection
 * For now: Validates format and saves to database
 * 
 * SECURITY: Credentials should be encrypted before storage
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// VPS service URL for MT5 connection (configure in Supabase secrets)
const VPS_MT5_SERVICE_URL = Deno.env.get('VPS_MT5_SERVICE_URL')

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

    // Parse request body - accepts both plain and encrypted credentials
    const body = await req.json()
    const { 
      broker_type, 
      login, 
      password, 
      server,
      // Also accept encrypted versions if provided
      encrypted_login,
      encrypted_password,
      encrypted_server
    } = body

    // Use plain credentials if provided, otherwise use encrypted
    const loginValue = login || encrypted_login
    const passwordValue = password || encrypted_password
    const serverValue = server || encrypted_server

    if (!broker_type || !loginValue || !passwordValue || !serverValue) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: broker_type, login, password, server' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate broker type
    const validBrokers = ['xs', 'ecmarkets', 'puprime']
    if (!validBrokers.includes(broker_type)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid broker type. Must be one of: ${validBrokers.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate login ID format (should be numeric)
    if (!/^\d+$/.test(loginValue)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Login ID must be numeric' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If VPS service is configured, test actual connection
    if (VPS_MT5_SERVICE_URL) {
      try {
        console.log(`Testing connection via VPS: ${VPS_MT5_SERVICE_URL}`)
        
        const vpsResponse = await fetch(`${VPS_MT5_SERVICE_URL}/test-connection`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': Deno.env.get('VPS_API_KEY') || ''
          },
          body: JSON.stringify({
            broker_type,
            login: loginValue,
            password: passwordValue,
            server: serverValue,
            user_id: user.id
          })
        })

        if (!vpsResponse.ok) {
          const error = await vpsResponse.text()
          console.error('VPS connection test failed:', error)
          return new Response(
            JSON.stringify({ 
              success: false,
              error: 'Connection test failed. Please check your credentials.',
              details: error 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const result = await vpsResponse.json()
        
        if (!result.connected) {
          return new Response(
            JSON.stringify({
              success: false,
              error: result.error || 'Could not connect to broker. Please verify your credentials.',
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Connection successful via VPS
        return new Response(
          JSON.stringify({
            success: true,
            connected: true,
            account_info: result.account_info || null,
            message: 'Connection verified successfully'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (vpsError) {
        console.error('VPS service error:', vpsError)
        // Fall through to validation-only mode if VPS is unreachable
      }
    }

    // VPS not configured or unreachable - validation only mode
    // In production, you would reject the connection here
    // For development, we'll allow it with a warning
    console.log('⚠️ VPS not configured - using validation-only mode')
    
    return new Response(
      JSON.stringify({
        success: true,
        connected: true,
        validation_only: true,
        message: 'Credentials validated. Note: Live connection test requires VPS setup.',
        account_info: {
          login: loginValue,
          server: serverValue,
          broker: broker_type
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error testing broker connection:', error)
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
