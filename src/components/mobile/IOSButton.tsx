import React, { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface IOSButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  haptic?: boolean;
  fullWidth?: boolean;
}

export function IOSButton({
  variant = 'primary',
  size = 'md',
  children,
  className,
  onClick,
  haptic = true,
  fullWidth = false,
  disabled,
  ...props
}: IOSButtonProps) {
  const { triggerHaptic } = useHapticFeedback();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (haptic && !disabled) {
      triggerHaptic('light');
    }
    onClick?.(e);
  };

  const baseClasses = cn(
    'touch-target font-medium rounded-xl transition-all duration-150',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'active:scale-95 transform',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
    fullWidth && 'w-full'
  );

  const variantClasses = {
    primary: cn(
      'bg-primary text-primary-foreground shadow-lg',
      'hover:bg-primary/90 active:bg-primary/80',
      'focus:ring-primary/20'
    ),
    secondary: cn(
      'bg-secondary text-secondary-foreground',
      'hover:bg-secondary/80 active:bg-secondary/70',
      'focus:ring-secondary/20'
    ),
    destructive: cn(
      'bg-destructive text-destructive-foreground shadow-lg',
      'hover:bg-destructive/90 active:bg-destructive/80',
      'focus:ring-destructive/20'
    ),
    outline: cn(
      'border border-border bg-background text-foreground',
      'hover:bg-accent active:bg-accent/80',
      'focus:ring-primary/20'
    ),
    ghost: cn(
      'text-foreground',
      'hover:bg-accent active:bg-accent/80',
      'focus:ring-primary/20'
    ),
    link: cn(
      'text-primary underline-offset-4',
      'hover:underline active:opacity-70',
      'focus:ring-primary/20'
    )
  };

  const sizeClasses = {
    sm: 'h-10 px-4 text-sm',
    md: 'h-12 px-6 text-base',
    lg: 'h-14 px-8 text-lg'
  };

  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      onClick={handleClick}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

// iOS-style segmented control
interface IOSSegmentedControlProps {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function IOSSegmentedControl({
  options,
  value,
  onChange,
  className
}: IOSSegmentedControlProps) {
  const { triggerHaptic } = useHapticFeedback();

  const handleChange = (newValue: string) => {
    if (newValue !== value) {
      triggerHaptic('selection');
      onChange(newValue);
    }
  };

  return (
    <div className={cn(
      'inline-flex rounded-xl bg-secondary p-1',
      'shadow-inner border border-border/50',
      className
    )}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => handleChange(option.value)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-150',
            'touch-target',
            value === option.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}