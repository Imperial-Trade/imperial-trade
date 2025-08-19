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

// Validate environment variables at startup
function validateEnvironment() {
  const errors = []
  if (!ONESIGNAL_API_KEY) errors.push('ONESIGNAL_API_KEY is required')
  if (!ONESIGNAL_APP_ID) errors.push('ONESIGNAL_APP_ID is required')
  if (!hookSecret) errors.push('SEND_FORGOT_PASSWORD_EMAIL_HOOK_SECRET or SEND_EMAIL_HOOK_SECRET is required')
  
  if (errors.length > 0) {
    console.error('Environment validation failed:', errors)
    throw new Error(`Environment validation failed: ${errors.join(', ')}`)
  }
  
  console.log('Environment validation successful')
}

serve(async (req) => {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  console.log(`[${requestId}] ${req.method} ${req.url} - Request started`)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname === '/health') {
    try {
      validateEnvironment()
      return new Response(JSON.stringify({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: {
          hasOneSignalKey: !!ONESIGNAL_API_KEY,
          hasOneSignalAppId: !!ONESIGNAL_APP_ID,
          hasWebhookSecret: !!hookSecret
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    } catch (error) {
      console.error(`[${requestId}] Health check failed:`, error)
      return new Response(JSON.stringify({ 
        status: 'unhealthy', 
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }
  }

  try {
    // Validate environment
    validateEnvironment()

    // Supabase Auth email webhook (Standard Webhooks)
    const payloadText = await req.text()
    const headers = Object.fromEntries(req.headers)
    
    console.log(`[${requestId}] Processing webhook payload, size: ${payloadText.length} bytes`)

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

    console.log(`[${requestId}] Webhook verified successfully for user: ${user.email}`)
    console.log(`[${requestId}] Email action type: ${email_action_type}`)

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

    console.log(`[${requestId}] Email template rendered successfully`)

    // CRITICAL FIX: Use "Basic" instead of "Key" for OneSignal authorization
    const authHeader = `Basic ${ONESIGNAL_API_KEY}`
    
    const payload = {
      // --- Identification ---
      app_id: ONESIGNAL_APP_ID,
      
      // --- Audience and Channel ---
      target_channel: 'email',
      include_email_tokens: [user.email], // Correct OneSignal API format
      
      // --- Message Content ---
      email_subject: 'Reset your Imperial Trading password',
      email_body: html,
      
      // --- Sender Details (Must match verified domain) ---
      email_from_name: 'Imperial Trading Support',
      email_from_address: 'support@tradeimperial.com',
      email_reply_to_address: 'support@tradeimperial.com',
      
      // --- Transactional Settings (CRITICAL) ---
      include_unsubscribed: true, // Send even if user unsubscribed from marketing
      is_transactional: true // Categorize as transactional email
    }

    console.log(`[${requestId}] Sending OneSignal email to: ${user.email}`)
    console.log(`[${requestId}] OneSignal payload:`, { 
      app_id: ONESIGNAL_APP_ID, 
      target_channel: 'email',
      email_to: payload.email_to,
      email_subject: payload.email_subject,
      email_from_name: payload.email_from_name
    })

    const osResp = await fetch('https://api.onesignal.com/notifications?c=email', {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    console.log(`[${requestId}] OneSignal API response status: ${osResp.status}`)

    if (!osResp.ok) {
      const errText = await osResp.text()
      console.error(`[${requestId}] OneSignal API error:`, {
        status: osResp.status,
        statusText: osResp.statusText,
        response: errText,
        headers: Object.fromEntries(osResp.headers.entries())
      })
      throw new Error(`OneSignal email send failed: ${osResp.status} ${osResp.statusText} - ${errText}`)
    }

    const responseData = await osResp.json()
    console.log(`[${requestId}] OneSignal API success:`, responseData)

    const duration = Date.now() - startTime
    console.log(`[${requestId}] Password reset email sent successfully in ${duration}ms`)

    return new Response(JSON.stringify({ 
      success: true,
      requestId,
      duration,
      oneSignalResponse: responseData
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[${requestId}] Password reset email failed after ${duration}ms:`, {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      requestId
    })

    // Determine appropriate error status code
    let statusCode = 500
    if (error?.message?.includes('webhook secret')) {
      statusCode = 401
    } else if (error?.message?.includes('OneSignal email send failed: 4')) {
      statusCode = 422 // Client error from OneSignal
    } else if (error?.message?.includes('Environment validation failed')) {
      statusCode = 503 // Service unavailable
    }

    return new Response(JSON.stringify({ 
      error: error?.message || 'Unknown error',
      requestId,
      duration,
      timestamp: new Date().toISOString()
    }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
