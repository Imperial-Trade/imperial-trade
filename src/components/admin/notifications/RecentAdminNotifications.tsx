import React, { useState } from "react";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Users,
  CheckCircle,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

type EventRow = {
  id: string;
  event_type: string;
  channels: string[];
  subject: string | null;
  message: string;
  delivery_status: string;
  sent_at: string;
  recipients: any;
  error?: string | null;
  metadata?: any;
};

const iconFor = (eventType: string) => {
  switch (eventType) {
    case "new_request":
      return <Users className="w-4 h-4 text-blue-600 mt-0.5" />;
    case "request_resubmitted":
      return <RefreshCw className="w-4 h-4 text-orange-600 mt-0.5" />;
    case "test":
      return <Bell className="w-4 h-4 text-indigo-600 mt-0.5" />;
    default:
      return <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />;
  }
};

const pillForStatus = (status: string) => {
  switch (status) {
    case "sent":
      return (
        <Badge className="bg-green-100 text-green-700 border border-green-200">
          Sent
        </Badge>
      );
    case "partial":
      return (
        <Badge className="bg-yellow-100 text-yellow-700 border border-yellow-200">
          Partial
        </Badge>
      );
    case "failed":
      return (
        <Badge className="bg-red-100 text-red-700 border border-red-200">
          Failed
        </Badge>
      );
    case "skipped":
      return (
        <Badge className="bg-gray-100 text-gray-700 border border-gray-200">
          Skipped
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

const countRecipients = (recipients: any): number => {
  if (!recipients) return 0;
  try {
    if (Array.isArray(recipients)) return recipients.length;
    if (typeof recipients === "object") {
      if (Array.isArray(recipients.user_ids)) return recipients.user_ids.length;
      if (Array.isArray(recipients.users)) return recipients.users.length;
      if (Array.isArray(recipients.emails)) return recipients.emails.length;
      return (Object.values(recipients) as any[]).reduce(
        (acc: number, val: any) => acc + (Array.isArray(val) ? val.length : 0),
        0
      );
    }
    return 0;
  } catch {
    return 0;
  }
};

const httpStatusMessage = (status: number): string => {
  switch (status) {
    case 400:
      return "Invalid request: missing or malformed fields.";
    case 401:
    case 403:
      return "Unauthorized: authentication or permissions issue.";
    case 404:
      return "Resource not found.";
    case 429:
      return "Rate limit reached. Please try again later.";
    default:
      if (status >= 500) return "Temporary service problem at the provider.";
      return "";
  }
};

const parseErrorToFriendly = (
  errorText?: string | null,
  metadata?: any
): string[] => {
  if (!errorText) return [];
  const lines: string[] = [];
  try {
    const obj = JSON.parse(errorText);
    if (typeof (obj as any).status === "number") {
      const msg = httpStatusMessage((obj as any).status);
      if (msg) lines.push(msg);
    }
    if (Array.isArray((obj as any).errors)) {
      (obj as any).errors.forEach((e: any) => {
        if (typeof e === "string") lines.push(e);
        else if (e?.message) lines.push(e.message);
      });
    } else if (typeof (obj as any).errors === "object" && (obj as any).errors) {
      Object.values((obj as any).errors).forEach((v: any) => {
        if (Array.isArray(v)) v.forEach((s: any) => lines.push(String(s)));
        else lines.push(String(v));
      });
    }
    if ((obj as any).error && typeof (obj as any).error === "string") {
      lines.push((obj as any).error);
    }
    if ((obj as any).message && typeof (obj as any).message === "string") {
      lines.push((obj as any).message);
    }
  } catch {
    lines.push(
      errorText.length > 200 ? errorText.slice(0, 200) + "…" : errorText
    );
  }
  if (lines.length === 0) {
    lines.push("A technical error occurred while sending this notification.");
  }
  return Array.from(new Set(lines.map((l) => l.trim()).filter(Boolean)));
};

const friendlyErrorForRow = (row: EventRow): string[] => {
  try {
    const recipientsCount = countRecipients(row.recipients);
    const note = (row as any)?.metadata?.note;
    if (
      row.delivery_status === "skipped" &&
      (recipientsCount === 0 || note === "no-recipients")
    ) {
      return [
        "No admins are subscribed to this notification type. Update your Notification Settings to receive these.",
      ];
    }
    if (row.delivery_status === "failed" || row.delivery_status === "partial") {
      return parseErrorToFriendly(
        (row as any).error as string | null,
        (row as any).metadata
      );
    }
    return [];
  } catch {
    return [];
  }
};

export const RecentAdminNotifications: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-notification-events", "recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_notification_events")
        .select("*")
        .order("sent_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return (data || []) as EventRow[];
    },
    meta: {
      onError: (err: any) =>
        logger.error("RecentAdminNotifications error", err),
    },
  });

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <CardContent>
        <div className="space-y-3">
          <div className="h-16 rounded-md bg-muted animate-pulse" />
          <div className="h-16 rounded-md bg-muted animate-pulse" />
          <div className="h-16 rounded-md bg-muted animate-pulse" />
        </div>
      </CardContent>
    );
  }

  if (error) {
    return (
      <CardContent>
        <div className="text-sm text-destructive">
          Failed to load recent activity.
        </div>
      </CardContent>
    );
  }

  if (!data || data.length === 0) {
    return (
      <CardContent>
        <div className="text-sm text-muted-foreground">
          No recent notifications.
        </div>
      </CardContent>
    );
  }

  return (
    <CardContent>
      <div className="space-y-3">
        {data.map((row) => {
          const errorText = (row as any).error as string | null;
          const friendlyLines = friendlyErrorForRow(row);
          const recipientCount = countRecipients(row.recipients);
          const isOpen = !!expanded[row.id];
          let rawPretty = errorText || "";
          try {
            if (errorText) {
              const parsed = JSON.parse(errorText);
              rawPretty = JSON.stringify(parsed, null, 2);
            }
          } catch {}
          return (
            <div
              key={row.id}
              className="flex items-start gap-3 p-3 rounded-lg border"
            >
              {iconFor(row.event_type)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">
                    {row.subject || row.event_type.replace(/_/g, " ")}
                  </p>
                  {pillForStatus(row.delivery_status)}
                </div>
                <p className="text-xs text-muted-foreground">{row.message}</p>
                {friendlyLines.length > 0 && (
                  <div className="text-xs text-destructive mt-1 space-y-0.5">
                    {friendlyLines.map((line, idx) => (
                      <p key={idx}>• {line}</p>
                    ))}
                  </div>
                )}
                {!!errorText && (
                  <button
                    className="text-xs underline text-muted-foreground mt-1"
                    onClick={() =>
                      setExpanded((prev) => ({
                        ...prev,
                        [row.id]: !prev[row.id],
                      }))
                    }
                  >
                    {isOpen
                      ? "Hide technical details"
                      : "View technical details"}
                  </button>
                )}
                {isOpen && !!errorText && (
                  <pre className="mt-2 text-[10px] bg-muted/50 p-2 rounded border overflow-x-auto">
                    {rawPretty}
                  </pre>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(row.sent_at), {
                    addSuffix: true,
                  })}{" "}
                  • Channels: {row.channels.join(", ") || "none"} • Recipients:{" "}
                  {recipientCount}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </CardContent>
  );
};
