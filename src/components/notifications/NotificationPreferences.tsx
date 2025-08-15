import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Clock, Volume2 } from 'lucide-react';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

export const NotificationPreferences: React.FC = () => {
  const {
    preferences,
    loading,
    saving,
    savePreferences,
    updatePreference
  } = useNotificationPreferences();

  if (loading) {
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
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications on your device
                </p>
              </div>
              <Switch
                checked={preferences.push_enabled}
                onCheckedChange={(checked) => updatePreference('push_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                checked={preferences.email_enabled}
                onCheckedChange={(checked) => updatePreference('email_enabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Trading Signals</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about new trading signals
                </p>
              </div>
              <Switch
                checked={preferences.trading_signals}
                onCheckedChange={(checked) => updatePreference('trading_signals', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Market Updates</Label>
                <p className="text-sm text-muted-foreground">
                  Economic events and market news
                </p>
              </div>
              <Switch
                checked={preferences.market_updates}
                onCheckedChange={(checked) => updatePreference('market_updates', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Educational Content</Label>
                <p className="text-sm text-muted-foreground">
                  New courses and learning materials
                </p>
              </div>
              <Switch
                checked={preferences.educational_content}
                onCheckedChange={(checked) => updatePreference('educational_content', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>Community Activity</Label>
                <p className="text-sm text-muted-foreground">
                  Forum posts, replies, and likes
                </p>
              </div>
              <Switch
                checked={preferences.community_activity}
                onCheckedChange={(checked) => updatePreference('community_activity', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label>System Announcements</Label>
                <p className="text-sm text-muted-foreground">
                  Important platform updates
                </p>
              </div>
              <Switch
                checked={preferences.system_announcements}
                onCheckedChange={(checked) => updatePreference('system_announcements', checked)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quiet Hours
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={preferences.quiet_hours_start || ''}
                onChange={(e) => updatePreference('quiet_hours_start', e.target.value || null)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                type="time"
                value={preferences.quiet_hours_end || ''}
                onChange={(e) => updatePreference('quiet_hours_end', e.target.value || null)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select
              value={preferences.timezone}
              onValueChange={(value) => updatePreference('timezone', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="America/New_York">Eastern Time</SelectItem>
                <SelectItem value="America/Chicago">Central Time</SelectItem>
                <SelectItem value="America/Denver">Mountain Time</SelectItem>
                <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                <SelectItem value="Europe/London">London</SelectItem>
                <SelectItem value="Europe/Paris">Paris</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                <SelectItem value="Asia/Shanghai">Shanghai</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Frequency Limits
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Maximum notifications per day</Label>
            <Input
              type="number"
              min="1"
              max="50"
              value={preferences.frequency_limit}
              onChange={(e) => updatePreference('frequency_limit', parseInt(e.target.value) || 10)}
            />
            <p className="text-sm text-muted-foreground">
              Limit the number of push notifications you receive daily
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button 
          onClick={() => savePreferences()} 
          disabled={saving}
          className="min-w-24"
        >
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </div>
    </div>
  );
};