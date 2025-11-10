// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 TAKE PROFIT 1 HIT NOTIFIER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dedicated handler for TP1 hits
// Separate function for easier debugging and monitoring
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';
import {
  NOTIFICATION_TEMPLATES,
  sendRealtimeNotification,
  sendPushNotification,
  type SignalData
} from "../_shared/notification-core.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { signal, triggered_price, pips, users, push_users } = await req.json();

    console.log('🎯 [TP1 Hit] Processing notification:', {
      signal_id: signal.id,
      asset: signal.asset_name,
      author: signal.author_name,
      triggered_price,
      pips,
      total_users: users?.length || 0,
      push_users: push_users?.length || 0,
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const signalData: SignalData = {
      ...signal,
      tp_number: 1,  // ✅ HARDCODED: This is TP1
      triggered_price,
      pips: pips || '+0.0 PIPS',
    };

    const template = NOTIFICATION_TEMPLATES['tp_hit'](signalData);

    // 🚀 INSTANT: Realtime
    const realtimeResult = await sendRealtimeNotification(
      supabase,
      template,
      signalData,
      users || []
    );

    // 📱 ASYNC: Push
    const pushResult = await sendPushNotification(
      supabase,
      template,
      signalData,
      push_users || []
    );

    console.log('✅ [TP1 Hit] Notification sent successfully:', {
      realtime: realtimeResult.success,
      push: pushResult.success,
    });

    return new Response(JSON.stringify({
      success: true,
      template_used: 'tp_hit',
      tp_number: 1,
      realtime: realtimeResult,
      push: pushResult,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [TP1 Hit] Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      tp_number: 1,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

