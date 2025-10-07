import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('🚀 Starting order trigger monitor...');

    // Check for limit orders that should be activated - FETCH COMPLETE SIGNAL DATA WITH AUTHOR PROFILE
    const { data: pendingLimits, error: fetchError } = await supabase
      .from('trade_alerts')
      .select(`
        id, tradermade_symbol, entry_price, trade_type, asset_name, user_id,
        created_at, updated_at, tp1, tp2, tp3, tp4, tp5, stop_loss, notes,
        profiles:user_id (
          display_name,
          avatar_url
        )
      `)
      .eq('status', 'pending')
      .in('trade_type', ['buy_limit', 'sell_limit']);

    if (fetchError) {
      console.error('❌ Error fetching pending limits:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch pending limits' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`📊 Found ${pendingLimits?.length || 0} pending limit orders`);

    // Get market prices separately
    const symbols = [...new Set(pendingLimits?.map(alert => alert.tradermade_symbol) || [])];
    const { data: marketPrices, error: priceError } = await supabase
      .from('market_prices')
      .select('symbol, mid')
      .in('symbol', symbols);

    if (priceError) {
      console.error('❌ Error fetching market prices:', priceError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch market prices' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // Create price lookup map
    const priceMap = new Map(marketPrices?.map(p => [p.symbol, p.mid]) || []);

    let triggered = 0;
    let processed = 0;

    if (pendingLimits && pendingLimits.length > 0) {
      for (const alert of pendingLimits) {
        processed++;
        const currentPrice = priceMap.get(alert.tradermade_symbol);
        
        if (!currentPrice) {
          console.log(`⚠️ No price data for ${alert.tradermade_symbol}`);
          continue;
        }

        // Fixed trigger logic using mid price
        const shouldTrigger = 
          (alert.trade_type === 'buy_limit' && currentPrice <= alert.entry_price) ||
          (alert.trade_type === 'sell_limit' && currentPrice >= alert.entry_price);

        console.log(`🔍 Checking ${alert.asset_name} (${alert.trade_type}): price=${currentPrice}, entry=${alert.entry_price}, shouldTrigger=${shouldTrigger}`);

        if (shouldTrigger) {
          // PHASE 2: Enhanced error handling with explicit status verification
          const { data: updateResult, error: updateError } = await supabase
            .from('trade_alerts')
            .update({
              status: 'active',
              activated_at: new Date().toISOString(),
              activation_price: currentPrice, // Use actual trigger price
              updated_at: new Date().toISOString()
            })
            .eq('id', alert.id)
            .select('id, status, activated_at, activation_price')
            .single();

          if (updateError) {
            console.error(`❌ CRITICAL: Failed to activate order ${alert.id}:`, {
              error: updateError,
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
              code: updateError.code
            });
            continue; // Skip notification if update failed
          }

          // PHASE 3: Verify the status actually changed to 'active'
          if (!updateResult || updateResult.status !== 'active') {
            console.error(`❌ VERIFICATION FAILED: Order ${alert.id} update succeeded but status is not 'active'`, {
              expectedStatus: 'active',
              actualStatus: updateResult?.status,
              updateResult
            });
            continue; // Skip notification if status didn't change
          }

          // SUCCESS: Status genuinely changed to 'active'
          console.log(`✅ VERIFIED ACTIVATION: ${alert.trade_type} order for ${alert.asset_name}`, {
            orderId: alert.id,
            activationPrice: currentPrice,
            entryPrice: alert.entry_price,
            activatedAt: updateResult.activated_at,
            statusConfirmed: updateResult.status === 'active'
          });
          triggered++;

          // Send order activated notification ONLY if status genuinely changed
          try {
            // ============================================
            // BUG #23 FIX: Correctly extract profile from Supabase array
            // ============================================
            // Supabase foreign key JOINs return arrays, not objects
            const profileArray = alert.profiles as any;
            const authorProfile = Array.isArray(profileArray) ? profileArray[0] : profileArray;
            
            // Log raw structure for debugging
            console.log('📊 BUG #23: Profile extraction debug', {
              signal_id: alert.id,
              raw_profiles_type: Array.isArray(profileArray) ? 'array' : typeof profileArray,
              raw_profiles: profileArray,
              extracted_profile: authorProfile,
              has_display_name: !!authorProfile?.display_name
            });
            
            const authorName = authorProfile?.display_name || 'Unknown Trader';
            const authorAvatar = authorProfile?.avatar_url || null;
            
            // Warn if profile is missing or incomplete
            if (!authorProfile || !authorProfile.display_name) {
              console.warn('⚠️ BUG #23: Profile missing or incomplete', {
                signal_id: alert.id,
                user_id: alert.user_id,
                has_profile: !!authorProfile,
                profile_data: authorProfile
              });
            }

            // Construct COMPLETE notification payload with all required fields
            const notificationPayload = {
              notifications: [{
                signal_id: alert.id,
                user_id: alert.user_id,
                author_id: alert.user_id,
                author_name: authorName,
                author_avatar_url: authorAvatar,
                asset_name: alert.asset_name,
                tradermade_symbol: alert.tradermade_symbol,
                symbol: alert.tradermade_symbol, // Duplicate for compatibility
                trade_type: alert.trade_type,
                entry_price: alert.entry_price,
                activation_price: currentPrice,
                stop_loss: alert.stop_loss,
                tp1: alert.tp1,
                tp2: alert.tp2,
                tp3: alert.tp3,
                tp4: alert.tp4,
                tp5: alert.tp5,
                created_at: alert.created_at,
                updated_at: alert.updated_at,
                notification_type: 'limit_order_activated',
                alert_type: 'limit_order_activated',
                status: 'active',
                change_types: ['limit_order_activated'],
                priority_level: 2,
                delivery_channels: ['push', 'in_app']
              }]
            };

            // Log complete payload for debugging
            console.log(`📦 Sending notification payload:`, JSON.stringify(notificationPayload, null, 2));

            // Verify critical fields are present
            if (!authorName || authorName === 'Unknown Trader') {
              console.warn(`⚠️ Missing author profile data for signal ${alert.id}, user ${alert.user_id}`);
            }

            const { error: notifyError } = await supabase.functions.invoke('enhanced-signal-notification-dispatcher', {
              body: notificationPayload
            });

            if (notifyError) {
              console.error(`⚠️ Failed to send activation notification for ${alert.id}:`, notifyError);
            } else {
              console.log(`📡 Sent activation notification for ${alert.asset_name}`);
            }
          } catch (notifyException) {
            console.error(`❌ Exception sending activation notification:`, notifyException);
          }
        }
      }
    }

    console.log(`✅ Order monitor completed: ${processed} processed, ${triggered} triggered`);

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        triggered,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Fatal error in order monitor:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});