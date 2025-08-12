import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

    // Count admins with at least one relevant notification enabled
    const { data: settings, error: settingsErr } = await supabase
      .from('notification_settings')
      .select('admin_id, new_requests, resubmissions');

    if (settingsErr) throw settingsErr;

    // Ensure admin_id belongs to an admin profile
    const adminIds = (settings || [])
      .filter((s: any) => s.new_requests || s.resubmissions)
      .map((s: any) => s.admin_id);

    let count = 0;
    if (adminIds.length > 0) {
      const { data: profiles, error: profilesErr } = await supabase
        .from('profiles')
        .select('id, access_level, role')
        .in('id', adminIds)
        .or('access_level.eq.admin,role.eq.admin');

      if (profilesErr) throw profilesErr;
      const unique = new Set((profiles || []).map((p: any) => p.id));
      count = unique.size;
    }

    return new Response(JSON.stringify({ count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error('admin-notification-active-admins error:', error);
    return new Response(JSON.stringify({ error: String((error as any)?.message || error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
