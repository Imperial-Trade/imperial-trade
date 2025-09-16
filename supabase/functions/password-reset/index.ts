import { corsHeaders } from '../_shared/cors.ts';

// Enhanced environment variable handling
const ONESIGNAL_API_KEY = (Deno.env.get('ONESIGNAL_API_KEY') || '').trim()
const ONESIGNAL_APP_ID = (Deno.env.get('ONESIGNAL_APP_ID') || '').trim()

// Validate environment variables at startup
function validateEnvironment() {
  const errors = []
  if (!ONESIGNAL_API_KEY) errors.push('ONESIGNAL_API_KEY is required')
  if (!ONESIGNAL_APP_ID) errors.push('ONESIGNAL_APP_ID is required')
  
  if (errors.length > 0) {
    console.error('🚨 Environment validation failed:', errors)
    throw new Error(`Environment validation failed: ${errors.join(', ')}`)
  }
  
  console.log('✅ Environment validation successful - Send Email Hook password reset function ready')
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
  
  console.log(`[${requestId}] 🚀 Send Email Hook password reset function called: ${req.method} ${req.url}`)

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
          hasOneSignalAppId: !!ONESIGNAL_APP_ID
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
        status: 'Send Email Hook password reset function with OneSignal integration',
        timestamp: new Date().toISOString(),
        requestId,
        method: req.method,
        url: req.url,
        onesignal_configured: !!(ONESIGNAL_API_KEY && ONESIGNAL_APP_ID)
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

    // Parse JSON payload from Send Email Hook
    const body = await req.text()
    let emailData
    
    console.log(`[${requestId}] 📧 Processing Send Email Hook payload, size: ${body.length} bytes`)

    try {
      emailData = JSON.parse(body)
      console.log(`[${requestId}] ✅ Send Email Hook payload parsed successfully`)
      console.log(`[${requestId}] 📊 Email data keys:`, Object.keys(emailData))
    } catch (error) {
      console.error(`[${requestId}] ❌ Failed to parse Send Email Hook payload:`, error.message)
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

    // Extract email data from Send Email Hook payload
    const emailType = emailData.template_name || emailData.type
    const userEmail = emailData.to || emailData.email
    const resetUrl = emailData.site_url || emailData.confirmation_url || emailData.reset_url
    const emailSubject = emailData.email_subject || emailData.subject
    
    console.log(`[${requestId}] 📧 Processing email for: ${userEmail?.substring(0, 3)}***`)
    console.log(`[${requestId}] 🔑 Email type: ${emailType}`)
    console.log(`[${requestId}] 🔗 Reset URL: ${resetUrl?.substring(0, 50)}...`)

    // Only handle password recovery emails
    if (emailType !== 'recovery' && !emailSubject?.toLowerCase().includes('reset') && !resetUrl?.includes('recover')) {
      console.log(`[${requestId}] ⏭️ Skipping non-recovery email type: ${emailType}`)
      return new Response(JSON.stringify({ skipped: true, emailType, subject: emailSubject }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    if (!userEmail) {
      console.error(`[${requestId}] ❌ No user email in Send Email Hook payload`)
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

    if (!resetUrl) {
      console.error(`[${requestId}] ❌ No reset URL found in Send Email Hook payload`)
      return new Response(
        JSON.stringify({ 
          error: 'No reset URL found in payload',
          timestamp: new Date().toISOString(),
          requestId
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }
    
    console.log(`[${requestId}] 🔗 Using Supabase-provided reset URL with token`)

    // Generate HTML email template using the actual reset URL from Supabase
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
        template_name: emailType,
        timestamp: new Date().toISOString(),
        requestId
      }
    }

    console.log(`[${requestId}] 📤 Sending Send Email Hook email via OneSignal to: ${userEmail?.substring(0, 3)}***`)

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

    // Send Email Hook expects a response that indicates email was handled
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset email sent successfully via OneSignal',
        email: userEmail?.substring(0, 3) + '***',
        timestamp: new Date().toISOString(),
        requestId,
        duration,
        onesignal_response: oneSignalResult,
        email_sent: true,
        handled: true
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