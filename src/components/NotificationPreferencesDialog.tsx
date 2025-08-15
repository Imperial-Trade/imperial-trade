import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useToast } from '@/hooks/use-toast';
import { Bell, Settings, Clock, Shield, Volume2, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NotificationPreferencesDialog: React.FC<NotificationPreferencesDialogProps> = ({
  open,
  onOpenChange,
}) => {
  const { preferences, isLoading, updatePreferences, isUpdating, resetToDefaults } = useNotificationPreferences();
  const { toast } = useToast();

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

  const handleResetDefaults = () => {
    resetToDefaults();
    toast({
      title: "Preferences Reset",
      description: "Your notification preferences have been reset to defaults.",
    });
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </DialogTitle>
          <DialogDescription>
            Customize when and how you receive trading signal notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Signal Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-4 w-4" />
                Signal Notifications
              </CardTitle>
              <CardDescription>
                Choose which types of signal updates you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>New Signals Created</Label>
                  <p className="text-sm text-muted-foreground">When new trading signals are published</p>
                </div>
                <Switch
                  checked={preferences?.signal_created ?? true}
                  onCheckedChange={(value) => handleToggle('signal_created', value)}
                  disabled={isUpdating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Signal Updates</Label>
                  <p className="text-sm text-muted-foreground">When signals are modified or notes are added</p>
                </div>
                <Switch
                  checked={preferences?.signal_updated ?? true}
                  onCheckedChange={(value) => handleToggle('signal_updated', value)}
                  disabled={isUpdating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Signal Closures</Label>
                  <p className="text-sm text-muted-foreground">When signals are manually closed</p>
                </div>
                <Switch
                  checked={preferences?.signal_closed ?? true}
                  onCheckedChange={(value) => handleToggle('signal_closed', value)}
                  disabled={isUpdating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-1">
                    Take Profit Hits
                    <Badge variant="secondary" className="text-xs">High Priority</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground">When TP levels are reached</p>
                </div>
                <Switch
                  checked={preferences?.tp_hits ?? true}
                  onCheckedChange={(value) => handleToggle('tp_hits', value)}
                  disabled={isUpdating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-1">
                    Stop Loss Hits
                    <Badge variant="destructive" className="text-xs">Critical</Badge>
                  </Label>
                  <p className="text-sm text-muted-foreground">When stop loss levels are reached</p>
                </div>
                <Switch
                  checked={preferences?.stop_loss_hits ?? true}
                  onCheckedChange={(value) => handleToggle('stop_loss_hits', value)}
                  disabled={isUpdating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Price Alerts</Label>
                  <p className="text-sm text-muted-foreground">General price-based alerts</p>
                </div>
                <Switch
                  checked={preferences?.price_alerts ?? true}
                  onCheckedChange={(value) => handleToggle('price_alerts', value)}
                  disabled={isUpdating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Delivery Channels */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Volume2 className="h-4 w-4" />
                Delivery Channels
              </CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Browser and mobile push notifications</p>
                </div>
                <Switch
                  checked={preferences?.push_notifications ?? true}
                  onCheckedChange={(value) => handleToggle('push_notifications', value)}
                  disabled={isUpdating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>In-App Notifications</Label>
                  <p className="text-sm text-muted-foreground">Notifications within the platform</p>
                </div>
                <Switch
                  checked={preferences?.in_app_notifications ?? true}
                  onCheckedChange={(value) => handleToggle('in_app_notifications', value)}
                  disabled={isUpdating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Discord Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send to configured Discord channel</p>
                </div>
                <Switch
                  checked={preferences?.discord_notifications ?? false}
                  onCheckedChange={(value) => handleToggle('discord_notifications', value)}
                  disabled={isUpdating}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Telegram Notifications</Label>
                  <p className="text-sm text-muted-foreground">Send to configured Telegram chat</p>
                </div>
                <Switch
                  checked={preferences?.telegram_notifications ?? false}
                  onCheckedChange={(value) => handleToggle('telegram_notifications', value)}
                  disabled={isUpdating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Shield className="h-4 w-4" />
                Advanced Settings
              </CardTitle>
              <CardDescription>
                Fine-tune your notification experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Own Signals</Label>
                  <p className="text-sm text-muted-foreground">Receive notifications for signals you create</p>
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

        <Separator />

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handleResetDefaults}
            disabled={isUpdating}
          >
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                onOpenChange(false);
                toast({
                  title: "Preferences Saved",
                  description: "Your notification preferences have been updated.",
                });
              }}
              disabled={isUpdating}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};