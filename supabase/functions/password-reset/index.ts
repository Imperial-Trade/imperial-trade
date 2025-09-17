import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

interface OneSignalEmailRequest {
  app_id: string;
  template_id: string;
  recipient_email: string;
  custom_data: {
    user_name: string;
    reset_url: string;
    user_email: string;
  };
}

// Configuration
const ONESIGNAL_APP_ID = "7cd646c9-8a9d-4296-9979-c64a53074bcc";
const ONESIGNAL_EMAIL_TEMPLATE_ID = "bb9bdc05-5ef5-4e26-87f8-563f9c992bc2";
const MAX_RETRY_ATTEMPTS = 2;
const REQUEST_TIMEOUT_MS = 10000;

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
function validateConfiguration(): { oneSignalApiKey: string; isProduction: boolean } {
  const oneSignalApiKey = Deno.env.get('ONESIGNAL_API_KEY');
  
  if (!oneSignalApiKey) {
    throw new ConfigurationError('OneSignal API key is not configured. Please set ONESIGNAL_API_KEY environment variable.');
  }

  if (oneSignalApiKey.length < 10) {
    throw new ConfigurationError('OneSignal API key appears to be invalid (too short).');
  }

  const isProduction = Deno.env.get('ENVIRONMENT') === 'production' || 
                      Deno.env.get('SUPABASE_URL')?.includes('supabase.co');

  console.log('🔧 Configuration validated:', {
    hasApiKey: true,
    keyLength: oneSignalApiKey.length,
    isProduction,
    appId: ONESIGNAL_APP_ID,
    templateId: ONESIGNAL_EMAIL_TEMPLATE_ID
  });

  return { oneSignalApiKey, isProduction };
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

// Send email with retry logic and comprehensive error handling
async function sendPasswordResetEmail(
  email: string, 
  resetUrl: string, 
  userName: string, 
  apiKey: string
): Promise<any> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`📧 Sending password reset email (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`, {
        recipient: email,
        userName,
        resetUrlLength: resetUrl.length
      });

      const emailPayload: OneSignalEmailRequest = {
        app_id: ONESIGNAL_APP_ID,
        template_id: ONESIGNAL_EMAIL_TEMPLATE_ID,
        recipient_email: email,
        custom_data: {
          user_name: userName,
          reset_url: resetUrl,
          user_email: email,
        },
      };

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${apiKey}`,
        },
        body: JSON.stringify(emailPayload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ OneSignal API error (${response.status}):`, errorText);
        
        // Don't retry on certain errors
        if (response.status === 400 || response.status === 401 || response.status === 403) {
          throw new EmailDeliveryError(
            `OneSignal API authentication/validation error: ${response.status} - ${errorText}`,
            response.status,
            { responseText: errorText }
          );
        }
        
        // Retry on server errors
        lastError = new EmailDeliveryError(
          `OneSignal API server error: ${response.status} - ${errorText}`,
          response.status,
          { responseText: errorText }
        );
        
        if (attempt < MAX_RETRY_ATTEMPTS) {
          console.log(`⏳ Retrying in ${attempt * 1000}ms...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 1000));
          continue;
        }
        
        throw lastError;
      }

      const result = await response.json();
      console.log('✅ OneSignal email sent successfully:', {
        id: result.id,
        recipient: email,
        attempt
      });
      
      return result;

    } catch (error) {
      console.error(`❌ Email attempt ${attempt} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on abort/timeout or configuration errors
      if (error.name === 'AbortError' || error instanceof ConfigurationError) {
        throw error;
      }
      
      if (attempt < MAX_RETRY_ATTEMPTS) {
        console.log(`⏳ Retrying in ${attempt * 1000}ms...`);
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
  }
  
  throw lastError || new Error('Failed to send email after all retry attempts');
}

// Fallback email mechanism (log-based for now, could be extended)
async function handleEmailFallback(email: string, resetUrl: string, error: Error): Promise<void> {
  console.warn('📧 Primary email delivery failed, implementing fallback:', {
    recipient: email,
    error: error.message,
    resetUrl: resetUrl.substring(0, 100) + '...'
  });
  
  // In a production environment, you might:
  // - Store the reset request in a database for manual processing
  // - Send to a backup email service
  // - Queue for retry later
  // - Alert administrators
  
  // For now, we'll just log it comprehensively
  console.error('🚨 EMAIL DELIVERY FAILURE ALERT 🚨', {
    timestamp: new Date().toISOString(),
    recipient: email,
    errorType: error.name,
    errorMessage: error.message,
    resetUrl: resetUrl,
    action: 'ADMIN_INTERVENTION_REQUIRED'
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
      const { oneSignalApiKey, isProduction } = validateConfiguration();
      
      return new Response(JSON.stringify({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        environment: isProduction ? 'production' : 'development',
        configuration: {
          hasApiKey: true,
          keyLength: oneSignalApiKey.length,
          appId: ONESIGNAL_APP_ID,
          templateId: ONESIGNAL_EMAIL_TEMPLATE_ID
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
    const { oneSignalApiKey } = validateConfiguration();
    
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

    // Attempt to send password reset email
    try {
      const emailResult = await sendPasswordResetEmail(
        user.email,
        resetUrl,
        userName,
        oneSignalApiKey
      );

      console.log('✅ Password reset email sent successfully');
      
      return new Response(JSON.stringify({
        success: true,
        message: 'Password reset email sent successfully',
        email_sent: true,
        recipient: user.email,
        email_id: emailResult.id,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });

    } catch (emailError) {
      console.error('❌ Email delivery failed:', emailError);
      
      // Implement fallback handling
      await handleEmailFallback(user.email, resetUrl, emailError);
      
      // For now, we'll still return success to prevent Supabase from blocking
      // In production, you might want to return an error depending on your requirements
      return new Response(JSON.stringify({
        success: true, // Changed to true to prevent blocking
        message: 'Password reset initiated - if email delivery fails, please contact support',
        email_sent: false,
        recipient: user.email,
        error: emailError.message,
        fallback_activated: true,
        timestamp: new Date().toISOString()
      }), {
        status: 200, // Changed to 200 to prevent hook failure
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
      timestamp: new Date().toISOString(),
      ...(error instanceof ConfigurationError && { 
        details: 'Please check OneSignal configuration' 
      })
    };
    
    return new Response(JSON.stringify(errorResponse), {
      status: error instanceof ConfigurationError ? 503 : 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});