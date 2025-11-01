import React from 'react';
import { createPortal } from 'react-dom';
import { ModernImperialWelcome } from './modern-imperial-welcome';
import { useWelcome } from '@/contexts/WelcomeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { usePostHogOptimized } from '@/hooks/usePostHogOptimized';

export const GlobalWelcomeOverlay: React.FC = () => {
  const { hasSeenWelcome, markWelcomeAsSeen } = useWelcome();
  const { user } = useAuth();
  const location = useLocation();
  
  // Optimize PostHog timing to prevent conflicts
  usePostHogOptimized(hasSeenWelcome);

  // Don't show on public pages or if user not authenticated
  const isPublicPage = location.pathname === '/' || 
                       location.pathname.startsWith('/signin') || 
                       location.pathname.startsWith('/account-request') ||
                       location.pathname.startsWith('/reset-password') ||
                       location.pathname.startsWith('/legal/');

  if (!user || isPublicPage || hasSeenWelcome) {
    return null;
  }

  // Render directly to document.body using portal for maximum control
  return createPortal(
    <ModernImperialWelcome
      onComplete={markWelcomeAsSeen}
    />,
    document.body
  );
};