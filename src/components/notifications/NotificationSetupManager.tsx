import React, { useEffect, useCallback } from 'react';
import TradingNotificationModal from './TradingNotificationModal';
import { usePostLoginNotificationSetup } from '@/hooks/usePostLoginNotificationSetup';
import { useOneSignalRecovery } from '@/hooks/useOneSignalRecovery';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';

const NotificationSetupManager: React.FC = () => {
  const { profile, user } = useAuth();
  const { needsRecovery } = useOneSignalRecovery();
  const { requestPermission, isGranted, hasSubscription, initialized } = useNotifications();
  const {
    shouldShow,
    handleAccept,
    handleDecline,
    handleDismiss
  } = usePostLoginNotificationSetup();

  // Check if user needs OneSignal native prompt
  const needsNativePrompt = useCallback(() => {
    if (!user || !profile || !initialized) return false;
    
    // Case 1: User doesn't have OneSignal user (no player_id)
    const hasNoOneSignalUser = !profile.onesignal_player_id;
    
    // Case 2: User has OneSignal user but not subscribed to push notifications
    const hasOneSignalButNotSubscribed = profile.onesignal_player_id && !profile.push_subscription_active;
    
    // Case 3: Browser permission not granted yet
    const needsBrowserPermission = !isGranted;
    
    return hasNoOneSignalUser || hasOneSignalButNotSubscribed || needsBrowserPermission;
  }, [user, profile, initialized, isGranted]);

  // Auto-trigger OneSignal native prompt for eligible users
  useEffect(() => {
    if (!needsNativePrompt()) return;
    
    // Check cooldown in localStorage (4 hours)
    const lastPromptKey = 'imperial_onesignal_native_prompt_last';
    const lastPromptTime = localStorage.getItem(lastPromptKey);
    const fourHoursMs = 4 * 60 * 60 * 1000;
    
    if (lastPromptTime && Date.now() - parseInt(lastPromptTime) < fourHoursMs) {
      console.log('🎯 [Native Prompt] Skipping - within cooldown period', {
        lastPromptTime: new Date(parseInt(lastPromptTime)).toISOString(),
        timeRemaining: fourHoursMs - (Date.now() - parseInt(lastPromptTime))
      });
      return;
    }
    
    // Check for iframe context (browsers block prompts in iframes)
    if (window.self !== window.top) {
      console.log('🎯 [Native Prompt] Skipping - iframe context detected');
      return;
    }
    
    // Check if browser already denied permission
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      console.log('🎯 [Native Prompt] Skipping - browser permission denied');
      return;
    }
    
    console.log('🎯 [Native Prompt] Auto-triggering for user:', {
      hasNoOneSignalUser: !profile?.onesignal_player_id,
      hasOneSignalButNotSubscribed: profile?.onesignal_player_id && !profile?.push_subscription_active,
      needsBrowserPermission: !isGranted,
      userEmail: user?.email
    });
    
    // Delay to ensure UI is ready
    setTimeout(async () => {
      try {
        const result = await requestPermission();
        
        // Update cooldown regardless of result
        localStorage.setItem(lastPromptKey, Date.now().toString());
        
        console.log('🎯 [Native Prompt] Result:', result);
        
        if (result.success) {
          console.log('🎯 [Native Prompt] Successfully enabled notifications');
        } else {
          console.log('🎯 [Native Prompt] Failed or declined:', result.error);
        }
      } catch (error) {
        console.error('🎯 [Native Prompt] Error:', error);
        localStorage.setItem(lastPromptKey, Date.now().toString());
      }
    }, 1000);
  }, [needsNativePrompt, requestPermission, user, profile]);

  // Enhanced logic: Show modal if user needs recovery OR if it's their first time
  const shouldShowModal = shouldShow || (needsRecovery && !!profile);

  console.log('🎯 [Notification Setup] Manager state:', {
    shouldShow,
    needsRecovery,
    needsNativePrompt: needsNativePrompt(),
    hasProfile: !!profile,
    shouldShowModal,
    userType: profile?.user_type,
    isGranted,
    hasSubscription,
    initialized,
    playerIdExists: !!profile?.onesignal_player_id,
    pushSubscriptionActive: profile?.push_subscription_active,
    isInIframe: window.self !== window.top,
    notificationPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  });

  return (
    <TradingNotificationModal
      isOpen={shouldShowModal}
      onClose={handleDismiss}
      onAccept={handleAccept}
      onDecline={handleDecline}
    />
  );
};

export default NotificationSetupManager;