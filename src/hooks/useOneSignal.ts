import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// OneSignal SDK - accessed globally from CDN script
declare global {
  interface Window {
    OneSignal: any;
    OneSignalDeferred: any[];
  }
}

interface UseOneSignalReturn {
  isInitialized: boolean;
  isPushEnabled: boolean;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
  getUserId: () => Promise<string | null>;
}

export const useOneSignal = (): UseOneSignalReturn => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);

  // Initialize OneSignal and check subscription status
  useEffect(() => {
    if (loading || !user) {
      console.log('⏳ [OneSignal] Waiting for authentication...');
      return;
    }

    if (typeof window.OneSignal === 'undefined') {
      console.log('⏳ [OneSignal] SDK not loaded yet, waiting...');
      // Wait for SDK to load
      const checkInterval = setInterval(() => {
        if (typeof window.OneSignal !== 'undefined') {
          clearInterval(checkInterval);
          initializeOneSignal();
        }
      }, 100);
      
      return () => clearInterval(checkInterval);
    } else {
      initializeOneSignal();
    }

    async function initializeOneSignal() {
      try {
        console.log('🚀 [OneSignal] Initializing...');
        
        // Wait for OneSignal to be ready
        await window.OneSignal.init({
          appId: "3ea69bee-8061-4d47-8053-fc95779b6f1e",
        });

        setIsInitialized(true);
        console.log('✅ [OneSignal] Initialized successfully');

        // Check current subscription status
        const permission = await window.OneSignal.Notifications.permission;
        const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn;
        
        console.log('📊 [OneSignal] Permission:', permission, 'Subscribed:', isSubscribed);
        
        if (isSubscribed) {
          setIsPushEnabled(true);
          
          // ✅ SYNC: Ensure database matches OneSignal state
          if (user?.id) {
            const { error } = await supabase
              .from('profiles')
              .update({ xeon_stream_subscription: true })
              .eq('id', user.id);
            
            if (error) {
              console.error('❌ [Database] Failed to sync xeon_stream_subscription:', error);
            } else {
              console.log('✅ [Database] Synced xeon_stream_subscription to true');
            }
          }
        } else {
          setIsPushEnabled(false);
        }

        // Listen for subscription changes
        window.OneSignal.User.PushSubscription.addEventListener('change', async (event: any) => {
          console.log('🔔 [OneSignal] Subscription changed:', event);
          const isNowSubscribed = event.current.optedIn;
          setIsPushEnabled(isNowSubscribed);
          
          // Update database
          if (user?.id) {
            const { error } = await supabase
              .from('profiles')
              .update({ xeon_stream_subscription: isNowSubscribed })
              .eq('id', user.id);
            
            if (error) {
              console.error('❌ [Database] Failed to update subscription status:', error);
            } else {
              console.log(`✅ [Database] Updated xeon_stream_subscription to ${isNowSubscribed}`);
            }
          }
        });

      } catch (error) {
        console.error('❌ [OneSignal] Initialization failed:', error);
      }
    }
  }, [loading, user]);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!isInitialized) {
      console.error('❌ [OneSignal] SDK not initialized');
      return false;
    }

    try {
      console.log('🔔 [OneSignal] Starting subscription...');

      // Request notification permission
      const permission = await window.OneSignal.Notifications.requestPermission();
      
      if (!permission) {
        console.warn('⚠️ [OneSignal] Permission denied');
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
        return false;
      }

      // Opt in to push notifications
      await window.OneSignal.User.PushSubscription.optIn();
      
      const userId = await window.OneSignal.User.PushSubscription.id;
      console.log('✅ [OneSignal] Subscribed successfully!', {
        userId,
        permission: 'granted'
      });

      // ✅ CRITICAL FIX: Update database to mark user as push-enabled
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ xeon_stream_subscription: true })
          .eq('id', user.id);

        if (error) {
          console.error('❌ [Database] Failed to update xeon_stream_subscription:', error);
          // Don't fail the whole operation - user is still subscribed to OneSignal
        } else {
          console.log('✅ [Database] Updated xeon_stream_subscription to true');
        }
      }

      setIsPushEnabled(true);

      toast({
        title: "Push Notifications Enabled! 🎉",
        description: "You'll now receive instant trade alerts.",
      });

      return true;
    } catch (error: any) {
      console.error('❌ [OneSignal] Subscription failed:', error);
      
      toast({
        title: "Subscription Failed",
        description: error.message || "Could not enable push notifications.",
        variant: "destructive",
      });

      return false;
    }
  }, [isInitialized, toast, user]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!isInitialized) {
      console.error('❌ [OneSignal] SDK not initialized');
      return false;
    }

    try {
      console.log('🔕 [OneSignal] Unsubscribing...');

      // Opt out of push notifications
      await window.OneSignal.User.PushSubscription.optOut();

      console.log('✅ [OneSignal] Unsubscribed successfully');

      // ✅ CRITICAL FIX: Update database to mark user as not push-enabled
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ xeon_stream_subscription: false })
          .eq('id', user.id);

        if (error) {
          console.error('❌ [Database] Failed to update xeon_stream_subscription:', error);
        } else {
          console.log('✅ [Database] Updated xeon_stream_subscription to false');
        }
      }

      setIsPushEnabled(false);

      toast({
        title: "Push Notifications Disabled",
        description: "You won't receive push notifications anymore.",
      });

      return true;
    } catch (error: any) {
      console.error('❌ [OneSignal] Unsubscribe failed:', error);
      
      toast({
        title: "Unsubscribe Failed",
        description: error.message || "Could not disable push notifications.",
        variant: "destructive",
      });

      return false;
    }
  }, [isInitialized, toast, user]);

  // Get current OneSignal user ID
  const getUserId = useCallback(async (): Promise<string | null> => {
    if (!isInitialized) {
      return null;
    }

    try {
      const userId = await window.OneSignal.User.PushSubscription.id;
      return userId;
    } catch (error) {
      console.error('❌ [OneSignal] Failed to get user ID:', error);
      return null;
    }
  }, [isInitialized]);

  return {
    isInitialized,
    isPushEnabled,
    subscribeToPush,
    unsubscribeFromPush,
    getUserId,
  };
};

