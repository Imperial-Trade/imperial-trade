import { cn } from "@/lib/utils";

interface MobileFilterButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function MobileFilterButton({
  icon,
  label,
  isActive,
  onClick
}: MobileFilterButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-200",
        "border backdrop-blur-sm",
        isActive
          ? "bg-primary/10 border-primary/50 text-primary shadow-sm"
          : "bg-background/60 border-border/40 text-muted-foreground hover:bg-accent/50 hover:border-border/60"
      )}
    >
      {icon}
    </button>
  );
}
