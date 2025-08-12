
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

    // Get and verify current user, enforce admin-only access
    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userErr } = await supabaseClient.auth.getUser(token)
    if (userErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin role using security definer function
    const { data: isAdmin, error: roleErr } = await supabaseClient.rpc('has_role', { _user_id: user.id, _role: 'admin' })
    if (roleErr) {
      console.error('Role check error:', roleErr)
      return new Response(
        JSON.stringify({ error: 'Access check failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const approvedBy = user.email || 'admin'

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

    // Send notification email via OneSignal (gracefully handle failures)
    const appId = Deno.env.get('ONESIGNAL_APP_ID')
    const apiKey = Deno.env.get('ONESIGNAL_API_KEY')

    let emailInfo: Record<string, unknown> = { sent: false }
    try {
      if (!appId || !apiKey) {
        console.warn('OneSignal keys not configured; skipping email send')
      } else if (request?.email) {
        const statusPageUrl = 'https://www.tradeimperial.com/account-request-status'
        const subject = status === 'approved'
          ? 'Your Imperial Trading account request was approved'
          : 'Update on your Imperial Trading account request'

        const bodyHtml = status === 'approved'
          ? `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a">
              <h2 style="margin:0 0 12px 0;">You're in! 🎉</h2>
              <p>Hi ${request.full_name || 'there'},</p>
              <p>Your account request has been <strong>approved</strong>.</p>
              <p>To view your status and next steps, please visit the page below and enter your email address:</p>
              <p><a href="${statusPageUrl}" style="color:#2563eb;">${statusPageUrl}</a></p>
              <p>If you don't yet have a password, use the "Forgot password" link on the login page to set one.</p>
              <p>— Imperial Trading Team</p>
            </div>
          `
          : `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a">
              <h2 style="margin:0 0 12px 0;">Account Request Update</h2>
              <p>Hi ${request.full_name || 'there'},</p>
              <p>Your request has been <strong>reviewed</strong> and is currently <strong>rejected</strong>.</p>
              ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
              <p>You can view the status and instructions here by entering your email:</p>
              <p><a href="${statusPageUrl}" style="color:#2563eb;">${statusPageUrl}</a></p>
              <p>If allowed, you may resubmit your request with updated details.</p>
              <p>— Imperial Trading Team</p>
            </div>
          `

        const onesignalRes = await fetch('https://api.onesignal.com/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${apiKey}`,
          },
          body: JSON.stringify({
            app_id: appId,
            include_email_tokens: [request.email],
            email_subject: subject,
            email_body: bodyHtml,
            target_channel: 'email',
          }),
        })

        const payload = await onesignalRes.json().catch(() => ({}))
        emailInfo = { sent: onesignalRes.ok, status: onesignalRes.status, payload }
        if (!onesignalRes.ok) {
          console.error('OneSignal email error:', payload)
        }
      }
    } catch (e) {
      console.error('Failed to send OneSignal email:', e)
      emailInfo = { sent: false, error: String(e) }
    }

    return new Response(
      JSON.stringify({ success: true, data: request, email: emailInfo }),
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
