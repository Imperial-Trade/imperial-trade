
import React, { useState, useEffect } from 'react';
import { WelcomeModal } from '@/components/ui/welcome-modal';
import { useProfessionalToast } from '@/hooks/useProfessionalToast';

interface WelcomeExperienceProps {
  user: any;
  isNewUser?: boolean;
}

export const WelcomeExperience: React.FC<WelcomeExperienceProps> = ({
  user,
  isNewUser = false
}) => {
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const { celebrate } = useProfessionalToast();

  useEffect(() => {
    // Check if this is a new user's first visit
    if (isNewUser && user) {
      const hasSeenWelcome = localStorage.getItem(`welcome_shown_${user.id}`);
      
      if (!hasSeenWelcome) {
        // Show welcome modal after a brief delay
        setTimeout(() => {
          setShowWelcomeModal(true);
        }, 1000);
      }
    }
  }, [isNewUser, user]);

  const handleWelcomeClose = () => {
    setShowWelcomeModal(false);
    
    if (user) {
      localStorage.setItem(`welcome_shown_${user.id}`, 'true');
      
      // Show celebration toast after modal closes
      setTimeout(() => {
        celebrate(
          "🎉 Welcome to the Community!",
          "You now have access to premium trading tools and insights."
        );
      }, 500);
    }
  };

  return (
    <WelcomeModal
      isOpen={showWelcomeModal}
      onClose={handleWelcomeClose}
      userName={user?.user_metadata?.full_name || user?.email || 'Trader'}
    />
  );
};
