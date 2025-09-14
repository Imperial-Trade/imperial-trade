import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

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
  notification_type: string;
  alert_type: string;
  target_price: number;
  triggered_price: number;
  status: string;
  author_name: string;
  author_avatar_url?: string;
  delivery_channels: string[];
  user_ids?: string[];
  include_creator?: boolean;
}

interface DeliveryMetrics {
  processed_count: number;
  realtime_sent_count: number;
  push_sent_count: number;
  failed_count: number;
  errors: string[];
}

// OneSignal Configuration
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID') || 'a68af18e-ad04-4e5f-82a8-0040734f196e';
const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🔔 Enhanced Signal Notification Dispatcher started');
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    const { notifications } = await req.json();
    
    if (!Array.isArray(notifications) || notifications.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid notifications payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const metrics: DeliveryMetrics = {
      processed_count: 0,
      realtime_sent_count: 0,
      push_sent_count: 0,
      failed_count: 0,
      errors: []
    };

    for (const notification of notifications) {
      console.log(`📬 Processing notification for signal ${notification.signal_id}`);
      
      try {
        metrics.processed_count++;
        
        // Get target users if not specified
        let targetUsers = notification.user_ids || [];
        
        if (!targetUsers.length) {
          console.log('🔍 Fetching eligible users...');
          const { data: eligibleUsers, error } = await supabase
            .from('profiles')
            .select('id, onesignal_player_id, notification_preferences, push_subscription_active')
            .eq('account_status', 'active')
            .eq('push_subscription_active', true)
            .not('onesignal_player_id', 'is', null)
            .in('onesignal_subscription_status', ['subscribed', 'subscribed_dev']);
            
          if (error) {
            console.error('❌ Error fetching users:', error);
            metrics.errors.push(`Failed to fetch users: ${error.message}`);
            continue;
          }
          
          targetUsers = eligibleUsers?.map(u => u.id) || [];
          console.log(`👥 Found ${targetUsers.length} eligible users`);
        }

        if (targetUsers.length === 0) {
          console.log('⚠️ No eligible users found, skipping notification');
          continue;
        }

        // Enhanced payload with versioning and event key
        const enhancedPayload = {
          ...notification,
          event_key: `${notification.signal_id}_${notification.notification_type}_${Date.now()}`,
          version: '2.0',
          timestamp: new Date().toISOString(),
          delivery_attempt: 1,
          priority: notification.alert_type === 'signal_created' ? 'high' : 'normal'
        };

        // Send real-time notifications if in_app channel is requested
        if (notification.delivery_channels.includes('in_app')) {
          console.log('📡 Sending real-time notification...');
          
          try {
            const { error: realtimeError } = await supabase
              .channel('instant-alerts')
              .send({
                type: 'broadcast',
                event: 'alert_triggered',
                payload: enhancedPayload
              });
              
            if (realtimeError) {
              console.error('❌ Realtime error:', realtimeError);
              metrics.errors.push(`Realtime failed: ${realtimeError.message}`);
            } else {
              metrics.realtime_sent_count++;
              console.log('✅ Real-time notification sent successfully');
            }
          } catch (realtimeErr) {
            console.error('❌ Realtime exception:', realtimeErr);
            metrics.errors.push(`Realtime exception: ${realtimeErr.message}`);
          }
        }

        // Send push notifications if push channel is requested and OneSignal is configured
        if (notification.delivery_channels.includes('push') && ONESIGNAL_API_KEY) {
          console.log('📱 Sending push notifications...');
          
          // Get users with OneSignal player IDs
          const { data: pushUsers, error: pushError } = await supabase
            .from('profiles')
            .select('id, onesignal_player_id, display_name')
            .in('id', targetUsers)
            .not('onesignal_player_id', 'is', null);
            
          if (pushError) {
            console.error('❌ Error fetching push users:', pushError);
            metrics.errors.push(`Push user fetch failed: ${pushError.message}`);
          } else if (pushUsers && pushUsers.length > 0) {
            // Create OneSignal notification
            const pushPayload = {
              app_id: ONESIGNAL_APP_ID,
              include_player_ids: pushUsers.map(u => u.onesignal_player_id),
              headings: { en: `🚀 ${notification.asset_name} Signal` },
              contents: { 
                en: notification.alert_type === 'signal_created' 
                  ? `${notification.trade_type.toUpperCase()} at ${notification.entry_price}`
                  : `Signal Updated - ${notification.status.toUpperCase()}`
              },
              data: {
                signal_id: notification.signal_id,
                alert_type: notification.alert_type,
                asset_name: notification.asset_name,
                entry_price: notification.entry_price
              },
              buttons: [
                { id: 'view', text: 'View Signal' },
                { id: 'dismiss', text: 'Dismiss' }
              ],
              url: `https://kmuoqkcxguafxulqlbmi.supabase.co/dashboard/signal-stream?signal=${notification.signal_id}`,
              priority: notification.priority === 'high' ? 10 : 5
            };

            try {
              const pushResponse = await fetch('https://onesignal.com/api/v1/notifications', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Basic ${ONESIGNAL_API_KEY}`
                },
                body: JSON.stringify(pushPayload)
              });

              const pushResult = await pushResponse.json();
              
              if (pushResponse.ok && pushResult.id) {
                metrics.push_sent_count += pushUsers.length;
                console.log(`✅ Push notification sent to ${pushUsers.length} users`);
                
                // Log successful deliveries
                for (const user of pushUsers) {
                  await supabase
                    .from('notification_delivery_log')
                    .insert({
                      user_id: user.id,
                      signal_id: notification.signal_id,
                      notification_type: notification.notification_type,
                      delivery_channel: 'push',
                      status: 'sent',
                      event_key: enhancedPayload.event_key,
                      metadata: { onesignal_id: pushResult.id }
                    });
                }
              } else {
                console.error('❌ OneSignal API error:', pushResult);
                metrics.errors.push(`OneSignal failed: ${JSON.stringify(pushResult.errors || pushResult)}`);
                metrics.failed_count++;
              }
            } catch (pushErr) {
              console.error('❌ Push notification exception:', pushErr);
              metrics.errors.push(`Push exception: ${pushErr.message}`);
              metrics.failed_count++;
            }
          }
        }

        // Log successful processing
        console.log(`✅ Notification processed for signal ${notification.signal_id}`);
        
      } catch (notificationErr) {
        console.error(`❌ Error processing notification for signal ${notification.signal_id}:`, notificationErr);
        metrics.failed_count++;
        metrics.errors.push(`Notification ${notification.signal_id}: ${notificationErr.message}`);
      }
    }

    // Log final metrics
    console.log('📊 Final Delivery Metrics:', metrics);
    
    return new Response(JSON.stringify({
      success: true,
      processed: metrics.processed_count,
      delivered: {
        realtime: metrics.realtime_sent_count,
        push: metrics.push_sent_count
      },
      failed: metrics.failed_count,
      errors: metrics.errors,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Critical error in notification dispatcher:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});