import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushBody {
  title?: string;
  headings?: Record<string, string>;
  message: string;
  url?: string;
  data?: Record<string, string | number | boolean>;
  included_external_user_ids?: string[];
  included_segments?: string[]; // e.g., ["Subscribed Users"]
  filters?: any[]; // OneSignal filter expressions
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ONESIGNAL_API_KEY");
    const appId = Deno.env.get("ONESIGNAL_APP_ID");

    if (!apiKey || !appId) {
      return new Response(
        JSON.stringify({ error: "OneSignal not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Authorization: only admins may send broadcast pushes
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: authData, error: authErr } = await supabase.auth.getUser();
    if (authErr || !authData?.user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: isAdmin, error: roleErr } = await supabase.rpc('has_role', { _user_id: authData.user.id, _role: 'admin' });
    if (roleErr || !isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = (await req.json()) as PushBody;

    const payload: Record<string, unknown> = {
      app_id: appId,
      contents: body.headings ? body.headings : { en: body.message },
      headings: body.title ? { en: body.title } : undefined,
      url: body.url,
      data: body.data,
      included_external_user_ids: body.included_external_user_ids,
      included_segments: body.included_segments || ["Subscribed Users"],
      filters: body.filters,
    };

    const res = await fetch("https://api.onesignal.com/notifications", {
      method: "POST",
      headers: {
        Authorization: `Basic ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok) {
      console.error("OneSignal error:", json);
      return new Response(
        JSON.stringify({ error: json }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ success: true, result: json }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("push-broadcast failed", error);
    return new Response(
      JSON.stringify({ error: "Failed to send push" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
