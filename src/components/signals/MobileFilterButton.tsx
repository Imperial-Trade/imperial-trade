import { signalColors } from "@/lib/design-system/signalColors";
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
        "h-10 w-10 rounded-lg flex items-center justify-center",
        "transition-all duration-200 ease-out",
        "hover:scale-105 active:scale-95"
      )}
      style={{
        background: isActive ? signalColors.state.active : signalColors.bg.secondary,
        backdropFilter: 'blur(12px) saturate(180%)',
        WebkitBackdropFilter: 'blur(12px) saturate(180%)',
        border: `1px solid ${isActive ? signalColors.border.active : signalColors.border.default}`,
        color: isActive ? signalColors.text.gold : signalColors.text.tertiary,
      }}
    >
      {icon}
    </button>
  );
}
