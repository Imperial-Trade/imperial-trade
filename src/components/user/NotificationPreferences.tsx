import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bell, Clock, Volume2, Vibrate, Save, Check, Loader2,
  TrendingUp, AlertTriangle, XCircle, FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface NotificationPreferencesData {
  signal_created: boolean;
  tp_hit: boolean;
  stop_loss_hit: boolean;
  signal_closed: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  max_per_hour: number;
}

export function NotificationPreferences() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferencesData>({
    signal_created: true,
    tp_hit: true,
    stop_loss_hit: true,
    signal_closed: false,
    quiet_hours_enabled: false,
    quiet_hours_start: null,
    quiet_hours_end: null,
    max_per_hour: 20,
  });

  useEffect(() => {
    if (user?.id) {
      loadPreferences();
    }
  }, [user?.id]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('profile_id', user?.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is okay
        throw error;
      }

      if (data) {
        setPreferences({
          signal_created: data.signal_created ?? true,
          tp_hit: data.tp_hit ?? true,
          stop_loss_hit: data.stop_loss_hit ?? true,
          signal_closed: data.signal_closed ?? false,
          quiet_hours_enabled: data.quiet_hours_enabled ?? false,
          quiet_hours_start: data.quiet_hours_start,
          quiet_hours_end: data.quiet_hours_end,
          max_per_hour: data.max_per_hour ?? 20,
        });
      }
    } catch (error: any) {
      console.error('Failed to load preferences:', error);
      toast.error('Failed to load notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    if (!user?.id) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('notification_preferences')
        .upsert({
          profile_id: user.id,
          ...preferences,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success('Notification preferences saved successfully!');
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = (key: keyof NotificationPreferencesData, value: any) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Notification Preferences</h2>
        <p className="text-muted-foreground mt-1">
          Customize how and when you receive trade notifications
        </p>
      </div>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Types
          </CardTitle>
          <CardDescription>
            Choose which types of notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* New Signals */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="signal_created" className="text-base font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-500" />
                New Signals
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when educators post new BUY/SELL signals
              </p>
            </div>
            <Switch
              id="signal_created"
              checked={preferences.signal_created}
              onCheckedChange={(checked) => updatePreference('signal_created', checked)}
            />
          </div>

          {/* Take Profit Hits */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="tp_hit" className="text-base font-medium flex items-center gap-2">
                <Check className="w-4 h-4 text-green-500" />
                Take Profit Hits
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when signals hit take profit targets
              </p>
            </div>
            <Switch
              id="tp_hit"
              checked={preferences.tp_hit}
              onCheckedChange={(checked) => updatePreference('tp_hit', checked)}
            />
          </div>

          {/* Stop Loss Hits */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="stop_loss_hit" className="text-base font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Stop Loss Hits
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when signals hit stop loss (important!)
              </p>
            </div>
            <Switch
              id="stop_loss_hit"
              checked={preferences.stop_loss_hit}
              onCheckedChange={(checked) => updatePreference('stop_loss_hit', checked)}
            />
          </div>

          {/* Signal Closed */}
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="signal_closed" className="text-base font-medium flex items-center gap-2">
                <XCircle className="w-4 h-4 text-gray-500" />
                Signal Closed
              </Label>
              <p className="text-sm text-muted-foreground">
                Get notified when signals are manually closed
              </p>
            </div>
            <Switch
              id="signal_closed"
              checked={preferences.signal_closed}
              onCheckedChange={(checked) => updatePreference('signal_closed', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Quiet Hours
          </CardTitle>
          <CardDescription>
            Set times when you don't want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet_hours" className="text-base font-medium">
              Enable Quiet Hours
            </Label>
            <Switch
              id="quiet_hours"
              checked={preferences.quiet_hours_enabled}
              onCheckedChange={(checked) => updatePreference('quiet_hours_enabled', checked)}
            />
          </div>

          {preferences.quiet_hours_enabled && (
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Start Time</Label>
                <input
                  id="start_time"
                  type="time"
                  value={preferences.quiet_hours_start || '22:00'}
                  onChange={(e) => updatePreference('quiet_hours_start', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">End Time</Label>
                <input
                  id="end_time"
                  type="time"
                  value={preferences.quiet_hours_end || '07:00'}
                  onChange={(e) => updatePreference('quiet_hours_end', e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-input bg-background"
                />
              </div>
            </div>
          )}

          {preferences.quiet_hours_enabled && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                Notifications will be silent from {preferences.quiet_hours_start || '22:00'} to{' '}
                {preferences.quiet_hours_end || '07:00'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Rate Limiting
          </CardTitle>
          <CardDescription>
            Control how many notifications you receive per hour
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="max_per_hour" className="text-base font-medium">
                Maximum per hour: {preferences.max_per_hour}
              </Label>
            </div>
            <Slider
              id="max_per_hour"
              min={5}
              max={50}
              step={5}
              value={[preferences.max_per_hour]}
              onValueChange={(value) => updatePreference('max_per_hour', value[0])}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              You'll receive up to {preferences.max_per_hour} notifications per hour
            </p>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Recommended:</strong> Keep at 20+ to not miss important signals. During high
              volatility, educators may send multiple updates.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-4">
        <Button
          onClick={savePreferences}
          disabled={saving}
          size="lg"
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Preferences
            </>
          )}
        </Button>
      </div>

      {/* Info Alert */}
      <Alert>
        <Bell className="h-4 w-4" />
        <AlertDescription>
          <strong>💡 Pro Tip:</strong> Your preferences sync across all devices. Make sure push
          notifications are enabled in your browser/device settings.
        </AlertDescription>
      </Alert>
    </div>
  );
}

