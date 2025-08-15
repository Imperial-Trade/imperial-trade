import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🚨 EMERGENCY: Starting Player ID fix operation...');

    // Get all active users without Player IDs but with push subscription active
    const { data: usersNeedingFix, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, display_name, user_type, access_level, push_subscription_active, onesignal_player_id')
      .eq('account_status', 'active')
      .or('onesignal_player_id.is.null,push_subscription_active.eq.true');

    if (usersError) {
      console.error('❌ Failed to fetch users:', usersError);
      throw usersError;
    }

    console.log(`🔍 Found ${usersNeedingFix?.length || 0} users needing Player ID fix`);

    const results = {
      total_users: usersNeedingFix?.length || 0,
      users_without_player_id: 0,
      users_with_inactive_subscription: 0,
      oneSignal_operations: 0,
      successful_operations: 0,
      failed_operations: 0,
      errors: []
    };

    if (!usersNeedingFix || usersNeedingFix.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No users need Player ID fix',
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Process each user
    for (const user of usersNeedingFix) {
      console.log(`🔄 Processing user: ${user.email}`);
      
      if (!user.onesignal_player_id) {
        results.users_without_player_id++;
      }
      
      if (!user.push_subscription_active) {
        results.users_with_inactive_subscription++;
      }

      try {
        // Call onesignal-upsert-user for each user
        results.oneSignal_operations++;
        
        const { data: upsertResult, error: upsertError } = await supabase.functions.invoke('onesignal-upsert-user', {
          body: {
            user_id: user.id,
            email: user.email,
            emergency_fix: true,
            tags: {
              user_type: user.user_type || 'member',
              access_level: user.access_level || 'user',
              display_name: user.display_name || user.email?.split('@')[0] || 'Unknown',
              emergency_fix_date: new Date().toISOString(),
              source: 'emergency_player_id_fix'
            }
          }
        });

        if (upsertError) {
          console.error(`❌ Upsert failed for ${user.email}:`, upsertError);
          results.failed_operations++;
          results.errors.push({
            user_email: user.email,
            error: upsertError.message || 'Unknown error'
          });
        } else {
          console.log(`✅ Upsert successful for ${user.email}`);
          results.successful_operations++;
        }

        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (operationError) {
        console.error(`❌ Operation failed for ${user.email}:`, operationError);
        results.failed_operations++;
        results.errors.push({
          user_email: user.email,
          error: operationError.message || 'Unknown operation error'
        });
      }
    }

    console.log('✅ Emergency Player ID fix completed');
    console.log('📊 Results:', results);

    return new Response(JSON.stringify({
      success: true,
      message: 'Emergency Player ID fix completed',
      results,
      recommendations: [
        results.users_without_player_id > 0 ? 
          `${results.users_without_player_id} users still need Player ID capture` : 
          'All users have Player IDs',
        results.failed_operations > 0 ? 
          `${results.failed_operations} operations failed and may need manual intervention` : 
          'All operations completed successfully',
        'Monitor the OneSignal dashboard for user synchronization status'
      ]
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Emergency fix failed:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    });
  }
});