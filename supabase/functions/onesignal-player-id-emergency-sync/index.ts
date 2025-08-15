// Emergency Player ID sync for users who need immediate fix
// This function will aggressively capture Player IDs for users with missing ones

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
    // Create admin client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get current user from auth header if available
    const authHeader = req.headers.get("Authorization") || "";
    let targetUserId = null;
    
    if (authHeader.includes("Bearer")) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
        global: { headers: { Authorization: authHeader } },
      });
      
      const { data: userData } = await userClient.auth.getUser();
      targetUserId = userData?.user?.id;
    }

    // Parse request body for manual user ID
    let requestedUserId = null;
    try {
      if (req.headers.get("Content-Type")?.includes("application/json")) {
        const body = await req.json();
        requestedUserId = body.user_id;
      }
    } catch {}

    const userId = requestedUserId || targetUserId;

    console.log(`🔧 Emergency Player ID sync requested for user: ${userId?.substring(0, 8)}...`);

    if (!userId) {
      // If no specific user, find users who need Player ID sync
      const { data: problemUsers, error: queryError } = await supabase
        .from('profiles')
        .select('id, display_name, push_subscription_active, onesignal_player_id, onesignal_subscription_status')
        .eq('push_subscription_active', true)
        .is('onesignal_player_id', null)
        .limit(10);

      if (queryError) {
        throw new Error(`Failed to query problem users: ${queryError.message}`);
      }

      if (!problemUsers || problemUsers.length === 0) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "No users found needing Player ID sync",
            users_fixed: 0
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log(`🔧 Found ${problemUsers.length} users needing Player ID sync`);

      // Process each user
      let successCount = 0;
      const results = [];

      for (const user of problemUsers) {
        try {
          console.log(`🔄 Syncing user: ${user.id.substring(0, 8)}... (${user.display_name || 'No name'})`);

          // Call onesignal-upsert-user with minimal data to trigger Player ID capture
          const { data: syncResult, error: syncError } = await supabase.functions.invoke(
            'onesignal-upsert-user',
            {
              body: {
                user_id: user.id,
                tags: {
                  role: 'user',
                  platform: 'web'
                }
              }
            }
          );

          if (syncError) {
            console.error(`❌ Sync failed for user ${user.id}: ${syncError.message}`);
            results.push({
              user_id: user.id,
              status: 'failed',
              error: syncError.message
            });
          } else {
            console.log(`✅ Sync successful for user ${user.id}`);
            successCount++;
            results.push({
              user_id: user.id,
              status: 'success',
              data: syncResult
            });
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (userError) {
          console.error(`❌ Exception syncing user ${user.id}:`, userError);
          results.push({
            user_id: user.id,
            status: 'error',
            error: userError instanceof Error ? userError.message : 'Unknown error'
          });
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: `Emergency sync completed: ${successCount}/${problemUsers.length} users fixed`,
          users_fixed: successCount,
          total_processed: problemUsers.length,
          results: results
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );

    } else {
      // Process single user
      console.log(`🔄 Syncing single user: ${userId.substring(0, 8)}...`);

      const { data: syncResult, error: syncError } = await supabase.functions.invoke(
        'onesignal-upsert-user',
        {
          body: {
            user_id: userId,
            tags: {
              role: 'user',
              platform: 'web'
            }
          }
        }
      );

      if (syncError) {
        throw new Error(`Sync failed: ${syncError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "User Player ID sync completed successfully",
          user_id: userId,
          result: syncResult
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

  } catch (error) {
    console.error("❌ Emergency sync error:", error);
    return new Response(
      JSON.stringify({ 
        error: "Emergency sync failed", 
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});