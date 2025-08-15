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

  // Show notification prompt when conditions are met
  useEffect(() => {
    // Show prompt if auto-show is enabled, user is logged in, and notifications aren't granted
    if (autoShow && profile && permissionState !== 'granted') {
      console.log('[UnifiedPermissionFlow] 🎯 UNIFIED: Showing custom notification prompt');
      setIsVisible(true);
    }
  }, [autoShow, profile, permissionState]);

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
        handleClose();
      } else {
        toast.error(result.error || "Failed to enable notifications", {
          description: "Please try again"
        });
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
    console.log('[UnifiedPermissionFlow] Notification prompt closed');
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
    return null; // OneSignal native prompt handles all platform-specific instructions
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