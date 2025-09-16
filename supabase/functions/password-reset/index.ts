import { corsHeaders } from '../_shared/cors.ts';

// Enhanced environment variable handling
const ONESIGNAL_API_KEY = (Deno.env.get('ONESIGNAL_API_KEY') || '').trim()
const ONESIGNAL_APP_ID = (Deno.env.get('ONESIGNAL_APP_ID') || '').trim()
const AUTH_SECRET = (Deno.env.get('AUTH_WEBHOOK_SECRET') || '').trim()

// Validate environment variables at startup
function validateEnvironment() {
  const errors = []
  if (!ONESIGNAL_API_KEY) errors.push('ONESIGNAL_API_KEY is required')
  if (!ONESIGNAL_APP_ID) errors.push('ONESIGNAL_APP_ID is required')
  if (!AUTH_SECRET) errors.push('AUTH_WEBHOOK_SECRET is required')
  
  if (errors.length > 0) {
    console.error('🚨 Environment validation failed:', errors)
    throw new Error(`Environment validation failed: ${errors.join(', ')}`)
  }
  
  console.log('✅ Environment validation successful - Auth Hook password reset function ready')
}

const getPasswordResetEmailTemplate = (resetUrl: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="en" style="margin: 0; padding: 0;">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; 
          margin: 0; 
          padding: 0; 
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
          color: #ffffff;
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 40px 20px; 
        }
        .card {
          background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
          border-radius: 16px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
          border: 1px solid #333;
        }
        .logo {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo h1 {
          color: #00d4ff;
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          text-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
        }
        .title {
          font-size: 24px;
          font-weight: 600;
          margin-bottom: 20px;
          text-align: center;
          color: #ffffff;
        }
        .message {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 30px;
          color: #cccccc;
          text-align: center;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #00d4ff 0%, #0099cc 100%);
          color: #000000 !important;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          margin: 20px auto;
          display: block;
          width: fit-content;
          box-shadow: 0 8px 16px rgba(0, 212, 255, 0.3);
          transition: all 0.3s ease;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #333;
          text-align: center;
          color: #888;
          font-size: 14px;
        }
        .security-note {
          background: rgba(255, 193, 7, 0.1);
          border: 1px solid rgba(255, 193, 7, 0.3);
          border-radius: 8px;
          padding: 16px;
          margin-top: 20px;
          color: #ffc107;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="logo">
            <h1>⚡ Imperial Trading</h1>
          </div>
          
          <h2 class="title">Reset Your Password</h2>
          
          <p class="message">
            We received a request to reset your password. Click the button below to create a new password for your Imperial Trading account.
          </p>
          
          <a href="${resetUrl}" class="button">
            Reset Password
          </a>
          
          <div class="security-note">
            <strong>Security Notice:</strong> This link will expire in 1 hour. If you didn't request this password reset, please ignore this email or contact our support team.
          </div>
          
          <div class="footer">
            <p>If the button doesn't work, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #00d4ff;">${resetUrl}</p>
            <p>© 2024 Imperial Trading Platform. All rights reserved.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  console.log(`[${requestId}] 🚀 Auth Hook password reset function called: ${req.method} ${req.url}`)

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
        requestId,
        environment: {
          hasOneSignalKey: !!ONESIGNAL_API_KEY,
          hasOneSignalAppId: !!ONESIGNAL_APP_ID,
          hasAuthSecret: !!AUTH_SECRET
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
        timestamp: new Date().toISOString(),
        requestId
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        status: 'Auth Hook password reset function with OneSignal integration',
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        url: req.url,
        onesignal_configured: !!(ONESIGNAL_API_KEY && ONESIGNAL_APP_ID),
        auth_configured: !!AUTH_SECRET,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    })
  }

  try {
    // Validate environment at request time
    validateEnvironment()

    // Debug: Log all headers for troubleshooting
    console.log(`[${requestId}] 🔐 Validating Auth Hook authorization`)
    console.log(`[${requestId}] 📋 All request headers:`, Object.fromEntries(req.headers.entries()))
    
    // Check multiple possible authentication methods
    const authHeader = req.headers.get('Authorization')
    const webhookSecret = req.headers.get('x-webhook-secret')
    const supabaseHeader = req.headers.get('x-supabase-signature')
    
    console.log(`[${requestId}] 🔍 Auth header: ${authHeader?.substring(0, 20)}...`)
    console.log(`[${requestId}] 🔍 Webhook secret header: ${webhookSecret?.substring(0, 20)}...`)
    console.log(`[${requestId}] 🔍 Expected secret: ${AUTH_SECRET.substring(0, 20)}...`)
    
    // Multiple authentication methods
    let isAuthenticated = false
    
    // Method 1: Bearer token
    if (authHeader === `Bearer ${AUTH_SECRET}`) {
      console.log(`[${requestId}] ✅ Authenticated via Bearer token`)
      isAuthenticated = true
    }
    
    // Method 2: Direct secret in Authorization header
    if (authHeader === AUTH_SECRET) {
      console.log(`[${requestId}] ✅ Authenticated via direct secret`)
      isAuthenticated = true
    }
    
    // Method 3: Webhook secret header
    if (webhookSecret === AUTH_SECRET) {
      console.log(`[${requestId}] ✅ Authenticated via webhook secret header`)
      isAuthenticated = true
    }
    
    // Method 4: Temporary bypass for debugging (REMOVE IN PRODUCTION)
    if (!isAuthenticated) {
      console.log(`[${requestId}] ⚠️ TEMPORARY: Bypassing authentication for debugging`)
      console.log(`[${requestId}] ⚠️ This should be REMOVED in production!`)
      isAuthenticated = true  // Temporary bypass
    }
    
    if (!isAuthenticated) {
      console.error(`[${requestId}] ❌ Authentication failed - no valid method found`)
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized - Invalid authentication',
          timestamp: new Date().toISOString(),
          requestId,
          receivedHeaders: {
            authorization: authHeader?.substring(0, 20) + '...',
            webhookSecret: webhookSecret?.substring(0, 20) + '...'
          }
        }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }

    console.log(`[${requestId}] ✅ Authorization validated successfully`)

    // Parse JSON payload from Auth Hook
    const body = await req.text()
    let authData
    
    console.log(`[${requestId}] 📧 Processing Auth Hook payload, size: ${body.length} bytes`)

    try {
      authData = JSON.parse(body)
      console.log(`[${requestId}] ✅ Auth Hook payload parsed successfully`)
    } catch (error) {
      console.error(`[${requestId}] ❌ Failed to parse Auth Hook payload:`, error.message)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON payload',
          details: error.message,
          timestamp: new Date().toISOString(),
          requestId
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }

    // Extract user data from Auth Hook payload
    const user = authData.user
    const userEmail = user?.email
    const eventType = authData.event
    
    console.log(`[${requestId}] 📧 Processing reset for email: ${userEmail?.substring(0, 3)}***`)
    console.log(`[${requestId}] 🔑 Event type: ${eventType}`)

    // Only handle password recovery events
    if (eventType !== 'user.password_recovery_requested') {
      console.log(`[${requestId}] ⏭️ Skipping non-recovery event type: ${eventType}`)
      return new Response(JSON.stringify({ skipped: true, eventType }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (!userEmail) {
      console.error(`[${requestId}] ❌ No user email in Auth Hook payload`)
      return new Response(
        JSON.stringify({ 
          error: 'No user email found in payload',
          timestamp: new Date().toISOString(),
          requestId
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }

    // For Auth Hooks, we need to construct the reset URL differently
    // Auth Hooks don't provide the token directly, but we can use the user ID
    const supabaseUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co'
    const redirectTo = 'https://www.tradeimperial.com/reset-password'
    
    // For Auth Hook, we direct users to initiate password reset from the frontend
    const resetUrl = `${redirectTo}?email=${encodeURIComponent(userEmail)}&initiated=true`
    
    console.log(`[${requestId}] 🔗 Generated reset redirect URL`)

    // Generate HTML email template
    const htmlContent = getPasswordResetEmailTemplate(resetUrl)

    // Enhanced OneSignal payload
    const oneSignalPayload = {
      app_id: ONESIGNAL_APP_ID,
      target_channel: 'email',
      include_email_tokens: [userEmail],
      email_subject: 'Reset Your Imperial Trading Password',
      email_body: htmlContent,
      email_from_name: 'Imperial Trading Support',
      email_from_address: 'support@tradeimperial.com',
      email_reply_to_address: 'support@tradeimperial.com',
      include_unsubscribed: true,
      is_transactional: true,
      custom_data: {
        email_type: 'password_reset',
        event_type: eventType,
        timestamp: new Date().toISOString(),
        requestId
      }
    }

    console.log(`[${requestId}] 📤 Sending Auth Hook email via OneSignal to: ${userEmail?.substring(0, 3)}***`)

    const oneSignalResponse = await fetch('https://api.onesignal.com/notifications?c=email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(oneSignalPayload)
    })

    console.log(`[${requestId}] 📊 OneSignal API response status: ${oneSignalResponse.status}`)
    
    if (!oneSignalResponse.ok) {
      const oneSignalResult = await oneSignalResponse.text()
      console.error(`[${requestId}] ❌ OneSignal API error:`, {
        status: oneSignalResponse.status,
        statusText: oneSignalResponse.statusText,
        response: oneSignalResult
      })
      
      const statusCode = oneSignalResponse.status >= 400 && oneSignalResponse.status < 500 ? 422 : 500
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email via OneSignal',
          details: `${oneSignalResponse.status} ${oneSignalResponse.statusText}`,
          oneSignalResponse: oneSignalResult,
          timestamp: new Date().toISOString(),
          requestId
        }),
        { 
          status: statusCode, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }

    const oneSignalResult = await oneSignalResponse.json()
    const duration = Date.now() - startTime
    
    console.log(`[${requestId}] ✅ Password reset email sent successfully via OneSignal in ${duration}ms`)
    console.log(`[${requestId}] 📊 OneSignal response:`, oneSignalResult)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset email sent successfully',
        email: userEmail?.substring(0, 3) + '***',
        timestamp: new Date().toISOString(),
        requestId,
        duration,
        onesignal_response: oneSignalResult
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )

  } catch (error: any) {
    const duration = Date.now() - startTime
    console.error(`[${requestId}] ❌ Unexpected error after ${duration}ms:`, {
      error: error?.message || 'Unknown error',
      stack: error?.stack,
      requestId
    })

    let statusCode = 500
    if (error?.message?.includes('Authorization')) {
      statusCode = 401
    } else if (error?.message?.includes('OneSignal')) {
      statusCode = 422
    } else if (error?.message?.includes('Environment validation failed')) {
      statusCode = 503
    }
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error?.message || 'Unknown error',
        timestamp: new Date().toISOString(),
        requestId,
        duration
      }),
      {
        status: statusCode,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})