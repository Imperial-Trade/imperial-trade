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

// Helper function to format pips correctly (avoid "PIPS Pips" redundancy)
function formatPips(pips: string | number | undefined, addSign: boolean = true): string {
  if (pips === null || pips === undefined) return '0';
  
  const pipsStr = String(pips);
  
  // If already formatted with "PIPS" suffix, just return it (cleaned up)
  if (pipsStr.toUpperCase().includes('PIPS')) {
    return pipsStr.replace(/\s*PIPS\s*/gi, '').trim();
  }
  
  // Parse as number and format
  const pipsNum = parseFloat(pipsStr.replace(/[^0-9.-]/g, ''));
  if (isNaN(pipsNum)) return '0';
  
  const sign = addSign && pipsNum >= 0 ? '+' : '';
  return `${sign}${pipsNum.toFixed(1)}`;
}

export const NOTIFICATION_TEMPLATES: Record<string, (data: SignalData) => NotificationTemplate> = {
  // Template 1: signal_created (BUY/SELL) - Professional TradingView Style
  signal_created: (data) => ({
    type: 'signal_created',
    title: `${data.trade_type.toUpperCase()} ${data.asset_name} @ ${data.entry_price}`,
    message: `New Signal • ${data.author_name}`,
    badge: 'Signal',
    color: 'blue',
    icon: '📈',
    sound: true,
    priority: 2,
  }),

  // Template 2: pending_limit_created (BUY LIMIT/SELL LIMIT)
  pending_limit_created: (data) => ({
    type: 'pending_limit_created',
    title: `Limit Order: ${data.trade_type.replace('_', ' ').toUpperCase()} ${data.asset_name}`,
    message: `Entry: ${data.entry_price} • ${data.author_name}`,
    badge: 'Pending',
    color: 'yellow',
    icon: '⏳',
    sound: true,
    priority: 2,
  }),

  // Template 3: limit_activated
  limit_activated: (data) => ({
    type: 'limit_activated',
    title: `Limit Activated: ${data.asset_name}`,
    message: `Order triggered at ${data.triggered_price || data.entry_price}`,
    badge: 'Active',
    color: 'blue',
    icon: '⚡',
    sound: true,
    priority: 3,
  }),

  // Template 4: tp_hit (TP1-TP5)
  tp_hit: (data) => ({
    type: 'tp_hit',
    title: `TP${data.tp_number} Hit: ${data.asset_name}`,
    message: `${formatPips(data.pips)} Pips • ${data.triggered_price}`,
    badge: 'Profit',
    color: 'green',
    icon: '💰',
    sound: true,
    priority: 3,
  }),

  // Template 5: stop_loss_hit
  stop_loss_hit: (data) => ({
    type: 'stop_loss_hit',
    title: `Stop Loss Hit: ${data.asset_name}`,
    message: `${formatPips(data.pips, false)} Pips • ${data.triggered_price}`,
    badge: 'Stopped',
    color: 'red',
    icon: '🛑',
    sound: true,
    priority: 3,
  }),

  // Template 6: manual_close
  manual_close: (data) => ({
    type: 'manual_close',
    title: `Closed: ${data.asset_name}`,
    message: `Manual Close • ${data.author_name}`,
    badge: 'Closed',
    color: 'grey',
    icon: '🔒',
    sound: false,
    priority: 1,
  }),

  // Template 7: manual_close_with_tp_hit
  manual_close_with_tp_hit: (data) => ({
    type: 'manual_close_with_tp_hit',
    title: `Closed in Profit: ${data.asset_name}`,
    message: `${formatPips(data.pips)} Pips • Manual Close`,
    badge: 'Profit',
    color: 'grey',
    icon: '💸',
    sound: true,
    priority: 2,
  }),

  // Template 8: all_tps_hit
  all_tps_hit: (data) => ({
    type: 'all_tps_hit',
    title: `All Targets Hit: ${data.asset_name}`,
    message: `Max Profit Reached • ${formatPips(data.pips)} Pips`,
    badge: 'Jackpot',
    color: 'green',
    icon: '🏆',
    sound: true,
    priority: 3,
  }),

  // Template 9: notes_updated
  notes_updated: (data) => ({
    type: 'notes_updated',
    title: `Update: ${data.asset_name}`,
    message: `${data.notes || 'Signal details updated'}`,
    badge: 'Update',
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
          formatted: `${pipsValue >= 0 ? '+' : ''}${pipsValue.toFixed(1)} Pips`,
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
          channel.subscribe((status: string) => {
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
  pushUserIds: any[]
): Promise<{ success: boolean; sent: number; error?: string }> {
  const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
  const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    console.warn('⚠️ OneSignal not configured - skipping push');
    return { success: false, error: 'OneSignal not configured', sent: 0 };
  }

  // ✅ CRITICAL FIX: Extract user IDs from user objects (trigger sends: [{user_id, display_name}])
  const extractedUserIds = Array.isArray(pushUserIds) 
    ? pushUserIds.map((u: any) => typeof u === 'string' ? u : u.user_id).filter(Boolean)
    : [];

  if (extractedUserIds.length === 0) {
    console.log('ℹ️ No push-enabled users for this notification');
    
    // ✅ FIX: Log to analytics even when no users (for dashboard visibility)
    try {
      await supabase.from('notification_analytics').insert({
        signal_id: signalData.id,
        user_id: null, // System-level notification attempt
        notification_type: template.type,
        sent_at: new Date().toISOString(),
        failed_at: new Date().toISOString(),
        failure_reason: 'No push-enabled users available',
      });
    } catch (error) {
      console.warn('Failed to log analytics:', error);
    }
    
    return { success: true, sent: 0 };
  }

  // ✅ MULTI-DEVICE FIX: Fetch ALL active device subscriptions (supports multiple devices per user)
  console.log(`📋 [OneSignal] Fetching Player IDs for ${extractedUserIds.length} users from device_subscriptions`);
  
  const { data: devices, error: deviceError } = await supabase
    .from('device_subscriptions')
    .select('user_id, onesignal_player_id, device_info, platform, is_mobile')
    .in('user_id', extractedUserIds)
    .eq('is_active', true)
    .not('onesignal_player_id', 'is', null);

  if (deviceError) {
    console.error('❌ Failed to fetch device subscriptions:', deviceError);
    return { success: false, error: 'Failed to fetch device subscriptions', sent: 0 };
  }

  if (!devices || devices.length === 0) {
    console.log('ℹ️ No active devices found for push users');
    
    // ✅ FIX: Log to analytics for each user without devices (for dashboard visibility)
    for (const userId of extractedUserIds) {
      try {
        await supabase.from('notification_analytics').insert({
          signal_id: signalData.id,
          user_id: userId,
          notification_type: template.type,
          sent_at: new Date().toISOString(),
          failed_at: new Date().toISOString(),
          failure_reason: 'No active devices - User needs to subscribe via Airbnb modal',
        });
      } catch (error) {
        console.warn('Failed to log analytics:', error);
      }
    }
    
    return { success: true, sent: 0 };
  }

  // Create a map of userId -> array of playerIDs (supports multiple devices per user)
  const userPlayerMap = new Map<string, string[]>();
  devices.forEach((device: any) => {
    if (device.onesignal_player_id) {
      const existing = userPlayerMap.get(device.user_id) || [];
      existing.push(device.onesignal_player_id);
      userPlayerMap.set(device.user_id, existing);
    }
  });

  const totalDevices = devices.length;
  const usersWithDevices = userPlayerMap.size;
  console.log(`📋 [Player IDs] Found ${totalDevices} active devices for ${usersWithDevices} users`, {
    devicesPerUser: Array.from(userPlayerMap.entries()).map(([userId, playerIds]) => ({
      userId: userId.substring(0, 8),
      deviceCount: playerIds.length
    }))
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 🔒 ENFORCE USER PREFERENCES (Rate Limits, Quiet Hours, Type Toggles)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  const filteredUserIds: string[] = [];
  const skipReasons: Record<string, string[]> = {
    user_disabled: [],
    quiet_hours: [],
    rate_limited: []
  };

  for (const userId of extractedUserIds) {
    try {
      // Load user preferences
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      // If no preferences, allow all (default behavior)
      if (!prefs) {
        filteredUserIds.push(userId);
        continue;
      }

      // Check if notification type is enabled
      const typeKey = template.type as keyof typeof prefs;
      if (prefs[typeKey] === false) {
        console.log(`⏭️ User ${userId.substring(0, 8)} disabled ${template.type}`);
        skipReasons.user_disabled.push(userId);
        
        // Log skip reason to analytics
        await supabase.from('notification_analytics').insert({
          signal_id: signalData.id,
          user_id: userId,
          notification_type: template.type,
          sent_at: new Date().toISOString(),
          failed_at: new Date().toISOString(),
          failure_reason: 'User disabled this notification type',
        });
        continue;
      }

      // Check quiet hours
      if (prefs.quiet_hours_enabled && prefs.quiet_hours_start && prefs.quiet_hours_end) {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = currentHour * 60 + currentMinute;

        const [startHour, startMinute] = prefs.quiet_hours_start.split(':').map(Number);
        const [endHour, endMinute] = prefs.quiet_hours_end.split(':').map(Number);
        const startTime = startHour * 60 + startMinute;
        const endTime = endHour * 60 + endMinute;

        let isQuietHours = false;
        if (startTime <= endTime) {
          // Same day quiet hours (e.g., 22:00 - 23:59)
          isQuietHours = currentTime >= startTime && currentTime < endTime;
        } else {
          // Overnight quiet hours (e.g., 22:00 - 07:00)
          isQuietHours = currentTime >= startTime || currentTime < endTime;
        }

        if (isQuietHours) {
          console.log(`🔕 User ${userId.substring(0, 8)} in quiet hours`);
          skipReasons.quiet_hours.push(userId);
          
          // Log skip reason to analytics
          await supabase.from('notification_analytics').insert({
            signal_id: signalData.id,
            user_id: userId,
            notification_type: template.type,
            sent_at: new Date().toISOString(),
            failed_at: new Date().toISOString(),
            failure_reason: 'User in quiet hours',
          });
          continue;
        }
      }

      // Check rate limit (notifications per hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recentNotifs, error: countError } = await supabase
        .from('notification_analytics')
        .select('id')
        .eq('user_id', userId)
        .gte('sent_at', oneHourAgo)
        .is('failed_at', null); // Only count successfully sent

      if (countError) {
        console.warn(`Failed to check rate limit for user ${userId}:`, countError);
        // Allow on error (don't block user)
        filteredUserIds.push(userId);
        continue;
      }

      const maxPerHour = prefs.max_per_hour || 20;
      if (recentNotifs && recentNotifs.length >= maxPerHour) {
        console.log(`🚫 User ${userId.substring(0, 8)} over rate limit (${recentNotifs.length}/${maxPerHour})`);
        skipReasons.rate_limited.push(userId);
        
        // Log skip reason to analytics
        await supabase.from('notification_analytics').insert({
          signal_id: signalData.id,
          user_id: userId,
          notification_type: template.type,
          sent_at: new Date().toISOString(),
          failed_at: new Date().toISOString(),
          failure_reason: `Rate limit exceeded (${recentNotifs.length}/${maxPerHour})`,
        });
        continue;
      }

      // User passed all checks
      filteredUserIds.push(userId);

    } catch (prefError: any) {
      console.warn(`Failed to check preferences for user ${userId}:`, prefError.message);
      // Allow on error (don't block user)
      filteredUserIds.push(userId);
    }
  }

  console.log(`📊 [Preference Enforcement] Original: ${extractedUserIds.length}, Filtered: ${filteredUserIds.length}`, {
    user_disabled: skipReasons.user_disabled.length,
    quiet_hours: skipReasons.quiet_hours.length,
    rate_limited: skipReasons.rate_limited.length
  });

  if (filteredUserIds.length === 0) {
    console.log('ℹ️ All users filtered by preferences');
    
    // Analytics already logged above for each filtered user with reason
    return { success: true, sent: 0 };
  }

  // ✅ MULTI-DEVICE FIX: Get ALL Player IDs for filtered users (supports multiple devices per user)
  const finalPlayerIds: string[] = [];
  filteredUserIds.forEach(userId => {
    const playerIds = userPlayerMap.get(userId);
    if (playerIds && playerIds.length > 0) {
      finalPlayerIds.push(...playerIds); // Add all devices for this user
    }
  });

  if (finalPlayerIds.length === 0) {
    console.log('ℹ️ All users filtered or no Player IDs available (after preference check)');
    
    // ✅ FIX: Log to analytics for users who passed preferences but have no Player ID
    for (const userId of filteredUserIds) {
      const playerIds = userPlayerMap.get(userId);
      if (!playerIds || playerIds.length === 0) {
        try {
          await supabase.from('notification_analytics').insert({
            signal_id: signalData.id,
            user_id: userId,
            notification_type: template.type,
            sent_at: new Date().toISOString(),
            failed_at: new Date().toISOString(),
            failure_reason: 'No Player ID available after preference check',
          });
        } catch (error) {
          console.warn('Failed to log analytics:', error);
        }
      }
    }
    
    return { success: true, sent: 0 };
  }

  try {
    console.log(`📤 [OneSignal] Sending push notification:`, {
      type: template.type,
      asset: signalData.asset_name,
      totalDevices: finalPlayerIds.length,
      uniqueUsers: filteredUserIds.length,
      playerIds: finalPlayerIds.map(id => id.substring(0, 8) + '...'),
      deviceBreakdown: Array.from(userPlayerMap.entries()).map(([userId, playerIds]) => ({
        user: userId.substring(0, 8),
        devices: playerIds.length,
      })),
    });

    // Build OneSignal notification payload (WEB PUSH ONLY)
    const payload = {
      app_id: ONESIGNAL_APP_ID,
      
      // ✅ CRITICAL FIX: Target SPECIFIC Player IDs (not segments)
      include_player_ids: finalPlayerIds,
      
      // Notification content
      headings: { en: template.title },
      contents: { en: template.message },
      
      // Web-specific settings
      url: `https://tradeimperial.com/dashboard/signal-stream?signal=${signalData.id}`,
      chrome_web_icon: 'https://tradeimperial.com/icon-192.png',
      chrome_web_image: signalData.author_avatar_url || undefined,
      
      // iOS Web Push settings (for PWA on iOS)
      ios_badgeType: 'Increase',
      ios_badgeCount: 1,
      ios_sound: template.sound ? 'default' : undefined,
      
      // ❌ REMOVED: Android-specific settings (we're web-only, no native Android app)
      // android_channel_id causes "Could not find android_channel_id" error
      // android_accent_color is for native Android only
      
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
      priority: template.priority >= 3 ? 10 : 5,
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
      
      // 📊 Log failure to analytics for EACH user
      for (const userId of filteredUserIds) {
        try {
          await supabase.from('notification_analytics').insert({
            signal_id: signalData.id,
            user_id: userId,
            notification_type: template.type,
            onesignal_notification_id: result.id || null,
            sent_at: new Date().toISOString(),
            failed_at: new Date().toISOString(),
            failure_reason: result.errors?.[0] || 'OneSignal API failed',
          });
        } catch (analyticsError) {
          console.warn('Failed to log analytics:', analyticsError);
        }
      }
      
      return {
        success: false,
        error: result.errors?.[0] || 'OneSignal API failed',
        sent: 0,
      };
    }

      console.log(`✅ [OneSignal] Push sent successfully:`, {
        id: result.id,
        recipients: result.recipients || finalPlayerIds.length,
      });

      // 📊 Log success to analytics for EACH user
      for (const userId of filteredUserIds) {
      try {
        await supabase.from('notification_analytics').insert({
          signal_id: signalData.id,
          user_id: userId,
          notification_type: template.type,
          onesignal_notification_id: result.id || null,
          sent_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(), // OneSignal confirms delivery immediately
        });
      } catch (analyticsError) {
        console.warn('Failed to log analytics:', analyticsError);
      }
    }

      return {
        success: true,
        sent: result.recipients || filteredUserIds.length,
      };
    } catch (error: any) {
      console.error('❌ [OneSignal] Push notification error:', error);
      
      // 📊 Log exception to analytics for EACH user
      for (const userId of filteredUserIds) {
      try {
        await supabase.from('notification_analytics').insert({
          signal_id: signalData.id,
          user_id: userId,
          notification_type: template.type,
          sent_at: new Date().toISOString(),
          failed_at: new Date().toISOString(),
          failure_reason: error.message || 'Unknown error',
        });
      } catch (analyticsError) {
        console.warn('Failed to log analytics:', analyticsError);
      }
    }
    
    return {
      success: false,
      error: error.message,
      sent: 0,
    };
  }
}


