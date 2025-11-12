// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 ENHANCED SIGNAL NOTIFICATION DISPATCHER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Central dispatcher that receives notifications from database trigger
// Routes to appropriate notification handlers based on event type
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  signal_id: string;
  notification_type: string;
  asset_name: string;
  trade_type: string;
  entry_price: number;
  triggered_price?: number;
  author_name: string;
  author_avatar_url?: string;
  author_user_type?: string;
  pips?: string;
  tp_number?: number;
  tp_hits?: number[];
  stop_loss?: number;
  tradermade_symbol?: string;
  user_ids: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notifications } = await req.json();
    
    if (!notifications || !Array.isArray(notifications) || notifications.length === 0) {
      console.warn('⚠️ No notifications to process');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'No notifications provided' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`🎯 [Dispatcher] Processing ${notifications.length} notification(s)`);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const results = [];

    for (const notification of notifications) {
      const payload: NotificationPayload = notification;
      
      console.log(`📤 [Dispatcher] Processing: ${payload.notification_type} for ${payload.asset_name}`);

      // Get all active users for realtime notifications
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id')
        .eq('account_status', 'active')
        .limit(1000);

      if (usersError) {
        console.error('❌ Failed to fetch users:', usersError);
        continue;
      }

      // Get push-enabled users
      const { data: pushUsers, error: pushError } = await supabase
        .from('profiles')
        .select('id')
        .eq('account_status', 'active')
        .eq('push_subscription_active', true)
        .not('onesignal_player_id', 'is', null)
        .limit(1000);

      const userIds = users?.map(u => u.id) || [];
      const pushUserIds = pushUsers?.map(u => u.id) || [];

      // Build signal data object
      const signalData = {
        id: payload.signal_id,
        user_id: payload.user_ids[0] || '', // Author user ID
        asset_name: payload.asset_name,
        trade_type: payload.trade_type,
        entry_price: payload.entry_price,
        triggered_price: payload.triggered_price,
        stop_loss: payload.stop_loss,
        author_name: payload.author_name,
        author_avatar_url: payload.author_avatar_url,
        author_user_type: payload.author_user_type,
        pips: payload.pips,
        tp_number: payload.tp_number,
        tp_hits: payload.tp_hits,
        tradermade_symbol: payload.tradermade_symbol,
      };

      // Route to appropriate notification function based on type
      let functionName = '';
      
      switch (payload.notification_type) {
        case 'signal_created':
          functionName = 'notify-signal-created';
          break;
        case 'pending_limit_created':
          functionName = 'notify-signal-created';
          break;
        case 'limit_activated':
          functionName = 'notify-limit-activated';
          break;
        case 'tp_hit':
          // Route to specific TP function based on tp_number
          functionName = payload.tp_number 
            ? `notify-tp${payload.tp_number}-hit`
            : 'notify-tp-hit';
          break;
        case 'stop_loss_hit':
          functionName = 'notify-stop-loss-hit';
          break;
        case 'manual_close':
        case 'manual_close_with_tp_hit':
        case 'all_tps_hit':
          functionName = 'notify-signal-closed';
          break;
        case 'notes_updated':
          functionName = 'notify-notes-updated';
          break;
        default:
          console.warn(`⚠️ Unknown notification type: ${payload.notification_type}`);
          continue;
      }

      try {
        // Call the specific notification function
        const { data: result, error: invokeError } = await supabase.functions.invoke(
          functionName,
          {
            body: {
              signal: signalData,
              users: userIds,
              push_users: pushUserIds,
            },
          }
        );

        if (invokeError) {
          console.error(`❌ Failed to invoke ${functionName}:`, invokeError);
          results.push({
            notification_type: payload.notification_type,
            success: false,
            error: invokeError.message,
          });
        } else {
          console.log(`✅ Successfully dispatched to ${functionName}`);
          results.push({
            notification_type: payload.notification_type,
            success: true,
            function_called: functionName,
          });
        }
      } catch (error: any) {
        console.error(`❌ Error dispatching to ${functionName}:`, error);
        results.push({
          notification_type: payload.notification_type,
          success: false,
          error: error.message,
        });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      processed: notifications.length,
      results,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [Dispatcher] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
