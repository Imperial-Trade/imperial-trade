import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, X, Zap, TrendingUp, Shield, Smartphone } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { usePusherBeams } from '@/hooks/usePusherBeams';

interface PushNotificationPromptProps {
  onClose?: () => void;
  showAfterDelay?: boolean;
  delayMs?: number;
}

export const PushNotificationPrompt: React.FC<PushNotificationPromptProps> = ({
  onClose,
  showAfterDelay = false,
  delayMs = 10000, // 10 seconds default
}) => {
  const { user } = useAuth();
  const { isInitialized, isPushEnabled, subscribeToPush } = usePusherBeams();
  
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSubscriptionLoading, setIsSubscriptionLoading] = useState(false);

  // Request browser notification permission
  const requestPermission = async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      return 'denied';
    }
    
    if (Notification.permission === 'granted') {
      return 'granted';
    }
    
    if (Notification.permission === 'denied') {
      return 'denied';
    }
    
    const permission = await Notification.requestPermission();
    return permission;
  };

  useEffect(() => {
    if (!user) return;

    // Check if user has already been prompted or enabled push
    const hasBeenPrompted = localStorage.getItem('push-notification-prompted');
    if (hasBeenPrompted || isPushEnabled) return;

    if (showAfterDelay) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, delayMs);
      
      return () => clearTimeout(timer);
    } else {
      setIsVisible(true);
    }
  }, [user, isPushEnabled, showAfterDelay, delayMs]);

  const handleEnable = async () => {
    setIsSubscriptionLoading(true);
    try {
      const permissionGranted = await requestPermission();
      if (permissionGranted === 'granted') {
        // Small delay to let permission dialog close
        setTimeout(async () => {
          const subscribed = await subscribeToPush();
          if (subscribed) {
            handleClose();
          }
          setIsSubscriptionLoading(false);
        }, 500);
      } else {
        setIsSubscriptionLoading(false);
        // Permission denied - close prompt
        handleClose();
      }
    } catch (error) {
      console.error('❌ [PushNotificationPrompt] Failed to enable notifications:', error);
      setIsSubscriptionLoading(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setIsDismissed(true);
    localStorage.setItem('push-notification-prompted', 'true');
    onClose?.();
  };

  // Don't show if not initialized, already enabled, dismissed, or user not authenticated
  if (!isInitialized || isPushEnabled || isDismissed || !user || !isVisible) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.9 }}
        transition={{ type: "spring", duration: 0.5 }}
        className="fixed bottom-4 right-4 z-50 max-w-sm"
      >
        <Card className="border-primary/20 bg-background/95 backdrop-blur-sm shadow-xl">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="p-2 rounded-full bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">
                    Get Instant Trade Alerts
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Never miss profitable opportunities
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Benefits */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <Zap className="h-4 w-4 text-amber-500" />
                <span>Real-time signal notifications</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span>Take profit & stop loss alerts</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Shield className="h-4 w-4 text-blue-500" />
                <span>Market updates & analysis</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <Smartphone className="h-4 w-4 text-purple-500" />
                <span>Works even when app is closed</span>
              </div>
            </div>

            {/* Privacy Note */}
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-xs text-muted-foreground">
                <Shield className="h-3 w-3 inline mr-1" />
                Your privacy is protected. You can unsubscribe anytime.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <Button
                onClick={handleEnable}
                disabled={isSubscriptionLoading}
                className="flex-1"
                size="sm"
              >
                {isSubscriptionLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                    <span>Enabling...</span>
                  </div>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Enable Alerts
                  </>
                )}
              </Button>
              <Button
                onClick={handleClose}
                variant="outline"
                size="sm"
              >
                Later
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center justify-center space-x-2 pt-2">
              <Badge variant="secondary" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Secure
              </Badge>
              <Badge variant="secondary" className="text-xs">
                No Spam
              </Badge>
              <Badge variant="secondary" className="text-xs">
                Professional
              </Badge>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};