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

          // ✅ FIXED: Check BOTH permission AND subscription status
          const permission = await OneSignal.Notifications.permission;
          const isSubscribed = await OneSignal.User.PushSubscription.optedIn;
          const playerId = await OneSignal.User.PushSubscription.id;
          
          console.log('📋 [OneSignal] Full Status Check:', {
            permission,
            isSubscribed,
            playerId,
            hasPlayerId: !!playerId
          });
          
          // ✅ User is TRULY subscribed only if:
          // 1. Permission is granted AND
          // 2. User is opted in (subscribed) AND
          // 3. Player ID exists
          const isTrulySubscribed = permission === 'granted' && isSubscribed && !!playerId;
          
          if (isTrulySubscribed) {
            console.log('✅ [OneSignal] User IS FULLY SUBSCRIBED with Player ID:', playerId);
            
            setState(prev => ({ 
              ...prev, 
              isPushEnabled: true,
              playerId: playerId
            }));
            
            // Update user profile with OneSignal info
            if (user) {
              await updateUserProfile(playerId);
            }
          } else if (permission === 'denied') {
            console.log('❌ [OneSignal] Push notifications DENIED by user');
            setState(prev => ({ ...prev, isPushEnabled: false, playerId: null }));
          } else if (permission === 'granted' && !isSubscribed) {
            console.log('⚠️ [OneSignal] Permission granted but NOT subscribed - treating as unsubscribed');
            setState(prev => ({ ...prev, isPushEnabled: false, playerId: null }));
          } else if (permission === 'granted' && isSubscribed && !playerId) {
            // ✅ FIX: Permission granted, user opted in, but NO PLAYER ID (broken state)
            console.warn('⚠️ [OneSignal] BROKEN STATE DETECTED: Permission granted, opted in, but NO Player ID!');
            console.log('🔧 [OneSignal] Attempting automatic fix via opt-out → opt-in...');
            
            try {
              // Opt out first
              await OneSignal.User.PushSubscription.optOut();
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Opt back in
              await OneSignal.User.PushSubscription.optIn();
              await new Promise(resolve => setTimeout(resolve, 3000)); // Wait longer for API
              
              // Check if we now have a Player ID
              const newPlayerId = await OneSignal.User.PushSubscription.id;
              
              if (newPlayerId) {
                console.log('✅ [OneSignal Auto-Fix] SUCCESS! Player ID created:', newPlayerId);
                setState(prev => ({ 
                  ...prev, 
                  isPushEnabled: true,
                  playerId: newPlayerId
                }));
                
                if (user) {
                  await updateUserProfile(newPlayerId);
                }
              } else {
                console.error('❌ [OneSignal Auto-Fix] FAILED - Player ID still NULL');
                setState(prev => ({ ...prev, isPushEnabled: false, playerId: null }));
              }
            } catch (autoFixError) {
              console.error('❌ [OneSignal Auto-Fix] Exception:', autoFixError);
              setState(prev => ({ ...prev, isPushEnabled: false, playerId: null }));
            }
          } else {
            console.log('📋 [OneSignal] Permission status:', permission, '- Waiting for user action');
            setState(prev => ({ ...prev, isPushEnabled: false, playerId: null }));
          }

          // ✅ ENHANCED: Listen for permission changes (user allows/denies via system settings)
          OneSignal.Notifications.addEventListener('permissionChange', async function(event: any) {
            console.log('📱 [OneSignal] Permission changed:', { from: event.from, to: event.to });
            
            if (event.to === 'granted') {
              // User granted permission - but check if ACTUALLY subscribed
              const isSubscribed = await OneSignal.User.PushSubscription.optedIn;
              const playerId = await OneSignal.User.PushSubscription.id;
              
              console.log('✅ [OneSignal] Permission granted:', {
                isSubscribed,
                playerId,
                isTrulySubscribed: isSubscribed && !!playerId
              });
              
              // Only mark as enabled if truly subscribed
              if (isSubscribed && playerId) {
                setState(prev => ({ 
                  ...prev, 
                  isPushEnabled: true,
                  playerId: playerId
                }));
                
                // Update user profile with OneSignal info
                if (user) {
                  await updateUserProfile(playerId);
                }
              } else {
                console.log('⚠️ [OneSignal] Permission granted but NOT subscribed yet - waiting...');
                setState(prev => ({ ...prev, isPushEnabled: false, playerId: null }));
              }
            } else {
              // User denied or revoked permission
              console.log('❌ [OneSignal] Permission denied or revoked');
              setState(prev => ({ 
                ...prev, 
                isPushEnabled: false,
                playerId: null
              }));
            }
          });

          OneSignal.User.PushSubscription.addEventListener('change', async function(event: any) {
            console.log('🔄 [OneSignal] Subscription changed event:', {
              previous: event.previous,
              current: event.current
            });
            
            const playerId = event.current.id;
            const optedIn = event.current.optedIn;
            
            // ✅ FIXED: Check if user is TRULY subscribed (opted in + has player ID)
            const isTrulySubscribed = optedIn && !!playerId;
            
            console.log('🔄 [OneSignal] Subscription Status:', {
              playerId,
              optedIn,
              isTrulySubscribed
            });
            
            if (isTrulySubscribed) {
              console.log('✅ [OneSignal] User SUBSCRIBED with Player ID:', playerId);
              setState(prev => ({ ...prev, playerId, isPushEnabled: true }));
              if (user) {
                await updateUserProfile(playerId);
              }
            } else {
              console.log('❌ [OneSignal] User UNSUBSCRIBED or opted out');
              setState(prev => ({ ...prev, playerId: null, isPushEnabled: false }));
              if (user) {
                // Update profile to remove OneSignal info
                await supabase
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
            let playerId = await OneSignal.User.PushSubscription.id;
            
            // ✅ FIX: If Player ID is NULL, try opt-out → opt-in to force fresh subscription
            if (!playerId) {
              console.warn('⚠️ No OneSignal Player ID available after subscription - attempting auto-fix...');
              
              try {
                console.log('🔄 [Auto-Fix] Attempting opt-out → opt-in to generate Player ID...');
                
                // Opt out first
                await OneSignal.User.PushSubscription.optOut();
                await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
                
                // Opt back in
                await OneSignal.User.PushSubscription.optIn();
                await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds for API
                
                // Check if we now have a Player ID
                playerId = await OneSignal.User.PushSubscription.id;
                
                if (playerId) {
                  console.log('✅ [Auto-Fix] SUCCESS! Player ID created:', playerId);
                } else {
                  console.error('❌ [Auto-Fix] FAILED - Player ID still NULL after retry');
                  toast({
                    title: "Subscription Failed",
                    description: "Unable to complete push notification setup. Please try again later or contact support.",
                    variant: "destructive",
                  });
                  resolve(false);
                  return;
                }
              } catch (retryError) {
                console.error('❌ [Auto-Fix] Exception during retry:', retryError);
                toast({
                  title: "Subscription Failed",
                  description: "Unable to complete push notification setup.",
                  variant: "destructive",
                });
                resolve(false);
                return;
              }
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
                
                // ✅ Send welcome push notification to verify subscription
                try {
                  console.log('📲 Sending welcome push notification...');
                  
                  // Add tags to OneSignal user
                  await OneSignal.User.addTag('subscribed', 'true');
                  await OneSignal.User.addTag('subscription_date', new Date().toISOString());
                  
                  // Call Edge Function to send welcome notification
                  const userName = user.user_metadata?.first_name 
                    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
                    : user.user_metadata?.display_name || user.email?.split('@')[0] || 'Trader';
                  
                  // Use supabase.functions.invoke for Edge Function call
                  const { supabase } = await import('@/integrations/supabase/client');
                  supabase.functions.invoke('send-welcome-notification', {
                    body: {
                      player_id: playerId,
                      user_id: user.id,
                      user_name: userName
                    }
                  }).then(({ data, error }) => {
                    if (error) {
                      console.warn('⚠️ Welcome notification failed (non-critical):', error);
                    } else {
                      console.log('✅ Welcome notification sent successfully:', data);
                    }
                  }).catch(error => {
                    console.warn('⚠️ Welcome notification error (non-critical):', error);
                  });
                } catch (notifError) {
                  console.warn('⚠️ Failed to send welcome notification (non-critical):', notifError);
                  // Non-critical error - subscription still successful
                }
                
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

  // ✅ NEW: Function to refresh subscription status on demand
  const refreshSubscriptionStatus = useCallback(async () => {
    if (!state.isInitialized || !window.OneSignal) {
      console.log('⚠️ [OneSignal] Cannot refresh - not initialized');
      return;
    }

    try {
      console.log('🔄 [OneSignal] Refreshing subscription status...');
      
      const permission = await window.OneSignal.Notifications.permission;
      const isSubscribed = await window.OneSignal.User.PushSubscription.optedIn;
      const playerId = await window.OneSignal.User.PushSubscription.id;
      
      const isTrulySubscribed = permission === 'granted' && isSubscribed && !!playerId;
      
      console.log('📋 [OneSignal] Refreshed Status:', {
        permission,
        isSubscribed,
        playerId,
        isTrulySubscribed
      });
      
      setState(prev => ({
        ...prev,
        isPushEnabled: isTrulySubscribed,
        playerId: playerId || null
      }));
      
      return isTrulySubscribed;
    } catch (error) {
      console.error('❌ [OneSignal] Failed to refresh status:', error);
      return false;
    }
  }, [state.isInitialized]);

  return {
    isInitialized: state.isInitialized,
    isPushEnabled: state.isPushEnabled,
    playerId: state.playerId,
    isSubscriptionLoading: state.isSubscriptionLoading,
    hasPrompted: state.hasPrompted,
    requestPermission,
    subscribeToPush,
    unsubscribeFromPush,
    refreshSubscriptionStatus, // ✅ NEW: Export refresh function
  };
};