import { useSignalTheme } from "@/hooks/useSignalTheme";
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
  const { colors } = useSignalTheme();
  
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "h-9 w-9 rounded-xl flex items-center justify-center",
        "transition-all duration-300 ease-out",
        "hover:scale-110 active:scale-95"
      )}
      style={{
        background: isActive ? colors.state.active : colors.bg.surface,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1.5px solid ${isActive ? colors.border.active : colors.border.default}`,
        color: isActive ? colors.text.gold : colors.text.tertiary,
        boxShadow: isActive ? `0 0 15px ${colors.accent.gold}20` : 'none',
      }}
    >
      {icon}
    </button>
  );
}
