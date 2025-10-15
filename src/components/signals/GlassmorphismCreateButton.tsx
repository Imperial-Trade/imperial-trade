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
        background: `linear-gradient(135deg, ${signalColors.accent.gold}25 0%, ${signalColors.accent.gold}15 100%)`,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${signalColors.accent.gold}60`,
        boxShadow: `
          0 4px 15px ${signalColors.accent.gold}30,
          inset 0 1px 0 rgba(255, 255, 255, 0.2),
          0 0 20px ${signalColors.accent.gold}20
        `
      }}
    >
      <Plus 
        className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90"
        style={{
          color: signalColors.accent.gold,
          filter: `drop-shadow(0 0 8px ${signalColors.accent.gold}80)`,
        }}
      />
      
      {/* Enhanced hover glow */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, ${signalColors.accent.gold}40 0%, transparent 70%)`,
        }}
      />
    </button>
  );
}
