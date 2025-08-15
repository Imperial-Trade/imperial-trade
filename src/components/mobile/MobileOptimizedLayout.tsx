import React, { ReactNode, useEffect } from 'react';
import { MobileBottomNav } from './MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/useSwipeGestures';

interface MobileOptimizedLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  enablePullToRefresh?: boolean;
  onRefresh?: () => void | Promise<void>;
  className?: string;
}

export function MobileOptimizedLayout({ 
  children, 
  showBottomNav = true,
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

  // Add mobile-specific viewport meta tag adjustments
  useEffect(() => {
    if (isMobile) {
      // Prevent zoom on input focus for iOS
      const viewport = document.querySelector('meta[name="viewport"]');
      if (viewport) {
        viewport.setAttribute(
          'content',
          'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover'
        );
      }

      // Add mobile app meta tags
      document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      
      const handleResize = () => {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      };
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
      };
    }
  }, [isMobile]);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className={cn(
      'min-h-screen bg-background relative overflow-x-hidden',
      showBottomNav && 'pb-20', // Account for bottom navigation
      className
    )}>
      {/* Mobile status bar overlay */}
      <div className="status-bar-overlay" />
      
      {/* Pull to refresh indicator */}
      {enablePullToRefresh && isRefreshing && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium animate-bounce-in">
          Refreshing...
        </div>
      )}
      
      {/* Main content */}
      <main className={cn(
        'min-h-screen',
        enablePullToRefresh && 'pull-to-refresh'
      )}>
        {children}
      </main>
      
      {/* Bottom navigation */}
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