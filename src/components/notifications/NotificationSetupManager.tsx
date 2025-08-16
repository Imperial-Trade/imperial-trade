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

  // Check if user needs OneSignal native prompt (relaxed gating)
  const needsNativePrompt = useCallback(() => {
    // Remove hard dependency on initialized and user - allow prompting during auth flow
    if (!user || !profile) {
      console.log('🎯 [Native Prompt] Waiting for user/profile data');
      return false;
    }
    
    // Case 1: User doesn't have OneSignal user (no player_id)
    const hasNoOneSignalUser = !profile.onesignal_player_id;
    
    // Case 2: User has OneSignal user but not subscribed to push notifications
    const hasOneSignalButNotSubscribed = profile.onesignal_player_id && !profile.push_subscription_active;
    
    // Case 3: Browser permission not granted yet
    const needsBrowserPermission = !isGranted;
    
    return hasNoOneSignalUser || hasOneSignalButNotSubscribed || needsBrowserPermission;
  }, [user, profile, initialized, isGranted]);

  // Auto-trigger OneSignal native prompt with retry logic
  useEffect(() => {
    const attemptPrompt = () => {
      if (!needsNativePrompt()) {
        // If not initialized yet, retry in 2 seconds
        if (!initialized && user && profile) {
          console.log('🎯 [Native Prompt] OneSignal not initialized yet, retrying in 2s');
          setTimeout(attemptPrompt, 2000);
        }
        return;
      }
    
      // Check cooldown in localStorage (reduced for testing)
      const lastPromptKey = 'imperial_onesignal_native_prompt_last';
      const lastPromptTime = localStorage.getItem(lastPromptKey);
      const cooldownMs = 10 * 60 * 1000; // 10 minutes for better testing
      
      // Allow bypass with URL parameter for testing
      const urlParams = new URLSearchParams(window.location.search);
      const forcePrompt = urlParams.get('prompt') === '1';
      
      if (!forcePrompt && lastPromptTime && Date.now() - parseInt(lastPromptTime) < cooldownMs) {
        console.log('🎯 [Native Prompt] Skipping - within cooldown period', {
          lastPromptTime: new Date(parseInt(lastPromptTime)).toISOString(),
          timeRemaining: cooldownMs - (Date.now() - parseInt(lastPromptTime)),
          bypassHint: 'Add ?prompt=1 to URL to bypass cooldown'
        });
        return;
      }
    
      // Check for iframe context (browsers block prompts in iframes)
      if (window.self !== window.top) {
        console.log('🎯 [Native Prompt] 🚫 SKIPPING - iframe context detected (Lovable builder)', {
          message: 'Test on deployed site outside iframe for native prompts',
          currentContext: 'iframe/builder'
        });
        return;
      }
    
      // Check if browser already denied permission
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        console.log('🎯 [Native Prompt] 🚫 SKIPPING - browser permission already denied', {
          browserPermission: Notification.permission,
          userAction: 'User must manually enable notifications in browser settings'
        });
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
          console.log('🎯 [Native Prompt] ✅ EXECUTING permission request', {
            userEmail: user?.email,
            initialized,
            browserPermission: typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
          });
          
          const result = await requestPermission();
          
          // Only set cooldown on actual permission attempts (not early returns)
          if (result.success !== undefined) {
            localStorage.setItem(lastPromptKey, Date.now().toString());
            console.log('🎯 [Native Prompt] Cooldown set for next attempt');
          }
          
          console.log('🎯 [Native Prompt] Result:', result);
          
          if (result.success) {
            console.log('🎯 [Native Prompt] ✅ Successfully enabled notifications');
          } else {
            console.log('🎯 [Native Prompt] ❌ Failed or declined:', result.error);
          }
        } catch (error) {
          console.error('🎯 [Native Prompt] ❌ Error:', error);
          localStorage.setItem(lastPromptKey, Date.now().toString());
        }
      }, 1000);
    };

    // Start the prompt attempt
    attemptPrompt();
  }, [needsNativePrompt, requestPermission, user, profile, initialized]);

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