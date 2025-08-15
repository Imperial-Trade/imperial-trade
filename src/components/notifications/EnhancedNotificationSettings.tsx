import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, Shield, Zap } from 'lucide-react';
import { useOneSignalEnhanced } from '@/hooks/useOneSignalEnhanced';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import PlayerIdStatusIndicator from './PlayerIdStatusIndicator';

export const EnhancedNotificationSettings: React.FC = () => {
  const { 
    permission, 
    hasSubscription, 
    isGranted, 
    requestPermission,
    initialized 
  } = useOneSignalEnhanced();
  
  const {
    preferences,
    isLoading,
    updatePreferences,
    isUpdating
  } = useNotificationPreferences();

  const handlePermissionRequest = async () => {
    try {
      const result = await requestPermission();
      if (result.success) {
        // Auto-enable push notifications when permission is granted
        updatePreferences({ push_notifications: true });
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const handleToggleChange = (key: string, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading notification settings...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Push Notifications</span>
                {isGranted ? (
                  <Badge variant="default" className="text-xs">
                    <Zap className="w-3 h-3 mr-1" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">Disabled</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Browser and mobile push notifications
              </p>
            </div>
            {!isGranted ? (
              <Button 
                onClick={handlePermissionRequest}
                size="sm"
                disabled={!initialized}
              >
                Enable Push
              </Button>
            ) : (
              <Switch
                checked={preferences?.push_notifications ?? true}
                onCheckedChange={(value) => handleToggleChange('push_notifications', value)}
                disabled={isUpdating}
              />
            )}
          </div>

          <PlayerIdStatusIndicator />
        </CardContent>
      </Card>

      {/* Signal Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Signal Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-medium">New Trading Signals</span>
              <p className="text-sm text-muted-foreground">
                When new signals are published by educators
              </p>
            </div>
            <Switch
              checked={preferences?.signal_created ?? true}
              onCheckedChange={(value) => handleToggleChange('signal_created', value)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Take Profit Hits</span>
                <Badge variant="secondary" className="text-xs">High Priority</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                When TP levels are reached
              </p>
            </div>
            <Switch
              checked={preferences?.tp_hits ?? true}
              onCheckedChange={(value) => handleToggleChange('tp_hits', value)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Stop Loss Hits</span>
                <Badge variant="destructive" className="text-xs">Critical</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                When stop loss levels are reached (always high priority)
              </p>
            </div>
            <Switch
              checked={preferences?.stop_loss_hits ?? true}
              onCheckedChange={(value) => handleToggleChange('stop_loss_hits', value)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-medium">Signal Updates</span>
              <p className="text-sm text-muted-foreground">
                When signals are modified or notes are added
              </p>
            </div>
            <Switch
              checked={preferences?.signal_updated ?? true}
              onCheckedChange={(value) => handleToggleChange('signal_updated', value)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Advanced Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-sm font-medium">Include Own Signals</span>
              <p className="text-sm text-muted-foreground">
                Receive notifications for signals you create
              </p>
            </div>
            <Switch
              checked={preferences?.include_own_signals ?? false}
              onCheckedChange={(value) => handleToggleChange('include_own_signals', value)}
              disabled={isUpdating}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Quiet Hours Start
              </label>
              <input
                type="time"
                value={preferences?.quiet_hours_start ?? ''}
                onChange={(e) => updatePreferences({ quiet_hours_start: e.target.value || null })}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                disabled={isUpdating}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Quiet Hours End
              </label>
              <input
                type="time"
                value={preferences?.quiet_hours_end ?? ''}
                onChange={(e) => updatePreferences({ quiet_hours_end: e.target.value || null })}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                disabled={isUpdating}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            During quiet hours, only critical notifications (stop loss) will be sent
          </p>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">Privacy & Security</p>
              <p>
                <strong>Privacy:</strong> We never share your notification preferences or Player ID with third parties.
              </p>
              <p>
                <strong>Security:</strong> All notifications are encrypted and sent through secure channels.
              </p>
              <p>
                <strong>Control:</strong> You can disable any notification type at any time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};