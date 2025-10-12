import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, accountRequestId, password } = await req.json()

    if (!email || !accountRequestId || !password) {
      return new Response(
        JSON.stringify({ error: 'Email, accountRequestId, and password are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Creating account for approved user:', email, 'with provided password:', !!password)

    // Get the account request to verify it's approved
    const { data: accountRequest, error: requestError } = await supabaseAdmin
      .from('account_requests')
      .select('*')
      .eq('id', accountRequestId)
      .eq('email', email.toLowerCase().trim())
      .eq('status', 'approved')
      .single()

    if (requestError || !accountRequest) {
      console.error('Account request not found or not approved:', requestError)
      return new Response(
        JSON.stringify({ error: 'Account request not found or not approved' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Use provided password directly
    const accountPassword = password

    // Create the user in Supabase Auth with actual password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase().trim(),
      password: accountPassword,
      email_confirm: true,
      user_metadata: {
        full_name: accountRequest.full_name,
        account_request_id: accountRequestId,
      }
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return new Response(
        JSON.stringify({ error: 'Failed to create user account', details: authError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User created successfully:', authData.user.id)

    // Update the timestamp
    await supabaseAdmin
      .from('account_requests')
      .update({ 
        updated_at: new Date().toISOString()
      })
      .eq('id', accountRequestId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Account created successfully. You can now sign in.',
        userId: authData.user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-approved-account:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
