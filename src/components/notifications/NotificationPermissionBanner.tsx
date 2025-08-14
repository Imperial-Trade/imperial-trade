import React, { useState, useEffect } from "react";
import { Bell, X, Smartphone, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/contexts/NotificationsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useWelcome } from "@/contexts/WelcomeContext";
import { useOneSignal } from "@/hooks/useOneSignal";
import { getBrowserInstructions } from "@/utils/browserDetection";
import { usePWAInstallation } from "@/hooks/usePWAInstallation";
import PWAInstallBanner from "@/components/pwa/PWAInstallBanner";
import { toast } from "sonner";

const NotificationPermissionBanner: React.FC = () => {
  const { user } = useAuth();
  const { hasSeenWelcome } = useWelcome();
  const { 
    permission, 
    isIframeBlocked, 
    browserInfo, 
    browserInstructions,
    requestPermission,
    initialized 
  } = useOneSignal();
  
  const {
    isIOSDevice,
    isStandalone,
    showIOSInstructions,
    canInstall,
    isInstalled
  } = usePWAInstallation();
  
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showPWAPrompt, setShowPWAPrompt] = useState(false);

  // Show banner logic
  useEffect(() => {
    if (!hasSeenWelcome) return;
    
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [hasSeenWelcome]);

  // Check if we should show PWA prompt for iOS users
  useEffect(() => {
    if (isIOSDevice && !isStandalone && showIOSInstructions && permission !== 'granted') {
      setShowPWAPrompt(true);
    }
  }, [isIOSDevice, isStandalone, showIOSInstructions, permission]);

  // Don't show if conditions aren't met
  if (!isVisible || !initialized || permission === 'granted' || !user) {
    return showPWAPrompt ? <PWAInstallBanner onClose={() => setShowPWAPrompt(false)} /> : null;
  }

  const isDenied = permission === 'denied';
  
  const handleRequestPermission = async () => {
    setIsLoading(true);
    
    try {
      // For iOS users, we need PWA installation first
      if (isIOSDevice && !isStandalone) {
        toast.info("iPhone users need to install the app first", {
          description: "Follow the installation guide to enable notifications"
        });
        setShowPWAPrompt(true);
        return;
      }

      const result = await requestPermission();
      
      if (result.success) {
        toast.success("Notifications enabled!", {
          description: "You'll now receive real-time trading signals"
        });
        setIsVisible(false);
      } else {
        if (result.error === 'denied') {
          toast.error("Notifications blocked", {
            description: browserInstructions
          });
        } else if (result.error === 'iframe_blocked') {
          toast.warning("Please open in main browser", {
            description: "Notifications don't work in embedded windows"
          });
        } else {
          toast.error("Failed to enable notifications", {
            description: result.error || "Please try again or check browser settings"
          });
        }
      }
    } catch (error) {
      console.error('Permission request error:', error);
      toast.error("Something went wrong", {
        description: "Please try again or check your browser settings"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (showPWAPrompt) {
    return <PWAInstallBanner onClose={() => setShowPWAPrompt(false)} />;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-card border border-border rounded-lg shadow-lg p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            {isIOSDevice && !isStandalone ? (
              <Smartphone className="h-5 w-5 text-amber-500" />
            ) : isDenied ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <Bell className="h-5 w-5 text-primary" />
            )}
            <h3 className="font-semibold text-foreground">
              {isIOSDevice && !isStandalone 
                ? 'Install App for Notifications'
                : isDenied 
                  ? 'Notifications Blocked' 
                  : 'Enable Notifications'
              }
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {isIOSDevice && !isStandalone
            ? 'iPhone users need to install the app to receive push notifications (iOS 16.4+)'
            : isDenied
              ? 'Please enable notifications in your browser settings to receive real-time trading signals.'
              : 'Get instant alerts for new trading signals and market updates.'
          }
        </p>

        {isIframeBlocked ? (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-4">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Notifications are not available in embedded windows. Please open this page in your main browser.
            </p>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={handleRequestPermission}
              disabled={isLoading}
              size="sm"
              className="flex-1"
            >
              {isLoading ? 'Requesting...' : 
               isIOSDevice && !isStandalone ? 'Show Install Guide' :
               isDenied ? 'Open Settings' : 'Enable Now'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDismiss}
            >
              Later
            </Button>
          </div>
        )}

        {browserInfo.isInAppBrowser && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
            ⚠️ Detected in-app browser. Open in {browserInfo.isIOS ? 'Safari' : 'Chrome'} for best experience.
          </p>
        )}

        {!browserInfo.isSupported && (
          <p className="text-xs text-destructive mt-2">
            ⚠️ Your browser doesn't support push notifications. Please update or use Chrome/Safari.
          </p>
        )}
      </div>
    </div>
  );
};

export default NotificationPermissionBanner;