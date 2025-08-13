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

async function sendPushNotification(payload: NotificationPayload): Promise<boolean> {
  try {
    const apiKey = Deno.env.get('ONESIGNAL_API_KEY');
    const appId = Deno.env.get('ONESIGNAL_APP_ID');
    if (!apiKey || !appId) {
      console.log('⚠️ OneSignal not configured');
      return false;
    }

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

    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(() => {
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
},
        };
        if (payload.user_ids && payload.user_ids.length > 0) {
          base.include_external_user_ids = payload.user_ids;
        } else if (payload.segments && payload.segments.length > 0) {
          base.included_segments = payload.segments;
        } else {
          base.included_segments = ['Subscribed Users'];
        }
        return base;
      })(),
      signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`❌ OneSignal API error: ${response.status} ${errText}`);
      return false;
    }

    console.log('✅ Push notification sent via OneSignal');
    return true;
  } catch (error) {
    console.error('❌ Push notification exception:', error);
    return false;
  }
}

async function processNotification(payload: NotificationPayload): Promise<Record<string, boolean>> {
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

    // Authorization: allow only admin/educator/moderator to invoke dispatcher
    const authHeader = req.headers.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const { data: authData, error: authErr } = await supabaseAuth.auth.getUser(token);
    if (authErr || !authData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
      
      // Enrich notification with author/profile and signal fields if missing (for push/title rendering)
      try {
        const { data: ownerRow } = await supabase
          .from('trade_alerts')
          .select('user_id, asset_name, trade_type, entry_price, stop_loss, tradermade_symbol')
          .eq('id', notification.signal_id)
          .single();
        if (ownerRow?.user_id) {
          const { data: profile } = await supabase
            .from('public_profiles')
            .select('display_name, avatar_url')
            .eq('id', ownerRow.user_id)
            .single();
          notification.author_id = ownerRow.user_id;
          notification.author_name = profile?.display_name || undefined;
          notification.author_avatar_url = profile?.avatar_url || undefined;
        }
        // Fill missing signal fields
        notification.asset_name = notification.asset_name ?? ownerRow?.asset_name ?? notification.asset_name;
        notification.symbol = notification.symbol ?? ownerRow?.tradermade_symbol ?? notification.symbol;
        notification.trade_type = notification.trade_type ?? ownerRow?.trade_type ?? notification.trade_type;
        notification.entry_price = notification.entry_price ?? (ownerRow?.entry_price as number | undefined);
        notification.stop_loss = notification.stop_loss ?? (ownerRow?.stop_loss as number | undefined);
      } catch (enrichErr) {
        console.log('ℹ️ Unable to enrich notification with author info:', enrichErr);
      }
      
      const deliveryResults = await processNotification(notification);
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

      // Persist user-facing notifications so they appear in the in-app center
      try {
        // Determine recipients: prefer explicit user_ids; fallback to followers + owner
        let recipientIds: string[] = [];
        if (Array.isArray(notification.user_ids) && notification.user_ids.length > 0) {
          recipientIds = notification.user_ids;
        } else {
          // Fetch owner first to resolve user followers
          const { data: ownerRow, error: ownerErr } = await supabase
            .from('trade_alerts')
            .select('user_id, asset_name, trade_type, entry_price, stop_loss, tradermade_symbol')
            .eq('id', notification.signal_id)
            .single();
          if (ownerErr) {
            console.error('⚠️ Failed to fetch signal owner for notification persistence:', ownerErr);
          }

          let followers: { follower_id: string }[] = [];
          if (ownerRow?.user_id) {
            const { data: followRows, error: followersErr } = await supabase
              .from('user_follows')
              .select('follower_id')
              .eq('following_id', ownerRow.user_id);
            if (followersErr) {
              console.error('⚠️ Failed to fetch followers for notification persistence:', followersErr);
            } else {
              followers = followRows || [];
              console.log(`👥 Found ${followers.length} followers for owner ${ownerRow.user_id}`);
            }
          }

          const set = new Set<string>();
          followers?.forEach((f: { follower_id: string }) => set.add(f.follower_id));
          if (ownerRow?.user_id) set.add(ownerRow.user_id);
          recipientIds = Array.from(set);
        }

        if (recipientIds.length > 0) {
const priority = notification.alert_type === 'stop_loss' ? 'high' : 'medium';
const isCreated = notification.notification_type === 'signal_created';
const isUpdated = notification.notification_type === 'signal_updated';
const author = (notification.author_name || '').trim();
let title: string;
let message: string;

if (isCreated) {
  title = author ? `New Signal by ${author}: ${notification.asset_name || notification.symbol || ''}`.trim() : `New Signal: ${notification.asset_name || notification.symbol || ''}`.trim();
  const priceForCreated = notification.entry_price ?? notification.target_price ?? notification.triggered_price;
  message = `${(notification.trade_type || '').toUpperCase()} @ $${Number(priceForCreated).toFixed(2)}${notification.stop_loss ? ` • SL $${Number(notification.stop_loss).toFixed(2)}` : ''}`;
} else if (isUpdated) {
  const asset = notification.asset_name || notification.symbol || 'Signal';
  title = author ? `Signal updated by ${author}: ${asset}` : `Signal updated: ${asset}`;
  const status = notification.status ? notification.status.toUpperCase() : undefined;
  const tpHitsText = notification.tp_hits && notification.tp_hits.length ? `TP hits ${notification.tp_hits.join(',')}` : undefined;
  const closeReason = notification.close_reason ? `Close: ${notification.close_reason.replace('_',' ')}` : undefined;
  const noteText = notification.notes ? (notification.notes.length > 80 ? notification.notes.slice(0,77) + '...' : notification.notes) : undefined;
  const parts: string[] = [];
  if (status) parts.push(`Status ${status}`);
  if (tpHitsText) parts.push(tpHitsText);
  if (closeReason) parts.push(closeReason);
  if (noteText) parts.push(noteText);
  message = parts.join(' • ') || 'Signal details updated';
} else {
  title = notification.alert_type === 'stop_loss' ? 'Stop Loss Hit' : 'Take Profit Triggered';
  message = `${notification.alert_type.replace('_', ' ').toUpperCase()} | Target $${Number(notification.target_price).toFixed(2)} | Now $${Number(notification.triggered_price).toFixed(2)}`;
}

          const rows = recipientIds.map((uid) => ({
            user_id: uid,
            type: 'trading_alert',
            title,
            message,
            priority,
            link_url: null,
            source: 'signal-notification-dispatcher',
            metadata: {
              signal_id: notification.signal_id,
              alert_type: notification.alert_type,
              notification_type: notification.notification_type,
              target_price: notification.target_price,
              triggered_price: notification.triggered_price,
              symbol: notification.symbol,
              asset_name: notification.asset_name,
            },
          }));

          const { error: insertErr } = await supabase
            .from('user_notifications')
            .insert(rows as any);
          if (insertErr) {
            console.error('❌ Error inserting user_notifications:', insertErr);
          }
        }
      } catch (persistErr) {
        console.error('❌ Exception while persisting user notifications:', persistErr);
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
    console.error('❌ Notification dispatcher error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to process notifications',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});