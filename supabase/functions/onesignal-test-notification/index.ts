// Supabase Edge Function: Test OneSignal Notification Pipeline
// Tests the complete notification flow to verify iOS PWA push notifications work

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const appId = Deno.env.get('ONESIGNAL_APP_ID');
    const apiKey = Deno.env.get('ONESIGNAL_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!appId || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'OneSignal configuration missing' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all users with valid OneSignal Player IDs
    const { data: usersWithPlayerIds, error: usersError } = await supabase
      .from('profiles')
      .select('id, onesignal_player_id, push_subscription_active, display_name')
      .eq('account_status', 'active')
      .eq('push_subscription_active', true)
      .not('onesignal_player_id', 'is', null);

    if (usersError) {
      console.error('[Test] Failed to fetch users:', usersError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch users', details: usersError }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`[Test] Found ${usersWithPlayerIds?.length || 0} users with valid Player IDs`);

    if (!usersWithPlayerIds || usersWithPlayerIds.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'No users with valid OneSignal Player IDs found',
          recommendation: 'Users need to enable push notifications first'
        }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Create test notification payload
    const testNotification = {
      app_id: appId,
      headings: { en: '🧪 Test Notification - Imperial Trading' },
      contents: { en: 'This is a test notification to verify your push notifications are working correctly! 📱' },
      included_segments: ['Subscribed Users'],
      data: {
        test: true,
        notification_type: 'test',
        timestamp: new Date().toISOString()
      }
    };

    console.log('[Test] Sending test notification:', JSON.stringify(testNotification, null, 2));

    // Send notification via OneSignal API
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testNotification)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Test] OneSignal API error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'OneSignal API error', 
          status: response.status,
          details: errorText 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const result = await response.json();
    console.log('[Test] OneSignal response:', result);

    // Test signal-notification-dispatcher edge function
    console.log('[Test] Testing signal-notification-dispatcher...');
    
    const dispatcherTestPayload = {
      notifications: [{
        signal_id: 'test-signal-' + Date.now(),
        user_id: usersWithPlayerIds[0].id,
        asset_name: 'TEST/USD',
        trade_type: 'buy',
        entry_price: 1.2345,
        stop_loss: 1.2000,
        tp1: 1.2500,
        symbol: 'TESTUSD',
        tradermade_symbol: 'TESTUSD',
        created_at: new Date().toISOString(),
        notification_type: 'signal_created',
        alert_type: 'signal_created',
        target_price: 1.2345,
        triggered_price: 1.2345,
        status: 'pending',
        author_id: usersWithPlayerIds[0].id,
        author_name: usersWithPlayerIds[0].display_name || 'Test User',
        author_avatar_url: null,
        delivery_channels: ['push'],
        include_creator: true
      }]
    };

    const { data: dispatcherResult, error: dispatcherError } = await supabase.functions.invoke(
      'signal-notification-dispatcher',
      {
        body: dispatcherTestPayload
      }
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test notifications sent successfully',
        users_count: usersWithPlayerIds.length,
        users_with_player_ids: usersWithPlayerIds.map(u => ({
          id: u.id,
          display_name: u.display_name,
          has_player_id: !!u.onesignal_player_id,
          player_id_preview: u.onesignal_player_id?.substring(0, 8) + '...'
        })),
        onesignal_result: result,
        dispatcher_test: {
          success: !dispatcherError,
          result: dispatcherResult,
          error: dispatcherError
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('[Test] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal error', 
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});