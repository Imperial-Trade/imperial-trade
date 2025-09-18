import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, any>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to?: string;
    email_action_type: string;
    site_url: string;
  };
}

// Configuration
const MAX_RETRY_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 15000;

// Initialize Resend
const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Enhanced error types
class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

class EmailDeliveryError extends Error {
  constructor(message: string, public statusCode?: number, public details?: any) {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

// Validate environment and configuration
function validateConfiguration(): { resendApiKey: string; isProduction: boolean } {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!resendApiKey) {
    throw new ConfigurationError('Resend API key is not configured. Please set RESEND_API_KEY environment variable.');
  }

  if (resendApiKey.length < 10) {
    throw new ConfigurationError('Resend API key appears to be invalid (too short).');
  }

  const isProduction = Deno.env.get('ENVIRONMENT') === 'production' || 
                      Deno.env.get('SUPABASE_URL')?.includes('supabase.co');

  console.log('🔧 Configuration validated:', {
    hasApiKey: true,
    keyLength: resendApiKey.length,
    isProduction,
    provider: 'Resend'
  });

  return { resendApiKey, isProduction };
}

// Build secure password reset URL
function buildSecureResetUrl(tokenHash: string, token: string): string {
  try {
    // Always use production domain for email links
    const baseUrl = 'https://www.tradeimperial.com/reset-password';
    
    // Use hash parameters for security and compatibility
    const params = new URLSearchParams({
      token_hash: tokenHash,
      type: 'recovery',
      token: token,
    });
    
    const resetUrl = `${baseUrl}#${params.toString()}`;
    
    console.log('🔗 Reset URL constructed:', {
      baseUrl,
      hasTokenHash: !!tokenHash,
      hasToken: !!token,
      urlLength: resetUrl.length
    });
    
    return resetUrl;
  } catch (error) {
    console.error('❌ Failed to build reset URL:', error);
    throw new Error(`Failed to construct reset URL: ${error.message}`);
  }
}

// Create professional password reset email HTML
function createPasswordResetEmailHtml(userName: string, resetUrl: string): string {
  return `
    <div style="font-family: 'Arial', sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff;">
      <div style="background: linear-gradient(135deg, #c09a58, #e6d3b3); padding: 40px 20px; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: bold; color: #0a0a0a;">Trade Imperial</h1>
        <p style="margin: 10px 0 0 0; font-size: 16px; color: #333;">Elite Trading Community</p>
      </div>
      
      <div style="padding: 40px 20px;">
        <h2 style="color: #c09a58; font-size: 24px; margin-bottom: 20px;">🔐 Password Reset Request</h2>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          Hello ${userName},
        </p>
        
        <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
          A password reset was requested for your Trade Imperial account. Click the button below to reset your password:
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: #c09a58; color: #0a0a0a; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Reset Your Password
          </a>
        </div>
        
        <div style="background: #1a1a1a; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #c09a58; margin-top: 0;">🛡️ Security Information:</h3>
          <ul style="list-style: none; padding: 0; color: #cccccc;">
            <li style="margin: 8px 0;">• This link will expire in 24 hours</li>
            <li style="margin: 8px 0;">• If you didn't request this, you can safely ignore this email</li>
            <li style="margin: 8px 0;">• Your account remains secure</li>
          </ul>
        </div>
        
        <p style="font-size: 14px; color: #888888; margin-top: 30px;">
          If the button doesn't work, copy and paste this link into your browser:
        </p>
        <p style="font-size: 12px; color: #666666; word-break: break-all; background: #1a1a1a; padding: 10px; border-radius: 4px;">
          ${resetUrl}
        </p>
      </div>
      
      <div style="background: #1a1a1a; padding: 20px; text-align: center; border-top: 1px solid #333;">
        <p style="margin: 0; color: #888; font-size: 14px;">
          © ${new Date().getFullYear()} Trade Imperial. All rights reserved.
        </p>
      </div>
    </div>
  `;
}

// Send email with retry logic using Resend
async function sendPasswordResetEmail(
  email: string, 
  resetUrl: string, 
  userName: string
): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`📧 Sending password reset email via Resend (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`, {
        recipient: email,
        userName,
        resetUrlLength: resetUrl.length
      });

      const emailHtml = createPasswordResetEmailHtml(userName, resetUrl);

      const result = await resend.emails.send({
        from: "Trade Imperial <security@tradeimperial.com>",
        to: [email],
        subject: "🔒 Reset Your Trade Imperial Password",
        html: emailHtml,
        text: `
          Hello ${userName},
          
          We received a request to reset your password for your Trade Imperial account.
          
          Click this link to reset your password: ${resetUrl}
          
          This link will expire in 24 hours. If you didn't request this, you can safely ignore this email.
          
        Best regards,
        Trade Imperial Security Team
        `
      });

      console.log('✅ Resend email sent successfully:', {
        id: result.data?.id,
        recipient: email,
        attempt
      });
      
      return result;

    } catch (error) {
      console.error(`❌ Email attempt ${attempt} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // For Resend, we can retry on most errors
      if (attempt < MAX_RETRY_ATTEMPTS) {
        console.log(`⏳ Retrying in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  
  throw lastError || new Error('Failed to send email after all retry attempts');
}

// Development mode support - log reset URLs for testing
function handleDevelopmentMode(email: string, resetUrl: string, userName: string): void {
  console.log('🔧 DEVELOPMENT MODE - Password Reset URL:', {
    recipient: email,
    userName,
    resetUrl,
    timestamp: new Date().toISOString(),
    message: 'In development, check logs for reset URLs'
  });
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  if (req.method === 'GET' && new URL(req.url).pathname.endsWith('/health')) {
    try {
      const { resendApiKey, isProduction } = validateConfiguration();
      
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: isProduction ? 'production' : 'development',
        provider: 'Resend',
        configuration: {
          hasApiKey: true,
          keyLength: resendApiKey.length
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return new Response(JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }

  // Handle POST requests (password reset hooks)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      error: 'Method not allowed',
      allowed_methods: ['POST', 'GET', 'OPTIONS']
    }), { 
      status: 405, 
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }

  try {
    console.log('🔐 Password Reset Hook triggered:', {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url
    });
    
    // Validate configuration first
    const { isProduction } = validateConfiguration();
    
    // Parse and validate request payload
    let payload: EmailPayload;
    try {
      payload = await req.json();
    } catch (error) {
      console.error('❌ Invalid JSON payload:', error);
      return new Response(JSON.stringify({
        success: false,
        error: 'Invalid JSON payload',
        code: 'INVALID_PAYLOAD'
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    console.log('📦 Auth hook payload received:', {
      userId: payload.user?.id,
      email: payload.user?.email,
      actionType: payload.email_data?.email_action_type,
      hasTokenHash: !!payload.email_data?.token_hash,
      hasToken: !!payload.email_data?.token,
    });

    // Validate required fields
    if (!payload.user?.email) {
      console.error('❌ Missing user email');
      return new Response(JSON.stringify({
        success: false,
        error: 'User email is required',
        code: 'MISSING_EMAIL'
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    if (!payload.email_data?.token_hash || !payload.email_data?.token) {
      console.error('❌ Missing auth tokens');
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication tokens are required',
        code: 'MISSING_TOKENS'
      }), { 
        status: 400, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Only process recovery emails
    if (payload.email_data.email_action_type !== 'recovery') {
      console.log(`⏭️ Skipping non-recovery email type: ${payload.email_data.email_action_type}`);
      return new Response(JSON.stringify({
        success: true,
        message: 'Non-recovery email type skipped',
        email_sent: false
      }), { 
        status: 200, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const { user, email_data } = payload;
    
    // Build secure reset URL
    const resetUrl = buildSecureResetUrl(email_data.token_hash, email_data.token);
    
    // Get user's display name with fallbacks
    const userName = user.user_metadata?.full_name || 
                    user.user_metadata?.display_name || 
                    user.user_metadata?.name ||
                    user.email.split('@')[0] || 
                    'User';

    // Development mode support
    if (!isProduction) {
      handleDevelopmentMode(user.email, resetUrl, userName);
    }

    // Attempt to send password reset email
    try {
      const emailResult = await sendPasswordResetEmail(
        user.email,
        resetUrl,
        userName
      );

      console.log('✅ Password reset email sent successfully via Resend');
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Password reset email sent successfully',
        email_sent: true,
        recipient: user.email,
        email_id: emailResult.data?.id,
        provider: 'Resend',
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

    } catch (emailError) {
      console.error('❌ Email delivery failed via Resend:', emailError);
      
      // In development, still log the URL
      if (!isProduction) {
        handleDevelopmentMode(user.email, resetUrl, userName);
      }
      
      return new Response(JSON.stringify({
        success: false,
        message: 'Failed to send password reset email',
        email_sent: false,
        recipient: user.email,
        error: emailError.message,
        provider: 'Resend',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

  } catch (error) {
    console.error('💥 Password reset hook critical error:', error);
    
    // Return a structured error response
    const errorResponse = {
      success: false,
      error: error instanceof ConfigurationError ? 
             'Service configuration error' : 
             'Internal server error',
      code: error instanceof ConfigurationError ? 'CONFIG_ERROR' : 'INTERNAL_ERROR',
      provider: 'Resend',
      timestamp: new Date().toISOString(),
      ...(error instanceof ConfigurationError && { 
        details: 'Please check Resend API key configuration' 
      })
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: error instanceof ConfigurationError ? 503 : 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});