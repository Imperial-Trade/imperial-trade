import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const BUBBLE_WIDTHS = [168, 212, 144, 196, 128, 220] as const;

export function InsightChatMessageSkeleton({
  side = "inbound",
  index = 0,
}: {
  side?: "inbound" | "outbound";
  index?: number;
}) {
  const width = BUBBLE_WIDTHS[index % BUBBLE_WIDTHS.length];

  return (
    <div className={cn("flex w-full", side === "outbound" && "justify-end")}>
      <div
        className={cn(
          "flex max-w-[78%] items-end gap-2",
          side === "outbound" && "flex-row-reverse",
        )}
      >
        {side === "inbound" ? (
          <Skeleton className="h-7 w-7 shrink-0 rounded-full" />
        ) : null}
        <Skeleton className="h-[42px] rounded-2xl" style={{ width }} />
      </div>
    </div>
  );
}

export function InsightChatMessageListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <InsightChatMessageSkeleton
          key={i}
          index={i}
          side={i % 2 === 0 ? "inbound" : "outbound"}
        />
      ))}
    </>
  );
}

export function InsightChatInboxRowSkeleton() {
  return (
    <div className="flex items-center gap-3 border-b border-border/50 py-3">
      <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-4 w-2/5 max-w-[140px]" />
        <Skeleton className="h-3 w-4/5 max-w-[240px]" />
      </div>
    </div>
  );
}
