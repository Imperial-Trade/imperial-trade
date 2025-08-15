/**
 * Emergency OneSignal Test Notification Function
 * PHASE 2: Enhanced testing with comprehensive logging and error tracking
 * Tests the complete OneSignal notification pipeline end-to-end
 */

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚨 EMERGENCY: OneSignal test notification starting...');
    
    const apiKey = Deno.env.get('ONESIGNAL_API_KEY');
    const appId = Deno.env.get('ONESIGNAL_APP_ID');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!apiKey || !appId || !supabaseUrl || !supabaseServiceKey) {
      console.error('🚨 Missing required environment variables');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required environment variables',
          missing: {
            apiKey: !apiKey,
            appId: !appId,
            supabaseUrl: !supabaseUrl,
            supabaseServiceKey: !supabaseServiceKey
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request body
    let requestBody = {};
    try {
      requestBody = await req.json();
    } catch (e) {
      console.log('No request body or invalid JSON, using defaults');
    }

    const { 
      test_type = 'emergency_test',
      target_user_id,
      message = '🚨 Emergency OneSignal Test',
      emergency_mode = false
    } = requestBody as any;

    console.log(`🧪 Test type: ${test_type}, Emergency mode: ${emergency_mode}`);

    // **PHASE 4: Enhanced user data collection with comprehensive validation**
    console.log('📊 Collecting comprehensive user data...');
    
    const { data: allUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, real_name, display_name, onesignal_player_id, push_subscription_active, onesignal_subscription_status, user_type, access_level, created_at, onesignal_last_verified_at')
      .eq('account_status', 'active');

    if (usersError) {
      console.error('💥 Failed to fetch users:', usersError);
      throw usersError;
    }

    const totalUsers = allUsers.length;
    const usersWithPlayerId = allUsers.filter(u => u.onesignal_player_id).length;
    const usersWithActiveSubscription = allUsers.filter(u => u.push_subscription_active).length;
    const brokenUsers = allUsers.filter(u => u.push_subscription_active && !u.onesignal_player_id);
    
    console.log(`📈 User statistics:
    - Total users: ${totalUsers}
    - Users with Player ID: ${usersWithPlayerId}
    - Users with active subscription: ${usersWithActiveSubscription}
    - Broken users (active sub, no Player ID): ${brokenUsers.length}
    - Player ID capture rate: ${totalUsers > 0 ? ((usersWithPlayerId / totalUsers) * 100).toFixed(1) : 0}%`);

    // **PHASE 2: Test OneSignal API connectivity**
    console.log('🔗 Testing OneSignal API connectivity...');
    
    let oneSignalHealthy = false;
    let oneSignalError = null;
    
    try {
      const healthCheck = await fetch(`https://api.onesignal.com/apps/${appId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (healthCheck.ok) {
        oneSignalHealthy = true;
        console.log('✅ OneSignal API connectivity test passed');
      } else {
        oneSignalError = `API returned ${healthCheck.status}`;
        console.error('❌ OneSignal API connectivity test failed:', oneSignalError);
      }
    } catch (error) {
      oneSignalError = error.message;
      console.error('❌ OneSignal API connectivity exception:', error);
    }

    // **PHASE 3: Send test notification using modern User Model**
    let notificationResult = null;
    let notificationError = null;
    
    if (oneSignalHealthy && usersWithPlayerId > 0) {
      try {
        console.log('📱 Sending test notification...');
        
        // Target users with valid Player IDs using modern User Model
        const targetUsers = target_user_id 
          ? allUsers.filter(u => u.id === target_user_id && u.onesignal_player_id)
          : allUsers.filter(u => u.onesignal_player_id).slice(0, Math.min(5, usersWithPlayerId)); // Limit to 5 for testing

        if (targetUsers.length === 0) {
          notificationError = 'No valid target users found with Player IDs';
          console.error('❌ No valid target users found');
        } else {
          const notificationPayload = {
            app_id: appId,
            headings: { en: message },
            contents: { en: `Emergency test notification - ${new Date().toLocaleTimeString()}` },
            include_external_user_ids: targetUsers.map(u => u.id), // **PHASE 3: Modern User Model targeting**
            data: {
              test_type: test_type,
              emergency_mode: emergency_mode,
              timestamp: new Date().toISOString(),
              target_users_count: targetUsers.length
            }
          };

          console.log(`📡 Sending to ${targetUsers.length} users via external_user_ids:`, 
            targetUsers.map(u => ({ id: u.id.substring(0, 8) + '...', name: u.display_name || u.real_name })));

          const notificationResponse = await fetch('https://api.onesignal.com/notifications', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(notificationPayload)
          });

          if (notificationResponse.ok) {
            notificationResult = await notificationResponse.json();
            console.log('✅ Test notification sent successfully:', notificationResult);
          } else {
            const errorText = await notificationResponse.text();
            notificationError = `Notification API error: ${notificationResponse.status} - ${errorText}`;
            console.error('❌ Notification send failed:', notificationError);
          }
        }
      } catch (error) {
        notificationError = error.message;
        console.error('❌ Notification send exception:', error);
      }
    } else {
      notificationError = oneSignalHealthy ? 'No users with Player IDs found' : 'OneSignal API not healthy';
      console.log('⚠️ Skipping notification send:', notificationError);
    }

    // **PHASE 6: Test signal notification dispatcher**
    console.log('🔧 Testing signal notification dispatcher...');
    
    let dispatcherResult = null;
    let dispatcherError = null;
    
    try {
      const testPayload = {
        notifications: [{
          signal_id: 'test-' + Date.now(),
          user_id: target_user_id || allUsers[0]?.id,
          asset_name: 'TEST/USD',
          trade_type: 'buy',
          entry_price: 1.0000,
          stop_loss: 0.9900,
          tp1: 1.0100,
          symbol: 'TESTUSD',
          tradermade_symbol: 'TESTUSD',
          created_at: new Date().toISOString(),
          notification_type: 'signal_created',
          alert_type: 'signal_created',
          target_price: 1.0000,
          triggered_price: 1.0000,
          status: 'pending',
          author_id: target_user_id || allUsers[0]?.id,
          author_name: 'Emergency Test',
          delivery_channels: ['push'],
          include_creator: false,
          emergency_test: true
        }]
      };

      const dispatcherResponse = await supabase.functions.invoke('signal-notification-dispatcher', {
        body: testPayload
      });

      if (dispatcherResponse.error) {
        dispatcherError = dispatcherResponse.error.message;
        console.error('❌ Dispatcher test failed:', dispatcherError);
      } else {
        dispatcherResult = dispatcherResponse.data;
        console.log('✅ Dispatcher test completed:', dispatcherResult);
      }
    } catch (error) {
      dispatcherError = error.message;
      console.error('❌ Dispatcher test exception:', error);
    }

    // **PHASE 6: Comprehensive response with all test results**
    const response = {
      success: oneSignalHealthy && !notificationError && !dispatcherError,
      emergency_mode: emergency_mode,
      test_timestamp: new Date().toISOString(),
      
      // User statistics
      user_stats: {
        total_users: totalUsers,
        users_with_player_id: usersWithPlayerId,
        users_with_active_subscription: usersWithActiveSubscription,
        broken_users_count: brokenUsers.length,
        player_id_capture_rate: totalUsers > 0 ? ((usersWithPlayerId / totalUsers) * 100) : 0,
        broken_users: brokenUsers.map(u => ({ 
          id: u.id.substring(0, 8) + '...', 
          name: u.display_name || u.real_name 
        })).slice(0, 10) // Limit for response size
      },
      
      // OneSignal API health
      onesignal_health: {
        api_healthy: oneSignalHealthy,
        error: oneSignalError
      },
      
      // Notification test results
      notification_test: {
        attempted: usersWithPlayerId > 0 && oneSignalHealthy,
        success: !!notificationResult && !notificationError,
        error: notificationError,
        result: notificationResult,
        target_users_count: target_user_id ? 1 : Math.min(5, usersWithPlayerId)
      },
      
      // Dispatcher test results
      dispatcher_test: {
        attempted: true,
        success: !!dispatcherResult && !dispatcherError,
        error: dispatcherError,
        result: dispatcherResult
      },
      
      // Recommendations
      recommendations: []
    };

    // Add recommendations based on test results
    if (brokenUsers.length > 0) {
      response.recommendations.push({
        priority: 'HIGH',
        issue: 'Broken Player ID state',
        description: `${brokenUsers.length} users have active subscriptions but no Player ID`,
        action: 'Run emergency Player ID recapture for affected users'
      });
    }

    if (!oneSignalHealthy) {
      response.recommendations.push({
        priority: 'CRITICAL',
        issue: 'OneSignal API connectivity',
        description: 'Cannot connect to OneSignal API',
        action: 'Check API credentials and network connectivity'
      });
    }

    if (response.user_stats.player_id_capture_rate < 50) {
      response.recommendations.push({
        priority: 'HIGH',
        issue: 'Low Player ID capture rate',
        description: `Only ${response.user_stats.player_id_capture_rate.toFixed(1)}% of users have Player IDs`,
        action: 'Investigate Player ID capture pipeline and implement fixes'
      });
    }

    console.log('🏁 Emergency test completed:', {
      success: response.success,
      recommendations: response.recommendations.length
    });

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Emergency test failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        emergency_mode: true,
        test_timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});