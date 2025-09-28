import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, notificationType = 'test', assetName = 'BTC/USD' } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create test notification payload
    const testNotification = {
      notifications: [{
        signal_id: `test_${Date.now()}`,
        user_id: 'test-user',
        asset_name: assetName,
        trade_type: 'BUY',
        entry_price: 50000,
        stop_loss: 48000,
        tp1: 52000,
        tp2: 54000,
        tp3: 56000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        notification_type: notificationType,
        alert_type: notificationType,
        status: 'active',
        priority_level: 2,
        author_id: 'test-author',
        author_name: 'Test Trader',
        delivery_channels: ['push', 'in_app'],
        user_ids: [userId],
        change_types: ['signal_created']
      }]
    };

    // Call the enhanced notification dispatcher
    const dispatcherUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/enhanced-signal-notification-dispatcher`;
    
    console.log('Sending test notification to dispatcher:', { 
      url: dispatcherUrl,
      userId,
      notificationType 
    });

    const response = await fetch(dispatcherUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify(testNotification)
    });

    const result = await response.json();

    console.log('Test notification result:', result);

    return new Response(
      JSON.stringify({
        success: response.ok,
        message: response.ok ? 'Test notification sent successfully' : 'Failed to send test notification',
        dispatcher_response: result
      }),
      {
        status: response.ok ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Test notification error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});