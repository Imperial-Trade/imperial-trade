import React, { ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface MobileHeaderProps {
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  rightElement?: ReactNode;
  className?: string;
  transparent?: boolean;
}

export function MobileHeader({
  title,
  showBackButton = false,
  onBack,
  rightElement,
  className,
  transparent = false
}: MobileHeaderProps) {
  const navigate = useNavigate();
  const { triggerHaptic } = useHapticFeedback();

  const handleBack = () => {
    triggerHaptic('light');
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4',
      'mobile-header transition-all duration-300',
      transparent && 'bg-transparent border-transparent backdrop-blur-none',
      className
    )}>
      {/* Left side - Back button or spacer */}
      <div className="flex items-center min-w-[44px]">
        {showBackButton ? (
          <button
            onClick={handleBack}
            className="touch-target p-2 -ml-2 rounded-full hover:bg-black/5 active:bg-black/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : (
          <div className="w-6" />
        )}
      </div>

      {/* Center - Title */}
      <div className="flex-1 text-center">
        {title && (
          <h1 className="text-lg font-semibold text-foreground truncate px-4">
            {title}
          </h1>
        )}
      </div>

      {/* Right side - Custom element or spacer */}
      <div className="flex items-center min-w-[44px] justify-end">
        {rightElement || <div className="w-6" />}
      </div>
    </header>
  );
}

// iOS-style navigation bar button
interface MobileNavButtonProps {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export function MobileNavButton({ 
  children, 
  onClick, 
  disabled = false,
  className 
}: MobileNavButtonProps) {
  const { triggerHaptic } = useHapticFeedback();

  const handleClick = () => {
    if (!disabled) {
      triggerHaptic('light');
      onClick?.();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'touch-target px-3 py-1 rounded-lg font-medium text-sm',
        'text-primary hover:bg-primary/10 active:bg-primary/20',
        'disabled:text-muted-foreground disabled:hover:bg-transparent',
        'transition-colors duration-150',
        className
      )}
    >
      {children}
    </button>
  );
}