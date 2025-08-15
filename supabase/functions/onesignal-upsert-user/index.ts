// Supabase Edge Function: onesignal-upsert-user
// Creates or updates a OneSignal User by external_id (Supabase user id)
// and ensures the Email subscription is enabled for that user.
// Requires secrets: ONESIGNAL_APP_ID, ONESIGNAL_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

// CORS headers
const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface UpsertRequestBody {
  user_id?: string;
  email?: string;
  tags?: Record<string, string>;
  player_id?: string;
  external_id?: string;
  device_fingerprint?: string;
  device_info?: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const apiKey = Deno.env.get("ONESIGNAL_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

  if (!appId || !apiKey || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    // Create a Supabase client that uses the caller's auth context
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: userData } = await supabase.auth.getUser();
    const authUser = userData?.user || null;

    // Parse body (optional)
    let body: UpsertRequestBody = {};
    try {
      if (req.headers.get("Content-Type")?.includes("application/json")) {
        body = (await req.json()) as UpsertRequestBody;
      }
    } catch {}

    console.log('📋 Request body:', JSON.stringify(body, null, 2));

    // Extract and validate request data
    const externalId = body.external_id || body.user_id || authUser?.id || "";
    const email = body.email || (authUser?.email as string | undefined) || undefined;
    const tags = body.tags || {};
    const playerId = body.player_id;
    const deviceFingerprint = body.device_fingerprint;
    const deviceInfo = body.device_info || {};
    
    console.log('🔍 Processing request:', {
      externalId: externalId?.substring(0, 8) + '...',
      email: email?.substring(0, 3) + '...',
      hasPlayerId: !!playerId,
      tagsCount: Object.keys(tags).length
    });

    if (!externalId) {
      return new Response(
        JSON.stringify({ error: "No user_id provided and no authenticated user" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Helper to parse response text safely
    const safeText = async (r: Response) => {
      try {
        return await r.text();
      } catch {
        return "";
      }
    };

    // Helper to parse JSON safely
    const safeJson = async (r: Response) => {
      try {
        const text = await r.text();
        return text ? JSON.parse(text) : {};
      } catch {
        return {};
      }
    };

    // Step 1: Check if user exists in OneSignal using correct User Model API
    console.log(`🔍 Checking for existing OneSignal user with external_id: ${externalId.substring(0, 8)}...`);
    
    // Use the correct OneSignal User Model API endpoint
    const userLookupUrl = `https://api.onesignal.com/apps/${appId}/users/by/external_id/${encodeURIComponent(externalId)}`;
    
    const checkResponse = await fetch(userLookupUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    let existingUser = null;
    if (checkResponse.ok) {
      existingUser = await safeJson(checkResponse);
      console.log(`✅ Found existing user: ${existingUser.identity?.external_id}`);
    } else if (checkResponse.status === 404) {
      console.log(`📝 User not found, will create new user`);
    } else {
      console.warn(`⚠️ User check failed: ${checkResponse.status} ${await safeText(checkResponse)}`);
    }

    // Step 2: Create or update user with enhanced subscription management
    let userResult = null;
    
    if (!existingUser) {
      console.log('📝 Creating new OneSignal user...');
      
      const createPayload = {
        identity: {
          external_id: externalId,
        },
        properties: {
          tags: {}, // Zero tags to avoid plan limits
          language: "en",
          timezone_id: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        },
        subscriptions: []
      };

      // Add email subscription if email provided
      if (email) {
        createPayload.subscriptions.push({
          type: "Email",
          token: email,
          enabled: true,
        });
        console.log(`📧 Adding email subscription for: ${email.substring(0, 3)}...@${email.split('@')[1]}`);
      }

      const createResponse = await fetch(`https://api.onesignal.com/apps/${appId}/users`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createPayload),
      });

      if (createResponse.ok) {
        userResult = await safeJson(createResponse);
        console.log(`✅ User created successfully: ${userResult.identity?.external_id}`);
      } else {
        const errorText = await safeText(createResponse);
        console.error(`❌ User creation failed: ${createResponse.status} ${errorText}`);
        throw new Error(`User creation failed: ${errorText}`);
      }
    } else {
      console.log('🔄 Updating existing OneSignal user...');
      
      const updatePayload = {
        properties: {
          tags: {}, // Zero tags to avoid plan limits
          language: "en",
          timezone_id: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        },
        subscriptions: []
      };

      // Update email subscription if provided - only update if email changed
      if (email) {
        const currentEmailSub = existingUser.subscriptions?.find((sub: any) => sub.type === "Email");
        if (!currentEmailSub || currentEmailSub.token !== email) {
          updatePayload.subscriptions.push({
            type: "Email",
            token: email,
            enabled: true,
          });
          console.log(`📧 Updating email subscription to: ${email.substring(0, 3)}...@${email.split('@')[1]}`);
        } else {
          console.log('📧 Email subscription already up to date');
        }
      }

      const updateResponse = await fetch(`https://api.onesignal.com/apps/${appId}/users/by/external_id/${encodeURIComponent(externalId)}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Basic ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      });

      if (updateResponse.ok) {
        userResult = await safeJson(updateResponse);
        console.log(`✅ User updated successfully`);
      } else {
        const errorText = await safeText(updateResponse);
        console.error(`❌ User update failed: ${updateResponse.status} ${errorText}`);
        throw new Error(`User update failed: ${errorText}`);
      }
    }

    // Step 3: Enhanced player ID capture and robust database sync
    // Enhanced player ID capture and retry logic
    let finalPlayerId = playerId;
    if (!finalPlayerId && deviceInfo?.onesignal_player_id) {
      finalPlayerId = deviceInfo.onesignal_player_id;
      console.log(`📱 Using player ID from device info: ${finalPlayerId?.substring(0, 8)}...`);
    }

    // Always update profile for subscription tracking
    try {
      // Update main profile for compatibility (keep legacy behavior)
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          onesignal_player_id: finalPlayerId || null,
          push_subscription_active: !!finalPlayerId,
          onesignal_subscription_status: finalPlayerId ? 'subscribed' : 'pending',
          onesignal_last_verified_at: new Date().toISOString(),
          device_fingerprint: deviceFingerprint,
          last_device_info: deviceInfo,
          updated_at: new Date().toISOString()
        })
        .eq('id', externalId);

      if (profileError) {
        console.warn('⚠️ Profile update failed:', profileError);
      } else {
        console.log('✅ Profile updated with subscription status');
      }

      // **ENHANCED CROSS-DEVICE TRACKING: Always upsert device subscription**
      if (deviceFingerprint) {
        const { error: deviceError } = await supabase
          .from('device_subscriptions')
          .upsert({
            user_id: externalId,
            device_fingerprint: deviceFingerprint,
            onesignal_player_id: finalPlayerId || 'pending',
            device_info: deviceInfo,
            browser_name: deviceInfo.browser_name || 'Unknown',
            browser_version: deviceInfo.browser_version || 'Unknown',
            platform: deviceInfo.platform || 'Unknown',
            is_mobile: deviceInfo.is_mobile || false,
            is_active: !!finalPlayerId,
            last_seen_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,device_fingerprint'
          });

        if (deviceError) {
          console.warn('⚠️ Device subscription update failed:', deviceError);
        } else {
          console.log('✅ Device subscription tracking updated successfully');
        }

        // Enhanced retry logic for player ID capture
        if (!finalPlayerId) {
          console.log('⏳ Player ID not available yet - this device will be prompted again');
        }
      }
    } catch (profileErr) {
      console.warn('⚠️ Profile/device update error:', profileErr);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userResult,
        message: existingUser ? "User updated successfully" : "User created successfully"
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("❌ OneSignal upsert error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});