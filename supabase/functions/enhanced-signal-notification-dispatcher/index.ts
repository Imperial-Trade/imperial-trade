// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 ENHANCED SIGNAL NOTIFICATION DISPATCHER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Central dispatcher for all signal notifications from database triggers
// Handles batch processing of notifications with automatic routing
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import {
  NOTIFICATION_TEMPLATES,
  sendRealtimeNotification,
  sendPushNotification,
  type SignalData,
  type NotificationTemplate
} from "../_shared/notification-core.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  signal_id: string;
  user_id: string;
  asset_name: string;
  trade_type: string;
  entry_price: number;
  stop_loss?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tp_hits?: number[];
  triggered_price?: number;
  tradermade_symbol?: string;
  symbol?: string;
  status?: string;
  notes?: string | null;
  notification_type: string;
  alert_type?: string;
  author_id: string;
  author_name: string;
  author_avatar_url?: string;
  target_price?: number;
  pips?: number | string;
  tp_number?: number;
  delivery_channels: string[];
  user_ids: string[];
  include_creator: boolean;
}

interface TriggerRequest {
  notifications: NotificationPayload[];
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const body: TriggerRequest = await req.json();
    
    console.log('🚀 [Enhanced Dispatcher] Received request:', {
      notification_count: body.notifications?.length || 0,
      timestamp: new Date().toISOString()
    });

    if (!body.notifications || body.notifications.length === 0) {
      console.warn('⚠️ [Enhanced Dispatcher] No notifications in payload');
      return new Response(JSON.stringify({
        success: true,
        message: 'No notifications to process',
        processed: 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const results = [];

    // Process each notification
    for (const notification of body.notifications) {
      try {
        console.log(`📬 [Processing] ${notification.notification_type} for ${notification.asset_name}`, {
          signal_id: notification.signal_id?.substring(0, 8),
          users: notification.user_ids?.length || 0,
        });

        // Convert notification payload to SignalData format
        const signalData: SignalData = {
          id: notification.signal_id,
          user_id: notification.author_id || notification.user_id,
          asset_name: notification.asset_name,
          trade_type: notification.trade_type,
          entry_price: notification.entry_price,
          triggered_price: notification.triggered_price || notification.target_price,
          stop_loss: notification.stop_loss,
          tp1: notification.tp1,
          tp2: notification.tp2,
          tp3: notification.tp3,
          tp4: notification.tp4,
          tp5: notification.tp5,
          tp_hits: notification.tp_hits || [],
          author_name: notification.author_name,
          author_avatar_url: notification.author_avatar_url,
          author_user_type: undefined, // Will be populated if needed
          pips: notification.pips?.toString(),
          tp_number: notification.tp_number,
          tradermade_symbol: notification.tradermade_symbol || notification.symbol,
          status: notification.status,
          notes: notification.notes,
        };

        // Determine template based on notification type
        let templateKey = notification.notification_type || notification.alert_type || 'signal_created';
        
        // Map alternative naming conventions
        if (templateKey === 'signal_activated') templateKey = 'limit_activated';
        if (templateKey === 'signal_closed') templateKey = 'manual_close';
        
        // Validate template exists
        if (!NOTIFICATION_TEMPLATES[templateKey]) {
          console.warn(`⚠️ Unknown template: ${templateKey}, defaulting to signal_created`);
          templateKey = 'signal_created';
        }

        const template = NOTIFICATION_TEMPLATES[templateKey](signalData);

        // Get user IDs for realtime and push
        const userIds = notification.user_ids || [];
        
        // Fetch users with push enabled from the user_ids list
        let pushUserIds: string[] = [];
        if (userIds.length > 0 && notification.delivery_channels.includes('push')) {
          const { data: pushUsers } = await supabase
            .from('profiles')
            .select('id')
            .in('id', userIds)
            .eq('account_status', 'active')
            .eq('push_subscription_active', true)
            .not('onesignal_player_id', 'is', null)
            .in('onesignal_subscription_status', ['subscribed', 'subscribed_dev']);
          
          pushUserIds = pushUsers?.map(u => u.id) || [];
        }

        // Send notifications
        const realtimeResult = notification.delivery_channels.includes('in_app')
          ? await sendRealtimeNotification(supabase, template, signalData, userIds)
          : { success: true };

        const pushResult = notification.delivery_channels.includes('push')
          ? await sendPushNotification(supabase, template, signalData, pushUserIds)
          : { success: true, sent: 0 };

        results.push({
          signal_id: notification.signal_id,
          notification_type: templateKey,
          asset_name: notification.asset_name,
          realtime: realtimeResult,
          push: pushResult,
          success: true,
        });

        console.log(`✅ [Processed] ${templateKey} for ${notification.asset_name}`, {
          realtime_success: realtimeResult.success,
          push_sent: pushResult.sent || 0,
        });

      } catch (notificationError: any) {
        console.error(`❌ [Error] Processing notification:`, notificationError);
        results.push({
          signal_id: notification.signal_id,
          notification_type: notification.notification_type,
          asset_name: notification.asset_name,
          success: false,
          error: notificationError.message,
        });
      }
    }

    const duration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`🏁 [Enhanced Dispatcher] Batch complete:`, {
      total: results.length,
      success: successCount,
      failed: failureCount,
      duration_ms: duration,
    });

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      successful: successCount,
      failed: failureCount,
      duration_ms: duration,
      results,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [Enhanced Dispatcher] Fatal error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

