import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

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
  stop_loss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  symbol: string;
  tradermade_symbol: string;
  created_at: string;
  updated_at: string;
  notification_type: string;
  alert_type: string;
  target_price: number;
  triggered_price: number;
  status: string;
  tp_hits?: number[];
  close_reason?: string;
  notes?: string;
  change_types?: string[];
  priority_level: number;
  author_id: string;
  author_name: string;
  author_avatar_url?: string;
  delivery_channels: string[];
  user_ids?: string[];
  include_creator: boolean;
}

interface DeliveryMetrics {
  processed_count: number;
  realtime_sent_count: number;
  push_sent_count: number;
  push_error_rate: number;
  idempotency_skipped_by_type: Record<string, number>;
  push_error_codes_count: Record<string, number>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Read feature flags
    const realtimeEnabled = Deno.env.get('REALTIME_ENABLED') !== 'false';
    const pushEnabled = Deno.env.get('PUSH_ENABLED') === 'true';
    const payloadVersion = Deno.env.get('PAYLOAD_VERSION') || 'v1.0';
    const legacyObserveOnly = Deno.env.get('LEGACY_DISPATCHER_OBSERVE_ONLY') === 'true';
    
    console.log(`🚀 Enhanced dispatcher startup - REALTIME_ENABLED: ${realtimeEnabled}, PUSH_ENABLED: ${pushEnabled}, PAYLOAD_VERSION: ${payloadVersion}, LEGACY_DISPATCHER_OBSERVE_ONLY: ${legacyObserveOnly}`);

    const { notifications } = await req.json();
    console.log('🚀 Enhanced Signal Notification Dispatcher - Processing notifications:', notifications?.length);

    if (!notifications || !Array.isArray(notifications)) {
      throw new Error('Invalid notifications payload');
    }

    // Initialize metrics
    const metrics: DeliveryMetrics = {
      processed_count: 0,
      realtime_sent_count: 0,
      push_sent_count: 0,
      push_error_rate: 0,
      idempotency_skipped_by_type: {},
      push_error_codes_count: {}
    };

    const results = [];

    for (const notification of notifications) {
      try {
        // Compute event_key and server timestamp once
        const server_time = new Date().toISOString();
        const event_key = `${notification.notification_type}_${notification.signal_id}_${Date.now()}`;
        
        console.log('🎯 Processing notification:', {
          signal_id: notification.signal_id,
          notification_type: notification.notification_type,
          event_key
        });

        // Audience resolution - get active Xeon Stream subscribers
        const { data: eligibleUsers, error: usersError } = await supabase.rpc('get_xeon_stream_subscribers');
        
        if (usersError) {
          console.error('❌ Error getting eligible users:', usersError);
          continue;
        }

        console.log('👥 Found eligible users:', eligibleUsers?.length);

        // Filter audience (exclude creator if requested, apply user_ids filter if provided)
        let targetUsers = eligibleUsers || [];
        
        if (!notification.include_creator) {
          targetUsers = targetUsers.filter(user => user.user_id !== notification.author_id);
        }
        
        if (notification.user_ids && Array.isArray(notification.user_ids)) {
          targetUsers = targetUsers.filter(user => notification.user_ids.includes(user.user_id));
        }

        console.log('🎯 Target users after filtering:', targetUsers.length);

        if (targetUsers.length === 0) {
          console.log('⏭️ No target users, skipping notification');
          metrics.idempotency_skipped_by_type['no_users'] = (metrics.idempotency_skipped_by_type['no_users'] || 0) + 1;
          continue;
        }

        // Add payload version to notification data
        const enhancedNotification = {
          ...notification,
          v: payloadVersion,
          event_key: event_key,
          alert_type: notification.alert_type,
          target_price: notification.target_price,
          triggered_price: notification.triggered_price,
          urgency: notification.alert_type === 'stop_loss' ? 'critical' : 'high',
          timestamp: server_time
        };

        // **Realtime Dispatch**
        if (realtimeEnabled && notification.delivery_channels.includes('in_app')) {
          console.log(`📡 Broadcasting to instant-alerts channel for ${targetUsers.length} users`);
          
          // Broadcast the enhanced notification
          await supabase
            .channel('instant-alerts')
            .send({
              type: 'broadcast',
              event: 'alert_triggered',
              payload: enhancedNotification
            });

          metrics.realtime_sent_count += targetUsers.length;
        }

        // **Push Dispatch**
        let pushSent = 0;
        if (pushEnabled && Deno.env.get('ONESIGNAL_API_KEY') && notification.delivery_channels.includes('push')) {
          // Get users with OneSignal player IDs
          const pushEligibleUsers = targetUsers.filter(user => user.onesignal_player_id);
          console.log('📱 Push-eligible users:', pushEligibleUsers.length);

          if (pushEligibleUsers.length > 0) {
            console.log('📱 Sending push notifications to', pushEligibleUsers.length, 'users');
            
            const playerIds = pushEligibleUsers.map(user => user.onesignal_player_id);
            
            // Format notification based on type
            let title = '';
            let message = '';
            
            switch (notification.notification_type) {
              case 'signal_created':
              case 'signal_activated':
                title = '🔔 New Trading Signal';
                message = `${notification.asset_name} ${notification.trade_type.toUpperCase()} @ ${notification.entry_price} by ${notification.author_name}`;
                break;
              case 'signal_closed':
                title = '✅ Signal Closed';
                message = `${notification.asset_name} signal closed${notification.close_reason ? ` (${notification.close_reason})` : ''}`;
                break;
              case 'signal_tp_hit':
                title = '🎯 Take Profit Hit!';
                message = `${notification.asset_name} TP hit by ${notification.author_name}`;
                break;
              case 'tp_hit':
              case 'take_profit_hit':
                title = '🎯 Take Profit Hit!';
                message = `${notification.asset_name} reached TP @ ${notification.triggered_price}`;
                break;
              case 'stop_loss_hit':
                title = '🛑 Stop Loss Hit';
                message = `${notification.asset_name} hit SL @ ${notification.triggered_price}`;
                break;
              default:
                title = '📊 Trading Alert';
                message = `${notification.asset_name} - ${notification.notification_type}`;
            }

            const pushPayload = {
              app_id: Deno.env.get('ONESIGNAL_APP_ID'),
              include_player_ids: playerIds,
              headings: { en: title },
              contents: { en: message },
              data: {
                signal_id: notification.signal_id,
                notification_type: notification.notification_type,
                asset_name: notification.asset_name,
                event_key
              }
            };

            let pushSuccess = false;
            let statusCode = 0;
            
            // Bounded retries with jitter
            for (let attempt = 1; attempt <= 3; attempt++) {
              try {
                const pushResponse = await fetch('https://onesignal.com/api/v1/notifications', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Deno.env.get('ONESIGNAL_API_KEY')}`,
                  },
                  body: JSON.stringify(pushPayload),
                });

                statusCode = pushResponse.status;
                const responseData = await pushResponse.json();

                if (pushResponse.ok) {
                  console.log('✅ Push notification sent successfully:', responseData);
                  pushSuccess = true;
                  break;
                } else if (statusCode === 429) {
                  // Rate limited - exponential backoff with jitter
                  const delay = (Math.pow(2, attempt) + Math.random()) * 1000;
                  console.log(`⏳ Rate limited, retrying in ${delay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                } else if (statusCode >= 500) {
                  // Server error - retry
                  const delay = (attempt * 1000) + (Math.random() * 1000);
                  console.log(`🔄 Server error ${statusCode}, retrying in ${delay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                  // Client error - don't retry
                  console.error('❌ Push notification client error:', responseData);
                  break;
                }
              } catch (error) {
                console.error(`❌ Push notification attempt ${attempt} failed:`, error);
                if (attempt === 3) break;
                
                const delay = (attempt * 1000) + (Math.random() * 1000);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }

            if (pushSuccess) {
              pushSent = pushEligibleUsers.length;
              metrics.push_sent_count += pushSent;
            } else {
              // Track error rate by status code bucket
              const bucket = statusCode >= 500 ? '5xx' : statusCode >= 400 ? '4xx' : 'unknown';
              metrics.push_error_codes_count[bucket] = (metrics.push_error_codes_count[bucket] || 0) + 1;
            }
          } else {
            console.log('🔒 Push: All eligible users already claimed by other process');
            metrics.idempotency_skipped_by_type['push'] = (metrics.idempotency_skipped_by_type['push'] || 0) + 1;
          }
        }

        metrics.processed_count++;
        
        results.push({
          signal_id: notification.signal_id,
          event_key,
          target_users_count: targetUsers.length,
          realtime_sent: realtimeEnabled && notification.delivery_channels.includes('in_app'),
          push_sent,
          status: 'processed'
        });

      } catch (error) {
        console.error('❌ Error processing notification:', error);
        results.push({
          signal_id: notification.signal_id,
          error: error.message,
          status: 'error'
        });
      }
    }

    // Log final metrics
    console.log('📊 Final metrics:', metrics);

    return new Response(JSON.stringify({
      success: true,
      processed: metrics.processed_count,
      results,
      metrics
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Enhanced dispatcher error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});