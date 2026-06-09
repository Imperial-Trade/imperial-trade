import { Bell } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RoomSignal } from "@/hooks/pattern-stream/types";
import { NotificationBadge } from "@/components/notifications/NotificationBadge";
import { ProfitLossDisplay } from "@/components/notifications/ProfitLossDisplay";
import {
  formatRoomSignalUpdateNotification,
  type SignalUpdateNotificationType,
} from "@/utils/formatRoomSignalUpdateNotification";

interface SignalUpdateActivityCardProps {
  updateType: string;
  value?: unknown;
  signal?: RoomSignal | null;
  providerName?: string;
  createdAt?: string;
  className?: string;
}

function formatNotifTimestamp(iso?: string): string {
  if (!iso) return "now";
  const diffMs = Date.now() - new Date(iso).getTime();
  if (diffMs < 60_000) return "now";
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function gradientClass(type: SignalUpdateNotificationType): string {
  const gradients: Record<string, string> = {
    new_signal: "from-blue-500/10 via-blue-500/5 to-transparent",
    tp_hit: "from-emerald-500/10 via-emerald-500/5 to-transparent",
    stop_loss: "from-red-500/10 via-red-500/5 to-transparent",
    trade_closed: "from-green-500/10 via-green-500/5 to-transparent",
    limit_activated: "from-blue-500/10 via-blue-500/5 to-transparent",
    manual_close: "from-gray-500/10 via-gray-500/5 to-transparent",
    notes_updated: "from-yellow-500/10 via-yellow-500/5 to-transparent",
  };
  return gradients[type] ?? "from-gray-500/10 via-gray-500/5 to-transparent";
}

function borderClass(type: SignalUpdateNotificationType): string {
  const borders: Record<string, string> = {
    new_signal: "border-l-blue-500",
    tp_hit: "border-l-emerald-500",
    stop_loss: "border-l-red-500",
    trade_closed: "border-l-green-500",
    limit_activated: "border-l-blue-500",
    manual_close: "border-l-gray-500",
    notes_updated: "border-l-yellow-500",
  };
  return borders[type] ?? "border-l-gray-500";
}

/** Notification-center card for Signals management → Recent activity. */
export function SignalUpdateActivityCard({
  updateType,
  value,
  signal,
  providerName,
  createdAt,
  className,
}: SignalUpdateActivityCardProps) {
  const notification = formatRoomSignalUpdateNotification(
    updateType,
    value,
    signal,
    providerName,
  );

  return (
    <Card
      className={cn(
        "w-full overflow-hidden border border-l-4 shadow-lg backdrop-blur-md bg-gradient-to-br border-border/50",
        gradientClass(notification.type),
        borderClass(notification.type),
        className,
      )}
    >
      <div className="p-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted/60">
              <Bell className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Insight · {formatNotifTimestamp(createdAt)}
            </div>
          </div>
        </div>

        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="truncate text-sm font-semibold text-foreground">
                {notification.providerName}
              </h4>
              <NotificationBadge type={notification.type} />
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {notification.assetName}
            </p>
          </div>
        </div>

        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
          {notification.message}
        </p>

        {notification.pipsData && notification.pipsData.value !== 0 ? (
          <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-border/40 pt-2.5">
            <ProfitLossDisplay pipsData={notification.pipsData} size="sm" />
          </div>
        ) : null}
      </div>
    </Card>
  );
}
