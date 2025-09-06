import React, { useEffect, useState, useCallback } from 'react';
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
    OneSignal?: any;
    OneSignalDeferred?: any[];
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
    // Check if we're on a non-production domain - don't initialize OneSignal
    const hostname = window.location.hostname;
    const isProduction = hostname === 'tradeimperial.com' || hostname === 'www.tradeimperial.com';
    const isDev = import.meta.env.DEV;
    
    if (!isProduction || isDev) {
      console.log('🔔 OneSignal skipped - not on production domain');
      setState(prev => ({ ...prev, isInitialized: true }));
      return;
    }

    console.log('🔔 Initializing OneSignal...');
    
    try {
      // OneSignal is already initialized via CDN script in index.html
      // We just need to wait for it to be ready
      if (!window.OneSignalDeferred) {
        console.warn('⚠️ OneSignal SDK not loaded yet, initializing deferred queue...');
        window.OneSignalDeferred = [];
      }

      window.OneSignalDeferred.push(async function(OneSignal: any) {
        try {
          // OneSignal is ready, update our state
          setState(prev => ({ ...prev, isInitialized: true }));

          // Check current permission status
          const permission = await OneSignal.Notifications.permission;
          console.log('📋 Current OneSignal permission:', permission);
          
          if (permission === 'granted') {
            const playerId = await OneSignal.User.PushSubscription.id;
            console.log('✅ User already subscribed with Player ID:', playerId);
            
            setState(prev => ({ 
              ...prev, 
              isPushEnabled: true,
              playerId: playerId || null
            }));
            
            // Update user profile with OneSignal info
            if (playerId && user) {
              await updateUserProfile(playerId);
            }
          }

          // Set up listeners for permission and subscription changes
          OneSignal.Notifications.addEventListener('permissionChange', function(event: any) {
            console.log('🔄 OneSignal permission changed:', event);
            if (event.to === 'granted') {
              setState(prev => ({ ...prev, isPushEnabled: true }));
            } else {
              setState(prev => ({ ...prev, isPushEnabled: false, playerId: null }));
            }
          });

          OneSignal.User.PushSubscription.addEventListener('change', function(event: any) {
            console.log('🔄 OneSignal subscription changed:', event);
            const playerId = event.current.id;
            if (playerId) {
              setState(prev => ({ ...prev, playerId, isPushEnabled: true }));
              if (user) {
                updateUserProfile(playerId);
              }
            } else {
              setState(prev => ({ ...prev, playerId: null, isPushEnabled: false }));
              if (user) {
                // Update profile to remove OneSignal info
                supabase
                  .from('profiles')
                  .update({ 
                    onesignal_player_id: null,
                    push_subscription_active: false,
                    onesignal_subscription_status: 'unsubscribed'
                  })
                  .eq('id', user.id);
              }
            }
          });

          console.log('✅ OneSignal initialized successfully');
        } catch (error) {
          console.error('❌ OneSignal callback error:', error);
        }
      });

    } catch (error) {
      console.error('❌ Failed to initialize OneSignal:', error);
      setState(prev => ({ ...prev, isInitialized: true })); // Set as initialized to avoid infinite retries
      toast({
        title: "Push Notification Setup Failed",
        description: "Unable to initialize push notifications. Please try again later.",
        variant: "destructive",
      });
    }
  }, [user]);

  const updateUserProfile = async (playerId: string) => {
    if (!user) return;

    try {
      console.log('🔄 Updating user profile with OneSignal Player ID:', playerId);
      
      const { error } = await supabase
        .from('profiles')
        .update({ 
          onesignal_player_id: playerId,
          push_subscription_active: true,
          onesignal_subscription_status: 'subscribed',
          xeon_stream_subscription: true,
          xeon_stream_activated_at: new Date().toISOString(),
          onesignal_last_sync_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        console.error('❌ Failed to update user profile with OneSignal ID:', error);
        throw error;
      }
      
      console.log('✅ Successfully updated user profile with OneSignal Player ID');
    } catch (error) {
      console.error('❌ Error updating user profile:', error);
      throw error;
    }
  };

  const requestPermission = useCallback(async () => {
    // Check production domain before proceeding
    const hostname = window.location.hostname;
    const isProduction = hostname === 'tradeimperial.com' || hostname === 'www.tradeimperial.com';
    const isDev = import.meta.env.DEV;
    
    if (!isProduction || isDev) {
      console.log('🔔 Development Mode: Using mock push notifications');
      // In development, simulate successful permission grant
      setState(prev => ({ ...prev, isPushEnabled: true, playerId: 'dev_mock_player_id' }));
      toast({
        title: "Development Mode",
        description: "Mock push notifications enabled for testing",
      });
      return true;
    }

    if (!state.isInitialized) return false;

    setState(prev => ({ ...prev, isSubscriptionLoading: true, hasPrompted: true }));

    try {
      return new Promise((resolve) => {
        window.OneSignalDeferred.push(async function(OneSignal: any) {
          try {
            const permission = await OneSignal.Notifications.requestPermission();
            console.log('📋 OneSignal permission result:', permission);
            resolve(permission === true);
          } catch (error) {
            console.error('❌ Error requesting OneSignal permission:', error);
            toast({
              title: "Permission Request Failed",
              description: "Unable to request push notification permission.",
              variant: "destructive",
            });
            resolve(false);
          } finally {
            setState(prev => ({ ...prev, isSubscriptionLoading: false }));
          }
        });
      });
    } catch (error) {
      console.error('Failed to request push permission:', error);
      setState(prev => ({ ...prev, isSubscriptionLoading: false }));
      return false;
    }
  }, [state.isInitialized]);

  const subscribeToPush = useCallback(async () => {
    // Check production domain before proceeding
    const hostname = window.location.hostname;
    const isProduction = hostname === 'tradeimperial.com' || hostname === 'www.tradeimperial.com';
    const isDev = import.meta.env.DEV;
    
    if (!isProduction || isDev) {
      console.log('🔔 Development Mode: Mock push subscription');
      setState(prev => ({ ...prev, isPushEnabled: true, playerId: 'dev_mock_player_id' }));
      
      if (user) {
        // Update profile for development with mock player ID
        await supabase
          .from('profiles')
          .update({ 
            onesignal_player_id: 'dev_mock_player_id',
            push_subscription_active: true,
            onesignal_subscription_status: 'subscribed_dev',
            xeon_stream_subscription: true,
            xeon_stream_activated_at: new Date().toISOString(),
            onesignal_last_sync_at: new Date().toISOString(),
          })
          .eq('id', user.id);
        
        toast({
          title: "Development Mode",
          description: "Mock push notifications enabled! You'll see in-app notifications instead.",
        });
      }
      return true;
    }

    if (!state.isInitialized) return false;

    setState(prev => ({ ...prev, isSubscriptionLoading: true }));

    try {
      return new Promise((resolve) => {
        window.OneSignalDeferred.push(async function(OneSignal: any) {
          try {
            // Request permission first
            const permission = await OneSignal.Notifications.requestPermission();
            if (!permission) {
              console.log('❌ Permission denied for push notifications');
              toast({
                title: "Permission Required",
                description: "Please enable notifications to receive trade alerts.",
                variant: "destructive",
              });
              resolve(false);
              return;
            }

            // Get the player ID after successful subscription
            const playerId = await OneSignal.User.PushSubscription.id;
            
            if (!playerId) {
              console.warn('⚠️ No OneSignal Player ID available after subscription');
              toast({
                title: "Subscription Failed",
                description: "Unable to complete push notification setup.",
                variant: "destructive",
              });
              resolve(false);
              return;
            }

            console.log('✅ Successfully subscribed with Player ID:', playerId);
            
            if (user && playerId) {
              await updateUserProfile(playerId);
              toast({
                title: "Push Notifications Enabled",
                description: "You'll now receive instant trade alerts!",
              });
            }
            
            resolve(true);
          } catch (error) {
            console.error('❌ Failed to subscribe to push notifications:', error);
            toast({
              title: "Subscription Failed",
              description: "Unable to enable push notifications. Please try again.",
              variant: "destructive",
            });
            resolve(false);
          } finally {
            setState(prev => ({ ...prev, isSubscriptionLoading: false }));
          }
        });
      });
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      setState(prev => ({ ...prev, isSubscriptionLoading: false }));
      return false;
    }
  }, [state.isInitialized, user]);

  const unsubscribeFromPush = useCallback(async () => {
    // Check production domain before proceeding
    const hostname = window.location.hostname;
    const isProduction = hostname === 'tradeimperial.com' || hostname === 'www.tradeimperial.com';
    const isDev = import.meta.env.DEV;
    
    if (!isProduction || isDev) {
      console.log('🔔 Push notifications only available on production domain');
      return false;
    }

    if (!state.isInitialized) return false;

    setState(prev => ({ ...prev, isSubscriptionLoading: true }));

    try {
      return new Promise((resolve) => {
        window.OneSignalDeferred.push(async function(OneSignal: any) {
          try {
            // OptOut from OneSignal
            await OneSignal.User.PushSubscription.optOut();
            
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
            
            resolve(true);
          } catch (error) {
            console.error('❌ Failed to unsubscribe from push notifications:', error);
            toast({
              title: "Unsubscribe Failed",
              description: "Unable to disable push notifications. Please try again.",
              variant: "destructive",
            });
            resolve(false);
          } finally {
            setState(prev => ({ ...prev, isSubscriptionLoading: false }));
          }
        });
      });
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      setState(prev => ({ ...prev, isSubscriptionLoading: false }));
      return false;
    }
  }, [state.isInitialized, user]);

  // Initialize OneSignal when component mounts
  useEffect(() => {
    // OneSignal SDK is loaded via CDN script in index.html
    // Just initialize when component mounts
    initializeOneSignal();
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