import React from 'npm:react@18.3.1'
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'

import { createClient } from 'npm:@supabase/supabase-js@2.50.3'
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

function normalizeHookSecret(raw: string): { secret: string; encoding: 'hex' | 'base64' } {
  let s = (raw || '').trim()
  try {
    // Supabase may prefix with version, e.g. "v1,whsec_..."
    if (s.includes(',')) {
      s = s.split(',').pop()!.trim()
    }
    // Strip standardwebhooks-style prefix if present
    if (s.startsWith('whsec_')) {
      s = s.slice(6)
    }

    // Hex secret
    const hexRe = /^[0-9a-f]+$/i
    if (hexRe.test(s) && s.length % 2 === 0) {
      return { secret: s, encoding: 'hex' }
    }

    // Base64url -> Base64
    let b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4 !== 0) b64 += '=';
    const base64Re = /^[A-Za-z0-9+/=]+$/
    if (!base64Re.test(b64)) {
      throw new Error('Unsupported secret format')
    }
    return { secret: b64, encoding: 'base64' }
  } catch (_e) {
    throw new Error('Invalid hook secret format')
  }
}

async function getLogoUrl(): Promise<string> {
  const direct = Deno.env.get('EMAIL_LOGO_URL');
  if (direct && direct.trim() !== '') return direct;

  const bucket = Deno.env.get('EMAIL_LOGO_BUCKET') || 'imperial-trade-bucket';
  const path = Deno.env.get('EMAIL_LOGO_PATH');
  const expires = Number(Deno.env.get('EMAIL_LOGO_EXPIRES_IN')) || 60 * 60 * 24 * 7; // 7 days

  try {
    if (!path) throw new Error('EMAIL_LOGO_PATH not set');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceKey) throw new Error('Missing service role key');

    const supabase = createClient(SUPABASE_URL, serviceKey);
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expires);
    if (error || !data?.signedUrl) throw error || new Error('No signed URL');
    return data.signedUrl;
  } catch (e) {
    console.warn('Falling back to default logo URL', { message: (e as any)?.message });
    return 'https://www.tradeimperial.com/logo.png';
  }
}



serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const correlationId = (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));
  try {
    // Supabase Auth email webhook (Standard Webhooks)
    const payloadText = await req.text()
    const headers = Object.fromEntries(req.headers)

    if (!hookSecret || hookSecret.trim() === '') {
      console.error('Missing SEND_FORGOT_PASSWORD_EMAIL_HOOK_SECRET', { correlationId })
      return new Response(JSON.stringify({ error: 'Server misconfiguration', correlationId }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

let wh: Webhook
try {
  const normalized = normalizeHookSecret(hookSecret)
  wh = new Webhook(normalized.secret, { encoding: normalized.encoding })
} catch (e: any) {
  console.error('Webhook initialization failed', { correlationId, message: e?.message })
  return new Response(JSON.stringify({ error: 'Invalid hook secret format', correlationId }), {
    status: 500,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  })
}

    let verification: any
    try {
      verification = wh.verify(payloadText, headers)
    } catch (e: any) {
      console.warn('Signature verification failed', { correlationId, message: e?.message })
      return new Response(JSON.stringify({ error: 'Invalid signature', correlationId }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = verification as {
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

// Validate OneSignal configuration
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      console.error('Missing OneSignal configuration', { correlationId, hasAppId: !!ONESIGNAL_APP_ID, hasApiKey: !!ONESIGNAL_API_KEY })
      return new Response(JSON.stringify({ success: false, error: 'Email service not configured', correlationId }), {
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

    const logoUrl = await getLogoUrl();
    console.log('Email logo URL', { correlationId, logoUrl });
    const html = await renderAsync(
      React.createElement(PasswordResetEmail, {
        supabase_url: SUPABASE_URL,
        token,
        token_hash,
        redirect_to: enforcedRedirect,
        email_action_type,
        brand_name: 'Trade Imperial',
        support_email: 'tradeimperial2025@gmail.com',
        logo_url: logoUrl,
      })
    )

    const onesignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': correlationId,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_email_tokens: [user.email],
        email_subject: 'Reset your Trade Imperial password',
        email_body: html,
        email_preheader: 'Reset your Trade Imperial password securely.',
        target_channel: 'email',
        from_email: 'no-reply@tradeimperial.com',
        from_name: 'Trade Imperial',
        external_id: correlationId,
      }),
    })

if (!onesignalResponse.ok) {
      const errText = await onesignalResponse.text()
      console.error('OneSignal error', { correlationId, status: onesignalResponse.status, body: errText })
      return new Response(JSON.stringify({ success: false, correlationId, error: 'Email provider error' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    return new Response(JSON.stringify({ success: true, correlationId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error: any) {
    console.error('send-password-reset-email error:', { correlationId, message: error?.message, stack: error?.stack })
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error', correlationId }), {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
