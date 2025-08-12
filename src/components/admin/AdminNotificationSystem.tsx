import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, Mail, Clock, Settings, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { RecentAdminNotifications } from './notifications/RecentAdminNotifications';
import { AdminNotificationStats } from './notifications/AdminNotificationStats';

interface NotificationSettings {
  newRequests: boolean;
  resubmissions: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
}

const labelMap: Record<keyof NotificationSettings, string> = {
  newRequests: 'New account requests',
  resubmissions: 'Request resubmissions',
  dailyDigest: 'Daily summary email',
  weeklyReport: 'Weekly report email',
};

export const AdminNotificationSystem: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    newRequests: true,
    resubmissions: true,
    dailyDigest: true,
    weeklyReport: false
  });
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadNotificationSettings();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('admin_id', user.id)
        .single();

      if (error && (error as any).code !== 'PGRST116') {
        console.error('Error loading notification settings:', error);
        return;
      }

      if (data) {
        setSettings({
          newRequests: data.new_requests,
          resubmissions: data.resubmissions,
          dailyDigest: data.daily_digest,
          weeklyReport: data.weekly_report
        });
      }
    } catch (error) {
      console.error('Error loading notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    try {
      setSaveLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { error } = await supabase
        .from('notification_settings')
        .upsert({
          admin_id: user.id,
          new_requests: newSettings.newRequests,
          resubmissions: newSettings.resubmissions,
          daily_digest: newSettings.dailyDigest,
          weekly_report: newSettings.weeklyReport,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'admin_id'
        });

      if (error) throw error;

      const label = labelMap[key];
      toast({
        title: "Preference saved",
        description: `${label} notifications ${value ? 'enabled' : 'disabled'}.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      setSettings(prev => ({ ...prev, [key]: !value }));
      toast({
        title: "Couldn't save changes",
        description: "We couldn't update your preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaveLoading(false);
    }
  };

  const sendTestNotification = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('account-request-notifications', {
        body: { type: 'test' }
      });
      if (error) throw error;

      const delivery = (data as any)?.delivery_status || (data as any)?.note || 'unknown';
      const recipients = (data as any)?.recipients ?? 0;

      toast({
        title: "Test Notification",
        description: `Status: ${delivery} • Recipients: ${recipients}`,
        variant: "default",
      });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      toast({
        title: "Error",
        description: "Failed to send test notification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Admin Notifications</h3>
          <p className="text-muted-foreground">Choose how and when you're notified about account requests.</p>
        </div>
        <Button
          onClick={sendTestNotification}
          disabled={loading}
          variant="outline"
          className="border-gray-300"
        >
          <Bell className="w-4 h-4 mr-2" />
          {loading ? 'Sending...' : 'Send Test Notification'}
        </Button>
      </div>
      <div className="flex items-start gap-2 rounded-md border p-3 text-sm text-muted-foreground">
        <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
        <p>
          Emails are sent to your admin address. Times use your local timezone. Use the Send Test Notification button to confirm delivery.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Email Notifications */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Mail className="w-5 h-5" />
              Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">New Account Requests</p>
                <p className="text-sm text-muted-foreground">Receive an email as soon as someone submits a new account request.</p>
              </div>
              <Switch
                checked={settings.newRequests}
                onCheckedChange={(checked) => updateSetting('newRequests', checked)}
                disabled={saveLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Request Resubmissions</p>
                <p className="text-sm text-muted-foreground">Receive an email when an applicant resubmits after changes.</p>
              </div>
              <Switch
                checked={settings.resubmissions}
                onCheckedChange={(checked) => updateSetting('resubmissions', checked)}
                disabled={saveLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Daily Digest</p>
                <p className="text-sm text-muted-foreground">A daily summary of pending and recent requests. Sent at 9:00 AM.</p>
              </div>
              <Switch
                checked={settings.dailyDigest}
                onCheckedChange={(checked) => updateSetting('dailyDigest', checked)}
                disabled={saveLoading}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Weekly Report</p>
                <p className="text-sm text-muted-foreground">A weekly overview of request volumes, outcomes, and trends. Sent every Monday at 9:00 AM.</p>
              </div>
              <Switch
                checked={settings.weeklyReport}
                onCheckedChange={(checked) => updateSetting('weeklyReport', checked)}
                disabled={saveLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity (dynamic) */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <RecentAdminNotifications />
        </Card>
      </div>

      {/* Statistics Overview (dynamic) */}
      <Card className="border-gray-200">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Settings className="w-5 h-5" />
              Notification Statistics
          </CardTitle>
        </CardHeader>
        <AdminNotificationStats />
      </Card>
    </div>
  );
};
