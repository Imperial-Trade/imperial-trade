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
    'idle' | 'checking' | 'missing' | 'valid' | 'error' | 'force_capture'
  >('idle');
  const [retryCount, setRetryCount] = useState(0);

  const safariPWAInfo = detectSafariPWA();
  const maxRetries = 3;

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

  // **PHASE 1: Enhanced Player ID Capture with Multiple Methods**
  const capturePlayerIdFromOneSignal = async (): Promise<boolean> => {
    if (!initialized) {
      console.log('[PlayerIdVerification] OneSignal not initialized for Player ID capture');
      return false;
    }

    try {
      // Method 1: Direct OneSignal API access
      let osPlayerId = (window as any).OneSignal?.User?.PushSubscription?.id;
      
      // Method 2: Alternative OneSignal access patterns
      if (!osPlayerId) {
        osPlayerId = (window as any).OneSignal?.getSubscription?.()?.id;
      }
      
      // Method 3: Check OneSignal internal state
      if (!osPlayerId && (window as any).OneSignal) {
        const os = (window as any).OneSignal;
        if (os.getUserId) {
          osPlayerId = await os.getUserId();
        }
      }

      if (osPlayerId) {
        console.log('[PlayerIdVerification] ✅ Captured Player ID:', osPlayerId.substring(0, 8) + '...');
        
        // **PHASE 2: Immediate backend sync**
        const dbUpdateSuccess = await updatePlayerIdInDatabase(osPlayerId);
        if (dbUpdateSuccess) {
          // Call onesignal-upsert-user to ensure backend is synced
          try {
            const { data, error } = await supabase.functions.invoke('onesignal-upsert-user', {
              body: { 
                user_id: user?.id,
                player_id: osPlayerId,
                force_update: true 
              }
            });
            
            if (error) {
              console.warn('[PlayerIdVerification] Backend sync warning:', error);
            } else {
              console.log('[PlayerIdVerification] ✅ Backend sync successful');
            }
          } catch (syncError) {
            console.error('[PlayerIdVerification] Backend sync error:', syncError);
          }
        }
        
        return dbUpdateSuccess;
      } else {
        console.warn('[PlayerIdVerification] ❌ No Player ID available in OneSignal after all methods');
        
        // **PHASE 1: Log OneSignal state for debugging**
        const osState = {
          oneSignalExists: !!(window as any).OneSignal,
          hasUser: !!(window as any).OneSignal?.User,
          hasPushSubscription: !!(window as any).OneSignal?.User?.PushSubscription,
          subscriptionId: (window as any).OneSignal?.User?.PushSubscription?.id,
          permission: Notification?.permission,
          hasSubscription
        };
        console.log('[PlayerIdVerification] OneSignal state:', osState);
        
        return false;
      }
    } catch (error) {
      console.error('[PlayerIdVerification] ❌ Player ID capture error:', error);
      return false;
    }
  };

  // **PHASE 1: Aggressive Player ID Verification with Force Capture**
  useEffect(() => {
    if (!user?.id || !initialized) return;

    const performAggressiveVerification = async () => {
      console.log('[PlayerIdVerification] Starting aggressive verification for user:', user.id);
      
      // Check if user has push_subscription_active but no Player ID
      const { data: profile } = await supabase
        .from('profiles')
        .select('onesignal_player_id, push_subscription_active')
        .eq('id', user.id)
        .single();

      const shouldForceCapture = (
        profile?.push_subscription_active === true && 
        !profile?.onesignal_player_id && 
        hasSubscription
      );

      if (shouldForceCapture) {
        console.log('[PlayerIdVerification] Force capture needed: active subscription but no Player ID');
        setVerificationStatus('force_capture');
        setRetryCount(0);
        
        // Immediate capture attempt
        const captureSuccess = await capturePlayerIdFromOneSignal();
        if (captureSuccess) {
          await verifyPlayerId();
        } else if (retryCount < maxRetries) {
          console.log(`[PlayerIdVerification] Capture failed, retry ${retryCount + 1}/${maxRetries}`);
          setRetryCount(prev => prev + 1);
          // Retry after delay
          setTimeout(() => {
            capturePlayerIdFromOneSignal().then(success => {
              if (success) verifyPlayerId();
            });
          }, 2000 * (retryCount + 1));
        }
      } else if (verificationStatus === 'idle') {
        await verifyPlayerId();
      }
    };

    performAggressiveVerification();
  }, [user?.id, initialized, hasSubscription, verificationStatus]);

  // **PHASE 1: Continuous monitoring for iOS PWA users**
  useEffect(() => {
    if (!safariPWAInfo.isSafariPWA || !initialized || !hasSubscription) return;

    const interval = setInterval(async () => {
      if (verificationStatus === 'missing' || verificationStatus === 'force_capture') {
        console.log('[PlayerIdVerification] Continuous capture attempt for iOS PWA');
        const success = await capturePlayerIdFromOneSignal();
        if (success) {
          await verifyPlayerId();
          clearInterval(interval);
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [safariPWAInfo.isSafariPWA, initialized, hasSubscription, verificationStatus]);

  return {
    isVerifying,
    hasValidPlayerId,
    verificationStatus,
    verifyPlayerId,
    capturePlayerIdFromOneSignal,
    updatePlayerIdInDatabase,
    isIOSPWA: safariPWAInfo.isSafariPWA,
    retryCount,
    forceRecapture: () => {
      setVerificationStatus('force_capture');
      setRetryCount(0);
      capturePlayerIdFromOneSignal().then(success => {
        if (success) verifyPlayerId();
      });
    }
  };
}