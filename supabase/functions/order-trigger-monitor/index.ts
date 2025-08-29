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
    console.log('🚀 Starting order trigger monitor...');
    
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ Missing authorization header');
      return new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        message: 'Authorization header required' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create client with user context for role checking
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { authorization: authHeader } }
    });

    // Verify user and check role
    const { data: { user }, error: authError } = await userSupabase.auth.getUser();
    if (authError || !user) {
      console.error('❌ Invalid authorization:', authError);
      return new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        message: 'Invalid authorization token' 
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check user role
    const { data: profile, error: profileError } = await userSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('❌ Could not fetch user profile:', profileError);
      return new Response(JSON.stringify({ 
        error: 'Forbidden', 
        message: 'Could not verify user permissions' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const allowedRoles = ['admin', 'educator', 'moderator'];
    if (!allowedRoles.includes(profile.role)) {
      console.error('❌ Insufficient permissions. User role:', profile.role);
      return new Response(JSON.stringify({ 
        error: 'Forbidden', 
        message: 'Insufficient permissions to run order monitor' 
      }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`✅ Authorized user ${user.id} with role ${profile.role}`);
    
    // Use service role client for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const tradermadeApiKey = Deno.env.get('TRADERMADE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Fetch all pending limit orders
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
      console.log('ℹ️ No pending limit orders found');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No pending orders to process',
        processed: 0 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`📊 Found ${pendingOrders.length} pending limit orders`);

    // Step 2: Get unique symbols for price fetching
    const symbols = [...new Set(pendingOrders.map(order => 
      order.tradermade_symbol || order.asset_name
    ))];

    console.log('💰 Fetching current prices for symbols:', symbols);

    // Step 3: Fetch current prices from TraderMade API
    const pricePromises = symbols.map(async (symbol): Promise<PriceData | null> => {
      try {
        const response = await fetch(
          `https://marketdata.tradermade.com/api/v1/live?currency=${symbol}&api_key=${tradermadeApiKey}`
        );
        
        if (!response.ok) {
          console.error(`❌ Failed to fetch price for ${symbol}:`, response.status);
          return null;
        }
        
        const data = await response.json();
        
        if (data.quotes && data.quotes.length > 0) {
          const quote = data.quotes[0];
          return {
            symbol,
            bid: parseFloat(quote.bid),
            ask: parseFloat(quote.ask),
            price: (parseFloat(quote.bid) + parseFloat(quote.ask)) / 2
          };
        }
        
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

    console.log(`📈 Successfully fetched prices for ${priceMap.size} symbols`);

    // Step 4: Check each order for triggering conditions
    const triggeredOrders: string[] = [];
    const expiredOrders: string[] = [];
    
    for (const order of pendingOrders as PendingOrder[]) {
      const symbol = order.tradermade_symbol || order.asset_name;
      const priceData = priceMap.get(symbol);
      
      if (!priceData) {
        console.warn(`⚠️ No price data for symbol: ${symbol}`);
        continue;
      }

      // Check for expiration (Day orders only)
      if (order.expires_at && new Date(order.expires_at) < new Date()) {
        console.log(`⏰ Order ${order.id} has expired`);
        expiredOrders.push(order.id);
        continue;
      }

      // MT5 Triggering Logic: use Ask for Buy Limit, Bid for Sell Limit
      let shouldTrigger = false;
      let activationPrice = 0;
      const entryPrice = order.entry_price;

      if (order.trade_type === 'buy_limit') {
        // Trigger when ASK drops to or below entry price
        shouldTrigger = priceData.ask <= entryPrice;
        activationPrice = priceData.ask;
        console.log(`🔍 Buy Limit ${order.id}: Ask: ${priceData.ask}, Entry: ${entryPrice}, Trigger: ${shouldTrigger}`);
      } else if (order.trade_type === 'sell_limit') {
        // Trigger when BID rises to or above entry price
        shouldTrigger = priceData.bid >= entryPrice;
        activationPrice = priceData.bid;
        console.log(`🔍 Sell Limit ${order.id}: Bid: ${priceData.bid}, Entry: ${entryPrice}, Trigger: ${shouldTrigger}`);
      }

      if (shouldTrigger) {
        console.log(`🎯 TRIGGERED! Order ${order.id} (${order.trade_type}) at price ${activationPrice}`);
        triggeredOrders.push(order.id + ':' + activationPrice);
      }
    }

    // Step 5: Update triggered orders to active status
    const updateResults: any[] = [];

    if (triggeredOrders.length > 0) {
      console.log(`🔄 Activating ${triggeredOrders.length} triggered orders...`);

      for (const item of triggeredOrders) {
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
          .select('id, asset_name, trade_type, entry_price, user_id, activation_price');

        if (updateError) {
          console.error('❌ Error updating triggered order:', id, updateError);
          continue;
        }

        if (updated && updated.length > 0) {
          updateResults.push(updated[0]);
        }
      }
      console.log(`✅ Successfully activated ${updateResults.length} orders`);
    }

    // Step 6: Handle expired orders
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
        throw expireError;
      }
    }

    // Step 7: Send real-time notifications for triggered orders
    if (updateResults.length > 0) {
      console.log('📱 Sending real-time notifications...');
      
      for (const order of updateResults) {
        // Broadcast via Supabase Realtime
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
              triggeredAt: new Date().toISOString()
            }
          });

        if (broadcastError) {
          console.warn('⚠️ Failed to broadcast notification:', broadcastError);
        }
      }
    }

    const summary = {
      success: true,
      processed: pendingOrders.length,
      triggered: triggeredOrders.length,
      expired: expiredOrders.length,
      activatedOrders: updateResults.map(order => ({
        id: order.id,
        asset: order.asset_name,
        type: order.trade_type,
        price: order.entry_price
      })),
      timestamp: new Date().toISOString()
    };

    console.log('🎉 Order monitoring completed:', summary);

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('💥 Fatal error in order trigger monitor:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error', 
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});