import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TradeAlert {
  id: string;
  tradermade_symbol: string;
  trade_type: 'buy' | 'sell' | 'buy_limit' | 'sell_limit';
  entry_price: number;
  stop_loss: number;
  tp1?: number;
  tp2?: number;
  tp3?: number;
  tp4?: number;
  tp5?: number;
  tp_hit_mask?: number;
  tp_hits?: number[];
  asset_name: string;
  provider_name?: string;
  status: string;
  is_xeon_stream?: boolean;
}

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  mid: number;
}

interface NotificationTemplate {
  title: string;
  message: string;
  type: string;
  priority: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🚀 Starting Xeon Stream signal processing...');

    // Get all active trades (not just Xeon Stream) for broader compatibility
    const { data: activeTrades, error: tradesError } = await supabase
      .from('trade_alerts')
      .select('*')
      .eq('status', 'active');

    if (tradesError) {
      console.error('❌ Error fetching active trades:', tradesError);
      throw tradesError;
    }

    if (!activeTrades || activeTrades.length === 0) {
      console.log('📊 No active trades found');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No active trades to process',
          processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📈 Found ${activeTrades.length} active Xeon Stream trades`);

    // Get unique symbols for price fetching
    const symbols = [...new Set(activeTrades.map(trade => trade.tradermade_symbol))];
    
    // Fetch prices from database (WebSocket-stored prices)
    const priceData = await fetchStoredPrices(supabase, symbols);
    
    if (!priceData || Object.keys(priceData).length === 0) {
      console.error('❌ No price data available in database');
      console.log('🔄 Attempting fallback to HTTP API...');
      
      // Fallback to TraderMade HTTP API
      const httpPriceData = await fetchTradermadePrices(symbols);
      if (!httpPriceData || Object.keys(httpPriceData).length === 0) {
        console.error('❌ Both database and HTTP price sources failed');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'No price data available from any source' 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
      console.log(`💱 Using HTTP fallback prices for ${Object.keys(httpPriceData).length} symbols`);
      // Use HTTP data and store in database for future use
      for (const [symbol, data] of Object.entries(httpPriceData)) {
        await supabase.rpc('upsert_market_price', {
          p_symbol: symbol,
          p_bid: data.bid,
          p_ask: data.ask,
          p_mid: data.mid
        });
      }
      Object.assign(priceData, httpPriceData);
    } else {
      console.log(`💱 Using stored prices for ${Object.keys(priceData).length} symbols`);
    }

    let processedCount = 0;
    const notifications: any[] = [];

    // Process each trade
    for (const trade of activeTrades) {
      const currentPrice = priceData[trade.tradermade_symbol];
      if (!currentPrice) {
        console.log(`⚠️ No price data for ${trade.tradermade_symbol}, skipping`);
        continue;
      }

      // Use correct price based on trade direction (BUY uses ASK for TP, BID for SL; SELL uses BID for TP, ASK for SL)
      const isBuyTrade = trade.trade_type === 'buy' || trade.trade_type === 'buy_limit';
      const tpPrice = isBuyTrade ? currentPrice.ask : currentPrice.bid; // Price we can sell at (buy) or buy at (sell)
      const slPrice = isBuyTrade ? currentPrice.bid : currentPrice.ask; // Price we're forced to exit at

      console.log(`🔍 Processing ${trade.asset_name} (${trade.tradermade_symbol}): Entry=${trade.entry_price}, Current TP=${tpPrice}, SL=${slPrice}, Trade Type=${trade.trade_type}`);

      // Check stop loss first (use SL price) - this will close the trade immediately
      const slHit = checkStopLoss(trade, slPrice, isBuyTrade);
      if (slHit) {
        console.log(`🔴 Stop Loss hit for ${trade.asset_name} at ${slPrice} (Entry: ${trade.entry_price})`);
        
        // Check if any TPs were hit before SL
        const hadProfitableTps = (trade.tp_hit_mask && trade.tp_hit_mask > 0) || (trade.tp_hits && trade.tp_hits.length > 0);
        
        await closeTrade(supabase, trade.id, hadProfitableTps ? 'reversal_after_tp' : 'stop_loss');
        
        const notification = createStopLossNotification(
          trade, 
          slPrice, 
          hadProfitableTps
        );
        notifications.push(notification);
        processedCount++;
        continue;
      }

      // Check take profit levels - this will mark TPs as hit and potentially close trade if all TPs hit
      const tpResult = await processTakeProfits(supabase, trade, tpPrice, isBuyTrade);
      
      if (tpResult.notifications.length > 0) {
        console.log(`✅ ${tpResult.notifications.length} TP notifications generated for ${trade.asset_name}`);
        notifications.push(...tpResult.notifications);
        processedCount++;
        
        // If all TPs hit, close the trade with success
        if (tpResult.allTpsHit) {
          console.log(`🎯 All TPs hit for ${trade.asset_name}, closing trade with success`);
          const highestTP = getHighestTpLevel(trade);
          await closeTrade(supabase, trade.id, `tp${highestTP}`);
        }
      }
    }

    // Send notifications if any were generated
    if (notifications.length > 0) {
      console.log(`📨 Sending ${notifications.length} notifications...`);
      await sendXeonStreamNotifications(supabase, notifications);
    }

    console.log(`✅ Xeon Stream processing complete. Processed: ${processedCount} trades`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: processedCount,
        notifications_sent: notifications.length,
        active_trades: activeTrades.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('💥 Xeon Stream processor error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function fetchStoredPrices(supabase: any, symbols: string[]): Promise<Record<string, PriceData> | null> {
  try {
    console.log(`📊 Fetching stored prices for: ${symbols.join(', ')}`);
    
    const { data: prices, error } = await supabase
      .from('market_prices')
      .select('*')
      .in('symbol', symbols)
      .gte('timestamp', new Date(Date.now() - 30000).toISOString()); // Only use prices from last 30 seconds

    if (error) {
      console.error('❌ Error fetching stored prices:', error);
      return null;
    }

    if (!prices || prices.length === 0) {
      console.log('⚠️ No recent stored prices found');
      return null;
    }

    const priceData: Record<string, PriceData> = {};
    
    for (const price of prices) {
      priceData[price.symbol] = {
        symbol: price.symbol,
        bid: parseFloat(price.bid),
        ask: parseFloat(price.ask),
        mid: parseFloat(price.mid)
      };
    }

    console.log(`✅ Retrieved stored prices for ${Object.keys(priceData).length} symbols`);
    return priceData;
  } catch (error) {
    console.error('❌ Exception fetching stored prices:', error);
    return null;
  }
}

async function fetchTradermadePrices(symbols: string[]): Promise<Record<string, PriceData> | null> {
  const apiKey = Deno.env.get('TRADERMADE_API_KEY');
  if (!apiKey) {
    console.error('❌ TRADERMADE_API_KEY not found');
    return null;
  }

  try {
    const symbolsString = symbols.join(',');
    const url = `https://marketdata.tradermade.com/api/v1/live?currency=${symbolsString}&api_key=${apiKey}`;
    
    console.log(`📡 Fetching prices for: ${symbolsString}`);
    
    const response = await fetch(url, { timeout: 10000 });
    
    if (!response.ok) {
      console.error(`❌ TraderMade API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    
    if (!data.quotes || !Array.isArray(data.quotes)) {
      console.error('❌ Invalid TraderMade response structure');
      return null;
    }

    const priceData: Record<string, PriceData> = {};
    
    for (const quote of data.quotes) {
      const symbol = quote.instrument || `${quote.base_currency}${quote.quote_currency}`;
      priceData[symbol] = {
        symbol,
        bid: parseFloat(quote.bid),
        ask: parseFloat(quote.ask),
        mid: (parseFloat(quote.bid) + parseFloat(quote.ask)) / 2
      };
    }

    return priceData;
  } catch (error) {
    console.error('❌ Error fetching TraderMade prices:', error);
    return null;
  }
}

function checkStopLoss(trade: TradeAlert, currentPrice: number, isBuyTrade: boolean): boolean {
  if (!trade.stop_loss || trade.stop_loss <= 0) return false;
  
  // Buy trades: SL hit when price <= SL
  // Sell trades: SL hit when price >= SL
  return isBuyTrade ? 
    currentPrice <= trade.stop_loss : 
    currentPrice >= trade.stop_loss;
}

function getHighestTpLevel(trade: TradeAlert): number {
  // Check which TP levels are defined and find the highest one
  const tpLevels = [];
  if (trade.tp1) tpLevels.push(1);
  if (trade.tp2) tpLevels.push(2);
  if (trade.tp3) tpLevels.push(3);
  if (trade.tp4) tpLevels.push(4);
  if (trade.tp5) tpLevels.push(5);
  
  return tpLevels.length > 0 ? Math.max(...tpLevels) : 1;
}

async function processTakeProfits(
  supabase: any, 
  trade: TradeAlert, 
  currentPrice: number, 
  isBuyTrade: boolean
): Promise<{ notifications: any[], allTpsHit: boolean }> {
  // Try using the optimized RPC function first
  const { data: result, error } = await supabase.rpc('process_tp_hits', {
    p_trade_id: trade.id,
    p_current_price: currentPrice,
    p_is_buy: isBuyTrade
  });

  if (error) {
    console.error('❌ Error with RPC process_tp_hits, falling back to manual processing:', error);
    return await manualTpProcessing(supabase, trade, currentPrice, isBuyTrade);
  }

  const notifications: any[] = [];

  // Create notifications for newly hit TPs
  if (result.tp_hits_this_cycle && result.tp_hits_this_cycle.length > 0) {
    console.log(`🎯 RPC detected TP hits for ${trade.asset_name}: [${result.tp_hits_this_cycle.join(', ')}]`);
    
    for (const tpLevel of result.tp_hits_this_cycle) {
      const notification = createTakeProfitNotification(trade, tpLevel, currentPrice);
      notifications.push(notification);
    }

    // If all TPs are now hit, add a final notification
    if (result.all_tps_hit && result.mask_updated) {
      const finalNotification = createAllTpHitNotification(trade, currentPrice);
      notifications.push(finalNotification);
    }
  }

  return { 
    notifications, 
    allTpsHit: result.all_tps_hit || false 
  };
}

async function manualTpProcessing(
  supabase: any,
  trade: TradeAlert,
  currentPrice: number,
  isBuyTrade: boolean
): Promise<{ notifications: any[], allTpsHit: boolean }> {
  const notifications: any[] = [];
  const currentTpHits = trade.tp_hits || [];
  const newTpHits = [...currentTpHits];
  
  // Check each TP level
  const tpLevels = [
    { level: 1, price: trade.tp1 },
    { level: 2, price: trade.tp2 },
    { level: 3, price: trade.tp3 },
    { level: 4, price: trade.tp4 },
    { level: 5, price: trade.tp5 }
  ];
  
  let newHitsThisCycle = [];
  
  for (const tp of tpLevels) {
    if (!tp.price || currentTpHits.includes(tp.level)) continue;
    
    const tpHit = isBuyTrade ? 
      currentPrice >= tp.price : 
      currentPrice <= tp.price;
      
    if (tpHit) {
      console.log(`🎯 Manual TP${tp.level} hit for ${trade.asset_name} at ${currentPrice} (target: ${tp.price})`);
      newTpHits.push(tp.level);
      newHitsThisCycle.push(tp.level);
      
      const notification = createTakeProfitNotification(trade, tp.level, currentPrice);
      notifications.push(notification);
    }
  }
  
  // Update the database if we have new hits
  if (newHitsThisCycle.length > 0) {
    const { error: updateError } = await supabase
      .from('trade_alerts')
      .update({
        tp_hits: newTpHits,
        updated_at: new Date().toISOString()
      })
      .eq('id', trade.id);
      
    if (updateError) {
      console.error('❌ Error updating TP hits:', updateError);
    }
  }
  
  // Check if all defined TPs are hit
  const definedTpCount = tpLevels.filter(tp => tp.price).length;
  const allTpsHit = definedTpCount > 0 && newTpHits.length >= definedTpCount;
  
  if (allTpsHit && newHitsThisCycle.length > 0) {
    const finalNotification = createAllTpHitNotification(trade, currentPrice);
    notifications.push(finalNotification);
  }
  
  return { notifications, allTpsHit };
}

async function closeTrade(supabase: any, tradeId: string, closeReason: string): Promise<void> {
  const { error } = await supabase
    .from('trade_alerts')
    .update({
      status: 'closed',
      close_reason: closeReason,
      updated_at: new Date().toISOString()
    })
    .eq('id', tradeId);

  if (error) {
    console.error(`❌ Error closing trade ${tradeId}:`, error);
  }
}

function createTakeProfitNotification(trade: TradeAlert, tpLevel: number, price: number): any {
  return {
    trade_alert_id: trade.id,
    notification_type: `tp${tpLevel}_hit`,
    title: `💰 TP${tpLevel} Hit! | ${trade.asset_name}`,
    message: `Xeon Stream (${trade.provider_name}): TP${tpLevel} hit at ${price.toFixed(5)}. Position remains active.`,
    data: {
      signal_id: trade.id,
      asset_name: trade.asset_name,
      symbol: trade.tradermade_symbol,
      tp_level: tpLevel,
      hit_price: price,
      alert_type: `tp${tpLevel}_hit`
    }
  };
}

function createAllTpHitNotification(trade: TradeAlert, price: number): any {
  return {
    trade_alert_id: trade.id,
    notification_type: 'all_tp_hit',
    title: `🚀 ALL TPs HIT! | ${trade.asset_name}`,
    message: `Xeon Stream (${trade.provider_name}): Final TP hit at ${price.toFixed(5)}. Trade completed successfully!`,
    data: {
      signal_id: trade.id,
      asset_name: trade.asset_name,
      symbol: trade.tradermade_symbol,
      hit_price: price,
      alert_type: 'all_tp_hit'
    }
  };
}

function createStopLossNotification(trade: TradeAlert, price: number, hadProfit: boolean): any {
  const title = hadProfit ? 
    `🔒 Closed in Profit | ${trade.asset_name}` : 
    `🚫 Stop Loss Hit! | ${trade.asset_name}`;
    
  const message = hadProfit ?
    `Xeon Stream (${trade.provider_name}): Remaining position closed at ${price.toFixed(5)}.` :
    `Xeon Stream (${trade.provider_name}): SL hit at ${price.toFixed(5)}. Trade closed.`;

  return {
    trade_alert_id: trade.id,
    notification_type: hadProfit ? 'sl_after_tp' : 'stop_loss',
    title,
    message,
    data: {
      signal_id: trade.id,
      asset_name: trade.asset_name,
      symbol: trade.tradermade_symbol,
      hit_price: price,
      alert_type: hadProfit ? 'sl_after_tp' : 'stop_loss'
    }
  };
}

async function sendXeonStreamNotifications(supabase: any, notifications: any[]): Promise<void> {
  try {
    // Get Xeon Stream subscribers
    const { data: subscribers, error: subscribersError } = await supabase.rpc('get_xeon_stream_subscribers');
    
    if (subscribersError || !subscribers || subscribers.length === 0) {
      console.log('📭 No Xeon Stream subscribers found');
      return;
    }

    console.log(`👥 Found ${subscribers.length} Xeon Stream subscribers`);

    // Send notifications via enhanced signal notification dispatcher
    const { data: result, error: dispatchError } = await supabase.functions.invoke(
      'enhanced-signal-notification-dispatcher',
      {
        body: {
          notifications: notifications.map(notification => ({
            ...notification,
            priority_level: 'high',
            delivery_channels: ['push', 'in_app'],
            target_users: subscribers.map((sub: any) => sub.user_id),
            include_creator: false
          }))
        }
      }
    );

    if (dispatchError) {
      console.error('❌ Error dispatching notifications:', dispatchError);
    } else {
      console.log('✅ Notifications dispatched successfully:', result);
    }

    // Log notification delivery attempts
    for (const notification of notifications) {
      await supabase
        .from('xeon_notification_log')
        .insert({
          trade_alert_id: notification.trade_alert_id,
          notification_type: notification.notification_type,
          target_users: subscribers.map((sub: any) => sub.user_id),
          delivery_status: { sent: subscribers.length, delivered: 0, failed: 0 }
        });
    }

  } catch (error) {
    console.error('❌ Error sending Xeon Stream notifications:', error);
  }
}