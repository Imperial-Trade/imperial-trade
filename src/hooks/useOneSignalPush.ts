import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface OneSignalPushState {
  isInitialized: boolean;
  isPushEnabled: boolean;
  playerId: string | null;
  isSubscriptionLoading: boolean;
  hasPrompted: boolean;
}

declare global {
  interface Window {
    OneSignal: any;
  }
}

export const useOneSignalPush = () => {
  const { user } = useAuth();
  const [state, setState] = useState<OneSignalPushState>({
    isInitialized: false,
    isPushEnabled: false,
    playerId: null,
    isSubscriptionLoading: false,
    hasPrompted: false,
  });

  const initializeOneSignal = useCallback(async () => {
    if (state.isInitialized || !window.OneSignal) return;

    try {
      await window.OneSignal.init({
        appId: 'YOUR_ONESIGNAL_APP_ID', // This will be replaced with actual ID
        allowLocalhostAsSecureOrigin: true,
        autoRegister: false,
        autoResubscribe: false,
        notifyButton: {
          enable: false,
        },
      });

      // Check current push permission status
      const isPushEnabled = await window.OneSignal.isPushNotificationsEnabled();
      const playerId = await window.OneSignal.getUserId();

      setState(prev => ({
        ...prev,
        isInitialized: true,
        isPushEnabled,
        playerId,
      }));

      // Listen for permission changes
      window.OneSignal.on('notificationPermissionChange', (permission: boolean) => {
        setState(prev => ({
          ...prev,
          isPushEnabled: permission,
        }));
      });

      // Listen for subscription changes
      window.OneSignal.on('subscriptionChange', async (isSubscribed: boolean) => {
        if (isSubscribed) {
          const newPlayerId = await window.OneSignal.getUserId();
          setState(prev => ({
            ...prev,
            isPushEnabled: true,
            playerId: newPlayerId,
          }));
          
          // Update user profile with OneSignal player ID
          if (user && newPlayerId) {
            await updateUserProfile(newPlayerId);
          }
        } else {
          setState(prev => ({
            ...prev,
            isPushEnabled: false,
            playerId: null,
          }));
        }
      });

    } catch (error) {
      console.error('Failed to initialize OneSignal:', error);
      toast({
        title: "Push Notification Setup Failed",
        description: "Unable to initialize push notifications. Please try again later.",
        variant: "destructive",
      });
    }
  }, [state.isInitialized, user]);

  const updateUserProfile = async (playerId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onesignal_player_id: playerId,
          push_subscription_active: true,
          onesignal_subscription_status: 'subscribed',
        })
        .eq('id', user.id);

      if (error) {
        console.error('Failed to update user profile with OneSignal ID:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
    }
  };

  const requestPermission = useCallback(async () => {
    if (!state.isInitialized) return false;

    setState(prev => ({ ...prev, isSubscriptionLoading: true, hasPrompted: true }));

    try {
      await window.OneSignal.showSlidedownPrompt();
      return true;
    } catch (error) {
      console.error('Failed to request push permission:', error);
      toast({
        title: "Permission Request Failed",
        description: "Unable to request push notification permission.",
        variant: "destructive",
      });
      return false;
    } finally {
      setState(prev => ({ ...prev, isSubscriptionLoading: false }));
    }
  }, [state.isInitialized]);

  const subscribeToPush = useCallback(async () => {
    if (!state.isInitialized) return false;

    setState(prev => ({ ...prev, isSubscriptionLoading: true }));

    try {
      await window.OneSignal.registerForPushNotifications();
      const playerId = await window.OneSignal.getUserId();
      
      if (user && playerId) {
        await updateUserProfile(playerId);
        toast({
          title: "Push Notifications Enabled",
          description: "You'll now receive instant trade alerts!",
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      toast({
        title: "Subscription Failed",
        description: "Unable to enable push notifications. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setState(prev => ({ ...prev, isSubscriptionLoading: false }));
    }
  }, [state.isInitialized, user]);

  const unsubscribeFromPush = useCallback(async () => {
    if (!state.isInitialized) return false;

    setState(prev => ({ ...prev, isSubscriptionLoading: true }));

    try {
      await window.OneSignal.setSubscription(false);
      
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            push_subscription_active: false,
            onesignal_subscription_status: 'unsubscribed',
          })
          .eq('id', user.id);

        if (error) throw error;

        toast({
          title: "Push Notifications Disabled",
          description: "You'll no longer receive push notifications.",
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      toast({
        title: "Unsubscribe Failed",
        description: "Unable to disable push notifications. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setState(prev => ({ ...prev, isSubscriptionLoading: false }));
    }
  }, [state.isInitialized, user]);

  // Initialize OneSignal when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined' && window.OneSignal) {
      initializeOneSignal();
    }
  }, [initializeOneSignal]);

  // Load OneSignal SDK if not already loaded
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.OneSignal) {
      const script = document.createElement('script');
      script.src = 'https://cdn.onesignal.com/sdks/OneSignalSDK.js';
      script.async = true;
      script.onload = () => {
        initializeOneSignal();
      };
      document.head.appendChild(script);
    }
  }, [initializeOneSignal]);

  return {
    isInitialized: state.isInitialized,
    isPushEnabled: state.isPushEnabled,
    playerId: state.playerId,
    isSubscriptionLoading: state.isSubscriptionLoading,
    hasPrompted: state.hasPrompted,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
  };
};