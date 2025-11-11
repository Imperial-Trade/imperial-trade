import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface NotificationPromptContextType {
  hasSeenNotificationPrompt: boolean;
  markNotificationPromptAsSeen: () => Promise<void>;
  resetNotificationPromptForNewSession: () => void;
  shouldShowNotificationPrompt: boolean;
  setShouldShowNotificationPrompt: (show: boolean) => void;
  isSubscribedToPush: boolean;
}

const NotificationPromptContext = createContext<NotificationPromptContextType | undefined>(undefined);

export const useNotificationPrompt = () => {
  const context = useContext(NotificationPromptContext);
  if (context === undefined) {
    throw new Error('useNotificationPrompt must be used within a NotificationPromptProvider');
  }
  return context;
};

export const NotificationPromptProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [hasSeenNotificationPrompt, setHasSeenNotificationPrompt] = useState(true); // Default to true to prevent flash
  const [shouldShowNotificationPrompt, setShouldShowNotificationPrompt] = useState(false);
  const [isSubscribedToPush, setIsSubscribedToPush] = useState(false);

  useEffect(() => {
    if (!user?.id) {
      setHasSeenNotificationPrompt(true);
      setIsSubscribedToPush(false);
      return;
    }

    // Check database first (source of truth)
    const checkDatabaseSubscription = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('push_subscription_active, onesignal_player_id')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error checking push subscription:', error);
        return;
      }

      if (data?.push_subscription_active) {
        // User is subscribed in database - sync localStorage
        const promptKey = `imperial_notification_prompt_${user.id}`;
        const subscriptionKey = `imperial_push_subscribed_${user.id}`;
        localStorage.setItem(subscriptionKey, 'true');
        localStorage.setItem(promptKey, 'true');
        setIsSubscribedToPush(true);
        setHasSeenNotificationPrompt(true);
      } else {
        // Not subscribed in database, don't show prompt yet
        setIsSubscribedToPush(false);
        setHasSeenNotificationPrompt(false);
      }
    };

    checkDatabaseSubscription();
  }, [user?.id]);

  const markNotificationPromptAsSeen = async () => {
    if (!user?.id) return;
    
    // Verify database reflects subscription
    const { data } = await supabase
      .from('profiles')
      .select('push_subscription_active')
      .eq('id', user.id)
      .single();
    
    // Only mark as seen if actually subscribed in database
    if (data?.push_subscription_active) {
      const promptKey = `imperial_notification_prompt_${user.id}`;
      const subscriptionKey = `imperial_push_subscribed_${user.id}`;
      localStorage.setItem(promptKey, 'true');
      localStorage.setItem(subscriptionKey, 'true');
      setHasSeenNotificationPrompt(true);
      setIsSubscribedToPush(true);
      setShouldShowNotificationPrompt(false);
    }
  };

  const resetNotificationPromptForNewSession = () => {
    if (user?.id) {
      const promptKey = `imperial_notification_prompt_${user.id}`;
      localStorage.removeItem(promptKey);
      setHasSeenNotificationPrompt(false);
    }
  };

  return (
    <NotificationPromptContext.Provider value={{
      hasSeenNotificationPrompt,
      markNotificationPromptAsSeen,
      resetNotificationPromptForNewSession,
      shouldShowNotificationPrompt,
      setShouldShowNotificationPrompt,
      isSubscribedToPush
    }}>
      {children}
    </NotificationPromptContext.Provider>
  );
};