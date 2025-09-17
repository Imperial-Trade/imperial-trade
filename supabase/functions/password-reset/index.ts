import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  user: {
    id: string;
    email: string;
    user_metadata: Record<string, any>;
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

const ONESIGNAL_APP_ID = "7cd646c9-8a9d-4296-9979-c64a53074bcc";
const ONESIGNAL_EMAIL_TEMPLATE_ID = "bb9bdc05-5ef5-4e26-87f8-563f9c992bc2";

async function sendPasswordResetEmail(email: string, resetUrl: string, userName: string): Promise<any> {
  const oneSignalApiKey = Deno.env.get('ONESIGNAL_API_KEY');
  
  if (!oneSignalApiKey) {
    throw new Error('OneSignal API key not configured');
  }

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

  console.log(`📧 Sending password reset email to: ${email}`);
  console.log(`🔗 Reset URL: ${resetUrl}`);

  const response = await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${oneSignalApiKey}`,
    },
    body: JSON.stringify(emailPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ OneSignal API error (${response.status}):`, errorText);
    throw new Error(`OneSignal API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`✅ OneSignal email sent successfully:`, result);
  return result;
}

function buildSecureResetUrl(tokenHash: string, token: string): string {
  // Always use production domain for password reset emails
  const baseUrl = 'https://www.tradeimperial.com/reset-password';
  
  // Use hash parameters for better security and compatibility
  const params = new URLSearchParams({
    token_hash: tokenHash,
    type: 'recovery',
    token: token,
  });
  
  const resetUrl = `${baseUrl}#${params.toString()}`;
  
  console.log(`🔧 Built secure reset URL: ${resetUrl}`);
  return resetUrl;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📧 Password Reset Hook triggered');
    
    if (req.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405, 
        headers: corsHeaders 
      });
    }

    // Parse the request payload
    const payload: EmailPayload = await req.json();
    
    console.log('📦 Received auth hook payload:', {
      userId: payload.user?.id,
      email: payload.user?.email,
      actionType: payload.email_data?.email_action_type,
      hasTokenHash: !!payload.email_data?.token_hash,
      hasToken: !!payload.email_data?.token,
    });

    // Validate required fields
    if (!payload.user?.email || !payload.email_data?.token_hash || !payload.email_data?.token) {
      console.error('❌ Missing required fields in payload');
      return new Response('Invalid payload', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    // Only process recovery emails
    if (payload.email_data.email_action_type !== 'recovery') {
      console.log(`⏭️ Skipping non-recovery email type: ${payload.email_data.email_action_type}`);
      return new Response('OK', { 
        status: 200, 
        headers: corsHeaders 
      });
    }

    const { user, email_data } = payload;
    
    // Build secure reset URL
    const resetUrl = buildSecureResetUrl(email_data.token_hash, email_data.token);
    
    // Get user's display name
    const userName = user.user_metadata?.full_name || 
                    user.user_metadata?.display_name || 
                    user.email.split('@')[0] || 
                    'User';

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(
      user.email,
      resetUrl,
      userName
    );

    console.log('✅ Password reset email sent successfully');
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Password reset email sent',
        emailId: emailResult.id,
        recipient: user.email,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error('💥 Password reset hook error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});