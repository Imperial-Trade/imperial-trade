import React, { useState, useEffect } from 'react';
import { X, Bell, Settings, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';

export const PushPermissionReminder: React.FC = () => {
  const [showReminder, setShowReminder] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { permission, isGranted, requestPermission, browserInstructions } = useNotifications();
  const { user } = useAuth();

  useEffect(() => {
    if (!user || dismissed) return;

    // Check if user has dismissed this reminder recently (7-day cooldown)
    const dismissalKey = `push-reminder-dismissed-${user.id}`;
    const lastDismissed = localStorage.getItem(dismissalKey);
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    if (lastDismissed && parseInt(lastDismissed) > sevenDaysAgo) {
      return;
    }

    // Show reminder if permission was denied and user is logged in
    const shouldShow = permission === 'denied' && !isGranted;
    
    if (shouldShow) {
      // Add a small delay to avoid showing immediately on login
      const timer = setTimeout(() => setShowReminder(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [user, permission, isGranted, dismissed]);

  const handleDismiss = () => {
    setShowReminder(false);
    setDismissed(true);
    
    // Store dismissal timestamp for this user (7-day cooldown)
    if (user) {
      const dismissalKey = `push-reminder-dismissed-${user.id}`;
      localStorage.setItem(dismissalKey, Date.now().toString());
    }
  };

  const handleTryAgain = async () => {
    // If permission is denied, we can't request again - guide to browser settings
    if (permission === 'denied') {
      // Hide the reminder since we're directing them to browser settings
      setShowReminder(false);
      return;
    }

    const result = await requestPermission();
    if (result.success) {
      setShowReminder(false);
    }
  };

  if (!showReminder || !user) return null;

  return (
    <div className="fixed top-20 right-4 z-50 max-w-sm">
      <Card className="border-primary/20 bg-card/95 backdrop-blur-sm shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-primary/10 p-2 flex-shrink-0">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            
            <div className="flex-1 space-y-2">
              <h4 className="font-medium text-sm">Enable Push Notifications</h4>
              <p className="text-xs text-muted-foreground">
                Stay updated with live trading signals and market alerts. You previously blocked notifications.
              </p>
              
              {browserInstructions && (
                <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                  <div className="flex items-center gap-1 mb-1">
                    <Settings className="h-3 w-3" />
                    <span className="font-medium">To enable:</span>
                  </div>
                  <p>{browserInstructions}</p>
                </div>
              )}
              
              <div className="flex gap-2 pt-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleTryAgain}
                  className="text-xs"
                >
                  {permission === 'denied' ? (
                    <>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Browser Settings
                    </>
                  ) : (
                    'Try Again'
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  onClick={handleDismiss}
                  className="text-xs"
                >
                  Maybe Later
                </Button>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-6 w-6 p-0 flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};