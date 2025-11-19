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
  notes?: string | null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 NOTIFICATION TEMPLATES (Based on User's 9 Templates)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const NOTIFICATION_TEMPLATES: Record<string, (data: SignalData) => NotificationTemplate> = {
  // Template 1: signal_created (BUY/SELL) - Blue
  signal_created: (data) => ({
    type: 'signal_created',
    title: `🚀 ${data.author_name} - New ${data.trade_type.toUpperCase()} Signal`,
    message: `${data.author_name} posted a new ${data.trade_type.toUpperCase()} signal on ${data.asset_name} at $${data.entry_price}`,
    badge: '🚀 New BUY/SELL Signal',
    color: 'blue',
    icon: '🚀',
    sound: true,
    priority: 2,
  }),

  // Template 2: pending_limit_created (BUY LIMIT/SELL LIMIT) - Yellow
  pending_limit_created: (data) => ({
    type: 'pending_limit_created',
    title: `⏳ ${data.author_name} - Pending ${data.trade_type.replace('_', ' ').toUpperCase()}`,
    message: `Waiting to reach ${data.asset_name} at $${data.entry_price}`,
    badge: '⏳ Pending BUY/SELL Limit',
    color: 'yellow',
    icon: '⏳',
    sound: true,
    priority: 2,
  }),

  // Template 3: limit_activated - Blue
  limit_activated: (data) => ({
    type: 'limit_activated',
    title: `✅ ${data.author_name} - ${data.trade_type.replace('_limit', '').toUpperCase()} Limit Activated`,
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
    title: `💰 ${data.author_name} - TP${data.tp_number} Hit`,
    message: `${data.asset_name} hit Take Profit ${data.tp_number} at $${data.triggered_price}\n${data.pips || '+0.0 PIPS'}`,
    badge: '🎯 Take Profit Hit',
    color: 'green',
    icon: '🎯',
    sound: true,
    priority: 3,
  }),

  // Template 5: stop_loss_hit - Red
  stop_loss_hit: (data) => ({
    type: 'stop_loss_hit',
    title: `⚠️ ${data.author_name} - Stop Loss Hit`,
    message: `${data.asset_name} hit Stop Loss at $${data.triggered_price}\n${data.pips || '-0.0 PIPS'}`,
    badge: '🛑 Stop Loss Hit',
    color: 'red',
    icon: '🛑',
    sound: true,
    priority: 3,
  }),

  // Template 6: manual_close - Grey
  manual_close: (data) => ({
    type: 'manual_close',
    title: `🔒 ${data.author_name} - Signal Closed`,
    message: `${data.asset_name} manually closed${data.pips ? `\n${data.pips}` : ''}`,
    badge: '🔒 Manually Closed',
    color: 'grey',
    icon: '🔒',
    sound: false,
    priority: 1,
  }),

  // Template 7: manual_close_with_tp_hit - Grey
  manual_close_with_tp_hit: (data) => ({
    type: 'manual_close_with_tp_hit',
    title: `✅ ${data.author_name} - Signal Closed in Profit`,
    message: `${data.asset_name} closed in profit at $${data.triggered_price || data.entry_price}\n${data.pips || '+0.0 PIPS'} 🎉`,
    badge: '💰 Closed in Profits',
    color: 'grey',
    icon: '💰',
    sound: true,
    priority: 2,
  }),

  // Template 8: all_tps_hit - Green (COMBINED: Shows final TP + completion)
  all_tps_hit: (data) => ({
    type: 'all_tps_hit',
    title: `🎉 ${data.author_name} - ALL TPs HIT`,
    message: `${data.asset_name} hit Final TP${data.tp_number} at $${data.triggered_price}\n${data.pips || '+0.0 PIPS'} 🏆 ALL PROFITS SECURED`,
    badge: '🎉 ALL TPs HIT',
    color: 'green',
    icon: '🎉',
    sound: true,
    priority: 3,
  }),

  // Template 9: notes_updated - Yellow
  notes_updated: (data) => ({
    type: 'notes_updated',
    title: `📝 ${data.author_name} - Notes Updated`,
    message: `${data.author_name} updated notes for ${data.asset_name}: ${data.notes || 'See signal details'}`,
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
    // ✅ FIX: Handle pips as both number (from trigger) and string (legacy format)
    // Database trigger sends: { pips: 10 }
    // Legacy format might send: { pips: "+10.0 PIPS" }
    const pipsValue = typeof signalData.pips === 'number'
      ? signalData.pips
      : signalData.pips 
        ? parseFloat(String(signalData.pips).replace(/[^0-9.-]/g, ''))
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
        notes: signalData.notes,
        
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
    
    // Subscribe with timeout to prevent hanging
    try {
      await Promise.race([
        new Promise((resolve) => {
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ [Realtime] Channel subscribed successfully');
              resolve(true);
            }
          });
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Subscription timeout after 5s')), 5000)
        )
      ]);
    } catch (err: any) {
      console.error('❌ [Realtime] Subscription failed:', err.message);
      // Continue anyway - push notifications still work
    }

    // Now broadcast
    const broadcastResult = await channel.send({
      type: 'broadcast',
      event: 'signal_notification',
      payload,
    });
    
    console.log(`📡 [Realtime] Broadcast result:`, {
      status: broadcastResult?.status || 'undefined',
      type: template.type,
      signal_id: signalData.id.substring(0, 8)
    });
    
    // Clean up: unsubscribe after sending
    await channel.unsubscribe();

    // ✅ FIX: Treat 'ok' OR undefined status as success (Supabase Realtime API behavior)
    if (broadcastResult.status === 'ok' || !broadcastResult.status) {
      console.log(`✅ [Realtime Broadcast] SUCCESS:`, {
        status: broadcastResult.status || 'sent',
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
      // Only log error if status is explicitly an error (not ok, not undefined)
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
// 📱 PUSH NOTIFICATION (OneSignal - All Platforms)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function sendPushNotification(
  supabase: any,
  template: NotificationTemplate,
  signalData: SignalData,
  pushUserIds: string[]
): Promise<{ success: boolean; sent: number; error?: string }> {
  const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
  const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.warn('⚠️ OneSignal not configured - skipping push');
    return { success: false, error: 'OneSignal not configured', sent: 0 };
  }

  if (pushUserIds.length === 0) {
    console.log('ℹ️ No push-enabled users for this notification');
    return { success: true, sent: 0 };
  }

  try {
    console.log(`📤 [OneSignal] Sending push notification:`, {
      type: template.type,
      asset: signalData.asset_name,
      recipients: pushUserIds.length,
    });

    // Build OneSignal notification payload
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      
      // Send to all subscribed users
      included_segments: ['Subscribed Users'],
      
      // Notification content
      headings: { en: template.title },
      contents: { en: template.message },
      
      // Web-specific settings
      url: `https://tradeimperial.com/dashboard/signal-stream?signal=${signalData.id}`,
      chrome_web_icon: 'https://tradeimperial.com/icon-192.png',
      chrome_web_image: signalData.author_avatar_url || undefined,
      
      // iOS-specific settings
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      ios_sound: template.sound ? 'default' : undefined,
      
      // Android-specific settings
      android_channel_id: template.priority >= 3 ? 'high_priority' : 'default',
      priority: template.priority >= 3 ? 10 : 5,
      
      // Custom data payload
      data: {
        signal_id: signalData.id,
        type: template.type,
        asset_name: signalData.asset_name,
        entry_price: signalData.entry_price,
        trade_type: signalData.trade_type,
        author_name: signalData.author_name,
        pips: signalData.pips,
        tp_number: signalData.tp_number,
      },
      
      // Display settings
      ttl: 86400, // 24 hours
      android_accent_color: template.color === 'blue' ? '0000FF' : 
                           template.color === 'green' ? '00FF00' :
                           template.color === 'red' ? 'FF0000' :
                           template.color === 'yellow' ? 'FFFF00' : '808080',
    };

    // Send to OneSignal API
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
      console.error('❌ [OneSignal] API error:', result);
      return {
        success: false,
        error: result.errors?.[0] || 'OneSignal API failed',
        sent: 0,
      };
    }

    console.log(`✅ [OneSignal] Push sent successfully:`, {
      id: result.id,
      recipients: result.recipients || 0,
    });

    return {
      success: true,
      sent: result.recipients || pushUserIds.length,
    };
  } catch (error: any) {
    console.error('❌ [OneSignal] Push notification error:', error);
    return {
      success: false,
      error: error.message,
      sent: 0,
    };
  }
}


