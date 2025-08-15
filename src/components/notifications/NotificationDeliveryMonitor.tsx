/**
 * Notification Delivery Monitor - Phase 9: Delivery Verification System
 * Monitors push notification delivery success and handles subscription recovery
 */

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOneSignalEnhanced } from "@/hooks/useOneSignalEnhanced";
import { supabase } from "@/integrations/supabase/client";
import { detectPlatform, getPlatformConfig } from "@/utils/platformDetection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, RefreshCw, TestTube } from "lucide-react";
import { toast } from "sonner";
import { PlayerIdEmergencyFix } from "./PlayerIdEmergencyFix";

interface DeliveryStatus {
  lastTestTime?: string;
  lastTestSuccess?: boolean;
  subscriptionHealth: 'healthy' | 'warning' | 'error' | 'unknown';
  deliveryRate: number;
  needsRefresh: boolean;
  lastVerification?: any;
}

export default function NotificationDeliveryMonitor() {
  const { user } = useAuth();
  const { initialized, hasSubscription, isGranted } = useOneSignalEnhanced();
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>({
    subscriptionHealth: 'unknown',
    deliveryRate: 0,
    needsRefresh: false
  });
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const platformInfo = detectPlatform();
  const platformConfig = getPlatformConfig(platformInfo);

  // Enhanced subscription health check
  const checkSubscriptionHealth = useCallback(async () => {
    if (!user?.id || !initialized || !hasSubscription) {
      setDeliveryStatus(prev => ({ ...prev, subscriptionHealth: 'unknown' }));
      return;
    }

    try {
      // Verify subscription with OneSignal
      const { data: verificationData } = await supabase.functions.invoke('onesignal-verify-subscription', {
        body: { user_id: user.id }
      });

      const verification = verificationData?.subscription_status;
      
      if (!verification) {
        setDeliveryStatus(prev => ({ 
          ...prev, 
          subscriptionHealth: 'error',
          needsRefresh: true,
          lastVerification: null
        }));
        return;
      }

      // Analyze subscription health
      let health: DeliveryStatus['subscriptionHealth'] = 'healthy';
      let needsRefresh = false;
      
      // Check for common issues
      if (!verification.is_subscribed) {
        health = 'error';
        needsRefresh = true;
      } else if (!verification.player_exists || !verification.webpush_subscribed) {
        health = 'warning';
        needsRefresh = platformInfo.needsSubscriptionRefresh;
      } else if (!verification.in_subscribed_segment) {
        health = 'warning';
      }

      // Platform-specific health checks
      if (platformInfo.needsSubscriptionRefresh && verification.is_subscribed) {
        const lastVerified = verification.verified_at ? new Date(verification.verified_at) : null;
        const hoursSinceVerification = lastVerified ? 
          (Date.now() - lastVerified.getTime()) / (1000 * 60 * 60) : 999;
        
        if (hoursSinceVerification > 24) {
          health = health === 'healthy' ? 'warning' : health;
          needsRefresh = true;
        }
      }

      setDeliveryStatus(prev => ({
        ...prev,
        subscriptionHealth: health,
        needsRefresh,
        lastVerification: verification
      }));

    } catch (error) {
      console.error('[DeliveryMonitor] Health check failed:', error);
      setDeliveryStatus(prev => ({ 
        ...prev, 
        subscriptionHealth: 'error',
        needsRefresh: true
      }));
    }
  }, [user?.id, initialized, hasSubscription, platformInfo.needsSubscriptionRefresh]);

  // Test notification delivery
  const runDeliveryTest = useCallback(async () => {
    if (!user?.id || !hasSubscription || isRunningTest) return;

    setIsRunningTest(true);
    
    try {
      const testStart = Date.now();
      
      // Send test notification via edge function
      const { data, error } = await supabase.functions.invoke('onesignal-test-notification', {
        body: {
          target_user_id: user.id,
          test_message: `Delivery test at ${new Date().toLocaleTimeString()}`,
          test_type: 'self'
        }
      });

      const testDuration = Date.now() - testStart;
      const success = !error && data?.success;

      setDeliveryStatus(prev => ({
        ...prev,
        lastTestTime: new Date().toISOString(),
        lastTestSuccess: success,
        deliveryRate: success ? Math.min(prev.deliveryRate + 10, 100) : Math.max(prev.deliveryRate - 20, 0)
      }));

      if (success) {
        toast.success(`Test notification sent successfully! (${testDuration}ms)`);
      } else {
        toast.error(`Test notification failed: ${error?.message || 'Unknown error'}`);
      }

    } catch (error) {
      console.error('[DeliveryMonitor] Test failed:', error);
      setDeliveryStatus(prev => ({
        ...prev,
        lastTestTime: new Date().toISOString(),
        lastTestSuccess: false,
        deliveryRate: Math.max(prev.deliveryRate - 20, 0)
      }));
      toast.error('Test notification failed');
    } finally {
      setIsRunningTest(false);
    }
  }, [user?.id, hasSubscription, isRunningTest]);

  // Refresh subscription
  const refreshSubscription = useCallback(async () => {
    if (!user?.id || isRefreshing) return;

    setIsRefreshing(true);
    
    try {
      // Call subscription manager to refresh
      const { data, error } = await supabase.functions.invoke('subscription-manager', {
        body: {
          action: 'cleanup',
          user_id: user.id
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      // Wait a moment then re-check health
      setTimeout(() => {
        checkSubscriptionHealth();
      }, 2000);

      toast.success('Subscription refreshed successfully');

    } catch (error) {
      console.error('[DeliveryMonitor] Refresh failed:', error);
      toast.error('Failed to refresh subscription');
    } finally {
      setIsRefreshing(false);
    }
  }, [user?.id, isRefreshing, checkSubscriptionHealth]);

  // Periodic health checks
  useEffect(() => {
    if (!initialized || !hasSubscription) return;

    // Initial check
    checkSubscriptionHealth();

    // Set up periodic checks
    const interval = setInterval(checkSubscriptionHealth, platformConfig.healthCheckInterval);
    
    return () => clearInterval(interval);
  }, [initialized, hasSubscription, checkSubscriptionHealth, platformConfig.healthCheckInterval]);

  // Show emergency fix component even if not fully subscribed
  if (!isGranted || !hasSubscription) {
    return <PlayerIdEmergencyFix />;
  }

  const getHealthBadgeColor = () => {
    switch (deliveryStatus.subscriptionHealth) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'error': return 'destructive';
      default: return 'outline';
    }
  };

  const getHealthIcon = () => {
    switch (deliveryStatus.subscriptionHealth) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'warning': 
      case 'error': return <AlertCircle className="h-4 w-4" />;
      default: return <RefreshCw className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-full space-y-4">
      <PlayerIdEmergencyFix />
      
      <Card className="w-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {getHealthIcon()}
            Notification Delivery Status
          </CardTitle>
        </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Subscription Health:</span>
          <Badge variant={getHealthBadgeColor()}>
            {deliveryStatus.subscriptionHealth}
          </Badge>
        </div>

        {deliveryStatus.lastTestTime && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Test:</span>
            <div className="flex items-center gap-2">
              <Badge variant={deliveryStatus.lastTestSuccess ? 'default' : 'destructive'}>
                {deliveryStatus.lastTestSuccess ? 'Success' : 'Failed'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(deliveryStatus.lastTestTime).toLocaleTimeString()}
              </span>
            </div>
          </div>
        )}

        {platformInfo.hasNotificationQuirks && (
          <div className="text-xs text-muted-foreground p-2 bg-secondary/20 rounded">
            <strong>{platformInfo.platform.toUpperCase()} Notice:</strong> {
              platformInfo.platform === 'ios' 
                ? 'iOS notifications may be delayed when app is backgrounded'
                : 'This browser may have specific notification behaviors'
            }
          </div>
        )}

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runDeliveryTest}
            disabled={isRunningTest || !hasSubscription}
            className="flex-1"
          >
            <TestTube className="h-4 w-4 mr-1" />
            {isRunningTest ? 'Testing...' : 'Test Delivery'}
          </Button>

          {deliveryStatus.needsRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={refreshSubscription}
              disabled={isRefreshing}
              className="flex-1"
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          )}
        </div>

        {deliveryStatus.lastVerification && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
              Technical Details
            </summary>
            <div className="mt-2 p-2 bg-secondary/10 rounded text-xs font-mono">
              <div>Player Exists: {deliveryStatus.lastVerification.player_exists ? '✓' : '✗'}</div>
              <div>WebPush Subscribed: {deliveryStatus.lastVerification.webpush_subscribed ? '✓' : '✗'}</div>
              <div>In Segment: {deliveryStatus.lastVerification.in_subscribed_segment ? '✓' : '✗'}</div>
              <div>Platform: {platformInfo.platform} {platformInfo.browser}</div>
              <div>PWA: {platformInfo.isPWA ? '✓' : '✗'}</div>
            </div>
          </details>
        )}
      </CardContent>
      </Card>
    </div>
  );
}