import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Environment validation
const validateEnvironment = () => {
  const apiKey = Deno.env.get('ONESIGNAL_API_KEY')
  const appId = Deno.env.get('ONESIGNAL_APP_ID')
  
  if (!apiKey || !appId) {
    throw new Error('Missing required OneSignal environment variables')
  }
  
  return { apiKey, appId }
}

// Clean HTML email template for password reset
const getPasswordResetEmailTemplate = (resetUrl: string) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password - Imperial Trading</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0a0a0a; color: #ffffff;">
    <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 40px;">
            <h1 style="color: #00D2FF; margin: 0; font-size: 28px; font-weight: bold;">Imperial Trading</h1>
        </div>
        
        <div style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 40px; border-radius: 12px; border: 1px solid #333;">
            <h2 style="color: #ffffff; margin: 0 0 20px 0; font-size: 24px;">Reset Your Password</h2>
            
            <p style="color: #cccccc; line-height: 1.6; margin: 0 0 30px 0; font-size: 16px;">
                You requested to reset your password for your Imperial Trading account. Click the button below to create a new password.
            </p>
            
            <div style="text-align: center; margin: 40px 0;">
                <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #00D2FF 0%, #0099CC 100%); color: #000000; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; font-size: 16px;">
                    Reset Password
                </a>
            </div>
            
            <p style="color: #999999; font-size: 14px; line-height: 1.5; margin: 30px 0 0 0;">
                If you didn't request this password reset, you can safely ignore this email. Your password will remain unchanged.
            </p>
            
            <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
            
            <p style="color: #666666; font-size: 12px; margin: 0;">
                This link will expire in 24 hours for security reasons.<br>
                If you're having trouble clicking the button, copy and paste this URL into your browser:<br>
                <span style="color: #00D2FF; word-break: break-all;">${resetUrl}</span>
            </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <p style="color: #666666; font-size: 12px; margin: 0;">
                © 2024 Imperial Trading. All rights reserved.
            </p>
        </div>
    </div>
</body>
</html>
`

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    try {
      const { apiKey, appId } = validateEnvironment()
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: {
          hasApiKey: !!apiKey,
          hasAppId: !!appId,
          keyLength: apiKey?.length || 0
        }
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    } catch (error) {
      return new Response(JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }
  }

  // Handle Send Email Hook payload
  if (req.method === 'POST') {
    try {
      const { apiKey, appId } = validateEnvironment()
      
      console.log('📧 Send Email Hook triggered')
      
      const payload = await req.json()
      console.log('📦 Received payload:', JSON.stringify(payload, null, 2))
      
      // Extract email data from Auth Hook format
      const userEmail = payload.user?.email
      const emailActionType = payload.email_data?.email_action_type || ''
      let resetUrl = payload.email_data?.redirect_to || '#'
      
      // Extract authentication tokens from Auth Hook payload (correct nested path)
      const tokenHash = payload.email_data?.token_hash
      const token = payload.email_data?.token
      const expiresAt = payload.email_data?.expires_at
      
      console.log('🔐 Auth Hook token data:', {
        hasTokenHash: !!tokenHash,
        hasToken: !!token,
        expiresAt: expiresAt,
        tokenHashLength: tokenHash?.length || 0,
        tokenLength: token?.length || 0
      })
      
      // Construct proper reset URL with authentication parameters
      if (resetUrl && resetUrl !== '#' && tokenHash && token) {
        try {
          const url = new URL(resetUrl)
          
          // Ensure the pathname is /reset-password
          if (url.pathname !== '/reset-password') {
            url.pathname = '/reset-password'
          }
          
          // Clear any existing auth parameters to avoid conflicts
          url.hash = ''
          url.searchParams.delete('access_token')
          url.searchParams.delete('refresh_token')
          url.searchParams.delete('token')
          url.searchParams.delete('type')
          url.searchParams.delete('expires_at')
          
          // Add authentication parameters that Supabase expects
          // Use fragment (#) for auth parameters as per Supabase standards
          const authParams = new URLSearchParams({
            access_token: tokenHash,
            refresh_token: token, 
            type: 'recovery',
            expires_at: expiresAt ? expiresAt.toString() : (Math.floor(Date.now() / 1000) + 3600).toString()
          })
          
          // Append auth parameters as fragment
          resetUrl = url.toString() + '#' + authParams.toString()
          
          console.log('🔧 Constructed reset URL with auth tokens:', {
            baseUrl: url.toString(),
            hasAuthParams: true,
            finalUrl: resetUrl
          })
          
        } catch (error) {
          console.error('❌ Failed to construct reset URL:', error)
          console.warn('⚠️ Using original URL without auth tokens:', resetUrl)
        }
      } else {
        console.warn('⚠️ Missing required data for token construction:', {
          hasResetUrl: !!resetUrl && resetUrl !== '#',
          hasTokenHash: !!tokenHash,
          hasToken: !!token
        })
      }
      
      console.log('📧 Email details:', {
        to: userEmail,
        emailActionType: emailActionType,
        resetUrl: resetUrl.substring(0, 100) + '...', // Truncate for logging
        isPasswordReset: emailActionType === 'recovery',
        hasAuthTokens: !!(tokenHash && token)
      })
      
      // Only process password reset emails (recovery action type)
      if (emailActionType !== 'recovery') {
        console.log('⏭️ Skipping non-password-reset email')
        return new Response(JSON.stringify({
          success: true,
          message: 'Email not a password reset, skipped',
          email_sent: false
        }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }
      
      if (!userEmail) {
        console.error('❌ No recipient email found in payload')
        return new Response(JSON.stringify({
          success: false,
          error: 'No recipient email found'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }
      
      console.log('🔗 Using reset URL from Auth Hook:', resetUrl)
      
      // Send via OneSignal
      const oneSignalPayload = {
        app_id: appId,
        include_email_tokens: [userEmail],
        email_subject: "Reset Your Imperial Trading Password",
        email_body: getPasswordResetEmailTemplate(resetUrl),
        email_from_name: "Imperial Trading",
        email_from_address: "support@tradeimperial.com"
      }
      
      console.log('📤 Sending to OneSignal for:', userEmail)
      
      const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiKey}`
        },
        body: JSON.stringify(oneSignalPayload)
      })
      
      const oneSignalResult = await oneSignalResponse.json()
      
      if (!oneSignalResponse.ok) {
        console.error('❌ OneSignal API error:', oneSignalResult)
        return new Response(JSON.stringify({
          success: false,
          error: 'OneSignal delivery failed',
          details: oneSignalResult
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        })
      }
      
      console.log('✅ OneSignal email sent successfully:', oneSignalResult)
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Password reset email sent via OneSignal',
        email_sent: true,
        recipient: userEmail,
        oneSignalId: oneSignalResult.id
      }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
      
    } catch (error) {
      console.error('💥 Function error:', error)
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      })
    }
  }
  
  // Method not allowed
  return new Response(JSON.stringify({
    error: 'Method not allowed',
    allowed: ['GET', 'POST', 'OPTIONS']
  }), {
    status: 405,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  })
})