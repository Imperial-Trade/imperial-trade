
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Hash function for PII sanitization in logs
function hashIdentifier(identifier: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(identifier);
  const hashBuffer = crypto.subtle.digestSync('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 8);
}

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
    let approverHash = 'admin'
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseClient.auth.getUser(token)
      if (user) {
        approvedBy = user.email || 'admin'
        approverHash = hashIdentifier(user.email || 'admin')
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

    // Sanitized logging with hashed identifiers only
    const requestHash = hashIdentifier(request.email)
    console.log(`Account request ${status}: email_hash=${requestHash} by approver_hash=${approverHash} request_id=${requestId}`)

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
