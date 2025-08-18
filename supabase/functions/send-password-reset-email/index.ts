import React from 'npm:react@18.3.1'
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'

import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import PasswordResetEmail from './_templates/password-reset.tsx'

const ONESIGNAL_API_KEY = (Deno.env.get('ONESIGNAL_API_KEY') || '').trim()
const ONESIGNAL_APP_ID = (Deno.env.get('ONESIGNAL_APP_ID') || '').trim()
const hookSecret = (Deno.env.get('SEND_FORGOT_PASSWORD_EMAIL_HOOK_SECRET') || Deno.env.get('SEND_EMAIL_HOOK_SECRET') || '').trim()
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://kmuoqkcxguafxulqlbmi.supabase.co'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Supabase Auth email webhook (Standard Webhooks)
    const payloadText = await req.text()
    const headers = Object.fromEntries(req.headers)

    if (!hookSecret) {
      throw new Error('Missing webhook secret: SEND_FORGOT_PASSWORD_EMAIL_HOOK_SECRET or SEND_EMAIL_HOOK_SECRET')
    }

    const wh = new Webhook(hookSecret)
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payloadText, headers) as {
      user: { email: string; user_metadata?: Record<string, any> }
      email_data: {
        token: string
        token_hash: string
        redirect_to: string
        email_action_type: string
      }
    }

    // Only handle password recovery emails here
    if (email_action_type !== 'recovery') {
      return new Response(JSON.stringify({ skipped: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const html = await renderAsync(
      React.createElement(PasswordResetEmail, {
        supabase_url: SUPABASE_URL,
        token,
        token_hash,
        redirect_to: redirect_to || 'https://www.tradeimperial.com/reset-password',
        email_action_type,
        brand_name: 'Imperial Trading',
        support_email: 'support@tradeimperial.com',
      })
    )

const authHeader = `Key ${ONESIGNAL_API_KEY}`
if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
  throw new Error('Missing OneSignal configuration: ONESIGNAL_API_KEY or ONESIGNAL_APP_ID')
}

const payload = {
  app_id: ONESIGNAL_APP_ID,
  target_channel: 'email',
  email_to: [user.email],
  email_subject: 'Reset your Imperial Trading password',
  email_body: html,
  email_from_name: 'Imperial Trading',
  email_reply_to_address: 'support@tradeimperial.com'
}

const osResp = await fetch('https://api.onesignal.com/notifications?c=email', {
  method: 'POST',
  headers: {
    'Authorization': authHeader,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})

if (!osResp.ok) {
  const errText = await osResp.text()
  throw new Error(`OneSignal email send failed: ${osResp.status} ${errText}`)
}

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error: any) {
    console.error('send-password-reset-email error:', error)
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
