// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 TAKE PROFIT HIT NOTIFIER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Handles notifications for:
// - Template 4: tp_hit (TP1-TP5) - Individual take profit hits
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
    const { signal, tp_number, triggered_price, pips, users, push_users } = await req.json();

    console.log('🎯 [TP Hit] Processing notification:', {
      signal_id: signal.id,
      asset: signal.asset_name,
      tp_number,
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
      tp_number,
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

    return new Response(JSON.stringify({
      success: true,
      template_used: 'tp_hit',
      tp_number,
      realtime: realtimeResult,
      push: pushResult,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [TP Hit] Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


