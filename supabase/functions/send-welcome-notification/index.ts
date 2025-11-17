// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👋 SEND WELCOME NOTIFICATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sends a welcome push notification to verify subscription
// Called after user subscribes to push notifications
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface WelcomeNotificationRequest {
  player_id: string;
  user_id: string;
  user_name?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { player_id, user_id, user_name }: WelcomeNotificationRequest = await req.json();
    
    console.log('👋 [Welcome Notification] Sending to:', {
      player_id,
      user_id,
      user_name
    });

    if (!player_id) {
      return new Response(
        JSON.stringify({ error: 'player_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get OneSignal API key from environment
    const oneSignalAppId = Deno.env.get('ONESIGNAL_APP_ID');
    const oneSignalApiKey = Deno.env.get('ONESIGNAL_API_KEY'); // ✅ FIXED: Use correct env var name

    if (!oneSignalAppId || !oneSignalApiKey) {
      console.error('❌ Missing OneSignal credentials:', {
        hasAppId: !!oneSignalAppId,
        hasApiKey: !!oneSignalApiKey
      });
      return new Response(
        JSON.stringify({ error: 'OneSignal not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare welcome notification content (matches OneSignal dashboard format)
    const firstName = user_name?.split(' ')[0] || 'Trader';
    
    const notificationPayload = {
      app_id: oneSignalAppId,
      include_player_ids: [player_id],
      headings: { en: 'Welcome to Trade Imperial' },
      contents: { 
        en: 'You are now Subscribed to receive alerts' 
      },
      data: {
        type: 'welcome',
        timestamp: new Date().toISOString(),
        user_id: user_id
      },
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      // Android specific
      android_accent_color: 'FFC09A58',
      // iOS specific
      ios_sound: 'default',
      // Web specific
      web_push_topic: 'welcome',
      chrome_web_icon: 'https://tradeimperial.com/icon-192x192.png',
      firefox_icon: 'https://tradeimperial.com/icon-192x192.png',
    };

    console.log('📤 [Welcome Notification] Sending to OneSignal...');

    // Send notification via OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${oneSignalApiKey}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ [Welcome Notification] OneSignal error:', result);
      return new Response(
        JSON.stringify({ error: 'Failed to send notification', details: result }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ [Welcome Notification] Sent successfully:', {
      notification_id: result.id,
      recipients: result.recipients
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        notification_id: result.id,
        recipients: result.recipients
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [Welcome Notification] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

