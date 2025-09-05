import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImperialWelcomeAnimation } from './imperial-welcome-animation';
import { useWelcome } from '@/contexts/WelcomeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';

export const GlobalWelcomeOverlay: React.FC = () => {
  const { hasSeenWelcome, markWelcomeAsSeen } = useWelcome();
  const { user } = useAuth();
  const location = useLocation();

  const [isPlaying, setIsPlaying] = useState(false);
  
  console.info('[GlobalWelcome] State:', { hasSeenWelcome, isPlaying, userId: user?.id });

  // Don't show on public pages or if user not authenticated
  const isPublicPage = location.pathname === '/' || 
                       location.pathname.startsWith('/signin') || 
                       location.pathname.startsWith('/account-request') ||
                       location.pathname.startsWith('/legal/');

  // Once the overlay starts playing, keep it mounted until it finishes its own fade
  useEffect(() => {
    if (user && !isPublicPage && !hasSeenWelcome) {
      console.info('[GlobalWelcome] Starting welcome animation');
      setIsPlaying(true);
      
      // Failsafe: ensure overlay stops playing after 10s max
      const failsafe = setTimeout(() => {
        console.warn('[GlobalWelcome] Failsafe triggered, stopping overlay');
        setIsPlaying(false);
      }, 10000);
      
      return () => clearTimeout(failsafe);
    }
  }, [user, isPublicPage, hasSeenWelcome]);

  const showOverlay = !!user && !isPublicPage && (isPlaying || !hasSeenWelcome);

  if (!showOverlay) {
    return null;
  }

  // Render directly to document.body using portal for maximum control
  return createPortal(
    <ImperialWelcomeAnimation
      onComplete={() => {
        console.info('[GlobalWelcome] Animation completed, marking as seen');
        // Mark as seen immediately so dashboard can begin initializing underneath
        markWelcomeAsSeen();
        // But keep the overlay mounted to allow its 5s fade to complete in preview/prod
        setTimeout(() => {
          console.info('[GlobalWelcome] Stopping overlay playback');
          setIsPlaying(false);
        }, 5100);
      }}
    />,
    document.body
  );
};