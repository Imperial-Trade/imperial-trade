
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// OneSignal constants
const ONE_SIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

type SupportedEventType = "new_request" | "request_resubmitted" | "test";

interface Payload {
  type: SupportedEventType;
  requestId?: string;
  userEmail?: string;
  userName?: string;
  message?: string;
}

// Minimal helper: OneSignal send
async function sendOneSignalNotification(params: {
  apiKey: string;
  appId: string;
  includeExternalUserIds: string[];
  subject: string;
  message: string;
  targetChannel: "push" | "email";
}) {
  const body = {
    app_id: params.appId,
    include_external_user_ids: params.includeExternalUserIds,
    target_channel: params.targetChannel,
    headings: { en: params.subject },
    contents: { en: params.message },
  };

  const res = await fetch(ONE_SIGNAL_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Authorization": `Basic ${params.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  const ok = res.ok && !!json?.id;
  return { ok, status: res.status, json };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID") ?? "";
  const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY") ?? "";

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const payload: Payload = await req.json();
    const { type, requestId, userEmail, userName } = payload;

    console.log("account-request-notifications invoked:", payload);

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      throw new Error("OneSignal credentials are missing. Please set ONESIGNAL_APP_ID and ONESIGNAL_API_KEY secrets.");
    }

    // Resolve admin recipients
    // Find admin profiles (role or access_level indicates admin)
    const { data: admins, error: adminsErr } = await supabase
      .from("profiles")
      .select("id, access_level, role")
      .or("access_level.eq.admin,role.eq.admin");

    if (adminsErr) {
      console.error("Failed to fetch admins:", adminsErr);
      throw adminsErr;
    }

    let adminUserIds: string[] = (admins || []).map((a: any) => a.id).filter(Boolean);

    // Filter by notification settings depending on the event type
    if (type === "new_request" || type === "request_resubmitted") {
      if (adminUserIds.length > 0) {
        const { data: settings, error: settingsErr } = await supabase
          .from("notification_settings")
          .select("admin_id, new_requests, resubmissions");

        if (settingsErr) {
          console.error("Failed to fetch notification settings:", settingsErr);
          throw settingsErr;
        }

        const enabledSet = new Set(
          (settings || [])
            .filter((s: any) =>
              type === "new_request" ? s.new_requests : s.resubmissions
            )
            .map((s: any) => s.admin_id)
        );

        adminUserIds = adminUserIds.filter((id) => enabledSet.has(id));
      }
    }

    // If no recipients after filtering, return success but log "no recipients"
    if (adminUserIds.length === 0) {
      console.log("No admin recipients found for this event type or settings disabled.");
      // Log event with no recipients to help admins understand why they didn't receive
      await supabase.from("admin_notification_events").insert([
        {
          event_type: type,
          channels: [],
          subject: subjectFor(type),
          message: messageFor(type, userEmail, userName),
          recipients: { user_ids: [] },
          delivery_status: "sent",
          metadata: { requestId, userEmail, userName, note: "no-recipients" },
        },
      ]);
      return new Response(JSON.stringify({ success: true, note: "No recipients matched settings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Prepare content
    const subject = subjectFor(type);
    const message = messageFor(type, userEmail, userName);

    // Send push
    const pushRes = await sendOneSignalNotification({
      apiKey: ONESIGNAL_API_KEY,
      appId: ONESIGNAL_APP_ID,
      includeExternalUserIds: adminUserIds,
      subject,
      message,
      targetChannel: "push",
    });

    // Send email
    const emailRes = await sendOneSignalNotification({
      apiKey: ONESIGNAL_API_KEY,
      appId: ONESIGNAL_APP_ID,
      includeExternalUserIds: adminUserIds,
      subject,
      message,
      targetChannel: "email",
    });

    const channels: string[] = [];
    if (pushRes.ok) channels.push("push");
    if (emailRes.ok) channels.push("email");

    let delivery_status: "sent" | "failed" | "partial" = "failed";
    if (pushRes.ok && emailRes.ok) delivery_status = "sent";
    else if (pushRes.ok || emailRes.ok) delivery_status = "partial";

    const errorMsg = !pushRes.ok || !emailRes.ok
      ? JSON.stringify({
          push: { status: pushRes.status, body: pushRes.json },
          email: { status: emailRes.status, body: emailRes.json },
        })
      : null;

    // Log event
    const { error: logErr } = await supabase.from("admin_notification_events").insert([
      {
        event_type: type,
        channels,
        subject,
        message,
        recipients: { user_ids: adminUserIds },
        delivery_status,
        error: errorMsg,
        metadata: { requestId, userEmail, userName },
      },
    ]);
    if (logErr) console.error("Failed to log admin notification event:", logErr);

    return new Response(JSON.stringify({
      success: delivery_status !== "failed",
      delivery_status,
      push: pushRes.json,
      email: emailRes.json,
      recipients: adminUserIds.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Notification error:", error);

    // Best-effort log to events (unknown type)
    try {
      const bodyText = await req.text().catch(() => undefined);
      const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
      await supabase.from("admin_notification_events").insert([
        {
          event_type: "error",
          channels: [],
          subject: "Admin notification error",
          message: "An error occurred while sending a notification.",
          recipients: {},
          delivery_status: "failed",
          error: String(error?.message || error),
          metadata: { bodyText },
        },
      ]);
    } catch (e) {
      console.error("Failed to log error event:", e);
    }

    return new Response(JSON.stringify({ error: error?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function subjectFor(type: SupportedEventType): string {
  switch (type) {
    case "new_request": return "New Account Request - Action Required";
    case "request_resubmitted": return "Account Request Resubmitted - Review Required";
    case "test": return "Test Notification - Imperial Trading Admin";
  }
}

function messageFor(type: SupportedEventType, userEmail?: string, userName?: string): string {
  const now = new Date().toLocaleString();
  switch (type) {
    case "new_request":
      return `A new account request was submitted by ${userName || "a user"} (${userEmail || "email not provided"}) at ${now}.`;
    case "request_resubmitted":
      return `A previously rejected account request was resubmitted by ${userName || "a user"} (${userEmail || "email not provided"}) at ${now}.`;
    case "test":
      return `✅ Test notification sent at ${now}.`;
  }
}
