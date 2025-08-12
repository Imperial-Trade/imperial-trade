import React from 'npm:react@18.3.1'
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'

import { renderAsync } from 'npm:@react-email/components@0.0.22'
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'
import PasswordResetEmail from './_templates/password-reset.tsx'

const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID') as string
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY') as string
const hookSecret = Deno.env.get('SEND_FORGOT_PASSWORD_EMAIL_HOOK_SECRET') as string
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

    const ALLOWED_REDIRECT = 'https://www.tradeimperial.com/reset-password'

    // Enforce production redirect URL
    let enforcedRedirect = ALLOWED_REDIRECT
    try {
      if (redirect_to) {
        const incoming = new URL(redirect_to)
        const allowed = new URL(ALLOWED_REDIRECT)
        if (incoming.origin === allowed.origin && incoming.pathname === allowed.pathname) {
          enforcedRedirect = incoming.toString()
        } else {
          console.log('Overriding invalid redirect_to', { redirect_to })
        }
      }
    } catch (_e) {
      console.log('Malformed redirect_to received, overriding to allowed URL')
    }

    const html = await renderAsync(
      React.createElement(PasswordResetEmail, {
        supabase_url: SUPABASE_URL,
        token,
        token_hash,
        redirect_to: enforcedRedirect,
        email_action_type,
        brand_name: 'Trade Imperial',
        support_email: 'tradeimperial2025@gmail.com',
        logo_url: 'https://www.tradeimperial.com/logo.png',
      })
    )

    const onesignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_email_tokens: [user.email],
        email_subject: 'Reset your Trade Imperial password',
        email_body: html,
        target_channel: 'email',
        from_email: 'no-reply@tradeimperial.com',
        from_name: 'Trade Imperial',
      }),
    })

    if (!onesignalResponse.ok) {
      const errText = await onesignalResponse.text()
      throw new Error(`OneSignal error: ${onesignalResponse.status} ${errText}`)
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
