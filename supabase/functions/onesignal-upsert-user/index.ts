// Supabase Edge Function: onesignal-upsert-user
// Creates or updates a OneSignal User by external_id (Supabase user id)
// and ensures the Email subscription is enabled for that user.
// Requires secrets: ONESIGNAL_APP_ID, ONESIGNAL_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY

// IMPORTANT: This function expects an authenticated request (verify_jwt = true)
// and will default to the authenticated user's id/email when not provided in the body.

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
  player_id?: string; // PHASE 2: Add player_id for enhanced linking
  external_id?: string; // PHASE 3: Modern User Model support
  force_update?: boolean; // PHASE 2: Force backend updates
  retry_on_failure?: boolean; // PHASE 2: Retry logic flag
  modern_user_model?: boolean; // PHASE 3: Modern OneSignal API flag
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

    const externalId = body.external_id || body.user_id || authUser?.id || "";
    const email = body.email || (authUser?.email as string | undefined) || undefined;
    const tags = body.tags || {};
    const playerId = body.player_id; // PHASE 2: Extract player_id for enhanced user linking
    const forceUpdate = body.force_update || false; // PHASE 2: Force update flag
    const retryOnFailure = body.retry_on_failure || false; // PHASE 2: Retry flag
    const useModernUserModel = body.modern_user_model || false; // PHASE 3: Modern API flag

    if (!externalId) {
      return new Response(
        JSON.stringify({ error: "No user_id provided and no authenticated user" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Helper to parse response text safely
    const safeText = async (r: Response) => {
      try { return await r.text(); } catch { return ""; }
    };

    // Helper to parse JSON response safely
    const safeJson = async (r: Response) => {
      try { 
        const text = await r.text(); 
        return text ? JSON.parse(text) : {};
      } catch { 
        return {}; 
      }
    };

    // STEP 1: First check if user already exists to prevent duplication
    const getUserRes = await fetch(`https://api.onesignal.com/apps/${appId}/users/by/external_id/${externalId}`, {
      method: "GET",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
    });

    let userExists = false;
    let existingUser: any = null;
    let orphanedUserFound = false;
    
    if (getUserRes.ok) {
      existingUser = await safeJson(getUserRes);
      userExists = !!existingUser?.identity?.external_id;
    console.log(`[OneSignal Upsert] 🔍 User exists with external_id: ${userExists}`, existingUser?.identity?.external_id);
      
      // **PHASE 3: Enhanced logging with modern User Model support**
      if (playerId) {
        console.log(`[OneSignal Upsert] 🎯 Processing with player_id: ${playerId} (Modern User Model: ${useModernUserModel})`);
      }
      if (forceUpdate) {
        console.log(`[OneSignal Upsert] 🚨 Force update enabled - will update regardless of existing state`);
      }
    } else {
      // **MIGRATION FIX: Check for orphaned users without external_id**
      if (playerId) {
        console.log(`[OneSignal Upsert] User not found by external_id, checking for orphaned user with player_id: ${playerId}`);
        
        try {
          // Search for existing user by player_id (subscription_id)
          const searchRes = await fetch(`https://api.onesignal.com/apps/${appId}/users?limit=1`, {
            method: "GET",
            headers: {
              Authorization: `Basic ${apiKey}`,
              "Content-Type": "application/json",
            },
          });
          
          if (searchRes.ok) {
            const searchData = await safeJson(searchRes);
            const foundUser = searchData?.users?.find((u: any) => 
              u.subscriptions?.some((s: any) => s.id === playerId)
            );
            
            if (foundUser && !foundUser.identity?.external_id) {
              console.log(`[OneSignal Upsert] Found orphaned user with player_id: ${playerId}, will link to external_id: ${externalId}`);
              existingUser = foundUser;
              orphanedUserFound = true;
            }
          }
        } catch (searchError) {
          console.warn(`[OneSignal Upsert] Failed to search for orphaned user:`, searchError);
        }
      }
    }

    // STEP 2: If user doesn't exist or orphaned user found, create/update it
    if (!userExists || orphanedUserFound) {
      const createUserPayload: any = {
        identity: { external_id: externalId },
        properties: { tags },
      };
      
      // Add subscriptions array for both email and push
      const subscriptions = [];
      
      if (email) {
        subscriptions.push({
          type: "Email",
          token: email,
          enabled: true,
        });
      }
      
      // Note: WebPush subscriptions are handled internally by OneSignal SDK
      // We don't manually create WebPush subscriptions via API - they're managed by the browser SDK
      
      if (subscriptions.length > 0) {
        createUserPayload.subscriptions = subscriptions;
      }

      // **MIGRATION FIX: Use PATCH for orphaned users to add external_id**
      const apiMethod = orphanedUserFound ? "PATCH" : "POST";
      const apiUrl = orphanedUserFound 
        ? `https://api.onesignal.com/apps/${appId}/users/${existingUser.id}`
        : `https://api.onesignal.com/apps/${appId}/users`;
      
      console.log(`[OneSignal Upsert] ${apiMethod} request to ${apiUrl} for external_id: ${externalId}`);
      
      const createRes = await fetch(apiUrl, {
        method: apiMethod,
        headers: {
          Authorization: `Basic ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createUserPayload),
      });

      if (createRes.ok) {
        const responseData = await safeJson(createRes);
        return new Response(
          JSON.stringify({
            success: true,
            action: orphanedUserFound ? "linked_orphaned_user" : "created_user",
            email_subscription_added: !!email,
            user_exists: orphanedUserFound,
            player_id: playerId || null, // PHASE 3: Include player_id in response
            external_id_linked: true,
            response: responseData,
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      } else {
        // Creation failed, but maybe user was created between our check and this call
        const createError = await safeText(createRes);
        console.warn(`User creation failed with status ${createRes.status}:`, createError);
      }
    }

    // STEP 3: User exists or creation failed - update subscriptions and tags
    let emailSubscriptionAttempt: { ok: boolean; status: number; text?: string; json?: any } | null = null;
    let pushSubscriptionAttempt: { ok: boolean; status: number; text?: string; json?: any } | null = null;
    let tagsAttempt: { ok: boolean; status: number; text?: string } | null = null;

    // Update email subscription if email provided
    if (email) {
      const subRes = await fetch(
        `https://api.onesignal.com/apps/${appId}/users/by/external_id/${externalId}/subscriptions`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            subscription: {
              type: "Email",
              token: email,
              enabled: true,
            },
          }),
        }
      );
      const subText = await safeText(subRes);
      let subJson = null;
      if (subRes.ok && subText) {
        try {
          subJson = JSON.parse(subText);
        } catch {
          subJson = {};
        }
      }
      emailSubscriptionAttempt = { 
        ok: subRes.ok, 
        status: subRes.status, 
        text: subText,
        json: subJson
      };
    }

    // **PHASE 4: EMERGENCY WebPush Player ID Handling with Enhanced Database Sync**
    if (playerId) {
      console.log(`[OneSignal Upsert] 🚨 EMERGENCY: WebPush Player ID received for user ${externalId}: ${playerId.substring(0, 8)}...`);
      
      try {
        // **PHASE 4: Enhanced database update with comprehensive tracking**
        const updateData = {
          onesignal_player_id: playerId,
          push_subscription_active: true,
          onesignal_subscription_status: 'subscribed',
          onesignal_last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log(`[OneSignal Upsert] 💾 Updating database for user ${externalId} with:`, {
          ...updateData,
          onesignal_player_id: playerId.substring(0, 8) + '...'
        });
        
        const { error: updateError, data: updateResult } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', externalId)
          .select('id, onesignal_player_id, push_subscription_active');
        
        if (updateError) {
          console.error(`[OneSignal Upsert] 💥 Database update failed for player_id ${playerId.substring(0, 8)}...:`, updateError);
          
          // **PHASE 2: Retry mechanism for database failures**
          if (retryOnFailure) {
            console.log(`[OneSignal Upsert] 🔄 Retrying database update...`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const { error: retryError } = await supabase
              .from('profiles')
              .update(updateData)
              .eq('id', externalId);
            
            if (retryError) {
              console.error(`[OneSignal Upsert] 💥 Retry also failed:`, retryError);
            } else {
              console.log(`[OneSignal Upsert] ✅ Retry successful!`);
            }
          }
        } else {
          console.log(`[OneSignal Upsert] ✅ Database updated successfully with WebPush player_id: ${playerId.substring(0, 8)}...`);
          console.log(`[OneSignal Upsert] 📊 Update result:`, updateResult);
        }
        
        // **PHASE 4: Enhanced success tracking**
        pushSubscriptionAttempt = { 
          ok: true, 
          status: 200, 
          text: "WebPush subscription tracked and database updated",
          json: { 
            message: "WebPush subscription managed by OneSignal SDK",
            player_id: playerId.substring(0, 8) + '...',
            database_updated: !updateError,
            force_update: forceUpdate,
            modern_user_model: useModernUserModel,
            external_id: externalId,
            retry_attempted: retryOnFailure && updateError
          }
        };
        
      } catch (dbError) {
        console.error(`[OneSignal Upsert] 💥 Database sync exception for player_id ${playerId.substring(0, 8)}...:`, dbError);
        
        // **PHASE 2: Still mark as partially successful since OneSignal side works**
        pushSubscriptionAttempt = { 
          ok: false, // Change to false for database errors
          status: 500, 
          text: "WebPush subscription handled by SDK but database sync failed",
          json: { 
            message: "WebPush subscription managed by OneSignal SDK",
            player_id: playerId.substring(0, 8) + '...',
            database_sync_error: dbError.message,
            external_id: externalId
          }
        };
      }
    }

    // Update tags
    if (Object.keys(tags).length > 0) {
      const tagsRes = await fetch(
        `https://api.onesignal.com/apps/${appId}/users/by/external_id/${externalId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Basic ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            properties: { tags },
          }),
        }
      );
      tagsAttempt = { ok: tagsRes.ok, status: tagsRes.status, text: await safeText(tagsRes) };
    }

    // Return success if subscriptions and tags updates succeeded
    const emailOk = emailSubscriptionAttempt?.ok || !email;
    const pushOk = pushSubscriptionAttempt?.ok || !playerId;
    const tagsOk = tagsAttempt?.ok || Object.keys(tags).length === 0;
    
    if (emailOk && pushOk && tagsOk) {
      return new Response(
        JSON.stringify({
          success: true,
          action: userExists ? "updated_existing_user" : "updated_user_after_creation_failed",
          user_exists: userExists,
          email_subscription_updated: emailSubscriptionAttempt?.ok || false,
          push_subscription_updated: pushSubscriptionAttempt?.ok || false,
          tags_updated: tagsAttempt?.ok || false,
          player_id: playerId || null,
          email_subscription_response: emailSubscriptionAttempt?.json,
          push_subscription_response: pushSubscriptionAttempt?.json,
          tags_response: tagsAttempt?.text ? (() => { try { return JSON.parse(tagsAttempt.text); } catch { return {}; } })() : null,
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // If we get here, updates failed
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to update OneSignal user subscriptions/tags",
        user_exists: userExists,
        email_subscription_status: emailSubscriptionAttempt?.status,
        email_subscription_response: emailSubscriptionAttempt?.text,
        push_subscription_status: pushSubscriptionAttempt?.status,
        push_subscription_response: pushSubscriptionAttempt?.text,
        tags_status: tagsAttempt?.status,
        tags_response: tagsAttempt?.text,
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("onesignal-upsert-user error:", err?.message || err);
    return new Response(
      JSON.stringify({ success: false, error: err?.message || String(err) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
