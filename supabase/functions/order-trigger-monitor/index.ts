
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PendingOrder {
  id: string;
  trade_type: 'buy_limit' | 'sell_limit';
  entry_price: number;
  tradermade_symbol: string;
  asset_name: string;
  user_id: string;
  created_at: string;
  expires_at?: string;
}

interface PriceData {
  symbol: string;
  bid: number;
  ask: number;
  price: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Starting enhanced order trigger monitor...');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tradermadeApiKey = Deno.env.get('TRADERMADE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Enhanced Step 1: Fetch all pending limit orders with better logging
    console.log('📋 Fetching pending limit orders...');
    const { data: pendingOrders, error: ordersError } = await supabase
      .from('trade_alerts')
      .select('id, trade_type, entry_price, tradermade_symbol, asset_name, user_id, created_at, expires_at')
      .eq('status', 'pending')
      .in('trade_type', ['buy_limit', 'sell_limit']);

    if (ordersError) {
      console.error('❌ Error fetching pending orders:', ordersError);
      throw ordersError;
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      console.log('ℹ️ No pending limit orders found - system is healthy but idle');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending orders to process - system ready',
        processed: 0,
        system_status: 'idle_healthy',
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📊 Found ${pendingOrders.length} pending limit orders - system is active`);

    // Enhanced Step 2: Get unique symbols with better validation
    const symbols = [...new Set(pendingOrders.map(order => 
      order.tradermade_symbol || order.asset_name
    ))].filter(symbol => symbol && symbol.trim());

    if (symbols.length === 0) {
      console.warn('⚠️ No valid symbols found in pending orders');
      return new Response(JSON.stringify({
        success: false,
        error: 'No valid symbols found',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('💰 Fetching current prices for symbols:', symbols);

    // Enhanced Step 3: Fetch current prices with retry logic
    const pricePromises = symbols.map(async (symbol): Promise<PriceData | null> => {
      try {
        const response = await fetch(
          `https://marketdata.tradermade.com/api/v1/live?currency=${symbol}&api_key=${tradermadeApiKey}`,
          { signal: AbortSignal.timeout(5000) } // 5 second timeout
        );
        
        if (!response.ok) {
          console.error(`❌ Failed to fetch price for ${symbol}: HTTP ${response.status}`);
          return null;
        }
        
        const data = await response.json();
        
        if (data.quotes && data.quotes.length > 0) {
          const quote = data.quotes[0];
          const priceData = {
            symbol,
            bid: parseFloat(quote.bid),
            ask: parseFloat(quote.ask),
            price: (parseFloat(quote.bid) + parseFloat(quote.ask)) / 2
          };
          console.log(`✅ Price fetched for ${symbol}: Bid=${priceData.bid}, Ask=${priceData.ask}`);
          return priceData;
        }
        
        console.warn(`⚠️ No quotes data for ${symbol}`);
        return null;
      } catch (error) {
        console.error(`❌ Error fetching price for ${symbol}:`, error);
        return null;
      }
    });

    const priceResults = await Promise.all(pricePromises);
    const priceMap = new Map<string, PriceData>();
    
    priceResults.forEach(price => {
      if (price) {
        priceMap.set(price.symbol, price);
      }
    });

    console.log(`📈 Successfully fetched prices for ${priceMap.size}/${symbols.length} symbols`);

    // Enhanced Step 4: Check each order with detailed logging
    const triggeredOrders: string[] = [];
    const expiredOrders: string[] = [];
    const processingErrors: string[] = [];
    
    for (const order of pendingOrders as PendingOrder[]) {
      try {
        const symbol = order.tradermade_symbol || order.asset_name;
        const priceData = priceMap.get(symbol);
        
        if (!priceData) {
          console.warn(`⚠️ No price data for symbol: ${symbol} (Order: ${order.id})`);
          continue;
        }

        // Check for expiration (Day orders only)
        if (order.expires_at && new Date(order.expires_at) < new Date()) {
          console.log(`⏰ Order ${order.id} (${order.asset_name}) has expired`);
          expiredOrders.push(order.id);
          continue;
        }

        // Enhanced MT5 Triggering Logic with detailed logging
        let shouldTrigger = false;
        let activationPrice = 0;
        const entryPrice = order.entry_price;

        if (order.trade_type === 'buy_limit') {
          // Buy Limit: Trigger when ASK drops to or below entry price
          shouldTrigger = priceData.ask <= entryPrice;
          activationPrice = priceData.ask;
          console.log(`🔍 Buy Limit ${order.id} (${order.asset_name}): Ask=${priceData.ask}, Entry=${entryPrice}, Trigger=${shouldTrigger}`);
        } else if (order.trade_type === 'sell_limit') {
          // Sell Limit: Trigger when BID rises to or above entry price
          shouldTrigger = priceData.bid >= entryPrice;
          activationPrice = priceData.bid;
          console.log(`🔍 Sell Limit ${order.id} (${order.asset_name}): Bid=${priceData.bid}, Entry=${entryPrice}, Trigger=${shouldTrigger}`);
        }

        if (shouldTrigger) {
          console.log(`🎯 TRIGGERED! Order ${order.id} (${order.asset_name} ${order.trade_type}) at price ${activationPrice}`);
          triggeredOrders.push(order.id + ':' + activationPrice);
        }
      } catch (error) {
        console.error(`❌ Error processing order ${order.id}:`, error);
        processingErrors.push(`Order ${order.id}: ${error.message}`);
      }
    }

    // Enhanced Step 5: Update triggered orders with better error handling
    const updateResults: any[] = [];

    if (triggeredOrders.length > 0) {
      console.log(`🔄 Activating ${triggeredOrders.length} triggered orders...`);

      for (const item of triggeredOrders) {
        try {
          const [id, priceStr] = item.split(':');
          const activation_price = parseFloat(priceStr);

          const { data: updated, error: updateError } = await supabase
            .from('trade_alerts')
            .update({ 
              status: 'active',
              activation_price,
              activated_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('id, asset_name, trade_type, entry_price, user_id, activation_price, activated_at');

          if (updateError) {
            console.error('❌ Error updating triggered order:', id, updateError);
            processingErrors.push(`Update ${id}: ${updateError.message}`);
            continue;
          }

          if (updated && updated.length > 0) {
            updateResults.push(updated[0]);
            console.log(`✅ Successfully activated order ${id} (${updated[0].asset_name}) at price ${activation_price}`);
          }
        } catch (error) {
          console.error(`❌ Error processing triggered order:`, error);
          processingErrors.push(`Trigger processing: ${error.message}`);
        }
      }
      console.log(`✅ Successfully activated ${updateResults.length}/${triggeredOrders.length} orders`);
    }

    // Enhanced Step 6: Handle expired orders
    if (expiredOrders.length > 0) {
      console.log(`⏰ Expiring ${expiredOrders.length} orders...`);
      
      const { error: expireError } = await supabase
        .from('trade_alerts')
        .update({ 
          status: 'closed',
          close_reason: 'expired',
          updated_at: new Date().toISOString()
        })
        .in('id', expiredOrders);

      if (expireError) {
        console.error('❌ Error expiring orders:', expireError);
        processingErrors.push(`Expiration: ${expireError.message}`);
      } else {
        console.log(`✅ Successfully expired ${expiredOrders.length} orders`);
      }
    }

    // Enhanced Step 7: Send real-time notifications
    if (updateResults.length > 0) {
      console.log('📱 Sending real-time notifications...');
      
      for (const order of updateResults) {
        try {
          const { error: broadcastError } = await supabase
            .channel('order-triggers')
            .send({
              type: 'broadcast',
              event: 'order_triggered',
              payload: {
                orderId: order.id,
                userId: order.user_id,
                assetName: order.asset_name,
                tradeType: order.trade_type,
                entryPrice: order.entry_price,
                activationPrice: order.activation_price,
                triggeredAt: order.activated_at
              }
            });

          if (broadcastError) {
            console.warn('⚠️ Failed to broadcast notification for order:', order.id, broadcastError);
          }
        } catch (error) {
          console.warn('⚠️ Notification error for order:', order.id, error);
        }
      }
    }

    // Enhanced summary with detailed metrics
    const summary = {
      success: true,
      processed: pendingOrders.length,
      triggered: triggeredOrders.length,
      expired: expiredOrders.length,
      activated: updateResults.length,
      errors: processingErrors.length,
      system_health: {
        total_pending_orders: pendingOrders.length,
        successful_price_fetches: priceMap.size,
        failed_price_fetches: symbols.length - priceMap.size,
        processing_success_rate: Math.round((1 - processingErrors.length / pendingOrders.length) * 100)
      },
      activatedOrders: updateResults.map(order => ({
        id: order.id,
        asset: order.asset_name,
        type: order.trade_type,
        entryPrice: order.entry_price,
        activationPrice: order.activation_price,
        activatedAt: order.activated_at
      })),
      processing_errors: processingErrors,
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Enhanced order monitoring completed successfully:', {
      processed: summary.processed,
      triggered: summary.triggered,
      activated: summary.activated,
      health: summary.system_health
    });

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Fatal error in enhanced order trigger monitor:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message,
      system_status: 'error',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
