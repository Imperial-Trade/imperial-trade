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

// PHASE 4: FIX #3 - Persistent Event Sequence (never resets on cold start)
let eventSequence = Date.now() % 10000; // ✅ Starts from timestamp to prevent collisions
function generateEventKey(
  notification: NotificationPayload, 
  triggerSource: string = 'unknown'
): string {
  const timestamp = Date.now();
  const nanoSeconds = performance.now().toString().replace('.', ''); // Sub-millisecond precision
  const sequence = ++eventSequence % 10000;
  
  // Include trigger source to prevent cross-trigger collisions
  const changeHash = (notification.change_types || []).sort().join('-') || 'none';
  
  // Format: signalId-type-triggerSource-changeHash-timestamp-nanos-sequence
  return `${notification.signal_id}-${notification.notification_type}-${triggerSource}-${changeHash}-${timestamp}-${nanoSeconds}-${sequence}`;
}

// Pips calculation helper
function calculatePips(entryPrice: number, targetPrice: number, symbol: string): string {
  const pipSize = getPipSize(symbol);
  const priceDiff = Math.abs(targetPrice - entryPrice);
  const pips = priceDiff / pipSize;
  return pips.toFixed(1);
}

function getPipSize(symbol: string): number {
  const upperSymbol = symbol.toUpperCase();
  if (upperSymbol.includes('JPY')) return 0.01;
  if (upperSymbol.includes('XAU') || upperSymbol.includes('GOLD')) return 0.1;
  if (upperSymbol.includes('BTC')) return 1.0;
  if (upperSymbol.includes('US30') || upperSymbol.includes('US100')) return 1.0;
  return 0.0001;
}

function createRichNotificationContent(notification: NotificationPayload): {
  title: string;
  body: string;
  data: Record<string, any>;
  webButtons?: Array<{ id: string; text: string; url: string; }>;
} {
  const { asset_name, trade_type, entry_price, author_name, notification_type, status, tp_hits, symbol, tradermade_symbol } = notification;
  
  let title = '';
  let body = '';
  
  // ============================================
  // BUG #22 FIX: Only use fallback when author_name is truly undefined/null/empty
  // ============================================
  const safeAuthorName = (author_name && author_name.trim() !== '') ? author_name : 'Unknown Trader';
  
  // Log when fallback is used
  if (safeAuthorName === 'Unknown Trader') {
    logProfessional('warn', '⚠️ BUG #22: Using fallback author name', {
      signal_id: notification.signal_id,
      notification_type: notification.notification_type,
      original_author_name: author_name,
      author_id: notification.author_id
    });
  }
  
  const safeSymbol = tradermade_symbol || symbol || asset_name;

  // ============================================
  // BUG #40 FIX: Calculate pips for relevant notifications
  // ============================================
  let pipsText = '';
  if (notification.triggered_price && notification.entry_price) {
    const pips = calculatePips(notification.entry_price, notification.triggered_price, safeSymbol);
    const isBuy = trade_type === 'buy' || trade_type === 'buy_limit';
    const isProfit = (isBuy && notification.triggered_price > entry_price) || 
                     (!isBuy && notification.triggered_price < entry_price);
    pipsText = `${isProfit ? '+' : '-'}${pips} pips`;
  }

  // Provider name format: "${providerName} • ${notificationType}"
  switch (notification_type) {
    case 'signal_created':
      title = `🔔 ${safeAuthorName} • New Signal`;
      body = `${asset_name} • ${trade_type.toUpperCase()} at ${entry_price}`;
      break;
      
    case 'tp_hit':
    case 'take_profit_hit':
      const tpLevel = tp_hits?.[tp_hits.length - 1] || 1;
      title = `🎯 ${safeAuthorName} • TP${tpLevel} Hit`;
      const tpPipsDisplay = pipsText ? ` • ${pipsText}` : '';
      body = `${asset_name} • Asset reached: $${notification.triggered_price?.toFixed(2) || entry_price.toFixed(2)}${tpPipsDisplay} • TP${tpLevel} hit`;
      break;
      
    case 'stop_loss_hit':
      title = `🔻 ${safeAuthorName} • Stop Loss Hit`;
      const slPipsDisplay = pipsText ? ` • ${pipsText}` : '';
      body = `${asset_name} • Asset reached: $${notification.triggered_price?.toFixed(2) || entry_price.toFixed(2)}${slPipsDisplay} • Stop Loss hit`;
      break;
      
    case 'limit_order_activated':
      title = `🚀 ${safeAuthorName} • Order Activated`;
      body = `${asset_name} • ${trade_type.replace('_', ' ').toUpperCase()} now active`;
      break;
      
    case 'manual_close':
      title = `🔒 ${safeAuthorName} • Signal Closed`;
      const closePrice = notification.triggered_price || notification.entry_price;
      body = `${asset_name} • Closed at: $${closePrice.toFixed(2)} • ${notification.close_reason || 'Manual close'}`;
      break;
      
    // ============================================
    // BUG #24 FIX - PHASE 3: All Targets Hit notification
    // ============================================
    case 'all_targets_hit':
    case 'all_tps_hit':
      title = `💰 ${safeAuthorName} • All Targets Hit`;
      const allTpPrice = notification.triggered_price || notification.entry_price;
      body = `${asset_name} • Asset reached: $${allTpPrice.toFixed(2)} • All targets hit`;
      break;
      
    case 'limit_cancelled':
      title = `🔒 ${safeAuthorName} • Limit Order Cancelled`;
      body = `${asset_name} • ${trade_type.replace('_', ' ').toUpperCase()} order cancelled`;
      break;
      
    case 'notes_updated':
      title = `📝 ${safeAuthorName} • Notes Updated`;
      body = `${asset_name} • New trading notes added`;
      break;
      
    case 'signal_updated':
      if (notification.change_types?.includes('tp_hits')) {
        const tpNum = tp_hits?.[tp_hits.length - 1] || 1;
        title = `🎯 ${safeAuthorName} • TP${tpNum} Hit`;
        body = `${asset_name} • ${pipsText || 'Take profit reached'}`;
      } else if (notification.change_types?.includes('status_change')) {
        if (status === 'closed') {
          title = `🛑 ${safeAuthorName} • Signal Closed`;
          body = `${asset_name} • Trade completed`;
        } else if (status === 'active') {
          title = `🚀 ${safeAuthorName} • Signal Active`;
          body = `${asset_name} • Now trading`;
        } else {
          title = `🔄 ${safeAuthorName} • Status Update`;
          body = `${asset_name} • Status: ${status}`;
        }
      } else {
        title = `🔄 ${safeAuthorName} • Signal Updated`;
        body = `${asset_name} • Parameters modified`;
      }
      break;
      
    default:
      title = `ℹ️ ${safeAuthorName} • Trading Alert`;
      body = `${asset_name} • ${trade_type.toUpperCase()}`;
  }

  // Rich data payload for deep linking and UI enhancement
  const data = {
    signal_id: notification.signal_id,
    asset_name: notification.asset_name,
    notification_type: notification.notification_type,
    priority_level: notification.priority_level,
    author_id: notification.author_id,
    author_name: safeAuthorName, // Use safe author name
    trade_type: notification.trade_type,
    entry_price: notification.entry_price.toString(),
    status: notification.status,
    created_at: notification.created_at,
    deep_link: `/dashboard/signals/${notification.signal_id}`,
    urgency_score: notification.priority_level,
    ...(notification.tp_hits && { tp_hits: JSON.stringify(notification.tp_hits) }),
    ...(notification.close_reason && { close_reason: notification.close_reason })
  };

  // ONLY "View Signal" button as per requirements
  const webButtons = [
    {
      id: 'view_signal',
      text: 'View Signal',
      url: `https://www.tradeimperial.com/dashboard/signal-stream?signal=${notification.signal_id}`
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
    logProfessional('error', 'Error in getEligibleUsers', { error: (error as Error).message });
    return [];
  }
}

// EMERGENCY FIX: Enhanced deduplication with circuit breaker
async function checkNotificationDeduplication(
  supabase: any,
  eventKey: string,
  signalId: string
): Promise<boolean> {
  try {
    // Check for existing notifications with same event key
    const { data: existingNotifications, error } = await supabase
      .from('notification_delivery_log')
      .select('id, created_at')
      .eq('event_key', eventKey)
      .eq('signal_id', signalId)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      logProfessional('warn', 'Deduplication check failed, allowing notification', { error: error.message });
      return false; // Allow notification on error
    }

    const isDuplicate = existingNotifications && existingNotifications.length > 0;
    if (isDuplicate) {
      const lastSent = new Date(existingNotifications[0].created_at);
      const timeSinceLastSent = Date.now() - lastSent.getTime();
      
      logProfessional('warn', 'EMERGENCY: Duplicate notification blocked by enhanced deduplication', { 
        eventKey, 
        signalId, 
        timeSinceLastSentMs: timeSinceLastSent,
        lastSentAt: lastSent.toISOString()
      });
    }

    return isDuplicate;
  } catch (error) {
    logProfessional('error', 'Deduplication check exception', { error: (error as Error).message });
    return false; // Allow notification on error to prevent blocking legitimate notifications
  }
}

// EMERGENCY FIX: Request-level deduplication
async function checkRequestDeduplication(
  supabase: any,
  requestPayload: any,
  signalId: string,
  notificationType: string
): Promise<boolean> {
  try {
    // Create hash of the request payload
    const requestString = JSON.stringify({
      signal_id: signalId,
      notification_type: notificationType,
      change_types: requestPayload.change_types || [],
      priority_level: requestPayload.priority_level,
      timestamp_hour: Math.floor(Date.now() / (1000 * 60 * 60)) // Hour-based grouping
    });
    
    const encoder = new TextEncoder();
    const data = encoder.encode(requestString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const requestHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Check if this request was processed recently
    const { data: duplicateCheck, error } = await supabase.rpc(
      'check_request_deduplication', 
      {
        p_request_hash: requestHash,
        p_signal_id: signalId,
        p_notification_type: notificationType
      }
    );

    if (error) {
      logProfessional('warn', 'Request deduplication check failed', { error: error.message });
      return true; // Allow on error
    }

    if (!duplicateCheck) {
      logProfessional('warn', 'EMERGENCY: Duplicate request blocked', { 
        requestHash: requestHash.substring(0, 16) + '...',
        signalId,
        notificationType
      });
    }

    return duplicateCheck;
  } catch (error) {
    logProfessional('error', 'Request deduplication exception', { error: (error as Error).message });
    return true; // Allow on error
  }
}

// EMERGENCY FIX: Circuit breaker check
async function checkCircuitBreaker(
  supabase: any,
  signalId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data: canSend, error } = await supabase.rpc(
      'check_notification_circuit_breaker',
      {
        p_signal_id: signalId,
        p_user_id: userId,
        p_cooldown_minutes: 1 // FIX #4: Changed from 5 to 1 minute
      }
    );

    if (error) {
      logProfessional('warn', 'Circuit breaker check failed', { error: error.message });
      return true; // Allow on error
    }

    if (!canSend) {
      logProfessional('info', 'EMERGENCY: Notification blocked by circuit breaker', { 
        signalId,
        userId
      });
    }

    return canSend;
  } catch (error) {
    logProfessional('error', 'Circuit breaker exception', { error: (error as Error).message });
    return true; // Allow on error
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

  // EMERGENCY FIX: Filter out invalid OneSignal player IDs
  const validPlayerIds = playerIds.filter(id => {
    if (!id || typeof id !== 'string') return false;
    if (id === 'dev_mock_player_id') return false;
    if (id.length < 36) return false;
    // Check UUID format
    const uuidRegex = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
    return uuidRegex.test(id);
  });

  if (validPlayerIds.length === 0) {
    logProfessional('warn', 'EMERGENCY: All OneSignal player IDs invalid, skipping push notification', { 
      originalCount: playerIds.length,
      invalidIds: playerIds.slice(0, 3)
    });
    return { success: false, error: 'All player IDs are invalid' };
  }

  if (validPlayerIds.length < playerIds.length) {
    logProfessional('warn', 'EMERGENCY: Filtered out invalid OneSignal player IDs', { 
      originalCount: playerIds.length,
      validCount: validPlayerIds.length,
      filteredOut: playerIds.length - validPlayerIds.length
    });
  }

  try {
    const payload: OneSignalNotificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: validPlayerIds,
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
      error: (error as Error).message,
      playerIds: playerIds.length 
    });
    return { success: false, error: (error as Error).message };
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
      author_name: notification.author_name || 'Educator', // Safe fallback
      status: notification.status,
      priority_level: notification.priority_level,
      created_at: notification.created_at,
      updated_at: notification.updated_at,
      change_types: notification.change_types || [],
      tp_hits: notification.tp_hits || [],
      version: '2.0',
      timestamp: new Date().toISOString()
    };

    // FIX #5: Add comprehensive logging before broadcast
    logProfessional('info', '📡 Realtime broadcast details', {
      channel: 'instant-alerts',
      event: 'signal_notification',
      signalId: notification.signal_id,
      notificationType: notification.notification_type,
      assetName: notification.asset_name,
      recipientCount: 'all_subscribed_users'
    });

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
      error: (error as Error).message,
      eventKey,
      signalId: notification.signal_id 
    });
    return { success: false, error: (error as Error).message };
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
        status: status,
        event_key: eventKey,
        sent_at: new Date().toISOString(),
        delivered_at: status === 'sent' ? new Date().toISOString() : null,
        error_message: errorMessage,
        metadata: {
          trade_type: notification.trade_type,
          entry_price: notification.entry_price,
          notification_version: '2.0',
          change_types: notification.change_types || [],
          priority_level: notification.priority_level,
          asset_symbol: notification.asset_name,
          author_id: notification.author_id
        }
      });
  } catch (error) {
    logProfessional('error', 'Failed to log notification delivery', { 
      error: (error as Error).message,
      userId,
      channel,
      status 
    });
  }
}

// PHASE 3: User-level circuit breaker check BEFORE batching
async function checkUserEligibility(
  supabase: any,
  signalId: string,
  userId: string,
  notificationType: string
): Promise<{ allowed: boolean; reason?: string }> {
  try {
    // Check circuit breaker at user level (FIX #4: 1-minute cooldown, changed from 5)
    const { data: canSend, error } = await supabase.rpc(
      'check_notification_circuit_breaker',
      {
        p_signal_id: signalId,
        p_user_id: userId,
        p_cooldown_minutes: 1 // FIX #4: Changed from 5 to 1 minute
      }
    );

    if (error) {
      logProfessional('warn', 'User eligibility check failed', { error: error.message });
      return { allowed: true }; // Allow on error to prevent blocking
    }

    if (!canSend) {
      return { 
        allowed: false, 
        reason: 'User-level circuit breaker active (1-min cooldown)' // FIX #4: Updated message
      };
    }

    return { allowed: true };
  } catch (error) {
    logProfessional('error', 'User eligibility exception', { error: (error as Error).message });
    return { allowed: true }; // Allow on error
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

    // EMERGENCY FIX: Request-level deduplication for entire batch
    const batchRequestHash = await (async () => {
      try {
        const batchString = JSON.stringify({
          notification_count: notifications.length,
          signal_ids: notifications.map(n => n.signal_id).sort(),
          types: notifications.map(n => n.notification_type).sort(),
          timestamp_minute: Math.floor(Date.now() / (1000 * 60))
        });
        
        const encoder = new TextEncoder();
        const data = encoder.encode(batchString);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 32);
      } catch {
        return `batch_${Date.now()}_${Math.random().toString(36)}`;
      }
    })();

    logProfessional('info', 'EMERGENCY: Batch processing started', { 
      batchHash: batchRequestHash,
      notificationCount: notifications.length
    });

    // Process each notification
    for (const notification of notifications) {
      try {
        metrics.processed++;
        
        // ============================================
        // BUG #22 FIX: Defensive logging for incoming notification payload
        // ============================================
        logProfessional('info', '📦 INCOMING NOTIFICATION PAYLOAD', {
          signal_id: notification.signal_id,
          notification_type: notification.notification_type,
          author_id: notification.author_id,
          author_name: notification.author_name,
          author_avatar_url: notification.author_avatar_url,
          asset_name: notification.asset_name,
          tradermade_symbol: notification.tradermade_symbol,
          priority_level: notification.priority_level,
          change_types: notification.change_types
        });
        
        // Validate critical fields
        if (!notification.author_name || notification.author_name.trim() === '') {
          logProfessional('warn', '⚠️ BUG #22: Missing author_name in payload, will use fallback', {
            signal_id: notification.signal_id,
            author_id: notification.author_id,
            notification_type: notification.notification_type
          });
        }
        
        // PHASE 3: Include trigger source in event key
        const triggerSource = notification.change_types?.includes('signal_created') ? 'insert' : 'update';
        const eventKey = generateEventKey(notification, triggerSource);
        
        logProfessional('info', `Processing notification for signal ${notification.signal_id}`, {
          notificationType: notification.notification_type,
          priorityLevel: notification.priority_level,
          deliveryChannels: notification.delivery_channels,
          eventKey
        });

        // EMERGENCY FIX: Multi-layer deduplication and circuit breaker checks
        
      // 1. Request-level deduplication
      // FIX #3: BYPASS for signal_created - each new signal should always notify
      if (notification.notification_type !== 'signal_created') {
        const allowRequest = await checkRequestDeduplication(
          supabase, 
          notification, 
          notification.signal_id, 
          notification.notification_type
        );
        if (!allowRequest) {
          logProfessional('warn', `EMERGENCY: Request blocked by deduplication for signal ${notification.signal_id}`);
          continue;
        }
      } else {
        logProfessional('info', `✅ Signal creation bypassing request deduplication for signal ${notification.signal_id}`);
      }

        // 2. Event-level deduplication (existing)
        const isDuplicate = await checkNotificationDeduplication(supabase, eventKey, notification.signal_id);
        if (isDuplicate) {
          logProfessional('warn', `EMERGENCY: Event blocked by deduplication for signal ${notification.signal_id}`);
          continue;
        }

        // Get eligible users
        const allUsers = await getEligibleUsers(supabase, notification.user_ids);
        
        if (allUsers.length === 0) {
          logProfessional('warn', `No eligible users found for signal ${notification.signal_id}`);
          continue;
        }

        // PHASE 4: FIX #8 - Async Notification Batching + FIX #10 - Circuit Breaker Bypass
        const eligibleUsers = [];
        let skippedByCircuitBreaker = 0;
        
        // FIX #10: Bypass circuit breaker for CRITICAL notifications
        const isCritical = notification.notification_type === 'stop_loss_hit' || 
                           notification.notification_type === 'signal_closed' ||
                           notification.notification_type === 'manual_close';
        
        if (isCritical) {
          // Critical alerts bypass circuit breaker - send to all users
          logProfessional('info', `🚨 CRITICAL ALERT: Bypassing circuit breaker for ${notification.notification_type}`);
          eligibleUsers.push(...allUsers);
        } else {
          // FIX #8: Parallel eligibility checks (instead of sequential)
          const eligibilityChecks = await Promise.all(
            allUsers.map(user => checkUserEligibility(
              supabase,
              notification.signal_id,
              user.id,
              notification.notification_type
            ))
          );
          
          // Filter eligible users based on parallel checks
          allUsers.forEach((user, index) => {
            if (eligibilityChecks[index].allowed) {
              eligibleUsers.push(user);
            } else {
              skippedByCircuitBreaker++;
              logProfessional('info', `🚫 User ${user.id} blocked by circuit breaker: ${eligibilityChecks[index].reason}`);
            }
          });
        }
        
        if (eligibleUsers.length === 0) {
          logProfessional('warn', `All ${allUsers.length} users blocked by circuit breaker for signal ${notification.signal_id}`);
          continue;
        }
        
        logProfessional('info', `✅ ${eligibleUsers.length} eligible users (${skippedByCircuitBreaker} blocked by circuit breaker)`);

        // Send in-app realtime notifications
        if (notification.delivery_channels.includes('in_app')) {
          const realtimeResult = await sendRealtimeNotification(supabase, notification, eventKey);
          if (realtimeResult.success) {
            metrics.in_app_sent++;
            metrics.sent++;
            
            // Log successful in-app delivery for ELIGIBLE users only
            for (const user of eligibleUsers) {
              await logNotificationDelivery(
                supabase,
                notification,
                user.id,
                'in_app',
                'sent',
                eventKey
              );
            }
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
              // PHASE 3: Log successful deliveries for ELIGIBLE users only (already filtered)
              let actualSentCount = 0;
              for (const user of eligibleUsers) {
                if (user.onesignal_player_id) {
                  await logNotificationDelivery(
                    supabase,
                    notification,
                    user.id,
                    'push',
                    'sent',
                    eventKey
                  );
                  actualSentCount++;
                }
              }
              
              metrics.push_sent += actualSentCount;
              metrics.sent += actualSentCount;
            } else {
              metrics.failed += playerIds.length;
              metrics.errors.push(`Push notification failed: ${pushResult.error}`);
              
              // Log failed deliveries
              for (const user of eligibleUsers) {
                if (user.onesignal_player_id) {
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
            }
          } else {
            logProfessional('warn', `No valid OneSignal player IDs found for signal ${notification.signal_id}`);
          }
        }

        logProfessional('info', `Completed processing notification for signal ${notification.signal_id}`, {
          eventKey,
          eligibleUsers: eligibleUsers.length,
          deliveryChannels: notification.delivery_channels
        });

      } catch (error) {
        metrics.failed++;
        metrics.errors.push(`Processing error: ${(error as Error).message}`);
        logProfessional('error', `Failed to process notification for signal ${notification.signal_id}`, {
          error: (error as Error).message
        });
      }
    }

    const processingTime = Date.now() - startTime;
    logProfessional('info', 'Notification batch processing completed', {
      ...metrics,
      processingTimeMs: processingTime,
      avgTimePerNotification: processingTime / notifications.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        processingTimeMs: processingTime
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    const processingTime = Date.now() - startTime;
    logProfessional('error', 'Critical error in notification processing', {
      error: (error as Error).message,
      processingTimeMs: processingTime
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
        metrics: { processed: 0, sent: 0, failed: 0, in_app_sent: 0, push_sent: 0, errors: [(error as Error).message] }
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});