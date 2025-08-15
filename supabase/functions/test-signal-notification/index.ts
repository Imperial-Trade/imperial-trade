// Test function to validate the signal notification flow
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log('🧪 Testing signal notification flow...');

    // Get push-enabled users
    const { data: pushUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, display_name, onesignal_player_id')
      .eq('push_subscription_active', true)
      .not('onesignal_player_id', 'is', null);

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`);
    }

    console.log(`📊 Found ${(pushUsers || []).length} users with push enabled`);

    if (!pushUsers || pushUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "No users with push notifications enabled found" 
        }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Create test notification payload
    const testPayload = {
      notifications: [{
        signal_id: "test-signal-123",
        user_id: "system-test",
        asset_name: "EUR/USD",
        trade_type: "buy",
        entry_price: 1.0850,
        stop_loss: 1.0820,
        tp1: 1.0900,
        symbol: "EURUSD",
        tradermade_symbol: "EURUSD",
        notification_type: "signal_created",
        alert_type: "signal_created",
        target_price: 1.0850,
        triggered_price: 1.0850,
        status: "active",
        author_name: "Test Trader",
        delivery_channels: ["push", "in_app"],
        include_creator: true,
        priority_level: 1
      }]
    };

    console.log('🚀 Invoking signal-notification-dispatcher...');

    // Call the signal notification dispatcher
    const { data: dispatchResult, error: dispatchError } = await supabase.functions.invoke(
      'signal-notification-dispatcher',
      {
        body: testPayload
      }
    );

    if (dispatchError) {
      throw new Error(`Dispatch failed: ${dispatchError.message}`);
    }

    console.log('✅ Test notification sent successfully:', dispatchResult);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Test signal notification sent successfully",
        users_targeted: pushUsers.length,
        dispatch_result: dispatchResult,
        users: pushUsers.map(u => ({ 
          id: u.id.substring(0, 8) + '...', 
          display_name: u.display_name,
          has_player_id: !!u.onesignal_player_id 
        }))
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("❌ Test notification error:", error);
    return new Response(
      JSON.stringify({
        error: "Test notification failed",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});