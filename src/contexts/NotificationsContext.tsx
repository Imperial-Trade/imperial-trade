import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    // Auto-reset dismissal if permission changes back to default
    if (permission === 'default' && dismissed) {
      setDismissed(false);
      try { localStorage.removeItem(DISMISS_KEY); } catch {}
    }
  }, [permission, dismissed]);

  const dismissPrompt = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, '1'); } catch {}
  }, []);
  useEffect(() => {
    if (!user) return;
    if (isIframeBlocked) return;
    if (dismissed) return;
    if (!initialized) return;
    if (permission !== 'default') return;
    const t = setTimeout(() => {
      requestPermission().catch(() => {});
    }, 300);
    return () => clearTimeout(t);
  }, [user?.id, initialized, permission, dismissed, isIframeBlocked, requestPermission]);

  const value = useMemo<NotificationsContextValue>(() => ({
    permission,
    initialized,
    isGranted: isGranted && !!user,
    isIframeBlocked,
    isPromptDismissed: dismissed || !user || isIframeBlocked || (isGranted && !!user) || permission === 'denied',
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
