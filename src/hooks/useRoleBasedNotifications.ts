/**
 * Role-Based Notification Preferences Hook - Phase 3: Role-Based Distribution
 * Manages notification preferences based on user roles (admin, educator, member)
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface RoleBasedNotificationSettings {
  // Admin-specific notifications
  admin: {
    systemAlerts: boolean;        // Critical system issues
    userActivity: boolean;        // New registrations, suspicious activity
    performanceAlerts: boolean;   // Platform performance issues
    signalOverrides: boolean;     // When admins override signals
    bulkNotifications: boolean;   // Mass notification sends
  };
  
  // Educator-specific notifications
  educator: {
    studentSignals: boolean;      // When students create signals
    performanceAlerts: boolean;   // Student performance issues
    followersActivity: boolean;   // New followers, engagement
    contentUpdates: boolean;      // Education content changes
    liveSessionReminders: boolean; // Upcoming live sessions
  };
  
  // Member/User notifications
  member: {
    tradingSignals: boolean;      // New trading signals
    priceAlerts: boolean;         // TP/SL hits
    educationUpdates: boolean;    // New education content
    forumActivity: boolean;       // Forum posts, replies
    systemUpdates: boolean;       // Platform updates
  };
  
  // Universal settings
  delivery: {
    pushNotifications: boolean;   // Browser/mobile push
    inAppNotifications: boolean;  // Dashboard notifications
    emailDigest: boolean;         // Daily/weekly email summary
    soundAlerts: boolean;         // Audio notifications
    vibrationAlerts: boolean;     // Mobile vibration
  };
  
  // Timing preferences
  schedule: {
    quietHours: {
      enabled: boolean;
      startTime: string;          // HH:MM format
      endTime: string;            // HH:MM format
      timezone: string;
    };
    marketHours: {
      enabled: boolean;           // Only notify during market hours
      sessions: string[];         // ['london', 'newyork', 'tokyo', 'sydney']
    };
    priority: {
      allowCriticalDuringQuiet: boolean; // Allow critical alerts during quiet hours
      emergencyBypass: boolean;          // Allow emergency alerts always
    };
  };
}

const getDefaultSettingsByRole = (userType: string, accessLevel: string): RoleBasedNotificationSettings => {
  const isAdmin = accessLevel === 'admin' || userType === 'admin';
  const isEducator = userType === 'educator' || accessLevel === 'moderator';
  
  return {
    admin: {
      systemAlerts: isAdmin,
      userActivity: isAdmin,
      performanceAlerts: isAdmin,
      signalOverrides: isAdmin,
      bulkNotifications: isAdmin,
    },
    educator: {
      studentSignals: isEducator,
      performanceAlerts: isEducator,
      followersActivity: isEducator,
      contentUpdates: isEducator,
      liveSessionReminders: isEducator,
    },
    member: {
      tradingSignals: true,        // All users want trading signals
      priceAlerts: true,           // All users want price alerts
      educationUpdates: !isAdmin,  // Non-admins want education updates
      forumActivity: false,        // Opt-in for forum notifications
      systemUpdates: true,         // Everyone needs system updates
    },
    delivery: {
      pushNotifications: true,
      inAppNotifications: true,
      emailDigest: false,          // Opt-in for email
      soundAlerts: true,
      vibrationAlerts: true,
    },
    schedule: {
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '07:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      marketHours: {
        enabled: false,
        sessions: ['london', 'newyork'],
      },
      priority: {
        allowCriticalDuringQuiet: true,
        emergencyBypass: true,
      },
    },
  };
};

export function useRoleBasedNotifications() {
  const { user, profile } = useAuth();
  const [settings, setSettings] = useState<RoleBasedNotificationSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Load user notification preferences
  const loadSettings = useCallback(async () => {
    if (!user?.id || !profile) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is ok
        console.error('Failed to load notification preferences:', error);
      }

      let userSettings: RoleBasedNotificationSettings;
      
      if (data) {
        // Map existing table structure to our settings format
        const defaults = getDefaultSettingsByRole(profile.user_type, profile.access_level);
        userSettings = {
          ...defaults,
          member: {
            ...defaults.member,
            tradingSignals: data.market_updates ?? true,
            priceAlerts: data.market_updates ?? true,
            educationUpdates: data.educational_content ?? true,
            systemUpdates: data.market_updates ?? true,
            forumActivity: data.community_activity ?? false,
          },
          delivery: {
            ...defaults.delivery,
            pushNotifications: data.push_enabled ?? true,
            emailDigest: data.email_enabled ?? false,
          },
        };
      } else {
        // Use role-based defaults
        userSettings = getDefaultSettingsByRole(profile.user_type, profile.access_level);
      }

      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading notification settings:', error);
      // Fallback to defaults
      setSettings(getDefaultSettingsByRole(profile.user_type, profile.access_level));
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, profile]);

  // Save notification preferences
  const saveSettings = useCallback(async (newSettings: RoleBasedNotificationSettings) => {
    if (!user?.id || isSaving) return false;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({
          user_id: user.id,
          preferences: newSettings,
          updated_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Failed to save notification preferences:', error);
        return false;
      }

      setSettings(newSettings);
      setLastSaved(new Date());
      return true;
    } catch (error) {
      console.error('Error saving notification settings:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, isSaving]);

  // Update specific setting
  const updateSetting = useCallback(async (
    category: keyof RoleBasedNotificationSettings,
    key: string,
    value: any
  ) => {
    if (!settings) return false;

    const newSettings = {
      ...settings,
      [category]: {
        ...settings[category],
        [key]: value,
      },
    };

    return await saveSettings(newSettings);
  }, [settings, saveSettings]);

  // Check if user should receive specific notification type
  const shouldReceiveNotification = useCallback((
    notificationType: string,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): boolean => {
    if (!settings || !profile) return false;

    // Check delivery method
    if (!settings.delivery.pushNotifications) return false;

    // Check quiet hours
    if (settings.schedule.quietHours.enabled) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      
      const { startTime, endTime } = settings.schedule.quietHours;
      const isInQuietHours = (
        startTime <= endTime 
          ? currentTime >= startTime && currentTime <= endTime
          : currentTime >= startTime || currentTime <= endTime
      );

      if (isInQuietHours) {
        // Allow critical notifications if enabled
        if (priority === 'critical' && settings.schedule.priority.allowCriticalDuringQuiet) {
          return true;
        }
        // Block all other notifications during quiet hours
        if (priority !== 'critical') {
          return false;
        }
      }
    }

    // Check market hours
    if (settings.schedule.marketHours.enabled) {
      // Implementation would check if current time is within selected market sessions
      // For now, we'll assume it's always market hours
    }

    // Check role-specific settings
    const userType = profile.user_type;
    const accessLevel = profile.access_level;

    switch (notificationType) {
      // Admin notifications
      case 'system_alert':
        return accessLevel === 'admin' && settings.admin.systemAlerts;
      case 'user_activity':
        return accessLevel === 'admin' && settings.admin.userActivity;
      case 'performance_alert':
        return accessLevel === 'admin' && settings.admin.performanceAlerts;
      
      // Educator notifications
      case 'student_signal':
        return userType === 'educator' && settings.educator.studentSignals;
      case 'follower_activity':
        return userType === 'educator' && settings.educator.followersActivity;
      case 'live_session_reminder':
        return userType === 'educator' && settings.educator.liveSessionReminders;
      
      // Member/Trading notifications
      case 'signal_created':
      case 'signal_updated':
        return settings.member.tradingSignals;
      case 'take_profit_hit':
      case 'stop_loss_hit':
        return settings.member.priceAlerts;
      case 'education_update':
        return settings.member.educationUpdates;
      case 'forum_activity':
        return settings.member.forumActivity;
      case 'system_update':
        return settings.member.systemUpdates;
      
      default:
        return false;
    }
  }, [settings, profile]);

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return {
    settings,
    isLoading,
    isSaving,
    lastSaved,
    saveSettings,
    updateSetting,
    shouldReceiveNotification,
    refreshSettings: loadSettings,
    userRole: profile?.user_type || 'member',
    accessLevel: profile?.access_level || 'user',
  };
}