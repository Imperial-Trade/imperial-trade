
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import DashboardNav from './DashboardNav';
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { useWelcome } from '@/contexts/WelcomeContext';

export const DashboardLayout: React.FC = () => {
  const { hasSeenWelcome } = useWelcome();
  
  return (
    <div className="min-h-screen bg-black">
      {/* Top Navigation - Hidden during welcome animation */}
      {hasSeenWelcome && (
        <div className="animate-nav-cross-blur-in opacity-0">
          <DashboardNav />
        </div>
      )}
      
      {/* Main Content with Dynamic Top Padding */}
      <main 
        className={`relative ${hasSeenWelcome ? 'animate-dashboard-cross-blur-in' : 'opacity-0'}`}
      >
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};
