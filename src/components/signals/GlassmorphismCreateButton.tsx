import { Plus } from "lucide-react";
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
        "transition-all duration-300",
        "hover:scale-105 active:scale-95",
        "relative overflow-hidden group"
      )}
      style={{
        background: 'rgba(255, 200, 50, 0.08)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: '1px solid rgba(255, 215, 0, 0.3)',
        boxShadow: `
          0 4px 12px rgba(255, 215, 0, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.2)
        `
      }}
    >
      <Plus 
        className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90"
        style={{
          background: 'linear-gradient(135deg, hsl(45, 70%, 70%), hsl(45, 80%, 50%), hsl(45, 90%, 30%))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}
      />
      
      {/* Hover glow effect */}
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg"
        style={{
          background: 'radial-gradient(circle at center, rgba(255, 215, 0, 0.2) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />
    </button>
  );
}
