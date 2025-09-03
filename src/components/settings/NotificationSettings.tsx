import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Bell, Smartphone, Mail, MessageSquare, Shield, AlertTriangle } from 'lucide-react';
import { useOneSignalPush } from '@/hooks/useOneSignalPush';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface NotificationPreferences {
  push_subscription_active: boolean;
  email_notifications: boolean;
  signal_notifications: boolean;
  tp_notifications: boolean;
  stop_loss_notifications: boolean;
  market_alerts: boolean;
  educational_updates: boolean;
  system_notifications: boolean;
}

export const NotificationSettings: React.FC = () => {
  const { user } = useAuth();
  const { 
    isInitialized, 
    isPushEnabled, 
    playerId,
    isSubscriptionLoading,
    subscribeToPush, 
    unsubscribeFromPush 
  } = useOneSignalPush();

  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_subscription_active: false,
    email_notifications: true,
    signal_notifications: true,
    tp_notifications: true,
    stop_loss_notifications: true,
    market_alerts: true,
    educational_updates: false,
    system_notifications: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load user preferences
  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select(`
            push_subscription_active,
            email_notifications,
            notification_preferences
          `)
          .eq('id', user.id)
          .single();

        if (error) throw error;

        const notificationPrefs = profile?.notification_preferences || {};
        
        setPreferences({
          push_subscription_active: profile?.push_subscription_active || false,
          email_notifications: profile?.email_notifications ?? true,
          signal_notifications: notificationPrefs.signal_notifications ?? true,
          tp_notifications: notificationPrefs.tp_notifications ?? true,
          stop_loss_notifications: notificationPrefs.stop_loss_notifications ?? true,
          market_alerts: notificationPrefs.market_alerts ?? true,
          educational_updates: notificationPrefs.educational_updates ?? false,
          system_notifications: notificationPrefs.system_notifications ?? true,
        });
      } catch (error) {
        console.error('Failed to load notification preferences:', error);
        toast({
          title: "Failed to Load Settings",
          description: "Unable to load your notification preferences.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, [user]);

  const updatePreferences = async (updates: Partial<NotificationPreferences>) => {
    if (!user) return;

    setIsSaving(true);
    
    try {
      const newPreferences = { ...preferences, ...updates };
      
      const { push_subscription_active, email_notifications, ...notificationPrefs } = newPreferences;
      
      const { error } = await supabase
        .from('profiles')
        .update({
          push_subscription_active,
          email_notifications,
          notification_preferences: notificationPrefs,
        })
        .eq('id', user.id);

      if (error) throw error;

      setPreferences(newPreferences);
      
      toast({
        title: "Settings Updated",
        description: "Your notification preferences have been saved.",
      });
    } catch (error) {
      console.error('Failed to update preferences:', error);
      toast({
        title: "Update Failed",
        description: "Unable to save your notification preferences.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (!isInitialized) return;

    if (enabled && !isPushEnabled) {
      const success = await subscribeToPush();
      if (success) {
        updatePreferences({ push_subscription_active: true });
      }
    } else if (!enabled && isPushEnabled) {
      const success = await unsubscribeFromPush();
      if (success) {
        updatePreferences({ push_subscription_active: false });
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
          <CardDescription>Loading your preferences...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 bg-muted rounded w-32 animate-pulse" />
                <div className="h-6 bg-muted rounded w-12 animate-pulse" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <CardTitle>Push Notifications</CardTitle>
            </div>
            {isPushEnabled && playerId && (
              <Badge variant="outline" className="text-xs">
                <Shield className="h-3 w-3 mr-1" />
                Active
              </Badge>
            )}
          </div>
          <CardDescription>
            Get instant notifications even when the app is closed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Enable Push Notifications</p>
              <p className="text-sm text-muted-foreground">
                Receive real-time alerts for trading signals and market updates
              </p>
            </div>
            <Switch
              checked={isPushEnabled}
              onCheckedChange={handlePushToggle}
              disabled={!isInitialized || isSubscriptionLoading || isSaving}
            />
          </div>
          
          {isPushEnabled && playerId && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <Shield className="h-4 w-4 inline mr-1" />
                Push notifications are active. Device ID: {playerId.slice(0, 8)}...
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-primary" />
            <CardTitle>Email Notifications</CardTitle>
          </div>
          <CardDescription>
            Receive notifications via email
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-medium">Enable Email Notifications</p>
              <p className="text-sm text-muted-foreground">
                Get weekly summaries and important updates via email
              </p>
            </div>
            <Switch
              checked={preferences.email_notifications}
              onCheckedChange={(checked) => updatePreferences({ email_notifications: checked })}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Notification Types</CardTitle>
          </div>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trading Signals */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Trading Signals</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">New Signals</p>
                <p className="text-sm text-muted-foreground">
                  Get notified when new trading signals are posted
                </p>
              </div>
              <Switch
                checked={preferences.signal_notifications}
                onCheckedChange={(checked) => updatePreferences({ signal_notifications: checked })}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Take Profit Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Notifications when take profit levels are hit
                </p>
              </div>
              <Switch
                checked={preferences.tp_notifications}
                onCheckedChange={(checked) => updatePreferences({ tp_notifications: checked })}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Stop Loss Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Important notifications when stop losses are triggered
                </p>
              </div>
              <Switch
                checked={preferences.stop_loss_notifications}
                onCheckedChange={(checked) => updatePreferences({ stop_loss_notifications: checked })}
                disabled={isSaving}
              />
            </div>
          </div>

          <Separator />

          {/* Market Updates */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Market Updates</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Market Alerts</p>
                <p className="text-sm text-muted-foreground">
                  Economic events and market analysis updates
                </p>
              </div>
              <Switch
                checked={preferences.market_alerts}
                onCheckedChange={(checked) => updatePreferences({ market_alerts: checked })}
                disabled={isSaving}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Educational Updates</p>
                <p className="text-sm text-muted-foreground">
                  New courses, lessons, and educational content
                </p>
              </div>
              <Switch
                checked={preferences.educational_updates}
                onCheckedChange={(checked) => updatePreferences({ educational_updates: checked })}
                disabled={isSaving}
              />
            </div>
          </div>

          <Separator />

          {/* System */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm">System</h4>
            
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">System Notifications</p>
                <p className="text-sm text-muted-foreground">
                  Account updates, security alerts, and system maintenance
                </p>
              </div>
              <Switch
                checked={preferences.system_notifications}
                onCheckedChange={(checked) => updatePreferences({ system_notifications: checked })}
                disabled={isSaving}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Privacy & Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Privacy & Security</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <Shield className="h-4 w-4 inline mr-1" />
              Your notification preferences are securely stored and only used to deliver relevant updates.
            </p>
          </div>
          
          <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              You can update these settings anytime. Critical security notifications will always be sent.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};