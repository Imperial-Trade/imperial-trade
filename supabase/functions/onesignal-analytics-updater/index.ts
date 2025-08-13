import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticsUpdateData {
  date: string;
  sent: number;
  delivered: number;
  opened: number;
  failed: number;
  platform_stats: Record<string, number>;
  error_stats: Record<string, number>;
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

    const payload: AnalyticsUpdateData = await req.json();
    console.log('📊 Updating analytics:', JSON.stringify(payload, null, 2));

    const { date, sent, delivered, opened, failed, platform_stats, error_stats } = payload;
    
    // Calculate delivery time from recent deliveries
    const { data: recentDeliveries } = await supabase
      .from('push_notification_deliveries')
      .select('sent_at, delivered_at')
      .not('delivered_at', 'is', null)
      .gte('sent_at', `${date}T00:00:00Z`)
      .lt('sent_at', `${date}T23:59:59Z`)
      .order('sent_at', { ascending: false })
      .limit(100);

    let avgDeliveryTimeSeconds = 0;
    if (recentDeliveries && recentDeliveries.length > 0) {
      const totalTime = recentDeliveries.reduce((sum, delivery) => {
        const sentTime = new Date(delivery.sent_at).getTime();
        const deliveredTime = new Date(delivery.delivered_at!).getTime();
        return sum + (deliveredTime - sentTime);
      }, 0);
      avgDeliveryTimeSeconds = Math.round(totalTime / recentDeliveries.length / 1000);
    }

    // Upsert analytics record
    const { error } = await supabase
      .from('notification_analytics')
      .upsert({
        date,
        total_sent: sent,
        total_delivered: delivered,
        total_opened: opened,
        total_failed: failed,
        avg_delivery_time_seconds: avgDeliveryTimeSeconds,
        platform_breakdown: platform_stats,
        error_breakdown: error_stats,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'date'
      });

    if (error) {
      console.error('❌ Failed to update analytics:', error);
      throw error;
    }

    console.log('✅ Analytics updated successfully for date:', date);

    return new Response(
      JSON.stringify({ 
        success: true, 
        date, 
        metrics: { sent, delivered, opened, failed },
        avg_delivery_time_seconds: avgDeliveryTimeSeconds
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Analytics update error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update analytics' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});