// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📱 ONESIGNAL WEBHOOK HANDLER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Handles OneSignal delivery events:
// - sent: Notification was sent to OneSignal
// - delivered: Notification reached the device
// - opened: User opened the notification
// - clicked: User clicked the notification
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const event = await req.json();
    
    console.log('📥 [OneSignal Webhook] Received event:', {
      type: event.event,
      notification_id: event.id,
      timestamp: new Date().toISOString()
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Extract notification ID from event
    const notificationId = event.id || event.notification?.id;
    
    if (!notificationId) {
      console.warn('⚠️ No notification ID in event');
      return new Response(JSON.stringify({ success: true, message: 'No notification ID' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle different event types
    switch (event.event) {
      case 'sent':
        await handleSent(supabase, notificationId, event);
        break;
      
      case 'delivered':
        await handleDelivered(supabase, notificationId, event);
        break;
      
      case 'opened':
      case 'clicked':
        await handleOpened(supabase, notificationId, event);
        break;
      
      default:
        console.log(`ℹ️ Unhandled event type: ${event.event}`);
    }

    return new Response(JSON.stringify({ 
      success: true,
      event: event.event,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('❌ [OneSignal Webhook] Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 EVENT HANDLERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function handleSent(supabase: any, notificationId: string, event: any) {
  console.log('📤 [OneSignal Webhook] Notification sent:', notificationId);
  
  // Update analytics with sent confirmation
  const { error } = await supabase
    .from('notification_analytics')
    .update({
      sent_at: new Date(event.timestamp * 1000 || Date.now()).toISOString()
    })
    .eq('onesignal_notification_id', notificationId);

  if (error) {
    console.error('Failed to update sent status:', error);
  }
}

async function handleDelivered(supabase: any, notificationId: string, event: any) {
  console.log('✅ [OneSignal Webhook] Notification delivered:', notificationId);
  
  const sentAt = new Date(event.timestamp * 1000 || Date.now());
  
  // Find analytics record to calculate latency
  const { data: existing } = await supabase
    .from('notification_analytics')
    .select('sent_at')
    .eq('onesignal_notification_id', notificationId)
    .single();

  let delivery_latency_ms = null;
  if (existing?.sent_at) {
    const sentTime = new Date(existing.sent_at);
    delivery_latency_ms = sentAt.getTime() - sentTime.getTime();
  }

  // Update analytics with delivery confirmation
  const { error } = await supabase
    .from('notification_analytics')
    .update({
      delivered_at: sentAt.toISOString(),
      delivery_latency_ms,
      device_type: event.device_type || event.notification?.device_type
    })
    .eq('onesignal_notification_id', notificationId);

  if (error) {
    console.error('Failed to update delivered status:', error);
  } else {
    console.log(`✅ Delivery confirmed (latency: ${delivery_latency_ms}ms)`);
  }
}

async function handleOpened(supabase: any, notificationId: string, event: any) {
  console.log('👀 [OneSignal Webhook] Notification opened/clicked:', notificationId);
  
  const openedAt = new Date(event.timestamp * 1000 || Date.now());
  
  // Find analytics record to calculate open latency
  const { data: existing } = await supabase
    .from('notification_analytics')
    .select('delivered_at')
    .eq('onesignal_notification_id', notificationId)
    .single();

  let open_latency_ms = null;
  if (existing?.delivered_at) {
    const deliveredTime = new Date(existing.delivered_at);
    open_latency_ms = openedAt.getTime() - deliveredTime.getTime();
  }

  // Update analytics with open/click confirmation
  const { error } = await supabase
    .from('notification_analytics')
    .update({
      opened_at: openedAt.toISOString(),
      clicked_at: event.event === 'clicked' ? openedAt.toISOString() : undefined,
      open_latency_ms
    })
    .eq('onesignal_notification_id', notificationId);

  if (error) {
    console.error('Failed to update opened status:', error);
  } else {
    console.log(`✅ Open confirmed (latency: ${open_latency_ms}ms)`);
  }
}

