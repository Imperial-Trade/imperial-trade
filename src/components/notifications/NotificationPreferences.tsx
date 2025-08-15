import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Clock, Volume2, Settings, Shield } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { Badge } from '@/components/ui/badge';

export const NotificationPreferences: React.FC = () => {
  const {
    preferences,
    isLoading,
    updatePreferences,
    isUpdating
  } = useNotificationPreferences();

  const handleToggle = (key: string, value: boolean) => {
    updatePreferences({ [key]: value });
  };

  const handlePriorityChange = (priority: string) => {
    updatePreferences({ minimum_priority_level: parseInt(priority) });
  };

  const handleQuietHoursChange = (type: 'start' | 'end', value: string) => {
    const key = type === 'start' ? 'quiet_hours_start' : 'quiet_hours_end';
    updatePreferences({ [key]: value || null });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">Loading preferences...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Signal Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Signal Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>New Signals Created</Label>
              <p className="text-sm text-muted-foreground">
                When new trading signals are published
              </p>
            </div>
            <Switch
              checked={preferences?.signal_created ?? true}
              onCheckedChange={(value) => handleToggle('signal_created', value)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Signal Updates</Label>
              <p className="text-sm text-muted-foreground">
                When signals are modified or notes are added
              </p>
            </div>
            <Switch
              checked={preferences?.signal_updated ?? true}
              onCheckedChange={(value) => handleToggle('signal_updated', value)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                Take Profit Hits
                <Badge variant="secondary" className="text-xs">High Priority</Badge>
              </Label>
              <p className="text-sm text-muted-foreground">
                When TP levels are reached
              </p>
            </div>
            <Switch
              checked={preferences?.tp_hits ?? true}
              onCheckedChange={(value) => handleToggle('tp_hits', value)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                Stop Loss Hits
                <Badge variant="destructive" className="text-xs">Critical</Badge>
              </Label>
              <p className="text-sm text-muted-foreground">
                When stop loss levels are reached
              </p>
            </div>
            <Switch
              checked={preferences?.stop_loss_hits ?? true}
              onCheckedChange={(value) => handleToggle('stop_loss_hits', value)}
              disabled={isUpdating}
            />
          </div>
        </CardContent>
      </Card>

      {/* Delivery Channels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Delivery Channels
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Push Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Browser and mobile push notifications
              </p>
            </div>
            <Switch
              checked={preferences?.push_notifications ?? true}
              onCheckedChange={(value) => handleToggle('push_notifications', value)}
              disabled={isUpdating}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>In-App Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Notifications within the platform
              </p>
            </div>
            <Switch
              checked={preferences?.in_app_notifications ?? true}
              onCheckedChange={(value) => handleToggle('in_app_notifications', value)}
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
              <Label>Include Own Signals</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications for signals you create
              </p>
            </div>
            <Switch
              checked={preferences?.include_own_signals ?? false}
              onCheckedChange={(value) => handleToggle('include_own_signals', value)}
              disabled={isUpdating}
            />
          </div>

          <div className="space-y-2">
            <Label>Minimum Priority Level</Label>
            <Select
              value={preferences?.minimum_priority_level?.toString() ?? '1'}
              onValueChange={handlePriorityChange}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">All notifications (Level 1+)</SelectItem>
                <SelectItem value="2">Important only (Level 2+)</SelectItem>
                <SelectItem value="3">Critical only (Level 3)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Filter notifications by importance level
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Quiet Hours Start
              </Label>
              <input
                type="time"
                value={preferences?.quiet_hours_start ?? ''}
                onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                disabled={isUpdating}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Quiet Hours End
              </Label>
              <input
                type="time"
                value={preferences?.quiet_hours_end ?? ''}
                onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                className="w-full px-3 py-2 border border-input rounded-md text-sm"
                disabled={isUpdating}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            During quiet hours, only critical notifications will be sent
          </p>
        </CardContent>
      </Card>
    </div>
  );
};