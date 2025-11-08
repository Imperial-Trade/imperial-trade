import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('💰 Price Monitoring Service started');
  
  // ============================================
  // CRON AUTHORIZATION: Verify cron secret for security
  // ============================================
  const cronSecret = req.headers.get('x-supabase-cron-secret');
  const expectedSecret = Deno.env.get('CRON_SECRET');
  
  if (req.method === 'POST' && cronSecret && cronSecret !== expectedSecret) {
    console.error('❌ [Cron] Unauthorized request - invalid secret');
    return new Response(JSON.stringify({
      error: 'Unauthorized',
      message: 'Invalid cron secret'
    }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
  
  console.log('✅ [Cron] Authorization verified');
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  try {
    // Get current market prices
    const { data: prices, error: pricesError } = await supabase
      .from('market_prices')
      .select('symbol, bid, ask, mid, timestamp');
      
    if (pricesError) {
      throw new Error(`Failed to fetch market prices: ${pricesError.message}`);
    }

    console.log(`📊 Processing ${prices?.length || 0} market prices`);

    let triggeredAlerts = 0;
    let processedSignals = 0;

    for (const price of prices || []) {
      // Get active alerts for this symbol
      const { data: alerts, error: alertsError } = await supabase
        .from('alert_monitoring')
        .select(`
          id, signal_id, alert_type, target_price, symbol,
          trade_alerts!inner(id, trade_type, user_id, asset_name, status)
        `)
        .eq('symbol', price.symbol)
        .eq('is_active', true)
        .eq('trade_alerts.status', 'active');

      if (alertsError) {
        console.error(`❌ Error fetching alerts for ${price.symbol}:`, alertsError);
        continue;
      }

      for (const alert of alerts || []) {
        processedSignals++;
        const currentPrice = price.mid || price.bid; // Use mid price or fallback to bid
        const tradeType = (alert.trade_alerts as any).trade_type;
        
        let shouldTrigger = false;
        
        // Check if alert should trigger based on trade type and alert type
        if (alert.alert_type === 'stop_loss') {
          shouldTrigger = (tradeType.includes('buy') && currentPrice <= alert.target_price) ||
                         (tradeType.includes('sell') && currentPrice >= alert.target_price);
        } else if (alert.alert_type.startsWith('take_profit_')) {
          shouldTrigger = (tradeType.includes('buy') && currentPrice >= alert.target_price) ||
                         (tradeType.includes('sell') && currentPrice <= alert.target_price);
        }

        if (shouldTrigger) {
          console.log(`🎯 Alert triggered: ${alert.alert_type} for ${alert.symbol} at ${currentPrice}`);
          triggeredAlerts++;

          // Deactivate the alert
          await supabase
            .from('alert_monitoring')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', alert.id);

          // Handle the triggered alert
          if (alert.alert_type === 'stop_loss') {
            // Close the signal via RPC (proper security)
            console.log(`🔒 Closing signal ${alert.signal_id} via RPC for user ${(alert.trade_alerts as any).user_id}`);
            
            console.log('🎯 Closing signal via RPC:', {
              signalId: alert.signal_id,
              userId: (alert.trade_alerts as any).user_id,
              closeReason: 'stop_loss',
              assetName: (alert.trade_alerts as any).asset_name
            });

            const { data: closeResult, error: closeError } = await supabase.rpc('close_trade_alert', {
              p_alert_id: alert.signal_id,
              p_user_id: (alert.trade_alerts as any).user_id,
              p_close_reason: 'stop_loss'
            });

            if (closeError) {
              console.error('❌ Failed to close signal via RPC:', {
                error: closeError,
                signalId: alert.signal_id,
                assetName: (alert.trade_alerts as any).asset_name
              });
            } else {
              console.log('✅ Signal closed via RPC - Supabase realtime will trigger UPDATE event:', {
                signalId: alert.signal_id,
                assetName: (alert.trade_alerts as any).asset_name,
                result: closeResult
              });
            }
          } else if (alert.alert_type.startsWith('take_profit_')) {
            // Add TP hit to the signal
            const tpLevel = parseInt(alert.alert_type.replace('take_profit_', ''));
            const { data: currentSignal } = await supabase
              .from('trade_alerts')
              .select('tp_hits')
              .eq('id', alert.signal_id)
              .single();
              
            const currentHits = currentSignal?.tp_hits || [];
            if (!currentHits.includes(tpLevel)) {
              await supabase
                .from('trade_alerts')
                .update({
                  tp_hits: [...currentHits, tpLevel],
                  updated_at: new Date().toISOString()
                })
                .eq('id', alert.signal_id);
            }
          }

          // ✅ ENHANCED: Fetch complete signal data and profile for rich notifications
          const { data: signalData } = await supabase
            .from('trade_alerts')
            .select('*')
            .eq('id', alert.signal_id)
            .single();

          const { data: profile } = await supabase
            .from('profiles')
            .select('display_name, avatar_url, user_type')
            .eq('id', (alert.trade_alerts as any).user_id)
            .single();

          console.log(`📬 Preparing notification for user ${(alert.trade_alerts as any).user_id}:`, {
            provider: profile?.display_name,
            alertType: alert.alert_type,
            asset: (alert.trade_alerts as any).asset_name
          });

          // ✅ ENHANCED: Determine proper notification type based on alert type
          let notificationType = 'price_alert_triggered';
          if (alert.alert_type === 'stop_loss') {
            notificationType = 'stop_loss_hit';
          } else if (alert.alert_type.startsWith('take_profit_')) {
            notificationType = 'tp_hit';
          }

          // ✅ ENHANCED: Send notification with COMPLETE metadata for circuit breaker compatibility
          const notificationPayload = {
            notifications: [{
              signal_id: alert.signal_id,
              user_id: (alert.trade_alerts as any).user_id,
              author_id: (alert.trade_alerts as any).user_id,
              
              // Complete signal data
              asset_name: (alert.trade_alerts as any).asset_name,
              tradermade_symbol: signalData?.tradermade_symbol || price.symbol,
              symbol: signalData?.tradermade_symbol || price.symbol,
              trade_type: (alert.trade_alerts as any).trade_type,
              entry_price: signalData?.entry_price || alert.target_price,
              
              // TP data
              tp1: signalData?.tp1,
              tp2: signalData?.tp2,
              tp3: signalData?.tp3,
              tp4: signalData?.tp4,
              tp5: signalData?.tp5,
              tp_hits: signalData?.tp_hits || [],
              tp_number: alert.alert_type.startsWith('take_profit_') 
                ? parseInt(alert.alert_type.replace('take_profit_', ''))
                : undefined,
              
              // Stop loss data
              stop_loss: signalData?.stop_loss,
              
              // Notification metadata
              notification_type: notificationType,
              alert_type: alert.alert_type,
              target_price: alert.target_price,
              triggered_price: currentPrice,
              status: (alert.trade_alerts as any).status,
              
              // Author data for UI display
              author_name: profile?.display_name || 'Price Monitor',
              author_avatar_url: profile?.avatar_url,
              author_user_type: profile?.user_type || 'educator',
              
              // Timestamps
              created_at: signalData?.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
              
              // Delivery configuration
              change_types: [notificationType],
              priority_level: alert.alert_type === 'stop_loss' ? 3 : 2,
              delivery_channels: ['in_app', 'push'],
              include_creator: true
            }]
          };

          // Call the notification dispatcher
          try {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/enhanced-signal-notification-dispatcher`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
              },
              body: JSON.stringify(notificationPayload)
            });
            console.log(`📬 Notification sent for triggered alert ${alert.alert_type}`);
          } catch (notifyErr) {
            console.error('❌ Failed to send notification:', notifyErr);
          }
        }
      }
    }

    console.log(`✅ Price monitoring complete: ${triggeredAlerts} alerts triggered from ${processedSignals} processed`);

    return new Response(JSON.stringify({
      success: true,
      processed_signals: processedSignals,
      triggered_alerts: triggeredAlerts,
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Critical error in price monitoring:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: (error as Error).message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});