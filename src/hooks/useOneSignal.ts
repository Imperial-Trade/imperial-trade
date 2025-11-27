import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './use-toast';
import { supabase } from '../integrations/supabase/client';

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

    // iOS PWA Detection
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || isInStandaloneMode;
    
    if (isIOS && !isPWA) {
      console.warn('⚠️ [iOS] Not running as PWA. Push notifications require "Add to Home Screen"');
      console.warn('📱 [iOS] Instructions: Safari → Share → Add to Home Screen → Open from Home Screen');
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
        console.log('🚀 [OneSignal] Initializing...', {
          platform: isIOS ? 'iOS' : 'Other',
          isPWA,
          userAgent: navigator.userAgent.substring(0, 50)
        });
        
        try {
          // Wait for OneSignal to be ready
          // CRITICAL: App ID must match index.html exactly
          await window.OneSignal.init({
            appId: "3ea69bee-8061-4dd7-8053-fc95779b0f1e",
            safari_web_id: "web.onesignal.auto.18b6e18e-7804-46d0-9cf7-7a5dce161e98",
            
            // Service worker paths (required for PWA on all platforms)
            serviceWorkerPath: '/OneSignalSDKWorker.js',
            serviceWorkerParam: { scope: '/' },
            
            // Disable ALL auto-prompts - we use custom Airbnb modal ONLY
            autoResubscribe: false,
            promptOptions: {
              slidedown: {
                prompts: [] // Empty array = no slidedown prompts at all
              }
            },
            
            notifyButton: {
              enable: false
            },
            
            allowLocalhostAsSecureOrigin: true,
          });
        } catch (initError: any) {
          // ✅ CRITICAL FIX: If SDK already initialized or AppID mismatch, treat as success
          if (initError.message?.includes('already initialized') || 
              initError.message?.includes('AppID')) {
            console.log('⚠️ [OneSignal] Init error but SDK is available:', initError.message);
          } else {
            throw initError; // Re-throw other errors
          }
        }

        setIsInitialized(true);
        console.log('✅ [OneSignal] Initialized successfully');

        // Check current subscription status
        const permission = await window.OneSignal.Notifications.permission;
        const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn;
        
        console.log('📊 [OneSignal] Permission:', permission, 'Subscribed:', isSubscribed);
        
        if (isSubscribed) {
          setIsPushEnabled(true);
          
          // ✅ SYNC: Ensure database matches OneSignal state + save Player ID
          if (user?.id) {
            // Get the OneSignal Player ID
            const playerId = await window.OneSignal.User.PushSubscription.id;
            
            const { error } = await supabase
              .from('profiles')
              .update({ 
                xeon_stream_subscription: true,
                device_token: playerId || null,
                device_platform: 'web',
                device_token_updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
            
            if (error) {
              console.error('❌ [Database] Failed to sync subscription + Player ID:', error);
            } else {
              console.log('✅ [Database] Synced subscription + Player ID:', playerId);
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
          
          // Update database with subscription status + Player ID
          if (user?.id) {
            let playerId = null;
            if (isNowSubscribed) {
              playerId = await window.OneSignal.User.PushSubscription.id;
            }
            
            const { error } = await supabase
              .from('profiles')
              .update({ 
                xeon_stream_subscription: isNowSubscribed,
                device_token: playerId,
                device_platform: isNowSubscribed ? 'web' : null,
                device_token_updated_at: new Date().toISOString()
              })
              .eq('id', user.id);
            
            if (error) {
              console.error('❌ [Database] Failed to update subscription + Player ID:', error);
            } else {
              console.log(`✅ [Database] Updated subscription to ${isNowSubscribed} + Player ID:`, playerId);
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

    // iOS PWA Check
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = ('standalone' in window.navigator) && (window.navigator as any).standalone;
    const isPWA = window.matchMedia('(display-mode: standalone)').matches || isInStandaloneMode;
    
    if (isIOS && !isPWA) {
      console.error('❌ [iOS] Cannot subscribe: Not in PWA mode');
      toast({
        title: "iOS Installation Required",
        description: "Tap Share → Add to Home Screen, then open from your home screen.",
        variant: "destructive",
      });
      return false;
    }

    try {
      console.log('🔔 [OneSignal] Starting subscription...', { isIOS, isPWA });

      // Request notification permission with timeout safety
      const permissionPromise = window.OneSignal.Notifications.requestPermission();
      const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve('timeout'), 15000)); // 15s timeout
      
      const permissionResult = await Promise.race([permissionPromise, timeoutPromise]);

      if (permissionResult === 'timeout') {
        console.warn('⚠️ [OneSignal] Permission request timed out');
        // Proceed as if denied or dismissed, don't hang forever
        toast({
          title: "Permission Request Timed Out",
          description: "Please check your browser settings to enable notifications manually.",
          variant: "destructive",
        });
        return false;
      }

      const permission = permissionResult;
      
      if (!permission) {
        console.warn('⚠️ [OneSignal] Permission denied');
        toast({
          title: "Permission Denied",
          description: isIOS 
            ? "Enable notifications in iOS Settings → Trade Imperial → Notifications" 
            : "Please enable notifications in your browser settings.",
          variant: "destructive",
        });
        return false;
      }

      // Opt in to push notifications
      await window.OneSignal.User.PushSubscription.optIn();
      
      // Wait for subscription ID to be available
      let playerId = await window.OneSignal.User.PushSubscription.id;
      let attempts = 0;
      while (!playerId && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        playerId = await window.OneSignal.User.PushSubscription.id;
        attempts++;
      }

      if (!playerId) {
        console.error('❌ [OneSignal] Failed to get Player ID after subscription');
        toast({
          title: "Subscription Error",
          description: "Could not get device ID. Please try again.",
          variant: "destructive",
        });
        return false;
      }

      console.log('✅ [OneSignal] Subscribed successfully!', {
        playerId,
        permission: 'granted'
      });

      // ✅ CRITICAL FIX: Update database to mark user as push-enabled + save Player ID
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            xeon_stream_subscription: true,
            device_token: playerId || null,
            device_platform: 'web',
            device_token_updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('❌ [Database] Failed to update subscription + Player ID:', error);
          // Don't fail the whole operation - user is still subscribed to OneSignal
        } else {
          console.log('✅ [Database] Updated subscription + Player ID:', playerId);
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

      // ✅ CRITICAL FIX: Update database to mark user as not push-enabled + clear Player ID
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ 
            xeon_stream_subscription: false,
            device_token: null,
            device_platform: null,
            device_token_updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        if (error) {
          console.error('❌ [Database] Failed to update subscription:', error);
        } else {
          console.log('✅ [Database] Updated subscription to false + cleared Player ID');
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

