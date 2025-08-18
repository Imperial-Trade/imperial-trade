
import React, { useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { TradingNotificationModal } from './TradingNotificationModal';
import { usePostLoginNotificationSetup } from '@/hooks/usePostLoginNotificationSetup';
import { useOneSignalRecovery } from '@/hooks/useOneSignalRecovery';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useWelcome } from '@/contexts/WelcomeContext';

const NotificationSetupManager: React.FC = () => {
  const { profile, user } = useAuth();
  const { needsRecovery } = useOneSignalRecovery();
  const { requestPermission, isGranted, hasSubscription, initialized } = useNotifications();
  const { hasSeenWelcome } = useWelcome();
  const location = useLocation();
  const {
    showNotificationModal,
    handleModalClose,
    handleNotificationEnabled
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

  // Auto-trigger OneSignal native prompt with retry logic - AFTER welcome animation
  useEffect(() => {
    const attemptPrompt = () => {
      // Allow auto native prompt on dashboard routes or "/" for authenticated users after welcome
      const shouldAttemptNativePrompt = 
        hasSeenWelcome && 
        !!user && 
        !!profile && 
        (location.pathname.startsWith('/dashboard') || location.pathname === '/');
      
      if (!shouldAttemptNativePrompt) {
        console.log('🎯 [Native Prompt] Waiting for welcome animation completion and correct route', {
          hasSeenWelcome,
          currentPath: location.pathname,
          allowedRoutes: 'dashboard routes or /',
          hasUser: !!user,
          hasProfile: !!profile
        });
        return;
      }
      
      if (!needsNativePrompt()) {
        // If not initialized yet, retry in 2 seconds
        if (!initialized && user && profile) {
          console.log('🎯 [Native Prompt] OneSignal not initialized yet, retrying in 2s');
          setTimeout(attemptPrompt, 2000);
        }
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

      // Skip auto-prompts on iOS/Safari (they ignore them anyway)
      const isIOSSafari = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                         (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome'));
      if (isIOSSafari) {
        console.log('🎯 [Native Prompt] 🚫 SKIPPING - iOS/Safari auto-prompts are ignored, requiring user gesture', {
          platform: 'iOS/Safari',
          userAction: 'User must manually trigger notification request via UI interaction'
        });
        return;
      }
    
      // Check cooldown in localStorage
      const lastPromptKey = 'imperial_onesignal_native_prompt_last';
      const lastDecisionKey = 'imperial_onesignal_permission_decision';
      const lastPromptTime = localStorage.getItem(lastPromptKey);
      const lastDecision = localStorage.getItem(lastDecisionKey);
      const cooldownMs = 10 * 60 * 1000; // 10 minutes
      
      // Allow bypass with URL parameter for testing
      const urlParams = new URLSearchParams(window.location.search);
      const forcePrompt = urlParams.get('prompt') === '1';
      
      // Skip if within cooldown and we actually showed a prompt before
      if (!forcePrompt && lastPromptTime && lastDecision && Date.now() - parseInt(lastPromptTime) < cooldownMs) {
        console.log('🎯 [Native Prompt] Skipping - within cooldown period after actual prompt', {
          lastPromptTime: new Date(parseInt(lastPromptTime)).toISOString(),
          lastDecision,
          timeRemaining: cooldownMs - (Date.now() - parseInt(lastPromptTime)),
          bypassHint: 'Add ?prompt=1 to URL to bypass cooldown'
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
          
          // Only set cooldown if we actually attempted a permission request
          if (result.finalPermission) {
            localStorage.setItem(lastPromptKey, Date.now().toString());
            localStorage.setItem(lastDecisionKey, result.finalPermission);
            console.log('🎯 [Native Prompt] Cooldown set after permission decision:', result.finalPermission);
          }
          
          console.log('🎯 [Native Prompt] Result:', result);
          
          if (result.success) {
            console.log('🎯 [Native Prompt] ✅ Successfully enabled notifications');
          } else {
            console.log('🎯 [Native Prompt] ❌ Failed or declined:', result.error);
          }
        } catch (error) {
          console.error('🎯 [Native Prompt] ❌ Error:', error);
          // Only set cooldown on actual errors, not early returns
          localStorage.setItem(lastPromptKey, Date.now().toString());
          localStorage.setItem(lastDecisionKey, 'error');
        }
      }, 1000);
    };

    // Start the prompt attempt
    attemptPrompt();
  }, [needsNativePrompt, requestPermission, user, profile, initialized, hasSeenWelcome, location.pathname]);

  // Enhanced logic: Show modal for two specific cases only:
  // 1. First-time setup: Permission NOT granted AND post-login hook wants to show modal
  // 2. Recovery: Permission IS granted but NO active subscription AND recovery needed AND post-login hook wants to show modal
  const shouldShowModal = hasSeenWelcome && 
                          (((!isGranted && showNotificationModal)) || 
                           ((isGranted && !hasSubscription && needsRecovery && showNotificationModal)));

  console.log('🎯 [Notification Setup] Manager state:', {
    showNotificationModal,
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
      onClose={handleModalClose}
      onNotificationEnabled={handleNotificationEnabled}
    />
  );
};

export default NotificationSetupManager;
