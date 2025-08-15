import React, { useState, useEffect } from "react";
import { Bell, X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOneSignalEnhanced } from "@/hooks/useOneSignalEnhanced";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import NotificationForceReset from './NotificationForceReset';
import PlayerIdRecoveryPanel from './PlayerIdRecoveryPanel';

interface UnifiedPermissionFlowProps {
  autoShow?: boolean;
  onClose?: () => void;
  className?: string;
}

const UnifiedPermissionFlow: React.FC<UnifiedPermissionFlowProps> = ({ 
  autoShow = false, 
  onClose,
  className = '' 
}) => {
  const { profile } = useAuth();
  const { 
    requestPermission, 
    initialized: isInitialized, 
    permission: notificationPermission,
    hasSubscription,
    isGranted,
    verifySubscription
  } = useOneSignalEnhanced();
  
  // Detect iOS and PWA manually since they're not in the hook
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isPWA = window.matchMedia('(display-mode: standalone)').matches;
  
  const [isVisible, setIsVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'default'>('unknown');

  // EMERGENCY FIX: Clear localStorage barriers and force prompt display
  useEffect(() => {
    // Clear all notification-related localStorage on mount
    localStorage.removeItem('notification_banner_dismissed');
    localStorage.removeItem('onesignal_permission_dismissed');
    localStorage.removeItem('push_prompt_dismissed');
    console.log('🚨 EMERGENCY: Cleared notification localStorage barriers');
    
    // Force show if OneSignal is initialized and user exists (EMERGENCY MODE)
    if (isInitialized && profile) {
      console.log('🚨 EMERGENCY: Forcing notification prompt display');
      setIsVisible(true);
    }
  }, [isInitialized, profile]);

  // Update permission state when OneSignal state changes
  useEffect(() => {
    const permission = notificationPermission === 'unsupported' ? 'unknown' : notificationPermission;
    setPermissionState(permission || 'unknown');
  }, [notificationPermission]);

  const handleRequestPermission = async () => {
    if (!isInitialized) {
      toast.error("OneSignal not ready", {
        description: "Please wait for the notification system to initialize"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      const result = await requestPermission();
      
      if (result.success) {
        toast.success("🎉 Notifications enabled!", {
          description: "You'll now receive real-time trading signals"
        });
        
        // Verify subscription was created successfully
        setTimeout(async () => {
          try {
            await verifySubscription();
          } catch (error) {
            console.error('Post-permission verification failed:', error);
          }
        }, 1000);
        
        handleClose();
      } else {
        // Handle different failure scenarios
        if (result.error === 'permission_denied') {
          toast.error("Permission denied", {
            description: "Please enable notifications in your browser settings and try again"
          });
        } else if (result.error === 'unsupported_browser') {
          toast.error("Browser not supported", {
            description: "Your browser doesn't support push notifications"
          });
        } else {
          toast.error("Failed to enable notifications", {
            description: "Please try again or check your device settings"
          });
        }
      }
    } catch (error) {
      console.error('Permission request error:', error);
      toast.error("Something went wrong", {
        description: "Please try again or restart the app"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    // EMERGENCY FIX: Don't persist dismissal for now
    // localStorage.setItem('notification_banner_dismissed', 'true');
    console.log('🚨 EMERGENCY: Notification prompt closed (not persisted)');
    onClose?.();
  };

  const getStatusBadge = () => {
    if (permissionState === 'granted' && hasSubscription) {
      return (
        <Badge variant="default" className="gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          <CheckCircle className="h-3 w-3" />
          Notifications Active
        </Badge>
      );
    }
    
    if (permissionState === 'denied') {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Permission Denied
        </Badge>
      );
    }
    
    if (isProcessing) {
      return (
        <Badge variant="outline" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Setting Up...
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="gap-1">
        <Bell className="h-3 w-3" />
        Not Enabled
      </Badge>
    );
  };

  const getSpecialInstructions = () => {
    if (isIOS && isPWA) {
      return (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
            📱 iOS PWA Instructions:
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            1. Tap "Subscribe to Notifications" below<br/>
            2. When prompted, tap "Allow" in the permission dialog<br/>
            3. Notifications will work directly in your installed app
          </p>
        </div>
      );
    }
    
    if (isIOS) {
      return (
        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
          <p className="text-sm text-orange-700 dark:text-orange-300 font-medium">
            📱 iOS Safari Note:
          </p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
            Install this app to your home screen for the best notification experience
          </p>
        </div>
      );
    }
    
    return null;
  };

  if (!isVisible || !profile) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto ${className}`}>
      <Card className="shadow-lg border-2 border-accent-gold/20 bg-card">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 flex-1">
              <Bell className="h-5 w-5 text-accent-gold" />
              <div>
                <CardTitle className="text-base">Enable Push Notifications</CardTitle>
                <CardDescription className="text-sm">
                  Get instant alerts for new trading signals
                </CardDescription>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="h-6 w-6 p-0 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-2">
            {getStatusBadge()}
            {isIOS && isPWA && (
              <Badge variant="secondary" className="text-xs">
                iOS PWA Ready
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex gap-2">
            <Button
              onClick={handleRequestPermission}
              disabled={isProcessing || !isInitialized || permissionState === 'granted'}
              size="sm"
              variant="default"
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : permissionState === 'granted' ? (
                'Notifications Enabled'
              ) : (
                'Subscribe to Notifications'
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
            >
              Skip
            </Button>
          </div>

          {getSpecialInstructions()}

          <p className="text-xs text-muted-foreground mt-3">
            ✅ Works on all modern browsers and PWA installations
          </p>
        </CardContent>
        
        {/* Emergency Tools */}
        <div className="px-6 pb-6 space-y-4">
          <NotificationForceReset />
          <PlayerIdRecoveryPanel />
        </div>
      </Card>
    </div>
  );
};

export default UnifiedPermissionFlow;