import React from 'react';
import { Bell, Smartphone, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { detectSafariPWA } from '@/utils/safariPWADetection';
import { useNotifications } from '@/contexts/NotificationsContext';

export const IOSPWANotificationBanner: React.FC = () => {
  const { isSafariPWA, hasWebPushSupport } = detectSafariPWA();
  const { isGranted, requestPermission } = useNotifications();

  // Only show on iOS Safari PWA when notifications are not granted
  if (!isSafariPWA || isGranted) {
    return null;
  }

  const handleEnableNotifications = async () => {
    await requestPermission();
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5 mb-4">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Enable PWA Notifications</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              {hasWebPushSupport 
                ? 'Get instant trading alerts directly on your iOS device. Tap below to enable push notifications.'
                : 'Your iOS version doesn\'t support push notifications in PWAs. Please update to iOS 16.4+ for notifications.'
              }
            </p>
            {hasWebPushSupport && (
              <Button 
                onClick={handleEnableNotifications}
                size="sm" 
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Enable Notifications
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};