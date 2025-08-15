import React, { ReactNode, useEffect } from 'react';
import { MobileBottomNav } from './MobileBottomNav';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { usePullToRefresh } from '@/hooks/useSwipeGestures';
import { applyPlatformOptimizations, optimizeForMobilePerformance, setupPlatformGestures } from '@/utils/mobileDetection';

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

  // Enhanced mobile platform optimizations
  useEffect(() => {
    if (isMobile) {
      // Apply comprehensive platform optimizations
      const deviceInfo = applyPlatformOptimizations();
      optimizeForMobilePerformance();
      setupPlatformGestures();

      // Enhanced viewport handling
      document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      document.documentElement.style.setProperty('--viewport-width', `${window.innerWidth}px`);
      
      const handleResize = () => {
        // Debounced resize handling for better performance
        requestAnimationFrame(() => {
          document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
          document.documentElement.style.setProperty('--viewport-width', `${window.innerWidth}px`);
        });
      };
      
      const handleOrientationChange = () => {
        // Handle orientation change with delay to get correct dimensions
        setTimeout(() => {
          handleResize();
          // Scroll to top to handle iOS Safari address bar
          window.scrollTo(0, 1);
          window.scrollTo(0, 0);
        }, 100);
      };
      
      window.addEventListener('resize', handleResize, { passive: true });
      window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
      
      // Prevent iOS double-tap zoom
      let lastTouchEnd = 0;
      const preventDoubleTapZoom = (e: TouchEvent) => {
        const now = Date.now();
        if (now - lastTouchEnd <= 300) {
          e.preventDefault();
        }
        lastTouchEnd = now;
      };
      
      document.addEventListener('touchend', preventDoubleTapZoom, { passive: false });
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleOrientationChange);
        document.removeEventListener('touchend', preventDoubleTapZoom);
      };
    }
  }, [isMobile]);

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className={cn(
      'min-h-screen bg-background relative overflow-x-hidden',
      'ios-momentum-scroll android-scroll-performance', // Platform-specific scroll optimization
      showBottomNav && 'pb-20', // Account for bottom navigation
      className
    )}>
      {/* Enhanced Mobile status bar overlay with safe area support */}
      <div className="status-bar-overlay" 
           style={{ 
             height: 'var(--mobile-safe-area-top)',
             backgroundColor: 'transparent',
             position: 'fixed',
             top: 0,
             left: 0,
             right: 0,
             zIndex: 9999
           }} />
      
      {/* Enhanced pull to refresh indicator */}
      {enablePullToRefresh && isRefreshing && (
        <div className="fixed left-1/2 transform -translate-x-1/2 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium animate-bounce-in shadow-lg"
             style={{ 
               top: `calc(var(--mobile-safe-area-top) + 16px)`,
               backdropFilter: 'blur(10px)',
               willChange: 'transform'
             }}>
          Refreshing...
        </div>
      )}
      
      {/* Main content with enhanced mobile optimization */}
      <main className={cn(
        'min-h-screen relative',
        'will-change-transform', // Optimize for animations
        enablePullToRefresh && 'pull-to-refresh'
      )}
      style={{
        paddingTop: 'var(--mobile-safe-area-top)',
        paddingLeft: 'var(--mobile-safe-area-left)',
        paddingRight: 'var(--mobile-safe-area-right)',
        transform: 'translate3d(0, 0, 0)', // Hardware acceleration
      }}>
        {children}
      </main>
      
      {/* Enhanced bottom navigation with safe area */}
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
  const { triggerButtonPress } = require('@/hooks/useEnhancedHaptics').useEnhancedHaptics();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (haptic) {
      triggerButtonPress();
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