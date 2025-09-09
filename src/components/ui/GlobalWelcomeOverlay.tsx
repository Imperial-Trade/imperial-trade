import React from 'react';
import { createPortal } from 'react-dom';
import { ImperialWelcomeAnimation } from './imperial-welcome-animation';
import { useWelcome } from '@/contexts/WelcomeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

export const GlobalWelcomeOverlay: React.FC = () => {
  // Guard against early rendering before AuthProvider is mounted
  if (!(window as any).__AUTH_PROVIDER_ACTIVE__) return null;
  
  const { hasSeenWelcome, markWelcomeAsSeen } = useWelcome();
  const { user } = useAuth();
  const location = useLocation();

  // Don't show on public pages or if user not authenticated
  const isPublicPage = location.pathname === '/' || 
                       location.pathname.startsWith('/signin') || 
                       location.pathname.startsWith('/account-request') ||
                       location.pathname.startsWith('/legal/');

  if (!user || isPublicPage || hasSeenWelcome) {
    return null;
  }

  // Render directly to document.body using portal for maximum control
  return createPortal(
    <ImperialWelcomeAnimation
      onComplete={markWelcomeAsSeen}
    />,
    document.body
  );
};