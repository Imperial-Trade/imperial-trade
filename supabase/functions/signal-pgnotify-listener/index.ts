import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SignalCreatedPayload {
  signal_id: string;
  user_id: string;
  asset_name: string;
  trade_type: string;
  entry_price: number;
  stop_loss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tradermade_symbol: string;
  created_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Listen for pg_notify signals
    const channel = supabase.channel('signal_notifications')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'trade_alerts' },
        async (payload) => {
          console.log('[PG Notify] Signal created trigger received:', payload);
          
          if (payload.eventType === 'INSERT' && payload.new) {
            const signalData = payload.new as any;
            
            // Check if this signal is from admin/educator
            const { data: profile } = await supabase
              .from('profiles')
              .select('access_level, user_type')
              .eq('id', signalData.user_id)
              .single();

            if (profile && (
              ['admin', 'moderator'].includes(profile.access_level) || 
              profile.user_type === 'educator'
            )) {
              console.log('[PG Notify] Triggering notification for admin/educator signal');
              
              // Fetch author information for enrichment
              const { data: authorProfile } = await supabase
                .from('public_profiles')
                .select('display_name, avatar_url')
                .eq('id', signalData.user_id)
                .single();
              
              // Call the signal notification dispatcher
              const { error } = await supabase.functions.invoke('signal-notification-dispatcher', {
                body: {
                  notifications: [{
                    signal_id: signalData.id,
                    user_id: signalData.user_id,
                    asset_name: signalData.asset_name,
                    trade_type: signalData.trade_type,
                    entry_price: signalData.entry_price,
                    stop_loss: signalData.stop_loss,
                    tp1: signalData.tp1,
                    tp2: signalData.tp2,
                    tp3: signalData.tp3,
                    tp4: signalData.tp4,
                    tp5: signalData.tp5,
                    symbol: signalData.tradermade_symbol,
                    tradermade_symbol: signalData.tradermade_symbol,
                    created_at: signalData.created_at,
                    notification_type: 'signal_created',
                    alert_type: 'signal_created',
                    target_price: signalData.entry_price,
                    triggered_price: signalData.entry_price,
                    status: signalData.status,
                    author_id: signalData.user_id,
                    author_name: authorProfile?.display_name || 'Unknown',
                    author_avatar_url: authorProfile?.avatar_url,
                    delivery_channels: ['push']
                  }]
                }
              });

              if (error) {
                console.error('[PG Notify] Error calling notification dispatcher:', error);
              } else {
                console.log('[PG Notify] Successfully dispatched notifications');
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('[PG Notify] Subscription status:', status);
      });

    // Keep the connection alive
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'PG Notify listener started',
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('[PG Notify] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
