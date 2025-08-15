import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const NotificationForceReset: React.FC = () => {
  const { toast } = useToast();

  const handleForceReset = () => {
    try {
      // Clear all notification-related localStorage
      const notificationKeys = [
        'notification_banner_dismissed',
        'onesignal_permission_dismissed', 
        'push_prompt_dismissed',
        'onesignal_subscription_status',
        'notification_setup_completed'
      ];
      
      notificationKeys.forEach(key => {
        localStorage.removeItem(key);
      });
      
      // Clear OneSignal data if present
      if (window.OneSignal) {
        window.OneSignal.User.clearSession?.();
      }
      
      toast({
        title: "Notification Settings Reset",
        description: "All notification preferences cleared. Please refresh the page.",
      });
      
      // Force page reload to reinitialize everything
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Force reset error:', error);
      toast({
        title: "Reset Failed",
        description: "Failed to reset notification settings.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5" />
          Emergency Notification Reset
        </CardTitle>
        <CardDescription className="text-amber-600 dark:text-amber-400">
          If notifications aren't working, use this emergency reset to clear all notification settings and restart the setup process.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={handleForceReset}
          variant="outline"
          className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/40"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Force Reset Notifications
        </Button>
      </CardContent>
    </Card>
  );
};

export default NotificationForceReset;