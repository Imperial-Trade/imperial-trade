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
    loading,
    saving,
    savePreferences,
    updatePreference
  } = useNotificationPreferences();

  const handlePermissionRequest = async () => {
    try {
      const result = await requestPermission();
      if (result.success) {
        // Auto-enable push notifications when permission is granted
        await savePreferences({ push_enabled: true });
      }
    } catch (error) {
      console.error('Permission request failed:', error);
    }
  };

  const handleToggleChange = async (key: keyof typeof preferences, value: boolean) => {
    updatePreference(key, value);
    // Auto-save preference changes
    await savePreferences({ [key]: value });
  };

  if (loading) {
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
      {/* Push Notification Status */}
      <Card className="border-l-4 border-l-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Push Notification Status
            <PlayerIdStatusIndicator className="ml-auto" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Browser Notifications</span>
                <Badge variant={isGranted ? "default" : permission === 'denied' ? "destructive" : "secondary"}>
                  {isGranted ? "Active" : permission === 'denied' ? "Blocked" : "Not Set"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isGranted 
                  ? "You'll receive instant trading signal alerts"
                  : permission === 'denied' 
                  ? "Notifications are blocked in your browser settings"
                  : "Enable notifications to get real-time trading alerts"
                }
              </p>
            </div>
            {!isGranted && (
              <Button 
                onClick={handlePermissionRequest}
                disabled={!initialized || permission === 'denied'}
                size="sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Enable Notifications
              </Button>
            )}
          </div>

          {/* Push notification preferences */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-medium">Push Notifications</span>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on this device
                </p>
              </div>
              <Switch
                checked={preferences.push_enabled && isGranted}
                onCheckedChange={(checked) => handleToggleChange('push_enabled', checked)}
                disabled={!isGranted}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Types
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Trading Signals</span>
                  <Badge variant="outline">Critical</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  New signal alerts, TP hits, and stop losses
                </p>
              </div>
              <Switch
                checked={preferences.trading_signals}
                onCheckedChange={(checked) => handleToggleChange('trading_signals', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-medium">Market Updates</span>
                <p className="text-sm text-muted-foreground">
                  Economic events and market news
                </p>
              </div>
              <Switch
                checked={preferences.market_updates}
                onCheckedChange={(checked) => handleToggleChange('market_updates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-medium">Educational Content</span>
                <p className="text-sm text-muted-foreground">
                  New courses and learning materials
                </p>
              </div>
              <Switch
                checked={preferences.educational_content}
                onCheckedChange={(checked) => handleToggleChange('educational_content', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="font-medium">Community Activity</span>
                <p className="text-sm text-muted-foreground">
                  Forum posts, replies, and mentions
                </p>
              </div>
              <Switch
                checked={preferences.community_activity}
                onCheckedChange={(checked) => handleToggleChange('community_activity', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">System Announcements</span>
                  <Badge variant="outline">Important</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Platform updates and security alerts
                </p>
              </div>
              <Switch
                checked={preferences.system_announcements}
                onCheckedChange={(checked) => handleToggleChange('system_announcements', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Security & Targeting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Direct User Targeting:</strong> Your notifications are delivered directly to your device using your unique Player ID.
            </p>
            <p className="mb-2">
              <strong>Privacy:</strong> We never share your notification preferences or Player ID with third parties.
            </p>
            <p>
              <strong>Security:</strong> All notification data is encrypted and processed securely through OneSignal's infrastructure.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};