
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

    // Get the current user to track who approved the request
    const authHeader = req.headers.get('Authorization')
    let approvedBy = 'admin'
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseClient.auth.getUser(token)
      if (user) {
        approvedBy = user.email || 'admin'
      }
    }

    // Update the account request status only
    const { data: request, error: updateError } = await supabaseClient
      .from('account_requests')
      .update({ 
        status, 
        rejection_reason: rejectionReason || null,
        approved_by: status === 'approved' ? approvedBy : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      console.error('Database update error:', updateError)
      throw updateError
    }

    console.log(`Account request ${status}: ${request.email} by ${approvedBy}`)

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
