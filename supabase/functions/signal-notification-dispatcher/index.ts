// Signal Notification Dispatcher - Sends push notifications for trading signals
// This is the core function that handles all signal-related push notifications

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  notification_type: 'signal_created' | 'signal_updated' | 'tp_hit' | 'stop_loss_hit';
  alert_type: string;
  target_price?: number;
  triggered_price?: number;
  status: string;
  author_name: string;
  author_avatar_url?: string;
  delivery_channels: string[];
  user_ids?: string[];
  include_creator?: boolean;
  tp_hits?: number[];
  close_reason?: string;
  notes?: string;
  change_types?: string[];
  priority_level?: number;
}

interface NotificationRequest {
  notifications: NotificationPayload[];
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const appId = Deno.env.get("ONESIGNAL_APP_ID");
  const apiKey = Deno.env.get("ONESIGNAL_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!appId || !apiKey || !SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing required environment variables" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  try {
    // Parse request body
    const requestData: NotificationRequest = await req.json();
    console.log(`📡 Processing ${requestData.notifications.length} notification(s)`);

    // Create admin Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const results = [];

    for (const payload of requestData.notifications) {
      console.log(`🔔 Processing notification for signal: ${payload.asset_name} (${payload.notification_type})`);

      try {
        // Get target users for push notifications
        let targetUserIds: string[] = [];

        if (payload.user_ids && payload.user_ids.length > 0) {
          // Use specific user IDs if provided
          targetUserIds = payload.user_ids;
        } else {
          // Get all users with push notifications enabled
          const { data: pushUsers, error: usersError } = await supabase
            .from('profiles')
            .select('id, onesignal_player_id, onesignal_subscription_status')
            .eq('push_subscription_active', true)
            .not('onesignal_player_id', 'is', null)
            .eq('onesignal_subscription_status', 'subscribed');

          if (usersError) {
            console.error('❌ Failed to fetch push users:', usersError);
            throw new Error(`Failed to fetch push users: ${usersError.message}`);
          }

          targetUserIds = (pushUsers || []).map(u => u.id);

          // Exclude creator if specified
          if (!payload.include_creator && payload.user_id) {
            targetUserIds = targetUserIds.filter(id => id !== payload.user_id);
          }
        }

        console.log(`📤 Targeting ${targetUserIds.length} users for push notification`);

        if (targetUserIds.length === 0) {
          console.log('⚠️ No eligible users for push notification');
          results.push({
            signal_id: payload.signal_id,
            status: 'skipped',
            reason: 'No eligible users'
          });
          continue;
        }

        // Create push notification content
        const title = getNotificationTitle(payload);
        const body = getNotificationBody(payload);
        const data = getNotificationData(payload);

        // Send to OneSignal using User Model API
        const oneSignalPayload = {
          app_id: appId,
          include_external_user_ids: targetUserIds,
          headings: { en: title },
          contents: { en: body },
          data: data,
          url: `https://app.imperialtrading.com/dashboard/signal-stream?signal=${payload.signal_id}`,
          web_url: `https://app.imperialtrading.com/dashboard/signal-stream?signal=${payload.signal_id}`,
          chrome_web_icon: "https://app.imperialtrading.com/icon-192x192.png",
          firefox_icon: "https://app.imperialtrading.com/icon-192x192.png",
          android_small_icon: "ic_notification",
          large_icon: payload.author_avatar_url || "https://app.imperialtrading.com/icon-192x192.png",
          big_picture: payload.author_avatar_url,
        };

        console.log(`🚀 Sending push notification to OneSignal...`);
        
        const response = await fetch("https://api.onesignal.com/notifications", {
          method: "POST",
          headers: {
            "Authorization": `Basic ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(oneSignalPayload),
        });

        const responseData = await response.json();

        if (response.ok) {
          console.log(`✅ Push notification sent successfully: ${responseData.id}`);
          
          // Log successful delivery
          await supabase
            .from('notification_delivery_log')
            .insert({
              signal_id: payload.signal_id,
              notification_type: payload.notification_type,
              delivery_channel: 'push',
              status: 'sent',
              metadata: {
                onesignal_id: responseData.id,
                recipients: responseData.recipients || targetUserIds.length,
                external_id: responseData.external_id
              }
            });

          results.push({
            signal_id: payload.signal_id,
            status: 'success',
            onesignal_id: responseData.id,
            recipients: responseData.recipients || targetUserIds.length
          });

        } else {
          console.error(`❌ OneSignal API error:`, responseData);
          
          // Log failed delivery
          await supabase
            .from('notification_delivery_log')
            .insert({
              signal_id: payload.signal_id,
              notification_type: payload.notification_type,
              delivery_channel: 'push',
              status: 'failed',
              error_message: JSON.stringify(responseData),
              metadata: { response_data: responseData }
            });

          results.push({
            signal_id: payload.signal_id,
            status: 'failed',
            error: responseData.errors?.[0] || 'Unknown OneSignal error'
          });
        }

        // Create in-app notification for each user
        if (payload.delivery_channels.includes('in_app')) {
          for (const userId of targetUserIds) {
            await supabase
              .from('user_notifications')
              .insert({
                user_id: userId,
                type: payload.notification_type,
                title: title,
                message: body,
                data: data,
                is_read: false
              });
          }
          console.log(`📱 Created ${targetUserIds.length} in-app notifications`);
        }

      } catch (notificationError) {
        console.error(`❌ Error processing notification for signal ${payload.signal_id}:`, notificationError);
        results.push({
          signal_id: payload.signal_id,
          status: 'error',
          error: notificationError instanceof Error ? notificationError.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: requestData.notifications.length,
        results: results
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("❌ Signal notification dispatcher error:", error);
    return new Response(
      JSON.stringify({
        error: "Notification dispatch failed",
        message: error instanceof Error ? error.message : "Unknown error"
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

function getNotificationTitle(payload: NotificationPayload): string {
  switch (payload.notification_type) {
    case 'signal_created':
      return `🚨 NEW ${payload.trade_type.toUpperCase()} Signal`;
    case 'signal_updated':
      if (payload.change_types?.includes('tp_hits')) {
        return `🎯 TP Hit - ${payload.asset_name}`;
      }
      if (payload.change_types?.includes('status_change') && payload.status === 'closed') {
        return `🔒 Signal Closed - ${payload.asset_name}`;
      }
      return `📝 Signal Updated - ${payload.asset_name}`;
    case 'tp_hit':
      return `🎯 TP Hit - ${payload.asset_name}`;
    case 'stop_loss_hit':
      return `🛑 Stop Loss Hit - ${payload.asset_name}`;
    default:
      return `📈 ${payload.asset_name} Alert`;
  }
}

function getNotificationBody(payload: NotificationPayload): string {
  const authorName = payload.author_name || 'Trader';
  
  switch (payload.notification_type) {
    case 'signal_created':
      return `${authorName}: ${payload.asset_name} ${payload.trade_type} @ ${payload.entry_price} | SL: ${payload.stop_loss}${payload.tp1 ? ` | TP: ${payload.tp1}` : ''}`;
    case 'signal_updated':
      if (payload.change_types?.includes('tp_hits')) {
        return `${authorName}: TP${payload.tp_hits?.[payload.tp_hits.length - 1] || '1'} reached! 🎯`;
      }
      if (payload.change_types?.includes('status_change') && payload.status === 'closed') {
        return `${authorName}: Signal closed${payload.close_reason ? ` (${payload.close_reason})` : ''}`;
      }
      return `${authorName}: Signal updated - check for changes`;
    case 'tp_hit':
      return `${authorName}: Take Profit hit at ${payload.triggered_price || payload.target_price}! 🎯`;
    case 'stop_loss_hit':
      return `${authorName}: Stop Loss triggered at ${payload.triggered_price || payload.target_price}`;
    default:
      return `${authorName}: ${payload.asset_name} alert triggered`;
  }
}

function getNotificationData(payload: NotificationPayload): Record<string, any> {
  return {
    signal_id: payload.signal_id,
    type: payload.notification_type,
    asset_name: payload.asset_name,
    trade_type: payload.trade_type,
    entry_price: payload.entry_price,
    url: `/dashboard/signal-stream?signal=${payload.signal_id}`,
    author_name: payload.author_name,
    timestamp: new Date().toISOString()
  };
}