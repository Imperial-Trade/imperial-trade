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

    // Step 1: Check if user exists in OneSignal by external_id
    console.log(`🔍 Checking for existing OneSignal user with external_id: ${externalId.substring(0, 8)}...`);
    
    const userFilterUrl = `https://onesignal.com/api/v1/apps/${appId}/users?external_id=${encodeURIComponent(externalId)}`;
    
    const checkResponse = await fetch(userFilterUrl, {
      method: "GET",
      headers: {
        "Authorization": `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    let existingUser = null;
    if (checkResponse.ok) {
      const checkData = await safeJson(checkResponse);
      if (checkData.users && checkData.users.length > 0) {
        existingUser = checkData.users[0];
        console.log(`✅ Found existing user: ${existingUser.id}`);
      }
    } else {
      console.warn(`⚠️ User check failed: ${checkResponse.status} ${await safeText(checkResponse)}`);
    }

    // Step 2: Create or update user
    let userResult = null;
    
    if (!existingUser) {
      console.log('📝 Creating new OneSignal user...');
      
      const createPayload = {
        identity: {
          external_id: externalId,
        },
        properties: {
          tags: tags,
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
      }

      const createResponse = await fetch(`https://onesignal.com/api/v1/apps/${appId}/users`, {
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
          tags: { ...existingUser.properties?.tags, ...tags },
        },
        subscriptions: []
      };

      // Update email subscription if provided
      if (email) {
        updatePayload.subscriptions.push({
          type: "Email",
          token: email,
          enabled: true,
        });
      }

      const updateResponse = await fetch(`https://onesignal.com/api/v1/apps/${appId}/users/by/external_id/${encodeURIComponent(externalId)}`, {
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

    // Step 3: Update Supabase profile with push subscription status
    if (playerId) {
      try {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ 
            onesignal_player_id: playerId,
            push_notifications_enabled: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', externalId);

        if (profileError) {
          console.warn('⚠️ Profile update failed:', profileError);
        } else {
          console.log('✅ Profile updated with player ID');
        }
      } catch (profileErr) {
        console.warn('⚠️ Profile update error:', profileErr);
      }
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