import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced environment variable handling
const ONESIGNAL_API_KEY = (Deno.env.get('ONESIGNAL_API_KEY') || '').trim()
const ONESIGNAL_APP_ID = (Deno.env.get('ONESIGNAL_APP_ID') || '').trim()
const WEBHOOK_SECRET = (Deno.env.get('AUTH_WEBHOOK_SECRET') || '').trim()

// Validate environment variables at startup
function validateEnvironment() {
  const errors = []
  if (!ONESIGNAL_API_KEY) errors.push('ONESIGNAL_API_KEY is required')
  if (!ONESIGNAL_APP_ID) errors.push('ONESIGNAL_APP_ID is required')
  if (!WEBHOOK_SECRET) errors.push('AUTH_WEBHOOK_SECRET is required')
  
  if (errors.length > 0) {
    console.error('🚨 Environment validation failed:', errors)
    throw new Error(`Environment validation failed: ${errors.join(', ')}`)
  }
  
  console.log('✅ Environment validation successful - Enhanced password reset function ready')
}

const getPasswordResetEmailTemplate = (resetUrl: string): string => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset - Imperial Trading</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">Imperial Trading</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Password Reset Request</p>
      </div>
      
      <div style="background: white; padding: 40px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
        <p>We received a request to reset your password for your Imperial Trading account.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    text-decoration: none; 
                    padding: 15px 30px; 
                    border-radius: 25px; 
                    display: inline-block; 
                    font-weight: bold;
                    transition: transform 0.2s;">
            Reset Password
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="background: #f5f5f5; padding: 10px; border-radius: 5px; font-size: 14px; word-break: break-all;">
          ${resetUrl}
        </p>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #999; font-size: 14px; margin: 0;">
            🔒 <strong>Security Notice:</strong> This link will expire in 24 hours for your security.
          </p>
          <p style="color: #999; font-size: 14px;">
            If you didn't request this password reset, you can safely ignore this email.
          </p>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>© ${new Date().getFullYear()} Imperial Trading. All rights reserved.</p>
        <p>Professional Trading Platform</p>
      </div>
    </body>
    </html>
  `
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()
  
  console.log(`[${requestId}] 🚀 Enhanced password reset function called: ${req.method} ${req.url}`)

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
          hasWebhookSecret: !!WEBHOOK_SECRET
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
        status: 'Enhanced password reset function with OneSignal integration',
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        url: req.url,
        onesignal_configured: !!(ONESIGNAL_API_KEY && ONESIGNAL_APP_ID),
        webhook_configured: !!WEBHOOK_SECRET,
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

    // Enhanced webhook processing with better logging
    const body = await req.text()
    const headers = Object.fromEntries(req.headers)
    
    console.log(`[${requestId}] 📧 Processing webhook payload, size: ${body.length} bytes`)

    // Enhanced webhook verification with better error handling
    let webhookData
    try {
      const wh = new Webhook(WEBHOOK_SECRET)
      webhookData = wh.verify(body, headers)
      console.log(`[${requestId}] ✅ Webhook signature verified successfully`)
    } catch (error) {
      console.error(`[${requestId}] ❌ Webhook verification failed:`, {
        error: error.message,
        webhookSecretPresent: !!WEBHOOK_SECRET,
        payloadSize: body.length
      })
      return new Response(
        JSON.stringify({ 
          error: 'Invalid webhook signature',
          details: error.message,
          timestamp: new Date().toISOString(),
          requestId
        }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }


    // Extract user email and reset token from webhook
    const userEmail = webhookData.user?.email
    const resetToken = webhookData.email_data?.token_hash || webhookData.email_data?.token
    const actionType = webhookData.email_data?.email_action_type
    const redirectTo = webhookData.email_data?.redirect_to

    console.log(`[${requestId}] 📧 Processing reset for email: ${userEmail?.substring(0, 3)}***`)
    console.log(`[${requestId}] 🔑 Action type: ${actionType}`)
    console.log(`[${requestId}] 🎯 Token present: ${!!resetToken}`)

    // Only handle password recovery emails
    if (actionType !== 'recovery') {
      console.log(`[${requestId}] ⏭️ Skipping non-recovery email type: ${actionType}`)
      return new Response(JSON.stringify({ skipped: true, actionType }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (!userEmail) {
      console.error(`[${requestId}] ❌ No user email in webhook payload`)
      return new Response(
        JSON.stringify({ 
          error: 'No user email found in webhook',
          timestamp: new Date().toISOString(),
          requestId
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }

    if (!resetToken) {
      console.error(`[${requestId}] ❌ No reset token in webhook payload`)
      return new Response(
        JSON.stringify({ 
          error: 'No reset token found in webhook',
          timestamp: new Date().toISOString(),
          requestId
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }

    // Generate password reset URL
    const supabaseUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co'
    const finalRedirectTo = redirectTo || 'https://www.tradeimperial.com/reset-password'
    const resetUrl = `${supabaseUrl}/auth/v1/verify?token=${resetToken}&type=recovery&redirect_to=${encodeURIComponent(finalRedirectTo)}`
    
    console.log(`[${requestId}] 🔗 Generated reset URL: ${resetUrl.substring(0, 80)}...`)

    // Generate HTML email template
    const htmlContent = getPasswordResetEmailTemplate(resetUrl)

    // Enhanced OneSignal payload with better configuration
    const oneSignalPayload = {
      app_id: ONESIGNAL_APP_ID,
      target_channel: 'email',
      include_email_tokens: [userEmail],
      email_subject: 'Reset Your Imperial Trading Password',
      email_body: htmlContent,
      email_from_name: 'Imperial Trading Support',
      email_from_address: 'support@tradeimperial.com',
      email_reply_to_address: 'support@tradeimperial.com',
      include_unsubscribed: true, // Send even if user unsubscribed from marketing
      is_transactional: true, // Categorize as transactional email
      custom_data: {
        email_type: 'password_reset',
        action_type: actionType,
        timestamp: new Date().toISOString(),
        requestId
      }
    }

    console.log(`[${requestId}] 📤 Sending enhanced email via OneSignal to: ${userEmail?.substring(0, 3)}***`)

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
        response: oneSignalResult,
        headers: Object.fromEntries(oneSignalResponse.headers.entries()),
        requestPayload: oneSignalPayload
      })
      
      // Return appropriate status code for OneSignal errors
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

    // Determine appropriate error status code
    let statusCode = 500
    if (error?.message?.includes('webhook')) {
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