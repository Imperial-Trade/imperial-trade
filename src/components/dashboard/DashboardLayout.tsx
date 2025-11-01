
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import DashboardNav from './DashboardNav';
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { useWelcome } from '@/contexts/WelcomeContext';
import { AnimatedLinesBackground } from './AnimatedLinesBackground';

export const DashboardLayout: React.FC = () => {
  const { hasSeenWelcome } = useWelcome();
  
  return (
    <div className="min-h-screen">
      {/* Video Background with Glassmorphism Overlay */}
      <AnimatedLinesBackground />

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
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};
