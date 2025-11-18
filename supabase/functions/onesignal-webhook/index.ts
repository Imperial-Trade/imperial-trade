// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔔 ONESIGNAL WEBHOOK ENDPOINT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Receives OneSignal webhook events and stores them in the database
// Events: notification.displayed, notification.clicked, notification.dismissed
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-ingest-key, cache-control, pragma, expires',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'Access-Control-Expose-Headers': 'X-Health-Source, X-Responder-Instance'
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload = await req.json();
    
    console.log('📥 [OneSignal Webhook] Received event:', {
      type: payload.event,
      notification_id: payload.id,
      data: payload.data || {},
      player_ids: payload.included_segments?.length || 0
    });

    // Log the full payload for debugging (first-time webhook setup)
    console.log('📦 [OneSignal Webhook] Full payload:', JSON.stringify(payload, null, 2));

    // Extract event type from OneSignal webhook format
    // OneSignal sends events as: "notification.displayed", "notification.clicked", "notification.dismissed"
    const eventType = payload.event;
    
    if (!eventType || !payload.id) {
      console.error('❌ [OneSignal Webhook] Invalid payload - missing event or id');
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload - missing event or id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract notification data from OneSignal payload
    const notificationId = payload.id;
    const appId = payload.app_id;
    const heading = payload.headings?.en || payload.heading || 'No heading';
    const content = payload.contents?.en || payload.content || 'No content';
    
    // OneSignal webhook sends recipient data differently based on event type
    // For "displayed", "clicked", "dismissed": check payload.data for player_id or device info
    const playerIds = [];
    
    // Try multiple ways to extract player IDs based on OneSignal's webhook format
    if (payload.player_id) {
      playerIds.push(payload.player_id);
    } else if (payload.data?.player_id) {
      playerIds.push(payload.data.player_id);
    } else if (payload.included_segments && Array.isArray(payload.included_segments)) {
      // If this is a broadcast to segments, we'll log it but not store individual player events
      console.log('ℹ️ [OneSignal Webhook] Segment-based notification (no individual player IDs)');
    }

    // If no player IDs found, still log the event for analytics
    if (playerIds.length === 0) {
      console.log('⚠️ [OneSignal Webhook] No player IDs found - storing generic event');
      
      // Store a generic event without player_id
      const { error } = await supabase.from('onesignal_webhook_events').insert({
        event_type: eventType,
        notification_id: notificationId,
        player_id: null,
        user_id: null,
        app_id: appId,
        heading: heading,
        content: content,
        url: payload.url || null,
        icon: payload.icon || null,
        delivery_status: 'unknown',
        platform: payload.platform || null,
        device_type: payload.device_type?.toString() || null,
        event_timestamp: payload.sent_at || payload.queued_at || new Date().toISOString(),
        raw_payload: payload
      });

      if (error) {
        console.error('❌ [OneSignal Webhook] Failed to store generic event:', error);
      }

      return new Response(
        JSON.stringify({ success: true, processed: 0, note: 'Stored generic event without player ID' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each player_id in the event
    const insertPromises = playerIds.map(async (playerId: string) => {
      // Try to find the user_id from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('onesignal_player_id', playerId)
        .single();

      // Insert webhook event
      const { error } = await supabase.from('onesignal_webhook_events').insert({
        event_type: eventType,
        notification_id: notificationId,
        player_id: playerId,
        user_id: profile?.id || null,
        app_id: appId,
        heading: heading,
        content: content,
        url: payload.url || null,
        icon: payload.icon || null,
        delivery_status: payload.successful !== undefined ? (payload.successful ? 'delivered' : 'failed') : 'unknown',
        platform: payload.platform || null,
        device_type: payload.device_type?.toString() || null,
        event_timestamp: payload.sent_at || payload.queued_at || new Date().toISOString(),
        raw_payload: payload
      });

      if (error) {
        console.error('❌ [OneSignal Webhook] Failed to insert for player:', playerId, error);
      }

      return { playerId, error };
    });

    const results = await Promise.all(insertPromises);
    const successCount = results.filter(r => !r.error).length;
    const failCount = results.filter(r => r.error).length;

    console.log('✅ [OneSignal Webhook] Events stored:', {
      type: eventType,
      total: playerIds.length,
      success: successCount,
      failed: failCount,
      notification_id: notificationId
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: successCount,
        failed: failCount,
        total: playerIds.length
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ [OneSignal Webhook] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

