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
  const isIOSPWA = safariPWAInfo.isSafariPWA;
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

  // **PHASE 1: Enhanced Player ID Capture with Multiple Methods and Immediate Backend Sync**
  const capturePlayerIdFromOneSignal = async (): Promise<boolean> => {
    if (!initialized) {
      console.log('[PlayerIdVerification] OneSignal not initialized for Player ID capture');
      return false;
    }

    setIsVerifying(true);

    try {
      console.info('[PlayerIdVerification] Starting enhanced Player ID capture...');
      
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

      // Method 4: Force subscription refresh for iOS PWA
      if (!osPlayerId && isIOSPWA && (window as any).OneSignal) {
        try {
          console.info('[PlayerIdVerification] iOS PWA - attempting subscription refresh...');
          await (window as any).OneSignal.User.PushSubscription.optIn();
          
          // Wait for subscription to stabilize
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          osPlayerId = (window as any).OneSignal?.User?.PushSubscription?.id;
          if (osPlayerId) {
            console.info(`[PlayerIdVerification] Method 4 (iOS PWA refresh) successful - Player ID: ${osPlayerId.substring(0, 8)}...`);
          }
        } catch (error) {
          console.warn('[PlayerIdVerification] Method 4 failed:', error);
        }
      }

      if (osPlayerId) {
        console.log('[PlayerIdVerification] ✅ Captured Player ID:', osPlayerId.substring(0, 8) + '...');
        
        // **CRITICAL: Immediately sync with backend via onesignal-upsert-user**
        if (user?.id && user?.email) {
          try {
            console.info(`[PlayerIdVerification] Syncing Player ID ${osPlayerId.substring(0, 8)}... with backend...`);
            
            const { data, error } = await supabase.functions.invoke('onesignal-upsert-user', {
              body: {
                user_id: user.id,
                email: user.email,
                player_id: osPlayerId,
                tags: {
                  platform: isIOSPWA ? 'ios_pwa' : 'web',
                  capture_method: 'player_id_verification',
                  capture_timestamp: new Date().toISOString(),
                  retry_count: retryCount.toString()
                }
              }
            });
            
            if (error) {
              console.error('[PlayerIdVerification] Backend sync failed:', error);
              throw error;
            } else if (data?.success) {
              console.info('[PlayerIdVerification] ✅ Backend sync successful:', data);
              
              // Update local database state and verify
              const dbUpdateSuccess = await updatePlayerIdInDatabase(osPlayerId);
              if (dbUpdateSuccess) {
                // Reset retry count on success
                setRetryCount(0);
                return true;
              }
            } else {
              console.warn('[PlayerIdVerification] Backend sync returned non-success:', data);
              throw new Error(data?.error || 'Backend sync failed');
            }
            
          } catch (syncError) {
            console.error('[PlayerIdVerification] Backend sync error:', syncError);
            setRetryCount(prev => prev + 1);
            // Don't throw here - we still captured the Player ID
          }
        }
        
        // Fallback: Update local database only
        const dbUpdateSuccess = await updatePlayerIdInDatabase(osPlayerId);
        return dbUpdateSuccess;
        
      } else {
        console.warn('[PlayerIdVerification] ❌ No Player ID available in OneSignal after all methods');
        setRetryCount(prev => prev + 1);
        
        // **PHASE 1: Log OneSignal state for debugging**
        const osState = {
          oneSignalExists: !!(window as any).OneSignal,
          hasUser: !!(window as any).OneSignal?.User,
          hasPushSubscription: !!(window as any).OneSignal?.User?.PushSubscription,
          subscriptionId: (window as any).OneSignal?.User?.PushSubscription?.id,
          permission: Notification?.permission,
          hasSubscription,
          isIOSPWA,
          retryCount
        };
        console.log('[PlayerIdVerification] OneSignal state:', osState);
        
        return false;
      }
    } catch (error) {
      console.error('[PlayerIdVerification] ❌ Player ID capture error:', error);
      setRetryCount(prev => prev + 1);
      return false;
    } finally {
      setIsVerifying(false);
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