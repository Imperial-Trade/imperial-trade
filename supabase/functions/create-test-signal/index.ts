// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧪 CREATE TEST SIGNAL FOR NOTIFICATION TESTING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Creates a test signal with entry price close to current market
// to immediately trigger TP hits and test notification pipeline
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`🧪 Creating test signal for user: ${user.id}`);

    // Get current market price for Bitcoin
    const { data: priceData, error: priceError } = await supabase
      .from('market_prices')
      .select('bid, ask, mid')
      .eq('symbol', 'BTCUSD')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (priceError || !priceData) {
      throw new Error('Failed to fetch current BTC price');
    }

    const currentPrice = priceData.mid || ((priceData.bid + priceData.ask) / 2);
    console.log(`📊 Current BTC price: ${currentPrice}`);

    // Determine trade type (alternate between BUY and SELL for testing)
    const tradeType = Math.random() > 0.5 ? 'buy' : 'sell';
    
    // Calculate entry and targets based on trade type
    // For BUY: Entry slightly below current, TPs above
    // For SELL: Entry slightly above current, TPs below
    let entryPrice: number;
    let stopLoss: number;
    let tp1: number;
    let tp2: number;
    let tp3: number;

    if (tradeType === 'buy') {
      entryPrice = currentPrice - 5; // 5 pips below current (will activate immediately)
      stopLoss = entryPrice - 200; // 200 pips SL
      tp1 = currentPrice + 10; // Very close - should hit immediately
      tp2 = currentPrice + 50;
      tp3 = currentPrice + 100;
    } else {
      entryPrice = currentPrice + 5; // 5 pips above current (will activate immediately)
      stopLoss = entryPrice + 200; // 200 pips SL
      tp1 = currentPrice - 10; // Very close - should hit immediately
      tp2 = currentPrice - 50;
      tp3 = currentPrice - 100;
    }

    console.log(`🎯 Test Signal Parameters:
      Type: ${tradeType.toUpperCase()}
      Entry: ${entryPrice}
      TP1: ${tp1} (should hit immediately)
      TP2: ${tp2}
      TP3: ${tp3}
      SL: ${stopLoss}
    `);

    // Create the test signal
    const { data: signal, error: signalError } = await supabase
      .from('trade_alerts')
      .insert({
        user_id: user.id,
        asset_name: 'Bitcoin (Test Signal)',
        tradermade_symbol: 'BTCUSD',
        trade_type: tradeType,
        entry_price: entryPrice,
        stop_loss: stopLoss,
        tp1: tp1,
        tp2: tp2,
        tp3: tp3,
        status: 'active', // Start active to trigger TPs immediately
        notes: '🧪 Test signal for notification system - Auto-generated',
        provider_name: 'Imperial Trading',
        expiry_type: 'GTC',
      })
      .select()
      .single();

    if (signalError) {
      console.error('❌ Failed to create signal:', signalError);
      throw signalError;
    }

    console.log(`✅ Test signal created: ${signal.id}`);
    console.log(`📤 Notification trigger should fire automatically`);
    console.log(`⏱️ TPs should start hitting within seconds based on market movement`);

    return new Response(JSON.stringify({
      success: true,
      signal: {
        id: signal.id,
        asset_name: signal.asset_name,
        trade_type: signal.trade_type,
        entry_price: signal.entry_price,
        current_market_price: currentPrice,
        tp1: signal.tp1,
        tp2: signal.tp2,
        tp3: signal.tp3,
        stop_loss: signal.stop_loss,
        status: signal.status,
      },
      message: 'Test signal created! TPs should hit soon based on market movement.',
      next_steps: [
        'Watch for "Signal Created" notification',
        'Monitor for TP1 hit notification (should happen within seconds)',
        'Check notification displays correct educator profile and pips calculation',
        'Verify TP2 and TP3 notifications as price moves',
      ],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
    }), {
      status: error.message === 'Unauthorized' ? 401 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});