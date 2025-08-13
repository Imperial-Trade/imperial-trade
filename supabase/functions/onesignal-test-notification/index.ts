
// Test notification function for admins to verify delivery
// Sends a test notification to verify end-to-end delivery

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestNotificationBody {
  target_user_id?: string;
  test_message?: string;
  test_type?: 'single_user' | 'self' | 'admins';
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const apiKey = Deno.env.get("ONESIGNAL_API_KEY");
    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!apiKey || !appId || !supabaseUrl || !supabaseAnonKey) {
      return new Response(
        JSON.stringify({ error: "Configuration missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get authenticated user and verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Verify user is admin
    const { data: roleData } = await supabase.rpc('has_role', { _role: 'admin' });
    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: TestNotificationBody = await req.json().catch(() => ({}));
    const testType = body.test_type || 'self';
    const testMessage = body.test_message || 'Test notification from Imperial Trading Platform';

    console.log(`[OneSignal Test] Sending test notification (type: ${testType}) from admin: ${user.id}`);

    // Prepare notification payload based on test type
    let payload: any = {
      app_id: appId,
      headings: { en: "Test Notification" },
      contents: { en: testMessage },
      data: {
        type: "test_notification",
        test_type: testType,
        sent_by: user.id,
        timestamp: new Date().toISOString(),
      },
    };

    // Set target based on test type
    switch (testType) {
      case 'self':
        payload.include_external_user_ids = [user.id];
        break;
      case 'single_user':
        if (!body.target_user_id) {
          return new Response(
            JSON.stringify({ error: "target_user_id required for single_user test" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        payload.include_external_user_ids = [body.target_user_id];
        break;
      case 'admins':
        // Query for admin users
        const { data: adminProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin');
        
        if (!adminProfiles || adminProfiles.length === 0) {
          return new Response(
            JSON.stringify({ error: "No admin users found" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        payload.include_external_user_ids = adminProfiles.map(p => p.id);
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid test_type. Use: self, single_user, or admins" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Send the test notification
    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    
    if (!res.ok) {
      console.error("OneSignal test notification error:", result);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send test notification", 
          details: result,
          payload: payload 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[OneSignal Test] Test notification sent successfully:`, result);

    return new Response(
      JSON.stringify({ 
        success: true, 
        test_type: testType,
        recipients: payload.include_external_user_ids?.length || 0,
        onesignal_result: result,
        message: testMessage
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error(`[OneSignal Test] Error:`, error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
