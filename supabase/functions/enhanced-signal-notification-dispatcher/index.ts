import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
  notification_type: string;
  priority_level: number;
  market_session: string;
  author_name: string;
  delivery_channels: string[];
  user_ids?: string[];
}

interface EnhancedNotificationData {
  title: string;
  message: string;
  data: Record<string, any>;
  priority: number;
  sound: string;
  vibration?: number[];
  actions?: Array<{
    id: string;
    title: string;
    icon?: string;
  }>;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { notifications } = await req.json() as { notifications: NotificationPayload[] };
    
    console.log(`🚀 Enhanced notification dispatcher processing ${notifications.length} notifications`);

    const results = await Promise.all(
      notifications.map(async (notification) => {
        try {
          return await processEnhancedNotification(supabase, notification);
        } catch (error) {
          console.error(`❌ Failed to process notification for signal ${notification.signal_id}:`, error);
          return { success: false, error: error.message, signal_id: notification.signal_id };
        }
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    console.log(`✅ Notification dispatch complete: ${successCount} sent, ${failureCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: {
          total: results.length,
          sent: successCount,
          failed: failureCount
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('💥 Enhanced notification dispatcher error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});

async function processEnhancedNotification(supabase: any, notification: NotificationPayload) {
  const startTime = Date.now();
  
  // Get target users with their preferences
  const targetUsers = notification.user_ids || await getEligibleUsers(supabase, notification);
  
  if (!targetUsers || targetUsers.length === 0) {
    console.log(`⏭️ No eligible users for signal ${notification.signal_id}`);
    return { success: true, sent: 0, signal_id: notification.signal_id };
  }

  // Get user preferences and device info
  const { data: userProfiles } = await supabase
    .from('profiles')
    .select('id, notification_preferences, onesignal_player_id, notification_stats')
    .in('id', targetUsers)
    .eq('account_status', 'active')
    .eq('push_subscription_active', true)
    .not('onesignal_player_id', 'is', null);

  if (!userProfiles || userProfiles.length === 0) {
    console.log(`⏭️ No active users with OneSignal setup for signal ${notification.signal_id}`);
    return { success: true, sent: 0, signal_id: notification.signal_id };
  }

  // Create enhanced notification data
  const enhancedData = createEnhancedNotificationData(notification);
  
  // Send notifications with smart batching
  const oneSignalData = {
    app_id: Deno.env.get('ONESIGNAL_APP_ID'),
    include_player_ids: userProfiles.map(u => u.onesignal_player_id),
    headings: { en: enhancedData.title },
    contents: { en: enhancedData.message },
    data: enhancedData.data,
    priority: enhancedData.priority,
    android_sound: enhancedData.sound,
    ios_sound: `${enhancedData.sound}.wav`,
    android_visibility: 1,
    android_channel_id: getAndroidChannelId(notification.notification_type),
    buttons: enhancedData.actions,
    large_icon: getNotificationIcon(notification.notification_type),
    web_push_topic: `trading_${notification.asset_name.toLowerCase()}`,
    ...(enhancedData.vibration && { android_vibration_pattern: enhancedData.vibration })
  };

  // Send to OneSignal
  const oneSignalResponse = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Deno.env.get('ONESIGNAL_API_KEY')}`,
    },
    body: JSON.stringify(oneSignalData),
  });

  const oneSignalResult = await oneSignalResponse.json();
  const deliveryTime = Date.now() - startTime;

  // Log delivery attempts for each user
  for (const user of userProfiles) {
    await supabase.from('notification_delivery_log').insert({
      user_id: user.id,
      signal_id: notification.signal_id,
      delivery_channel: 'push',
      notification_type: notification.notification_type,
      status: oneSignalResult.id ? 'sent' : 'failed',
      metadata: {
        onesignal_id: oneSignalResult.id,
        delivery_time_ms: deliveryTime,
        priority: notification.priority_level,
        market_session: notification.market_session
      },
      error_message: oneSignalResult.errors ? JSON.stringify(oneSignalResult.errors) : null
    });

    // Update user notification stats
    await updateUserNotificationStats(supabase, user.id, oneSignalResult.id ? 'sent' : 'failed');
  }

  console.log(`📤 Enhanced notification sent to ${userProfiles.length} users for ${notification.asset_name} (${deliveryTime}ms)`);

  return {
    success: !!oneSignalResult.id,
    sent: oneSignalResult.recipients || 0,
    signal_id: notification.signal_id,
    onesignal_id: oneSignalResult.id,
    delivery_time_ms: deliveryTime,
    errors: oneSignalResult.errors
  };
}

function createEnhancedNotificationData(notification: NotificationPayload): EnhancedNotificationData {
  const isHighPriority = notification.priority_level >= 2;
  const isCritical = notification.notification_type.includes('stop_loss') || notification.priority_level >= 3;
  
  let title: string;
  let message: string;
  let sound: string;
  let vibration: number[] | undefined;
  let actions: Array<{ id: string; title: string; icon?: string }> | undefined;

  // Create contextual title and message
  switch (notification.notification_type) {
    case 'signal_created':
      title = `🎯 New ${notification.trade_type.toUpperCase()} Signal`;
      message = `${notification.asset_name} @ $${notification.entry_price} by ${notification.author_name}`;
      sound = 'signal_alert';
      actions = [
        { id: 'view_signal', title: 'View Signal', icon: 'chart' },
        { id: 'mute_asset', title: 'Mute Asset', icon: 'volume_off' }
      ];
      break;
      
    case 'tp_hit':
      title = `💰 Take Profit Hit!`;
      message = `${notification.asset_name} TP reached - Great trade!`;
      sound = 'success_ding';
      vibration = [200, 100, 200];
      actions = [
        { id: 'view_performance', title: 'View P&L', icon: 'trending_up' },
        { id: 'share_win', title: 'Share', icon: 'share' }
      ];
      break;
      
    case 'stop_loss':
      title = `⚠️ Stop Loss Triggered`;
      message = `${notification.asset_name} stopped out - Risk managed`;
      sound = 'warning_tone';
      vibration = [300, 200, 300, 200, 300];
      actions = [
        { id: 'view_analysis', title: 'View Analysis', icon: 'analytics' },
        { id: 'adjust_strategy', title: 'Adjust Strategy', icon: 'tune' }
      ];
      break;
      
    case 'price_alert':
      title = `📊 Price Alert`;
      message = `${notification.asset_name} reached target level`;
      sound = 'price_alert';
      actions = [
        { id: 'view_chart', title: 'View Chart', icon: 'show_chart' },
        { id: 'create_order', title: 'Trade Now', icon: 'add_circle' }
      ];
      break;
      
    default:
      title = `📢 ${notification.asset_name} Update`;
      message = `Signal updated by ${notification.author_name}`;
      sound = 'update_chime';
  }

  return {
    title,
    message,
    priority: isCritical ? 10 : isHighPriority ? 7 : 5,
    sound,
    vibration,
    actions,
    data: {
      signal_id: notification.signal_id,
      asset_name: notification.asset_name,
      notification_type: notification.notification_type,
      priority_level: notification.priority_level,
      market_session: notification.market_session,
      trade_type: notification.trade_type,
      entry_price: notification.entry_price.toString(),
      author_name: notification.author_name,
      timestamp: new Date().toISOString(),
      deep_link: `imperial://signal/${notification.signal_id}`
    }
  };
}

function getAndroidChannelId(notificationType: string): string {
  switch (notificationType) {
    case 'stop_loss':
    case 'margin_call':
      return 'critical_alerts';
    case 'signal_created':
    case 'tp_hit':
      return 'trading_signals';
    case 'price_alert':
      return 'price_alerts';
    default:
      return 'general_trading';
  }
}

function getNotificationIcon(notificationType: string): string {
  const baseUrl = 'https://kmuoqkcxguafxulqlbmi.supabase.co/storage/v1/object/public/imperial-trade-bucket/icons';
  
  switch (notificationType) {
    case 'signal_created':
      return `${baseUrl}/signal-icon.png`;
    case 'tp_hit':
      return `${baseUrl}/success-icon.png`;
    case 'stop_loss':
      return `${baseUrl}/warning-icon.png`;
    case 'price_alert':
      return `${baseUrl}/price-icon.png`;
    default:
      return `${baseUrl}/default-icon.png`;
  }
}

async function getEligibleUsers(supabase: any, notification: NotificationPayload): Promise<string[]> {
  const { data: users } = await supabase
    .from('profiles')
    .select('id, notification_preferences')
    .eq('account_status', 'active')
    .eq('push_subscription_active', true)
    .not('onesignal_player_id', 'is', null);

  if (!users) return [];

  return users
    .filter(user => {
      const prefs = user.notification_preferences;
      if (!prefs) return true; // Default to enabled
      
      // Check if notification type is enabled
      const tradingPrefs = prefs.trading?.[notification.notification_type];
      if (tradingPrefs && !tradingPrefs.enabled) return false;
      
      // Check quiet hours
      if (prefs.schedule?.quiet_hours?.enabled) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const { start, end } = prefs.schedule.quiet_hours;
        
        if (start < end) {
          if (currentTime >= start && currentTime <= end) return false;
        } else {
          if (currentTime >= start || currentTime <= end) return false;
        }
      }
      
      // Check market hours preference
      if (prefs.schedule?.market_hours_only && notification.market_session === 'Market Close') {
        return false;
      }
      
      return true;
    })
    .map(user => user.id);
}

async function updateUserNotificationStats(supabase: any, userId: string, status: 'sent' | 'failed') {
  const { data: user } = await supabase
    .from('profiles')
    .select('notification_stats')
    .eq('id', userId)
    .single();

  if (user) {
    const stats = user.notification_stats || {};
    const newStats = {
      ...stats,
      total_sent: (stats.total_sent || 0) + 1,
      total_delivered: status === 'sent' ? (stats.total_delivered || 0) + 1 : (stats.total_delivered || 0),
      last_notification_at: new Date().toISOString(),
      engagement_score: calculateEngagementScore(stats, status)
    };

    await supabase
      .from('profiles')
      .update({ notification_stats: newStats })
      .eq('id', userId);
  }
}

function calculateEngagementScore(stats: any, status: string): number {
  const totalSent = (stats.total_sent || 0) + 1;
  const totalDelivered = status === 'sent' ? (stats.total_delivered || 0) + 1 : (stats.total_delivered || 0);
  const totalOpened = stats.total_opened || 0;
  
  const deliveryRate = totalSent > 0 ? totalDelivered / totalSent : 0;
  const openRate = totalDelivered > 0 ? totalOpened / totalDelivered : 0;
  
  return Math.round((deliveryRate * 0.3 + openRate * 0.7) * 100);
}