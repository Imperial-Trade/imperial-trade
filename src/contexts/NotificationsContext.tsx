import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface NotificationsContextValue {
  permission: NotificationPermission | 'unsupported';
  isGranted: boolean;
  hasSubscription: boolean;
  initialized: boolean;
  isIframeBlocked: boolean;
  isPromptDismissed: boolean;
  requestPermission: () => Promise<{ success: boolean; error?: string; details?: any }>;
  dismissPrompt: () => void;
  browserInfo?: any;
  browserInstructions?: string;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const DISMISS_KEY = 'notifications:permission:dismissed:v1';

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialized, permission, isGranted, hasSubscription, requestPermission, isIframeBlocked, browserInfo, browserInstructions } = useOneSignal();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [dbSubscriptionStatus, setDbSubscriptionStatus] = useState<string>('unknown');

  // Track previous permission to only reset dismissal when user manually changes settings
  const prevPermissionRef = useRef<NotificationPermission | 'unsupported' | undefined>(undefined);

  // Fetch user's subscription status from database
  useEffect(() => {
    if (user) {
      const fetchSubscriptionStatus = async () => {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('onesignal_subscription_status')
            .eq('id', user.id)
            .single();
          
          if (data?.onesignal_subscription_status) {
            setDbSubscriptionStatus(data.onesignal_subscription_status);
          }
        } catch (err) {
          console.error('❌ Failed to fetch subscription status:', err);
        }
      };
      
      fetchSubscriptionStatus();
    }
  }, [user]);

  // Auto-verify subscription when user logs in
  useEffect(() => {
    if (user && initialized && permission === 'granted') {
      // Start the pg_notify listener for real-time notifications
      supabase.functions.invoke('signal-pgnotify-listener')
        .then(() => console.log('📡 PG Notify listener started'))
        .catch(err => console.error('❌ Failed to start PG Notify listener:', err));

      // Verify current subscription status
      supabase.functions.invoke('onesignal-verify-subscription', {
        body: { user_id: user.id }
      })
        .then(({ data }) => {
          console.log('✅ Subscription verified:', data);
          // Update local state with verified status
          if (data?.subscription_status) {
            setDbSubscriptionStatus(data.subscription_status);
          }
        })
        .catch(err => console.error('❌ Subscription verification failed:', err));
    }
  }, [user, initialized, permission]);

  useEffect(() => {
    // Only reset dismissal if permission transitioned from a decided state back to default
    if (
      permission === 'default' &&
      dismissed &&
      (prevPermissionRef.current === 'granted' || prevPermissionRef.current === 'denied')
    ) {
      setDismissed(false);
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
    }

    prevPermissionRef.current = permission;
  }, [permission, dismissed]);

  const dismissPrompt = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
  }, []);

  const value = useMemo<NotificationsContextValue>(() => ({
    permission,
    initialized,
    isGranted: isGranted && !!user,
    hasSubscription,
    isIframeBlocked,
    // Fix: Hide prompt if explicitly dismissed, not initialized, no user, OR actually subscribed in database
    isPromptDismissed: dismissed || !user || !initialized || dbSubscriptionStatus === 'subscribed',
    requestPermission,
    dismissPrompt,
    browserInfo,
    browserInstructions,
  }), [permission, initialized, isGranted, hasSubscription, dismissed, user, isIframeBlocked, requestPermission, dismissPrompt, browserInfo, browserInstructions, dbSubscriptionStatus]);

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};
