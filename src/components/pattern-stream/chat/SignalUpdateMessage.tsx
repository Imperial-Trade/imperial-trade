import { cn } from "@/lib/utils";
import type { RoomSignal } from "@/hooks/pattern-stream/types";
import { formatRoomSignalUpdateNotification } from "@/utils/formatRoomSignalUpdateNotification";
import type { MessageBubbleSurface } from "./MessageBubble";

interface SignalUpdateMessageProps {
  updateType: string;
  value?: unknown;
  signal?: RoomSignal | null;
  providerName?: string;
  surface?: MessageBubbleSurface;
  align?: "start" | "center" | "end";
}

/** Plain thread line under an updated signal card in chat (not a notification card). */
export function SignalUpdateMessage({
  updateType,
  value,
  signal,
  providerName,
  surface = "pattern",
  align = "center",
}: SignalUpdateMessageProps) {
  const insightLike = surface === "insight" || surface === "orderflowComments";
  const { message } = formatRoomSignalUpdateNotification(
    updateType,
    value,
    signal,
    providerName,
  );

  return (
    <div
      className={cn(
        "flex w-full py-1",
        align === "end"
          ? "justify-end"
          : align === "start"
            ? "justify-start"
            : "justify-center",
      )}
      role="status"
      aria-live="polite"
    >
      <p
        className={cn(
          "ps-system-message text-xs",
          align === "end"
            ? "text-right"
            : align === "start"
              ? "text-left"
              : "text-center",
          insightLike ? "text-muted-foreground" : undefined,
        )}
      >
        {message}
      </p>
    </div>
  );
}
