
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const escapeHtml = (unsafe: unknown): string => {
  const s = typeof unsafe === 'string' ? unsafe : String(unsafe ?? '');
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const truncate = (str: string, max: number) => (str && str.length > max ? str.slice(0, max - 1) + '…' : str);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Enforce POST method for this endpoint
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { requestId, status, rejectionReason } = await req.json()

    const allowedStatuses = ['approved', 'rejected'] as const
    if (!requestId || !status || !allowedStatuses.includes(String(status) as any)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing fields', details: { required: ['requestId', 'status'], allowedStatuses } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedReason: string | null = typeof rejectionReason === 'string' && rejectionReason.trim() ? rejectionReason.trim() : null

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
    const correlationId = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2,8)}`

    // Ensure request exists before updating
    const { data: existingRequest, error: fetchErr } = await supabaseClient
      .from('account_requests')
      .select('*')
      .eq('id', requestId)
      .single()

    if (fetchErr || !existingRequest) {
      return new Response(
        JSON.stringify({ error: 'Account request not found', correlationId }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update the account request status only
    const { data: request, error: updateError } = await supabaseClient
      .from('account_requests')
      .update({ 
        status, 
        rejection_reason: status === 'rejected' ? normalizedReason : null,
        approved_by: status === 'approved' ? approvedBy : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      console.error(`[${correlationId}] Database update error:`, updateError)
      return new Response(
        JSON.stringify({ error: 'Database update failed', correlationId }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[${correlationId}] Account request ${status}: ${request.email} by ${approvedBy}`)

    // Send notification email via OneSignal (gracefully handle failures)
    const appId = Deno.env.get('ONESIGNAL_APP_ID')
    const apiKey = Deno.env.get('ONESIGNAL_API_KEY')

    let emailInfo: Record<string, unknown> = { sent: false, correlationId }
    try {
      if (!appId || !apiKey) {
        console.warn(`[${correlationId}] OneSignal keys not configured; skipping email send`)
        emailInfo = { sent: false, skipped: true, reason: 'missing_config', correlationId }
      } else if (request?.email) {
        const statusPageUrl = 'https://www.tradeimperial.com/account-request-status'
        const subject = status === 'approved'
          ? 'Your Imperial Trading account request was approved'
          : 'Update on your Imperial Trading account request'
        const preheader = status === 'approved'
          ? 'Your account request was approved. View next steps.'
          : 'Your account request was reviewed. See details.'

        const reasonHtml = status === 'rejected' && normalizedReason
          ? `<p><strong>Reason:</strong> ${escapeHtml(normalizedReason)}</p>`
          : ''

        const logoUrl = (Deno.env.get('EMAIL_LOGO_URL') ?? '').trim() || 'https://www.tradeimperial.com/logo.png';
        console.log(`[${correlationId}] Using approval email logo`, { logoUrl });
        const headerHtml = `<div style="text-align:center;margin-bottom:12px"><img src="${logoUrl}" alt="Imperial Trading logo" style="max-width:180px;height:auto;"/></div>`;

        const bodyHtml = status === 'approved'
          ? `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a">
              ${headerHtml}
              <h2 style="margin:0 0 12px 0;">You're in! 🎉</h2>
              <p>Hi ${escapeHtml(request.full_name || 'there')},</p>
              <p>Your account request has been <strong>approved</strong>.</p>
              <p>To view your status and next steps, please visit the page below and enter your email address:</p>
              <p><a href="${statusPageUrl}" style="color:#2563eb;">${statusPageUrl}</a></p>
              <p>If you don't yet have a password, use the "Forgot password" link on the login page to set one.</p>
              <p style="font-size:12px;color:#64748b;">Ref: ${correlationId}</p>
              <p>— Imperial Trading Team</p>
            </div>
          `
          : `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a">
              ${headerHtml}
              <h2 style="margin:0 0 12px 0;">Account Request Update</h2>
              <p>Hi ${escapeHtml(request.full_name || 'there')},</p>
              <p>Your request has been <strong>reviewed</strong> and is currently <strong>rejected</strong>.</p>
              ${reasonHtml}
              <p>You can view the status and instructions here by entering your email:</p>
              <p><a href="${statusPageUrl}" style="color:#2563eb;">${statusPageUrl}</a></p>
              <p style="font-size:12px;color:#64748b;">Ref: ${correlationId}</p>
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
            email_preheader: truncate(preheader, 150),
            is_transactional: true,
            target_channel: 'email',
            external_id: correlationId,
            custom_data: { requestId, status, correlationId },
          }),
        })

        const payload = await onesignalRes.json().catch(() => ({}))
        emailInfo = { sent: onesignalRes.ok, status: onesignalRes.status, payload, correlationId }
        if (!onesignalRes.ok) {
          console.error(`[${correlationId}] OneSignal email error:`, payload)
        }
      } else {
        emailInfo = { sent: false, skipped: true, reason: 'missing_recipient', correlationId }
      }
    } catch (e) {
      console.error(`[${correlationId}] Failed to send OneSignal email:`, e)
      emailInfo = { sent: false, error: String(e), correlationId }
    }

    return new Response(
      JSON.stringify({ success: true, data: request, email: emailInfo, correlationId }),
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
