
import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { AuthenticatedHeader } from './AuthenticatedHeader';
import LoadingSpinner from '@/components/layout/LoadingSpinner';
import { useWelcome } from '@/contexts/WelcomeContext';

export const DashboardLayout: React.FC = () => {
  const { hasSeenWelcome } = useWelcome();
  
  return (
    <div className="h-screen overflow-hidden bg-black">
      {/* Glassmorphic Header - Desktop Only */}
      <AuthenticatedHeader />
      
      {/* Main Content */}
      <main 
        className={`relative h-full overflow-hidden ${hasSeenWelcome ? 'animate-dashboard-cross-blur-in' : 'opacity-0'}`}
      >
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};
