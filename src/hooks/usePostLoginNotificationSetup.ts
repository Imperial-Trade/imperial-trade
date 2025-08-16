import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationSetupState {
  shouldShow: boolean;
  hasBeenShown: boolean;
  userDecision: 'pending' | 'accepted' | 'declined' | 'dismissed';
  lastPromptTime: number | null;
}

const SETUP_DELAY = 3000; // 3 seconds after login
const COOLDOWN_PERIOD = 24 * 60 * 60 * 1000; // 24 hours
const STORAGE_KEY = 'imperial_notification_setup';

export const usePostLoginNotificationSetup = () => {
  const { user, loading } = useAuth();
  const [setupState, setSetupState] = useState<NotificationSetupState>({
    shouldShow: false,
    hasBeenShown: false,
    userDecision: 'pending',
    lastPromptTime: null
  });

  // Load saved state
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedState = JSON.parse(saved);
        setSetupState(prev => ({ ...prev, ...parsedState }));
      }
    } catch (error) {
      console.warn('Failed to load notification setup state:', error);
    }
  }, []);

  // Save state changes
  const saveState = useCallback((newState: Partial<NotificationSetupState>) => {
    const updatedState = { ...setupState, ...newState };
    setSetupState(updatedState);
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
    } catch (error) {
      console.warn('Failed to save notification setup state:', error);
    }
  }, [setupState]);

  // Check if we should show the notification setup (synchronous)
  const shouldShowSetup = useCallback(() => {
    // Check for force prompt from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('prompt') === '1') {
      console.log('🎯 [Notification Setup] Force prompt detected from URL');
      return true;
    }

    // Don't show if user is not logged in or still loading
    if (!user || loading) return false;

    // Don't show if already accepted notifications
    if (setupState.userDecision === 'accepted') return false;

    // Check if user has previously declined and cooldown hasn't expired
    if (setupState.userDecision === 'declined' && setupState.lastPromptTime) {
      const timeSinceLastPrompt = Date.now() - setupState.lastPromptTime;
      if (timeSinceLastPrompt < COOLDOWN_PERIOD) return false;
    }

    // Don't show if dismissed recently (shorter cooldown for dismissals)
    if (setupState.userDecision === 'dismissed' && setupState.lastPromptTime) {
      const timeSinceLastPrompt = Date.now() - setupState.lastPromptTime;
      const dismissCooldown = 4 * 60 * 60 * 1000; // 4 hours
      if (timeSinceLastPrompt < dismissCooldown) return false;
    }

    // Check if browser supports notifications
    if (typeof window === 'undefined' || !('Notification' in window)) return false;

    // Check if permission was denied (don't show setup)
    if (Notification.permission === 'denied') return false;

    // Check OneSignal subscription status (primary source of truth)
    try {
      const storedStatus = sessionStorage.getItem(`onesignal_status_${user.id}`);
      if (storedStatus) {
        const status = JSON.parse(storedStatus);
        if (status.is_subscribed) {
          // Already subscribed according to OneSignal
          if (setupState.userDecision === 'pending') {
            saveState({ userDecision: 'accepted' });
          }
          return false;
        }
      }
    } catch (error) {
      console.warn('Error checking stored OneSignal status:', error);
    }

    // Check browser permission state
    if (Notification.permission === 'granted') {
      // Permission granted but not subscribed to OneSignal - show setup to recover
      return true;
    }

    // Permission is 'default' - show setup to request permission
    return true;
  }, [user, loading, setupState, saveState]);

  // Check for immediate prompt conditions and setup timer
  useEffect(() => {
    if (!user || loading) return;

    // Check for force prompt from URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('prompt') === '1') {
      console.log('🎯 [Notification Setup] Force prompt triggered');
      saveState({ 
        shouldShow: true, 
        hasBeenShown: true,
        lastPromptTime: Date.now(),
        userDecision: 'pending'
      });
      return;
    }

    // Don't continue if shouldn't show
    if (!shouldShowSetup()) return;

    console.log('🎯 [Notification Setup] Setup conditions met, scheduling prompt', {
      userDecision: setupState.userDecision,
      hasBeenShown: setupState.hasBeenShown,
      delay: SETUP_DELAY
    });

    const timer = setTimeout(() => {
      if (shouldShowSetup() && !setupState.hasBeenShown) {
        console.log('🎯 [Notification Setup] Showing notification setup modal');
        saveState({ 
          shouldShow: true, 
          hasBeenShown: true,
          lastPromptTime: Date.now()
        });
      }
    }, SETUP_DELAY);

    return () => clearTimeout(timer);
  }, [user, loading, shouldShowSetup, setupState.hasBeenShown, setupState.userDecision, saveState]);

  // Handle user accepting notifications
  const handleAccept = useCallback((preferences: any) => {
    console.log('🎯 [Notification Setup] User accepted notifications', { preferences });
    
    saveState({
      userDecision: 'accepted',
      shouldShow: false,
      lastPromptTime: Date.now()
    });

    // Store user preferences
    try {
      localStorage.setItem('notification_preferences', JSON.stringify(preferences));
    } catch (error) {
      console.warn('Failed to save notification preferences:', error);
    }

    // Clear force prompt URL parameter if present
    const url = new URL(window.location.href);
    if (url.searchParams.has('prompt')) {
      url.searchParams.delete('prompt');
      window.history.replaceState({}, '', url.toString());
    }
  }, [saveState]);

  // Handle user declining notifications
  const handleDecline = useCallback(() => {
    console.log('🎯 [Notification Setup] User declined notifications');
    
    saveState({
      userDecision: 'declined',
      shouldShow: false,
      lastPromptTime: Date.now()
    });

    // Clear force prompt URL parameter if present
    const url = new URL(window.location.href);
    if (url.searchParams.has('prompt')) {
      url.searchParams.delete('prompt');
      window.history.replaceState({}, '', url.toString());
    }
  }, [saveState]);

  // Handle user dismissing modal (maybe later)
  const handleDismiss = useCallback(() => {
    console.log('🎯 [Notification Setup] User dismissed modal');
    
    saveState({
      userDecision: 'dismissed',
      shouldShow: false,
      lastPromptTime: Date.now()
    });

    // Clear force prompt URL parameter if present
    const url = new URL(window.location.href);
    if (url.searchParams.has('prompt') && setupState.userDecision !== 'pending') {
      url.searchParams.delete('prompt');
      window.history.replaceState({}, '', url.toString());
    }
  }, [saveState, setupState.userDecision]);

  // Force show setup (for settings page)
  const forceShow = useCallback(() => {
    saveState({
      shouldShow: true,
      hasBeenShown: true,
      lastPromptTime: Date.now()
    });
  }, [saveState]);

  // Reset setup state (for testing)
  const resetSetup = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSetupState({
      shouldShow: false,
      hasBeenShown: false,
      userDecision: 'pending',
      lastPromptTime: null
    });
  }, []);

  return {
    shouldShow: setupState.shouldShow,
    userDecision: setupState.userDecision,
    handleAccept,
    handleDecline,
    handleDismiss,
    forceShow,
    resetSetup,
    canShow: shouldShowSetup()
  };
};