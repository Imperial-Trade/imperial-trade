import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'
import { encode } from "https://deno.land/x/djwt@v3.0.2/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JWTPayload {
  iss: string
  exp: number
  iat: number
  aud: string
  appKey: string
  tokenExp: number
  alg: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, meetingNumber, role = 0 } = await req.json()

    if (!sessionId || !meetingNumber) {
      return new Response(
        JSON.stringify({ error: 'Missing sessionId or meetingNumber' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get Zoom SDK credentials from Supabase secrets
    const zoomSdkKey = Deno.env.get('ZOOM_SDK_KEY')
    const zoomSdkSecret = Deno.env.get('ZOOM_SDK_SECRET')

    if (!zoomSdkKey || !zoomSdkSecret) {
      console.error('Missing Zoom SDK credentials')
      return new Response(
        JSON.stringify({ error: 'Zoom SDK not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from auth header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify user can access the session
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('id, zoom_sdk_enabled, zoom_meeting_number')
      .eq('id', sessionId)
      .eq('zoom_sdk_enabled', true)
      .single()

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Session not found or SDK not enabled' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (session.zoom_meeting_number !== meetingNumber) {
      return new Response(
        JSON.stringify({ error: 'Meeting number mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate JWT for Zoom SDK
    const iat = Math.floor(Date.now() / 1000)
    const exp = iat + 60 * 60 * 2 // 2 hours

    const payload: JWTPayload = {
      iss: zoomSdkKey,
      exp: exp,
      iat: iat,
      aud: 'zoom',
      appKey: zoomSdkKey,
      tokenExp: exp,
      alg: 'HS256'
    }

    const jwt = await encode(
      { alg: "HS256", typ: "JWT" },
      payload,
      zoomSdkSecret
    )

    console.log(`Generated JWT for user ${user.id}, session ${sessionId}, meeting ${meetingNumber}`)

    return new Response(
      JSON.stringify({ 
        signature: jwt,
        apiKey: zoomSdkKey,
        meetingNumber: meetingNumber,
        userName: user.email || 'User',
        userEmail: user.email || '',
        passWord: '',
        role: role
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error generating Zoom JWT:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})