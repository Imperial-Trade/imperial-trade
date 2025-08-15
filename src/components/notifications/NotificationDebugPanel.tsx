/**
 * Notification Debug Panel - Phase 4: Comprehensive Monitoring
 * Provides detailed debugging information for notification setup
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOneSignalEnhanced } from "@/hooks/useOneSignalEnhanced";
import { usePlayerIdVerification } from "@/hooks/usePlayerIdVerification";
import { detectSafariPWA } from "@/utils/safariPWADetection";
import { detectPlatform } from "@/utils/platformDetection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, RefreshCw, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NotificationDebugPanelProps {
  className?: string;
}

export default function NotificationDebugPanel({ className = "" }: NotificationDebugPanelProps) {
  const { user } = useAuth();
  const { initialized, permission, hasSubscription, browserInfo } = useOneSignalEnhanced();
  const { hasValidPlayerId, verificationStatus, forceRecapture } = usePlayerIdVerification();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [edgeFunctionLogs, setEdgeFunctionLogs] = useState<any[]>([]);
  
  const safariPWAInfo = detectSafariPWA();
  const platformInfo = detectPlatform();

  // Check if debug should be shown (only in development or with localStorage flag)
  useEffect(() => {
    const shouldShow = localStorage.getItem('show_notification_debug') === '1' || 
                     import.meta.env.DEV ||
                     window.location.hostname === 'localhost';
    setIsVisible(shouldShow);
  }, []);

  const fetchDbStatus = async () => {
    if (!user?.id) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('onesignal_player_id, push_subscription_active, onesignal_subscription_status, onesignal_last_verified_at')
        .eq('id', user.id)
        .single();
      
      setDbStatus(data);
    } catch (error) {
      console.error('Debug: Failed to fetch DB status:', error);
    }
  };

  const testNotificationPipeline = async () => {
    toast.info("Testing notification pipeline...");
    
    try {
      // Test onesignal-verify-subscription
      const { data, error } = await supabase.functions.invoke('onesignal-verify-subscription', {
        body: { user_id: user?.id }
      });
      
      if (error) {
        toast.error(`Verification failed: ${error.message}`);
      } else {
        toast.success("Pipeline test completed - check console for details");
        console.log('Pipeline test result:', data);
      }
    } catch (error) {
      toast.error("Pipeline test failed");
      console.error('Pipeline test error:', error);
    }
  };

  const toggleDebugMode = () => {
    const newState = localStorage.getItem('onesignal_debug') !== '1';
    localStorage.setItem('onesignal_debug', newState ? '1' : '0');
    toast.info(`Debug mode ${newState ? 'enabled' : 'disabled'} - refresh page to apply`);
  };

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchDbStatus();
    }
  }, [isOpen, user?.id]);

  if (!isVisible) return null;

  const oneSignalState = typeof window !== 'undefined' ? {
    oneSignalExists: !!(window as any).OneSignal,
    hasUser: !!(window as any).OneSignal?.User,
    hasPushSubscription: !!(window as any).OneSignal?.User?.PushSubscription,
    subscriptionId: (window as any).OneSignal?.User?.PushSubscription?.id,
    isInitialized: (window as any).OneSignal?._isInitialized || false
  } : {};

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <Card className="w-80">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <CardHeader className="pb-2 cursor-pointer hover:bg-secondary/50">
              <CardTitle className="flex items-center justify-between text-sm">
                <span>🔧 Notification Debug</span>
                <div className="flex items-center gap-2">
                  <Badge variant={hasValidPlayerId ? "default" : "destructive"} className="text-xs">
                    {hasValidPlayerId ? "✓" : "✗"} Player ID
                  </Badge>
                  <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <CardContent className="space-y-3 text-xs">
              {/* Status Overview */}
              <div className="grid grid-cols-2 gap-2">
                <Badge variant={initialized ? "default" : "secondary"}>
                  {initialized ? "✓" : "✗"} Initialized
                </Badge>
                <Badge variant={permission === 'granted' ? "default" : "secondary"}>
                  {permission === 'granted' ? "✓" : "✗"} Permission
                </Badge>
                <Badge variant={hasSubscription ? "default" : "secondary"}>
                  {hasSubscription ? "✓" : "✗"} Subscription
                </Badge>
                <Badge variant={safariPWAInfo.isSafariPWA ? "default" : "secondary"}>
                  {safariPWAInfo.isSafariPWA ? "✓" : "✗"} iOS PWA
                </Badge>
              </div>

              {/* Database Status */}
              {dbStatus && (
                <div className="bg-secondary/50 p-2 rounded">
                  <div className="font-medium mb-1">Database Status:</div>
                  <div>Player ID: {dbStatus.onesignal_player_id ? '✓ Present' : '✗ Missing'}</div>
                  <div>Push Active: {dbStatus.push_subscription_active ? '✓ Yes' : '✗ No'}</div>
                  <div>Status: {dbStatus.onesignal_subscription_status || 'unknown'}</div>
                </div>
              )}

              {/* OneSignal State */}
              <div className="bg-secondary/50 p-2 rounded">
                <div className="font-medium mb-1">OneSignal State:</div>
                <div>SDK Loaded: {oneSignalState.oneSignalExists ? '✓' : '✗'}</div>
                <div>Has User: {oneSignalState.hasUser ? '✓' : '✗'}</div>
                <div>Has Subscription: {oneSignalState.hasPushSubscription ? '✓' : '✗'}</div>
                <div>Player ID: {oneSignalState.subscriptionId ? '✓ Present' : '✗ Missing'}</div>
              </div>

              {/* Platform Info */}
              <div className="bg-secondary/50 p-2 rounded">
                <div className="font-medium mb-1">Platform Info:</div>
                <div>Platform: {platformInfo.platform}</div>
                <div>Browser: {platformInfo.browser}</div>
                <div>Safari PWA: {safariPWAInfo.isSafariPWA ? '✓' : '✗'}</div>
                <div>Web Push Support: {safariPWAInfo.hasWebPushSupport ? '✓' : '✗'}</div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                <Button size="sm" onClick={fetchDbStatus} className="text-xs">
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh Status
                </Button>
                
                <Button size="sm" variant="outline" onClick={forceRecapture} className="text-xs">
                  Force Player ID Capture
                </Button>
                
                <Button size="sm" variant="outline" onClick={testNotificationPipeline} className="text-xs">
                  Test Pipeline
                </Button>
                
                <Button size="sm" variant="outline" onClick={toggleDebugMode} className="text-xs">
                  {localStorage.getItem('onesignal_debug') === '1' ? <EyeOff className="h-3 w-3 mr-1" /> : <Eye className="h-3 w-3 mr-1" />}
                  Toggle Debug Logs
                </Button>
              </div>

              <div className="text-xs text-muted-foreground border-t pt-2">
                Verification Status: <span className="font-medium">{verificationStatus}</span>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}