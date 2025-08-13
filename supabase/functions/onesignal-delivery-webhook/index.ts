import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeliveryWebhookData {
  id: string;
  headings?: Record<string, string>;
  contents?: Record<string, string>;
  send_after?: string;
  completed_at?: string;
  successful?: number;
  failed?: number;
  errored?: number;
  converted?: number;
  remaining?: number;
  queued_at?: string;
  platform_delivery_stats?: Record<string, any>;
}

interface NotificationEvent {
  eventType: string;
  data: DeliveryWebhookData;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: NotificationEvent = await req.json();
    console.log('📨 Received delivery webhook:', JSON.stringify(payload, null, 2));

    const { eventType, data } = payload;
    
    // Track delivery status updates
    if (data.id) {
      const status = data.completed_at ? 'delivered' : 'sent';
      const deliveredAt = data.completed_at ? new Date(data.completed_at) : null;
      
      // Update delivery record
      const { error: updateError } = await supabase
        .from('push_notification_deliveries')
        .update({
          status,
          delivered_at: deliveredAt,
          metadata: {
            ...data,
            webhook_received_at: new Date().toISOString(),
            event_type: eventType
          }
        })
        .eq('onesignal_id', data.id);

      if (updateError) {
        console.error('❌ Failed to update delivery record:', updateError);
      } else {
        console.log('✅ Updated delivery record for notification:', data.id);
      }

      // Update daily analytics
      const today = new Date().toISOString().split('T')[0];
      const { error: analyticsError } = await supabase
        .rpc('update_notification_analytics', {
          p_date: today,
          p_sent: data.successful || 0,
          p_delivered: data.successful || 0,
          p_failed: data.failed || 0,
          p_platform_stats: data.platform_delivery_stats || {}
        });

      if (analyticsError) {
        console.error('❌ Failed to update analytics:', analyticsError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: eventType }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process webhook' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});