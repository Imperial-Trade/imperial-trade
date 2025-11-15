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
    // Enable OneSignal on production and staging domains
    const hostname = window.location.hostname;
    const isProduction = hostname === 'tradeimperial.com' || hostname === 'www.tradeimperial.com';
    const isStaging = hostname.includes('lovableproject.com') || hostname.includes('vercel.app') || hostname.includes('netlify.app');
    const isDev = import.meta.env.DEV;
    
    if (!isProduction && !isStaging && !isDev) {
      console.log('🔔 OneSignal skipped - unsupported domain');
      setState(prev => ({ ...prev, isInitialized: true }));
      return;
    }

    console.log('🔔 OneSignal enabled on:', { hostname, isProduction, isStaging, isDev });

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
          } else if (permission === 'default' && user) {
            // ✅ AUTO-SUBSCRIBE: Request permission automatically for authenticated users
            console.log('🚀 [AUTO-SUBSCRIBE] User logged in, requesting push permission automatically...');
            
            // Small delay to avoid blocking the UI
            setTimeout(async () => {
              try {
                const granted = await OneSignal.Notifications.requestPermission();
                console.log('📋 [AUTO-SUBSCRIBE] Permission request result:', granted);
                
                if (granted) {
                  console.log('✅ [AUTO-SUBSCRIBE] Permission granted! User is now subscribed.');
                  
                  // Wait for player ID to be available
                  setTimeout(async () => {
                    const newPlayerId = await OneSignal.User.PushSubscription.id;
                    if (newPlayerId) {
                      setState(prev => ({ 
                        ...prev, 
                        isPushEnabled: true,
                        playerId: newPlayerId
                      }));
                      await updateUserProfile(newPlayerId);
                      console.log('🎉 [AUTO-SUBSCRIBE] User successfully auto-subscribed to push notifications!');
                    }
                  }, 1000);
                }
              } catch (error) {
                console.warn('⚠️ [AUTO-SUBSCRIBE] Failed to auto-request permission:', error);
                // Don't show error to user - this is a background operation
              }
            }, 2000); // 2 second delay after login for smoother UX
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
    // Check supported domains before proceeding
    const hostname = window.location.hostname;
    const isProduction = hostname === 'tradeimperial.com' || hostname === 'www.tradeimperial.com';
    const isStaging = hostname.includes('lovableproject.com') || hostname.includes('vercel.app') || hostname.includes('netlify.app');
    const isDev = import.meta.env.DEV;
    
    if (!isProduction && !isStaging && !isDev) {
      console.log('🔔 OneSignal not supported on this domain');
      toast({
        title: "Domain Not Supported",
        description: "Push notifications are only available on production and staging domains.",
        variant: "destructive",
      });
      return false;
    }

    if (isDev) {
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
    // Check supported domains before proceeding
    const hostname = window.location.hostname;
    const isProduction = hostname === 'tradeimperial.com' || hostname === 'www.tradeimperial.com';
    const isStaging = hostname.includes('lovableproject.com') || hostname.includes('vercel.app') || hostname.includes('netlify.app');
    const isDev = import.meta.env.DEV;
    
    if (!isProduction && !isStaging && !isDev) {
      toast({
        title: "Domain Not Supported",
        description: "Push notifications are only available on production and staging domains.",
        variant: "destructive",
      });
      return false;
    }

    if (isDev) {
      console.log('🔔 Development Mode: Mock push subscription');
      
      if (user) {
        try {
          // Update profile for development with mock player ID
          const { error } = await supabase
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
          
          if (error) {
            console.error('❌ Failed to update profile in dev mode:', error);
            toast({
              title: "Profile Update Failed",
              description: "Failed to save subscription status.",
              variant: "destructive",
            });
            return false;
          }
          
          // Update local state after successful database update
          setState(prev => ({ 
            ...prev, 
            isPushEnabled: true, 
            playerId: 'dev_mock_player_id' 
          }));
          
          toast({
            title: "Development Mode",
            description: "Mock push notifications enabled! You'll see in-app notifications instead.",
          });
        } catch (error) {
          console.error('❌ Error in dev mode subscription:', error);
          toast({
            title: "Subscription Failed",
            description: "Unable to enable notifications in development mode.",
            variant: "destructive",
          });
          return false;
        }
      } else {
        // Just update state if no user (shouldn't happen normally)
        setState(prev => ({ 
          ...prev, 
          isPushEnabled: true, 
          playerId: 'dev_mock_player_id' 
        }));
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
              try {
                await updateUserProfile(playerId);
                
                // Update local state after successful database update
                setState(prev => ({ 
                  ...prev, 
                  isPushEnabled: true,
                  playerId: playerId
                }));
                
                toast({
                  title: "Push Notifications Enabled",
                  description: "You'll now receive instant trade alerts!",
                });
              } catch (error) {
                console.error('❌ Failed to update profile after subscription:', error);
                toast({
                  title: "Profile Update Failed",
                  description: "Subscription succeeded but profile update failed. Please try again.",
                  variant: "destructive",
                });
                resolve(false);
                return;
              }
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
    // Check supported domains before proceeding
    const hostname = window.location.hostname;
    const isProduction = hostname === 'tradeimperial.com' || hostname === 'www.tradeimperial.com';
    const isStaging = hostname.includes('lovableproject.com') || hostname.includes('vercel.app') || hostname.includes('netlify.app');
    const isDev = import.meta.env.DEV;
    
    if (!isProduction && !isStaging && !isDev) {
      toast({
        title: "Domain Not Supported", 
        description: "Push notifications are only available on production and staging domains.",
        variant: "destructive",
      });
      return false;
    }

    if (isDev) {
      console.log('🔔 Development Mode: Cannot unsubscribe in dev mode');
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