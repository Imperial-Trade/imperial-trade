// recovery-email: Fresh deployment to handle password reset emails reliably
// Deployed: 2025-08-20

import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SUPABASE_URL = 'https://kmuoqkcxguafxulqlbmi.supabase.co'
const ONESIGNAL_API_KEY = (Deno.env.get('ONESIGNAL_API_KEY') || '').trim()
const ONESIGNAL_APP_ID = (Deno.env.get('ONESIGNAL_APP_ID') || '').trim()
const HOOK_SECRET = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') || '').trim()

function validateEnv() {
  const missing: string[] = []
  if (!ONESIGNAL_API_KEY) missing.push('ONESIGNAL_API_KEY')
  if (!ONESIGNAL_APP_ID) missing.push('ONESIGNAL_APP_ID')
  if (!HOOK_SECRET) missing.push('SEND_EMAIL_HOOK_SECRET')
  if (missing.length) {
    throw new Error(`Missing required env: ${missing.join(', ')}`)
  }
}

function getHtml(resetUrl: string) {
  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta http-equiv="x-ua-compatible" content="ie=edge" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Reset your Imperial Trading password</title>
      <style>
        body { background:#0b0f15; color:#e6edf3; font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, Helvetica, Arial, sans-serif; padding:24px; }
        .card { background:#0f1720; border:1px solid #1f2937; border-radius:12px; max-width:560px; margin:0 auto; padding:24px; }
        .btn { display:inline-block; background:#2563eb; color:white; padding:12px 18px; border-radius:10px; text-decoration:none; font-weight:600; }
        .muted { color:#9aa4b2; font-size:14px; }
        .footer { color:#6b7280; font-size:12px; margin-top:24px; text-align:center; }
        code { word-break: break-all; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1 style="margin:0 0 12px">Imperial Trading</h1>
        <p>Tap the button below to reset your password. This link expires shortly for security.</p>
        <p style="margin:20px 0">
          <a class="btn" href="${resetUrl}" target="_blank" rel="noopener">Reset Password</a>
        </p>
        <p class="muted">If the button doesn't work, copy and paste this URL:</p>
        <p class="muted"><code>${resetUrl}</code></p>
        <hr style="border-color:#1f2937; margin:24px 0"/>
        <p class="footer">If you didn't request this, you can safely ignore this email.</p>
      </div>
    </body>
  </html>`
}

serve(async (req) => {
  const requestId = crypto.randomUUID()

  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const url = new URL(req.url)

  // Health endpoints
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/health')) {
    try {
      validateEnv()
      return new Response(JSON.stringify({ ok: true, env: {
        api: !!ONESIGNAL_API_KEY, app: !!ONESIGNAL_APP_ID, hook: !!HOOK_SECRET
      }}), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    } catch (e: any) {
      return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 503, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }

  try {
    validateEnv()

    const raw = await req.text()
    const headers = Object.fromEntries(req.headers)

    // Verify Supabase Auth webhook
    const wh = new Webhook(HOOK_SECRET)
    const data = wh.verify(raw, headers) as {
      user: { email: string }
      email_data: { token_hash: string; redirect_to: string; email_action_type: string }
    }

    if (data.email_data.email_action_type !== 'recovery') {
      return new Response(JSON.stringify({ skipped: true }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const resetUrl = `${SUPABASE_URL}/auth/v1/verify?token=${data.email_data.token_hash}&type=recovery&redirect_to=${encodeURIComponent(data.email_data.redirect_to || 'https://www.tradeimperial.com/reset-password')}`

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      target_channel: 'email',
      include_email_tokens: [data.user.email],
      email_subject: 'Reset your Imperial Trading password',
      email_body: getHtml(resetUrl),
      email_from_name: 'Imperial Trading Support',
      email_from_address: 'support@tradeimperial.com',
      email_reply_to_address: 'support@tradeimperial.com',
      include_unsubscribed: true,
      is_transactional: true,
    }

    const resp = await fetch('https://api.onesignal.com/notifications?c=email', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    if (!resp.ok) {
      const txt = await resp.text()
      console.error(`[${requestId}] OneSignal error`, resp.status, resp.statusText, txt)
      return new Response(JSON.stringify({ error: 'OneSignal API error', details: txt }), { status: resp.status >= 400 && resp.status < 500 ? 422 : 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
    }

    const json = await resp.json()
    return new Response(JSON.stringify({ success: true, requestId, oneSignal: json }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  } catch (e: any) {
    console.error(`[${requestId}] Handler error`, e?.message)
    const status = e?.message?.includes('signature') ? 401 : 500
    return new Response(JSON.stringify({ error: e?.message || 'Unknown error', requestId }), { status, headers: { 'Content-Type': 'application/json', ...corsHeaders } })
  }
})
