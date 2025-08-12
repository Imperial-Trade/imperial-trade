import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useOneSignal } from '@/hooks/useOneSignal';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationsContextValue {
  permission: NotificationPermission | 'unsupported';
  isGranted: boolean;
  initialized: boolean;
  isIframeBlocked: boolean;
  isPromptDismissed: boolean;
  requestPermission: () => Promise<void>;
  dismissPrompt: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

const DISMISS_KEY = 'notifications:permission:dismissed:v1';

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialized, permission, isGranted, requestPermission, isIframeBlocked } = useOneSignal();
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      return false;
    }
  });

  // Track previous permission to only reset dismissal when user manually changes settings
  const prevPermissionRef = useRef<NotificationPermission | 'unsupported' | undefined>(undefined);

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
    isIframeBlocked,
    isPromptDismissed: dismissed || !user || (isGranted && !!user) || permission === 'denied',
    requestPermission,
    dismissPrompt,
  }), [permission, initialized, isGranted, dismissed, user, isIframeBlocked, requestPermission, dismissPrompt]);

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};
