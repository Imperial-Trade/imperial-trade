import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
  const { user, authReady } = useAuth();
  const { toast } = useToast();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [beamsClient, setBeamsClient] = useState<any>(null);

  // Initialize Pusher Beams
  useEffect(() => {
    if (!authReady || !user) {
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

      // Check current registration state
      client.getRegistrationState()
        .then((state: string) => {
          console.log('📊 [Pusher Beams] Current state:', state);
          const states = window.PusherPushNotifications.RegistrationState;
          
          if (state === states.PERMISSION_GRANTED_REGISTERED_WITH_BEAMS) {
            setIsPushEnabled(true);
            console.log('✅ [Pusher Beams] Already registered and enabled');
          }
        })
        .catch((error: Error) => {
          console.error('❌ [Pusher Beams] Failed to get registration state:', error);
        });

    } catch (error) {
      console.error('❌ [Pusher Beams] Initialization failed:', error);
    }
  }, [authReady, user]);

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
  }, [beamsClient, toast]);

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
  }, [beamsClient, toast]);

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

