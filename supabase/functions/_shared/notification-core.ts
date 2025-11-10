// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔔 NOTIFICATION CORE LIBRARY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Shared notification templates and delivery functions
// Used by all notification Edge Functions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface NotificationTemplate {
  type: string;
  title: string;
  message: string;
  badge: string;
  color: 'blue' | 'yellow' | 'green' | 'red' | 'grey';
  icon: string;
  sound: boolean;
  priority: number;
}

export interface SignalData {
  id: string;
  user_id: string;
  asset_name: string;
  trade_type: string;
  entry_price: number;
  triggered_price?: number;
  stop_loss?: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  author_name: string;
  author_avatar_url?: string;
  author_user_type?: string;
  pips?: string;
  tp_number?: number;
  tradermade_symbol?: string;
  status?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 NOTIFICATION TEMPLATES (Based on User's 9 Templates)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const NOTIFICATION_TEMPLATES: Record<string, (data: SignalData) => NotificationTemplate> = {
  // Template 1: signal_created (BUY/SELL) - Blue
  signal_created: (data) => ({
    type: 'signal_created',
    title: `${data.author_name} (🚀 New ${data.trade_type.toUpperCase()} Signal)`,
    message: `${data.trade_type.toUpperCase()} Signal is Posted on ${data.asset_name} at $${data.entry_price}`,
    badge: '🚀 New BUY/SELL Signal',
    color: 'blue',
    icon: '🚀',
    sound: true,
    priority: 2,
  }),

  // Template 2: pending_limit_created (BUY LIMIT/SELL LIMIT) - Yellow
  pending_limit_created: (data) => ({
    type: 'pending_limit_created',
    title: `${data.author_name} (⏳ Pending ${data.trade_type.replace('_', ' ').toUpperCase()})`,
    message: `Waiting to reached ${data.asset_name} at $${data.entry_price}`,
    badge: '⏳ Pending BUY/SELL Limit',
    color: 'yellow',
    icon: '⏳',
    sound: true,
    priority: 2,
  }),

  // Template 3: limit_activated - Blue
  limit_activated: (data) => ({
    type: 'limit_activated',
    title: `${data.author_name} (✅ ${data.trade_type.replace('_limit', '').toUpperCase()} Limit Activated)`,
    message: `${data.trade_type.replace('_', ' ').toUpperCase()} is activated on ${data.asset_name} at $${data.triggered_price || data.entry_price}`,
    badge: '✅ BUY/SELL Activated',
    color: 'blue',
    icon: '✅',
    sound: true,
    priority: 3,
  }),

  // Template 4: tp_hit (TP1-TP5) - Green
  tp_hit: (data) => ({
    type: 'tp_hit',
    title: `${data.author_name} (🎯 Take Profit Hit)`,
    message: `TP (${data.tp_number}) HIT on ${data.asset_name} at $${data.triggered_price} | ${data.pips || '+0.0 PIPS'}`,
    badge: '🎯 Take Profit Hit',
    color: 'green',
    icon: '🎯',
    sound: true,
    priority: 3,
  }),

  // Template 5: stop_loss_hit - Red
  stop_loss_hit: (data) => ({
    type: 'stop_loss_hit',
    title: `${data.author_name} (🛑 Stop Loss Hit)`,
    message: `SL HIT on ${data.asset_name} at $${data.triggered_price} | ${data.pips || '-0.0 PIPS'}`,
    badge: '🛑 Stop Loss Hit',
    color: 'red',
    icon: '🛑',
    sound: true,
    priority: 3,
  }),

  // Template 6: manual_close - Grey
  manual_close: (data) => ({
    type: 'manual_close',
    title: `${data.author_name} (🔒 Manually Closed)`,
    message: `manually closed ${data.asset_name}`,
    badge: '🔒 Manually Closed',
    color: 'grey',
    icon: '🔒',
    sound: false,
    priority: 1,
  }),

  // Template 7: manual_close_with_tp_hit - Grey
  manual_close_with_tp_hit: (data) => ({
    type: 'manual_close_with_tp_hit',
    title: `${data.author_name} (💰 Closed in Profits)`,
    message: `Secured Profits on ${data.asset_name} | ${data.pips || '+0.0 PIPS'}`,
    badge: '💰 Closed in Profits',
    color: 'grey',
    icon: '💰',
    sound: true,
    priority: 2,
  }),

  // Template 8: all_tps_hit - Green (COMBINED: Shows final TP + completion)
  all_tps_hit: (data) => ({
    type: 'all_tps_hit',
    title: `${data.author_name} (🎉 ALL TPs HIT)`,
    message: `Final TP (${data.tp_number}) HIT on ${data.asset_name} at $${data.triggered_price} | ${data.pips || '+0.0 PIPS'} | 🎉 ALL PROFITS SECURED`,
    badge: '🎉 ALL TPs HIT',
    color: 'green',
    icon: '🎉',
    sound: true,
    priority: 3,
  }),

  // Template 9: notes_updated - Yellow
  notes_updated: (data) => ({
    type: 'notes_updated',
    title: `${data.author_name} (📝 Notes Updated)`,
    message: `${data.author_name} updated notes for ${data.asset_name}`,
    badge: '📝 Notes Updated',
    color: 'yellow',
    icon: '📝',
    sound: false,
    priority: 1,
  }),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 REALTIME NOTIFICATION (INSTANT - In-App)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function sendRealtimeNotification(
  supabase: any,
  template: NotificationTemplate,
  signalData: SignalData,
  userIds: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      ...template,
      signal_id: signalData.id,
      asset_name: signalData.asset_name,
      entry_price: signalData.entry_price,
      triggered_price: signalData.triggered_price,
      trade_type: signalData.trade_type,
      author_id: signalData.user_id,
      author_name: signalData.author_name,
      author_avatar_url: signalData.author_avatar_url,
      author_user_type: signalData.author_user_type,
      pips: signalData.pips,
      tp_number: signalData.tp_number,
      timestamp: new Date().toISOString(),
      event_key: `signal_${signalData.id}_${template.type}_${Date.now()}`,
      notification_type: template.type,
      user_ids: userIds,
    };

    // Broadcast via Supabase Realtime
    const channel = supabase.channel('instant-alerts');
    await channel.send({
      type: 'broadcast',
      event: 'signal_notification',
      payload,
    });

    console.log(`✅ Realtime notification sent:`, {
      type: template.type,
      asset: signalData.asset_name,
      recipients: userIds.length,
    });

    return { success: true };
  } catch (error: any) {
    console.error('❌ Realtime notification failed:', error);
    return { success: false, error: error.message };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📱 PUSH NOTIFICATION (OneSignal - Mobile/Desktop)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function sendPushNotification(
  supabase: any,
  template: NotificationTemplate,
  signalData: SignalData,
  pushUserIds: string[]
): Promise<{ success: boolean; sent: number; error?: string }> {
  const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
  const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');

  if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
    console.warn('⚠️ OneSignal not configured - skipping push');
    return { success: false, error: 'OneSignal not configured', sent: 0 };
  }

  if (pushUserIds.length === 0) {
    console.log('ℹ️ No push-enabled users for this notification');
    return { success: true, sent: 0 };
  }

  try {
    // Get OneSignal player IDs for these users
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('onesignal_player_id')
      .in('id', pushUserIds)
      .eq('push_subscription_active', true)
      .not('onesignal_player_id', 'is', null);

    if (error || !profiles || profiles.length === 0) {
      console.log('ℹ️ No valid OneSignal player IDs found');
      return { success: true, sent: 0 };
    }

    const playerIds = profiles
      .map((p: any) => p.onesignal_player_id)
      .filter((id: string) => id && id !== 'dev_mock_player_id');

    if (playerIds.length === 0) {
      return { success: true, sent: 0 };
    }

    // Build OneSignal payload
    const androidColor = template.color === 'green' ? 'FF10B981' :
                        template.color === 'red' ? 'FFEF4444' :
                        template.color === 'blue' ? 'FF3B82F6' :
                        template.color === 'yellow' ? 'FFF59E0B' : 'FF6B7280';

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: template.title },
      contents: { en: template.message },
      data: {
        signal_id: signalData.id,
        type: template.type,
        asset_name: signalData.asset_name,
        deep_link: `/dashboard/signal-stream?signal=${signalData.id}`,
      },
      web_url: `https://tradeimperial.com/dashboard/signal-stream?signal=${signalData.id}`,
      chrome_web_icon: 'https://tradeimperial.com/icon-192.png',
      chrome_web_badge: 'https://tradeimperial.com/badge-icon.png',
      web_buttons: [{
        id: 'view-signal',
        text: 'View Signal →',
        url: `/dashboard/signal-stream?signal=${signalData.id}`,
      }],
      android_accent_color: androidColor,
      android_sound: template.sound ? 'trading_alert' : undefined,
      android_group: 'trading_signals',
      ios_sound: template.sound ? 'trading_alert.wav' : undefined,
      priority: template.priority,
      ttl: 3600,
      collapse_id: `signal_${signalData.id}_${template.type}`,
      mutable_content: true,
      content_available: true,
    };

    console.log(`📤 Sending push to ${playerIds.length} devices:`, {
      type: template.type,
      asset: signalData.asset_name,
    });

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ OneSignal API error:', result);
      return {
        success: false,
        error: result.errors?.[0]?.message || 'OneSignal API failed',
        sent: 0,
      };
    }

    console.log(`✅ Push sent successfully:`, {
      recipients: result.recipients,
      id: result.id,
    });

    return {
      success: true,
      sent: result.recipients || 0,
    };
  } catch (error: any) {
    console.error('❌ Push notification error:', error);
    return {
      success: false,
      error: error.message,
      sent: 0,
    };
  }
}


