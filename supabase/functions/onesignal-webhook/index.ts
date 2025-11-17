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
      player_ids: payload.player_ids?.length || 0
    });

    // Extract event type
    const eventType = payload.event; // 'notification.displayed', 'clicked', 'dismissed'
    
    if (!eventType || !payload.id) {
      return new Response(
        JSON.stringify({ error: 'Invalid webhook payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process each player_id in the event
    const playerIds = payload.player_ids || [];
    const insertPromises = playerIds.map(async (playerId: string) => {
      // Try to find the user_id from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('onesignal_player_id', playerId)
        .single();

      // Insert webhook event
      return supabase.from('onesignal_webhook_events').insert({
        event_type: eventType,
        notification_id: payload.id,
        player_id: playerId,
        user_id: profile?.id || null,
        app_id: payload.app_id,
        heading: payload.headings?.en || payload.heading,
        content: payload.contents?.en || payload.content,
        url: payload.url,
        icon: payload.icon,
        delivery_status: payload.successful ? 'delivered' : 'failed',
        platform: payload.platform,
        device_type: payload.device_type,
        event_timestamp: payload.sent_at || payload.queued_at || new Date().toISOString(),
        raw_payload: payload
      });
    });

    await Promise.all(insertPromises);

    console.log('✅ [OneSignal Webhook] Events stored:', {
      type: eventType,
      count: playerIds.length,
      notification_id: payload.id
    });

    return new Response(
      JSON.stringify({ success: true, processed: playerIds.length }),
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

