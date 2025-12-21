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
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        border: `1px solid ${isActive ? '#D4AF37' : colors.border.default}`,
        color: isActive ? '#D4AF37' : colors.text.secondary,
      }}
    >
      {icon}
    </button>
  );
}
