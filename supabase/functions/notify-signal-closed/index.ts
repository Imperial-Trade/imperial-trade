// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔒 SIGNAL CLOSED NOTIFIER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Handles notifications for:
// - Template 6: manual_close - Manual closure
// - Template 7: manual_close_with_tp_hit - Closed in profits
// - Template 8: all_tps_hit - All TPs completed
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
    const { signal, close_reason, notification_type, pips, users, push_users } = await req.json();

    // Use notification_type if provided, otherwise fall back to close_reason
    const effectiveCloseReason = notification_type || close_reason || signal.close_reason || 'manual';

    console.log('🔒 [Signal Closed] Processing notification:', {
      signal_id: signal.id,
      asset: signal.asset_name,
      close_reason: effectiveCloseReason,
      notification_type,
      pips,
      total_users: users?.length || 0,
      push_users: push_users?.length || 0,
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ✅ FIX: Format pips correctly
    // Database trigger sends pips as a number (e.g., 1000)
    // We need to format it as a string with sign and " PIPS" suffix
    let formattedPips = '+0.0 PIPS';
    if (pips !== null && pips !== undefined) {
      const pipsNumber = typeof pips === 'number' ? pips : parseFloat(pips);
      if (!isNaN(pipsNumber)) {
        const sign = pipsNumber >= 0 ? '+' : '';
        formattedPips = `${sign}${pipsNumber.toFixed(1)} PIPS`;
      }
    }

    console.log('🔢 [Pips Formatting]:', {
      raw_pips: pips,
      pips_type: typeof pips,
      formatted_pips: formattedPips
    });

    const signalData: SignalData = {
      ...signal,
      pips: formattedPips,  // ✅ Use formatted pips string
    };

    // Determine which template to use based on close reason
    let templateKey: string;
    if (effectiveCloseReason === 'all_tps_hit') {
      templateKey = 'all_tps_hit';
    } else if (effectiveCloseReason === 'manual' && signal.tp_hits && signal.tp_hits.length > 0) {
      templateKey = 'manual_close_with_tp_hit';
    } else {
      templateKey = 'manual_close';
    }

    const template = NOTIFICATION_TEMPLATES[templateKey](signalData);

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
      template_used: templateKey,
      close_reason: effectiveCloseReason,
      realtime: realtimeResult,
      push: pushResult,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [Signal Closed] Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


