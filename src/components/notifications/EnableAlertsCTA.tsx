import React, { useState } from 'react';
import { Bell, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const EnableAlertsCTA: React.FC = () => {
  const { permission, isGranted, isIframeBlocked, requestPermission, browserInstructions } = useNotifications();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Don't show if already granted or in iframe/builder
  if (isGranted || isIframeBlocked || !user) {
    return null;
  }

  const handleEnableAlerts = async () => {
    setIsLoading(true);
    console.log('🔔 [EnableAlertsCTA] User clicked Enable Alerts');
    
    try {
      const result = await requestPermission();
      
      if (result.success) {
        toast({
          title: "🔔 Alerts Enabled!",
          description: "You'll now receive trading signals and updates.",
        });
        console.log('✅ [EnableAlertsCTA] Permission granted successfully');
      } else {
        console.warn('❌ [EnableAlertsCTA] Permission failed:', result.error);
        toast({
          title: "Enable Alerts",
          description: result.error || "Please try again or check your browser settings.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('💥 [EnableAlertsCTA] Permission request error:', error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={handleEnableAlerts}
        disabled={isLoading}
        size="sm"
        variant="outline"
        className="border-primary/30 text-primary hover:bg-primary/10 flex items-center gap-2"
      >
        {isLoading ? (
          <BellRing className="h-4 w-4 animate-pulse" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {isLoading ? 'Enabling...' : 'Enable Alerts'}
      </Button>
      
      {(isSafari || isIOS) && browserInstructions && (
        <div className="hidden lg:block text-xs text-muted-foreground max-w-xs">
          Tap button to enable notifications
        </div>
      )}
    </div>
  );
};

export default EnableAlertsCTA;