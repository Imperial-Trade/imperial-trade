import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// PHASE 4: Testing Infrastructure
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] [TEST] ${message}`, JSON.stringify(data, null, 2));
  } else {
    console.log(`[${timestamp}] [TEST] ${message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { test_type = 'trigger', signal_id } = await req.json().catch(() => ({}));
    
    log(`🧪 Starting test: ${test_type}`);

    const results: any = {};

    // Test 1: Check if trigger exists and is properly configured
    if (test_type === 'trigger' || test_type === 'all') {
      log('Testing database trigger configuration...');
      
      const { data: triggers, error: triggerError } = await supabase.rpc('check_triggers');
      
      if (triggerError) {
        log('Failed to check triggers:', triggerError);
        results.trigger_check = { status: 'error', error: triggerError.message };
      } else {
        results.trigger_check = { status: 'success', triggers };
      }
    }

    // Test 2: Check active subscriptions
    if (test_type === 'subscriptions' || test_type === 'all') {
      log('Testing subscription infrastructure...');
      
      const { data: subscriptions, error: subError } = await supabase
        .from('push_subscriptions')
        .select('*')
        .eq('subscription_active', true);

      results.subscriptions = {
        status: subError ? 'error' : 'success',
        count: subscriptions?.length || 0,
        error: subError?.message
      };

      log(`Found ${subscriptions?.length || 0} active subscriptions`);
    }

    // Test 3: Test notification dispatcher
    if (test_type === 'dispatcher' || test_type === 'all') {
      log('Testing notification dispatcher...');
      
      const testNotification = {
        notifications: [{
          signal_id: signal_id || 'test-signal-' + Date.now(),
          user_id: 'test-user',
          asset_name: 'TEST/USD',
          trade_type: 'buy',
          entry_price: 1.2345,
          stop_loss: 1.2300,
          tp1: 1.2400,
          symbol: 'TESTUSD',
          tradermade_symbol: 'TESTUSD',
          created_at: new Date().toISOString(),
          notification_type: 'signal_created',
          alert_type: 'signal_created',
          target_price: 1.2345,
          triggered_price: 1.2345,
          status: 'active',
          author_id: 'test-author',
          author_name: 'Test Author',
          delivery_channels: ['push']
        }]
      };

      try {
        const dispatcherResponse = await supabase.functions.invoke('signal-notification-dispatcher', {
          body: testNotification
        });

        results.dispatcher = {
          status: dispatcherResponse.error ? 'error' : 'success',
          data: dispatcherResponse.data,
          error: dispatcherResponse.error?.message
        };
      } catch (error) {
        results.dispatcher = {
          status: 'error',
          error: error.message
        };
      }
    }

    // Test 4: Check OneSignal configuration
    if (test_type === 'onesignal' || test_type === 'all') {
      log('Testing OneSignal configuration...');
      
      try {
        const configResponse = await supabase.functions.invoke('onesignal-config');
        results.onesignal = {
          status: configResponse.error ? 'error' : 'success',
          data: configResponse.data,
          error: configResponse.error?.message
        };
      } catch (error) {
        results.onesignal = {
          status: 'error',
          error: error.message
        };
      }
    }

    // Test 5: Check recent notification logs
    if (test_type === 'logs' || test_type === 'all') {
      log('Checking recent notification logs...');
      
      const { data: logs, error: logError } = await supabase
        .from('notification_delivery_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      results.recent_logs = {
        status: logError ? 'error' : 'success',
        count: logs?.length || 0,
        logs: logs || [],
        error: logError?.message
      };
    }

    log('🎯 Test completed:', results);

    return new Response(
      JSON.stringify({
        success: true,
        test_type,
        timestamp: new Date().toISOString(),
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    log('❌ Test failed:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});