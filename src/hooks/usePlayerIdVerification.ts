/**
 * Hook for iOS PWA Player ID Verification and Management
 * Phase 3: Player ID Verification Flow Implementation
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOneSignalEnhanced } from "./useOneSignalEnhanced";
import { detectSafariPWA } from "@/utils/safariPWADetection";
import { supabase } from "@/integrations/supabase/client";

export function usePlayerIdVerification() {
  const { user } = useAuth();
  const { initialized, hasSubscription } = useOneSignalEnhanced();
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasValidPlayerId, setHasValidPlayerId] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    'idle' | 'checking' | 'missing' | 'valid' | 'error'
  >('idle');

  const safariPWAInfo = detectSafariPWA();

  // Verify Player ID is captured and stored for iOS PWA users
  const verifyPlayerId = async (): Promise<boolean> => {
    if (!user?.id || !initialized) {
      console.log('[PlayerIdVerification] User or OneSignal not ready');
      return false;
    }

    setIsVerifying(true);
    setVerificationStatus('checking');

    try {
      // Check if we have Player ID in database
      const { data: profile } = await supabase
        .from('profiles')
        .select('onesignal_player_id, push_subscription_active')
        .eq('id', user.id)
        .single();

      const hasStoredPlayerId = !!(profile?.onesignal_player_id);
      
      console.log('[PlayerIdVerification] Database Player ID status:', {
        hasPlayerId: hasStoredPlayerId,
        playerId: profile?.onesignal_player_id?.substring(0, 8) + '...',
        subscriptionActive: profile?.push_subscription_active
      });

      // For iOS PWA users, verify OneSignal also has the subscription
      if (safariPWAInfo.isSafariPWA && hasStoredPlayerId) {
        try {
          const osPlayerId = (window as any).OneSignal?.User?.PushSubscription?.id;
          if (osPlayerId && osPlayerId === profile.onesignal_player_id) {
            console.log('[PlayerIdVerification] iOS PWA Player ID verified in OneSignal');
            setHasValidPlayerId(true);
            setVerificationStatus('valid');
            return true;
          } else if (osPlayerId && osPlayerId !== profile.onesignal_player_id) {
            console.warn('[PlayerIdVerification] Player ID mismatch - updating database');
            await updatePlayerIdInDatabase(osPlayerId);
            setHasValidPlayerId(true);
            setVerificationStatus('valid');
            return true;
          }
        } catch (e) {
          console.warn('[PlayerIdVerification] Error checking OneSignal Player ID:', e);
        }
      }

      if (hasStoredPlayerId) {
        setHasValidPlayerId(true);
        setVerificationStatus('valid');
        return true;
      } else {
        console.warn('[PlayerIdVerification] No Player ID found in database');
        setHasValidPlayerId(false);
        setVerificationStatus('missing');
        return false;
      }

    } catch (error) {
      console.error('[PlayerIdVerification] Verification error:', error);
      setVerificationStatus('error');
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  // Update Player ID in database
  const updatePlayerIdInDatabase = async (playerId: string): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          onesignal_player_id: playerId,
          push_subscription_active: true,
          onesignal_last_verified_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (error) {
        console.error('[PlayerIdVerification] Database update error:', error);
        return false;
      }

      console.log('[PlayerIdVerification] Player ID updated in database:', playerId.substring(0, 8) + '...');
      return true;
    } catch (error) {
      console.error('[PlayerIdVerification] Update exception:', error);
      return false;
    }
  };

  // Capture Player ID from OneSignal for iOS PWA users
  const capturePlayerIdFromOneSignal = async (): Promise<boolean> => {
    if (!initialized || !hasSubscription) {
      console.log('[PlayerIdVerification] OneSignal not ready for Player ID capture');
      return false;
    }

    try {
      const osPlayerId = (window as any).OneSignal?.User?.PushSubscription?.id;
      if (osPlayerId) {
        console.log('[PlayerIdVerification] Captured Player ID from OneSignal:', osPlayerId.substring(0, 8) + '...');
        return await updatePlayerIdInDatabase(osPlayerId);
      } else {
        console.warn('[PlayerIdVerification] No Player ID available in OneSignal');
        return false;
      }
    } catch (error) {
      console.error('[PlayerIdVerification] Player ID capture error:', error);
      return false;
    }
  };

  // Auto-verify when conditions are met
  useEffect(() => {
    if (user?.id && initialized && hasSubscription && verificationStatus === 'idle') {
      verifyPlayerId();
    }
  }, [user?.id, initialized, hasSubscription, verificationStatus]);

  // For iOS PWA users, attempt to capture Player ID if missing
  useEffect(() => {
    if (
      safariPWAInfo.isSafariPWA && 
      initialized && 
      hasSubscription && 
      verificationStatus === 'missing'
    ) {
      console.log('[PlayerIdVerification] Attempting to capture Player ID for iOS PWA user');
      capturePlayerIdFromOneSignal().then(success => {
        if (success) {
          verifyPlayerId();
        }
      });
    }
  }, [safariPWAInfo.isSafariPWA, initialized, hasSubscription, verificationStatus]);

  return {
    isVerifying,
    hasValidPlayerId,
    verificationStatus,
    verifyPlayerId,
    capturePlayerIdFromOneSignal,
    updatePlayerIdInDatabase,
    isIOSPWA: safariPWAInfo.isSafariPWA
  };
}