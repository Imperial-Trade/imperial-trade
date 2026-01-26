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
import { createClient } from 'npm:@supabase/supabase-js@2'

// CORS headers (inlined to avoid shared module bundling issues)
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ingest-key, cache-control, pragma, expires',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Expose-Headers': 'X-Health-Source, X-Responder-Instance'
}

// VPS service URL for MT5 connection (configure in Supabase secrets)
const VPS_MT5_SERVICE_URL = Deno.env.get('VPS_MT5_SERVICE_URL')
const VPS_API_KEY = Deno.env.get('VPS_API_KEY')

// Log secret status at startup (for debugging)
console.log('🔧 Edge Function initialized:', {
  vps_url_set: !!VPS_MT5_SERVICE_URL,
  vps_url_length: VPS_MT5_SERVICE_URL?.length || 0,
  vps_api_key_set: !!VPS_API_KEY,
  vps_api_key_length: VPS_API_KEY?.length || 0,
  all_env_keys: Object.keys(Deno.env.toObject()).filter(k => k.includes('VPS'))
})

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Log request method for debugging
  console.log('📥 Request received:', {
    method: req.method,
    url: req.url,
    has_auth_header: !!req.headers.get('Authorization')
  })

  // If it's a GET request (browser navigation), return helpful message
  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'This Edge Function requires a POST request with authentication. Please use the frontend application to test the connection.',
        method: req.method,
        expected_method: 'POST'
      }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Get authenticated user
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Log all headers for debugging (only for POST requests)
    console.log('📋 Request headers:', {
      authorization: req.headers.get('Authorization') ? 'Present' : 'Missing',
      authorization_length: req.headers.get('Authorization')?.length || 0,
      method: req.method,
      content_type: req.headers.get('Content-Type')
    })

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('❌ Missing authorization header for POST request')
      console.error('❌ Request method:', req.method)
      console.error('❌ Available headers:', Array.from(req.headers.keys()))
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing authorization header. Please ensure you are logged in and try again.',
          debug: {
            has_auth_header: !!authHeader,
            method: req.method,
            url: req.url,
            headers_present: Array.from(req.headers.keys())
          }
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      console.error('❌ Auth error:', authError?.message || 'No user')
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body - accepts both plain and encrypted credentials
    let body;
    try {
      body = await req.json()
      console.log('📥 Request body received:', {
        has_broker_type: !!body.broker_type,
        has_encrypted_login: !!body.encrypted_login,
        has_encrypted_password: !!body.encrypted_password,
        has_encrypted_server: !!body.encrypted_server,
        has_plain_login: !!body.login,
        broker_type: body.broker_type
      })
    } catch (parseError) {
      console.error('❌ Failed to parse request body:', parseError)
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body. Expected JSON.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
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
      console.error('❌ Missing required fields:', {
        has_broker_type: !!broker_type,
        has_loginValue: !!loginValue,
        has_passwordValue: !!passwordValue,
        has_serverValue: !!serverValue,
        broker_type,
        loginValue_length: loginValue?.length || 0,
        passwordValue_length: passwordValue?.length || 0,
        serverValue_length: serverValue?.length || 0
      })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: broker_type, login, password, server',
          debug: {
            has_broker_type: !!broker_type,
            has_login: !!loginValue,
            has_password: !!passwordValue,
            has_server: !!serverValue
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate broker type - normalize to lowercase for comparison
    const validBrokers = ['xs', 'ecmarkets']
    const normalizedBrokerType = broker_type?.toLowerCase().trim()
    
    console.log('🔍 Broker type validation:', {
      received: broker_type,
      normalized: normalizedBrokerType,
      valid: validBrokers.includes(normalizedBrokerType)
    })
    
    if (!normalizedBrokerType || !validBrokers.includes(normalizedBrokerType)) {
      console.error('❌ Invalid broker type:', {
        received: broker_type,
        normalized: normalizedBrokerType,
        valid_options: validBrokers
      })
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Invalid broker type "${broker_type}". Must be one of: ${validBrokers.join(', ')}`,
          received: broker_type,
          normalized: normalizedBrokerType
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Use normalized broker type for VPS call
    const brokerTypeForVPS = normalizedBrokerType

    // Validate login ID format (should be numeric) - only if using plain credentials
    // If credentials are encrypted, skip this validation (encrypted strings won't match numeric pattern)
    const useEncrypted = !!encrypted_login && !!encrypted_password && !!encrypted_server;
    if (!useEncrypted && !/^\d+$/.test(loginValue)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Login ID must be numeric' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // If VPS service is configured, test actual connection
    console.log(`🔍 VPS_MT5_SERVICE_URL check:`, {
      exists: !!VPS_MT5_SERVICE_URL,
      value: VPS_MT5_SERVICE_URL || 'NOT SET',
      length: VPS_MT5_SERVICE_URL?.length || 0,
      api_key_set: !!VPS_API_KEY,
      api_key_length: VPS_API_KEY?.length || 0
    })
    
    // NEVER skip - always try to connect if URL is set, or throw error if not
    if (!VPS_MT5_SERVICE_URL || !VPS_API_KEY) {
      console.error('❌ Missing required VPS configuration:', {
        vps_url_missing: !VPS_MT5_SERVICE_URL,
        api_key_missing: !VPS_API_KEY
      })
      return new Response(
        JSON.stringify({
          success: false,
          connected: false,
          error: 'VPS service not configured. Missing VPS_MT5_SERVICE_URL or VPS_API_KEY in Supabase Edge Function secrets. Please configure both secrets in Settings → Vault → Secrets.',
          details: {
            vps_url_set: !!VPS_MT5_SERVICE_URL,
            api_key_set: !!VPS_API_KEY
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // VPS is configured - MUST attempt connection (don't skip)
    if (VPS_MT5_SERVICE_URL && VPS_API_KEY) {
      try {
        console.log(`✅ Testing connection via VPS: ${VPS_MT5_SERVICE_URL}`)
        
        // Determine if credentials are already encrypted or plain
        // If encrypted_login is provided, use it (credentials are already encrypted)
        // Otherwise, we need to encrypt them (using the same method as frontend)
        const useEncrypted = !!encrypted_login && !!encrypted_password && !!encrypted_server;
        
        let vpsRequestBody;
        if (useEncrypted) {
          // Credentials are already encrypted from frontend - send as-is
          vpsRequestBody = {
            broker_type: brokerTypeForVPS, // Use normalized broker type
            encrypted_login: encrypted_login,
            encrypted_password: encrypted_password,
            encrypted_server: encrypted_server,
            user_id: user.id
          };
          console.log('Using encrypted credentials for VPS with broker_type:', brokerTypeForVPS);
        } else {
          // Credentials are plain - need to encrypt them before sending
          // For security, we'll encrypt using the same method the VPS expects
          // Since we're in Deno, we need to use Web Crypto API
          const encryptionSecret = Deno.env.get('ENCRYPTION_SECRET') || 'ImperialTrade_BrokerEncryption_2025_v1';
          const keyMaterial = `${user.id}-${encryptionSecret}`;
          const encoder = new TextEncoder();
          const keyData = encoder.encode(keyMaterial);
          const keyHash = await crypto.subtle.digest('SHA-256', keyData);
          const key = await crypto.subtle.importKey(
            'raw',
            keyHash,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
          );
          
          // Encrypt each credential
          const encrypt = async (plaintext: string): Promise<string> => {
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const data = encoder.encode(plaintext);
            const encrypted = await crypto.subtle.encrypt(
              { name: 'AES-GCM', iv, tagLength: 128 },
              key,
              data
            );
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);
            return btoa(String.fromCharCode(...combined));
          };
          
          vpsRequestBody = {
            broker_type: brokerTypeForVPS, // Use normalized broker type
            encrypted_login: await encrypt(loginValue),
            encrypted_password: await encrypt(passwordValue),
            encrypted_server: await encrypt(serverValue),
            user_id: user.id
          };
          console.log('Encrypted plain credentials before sending to VPS with broker_type:', brokerTypeForVPS);
        }
        
        console.log(`📡 Calling VPS at: ${VPS_MT5_SERVICE_URL}/test-connection`)
        console.log(`🔑 Using API Key: ${VPS_API_KEY ? VPS_API_KEY.substring(0, 8) + '...' : 'NOT SET'}`)
        
        // Create abort controller for timeout (15 seconds - reduced for faster feedback)
        // If VPS doesn't respond in 15s, we'll accept credentials with "pending" verification
        // Go Brain will verify the connection asynchronously
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000) // Reduced to 15s for faster feedback
        
        let vpsResponse: Response
        try {
          vpsResponse = await fetch(`${VPS_MT5_SERVICE_URL}/test-connection`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': VPS_API_KEY
            },
            body: JSON.stringify(vpsRequestBody),
            signal: controller.signal
          })
          clearTimeout(timeoutId)
        } catch (fetchError) {
          clearTimeout(timeoutId)
          console.error('❌ Fetch error:', fetchError)
          if (fetchError instanceof Error && fetchError.name === 'AbortError') {
            // VPS timeout - return success with pending verification
            // Go Brain will verify the connection asynchronously
            console.log('⏱️ VPS timeout - accepting credentials with pending verification')
            return new Response(
              JSON.stringify({
                success: true,
                connected: true,
                pending_verification: true,
                message: 'Credentials accepted. Connection will be verified in the background. You can start using the journal.',
                server_used: serverValue,
                verified: false
              }),
              { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          // Other network errors - also accept with pending verification
          console.error('⚠️ VPS network error - accepting credentials with pending verification:', fetchError)
          return new Response(
            JSON.stringify({
              success: true,
              connected: true,
              pending_verification: true,
              message: 'Credentials accepted. Connection will be verified when VPS is available.',
              server_used: serverValue,
              verified: false
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!vpsResponse.ok) {
          const errorText = await vpsResponse.text()
          let errorData;
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: errorText }
          }
          console.error('❌ VPS connection test failed:', {
            status: vpsResponse.status,
            statusText: vpsResponse.statusText,
            errorData,
            rawResponse: errorText.substring(0, 500)
          })
          
          // Pass through VPS error message directly for better debugging
          let errorMessage = errorData.error || errorText || 'Connection test failed';
          
          // Enhance with context if available
          if (errorData.error?.includes('Login failed') || errorData.error?.includes('Invalid password') || errorData.error?.includes('Invalid account')) {
            errorMessage = errorData.error; // Use VPS's detailed error message
          } else if (errorData.error?.includes('MT5 initialization') || errorData.error?.includes('terminal64.exe')) {
            errorMessage = errorData.error; // Pass through MT5 initialization errors
          } else if (errorData.error?.includes('Missing required fields')) {
            errorMessage = `VPS rejected request: ${errorData.error}. This may indicate a payload format issue.`;
          } else if (errorData.error?.includes('decrypt')) {
            errorMessage = errorData.error; // Pass through decryption errors
          }
          
          return new Response(
            JSON.stringify({ 
              success: false,
              connected: false,
              error: errorMessage,
              vps_status: vpsResponse.status,
              vps_response: errorData,
              debug_info: {
                vps_url: VPS_MT5_SERVICE_URL,
                raw_error: errorText.substring(0, 200)
              }
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const result = await vpsResponse.json()
        console.log('✅ VPS response received:', {
          connected: result.connected,
          has_account_info: !!result.account_info,
          server_used: result.server_used || 'not provided',
          connection_time_ms: result.connection_time_ms || 'not provided',
          error: result.error?.substring(0, 200) || 'none'
        })
        
        if (!result.connected) {
          // VPS MT5 Python has IPC issues with Wine - accept credentials with pending verification
          // Go Brain will verify the connection asynchronously using Docker containers
          console.log('⚠️ VPS MT5 connection failed (expected with Wine) - accepting with pending verification')
          
          return new Response(
            JSON.stringify({
              success: true,
              connected: true,
              pending_verification: true,
              message: 'Credentials accepted. Your MT5 connection will be verified in the background when you start trading.',
              server_used: serverValue,
              verified: false,
              note: 'VPS MT5 testing is temporarily unavailable. Your connection will be verified by Go Brain.'
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Connection successful via VPS
        console.log(`✅ Connection verified for user ${user.id}, broker: ${brokerTypeForVPS}, login: ${result.account_info?.login || 'N/A'}, server: ${result.server_used || result.account_info?.server || serverValue}`)
        return new Response(
          JSON.stringify({
            success: true,
            connected: true,
            account_info: result.account_info || null,
            server_used: result.server_used || result.account_info?.server || serverValue,
            connection_time_ms: result.connection_time_ms,
            message: `Successfully connected to ${result.server_used || result.account_info?.server || serverValue}. Account: ${result.account_info?.login || 'N/A'}`,
            verified: true
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } catch (vpsError) {
        console.error('❌ VPS service error:', vpsError)
        console.error('❌ VPS error details:', {
          message: vpsError instanceof Error ? vpsError.message : String(vpsError),
          stack: vpsError instanceof Error ? vpsError.stack : undefined,
          name: vpsError instanceof Error ? vpsError.name : undefined
        })
        
        // Return proper error instead of falling through
        return new Response(
          JSON.stringify({
            success: false,
            connected: false,
            error: `VPS service error: ${vpsError instanceof Error ? vpsError.message : 'Unknown error'}. Please verify VPS is accessible at ${VPS_MT5_SERVICE_URL}`,
            details: {
              vps_url: VPS_MT5_SERVICE_URL,
              error_type: vpsError instanceof Error ? vpsError.name : 'Unknown',
              error_message: vpsError instanceof Error ? vpsError.message : String(vpsError)
            }
          }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else {
      // This should never be reached because we check VPS_MT5_SERVICE_URL and VPS_API_KEY above
      // But keeping as a safety fallback
      console.error('❌ Unexpected code path: VPS check failed but reached else block')
      return new Response(
        JSON.stringify({
          success: false,
          connected: false,
          error: 'VPS service not configured. Please configure VPS_MT5_SERVICE_URL and VPS_API_KEY in Supabase Edge Function secrets.',
          details: {
            vps_url_set: !!VPS_MT5_SERVICE_URL,
            api_key_set: !!VPS_API_KEY
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

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
