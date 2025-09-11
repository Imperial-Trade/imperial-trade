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

    // Redis connection for deduplication
    const redisUrl = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const redisToken = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');
    
    // Read feature flags and OneSignal credentials
    const realtimeEnabled = Deno.env.get('REALTIME_ENABLED') !== 'false';
    let pushEnabled = Deno.env.get('PUSH_ENABLED') === 'true';
    const payloadVersion = Deno.env.get('PAYLOAD_VERSION') || 'v1.0';
    const legacyObserveOnly = Deno.env.get('LEGACY_DISPATCHER_OBSERVE_ONLY') === 'true';
    
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
    
    // Validate OneSignal credentials
    if (pushEnabled && (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY)) {
      console.warn('⚠️ Push notifications disabled: Missing OneSignal credentials');
      pushEnabled = false;
    }
    
    console.log(`🚀 Enhanced dispatcher startup - REALTIME: ${realtimeEnabled}, PUSH: ${pushEnabled}, REDIS: ${!!redisUrl}, VERSION: ${payloadVersion}`);

    // Redis helper functions
    const setRedisCache = async (key: string, value: any, ttlSeconds = 86400) => {
      if (!redisUrl || !redisToken) return false;
      try {
        const response = await fetch(`${redisUrl}/set/${key}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${redisToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value: JSON.stringify(value), ex: ttlSeconds }),
        });
        return response.ok;
      } catch (error) {
        console.warn('Redis SET failed:', error);
        return false;
      }
    };

    const getRedisCache = async (key: string) => {
      if (!redisUrl || !redisToken) return null;
      try {
        const response = await fetch(`${redisUrl}/get/${key}`, {
          headers: { 'Authorization': `Bearer ${redisToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          return data.result ? JSON.parse(data.result) : null;
        }
      } catch (error) {
        console.warn('Redis GET failed:', error);
      }
      return null;
    };

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
        const dedupeKey = `notification:sent:${event_key}`;
        
        console.log('🎯 Processing notification:', {
          signal_id: notification.signal_id,
          notification_type: notification.notification_type,
          event_key
        });

        // Redis deduplication check
        const alreadySent = await getRedisCache(dedupeKey);
        if (alreadySent) {
          console.log('🔄 Notification already sent, skipping:', event_key);
          metrics.idempotency_skipped_by_type['redis_duplicate'] = (metrics.idempotency_skipped_by_type['redis_duplicate'] || 0) + 1;
          continue;
        }

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

        // **Database Claim-Before-Send**
        const deliveryResults: any[] = [];
        
        if (targetUsers.length > 0) {
          for (const user of targetUsers) {
            for (const channel of notification.delivery_channels) {
              try {
                const { data: logEntry, error: logError } = await supabase
                  .from('notification_delivery_log')
                  .insert({
                    user_id: user.user_id,
                    signal_id: notification.signal_id,
                    notification_type: notification.notification_type,
                    delivery_channel: channel,
                    status: 'pending',
                    event_key: event_key,
                    metadata: {
                      asset_name: notification.asset_name,
                      author_name: notification.author_name,
                      priority_level: notification.priority_level
                    }
                  })
                  .select('id')
                  .single();
                
                if (!logError && logEntry) {
                  deliveryResults.push({ user_id: user.user_id, channel, log_id: logEntry.id, player_id: user.onesignal_player_id });
                }
              } catch (error) {
                console.warn('DB claim failed for user:', user.user_id, error);
              }
            }
          }
        }

        // **Push Dispatch**
        let pushSent = 0;
        if (pushEnabled && ONESIGNAL_API_KEY && notification.delivery_channels.includes('push')) {
          // Get users with OneSignal player IDs from delivery results
          const pushEligibleUsers = deliveryResults.filter(result => 
            result.channel === 'push' && result.player_id
          );
          console.log('📱 Push-eligible users (claimed):', pushEligibleUsers.length);

          if (pushEligibleUsers.length > 0) {
            console.log('📱 Sending push notifications to', pushEligibleUsers.length, 'users');
            
            const playerIds = pushEligibleUsers.map(result => result.player_id);
            
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
              app_id: ONESIGNAL_APP_ID,
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
                    'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
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
              
              // Update delivery status to sent
              for (const result of pushEligibleUsers) {
                await supabase
                  .from('notification_delivery_log')
                  .update({ status: 'sent', sent_at: new Date().toISOString() })
                  .eq('id', result.log_id);
              }
            } else {
              // Track error rate and update delivery status
              const bucket = statusCode >= 500 ? '5xx' : statusCode >= 400 ? '4xx' : 'unknown';
              metrics.push_error_codes_count[bucket] = (metrics.push_error_codes_count[bucket] || 0) + 1;
              
              // Update delivery status to failed
              for (const result of pushEligibleUsers) {
                await supabase
                  .from('notification_delivery_log')
                  .update({ 
                    status: 'failed', 
                    error_message: `Push failed with status ${statusCode}` 
                  })
                  .eq('id', result.log_id);
              }
            }
          } else {
            console.log('🔒 Push: No eligible users with valid player IDs');
            metrics.idempotency_skipped_by_type['no_push_eligible'] = (metrics.idempotency_skipped_by_type['no_push_eligible'] || 0) + 1;
          }
        }

        // **Mark as sent in Redis** (24h TTL)
        await setRedisCache(dedupeKey, {
          sent_at: server_time,
          target_user_count: targetUsers.length,
          push_sent: pushSent,
          realtime_sent: realtimeEnabled && notification.delivery_channels.includes('in_app')
        }, 86400);

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