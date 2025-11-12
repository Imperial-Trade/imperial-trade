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
  tp_hits?: number[]; // Array of hit TPs [1, 2, 3, ...]
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
    message: `TP ${data.tp_number} HIT on ${data.asset_name} at $${data.triggered_price} | ${data.pips || '+0.0 PIPS'}`,
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
    message: `Final TP ${data.tp_number} HIT on ${data.asset_name} at $${data.triggered_price} | ${data.pips || '+0.0 PIPS'} | 🎉 ALL PROFITS SECURED`,
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
  userIds: any[]
): Promise<{ success: boolean; error?: string }> {
  try {
    // Extract user IDs from user objects (trigger sends: [{user_id}])
    const extractedUserIds = Array.isArray(userIds)
      ? userIds.map((u: any) => typeof u === 'string' ? u : u.user_id).filter(Boolean)
      : [];

    if (extractedUserIds.length === 0) {
      console.log('ℹ️ No user IDs provided for realtime notification');
      return { success: true };
    }
    // Parse PIPS value from string (e.g. "+200.0 PIPS" -> 200.0)
    const pipsValue = signalData.pips 
      ? parseFloat(signalData.pips.replace(/[^0-9.-]/g, '')) 
      : 0;

    // Calculate total TPs from tp1-tp5
    const totalTps = [
      signalData.tp1,
      signalData.tp2,
      signalData.tp3,
      signalData.tp4,
      signalData.tp5
    ].filter(tp => tp !== null && tp !== undefined).length;

    // Calculate Stop Loss PIPS (risk) for percentage calculation
    let stopLossPips = 0;
    if (signalData.stop_loss && signalData.entry_price) {
      const isBuy = signalData.trade_type === 'buy' || signalData.trade_type === 'buy_limit';
      
      // Determine pip size based on asset
      const pipSize = signalData.tradermade_symbol?.includes('JPY') ? 0.01 :
                     signalData.tradermade_symbol?.includes('XAU') || signalData.tradermade_symbol?.includes('GOLD') ? 0.1 :
                     signalData.tradermade_symbol?.includes('BTC') ? 1.0 :
                     signalData.tradermade_symbol?.includes('US30') || signalData.tradermade_symbol?.includes('US100') ? 1.0 :
                     0.0001;
      
      if (isBuy) {
        // BUY: SL is below entry (negative distance)
        stopLossPips = Math.abs((signalData.stop_loss - signalData.entry_price) / pipSize);
      } else {
        // SELL: SL is above entry (negative distance)
        stopLossPips = Math.abs((signalData.entry_price - signalData.stop_loss) / pipSize);
      }
    }

    // Calculate percentage as Risk/Reward ratio
    // If TP is 50 PIPS and SL is 50 PIPS → 100% (1:1 ratio)
    // If TP is 100 PIPS and SL is 50 PIPS → 200% (2:1 ratio)
    const shouldShowPercentage = template.type === 'tp_hit' && stopLossPips > 0;
    const percentage = shouldShowPercentage
      ? Math.round((Math.abs(pipsValue) / stopLossPips) * 100)
      : undefined;

    // Build payload with correct structure for ModernNotificationSystem UI
    const payload = {
      // Spread template fields (title, message, type, badge, color, icon, sound, priority)
      ...template,
      
      // Metadata object (expected by UI)
      metadata: {
        signal_id: signalData.id,
        provider_name: signalData.author_name,
        provider_avatar_url: signalData.author_avatar_url,
        provider_type: signalData.author_user_type as 'educator' | 'admin' | 'moderator' | 'member',
        asset_name: signalData.asset_name,
        
        // Convert pips string to pips_data object with Risk/Reward ratio
        pips_data: {
          value: pipsValue,
          formatted: signalData.pips || '+0.0 PIPS',
          direction: pipsValue >= 0 ? 'profit' as const : 'loss' as const,
          percentage
        },
        
        // TP progress data
        tp_hits: signalData.tp_hits || [],
        total_tps: totalTps,
        progress_percentage: template.type === 'tp_hit' && totalTps > 0 
          ? ((signalData.tp_hits?.length || 0) / totalTps) * 100 
          : undefined,
      },
      
      // Flat fields for backwards compatibility and other consumers
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
      
      // Standard notification fields
      timestamp: new Date().toISOString(),
      event_key: `signal_${signalData.id}_${template.type}_${Date.now()}`,
      notification_type: template.type,
      user_ids: extractedUserIds,
    };

    // Broadcast via Supabase Realtime
    console.log('📤 [Realtime Broadcast] Attempting to send...', {
      channel: 'instant-alerts',
      event: 'signal_notification',
      type: template.type,
      signal_id: signalData.id.substring(0, 8),
      payload_size: JSON.stringify(payload).length
    });

    // Create and subscribe to channel first
    const channel = supabase.channel('instant-alerts');
    
    // Subscribe to the channel before broadcasting
    await new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve(true);
        }
      });
    });

    // Now broadcast
    const broadcastResult = await channel.send({
      type: 'broadcast',
      event: 'signal_notification',
      payload,
    });
    
    // Clean up: unsubscribe after sending
    await channel.unsubscribe();

    if (broadcastResult.status === 'ok') {
      console.log(`✅ [Realtime Broadcast] SUCCESS:`, {
        type: template.type,
        asset: signalData.asset_name,
        recipients: extractedUserIds.length,
        metadata: {
          provider: signalData.author_name,
          pips: signalData.pips,
          tp_progress: `${signalData.tp_hits?.length || 0}/${totalTps}`
        }
      });
    } else {
      console.error(`❌ [Realtime Broadcast] FAILED:`, {
        status: broadcastResult.status,
        type: template.type,
        signal_id: signalData.id.substring(0, 8)
      });
    }

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
    // Extract user IDs from push user objects (trigger sends: [{user_id, player_id, display_name}])
    const userIds = Array.isArray(pushUserIds) 
      ? pushUserIds.map((u: any) => typeof u === 'string' ? u : u.user_id).filter(Boolean)
      : [];

    if (userIds.length === 0) {
      console.log('ℹ️ No push user IDs provided');
      return { success: true, sent: 0 };
    }

    // Get OneSignal player IDs for these users
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('onesignal_player_id')
      .in('id', userIds)
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


