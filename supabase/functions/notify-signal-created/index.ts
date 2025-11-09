// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 SIGNAL CREATED NOTIFIER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Handles notifications for:
// - Template 1: signal_created (BUY/SELL) - Regular market orders
// - Template 2: pending_limit_created (BUY LIMIT/SELL LIMIT)
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
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { signal, users, push_users } = await req.json();

    console.log('🚀 [Signal Created] Processing notification:', {
      signal_id: signal.id,
      asset: signal.asset_name,
      trade_type: signal.trade_type,
      total_users: users?.length || 0,
      push_users: push_users?.length || 0,
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Determine which template to use
    const templateKey = signal.trade_type?.includes('limit')
      ? 'pending_limit_created'
      : 'signal_created';

    const template = NOTIFICATION_TEMPLATES[templateKey](signal as SignalData);

    // 🚀 INSTANT: Send realtime notification (in-app)
    const realtimeResult = await sendRealtimeNotification(
      supabase,
      template,
      signal as SignalData,
      users || []
    );

    // 📱 ASYNC: Send push notification (doesn't block realtime)
    const pushResult = await sendPushNotification(
      supabase,
      template,
      signal as SignalData,
      push_users || []
    );

    return new Response(JSON.stringify({
      success: true,
      template_used: templateKey,
      realtime: realtimeResult,
      push: pushResult,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [Signal Created] Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

