import { cn } from "@/lib/utils";
import { CSSProperties } from "react";

interface PsSkeletonProps {
  className?: string;
  style?: CSSProperties;
  width?: number | string;
  height?: number | string;
  rounded?: "sm" | "md" | "lg" | "xl" | "pill";
}

const radiusMap = { sm: 8, md: 12, lg: 16, xl: 20, pill: 9999 } as const;

export function PsSkeleton({ className, style, width, height = 16, rounded = "md" }: PsSkeletonProps) {
  return (
    <div
      className={cn("ps-skeleton", className)}
      style={{
        width,
        height,
        borderRadius: radiusMap[rounded],
        ...style,
      }}
    />
  );
}

export function PsSkeletonRoomCard() {
  return (
    <div className="liquid-glass" style={{ padding: 16, height: 200 }}>
      <div className="flex items-center gap-3 mb-3">
        <PsSkeleton width={40} height={40} rounded="md" />
        <div className="flex-1">
          <PsSkeleton width="60%" height={16} />
          <PsSkeleton width="40%" height={12} className="mt-2" />
        </div>
      </div>
      <PsSkeleton width="90%" height={12} className="mb-4" />
      <div className="grid grid-cols-4 gap-3 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <PsSkeleton width="100%" height={10} className="mb-2" />
            <PsSkeleton width="80%" height={14} />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <PsSkeleton width={70} height={24} rounded="pill" />
        <PsSkeleton width={70} height={24} rounded="pill" />
        <PsSkeleton width={70} height={24} rounded="pill" />
      </div>
    </div>
  );
}

const CHAT_BUBBLE_WIDTHS = [180, 220, 160, 200, 190, 240] as const;

export function PsSkeletonChatMessage({
  side = "inbound",
  index = 0,
}: {
  side?: "inbound" | "outbound";
  index?: number;
}) {
  const width = CHAT_BUBBLE_WIDTHS[index % CHAT_BUBBLE_WIDTHS.length];

  return (
    <div className={cn("flex w-full", side === "outbound" && "justify-end")}>
      <div className="flex max-w-[78%] items-end gap-2">
        {side === "inbound" && <PsSkeleton width={28} height={28} rounded="pill" />}
        <PsSkeleton width={width} height={42} rounded="lg" />
      </div>
    </div>
  );
}

export function PsSkeletonSignalCard() {
  return (
    <div className="liquid-glass" style={{ padding: 16, borderRadius: 20 }}>
      <div className="flex items-center gap-3 mb-3">
        <PsSkeleton width={32} height={32} rounded="pill" />
        <div className="flex-1">
          <PsSkeleton width="50%" height={14} />
          <PsSkeleton width="30%" height={10} className="mt-2" />
        </div>
        <PsSkeleton width={56} height={22} rounded="pill" />
      </div>
      <PsSkeleton width="40%" height={28} className="mb-3" />
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <PsSkeleton key={i} width="100%" height={36} rounded="md" />
        ))}
      </div>
    </div>
  );
}
