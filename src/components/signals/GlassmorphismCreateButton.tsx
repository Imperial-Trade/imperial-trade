import { Plus } from "lucide-react";
import { signalColors } from "@/lib/design-system/signalColors";
import { cn } from "@/lib/utils";

interface GlassmorphismCreateButtonProps {
  onClick: () => void;
}

export function GlassmorphismCreateButton({ onClick }: GlassmorphismCreateButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label="Create new alert"
      className={cn(
        "h-10 w-10 rounded-lg flex items-center justify-center",
        "transition-all duration-300 ease-out",
        "hover:scale-105 active:scale-95",
        "relative overflow-hidden group"
      )}
      style={{
        background: signalColors.state.ctaGradient,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${signalColors.border.cta}`,
      }}
    >
      <Plus 
        className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90"
        style={{
          color: signalColors.accent.gold,
        }}
      />
    </button>
  );
}
