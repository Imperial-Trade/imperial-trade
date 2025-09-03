import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Bell, Zap, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useOneSignalPush } from '@/hooks/useOneSignalPush';
import { useProfessionalToast } from '@/hooks/useProfessionalToast';

export const XeonStreamSubscriptionToggle: React.FC = () => {
  const { user, profile } = useAuth();
  const { isPushEnabled, subscribeToPush } = useOneSignalPush();
  const { showToast } = useProfessionalToast();
  const [isLoading, setIsLoading] = useState(false);

  const isXeonStreamActive = (profile as any)?.xeon_stream_subscription || false;

  const handleToggleXeonStream = async (enabled: boolean) => {
    if (!user) return;

    setIsLoading(true);

    try {
      if (enabled && !isPushEnabled) {
        // First enable push notifications
        const pushSuccess = await subscribeToPush();
        if (!pushSuccess) {
          showToast({
            type: 'error',
            title: "Push Notifications Required",
            description: "Please enable push notifications first to subscribe to Xeon Stream.",
          });
          setIsLoading(false);
          return;
        }
      }

      // Update Xeon Stream subscription
      const { error } = await supabase
        .from('profiles')
        .update({
          xeon_stream_subscription: enabled,
          xeon_stream_activated_at: enabled ? new Date().toISOString() : null,
          notification_preferences: {
            ...(profile as any)?.notification_preferences,
            xeon_stream: enabled,
            push: enabled ? true : (profile as any)?.notification_preferences?.push,
          }
        })
        .eq('id', user.id);

      if (error) throw error;

      showToast({
        type: enabled ? 'success' : 'info',
        title: enabled ? "🚀 Xeon Stream Activated!" : "Xeon Stream Deactivated",
        description: enabled 
          ? "You'll now receive instant price alerts and trading signals."
          : "You'll no longer receive Xeon Stream notifications.",
      });

    } catch (error) {
      console.error('Error updating Xeon Stream subscription:', error);
      showToast({
        type: 'error',
        title: "Subscription Update Failed",
        description: "Unable to update your Xeon Stream subscription. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center space-x-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Xeon Stream</h3>
          <p className="text-sm text-muted-foreground">Real-time trading alerts & signals</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="xeon-stream" className="text-base font-medium">
              Enable Xeon Stream
            </Label>
            <p className="text-sm text-muted-foreground">
              Get instant notifications for price alerts, signal updates, and market opportunities
            </p>
          </div>
          <Switch
            id="xeon-stream"
            checked={isXeonStreamActive}
            onCheckedChange={handleToggleXeonStream}
            disabled={isLoading}
          />
        </div>

        {isXeonStreamActive && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-green-500" />
              <span className="text-sm">Push Notifications</span>
            </div>
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-sm">Price Alerts</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">Trading Signals</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-green-600">Active</span>
            </div>
          </div>
        )}

        {!isPushEnabled && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-700">
              💡 Push notifications must be enabled for Xeon Stream to work properly.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};