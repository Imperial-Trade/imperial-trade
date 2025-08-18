import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface FallbackNotificationsContextValue {
  permission: NotificationPermission | 'unsupported';
  isGranted: boolean;
  hasSubscription: boolean;
  initialized: boolean;
  isIframeBlocked: boolean;
  requestPermission: () => Promise<{ success: boolean; error?: string; details?: any; finalPermission?: string }>;
  browserInfo?: any;
  browserInstructions?: string;
}

const FallbackNotificationsContext = createContext<FallbackNotificationsContextValue | undefined>(undefined);

export const FallbackNotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const getBrowserName = () => {
    const userAgent = navigator.userAgent;
    if (userAgent.includes('Firefox')) return 'Firefox';
    if (userAgent.includes('Chrome')) return 'Chrome';
    if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
    if (userAgent.includes('Edge')) return 'Edge';
    return 'Unknown';
  };

  const getBrowserInstructions = (browserName: string) => {
    const instructions = {
      'Chrome': 'Push notifications have been disabled. In-app notifications are still active.',
      'Firefox': 'Push notifications have been disabled. In-app notifications are still active.',
      'Safari': 'Push notifications have been disabled. In-app notifications are still active.',
      'Edge': 'Push notifications have been disabled. In-app notifications are still active.'
    };
    return instructions[browserName as keyof typeof instructions] || 'Push notifications are disabled. In-app notifications remain active.';
  };

  const requestPermission = useCallback(async () => {
    return {
      success: false,
      error: 'Push notifications have been disabled',
      details: 'The application now uses in-app notifications instead of push notifications',
      finalPermission: 'denied'
    };
  }, []);

  const checkIframeBlocked = useCallback(() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  }, []);

  const value = useMemo<FallbackNotificationsContextValue>(() => {
    const browserName = getBrowserName();
    
    return {
      permission: 'denied',
      initialized: true,
      isGranted: false,
      hasSubscription: false,
      isIframeBlocked: checkIframeBlocked(),
      requestPermission,
      browserInfo: { name: browserName, version: 'N/A' },
      browserInstructions: getBrowserInstructions(browserName),
    };
  }, [requestPermission, checkIframeBlocked]);

  return (
    <FallbackNotificationsContext.Provider value={value}>
      {children}
    </FallbackNotificationsContext.Provider>
  );
};

export const useFallbackNotifications = () => {
  const ctx = useContext(FallbackNotificationsContext);
  if (!ctx) throw new Error('useFallbackNotifications must be used within FallbackNotificationsProvider');
  return ctx;
};