import React, { ReactNode, useEffect } from 'react';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileHeader } from './MobileHeader';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/useSwipeGestures';

interface MobileOptimizedLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  showHeader?: boolean;
  headerTitle?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  headerRightElement?: ReactNode;
  enablePullToRefresh?: boolean;
  onRefresh?: () => void | Promise<void>;
  className?: string;
}

export function MobileOptimizedLayout({ 
  children, 
  showBottomNav = true,
  showHeader = false,
  headerTitle,
  showBackButton = false,
  onBack,
  headerRightElement,
  enablePullToRefresh = false,
  onRefresh,
  className 
}: MobileOptimizedLayoutProps) {
  const isMobile = useIsMobile();
  const { addPullToRefreshListeners, isRefreshing } = usePullToRefresh(
    onRefresh || (() => {})
  );

  useEffect(() => {
    if (!isMobile || !enablePullToRefresh) return;

    const element = document.body;
    const cleanup = addPullToRefreshListeners(element);
    
    return cleanup;
  }, [isMobile, enablePullToRefresh, addPullToRefreshListeners]);

  // Add mobile-specific viewport meta tag adjustments and iOS optimizations
  useEffect(() => {
    if (isMobile) {
      // iOS-specific optimizations
      document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      document.documentElement.style.setProperty('--viewport-width', `${window.innerWidth}px`);
      
      // Add iOS app styling to body
      document.body.classList.add('ios-mobile-app');
      
      const handleResize = () => {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
        document.documentElement.style.setProperty('--viewport-width', `${window.innerWidth}px`);
      };
      
      const handleVisibilityChange = () => {
        // Force repaint on iOS when returning from background
        if (!document.hidden) {
          handleResize();
        }
      };
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.body.classList.remove('ios-mobile-app');
      };
    }
  }, [isMobile]);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className={cn(
      'ios-app-container relative overflow-x-hidden',
      showBottomNav && 'pb-[calc(5rem+var(--safe-area-bottom))]',
      showHeader && 'pt-[var(--mobile-header-height)]',
      className
    )}>
      {/* iOS-style header */}
      {showHeader && (
        <MobileHeader
          title={headerTitle}
          showBackButton={showBackButton}
          onBack={onBack}
          rightElement={headerRightElement}
        />
      )}
      
      {/* Pull to refresh indicator */}
      {enablePullToRefresh && isRefreshing && (
        <div className="fixed top-[calc(var(--mobile-header-height)+1rem)] left-1/2 transform -translate-x-1/2 z-40 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium animate-bounce-in shadow-lg">
          Refreshing...
        </div>
      )}
      
      {/* Main content */}
      <main className={cn(
        'min-h-[calc(100vh-var(--safe-area-top))]',
        enablePullToRefresh && 'pull-to-refresh'
      )}>
        {children}
      </main>
      
      {/* iOS-style bottom navigation */}
      {showBottomNav && <MobileBottomNav />}
    </div>
  );
}

// Enhanced mobile-friendly button component
interface MobileButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  haptic?: boolean;
  children: ReactNode;
}

export function MobileButton({ 
  variant = 'primary', 
  size = 'md', 
  haptic = true,
  className,
  children,
  onClick,
  ...props 
}: MobileButtonProps) {
  const { triggerHaptic } = require('@/hooks/useHapticFeedback').useHapticFeedback();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (haptic) {
      triggerHaptic('light');
    }
    onClick?.(e);
  };

  const baseClasses = 'mobile-button mobile-active touch-target font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20';
  
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-border bg-background hover:bg-accent',
    ghost: 'hover:bg-accent hover:text-accent-foreground'
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
      {...props}
    >
      {children}
    </button>
  );
}

// Mobile-optimized input component
interface MobileInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function MobileInput({ 
  label, 
  error, 
  className, 
  ...props 
}: MobileInputProps) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <input
        className={cn(
          'mobile-input w-full',
          error && 'border-destructive focus:border-destructive focus:ring-destructive/20',
          className
        )}
        {...props}
      />
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}