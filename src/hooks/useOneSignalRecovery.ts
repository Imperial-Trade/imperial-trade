/**
 * OneSignal Recovery Hook - Phase 1: Foundation Recovery
 * Implements comprehensive subscription recovery for trading alerts
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface RecoveryState {
  isRecovering: boolean;
  recoveryStage: 'idle' | 'initializing' | 'subscribing' | 'verifying' | 'complete' | 'failed';
  playerId: string | null;
  subscriptionActive: boolean;
  lastError: string | null;
  recoveryAttempts: number;
}

interface RecoveryResult {
  success: boolean;
  playerId?: string;
  subscriptionStatus?: string;
  error?: string;
  details?: any;
}

export function useOneSignalRecovery() {
  const { user, profile } = useAuth();
  const [state, setState] = useState<RecoveryState>({
    isRecovering: false,
    recoveryStage: 'idle',
    playerId: null,
    subscriptionActive: false,
    lastError: null,
    recoveryAttempts: 0,
  });

  // Check if recovery is needed
  const needsRecovery = useCallback(() => {
    if (!user || !profile) return false;
    
    return (
      !profile.push_subscription_active ||
      !profile.onesignal_player_id ||
      profile.onesignal_subscription_status !== 'subscribed'
    );
  }, [user, profile]);

  // Enhanced OneSignal initialization with recovery focus
  const initializeOneSignal = useCallback(async (): Promise<RecoveryResult> => {
    try {
      console.log('🔧 [Recovery] Starting OneSignal initialization...');
      
      // Get OneSignal configuration
      const { data: config, error: configError } = await supabase.functions.invoke('onesignal-config');
      
      if (configError || !config?.appId) {
        throw new Error(`Configuration failed: ${configError?.message || 'Missing appId'}`);
      }

      // Ensure OneSignal SDK is loaded
      if (!window.OneSignal) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('Failed to load OneSignal SDK'));
          document.head.appendChild(script);
        });
      }

      // Initialize OneSignal with recovery-focused config
      const initConfig = {
        appId: config.appId,
        allowLocalhostAsSecureOrigin: true,
        autoRegister: false, // Critical: Manual control
        autoResubscribe: false,
        notifyButton: { enable: false },
        promptOptions: {
          slidedown: { enabled: false },
          customlink: { enabled: false },
          bell: { enabled: false },
          native: { enabled: false }
        },
        welcomeNotification: { disable: true }
      };

      if (window.OneSignal?.init) {
        await window.OneSignal.init(initConfig);
      } else {
        throw new Error('OneSignal SDK not properly loaded');
      }

      // Wait for SDK readiness
      let readyAttempts = 0;
      while (readyAttempts < 20 && !window.OneSignal?.Notifications) {
        await new Promise(r => setTimeout(r, 500));
        readyAttempts++;
      }

      if (!window.OneSignal?.Notifications) {
        throw new Error('OneSignal SDK failed to initialize properly');
      }

      return { success: true };

    } catch (error) {
      console.error('🔧 [Recovery] OneSignal initialization failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown initialization error'
      };
    }
  }, []);

  // Request notification permission and subscribe
  const requestSubscription = useCallback(async (): Promise<RecoveryResult> => {
    try {
      console.log('🔧 [Recovery] Requesting notification permission...');

      if (!window.OneSignal?.Notifications) {
        throw new Error('OneSignal not initialized');
      }

      // Request permission
      const permission = await window.OneSignal.Notifications.requestPermission();
      
      if (!permission) {
        return {
          success: false,
          error: 'User denied notification permission'
        };
      }

      console.log('🔧 [Recovery] Permission granted, getting player ID...');

      // Get player ID
      const playerId = await window.OneSignal.User?.PushSubscription?.id;
      
      if (!playerId) {
        throw new Error('Failed to obtain player ID after subscription');
      }

      return {
        success: true,
        playerId,
        subscriptionStatus: 'subscribed'
      };

    } catch (error) {
      console.error('🔧 [Recovery] Subscription request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown subscription error'
      };
    }
  }, []);

  // Update user profile with OneSignal data
  const updateUserProfile = useCallback(async (playerId: string): Promise<RecoveryResult> => {
    try {
      console.log('🔧 [Recovery] Updating user profile with OneSignal data...');

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Update profile via OneSignal upsert function
      const { data, error } = await supabase.functions.invoke('onesignal-upsert-user', {
        body: {
          user_id: user.id,
          email: user.email,
          player_id: playerId,
          tags: {
            role: profile?.role || 'user',
            user_type: profile?.user_type || 'member',
            recovery_source: 'manual_recovery',
            recovery_timestamp: new Date().toISOString()
          }
        }
      });

      if (error) {
        throw new Error(`Profile update failed: ${error.message}`);
      }

      return { success: true, details: data };

    } catch (error) {
      console.error('🔧 [Recovery] Profile update failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown profile update error'
      };
    }
  }, [user, profile]);

  // Verify final subscription status
  const verifySubscription = useCallback(async (): Promise<RecoveryResult> => {
    try {
      console.log('🔧 [Recovery] Verifying subscription status...');

      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase.functions.invoke('onesignal-verify-subscription', {
        body: { user_id: user.id }
      });

      if (error) {
        throw new Error(`Verification failed: ${error.message}`);
      }

      return {
        success: data?.is_subscribed || false,
        playerId: data?.player_id,
        subscriptionStatus: data?.subscription_status?.webpush_subscribed ? 'subscribed' : 'unsubscribed',
        details: data
      };

    } catch (error) {
      console.error('🔧 [Recovery] Verification failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown verification error'
      };
    }
  }, [user]);

  // Main recovery function
  const startRecovery = useCallback(async (): Promise<RecoveryResult> => {
    if (state.isRecovering) {
      return { success: false, error: 'Recovery already in progress' };
    }

    setState(prev => ({
      ...prev,
      isRecovering: true,
      recoveryStage: 'initializing',
      lastError: null,
      recoveryAttempts: prev.recoveryAttempts + 1
    }));

    try {
      // Phase 1: Initialize OneSignal
      setState(prev => ({ ...prev, recoveryStage: 'initializing' }));
      const initResult = await initializeOneSignal();
      
      if (!initResult.success) {
        throw new Error(initResult.error || 'Initialization failed');
      }

      // Phase 2: Request subscription
      setState(prev => ({ ...prev, recoveryStage: 'subscribing' }));
      const subscriptionResult = await requestSubscription();
      
      if (!subscriptionResult.success) {
        throw new Error(subscriptionResult.error || 'Subscription failed');
      }

      // Phase 3: Update profile
      if (subscriptionResult.playerId) {
        const updateResult = await updateUserProfile(subscriptionResult.playerId);
        
        if (!updateResult.success) {
          console.warn('🔧 [Recovery] Profile update failed, but subscription succeeded');
        }
      }

      // Phase 4: Verify final state
      setState(prev => ({ ...prev, recoveryStage: 'verifying' }));
      const verifyResult = await verifySubscription();

      if (verifyResult.success) {
        setState(prev => ({
          ...prev,
          isRecovering: false,
          recoveryStage: 'complete',
          playerId: verifyResult.playerId || null,
          subscriptionActive: true
        }));

        toast.success('🎯 Trading alerts activated! You\'ll now receive instant notifications.');
        
        return {
          success: true,
          playerId: verifyResult.playerId,
          subscriptionStatus: verifyResult.subscriptionStatus
        };
      } else {
        throw new Error('Verification failed after subscription');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown recovery error';
      
      setState(prev => ({
        ...prev,
        isRecovering: false,
        recoveryStage: 'failed',
        lastError: errorMessage
      }));

      toast.error(`🚨 Alert setup failed: ${errorMessage}`);
      
      return { success: false, error: errorMessage };
    }
  }, [state.isRecovering, initializeOneSignal, requestSubscription, updateUserProfile, verifySubscription]);

  // Auto-recovery on mount if needed
  useEffect(() => {
    if (needsRecovery() && state.recoveryAttempts === 0) {
      console.log('🔧 [Recovery] Auto-starting recovery for user:', user?.email);
      // Auto-recovery disabled for now - require manual trigger
      // startRecovery();
    }
  }, [needsRecovery, state.recoveryAttempts]);

  return {
    ...state,
    needsRecovery: needsRecovery(),
    startRecovery,
    canRetry: !state.isRecovering && state.recoveryStage === 'failed',
    resetRecovery: () => setState(prev => ({ 
      ...prev, 
      recoveryStage: 'idle', 
      lastError: null,
      recoveryAttempts: 0 
    }))
  };
}