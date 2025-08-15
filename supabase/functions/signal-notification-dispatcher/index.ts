import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  signal_id: string;
  alert_type: string;
  target_price: number;
  triggered_price: number;
  notification_type: string;
  delivery_channels: string[];
  user_ids?: string[]; // target specific external_user_ids (Supabase user.id)
  segments?: string[]; // OneSignal segments, defaults to ['Subscribed Users']
  include_creator?: boolean; // Whether to include signal creator in notifications
  // Optional enrichment for "signal_created" notifications
  asset_name?: string;
  symbol?: string;
  trade_type?: string;
  entry_price?: number;
  stop_loss?: number;
  // Author enrichment
  author_id?: string;
  author_name?: string;
  author_avatar_url?: string;
  // Optional enrichment for "signal_updated" notifications
  status?: 'pending' | 'active' | 'closed';
  tp_hits?: number[];
  close_reason?: string;
  notes?: string;
}

async function sendRealtimeNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    // Server-side realtime broadcasts are handled by clients in our architecture.
    // We log and no-op here to avoid misuse in Edge Functions.
    console.log(`ℹ️ Skipping server realtime broadcast for ${payload.alert_type}. Client will handle realtime.`);
    return true;
  } catch (error) {
    console.error('❌ Realtime notification exception:', error);
    return false;
  }
}

async function sendDiscordWebhook(payload: NotificationPayload): Promise<boolean> {
  try {
    const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (!webhookUrl) {
      console.log('⚠️ Discord webhook URL not configured');
      return false;
    }

    const urgencyEmoji = payload.alert_type === 'stop_loss' ? '🚨' : '💰';
    const urgencyColor = payload.alert_type === 'stop_loss' ? 0xff0000 : 0x00ff00;
    
    const embed = {
      title: `${urgencyEmoji} Trading Alert Triggered`,
      description: `**${payload.alert_type.toUpperCase().replace('_', ' ')}** has been hit!`,
      color: urgencyColor,
      fields: [
        {
          name: "Target Price",
          value: `$${payload.target_price.toFixed(2)}`,
          inline: true
        },
        {
          name: "Triggered Price", 
          value: `$${payload.triggered_price.toFixed(2)}`,
          inline: true
        },
        {
          name: "Signal ID",
          value: payload.signal_id.substring(0, 8),
          inline: true
        }
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: "Imperial Trading Platform"
      }
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [embed] }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.error(`❌ Discord webhook error: ${response.status}`);
      return false;
    }

    console.log(`✅ Discord notification sent for ${payload.alert_type}`);
    return true;
  } catch (error) {
    console.error('❌ Discord webhook exception:', error);
    return false;
  }
}

async function sendTelegramNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID');
    
    if (!botToken || !chatId) {
      console.log('⚠️ Telegram bot token or chat ID not configured');
      return false;
    }

    const urgencyEmoji = payload.alert_type === 'stop_loss' ? '🚨' : '💰';
    const message = `${urgencyEmoji} *TRADING ALERT*\n\n` +
                   `*${payload.alert_type.toUpperCase().replace('_', ' ')}* triggered!\n\n` +
                   `Target: $${payload.target_price.toFixed(2)}\n` +
                   `Triggered: $${payload.triggered_price.toFixed(2)}\n` +
                   `Signal: \`${payload.signal_id.substring(0, 8)}\`\n\n` +
                   `⏰ ${new Date().toLocaleString()}`;

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown'
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      console.error(`❌ Telegram API error: ${response.status}`);
      return false;
    }

    console.log(`✅ Telegram notification sent for ${payload.alert_type}`);
    return true;
  } catch (error) {
    console.error('❌ Telegram notification exception:', error);
    return false;
  }
}

// **PHASE 3: Enhanced Push Notification with Modern OneSignal User Model**
async function sendPushNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const apiKey = Deno.env.get('ONESIGNAL_API_KEY');
    const appId = Deno.env.get('ONESIGNAL_APP_ID');
    if (!apiKey || !appId) {
      console.log('⚠️ OneSignal not configured - missing API key or App ID');
      return false;
    }

    console.log(`📱 Preparing push notification for signal ${payload.signal_id}`);

    const isSignalCreated = payload.notification_type === 'signal_created';
    const isSignalUpdated = payload.notification_type === 'signal_updated';
    let title: string;
    let body: string;

    if (isSignalCreated) {
      const asset = payload.asset_name || payload.symbol || 'New Signal';
      const type = (payload.trade_type || '').toUpperCase();
      const entry = payload.entry_price ?? payload.target_price ?? payload.triggered_price;
      const sl = payload.stop_loss;
      const author = (payload.author_name || '').trim();
      title = author ? `New Signal by ${author}: ${asset}` : `New Signal: ${asset}`;
      const parts: string[] = [];
      if (type && entry !== undefined) parts.push(`${type} @ $${Number(entry).toFixed(2)}`);
      if (sl !== undefined) parts.push(`SL $${Number(sl).toFixed(2)}`);
      body = parts.join(' • ');
    } else if (isSignalUpdated) {
      const asset = payload.asset_name || payload.symbol || 'Signal';
      const author = (payload.author_name || '').trim();
      const status = payload.status ? payload.status.toUpperCase() : undefined;
      const tpHitsText = payload.tp_hits && payload.tp_hits.length ? `TP hits ${payload.tp_hits.join(',')}` : undefined;
      const closeReason = payload.close_reason ? `Close: ${payload.close_reason.replace('_',' ')}` : undefined;
      const noteText = payload.notes ? (payload.notes.length > 80 ? payload.notes.slice(0,77) + '...' : payload.notes) : undefined;
      title = author ? `Signal updated by ${author}: ${asset}` : `Signal updated: ${asset}`;
      const parts: string[] = [];
      if (status) parts.push(`Status ${status}`);
      if (tpHitsText) parts.push(tpHitsText);
      if (closeReason) parts.push(closeReason);
      if (noteText) parts.push(noteText);
      body = parts.join(' • ') || 'Signal details updated';
    } else {
      title = payload.alert_type === 'stop_loss' ? 'Stop Loss Hit' : 'Take Profit Triggered';
      body = `${payload.alert_type.replace('_', ' ').toUpperCase()} | Target $${payload.target_price.toFixed(2)} | Now $${payload.triggered_price.toFixed(2)}`;
    }

    const notificationPayload = (() => {
      const base: any = {
        app_id: appId,
        headings: { en: title },
        contents: { en: body },
        data: {
          signal_id: payload.signal_id,
          alert_type: payload.alert_type,
          target_price: payload.target_price,
          triggered_price: payload.triggered_price,
          notification_type: payload.notification_type,
          asset_name: payload.asset_name,
          symbol: payload.symbol,
          trade_type: payload.trade_type,
          entry_price: payload.entry_price,
          stop_loss: payload.stop_loss,
          author_id: payload.author_id,
          author_name: payload.author_name,
          author_avatar_url: payload.author_avatar_url,
          status: payload.status,
          tp_hits: payload.tp_hits,
          close_reason: payload.close_reason,
          notes: payload.notes,
          url: `/dashboard/signal-stream?signal=${payload.signal_id}`
        },
      };
      
      // **CRITICAL: Use modern User Model with external_user_ids**
      if (payload.user_ids && payload.user_ids.length > 0) {
        base.include_external_user_ids = payload.user_ids;
        console.log(`🎯 Using modern User Model targeting: ${payload.user_ids.length} external_user_ids`);
      } else if (payload.segments && payload.segments.length > 0) {
        base.included_segments = payload.segments;
        console.log(`📡 Using legacy segments targeting: ${payload.segments.join(', ')}`);
      } else {
        base.included_segments = ['Subscribed Users'];
        console.log(`⚠️ Using default segment: Subscribed Users`);
      }
      
      return base;
    })();

    console.log(`📡 Sending OneSignal notification:`, JSON.stringify(notificationPayload, null, 2));

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Increased timeout

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(notificationPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ OneSignal API error: ${response.status} - ${errText}`);
      console.error(`❌ Request payload was:`, JSON.stringify(notificationPayload, null, 2));
      return false;
    }

    const result = await response.json();
    console.log('✅ Push notification sent via OneSignal:', result);
    
    if (result.errors && result.errors.length > 0) {
      console.error('⚠️ OneSignal returned errors:', result.errors);
      return false;
    }

    return true;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ OneSignal request timeout after 15 seconds');
    } else {
      console.error('❌ Push notification exception:', error);
    }
    return false;
  }
}

async function sendInAppNotification(payload: NotificationPayload, supabase: any): Promise<boolean> {
  try {
    // Create in-app notification records for real-time delivery
    const notificationData = {
      title: `New ${payload.trade_type?.toUpperCase() || 'Signal'}`,
      message: `${payload.asset_name || payload.symbol || 'Unknown'} - Entry: ${payload.entry_price || payload.target_price}`,
      type: 'new_signal',
      data: {
        signal_id: payload.signal_id,
        asset_name: payload.asset_name,
        trade_type: payload.trade_type,
        entry_price: payload.entry_price,
        author_name: payload.author_name
      }
    };

    // If specific user_ids are provided, send to those users
    if (payload.user_ids && payload.user_ids.length > 0) {
      for (const userId of payload.user_ids) {
        await supabase
          .from('user_notifications')
          .insert({
            user_id: userId,
            ...notificationData
          });
      }
    } else {
      // Send to all active users (optionally including the signal creator)
      const queryBuilder = supabase
        .from('profiles')
        .select('id')
        .eq('account_status', 'active');
      
      // Only exclude creator if include_creator flag is false or not set
      if (!payload.include_creator && payload.author_id) {
        queryBuilder.neq('id', payload.author_id);
      }

      const { data: activeUsers } = await queryBuilder;

      if (activeUsers && activeUsers.length > 0) {
        const notifications = activeUsers.map(user => ({
          user_id: user.id,
          ...notificationData
        }));

        await supabase
          .from('user_notifications')
          .insert(notifications);
        
        console.log(`📧 Created ${notifications.length} in-app notifications${payload.include_creator && payload.author_id ? ' (including creator)' : ''}`);
      }
    }

    console.log('✅ In-app notifications created successfully');
    return true;

  } catch (error) {
    console.error('❌ Error sending in-app notification:', error);
    return false;
  }
}

async function processNotification(payload: NotificationPayload, supabase: any): Promise<Record<string, boolean>> {
  const deliveryResults: Record<string, boolean> = {};

  // Send to all requested channels in parallel for speed
  const deliveryPromises = payload.delivery_channels.map(async (channel) => {
    switch (channel) {
      case 'realtime':
        return { channel, success: await sendRealtimeNotification(payload) };
      case 'discord':
        return { channel, success: await sendDiscordWebhook(payload) };
      case 'telegram':
        return { channel, success: await sendTelegramNotification(payload) };
      case 'push':
        return { channel, success: await sendPushNotification(payload) };
      case 'in_app':
        return { channel, success: await sendInAppNotification(payload, supabase) };
      default:
        console.warn(`⚠️ Unknown delivery channel: ${channel}`);
        return { channel, success: false };
    }
  });

  const results = await Promise.allSettled(deliveryPromises);
  
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      deliveryResults[result.value.channel] = result.value.success;
    } else {
      const channel = payload.delivery_channels[index];
      deliveryResults[channel] = false;
      console.error(`❌ Failed to send to ${channel}:`, result.reason);
    }
  });

  return deliveryResults;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authorization: allow service role (from database triggers) or admin/educator/moderator users
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Check if this is a service role request (from database trigger)
    if (token === serviceRoleKey) {
      console.log('🔐 Service role authentication successful (database trigger)');
    } else {
      // This is a user request, validate user permissions
      const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: authData, error: authErr } = await supabaseAuth.auth.getUser(token);
      if (authErr || !authData?.user) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - Invalid user token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let allowed = false;
      for (const role of ['admin','educator','moderator']) {
        const { data: hasRole, error: roleErr } = await supabase.rpc('has_role', { _user_id: authData.user.id, _role: role });
        if (roleErr) {
          console.error('🔐 Role check error:', roleErr);
        }
        if (hasRole) { allowed = true; break; }
      }

      if (!allowed) {
        return new Response(
          JSON.stringify({ error: 'Forbidden - Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      console.log('🔐 User authentication successful');
    }

    const { notifications } = await req.json();
    
    if (!notifications || !Array.isArray(notifications)) {
      return new Response(
        JSON.stringify({ error: 'Invalid notifications array' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📡 Processing ${notifications.length} instant notifications...`);

    const results = [];
    
    for (const notification of notifications) {
      const startTime = Date.now();
      
      console.log(`🚨 Processing ${notification.alert_type} for signal ${notification.signal_id}`);
      
      // **PHASE 4: CRITICAL Enhanced notification targeting with Modern OneSignal User Model**
      if (notification.delivery_channels.includes('push')) {
        try {
          console.log(`🚨 CRITICAL: Validating push notification targets for ${notification.alert_type}`);
          
          // **PHASE 5: Comprehensive user validation query**
          const { data: subscribedUsers, error: queryError } = await supabase
            .from('profiles')
            .select('id, onesignal_player_id, push_subscription_active, onesignal_subscription_status, user_type, access_level')
            .eq('account_status', 'active')
            .eq('push_subscription_active', true)
            .not('onesignal_player_id', 'is', null);
          
          if (queryError) {
            console.error(`💥 User query failed:`, queryError);
            throw queryError;
          }
          
          console.log(`📊 CRITICAL STATS: Found ${subscribedUsers?.length || 0} users with valid OneSignal Player IDs`);
          
          // **PHASE 3: Modern User Model - Use external_user_ids instead of segments**
          if (subscribedUsers && subscribedUsers.length > 0) {
            // **CRITICAL FIX: Override segments with external_user_ids for modern OneSignal targeting**
            notification.user_ids = subscribedUsers.map(u => u.id);
            delete notification.segments; // Remove segments to use external_user_ids
            
            console.log(`🚨 CRITICAL: Updated notification to target ${notification.user_ids.length} users via external_user_ids`);
            console.log(`📋 Target users: ${notification.user_ids.slice(0, 5).join(', ')}${notification.user_ids.length > 5 ? '...' : ''}`);
          } else {
            console.log('⚠️ NO USERS WITH PLAYER IDs - Running emergency Player ID capture');
            
            // **EMERGENCY: Trigger Player ID capture for users without IDs**
            try {
              const { data: usersNeedingPlayerIds } = await supabase
                .from('profiles')
                .select('id, onesignal_player_id, push_subscription_active')
                .eq('account_status', 'active')
                .eq('push_subscription_active', true)
                .is('onesignal_player_id', null);
              
              if (usersNeedingPlayerIds && usersNeedingPlayerIds.length > 0) {
                console.log(`🚨 EMERGENCY: ${usersNeedingPlayerIds.length} users need Player ID capture - triggering emergency fix`);
                
                // Call emergency Player ID fix in background (fire-and-forget)
                supabase.functions.invoke('onesignal-player-id-emergency-fix', {
                  body: { 
                    target_users: usersNeedingPlayerIds.map(u => u.id),
                    trigger_reason: 'missing_player_ids_during_notification'
                  }
                }).catch(err => console.error('Emergency Player ID fix failed:', err));
              }
            } catch (emergencyError) {
              console.error('Emergency Player ID capture failed:', emergencyError);
            }
            
            // Continue with segments fallback but log the issue
            console.log('⚠️ Falling back to segments - this will likely fail due to missing Player IDs');
          }
        } catch (userQueryError) {
          console.error(`💥 User validation failed for push notification:`, userQueryError);
          // Continue with original segments - this will likely fail but we log it
        }
      }
      
      // **PHASE 7: Enhanced delivery tracking with comprehensive logging**
      const deliveryResult = await processNotification(notification, supabase);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // **CRITICAL: Store detailed delivery results for monitoring**
      try {
        await supabase
          .from('alert_notifications')
          .insert({
            alert_monitoring_id: notification.signal_id, // We don't have monitoring_id, use signal_id
            signal_id: notification.signal_id,
            notification_type: notification.alert_type,
            target_price: notification.target_price,
            triggered_price: notification.triggered_price,
            delivery_channels: notification.delivery_channels,
            delivery_status: deliveryResult
          });
      } catch (insertError) {
        console.error(`💥 Failed to log delivery result:`, insertError);
      }
      
      results.push({
        signal_id: notification.signal_id,
        alert_type: notification.alert_type,
        delivery_channels: notification.delivery_channels,
        delivery_results: deliveryResult,
        processing_time_ms: duration,
        timestamp: new Date().toISOString(),
        target_users_count: notification.user_ids?.length || 0
      });
      
      console.log(`⏱️ ${notification.alert_type} processed in ${duration}ms - Results:`, deliveryResult);
    }
    
    const totalStartTime = Date.now();
    const totalDuration = Date.now() - totalStartTime;
    console.log(`🎯 Completed processing ${notifications.length} notifications in ${totalDuration}ms`);
    
    return new Response(JSON.stringify({
      success: true,
      processed: notifications.length,
      results: results,
      summary: {
        total_notifications: notifications.length,
        total_duration_ms: totalDuration,
        timestamp: new Date().toISOString()
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Signal notification dispatcher error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});