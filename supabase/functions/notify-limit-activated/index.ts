// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ LIMIT ACTIVATED NOTIFIER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Handles notifications for:
// - Template 3: limit_activated - When pending limit order activates
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
    const { signal, triggered_price, users, push_users } = await req.json();

    console.log('✅ [Limit Activated] Processing notification:', {
      signal_id: signal.id,
      asset: signal.asset_name,
      triggered_price,
      total_users: users?.length || 0,
      push_users: push_users?.length || 0,
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const signalData: SignalData = {
      ...signal,
      triggered_price: triggered_price || signal.entry_price,
    };

    const template = NOTIFICATION_TEMPLATES['limit_activated'](signalData);

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
      template_used: 'limit_activated',
      realtime: realtimeResult,
      push: pushResult,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [Limit Activated] Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


