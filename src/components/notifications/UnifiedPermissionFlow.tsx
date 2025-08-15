/**
 * Unified Permission Flow - Phase 2: Unified Permission Flow
 * Eliminates dual prompts and provides platform-aware permission handling
 */

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useOneSignalEnhanced } from "@/hooks/useOneSignalEnhanced";
import { usePlayerIdVerification } from "@/hooks/usePlayerIdVerification";
import { usePWAInstallation } from "@/hooks/usePWAInstallation";
import { detectPlatform, getPlatformInstructions } from "@/utils/platformDetection";
import { detectSafariPWA } from "@/utils/safariPWADetection";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Bell, Download, Settings, X } from "lucide-react";
import { toast } from "sonner";
import PlayerIdStatusIndicator from "./PlayerIdStatusIndicator";

interface UnifiedPermissionFlowProps {
  onClose?: () => void;
  autoShow?: boolean;
  className?: string;
}

export default function UnifiedPermissionFlow({ 
  onClose, 
  autoShow = true, 
  className = "" 
}: UnifiedPermissionFlowProps) {
  const { user } = useAuth();
  const { initialized, requestPermission, permission, isGranted, browserInfo } = useOneSignalEnhanced();
  const { hasValidPlayerId, verificationStatus, isIOSPWA } = usePlayerIdVerification();
  const { installPWA, canInstall, isIOSDevice, showIOSInstructions, getIOSInstructions } = usePWAInstallation();
  
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState<'permission' | 'pwa_install' | 'ios_guide' | 'settings'>('permission');
  
  const platformInfo = detectPlatform();
  const safariPWAInfo = detectSafariPWA();
  const instructions = getPlatformInstructions(platformInfo);

  // Determine if we should show the flow
  useEffect(() => {
    console.log('[UnifiedFlow] State check:', {
      autoShow,
      initialized,
      user: !!user,
      isGranted,
      permission,
      supportsWebPush: platformInfo.supportsWebPush,
      isInAppBrowser: platformInfo.isInAppBrowser,
      isPrivateBrowsing: platformInfo.isPrivateBrowsing,
      isPWA: platformInfo.isPWA,
      requiresPWAForPush: platformInfo.requiresPWAForPush,
      platformSpecific: platformInfo.platformSpecific
    });

    if (!autoShow || !initialized || !user) {
      console.log('[UnifiedFlow] Hidden: Missing requirements');
      setIsVisible(false);
      return;
    }

    // Don't show if already granted and working
    if (isGranted) {
      console.log('[UnifiedFlow] Hidden: Already granted');
      setIsVisible(false);
      return;
    }

    // Don't show if permission is denied (user actively blocked)
    if (permission === 'denied') {
      console.log('[UnifiedFlow] Hidden: Permission denied');
      setIsVisible(false);
      return;
    }

    // Don't show in unsupported scenarios
    if (!platformInfo.supportsWebPush || platformInfo.isInAppBrowser || platformInfo.isPrivateBrowsing) {
      console.log('[UnifiedFlow] Hidden: Unsupported scenario');
      setIsVisible(false);
      return;
    }

    // Show for default permission state on supported platforms
    if (permission === 'default') {
      console.log('[UnifiedFlow] Showing permission flow');
      setIsVisible(true);
      
      // **PHASE 5: iOS PWA-specific flow enforcement**
      if (platformInfo.platform === 'ios') {
        // For iOS, strictly enforce PWA installation before push notifications
        if (!safariPWAInfo.isStandalone && !safariPWAInfo.isSafariPWA) {
          console.log('[UnifiedFlow] iOS user not in PWA mode - showing PWA install step');
          setCurrentStep('pwa_install');
        } else if (!safariPWAInfo.hasWebPushSupport) {
          console.log('[UnifiedFlow] iOS version does not support web push');
          setCurrentStep('settings');
        } else {
          console.log('[UnifiedFlow] iOS PWA user - showing permission step');
          setCurrentStep('permission');
        }
      } else if (platformInfo.requiresPWAForPush && !platformInfo.isPWA) {
        console.log('[UnifiedFlow] Starting with PWA install step');
        setCurrentStep('pwa_install');
      } else {
        console.log('[UnifiedFlow] Starting with permission step');
        setCurrentStep('permission');
      }
    }
  }, [autoShow, initialized, user, isGranted, permission, platformInfo, browserInfo.name]);

  const handlePermissionRequest = useCallback(async () => {
    if (!initialized || isLoading) return;

    setIsLoading(true);
    
    try {
      console.log('[UnifiedFlow] 🚀 Starting permission request with enhanced logging');
      
      const result = await requestPermission();
      
      if (result.success) {
        toast.success("Push notifications enabled successfully!");
        console.log('[UnifiedFlow] ✅ Permission granted successfully');
        
        // **PHASE 2: Enhanced success handling for iOS PWA**
        if (isIOSPWA) {
          console.log('[UnifiedFlow] 📱 iOS PWA user - starting Player ID verification');
          toast.info("Setting up iOS PWA notifications...");
          
          // Give OneSignal time to initialize the subscription
          setTimeout(() => {
            console.log('[UnifiedFlow] 🔄 Triggering Player ID verification');
          }, 2000);
        }
        
        setIsVisible(false);
        onClose?.();
      } else {
        console.error('[UnifiedFlow] ❌ Permission request failed:', result);
        
        // Handle specific error cases
        if (result.error === 'denied') {
          setCurrentStep('settings');
          toast.error("Notifications were blocked. Please enable them in browser settings.");
        } else if (result.error?.includes('timeout')) {
          toast.error("Request timed out. Please try again.");
        } else {
          toast.error(result.error || "Failed to enable notifications");
        }
      }
    } catch (error) {
      console.error('[UnifiedFlow] ❌ Permission request failed:', error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [initialized, isLoading, requestPermission, onClose, isIOSPWA]);

  const handlePWAInstall = useCallback(async () => {
    if (!canInstall) return;

    setIsLoading(true);
    
    try {
      await installPWA();
      toast.success("App installed! Notifications will be available after restart.");
      setIsVisible(false);
      onClose?.();
    } catch (error) {
      console.error('[UnifiedFlow] PWA install failed:', error);
      toast.error("Failed to install app");
    } finally {
      setIsLoading(false);
    }
  }, [canInstall, installPWA, onClose]);

  const handleClose = useCallback(() => {
    setIsVisible(false);
    onClose?.();
  }, [onClose]);

  if (!isVisible) return null;

  // Render based on current step
  const renderContent = () => {
    switch (currentStep) {
      case 'pwa_install':
        return (
          <>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="h-5 w-5 text-primary" />
                Install App for Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {platformInfo.platform === 'ios' 
                  ? "On iOS, notifications work best when the app is installed to your home screen."
                  : "Install this app for the best notification experience."
                }
              </p>
              
              {isIOSDevice && !canInstall ? (
                <div className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    To install on iOS Safari:
                  </div>
                  <ol className="text-sm space-y-1 list-decimal list-inside text-muted-foreground">
                    <li>Tap the Share button</li>
                    <li>Scroll down and tap "Add to Home Screen"</li>
                    <li>Tap "Add" in the top right</li>
                    <li>Open the app from your home screen</li>
                  </ol>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handlePWAInstall}
                    disabled={!canInstall || isLoading}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isLoading ? 'Installing...' : 'Install App'}
                  </Button>
                </div>
              )}
              
              <Button
                variant="outline"
                onClick={() => setCurrentStep('permission')}
                className="w-full"
              >
                Continue Without Installing
              </Button>
            </CardContent>
          </>
        );

      case 'settings':
        return (
          <>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5 text-orange-500" />
                Enable in Browser Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Notifications are currently blocked</p>
                  <p className="text-xs text-muted-foreground">
                    You'll need to enable them in your browser settings first.
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm font-medium">To enable notifications:</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  {browserInfo.name === 'Chrome' && (
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Click the lock icon in the address bar</li>
                      <li>Set Notifications to "Allow"</li>
                      <li>Refresh this page</li>
                    </ol>
                  )}
                  {browserInfo.name === 'Safari' && (
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Go to Safari → Settings → Websites</li>
                      <li>Click Notifications on the left</li>
                      <li>Set this site to "Allow"</li>
                    </ol>
                  )}
                  {browserInfo.name === 'Firefox' && (
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Click the shield icon in the address bar</li>
                      <li>Click "Turn off Blocking"</li>
                      <li>Refresh this page</li>
                    </ol>
                  )}
                  {!['Chrome', 'Safari', 'Firefox'].includes(browserInfo.name) && (
                    <p>Please check your browser's notification settings for this site.</p>
                  )}
                </div>
              </div>
              
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
                className="w-full"
              >
                Refresh Page
              </Button>
            </CardContent>
          </>
        );

      default: // 'permission'
        return (
          <>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-primary" />
                Enable Push Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get instant alerts for trading signals, market updates, and important announcements.
              </p>
              
              <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                <span className="text-sm font-medium">Platform Support</span>
                <Badge variant={platformInfo.hasStableDelivery ? "default" : "secondary"}>
                  {platformInfo.platform} {platformInfo.browser}
                </Badge>
              </div>
              
              {instructions && (
                <div className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                  💡 {instructions}
                </div>
              )}
              
              <div className="flex gap-2">
                <Button
                  onClick={handlePermissionRequest}
                  disabled={isLoading || !initialized}
                  className="flex-1"
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {isLoading ? 'Enabling...' : 'Enable Notifications'}
                </Button>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleClose}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {/* **PHASE 4: Real-time Player ID Status for iOS PWA** */}
              {isIOSPWA && (
                <div className="border-t pt-3">
                  <PlayerIdStatusIndicator />
                </div>
              )}
              
              {platformInfo.hasNotificationQuirks && (
                <div className="text-xs text-muted-foreground">
                  <strong>Note:</strong> {
                    platformInfo.platform === 'ios' 
                      ? 'On iOS, notifications work best in installed PWAs and may be delayed in Safari.'
                      : 'This platform may have specific notification behaviors.'
                  }
                </div>
              )}
            </CardContent>
          </>
        );
    }
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 ${className}`}>
      <Card className="w-full max-w-md">
        {renderContent()}
      </Card>
    </div>
  );
}