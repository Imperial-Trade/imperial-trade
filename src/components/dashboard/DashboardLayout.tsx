
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import DashboardNav from './DashboardNav';
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { useWelcome } from '@/contexts/WelcomeContext';

export const DashboardLayout: React.FC = () => {
  const { hasSeenWelcome } = useWelcome();
  
  return (
    <div className="min-h-screen bg-background">
      {/* Sophisticated Background Effects */}
      <div className="fixed inset-0 bg-gradient-to-br from-background via-muted/30 to-background pointer-events-none">
        {/* Animated mesh gradient background */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-1/3 h-1/3 bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-gradient-radial from-accent/8 to-transparent rounded-full blur-3xl"></div>
      </div>

      {/* Top Navigation - Hidden during welcome animation */}
      {hasSeenWelcome && (
        <div className="animate-nav-cross-blur-in opacity-0">
          <DashboardNav />
        </div>
      )}
      
      {/* Main Content with Dynamic Top Padding */}
      <main 
        className={`relative ${hasSeenWelcome ? 'animate-dashboard-cross-blur-in' : 'opacity-0'} lg:pt-[var(--header-height,4rem)]`}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-muted/5 to-transparent pointer-events-none"></div>
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};
