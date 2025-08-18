import React, { createContext, useContext, useMemo } from 'react';
import { useFallbackOneSignalEnhanced } from '@/hooks/useFallbackHooks';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationsContextValue {
  permission: NotificationPermission | 'unsupported';
  isGranted: boolean;
  hasSubscription: boolean;
  initialized: boolean;
  isIframeBlocked: boolean;
  requestPermission: () => Promise<{ success: boolean; error?: string; details?: any; finalPermission?: string }>;
  browserInfo?: any;
  browserInstructions?: string;
}

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { initialized, permission, isGranted, hasSubscription, requestPermission, isIframeBlocked, browserInfo, browserInstructions } = useFallbackOneSignalEnhanced();

  const value = useMemo<NotificationsContextValue>(() => ({
    permission,
    initialized,
    isGranted: isGranted, // Remove user dependency to allow prompt even before full auth
    hasSubscription,
    isIframeBlocked,
    requestPermission,
    browserInfo,
    browserInstructions,
  }), [permission, initialized, isGranted, hasSubscription, isIframeBlocked, requestPermission, browserInfo, browserInstructions]);

  return (
    <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationsProvider');
  return ctx;
};
