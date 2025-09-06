import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

// LEGACY DISPATCHER - OBSERVE ONLY MODE
// This dispatcher is deprecated in favor of enhanced-signal-notification-dispatcher
import { corsHeaders } from "../_shared/cors.ts"
import { isPushEnabled, hashId, sanitizeError } from "../_shared/notify.ts"


interface NotificationPayload {
  signal_id: string;
  alert_type: string;
  target_price: number;
  triggered_price: number;
  notification_type: string;
  delivery_channels: string[];
}

async function sendRealtimeNotification(supabase: any, payload: NotificationPayload): Promise<boolean> {
  try {
    // Broadcast via Supabase Realtime to all subscribers
    const { error } = await supabase
      .channel('instant-alerts')
      .send({
        type: 'broadcast',
        event: 'alert_triggered',
        payload: {
          signal_id: payload.signal_id,
          alert_type: payload.alert_type,
          target_price: payload.target_price,
          triggered_price: payload.triggered_price,
          notification_type: payload.notification_type,
          timestamp: new Date().toISOString(),
          urgency: payload.alert_type === 'stop_loss' ? 'critical' : 'high'
        }
      });

    if (error) {
      console.error('❌ Realtime notification error:', error);
      return false;
    }

    console.log(`✅ Realtime notification sent for ${payload.alert_type}`);
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

async function sendPushNotification(supabase: any, payload: NotificationPayload): Promise<boolean> {
  try {
    // Check if push notifications are enabled
    if (!isPushEnabled()) {
      const hashedSignalId = await hashId(payload.signal_id);
      console.log(`event=PUSH_SUPPRESSED hashed_signal_id=${hashedSignalId} alert_type=${payload.alert_type} reason=PUSH_DISABLED`);
      return false;
    }

    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      console.error('❌ OneSignal credentials not configured');
      return false;
    }

    // Get Xeon Stream subscribers with OneSignal player IDs
    const { data: subscribers } = await supabase
      .from('profiles')
      .select('onesignal_player_id, display_name')
      .eq('push_subscription_active', true)
      .eq('xeon_stream_subscription', true)
      .eq('onesignal_subscription_status', 'subscribed')
      .not('onesignal_player_id', 'is', null);

    if (!subscribers || subscribers.length === 0) {
      console.log(`📱 No Xeon Stream subscribers found for ${payload.alert_type}`);
      return true; // No subscribers is not an error
    }

    const playerIds = subscribers.map(sub => sub.onesignal_player_id);
    console.log(`📱 Sending push to ${playerIds.length} Xeon Stream subscribers`);

    // Format notification content based on alert type
    let title = "🚨 Trading Alert";
    let message = "";
    let urgencyIcon = "🔔";

    switch (payload.alert_type) {
      case 'stop_loss':
        title = "🚨 Stop Loss Hit";
        message = `Stop Loss triggered at $${payload.triggered_price}`;
        urgencyIcon = "🛑";
        break;
      case 'take_profit_1':
      case 'take_profit_2':
      case 'take_profit_3':
      case 'take_profit_4':
      case 'take_profit_5':
        title = "💰 Take Profit Hit";
        message = `${payload.alert_type.replace('_', ' ').toUpperCase()} reached at $${payload.triggered_price}`;
        urgencyIcon = "💸";
        break;
      case 'signal_created':
        title = "📊 New Signal";
        message = `New trading signal available - Entry: $${payload.target_price}`;
        urgencyIcon = "🎯";
        break;
      case 'signal_updated':
        title = "📈 Signal Updated";
        message = `Trading signal updated at $${payload.triggered_price}`;
        urgencyIcon = "📊";
        break;
      default:
        title = "🔔 Trading Alert";
        message = `${payload.alert_type.replace('_', ' ')} - Price: $${payload.triggered_price}`;
    }

    const oneSignalPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { 
        en: title 
      },
      contents: { 
        en: message 
      },
      data: {
        signal_id: payload.signal_id,
        alert_type: payload.alert_type,
        target_price: payload.target_price,
        triggered_price: payload.triggered_price,
        timestamp: new Date().toISOString()
      },
      android_accent_color: "FF9500",
      chrome_web_badge: "/favicon.ico",
      large_icon: "/favicon.ico",
      small_icon: "/favicon.ico",
      priority: payload.alert_type === 'stop_loss' ? 10 : 7,
      ttl: 3600 // 1 hour TTL
    };

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify(oneSignalPayload),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ OneSignal API error: ${response.status} - ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`✅ OneSignal push sent successfully - ID: ${result.id} - Recipients: ${result.recipients}`);

    // Log delivery for analytics
    await supabase
      .from('notification_delivery_log')
      .insert({
        notification_type: payload.alert_type,
        delivery_channel: 'push',
        signal_id: payload.signal_id,
        user_id: null, // Bulk notification
        status: 'sent',
        metadata: {
          onesignal_id: result.id,
          recipients_count: result.recipients,
          player_ids_count: playerIds.length
        }
      });

    return true;
  } catch (error) {
    const sanitizedError = sanitizeError(error);
    console.error(`❌ Push notification exception: ${sanitizedError}`);
    return false;
  }
}

async function processNotification(supabase: any, payload: NotificationPayload): Promise<Record<string, boolean>> {
  const deliveryResults: Record<string, boolean> = {};

  // Send to all requested channels in parallel for speed
  const deliveryPromises = payload.delivery_channels.map(async (channel) => {
    switch (channel) {
      case 'realtime':
        return { channel, success: await sendRealtimeNotification(supabase, payload) };
      case 'discord':
        return { channel, success: await sendDiscordWebhook(payload) };
      case 'telegram':
        return { channel, success: await sendTelegramNotification(payload) };
      case 'push':
        return { channel, success: await sendPushNotification(supabase, payload) };
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
      
      const deliveryResults = await processNotification(supabase, notification);
      const processingTime = Date.now() - startTime;
      
      // Update notification status in database
      const { error: updateError } = await supabase
        .from('alert_notifications')
        .update({
          delivery_status: deliveryResults,
          sent_at: new Date().toISOString()
        })
        .eq('signal_id', notification.signal_id)
        .eq('notification_type', notification.notification_type);

      if (updateError) {
        console.error('❌ Error updating notification status:', updateError);
      }

      results.push({
        signal_id: notification.signal_id,
        alert_type: notification.alert_type,
        delivery_results: deliveryResults,
        processing_time_ms: processingTime,
        success: Object.values(deliveryResults).some(success => success)
      });

      console.log(`⚡ Alert processed in ${processingTime}ms - Delivery: ${JSON.stringify(deliveryResults)}`);
    }

    const totalDeliveries = results.reduce((sum, r) => sum + Object.keys(r.delivery_results).length, 0);
    const successfulDeliveries = results.reduce((sum, r) => 
      sum + Object.values(r.delivery_results).filter(Boolean).length, 0
    );
    const suppressedDeliveries = results.reduce((sum, r) => 
      sum + Object.values(r.delivery_results).filter(success => success === false).length, 0
    );

    console.log(`event=NOTIFICATION_SUMMARY processed=${notifications.length} successful=${successfulDeliveries} suppressed=${suppressedDeliveries}`);

    return new Response(
      JSON.stringify({
        processed: notifications.length,
        results,
        summary: {
          total_deliveries: totalDeliveries,
          successful_deliveries: successfulDeliveries,
          success_rate: `${((successfulDeliveries / totalDeliveries) * 100).toFixed(1)}%`,
          average_processing_time: `${(results.reduce((sum, r) => sum + r.processing_time_ms, 0) / results.length).toFixed(0)}ms`
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const sanitizedError = sanitizeError(error);
    console.error(`❌ Notification dispatcher error: ${sanitizedError}`);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process notifications',
        details: 'Internal server error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});