import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

// ===== INTERFACES & TYPES =====

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
  symbol?: string;
  tradermade_symbol?: string;
  created_at: string;
  updated_at: string;
  notification_type: string;
  alert_type: string;
  target_price?: number;
  triggered_price?: number;
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
  include_creator?: boolean;
}

interface DeliveryMetrics {
  processed: number;
  sent: number;
  failed: number;
  in_app_sent: number;
  push_sent: number;
  errors: string[];
}

interface OneSignalDevice {
  id: string;
  device_type: number;
  language: string;
  timezone: number;
  last_active: number;
  playtime: number;
  created_at: number;
}

interface OneSignalNotificationPayload {
  app_id: string;
  include_player_ids?: string[];
  headings: { [key: string]: string };
  contents: { [key: string]: string };
  data?: Record<string, any>;
  web_url?: string;
  chrome_web_icon?: string;
  chrome_web_badge?: string;
  web_buttons?: Array<{
    id: string;
    text: string;
    url: string;
  }>;
  android_accent_color?: string;
  android_led_color?: string;
  android_sound?: string;
  android_group?: string;
  android_group_message?: { [key: string]: string };
  ios_sound?: string;
  ios_category?: string;
  ios_attachments?: Record<string, any>;
  priority?: number;
  ttl?: number;
  collapse_id?: string;
  mutable_content?: boolean;
  content_available?: boolean;
}

// ===== CONFIGURATION =====

const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ===== UTILITY FUNCTIONS =====

function logProfessional(level: 'info' | 'warn' | 'error', message: string, data?: any) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level: level.toUpperCase(),
    message,
    service: 'enhanced-signal-notification-dispatcher',
    ...(data && { data })
  };
  console.log(JSON.stringify(logEntry));
}

function generateEventKey(notification: NotificationPayload): string {
  const baseKey = `${notification.notification_type}_${notification.signal_id}`;
  const timestamp = Math.floor(Date.now() / 1000);
  return `${baseKey}_${timestamp}`;
}

function createRichNotificationContent(notification: NotificationPayload): {
  title: string;
  body: string;
  data: Record<string, any>;
  webButtons?: Array<{ id: string; text: string; url: string; }>;
} {
  const { asset_name, trade_type, entry_price, author_name, notification_type, status, tp_hits } = notification;
  
  let title = '';
  let body = '';
  let urgencyIcon = '';

  // Determine urgency and content based on notification type
  switch (notification_type) {
    case 'signal_created':
      urgencyIcon = '🚨';
      title = `${urgencyIcon} New ${trade_type.toUpperCase()} Signal`;
      body = `${author_name} created ${asset_name} at ${entry_price}`;
      break;
    case 'signal_updated':
      if (notification.change_types?.includes('tp_hits')) {
        urgencyIcon = '🎯';
        title = `${urgencyIcon} TP Hit - ${asset_name}`;
        body = `Take Profit ${tp_hits?.[tp_hits.length - 1]} reached!`;
      } else if (notification.change_types?.includes('status_change')) {
        urgencyIcon = status === 'closed' ? '🔒' : '✅';
        title = `${urgencyIcon} Signal ${status.toUpperCase()} - ${asset_name}`;
        body = `Status changed by ${author_name}`;
      } else {
        urgencyIcon = '📊';
        title = `${urgencyIcon} Signal Updated - ${asset_name}`;
        body = `${author_name} updated the signal`;
      }
      break;
    default:
      urgencyIcon = '📈';
      title = `${urgencyIcon} Trading Alert - ${asset_name}`;
      body = `${author_name}: ${trade_type.toUpperCase()} at ${entry_price}`;
  }

  // Rich data payload for deep linking and UI enhancement
  const data = {
    signal_id: notification.signal_id,
    asset_name: notification.asset_name,
    notification_type: notification.notification_type,
    priority_level: notification.priority_level,
    author_id: notification.author_id,
    author_name: notification.author_name,
    trade_type: notification.trade_type,
    entry_price: notification.entry_price.toString(),
    status: notification.status,
    created_at: notification.created_at,
    deep_link: `/dashboard/signals/${notification.signal_id}`,
    urgency_score: notification.priority_level,
    ...(notification.tp_hits && { tp_hits: JSON.stringify(notification.tp_hits) }),
    ...(notification.close_reason && { close_reason: notification.close_reason })
  };

  // Web action buttons for enhanced UX
  const webButtons = [
    {
      id: 'view_signal',
      text: '👁️ View Signal',
      url: `https://www.tradeimperial.com/dashboard/signals/${notification.signal_id}`
    },
    {
      id: 'view_all_signals',
      text: '📊 All Signals',
      url: 'https://www.tradeimperial.com/dashboard/signals'
    }
  ];

  return { title, body, data, webButtons };
}

async function getEligibleUsers(supabase: any, userIds?: string[]): Promise<Array<{
  id: string;
  onesignal_player_id: string;
  display_name: string;
  notification_preferences: any;
}>> {
  try {
    let query = supabase
      .from('profiles')
      .select('id, onesignal_player_id, display_name, notification_preferences')
      .eq('account_status', 'active')
      .eq('push_subscription_active', true)
      .in('onesignal_subscription_status', ['subscribed', 'subscribed_dev'])
      .not('onesignal_player_id', 'is', null);

    if (userIds && userIds.length > 0) {
      query = query.in('id', userIds);
    }

    const { data, error } = await query;

    if (error) {
      logProfessional('error', 'Failed to fetch eligible users', { error: error.message });
      return [];
    }

    logProfessional('info', `Found ${data?.length || 0} eligible users for notification`);
    return data || [];
  } catch (error) {
    logProfessional('error', 'Error in getEligibleUsers', { error: error.message });
    return [];
  }
}

async function sendOneSignalNotification(
  playerIds: string[],
  content: { title: string; body: string; data: Record<string, any>; webButtons?: Array<{ id: string; text: string; url: string; }> },
  priority: number
): Promise<{ success: boolean; response?: any; error?: string }> {
  if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
    return { success: false, error: 'OneSignal credentials not configured' };
  }

  if (playerIds.length === 0) {
    return { success: false, error: 'No player IDs provided' };
  }

  try {
    const payload: OneSignalNotificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: content.title },
      contents: { en: content.body },
      data: content.data,
      web_url: content.data.deep_link ? `https://www.tradeimperial.com${content.data.deep_link}` : undefined,
      chrome_web_icon: 'https://www.tradeimperial.com/icon-192.png',
      chrome_web_badge: 'https://www.tradeimperial.com/badge-icon.png',
      web_buttons: content.webButtons,
      android_accent_color: 'FF1B4F72',
      android_led_color: 'FF1B4F72',
      android_sound: 'trading_alert',
      android_group: 'trading_signals',
      android_group_message: { en: 'You have {{count}} new trading alerts' },
      ios_sound: 'trading_alert.wav',
      ios_category: 'TRADING_ALERT',
      priority: Math.min(Math.max(priority, 1), 10),
      ttl: 3600, // 1 hour TTL for trading alerts
      collapse_id: `signal_${content.data.signal_id}`,
      mutable_content: true,
      content_available: true
    };

    logProfessional('info', `Sending OneSignal notification to ${playerIds.length} devices`, {
      payload: {
        title: content.title,
        playerCount: playerIds.length,
        priority,
        signalId: content.data.signal_id
      }
    });

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
        'User-Agent': 'Imperial-Trading-Notification-Dispatcher/2.0'
      },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      logProfessional('error', 'OneSignal API error', {
        status: response.status,
        response: responseData,
        playerIds: playerIds.slice(0, 5) // Log first 5 for debugging
      });
      return { success: false, error: `OneSignal API error: ${responseData.errors?.[0]?.message || 'Unknown error'}` };
    }

    logProfessional('info', 'OneSignal notification sent successfully', {
      recipients: responseData.recipients || 0,
      id: responseData.id,
      external_id: responseData.external_id
    });

    return { success: true, response: responseData };
  } catch (error) {
    logProfessional('error', 'Failed to send OneSignal notification', { 
      error: error.message,
      playerIds: playerIds.length 
    });
    return { success: false, error: error.message };
  }
}

async function sendRealtimeNotification(
  supabase: any,
  notification: NotificationPayload,
  eventKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const channel = supabase.channel('instant-alerts');
    
    const realtimePayload = {
      event_key: eventKey,
      notification_type: notification.notification_type,
      signal_id: notification.signal_id,
      asset_name: notification.asset_name,
      trade_type: notification.trade_type,
      entry_price: notification.entry_price,
      author_name: notification.author_name,
      status: notification.status,
      priority_level: notification.priority_level,
      created_at: notification.created_at,
      updated_at: notification.updated_at,
      change_types: notification.change_types || [],
      tp_hits: notification.tp_hits || [],
      version: '2.0',
      timestamp: new Date().toISOString()
    };

    await channel.send({
      type: 'broadcast',
      event: 'signal_notification',
      payload: realtimePayload
    });

    logProfessional('info', 'Realtime notification sent', {
      eventKey,
      signalId: notification.signal_id,
      notificationType: notification.notification_type
    });

    return { success: true };
  } catch (error) {
    logProfessional('error', 'Failed to send realtime notification', { 
      error: error.message,
      eventKey,
      signalId: notification.signal_id 
    });
    return { success: false, error: error.message };
  }
}

async function logNotificationDelivery(
  supabase: any,
  notification: NotificationPayload,
  userId: string,
  channel: string,
  status: 'sent' | 'failed',
  eventKey: string,
  errorMessage?: string
): Promise<void> {
  try {
    await supabase
      .from('notification_delivery_log')
      .insert({
        user_id: userId,
        signal_id: notification.signal_id,
        notification_type: notification.notification_type,
        delivery_channel: channel,
        delivery_status: status,
        event_key: eventKey,
        priority_level: notification.priority_level,
        asset_symbol: notification.asset_name,
        author_id: notification.author_id,
        error_message: errorMessage,
        metadata: {
          trade_type: notification.trade_type,
          entry_price: notification.entry_price,
          notification_version: '2.0',
          change_types: notification.change_types || []
        }
      });
  } catch (error) {
    logProfessional('error', 'Failed to log notification delivery', { 
      error: error.message,
      userId,
      channel,
      status 
    });
  }
}

// ===== MAIN HANDLER =====

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  logProfessional('info', 'Processing notification request', { method: req.method });

  try {
    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Parse request body
    const body = await req.json();
    const notifications: NotificationPayload[] = body.notifications || [];

    if (!Array.isArray(notifications) || notifications.length === 0) {
      logProfessional('warn', 'No notifications provided in request');
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No notifications provided',
          metrics: { processed: 0, sent: 0, failed: 0 }
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    logProfessional('info', `Processing ${notifications.length} notifications`);

    const metrics: DeliveryMetrics = {
      processed: 0,
      sent: 0,
      failed: 0,
      in_app_sent: 0,
      push_sent: 0,
      errors: []
    };

    // Process each notification
    for (const notification of notifications) {
      try {
        metrics.processed++;
        const eventKey = generateEventKey(notification);
        
        logProfessional('info', `Processing notification for signal ${notification.signal_id}`, {
          notificationType: notification.notification_type,
          priorityLevel: notification.priority_level,
          deliveryChannels: notification.delivery_channels
        });

        // Get eligible users
        const eligibleUsers = await getEligibleUsers(supabase, notification.user_ids);
        
        if (eligibleUsers.length === 0) {
          logProfessional('warn', `No eligible users found for signal ${notification.signal_id}`);
          continue;
        }

        // Send in-app realtime notifications
        if (notification.delivery_channels.includes('in_app')) {
          const realtimeResult = await sendRealtimeNotification(supabase, notification, eventKey);
          if (realtimeResult.success) {
            metrics.in_app_sent++;
            metrics.sent++;
          } else {
            metrics.failed++;
            metrics.errors.push(`Realtime failed: ${realtimeResult.error}`);
          }
        }

        // Send push notifications via OneSignal
        if (notification.delivery_channels.includes('push')) {
          const playerIds = eligibleUsers
            .filter(user => user.onesignal_player_id)
            .map(user => user.onesignal_player_id);

          if (playerIds.length > 0) {
            const content = createRichNotificationContent(notification);
            const pushResult = await sendOneSignalNotification(
              playerIds,
              content,
              notification.priority_level
            );

            if (pushResult.success) {
              metrics.push_sent += playerIds.length;
              metrics.sent += playerIds.length;

              // Log successful deliveries
              for (const user of eligibleUsers) {
                await logNotificationDelivery(
                  supabase,
                  notification,
                  user.id,
                  'push',
                  'sent',
                  eventKey
                );
              }
            } else {
              metrics.failed += playerIds.length;
              metrics.errors.push(`Push failed: ${pushResult.error}`);

              // Log failed deliveries
              for (const user of eligibleUsers) {
                await logNotificationDelivery(
                  supabase,
                  notification,
                  user.id,
                  'push',
                  'failed',
                  eventKey,
                  pushResult.error
                );
              }
            }
          } else {
            logProfessional('warn', `No OneSignal player IDs found for signal ${notification.signal_id}`);
          }
        }

      } catch (notificationError) {
        metrics.failed++;
        metrics.errors.push(`Notification ${notification.signal_id}: ${notificationError.message}`);
        logProfessional('error', `Failed to process notification ${notification.signal_id}`, {
          error: notificationError.message
        });
      }
    }

    const processingTime = Date.now() - startTime;
    
    logProfessional('info', 'Notification processing completed', {
      metrics,
      processingTimeMs: processingTime,
      avgTimePerNotification: Math.round(processingTime / notifications.length)
    });

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        processing_time_ms: processingTime,
        notifications_processed: notifications.length
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    
    logProfessional('error', 'Critical error in notification dispatcher', {
      error: error.message,
      stack: error.stack,
      processingTimeMs: processingTime
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error during notification processing',
        processing_time_ms: processingTime
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});