
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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { requestId, status, rejectionReason } = await req.json()

    if (!requestId || !status) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the account request status
    const { data: request, error: updateError } = await supabaseClient
      .from('account_requests')
      .update({ 
        status, 
        rejection_reason: rejectionReason || null 
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      throw updateError
    }

    // If approved, create the user account
    if (status === 'approved') {
      const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
        email: request.email,
        email_confirm: true,
        user_metadata: {
          full_name: request.full_name,
          account_type: request.account_type,
          access_level: request.account_type === 'educator' ? 'moderator' : 'user',
          role: request.account_type === 'educator' ? 'educator' : 'user',
          user_type: request.account_type === 'educator' ? 'educator' : 'member',
          phone_number: request.phone_number,
          vt_market_account_number: request.vt_market_account_number,
          referrer: request.referrer
        }
      })

      if (authError) {
        throw authError
      }

      console.log(`User created successfully: ${authUser.user?.id}`)
    }

    return new Response(
      JSON.stringify({ success: true, data: request }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing account approval:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
