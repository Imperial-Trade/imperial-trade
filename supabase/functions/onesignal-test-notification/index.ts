import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TestNotificationRequest {
  target_user_id: string;
  test_message?: string;
  test_type?: 'self' | 'broadcast';
}

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const oneSignalApiKey = Deno.env.get('ONESIGNAL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!oneSignalAppId || !oneSignalApiKey || !supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Parse request body
    const { target_user_id, test_message, test_type = 'self' } = await req.json() as TestNotificationRequest;

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: 'target_user_id is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`[OneSignal Test] Sending test notification to user: ${target_user_id}`);

    // Get user's OneSignal player ID from database
    const { data: profile } = await supabase
      .from('profiles')
      .select('onesignal_player_id, display_name, onesignal_subscription_status')
      .eq('id', target_user_id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User not found in database' 
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!profile.onesignal_player_id) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'User has no OneSignal player ID' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Prepare notification payload
    const notificationPayload = {
      app_id: oneSignalAppId,
      include_external_user_ids: [target_user_id],
      headings: { en: "Imperial Trading - Test Notification" },
      contents: { 
        en: test_message || `Test notification delivered successfully! Time: ${new Date().toLocaleTimeString()}`
      },
      data: {
        type: 'test_notification',
        test_type,
        user_id: target_user_id,
        timestamp: new Date().toISOString()
      },
      web_url: "https://e0239be6-4e0d-42c5-a3c3-ac383083c1b4.lovableproject.com/dashboard",
      chrome_web_icon: "https://e0239be6-4e0d-42c5-a3c3-ac383083c1b4.lovableproject.com/favicon.ico"
    };

    console.log(`[OneSignal Test] Sending to player: ${profile.onesignal_player_id}`);

    // Send notification via OneSignal API
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${oneSignalApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationPayload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('[OneSignal Test] API Error:', responseData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OneSignal API error',
          details: responseData
        }),
        { 
          status: response.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('[OneSignal Test] Notification sent successfully:', responseData);

    // Log successful test
    const logPayload = {
      user_id: target_user_id,
      notification_type: 'test_notification',
      delivery_channel: 'push',
      status: 'sent',
      metadata: {
        test_type,
        onesignal_response: responseData,
        player_id: profile.onesignal_player_id
      }
    };

    await supabase
      .from('notification_delivery_log')
      .insert(logPayload);

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Test notification sent successfully',
        recipients: responseData.recipients || 1,
        onesignal_id: responseData.id,
        player_id: profile.onesignal_player_id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error(`[OneSignal Test] Error: ${error}`);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

// Serve the handler
Deno.serve(handler);