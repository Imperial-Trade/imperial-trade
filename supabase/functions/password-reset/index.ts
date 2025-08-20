import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Get required environment variables
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY')
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID')
const WEBHOOK_SECRET = Deno.env.get('SUPABASE_AUTH_WEBHOOK_SECRET')

if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID || !WEBHOOK_SECRET) {
  console.error('❌ Missing required environment variables')
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
  console.log(`🚀 Password reset function called: ${req.method} ${req.url}`)

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method === 'GET') {
    return new Response(
      JSON.stringify({
        status: 'Enhanced password reset function with OneSignal integration',
        timestamp: new Date().toISOString(),
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
    // Verify environment variables
    if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
      console.error('❌ OneSignal credentials not configured')
      return new Response(
        JSON.stringify({ 
          error: 'OneSignal not configured',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }

    if (!WEBHOOK_SECRET) {
      console.error('❌ Webhook secret not configured')
      return new Response(
        JSON.stringify({ 
          error: 'Webhook secret not configured',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }

    // Get request body and headers
    const body = await req.text()
    const signature = req.headers.get('webhook-signature') || req.headers.get('x-webhook-signature')
    
    console.log('📧 Received webhook payload length:', body.length)
    console.log('🔐 Webhook signature present:', !!signature)

    // Verify webhook signature
    if (signature) {
      try {
        const wh = new Webhook(WEBHOOK_SECRET)
        const headers = Object.fromEntries(req.headers)
        const payload = wh.verify(body, headers)
        console.log('✅ Webhook signature verified')
      } catch (error) {
        console.error('❌ Webhook verification failed:', error.message)
        return new Response(
          JSON.stringify({ 
            error: 'Invalid webhook signature',
            timestamp: new Date().toISOString()
          }),
          { 
            status: 401, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        )
      }
    }

    // Parse webhook payload
    let webhookData
    try {
      webhookData = JSON.parse(body)
    } catch (error) {
      console.error('❌ Failed to parse webhook payload:', error.message)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid JSON payload',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }

    // Extract user email and reset token from webhook
    const userEmail = webhookData.user?.email
    const resetToken = webhookData.email_data?.token_hash || webhookData.email_data?.token
    const actionType = webhookData.email_data?.email_action_type

    console.log('📧 Processing reset for email:', userEmail?.substring(0, 3) + '***')
    console.log('🔑 Action type:', actionType)
    console.log('🎯 Token present:', !!resetToken)

    if (!userEmail) {
      console.error('❌ No user email in webhook payload')
      return new Response(
        JSON.stringify({ 
          error: 'No user email found in webhook',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }

    if (!resetToken) {
      console.error('❌ No reset token in webhook payload')
      return new Response(
        JSON.stringify({ 
          error: 'No reset token found in webhook',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }

    // Generate password reset URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://kmuoqkcxguafxulqlbmi.supabase.co'
    const resetUrl = `${supabaseUrl}/auth/v1/verify?token=${resetToken}&type=recovery&redirect_to=${encodeURIComponent('https://kmuoqkcxguafxulqlbmi.supabase.co/')}`
    
    console.log('🔗 Generated reset URL (partial):', resetUrl.substring(0, 50) + '...')

    // Generate HTML email template
    const htmlContent = getPasswordResetEmailTemplate(resetUrl)

    // Send email via OneSignal
    const oneSignalPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_email_tokens: [userEmail],
      email_subject: 'Reset Your Imperial Trading Password',
      email_body: htmlContent,
      email_from_name: 'Imperial Trading',
      email_from_address: 'noreply@imperialtrading.com',
      custom_data: {
        email_type: 'password_reset',
        action_type: actionType || 'recovery',
        timestamp: new Date().toISOString()
      }
    }

    console.log('📤 Sending email via OneSignal to:', userEmail?.substring(0, 3) + '***')

    const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(oneSignalPayload)
    })

    const oneSignalResult = await oneSignalResponse.text()
    
    if (!oneSignalResponse.ok) {
      console.error('❌ OneSignal API error:', oneSignalResponse.status, oneSignalResult)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email via OneSignal',
          details: oneSignalResult,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      )
    }

    console.log('✅ Password reset email sent successfully via OneSignal')
    console.log('📊 OneSignal response:', oneSignalResult)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset email sent successfully',
        email: userEmail?.substring(0, 3) + '***',
        timestamp: new Date().toISOString(),
        onesignal_response: JSON.parse(oneSignalResult)
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message)
    console.error('❌ Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    )
  }
})