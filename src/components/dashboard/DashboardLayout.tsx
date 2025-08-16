
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import DashboardNav from './DashboardNav';
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { NotificationsPanel } from '@/components/notifications/NotificationsPanel';
import { MobileOptimizedLayout } from '@/components/mobile/MobileOptimizedLayout';
import { MobilePlatformDetector } from '@/components/mobile/MobilePlatformDetector';
import NotificationSetupManager from '@/components/notifications/NotificationSetupManager';
import { useIsMobile } from '@/hooks/use-mobile';

export const DashboardLayout: React.FC = () => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <MobilePlatformDetector>
        <MobileOptimizedLayout>
          <div className="min-h-screen bg-background">
            {/* Enhanced mobile-optimized background effects */}
            <div className="fixed inset-0 bg-gradient-to-br from-background via-muted/10 to-background pointer-events-none">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/2 via-transparent to-accent/2"></div>
            </div>

            {/* Enhanced Mobile Navigation Header with platform optimization */}
            <div className="mobile-header fixed top-0 left-0 right-0 z-40 transition-all duration-300"
                 style={{
                   backgroundColor: 'rgba(var(--background), 0.95)',
                   backdropFilter: 'var(--mobile-header-blur, blur(20px))',
                   WebkitBackdropFilter: 'var(--mobile-header-blur, blur(20px))',
                   borderBottom: '1px solid rgba(var(--border), 0.5)',
                   paddingTop: 'var(--mobile-safe-area-top, 0)',
                 }}>
              <DashboardNav />
            </div>
            
            {/* Enhanced Main Content with platform-aware spacing */}
            <main className="relative transition-all duration-300 mobile-scroll-container"
                  style={{
                    paddingTop: 'var(--mobile-header-height, 64px)',
                    paddingBottom: 'calc(var(--mobile-bottom-nav-height) + var(--mobile-safe-area-bottom, 0px))',
                    paddingLeft: 'var(--mobile-content-padding, 16px)',
                    paddingRight: 'var(--mobile-content-padding, 16px)',
                    minHeight: '100vh',
                    transform: 'translate3d(0, 0, 0)', // Hardware acceleration
                  }}>
              <Suspense fallback={<LoadingSpinner />}>
                <Outlet />
              </Suspense>
            </main>
          </div>
        </MobileOptimizedLayout>
      </MobilePlatformDetector>
    );
  }

  // Desktop layout (unchanged)
  return (
    <div className="min-h-screen bg-background">
      {/* Sophisticated Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-muted/30 to-background pointer-events-none">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-radial from-accent/8 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Top Navigation */}
      <DashboardNav />
      
      {/* Main Content with Dynamic Top Padding */}
      <main className="relative" style={{ paddingTop: 'var(--header-height, 4rem)' }}>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/5 to-transparent pointer-events-none"></div>
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};
