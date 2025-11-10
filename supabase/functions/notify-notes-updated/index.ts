// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📝 NOTES UPDATED NOTIFIER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Handles notifications for:
// - Template 9: notes_updated - When signal notes are modified
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
    const { signal, users, push_users } = await req.json();

    console.log('📝 [Notes Updated] Processing notification:', {
      signal_id: signal.id,
      asset: signal.asset_name,
      total_users: users?.length || 0,
      push_users: push_users?.length || 0,
    });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const template = NOTIFICATION_TEMPLATES['notes_updated'](signal as SignalData);

    // 🚀 INSTANT: Realtime
    const realtimeResult = await sendRealtimeNotification(
      supabase,
      template,
      signal as SignalData,
      users || []
    );

    // 📱 ASYNC: Push (notes updates typically don't need push)
    const pushResult = await sendPushNotification(
      supabase,
      template,
      signal as SignalData,
      push_users || []
    );

    return new Response(JSON.stringify({
      success: true,
      template_used: 'notes_updated',
      realtime: realtimeResult,
      push: pushResult,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('❌ [Notes Updated] Error:', error);
    return new Response(JSON.stringify({
      error: error.message,
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});


