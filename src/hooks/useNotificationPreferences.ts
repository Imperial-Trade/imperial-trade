import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface NotificationPreferences {
  push_enabled: boolean;
  email_enabled: boolean;
  trading_signals: boolean;
  market_updates: boolean;
  educational_content: boolean;
  community_activity: boolean;
  system_announcements: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  timezone: string;
  frequency_limit: number;
}

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    push_enabled: true,
    email_enabled: true,
    trading_signals: true,
    market_updates: true,
    educational_content: true,
    community_activity: true,
    system_announcements: true,
    quiet_hours_start: null,
    quiet_hours_end: null,
    timezone: 'UTC',
    frequency_limit: 10,
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadPreferences();
    }
  }, [user]);

  const loadPreferences = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setPreferences({
          push_enabled: data.push_enabled,
          email_enabled: data.email_enabled,
          trading_signals: data.trading_signals,
          market_updates: data.market_updates,
          educational_content: data.educational_content,
          community_activity: data.community_activity,
          system_announcements: data.system_announcements,
          quiet_hours_start: data.quiet_hours_start,
          quiet_hours_end: data.quiet_hours_end,
          timezone: data.timezone || 'UTC',
          frequency_limit: data.frequency_limit || 10,
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences?: Partial<NotificationPreferences>) => {
    if (!user) return false;

    try {
      setSaving(true);
      const prefsToSave = newPreferences ? { ...preferences, ...newPreferences } : preferences;
      
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          ...prefsToSave,
        });

      if (error) throw error;

      if (newPreferences) {
        setPreferences(prefsToSave);
      }

      toast({
        title: "Preferences saved",
        description: "Your notification preferences have been updated",
      });
      
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences",
        variant: "destructive",
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updatePreference = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return {
    preferences,
    loading,
    saving,
    loadPreferences,
    savePreferences,
    updatePreference,
  };
};