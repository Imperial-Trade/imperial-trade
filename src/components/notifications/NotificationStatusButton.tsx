import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Bell, BellOff, CheckCircle, RefreshCw, Settings } from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NotificationExplainer } from './NotificationExplainer';

interface NotificationStatusButtonProps {
  className?: string;
  showLabel?: boolean;
}

export const NotificationStatusButton: React.FC<NotificationStatusButtonProps> = ({ 
  className = '', 
  showLabel = true 
}) => {
  const { permission, isGranted, hasSubscription, requestPermission, initialized } = useNotifications();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isChecking, setIsChecking] = useState(false);

  const getStatusInfo = () => {
    if (!initialized) {
      return {
        variant: 'secondary' as const,
        icon: RefreshCw,
        label: 'Initializing...',
        description: 'Setting up notifications',
        action: null
      };
    }

    if (permission === 'denied') {
      return {
        variant: 'destructive' as const,
        icon: BellOff,
        label: 'Blocked',
        description: 'Notifications are blocked. Click to enable in browser settings.',
        action: 'settings'
      };
    }

    if (!isGranted || !hasSubscription) {
      return {
        variant: 'outline' as const,
        icon: Bell,
        label: 'Enable Push',
        description: 'Get instant trading alerts and signals',
        action: 'enable'
      };
    }

    return {
      variant: 'default' as const,
      icon: CheckCircle,
      label: 'Active',
      description: 'Push notifications are working',
      action: 'check'
    };
  };

  const handleAction = async () => {
    const { action } = getStatusInfo();
    
    if (action === 'enable') {
      try {
        setIsChecking(true);
        const result = await requestPermission();
        
        if (result.success) {
          toast({
            title: "✅ Push notifications enabled!",
            description: "You'll now receive instant trading alerts and signals.",
          });
        } else {
          toast({
            title: "❌ Failed to enable notifications",
            description: result.error || "Please try again or check your browser settings.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "❌ Error enabling notifications",
          description: "Please try again or check your browser settings.",
          variant: "destructive",
        });
      } finally {
        setIsChecking(false);
      }
    } else if (action === 'check') {
      setIsChecking(true);
      try {
        // Check current subscription status via API
        if (user?.id) {
          const { data, error } = await supabase.functions.invoke('onesignal-verify-subscription', {
            body: { user_id: user.id }
          });
          
          if (error) {
            toast({
              title: "❌ Status check failed",
              description: "Could not verify notification status. Please try again.",
              variant: "destructive",
            });
          } else {
            const isActive = data?.subscription_status?.has_active_webpush;
            toast({
              title: isActive ? "✅ Notifications active" : "⚠️ Notifications inactive",
              description: isActive ? 
                "Your push notifications are working correctly." :
                "Your notifications may need to be re-enabled.",
            });
          }
        }
      } catch (error) {
        toast({
          title: "❌ Status check failed",
          description: "Could not verify notification status.",
          variant: "destructive",
        });
      } finally {
        setIsChecking(false);
      }
    } else if (action === 'settings') {
      // Open browser notification settings
      toast({
        title: "📱 Enable in browser settings",
        description: "Go to your browser settings > Notifications > Allow for this site",
      });
    }
  };

  if (!user) return null;

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <Button
          variant={statusInfo.variant}
          size="sm"
          onClick={handleAction}
          disabled={isChecking}
          className="flex items-center gap-2"
        >
          {isChecking ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Icon className="h-4 w-4" />
          )}
          {showLabel && statusInfo.label}
        </Button>
        
        {statusInfo.variant === 'destructive' && (
          <Badge variant="outline" className="text-xs">
            <Settings className="h-3 w-3 mr-1" />
            Browser Settings
          </Badge>
        )}
      </div>
    </div>
  );
};