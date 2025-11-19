import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Pusher Beams Client - accessed globally from CDN script
declare global {
  interface Window {
    PusherPushNotifications: any;
  }
}

interface UsePusherBeamsReturn {
  isInitialized: boolean;
  isPushEnabled: boolean;
  subscribeToPush: () => Promise<boolean>;
  unsubscribeFromPush: () => Promise<boolean>;
  getDeviceId: () => Promise<string | null>;
}

export const usePusherBeams = (): UsePusherBeamsReturn => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [beamsClient, setBeamsClient] = useState<any>(null);

  // Initialize Pusher Beams
  useEffect(() => {
    if (loading || !user) {
      console.log('⏳ [Pusher Beams] Waiting for authentication...');
      return;
    }

    if (typeof window.PusherPushNotifications === 'undefined') {
      console.error('❌ [Pusher Beams] SDK not loaded. Make sure the script tag is in index.html');
      return;
    }

    console.log('🚀 [Pusher Beams] Initializing...');

    try {
      const client = new window.PusherPushNotifications.Client({
        instanceId: 'de4fb62d-141b-4d1c-98b5-c3ec6e5eec4b',
      });

      setBeamsClient(client);
      setIsInitialized(true);
      console.log('✅ [Pusher Beams] Initialized successfully');

      // Check current registration state and sync with database
      client.getRegistrationState()
        .then(async (state: string) => {
          console.log('📊 [Pusher Beams] Current state:', state);
          const states = window.PusherPushNotifications.RegistrationState;
          
          if (state === states.PERMISSION_GRANTED_REGISTERED_WITH_BEAMS) {
            setIsPushEnabled(true);
            console.log('✅ [Pusher Beams] Already registered and enabled');
            
            // ✅ SYNC: Ensure database matches client state
            if (user?.id) {
              try {
                const interests = await client.getDeviceInterests();
                const isSubscribed = interests.includes('trade_alerts');
                
                if (isSubscribed) {
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
              } catch (error) {
                console.error('❌ [Pusher Beams] Failed to sync with database:', error);
              }
            }
          }
        })
        .catch((error: Error) => {
          console.error('❌ [Pusher Beams] Failed to get registration state:', error);
        });

    } catch (error) {
      console.error('❌ [Pusher Beams] Initialization failed:', error);
    }
  }, [loading, user]);

  // Subscribe to push notifications
  const subscribeToPush = useCallback(async (): Promise<boolean> => {
    if (!beamsClient) {
      console.error('❌ [Pusher Beams] Client not initialized');
      return false;
    }

    try {
      console.log('🔔 [Pusher Beams] Starting subscription...');

      // Start the Beams client (registers device and requests permission)
      await beamsClient.start();
      
      // Subscribe to the 'trade_alerts' interest (this is your broadcast channel)
      await beamsClient.addDeviceInterest('trade_alerts');
      
      const deviceId = await beamsClient.getDeviceId();
      console.log('✅ [Pusher Beams] Subscribed successfully!', {
        deviceId,
        interest: 'trade_alerts'
      });

      // ✅ CRITICAL FIX: Update database to mark user as push-enabled
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ xeon_stream_subscription: true })
          .eq('id', user.id);

        if (error) {
          console.error('❌ [Database] Failed to update xeon_stream_subscription:', error);
          // Don't fail the whole operation - user is still subscribed to Pusher Beams
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
      console.error('❌ [Pusher Beams] Subscription failed:', error);
      
      toast({
        title: "Subscription Failed",
        description: error.message || "Could not enable push notifications.",
        variant: "destructive",
      });

      return false;
    }
  }, [beamsClient, toast, user]);

  // Unsubscribe from push notifications
  const unsubscribeFromPush = useCallback(async (): Promise<boolean> => {
    if (!beamsClient) {
      console.error('❌ [Pusher Beams] Client not initialized');
      return false;
    }

    try {
      console.log('🔕 [Pusher Beams] Unsubscribing...');

      // Remove the 'trade_alerts' interest
      await beamsClient.removeDeviceInterest('trade_alerts');
      
      // Stop the Beams client (unregisters device)
      await beamsClient.stop();

      console.log('✅ [Pusher Beams] Unsubscribed successfully');

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
      console.error('❌ [Pusher Beams] Unsubscribe failed:', error);
      
      toast({
        title: "Unsubscribe Failed",
        description: error.message || "Could not disable push notifications.",
        variant: "destructive",
      });

      return false;
    }
  }, [beamsClient, toast, user]);

  // Get current device ID
  const getDeviceId = useCallback(async (): Promise<string | null> => {
    if (!beamsClient) {
      return null;
    }

    try {
      const deviceId = await beamsClient.getDeviceId();
      return deviceId;
    } catch (error) {
      console.error('❌ [Pusher Beams] Failed to get device ID:', error);
      return null;
    }
  }, [beamsClient]);

  return {
    isInitialized,
    isPushEnabled,
    subscribeToPush,
    unsubscribeFromPush,
    getDeviceId,
  };
};

