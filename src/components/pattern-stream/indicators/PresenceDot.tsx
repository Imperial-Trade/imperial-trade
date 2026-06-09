import { cn } from "@/lib/utils";

interface PresenceDotProps {
  online?: boolean;
  className?: string;
  size?: number;
}

export function PresenceDot({ online = false, className, size = 10 }: PresenceDotProps) {
  if (!online) return null;
  return (
    <span
      className={cn("ps-online-dot inline-block", className)}
      style={{ width: size, height: size }}
      aria-label="Online"
    />
  );
}

export function LivePulseDot({ className }: { className?: string }) {
  return <span className={cn("ps-pulse-dot", className)} aria-label="Live" />;
}
