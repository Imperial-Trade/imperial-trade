/**
 * Subscription Health Hook - Phase 7: Subscription Health & Recovery
 * Monitors and maintains push notification subscription health
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOneSignal } from "@/hooks/useOneSignal";
import { supabase } from "@/integrations/supabase/client";
import { detectPlatform, getPlatformConfig } from "@/utils/platformDetection";

interface SubscriptionHealth {
  status: 'healthy' | 'warning' | 'error' | 'unknown';
  lastCheck: Date | null;
  lastSuccess: Date | null;
  failureCount: number;
  issues: string[];
  needsRefresh: boolean;
  deliveryRate: number;
}

interface HealthCheckResult {
  localSubscription: boolean;
  remoteSubscription: boolean;
  oneSignalStatus: any;
  dbStatus: any;
  issues: string[];
}

export function useSubscriptionHealth() {
  const { user } = useAuth();
  const { initialized, hasSubscription, isGranted } = useOneSignal();
  const [health, setHealth] = useState<SubscriptionHealth>({
    status: 'unknown',
    lastCheck: null,
    lastSuccess: null,
    failureCount: 0,
    issues: [],
    needsRefresh: false,
    deliveryRate: 100
  });
  
  const platformInfo = detectPlatform();
  const platformConfig = getPlatformConfig(platformInfo);
  const checkTimeoutRef = useRef<NodeJS.Timeout>();
  const isCheckingRef = useRef(false);

  // Comprehensive health check
  const performHealthCheck = useCallback(async (): Promise<HealthCheckResult> => {
    const issues: string[] = [];
    let localSubscription = false;
    let remoteSubscription = false;
    let oneSignalStatus = null;
    let dbStatus = null;

    try {
      // Check local OneSignal subscription
      const os = (window as any).OneSignal;
      if (os?.User?.PushSubscription) {
        const ps = os.User.PushSubscription;
        localSubscription = !!(ps.optedIn || ps.id);
        
        if (!localSubscription) {
          issues.push('No local OneSignal subscription found');
        }
      } else {
        issues.push('OneSignal SDK not properly initialized');
      }

      // Check remote OneSignal status via verification
      if (user?.id) {
        try {
          const { data: verificationData } = await supabase.functions.invoke('onesignal-verify-subscription', {
            body: { user_id: user.id }
          });

          oneSignalStatus = verificationData?.subscription_status;
          
          if (oneSignalStatus) {
            remoteSubscription = oneSignalStatus.is_subscribed;
            
            if (!oneSignalStatus.player_exists) {
              issues.push('OneSignal player does not exist');
            }
            
            if (!oneSignalStatus.webpush_subscribed) {
              issues.push('OneSignal WebPush not subscribed');
            }
            
            if (!oneSignalStatus.in_subscribed_segment) {
              issues.push('Not in OneSignal subscribed segment');
            }
          } else {
            issues.push('Unable to verify OneSignal status');
          }
        } catch (error) {
          issues.push(`OneSignal verification failed: ${error.message}`);
        }

        // Check database status
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('push_subscription_active, onesignal_subscription_status, onesignal_last_verified_at')
            .eq('id', user.id)
            .single();

          dbStatus = profile;
          
          if (!profile?.push_subscription_active) {
            issues.push('Database subscription marked as inactive');
          }
          
          if (profile?.onesignal_subscription_status !== 'subscribed') {
            issues.push(`Database status: ${profile?.onesignal_subscription_status || 'unknown'}`);
          }
          
          // Check verification freshness
          if (profile?.onesignal_last_verified_at) {
            const lastVerified = new Date(profile.onesignal_last_verified_at);
            const hoursSince = (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60);
            
            if (hoursSince > 24) {
              issues.push('Subscription verification is stale (>24h)');
            }
          } else {
            issues.push('Subscription never verified');
          }
        } catch (error) {
          issues.push(`Database check failed: ${error.message}`);
        }
      }

      // Platform-specific checks
      if (platformInfo.needsSubscriptionRefresh) {
        const browser = (window as any).OneSignal?.User?.PushSubscription;
        if (browser?.id) {
          // Check if subscription is stale (browser-specific logic)
          const subscriptionAge = platformInfo.browser === 'Safari' ? 12 : 24; // hours
          issues.push(`Platform may need subscription refresh (${platformInfo.browser})`);
        }
      }

      // Check notification permission state consistency
      if (typeof Notification !== 'undefined') {
        const browserPermission = Notification.permission;
        if (browserPermission !== 'granted' && localSubscription) {
          issues.push('Local subscription exists but browser permission not granted');
        }
      }

    } catch (error) {
      issues.push(`Health check failed: ${error.message}`);
    }

    return {
      localSubscription,
      remoteSubscription,
      oneSignalStatus,
      dbStatus,
      issues
    };
  }, [user?.id, platformInfo.needsSubscriptionRefresh, platformInfo.browser]);

  // Determine health status from check results
  const analyzeHealth = useCallback((result: HealthCheckResult): SubscriptionHealth['status'] => {
    if (result.issues.length === 0 && result.localSubscription && result.remoteSubscription) {
      return 'healthy';
    }
    
    if (result.localSubscription || result.remoteSubscription) {
      return 'warning';
    }
    
    return 'error';
  }, []);

  // Execute health check and update state
  const runHealthCheck = useCallback(async () => {
    if (!user?.id || !initialized || isCheckingRef.current) return;
    
    isCheckingRef.current = true;
    
    try {
      const result = await performHealthCheck();
      const status = analyzeHealth(result);
      const now = new Date();
      
      setHealth(prev => ({
        ...prev,
        status,
        lastCheck: now,
        lastSuccess: status === 'healthy' ? now : prev.lastSuccess,
        failureCount: status === 'error' ? prev.failureCount + 1 : 0,
        issues: result.issues,
        needsRefresh: status !== 'healthy' && platformInfo.needsSubscriptionRefresh,
        deliveryRate: status === 'healthy' ? Math.min(prev.deliveryRate + 5, 100) : 
                     status === 'warning' ? prev.deliveryRate :
                     Math.max(prev.deliveryRate - 10, 0)
      }));
      
    } catch (error) {
      console.error('[SubscriptionHealth] Check failed:', error);
      setHealth(prev => ({
        ...prev,
        status: 'error',
        lastCheck: new Date(),
        failureCount: prev.failureCount + 1,
        issues: [`Health check failed: ${error.message}`],
        needsRefresh: true
      }));
    } finally {
      isCheckingRef.current = false;
    }
  }, [user?.id, initialized, performHealthCheck, analyzeHealth, platformInfo.needsSubscriptionRefresh]);

  // Automatic subscription recovery
  const attemptRecovery = useCallback(async (): Promise<boolean> => {
    if (!user?.id || health.status === 'healthy') return false;

    try {
      console.log('[SubscriptionHealth] Attempting recovery...');
      
      // Step 1: Clean up old subscriptions
      await supabase.functions.invoke('subscription-manager', {
        body: {
          action: 'cleanup',
          user_id: user.id
        }
      });

      // Step 2: Re-sync with OneSignal
      const os = (window as any).OneSignal;
      if (os?.User?.PushSubscription?.id) {
        await supabase.functions.invoke('onesignal-upsert-user', {
          body: {
            user_id: user.id,
            player_id: os.User.PushSubscription.id,
            email: user.email
          }
        });
      }

      // Step 3: Update database status
      await supabase
        .from('profiles')
        .update({
          push_subscription_active: hasSubscription,
          onesignal_subscription_status: hasSubscription ? 'subscribed' : 'unsubscribed',
          onesignal_last_verified_at: new Date().toISOString()
        })
        .eq('id', user.id);

      // Step 4: Re-check health
      setTimeout(runHealthCheck, 2000);
      
      return true;
    } catch (error) {
      console.error('[SubscriptionHealth] Recovery failed:', error);
      return false;
    }
  }, [user?.id, user?.email, health.status, hasSubscription, runHealthCheck]);

  // Set up periodic health checks
  useEffect(() => {
    if (!initialized || !isGranted || !user?.id) {
      setHealth(prev => ({ ...prev, status: 'unknown' }));
      return;
    }

    // Initial check after a delay
    const initialDelay = setTimeout(runHealthCheck, 3000);

    // Set up periodic checks
    const interval = setInterval(runHealthCheck, platformConfig.healthCheckInterval);

    return () => {
      clearTimeout(initialDelay);
      clearInterval(interval);
    };
  }, [initialized, isGranted, user?.id, runHealthCheck, platformConfig.healthCheckInterval]);

  // Auto-recovery for persistent errors
  useEffect(() => {
    if (health.failureCount >= 3 && health.status === 'error') {
      console.log('[SubscriptionHealth] Triggering auto-recovery after persistent failures');
      attemptRecovery();
    }
  }, [health.failureCount, health.status, attemptRecovery]);

  return {
    health,
    runHealthCheck,
    attemptRecovery,
    isChecking: isCheckingRef.current
  };
}