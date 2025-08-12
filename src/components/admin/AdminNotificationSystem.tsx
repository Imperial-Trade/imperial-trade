
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Bell, Mail, Users, Clock, CheckCircle, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationSettings {
  newRequests: boolean;
  resubmissions: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
}

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

  // Load notification settings from database
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

      if (error && error.code !== 'PGRST116') {
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

      toast({
        title: "Settings Updated",
        description: `Notification preference for ${key} has been updated.`,
        variant: "default",
      });
    } catch (error) {
      console.error('Error updating notification settings:', error);
      // Revert the setting on error
      setSettings(prev => ({ ...prev, [key]: !value }));
      toast({
        title: "Error",
        description: "Failed to update notification settings. Please try again.",
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
        body: {
          type: 'test',
          message: 'This is a test notification from the admin panel'
        }
      });

      if (error) throw error;
      
      toast({
        title: "Test Email Sent",
        description: "Check your inbox for the test email.",
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
          <h3 className="text-lg font-semibold text-foreground">Notification Settings</h3>
          <p className="text-muted-foreground">Configure admin notifications for account requests</p>
        </div>
        <Button
          onClick={sendTestNotification}
          disabled={loading}
          variant="outline"
          className="border-gray-300"
        >
          <Bell className="w-4 h-4 mr-2" />
          {loading ? 'Sending...' : 'Send Test Email'}
        </Button>
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
                <p className="text-sm text-muted-foreground">Get notified immediately when someone submits a new request</p>
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
                <p className="text-sm text-muted-foreground">Get alerts when users resubmit after rejection</p>
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
                <p className="text-sm text-muted-foreground">Summary of pending requests sent daily at 9 AM</p>
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
                <p className="text-sm text-muted-foreground">Comprehensive weekly statistics and trends</p>
              </div>
              <Switch
                checked={settings.weeklyReport}
                onCheckedChange={(checked) => updateSetting('weeklyReport', checked)}
                disabled={saveLoading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Clock className="w-5 h-5" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Users className="w-4 h-4 text-blue-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900">New account request received</p>
                  <p className="text-xs text-blue-700">john.doe@example.com • 2 minutes ago</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-900">Account approved</p>
                  <p className="text-xs text-green-700">jane.smith@example.com • 15 minutes ago</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                <Bell className="w-4 h-4 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900">Request resubmitted</p>
                  <p className="text-xs text-orange-700">alice.johnson@example.com • 1 hour ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Overview */}
      <Card className="border-gray-200">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Settings className="w-5 h-5" />
              Notification Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">24</div>
              <div className="text-sm text-blue-700">Emails sent today</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">156</div>
              <div className="text-sm text-green-700">This week</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">89%</div>
              <div className="text-sm text-yellow-700">Delivery rate</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">3</div>
              <div className="text-sm text-purple-700">Active subscriptions</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
