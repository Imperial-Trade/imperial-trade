import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NotificationPreferences {
  alerts: {
    critical: { push: boolean; in_app: boolean; email: boolean; sound: string };
    important: { push: boolean; in_app: boolean; email: boolean; sound: string };
    standard: { push: boolean; in_app: boolean; email: boolean; sound: string };
    info: { push: boolean; in_app: boolean; email: boolean; sound: string };
  };
  trading: {
    signal_created: { enabled: boolean; priority: string; sound: string };
    signal_updated: { enabled: boolean; priority: string; sound: string };
    price_alerts: { enabled: boolean; priority: string; sound: string };
    tp_hit: { enabled: boolean; priority: string; sound: string };
    stop_loss: { enabled: boolean; priority: string; sound: string };
  };
  schedule: {
    quiet_hours: { enabled: boolean; start: string; end: string };
    market_hours_only: boolean;
    weekend_alerts: boolean;
  };
  channels: {
    push: { enabled: boolean; priority_threshold: string };
    in_app: { enabled: boolean; priority_threshold: string };
    email: { enabled: boolean; priority_threshold: string };
  };
  device: {
    vibration: boolean;
    led_flash: boolean;
    priority_bypass: boolean;
  };
}

interface NotificationStats {
  total_sent: number;
  total_delivered: number;
  total_opened: number;
  last_notification_at: string | null;
  engagement_score: number;
  preferred_delivery_time: string | null;
}

interface TradingNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  timestamp: string;
  read: boolean;
  priority: number;
  source: string;
}

export function useEnhancedNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [notifications, setNotifications] = useState<TradingNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundCacheRef = useRef<Map<string, AudioBuffer>>(new Map());

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  // Load user preferences and stats
  useEffect(() => {
    if (user) {
      loadUserNotificationData();
    }
  }, [user]);

  // Setup real-time notification listener
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('trading-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notification_delivery_log',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          handleRealtimeNotification(payload);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadUserNotificationData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('notification_preferences, notification_stats')
        .eq('id', user.id)
        .single();

      if (profile) {
        setPreferences(profile.notification_preferences as NotificationPreferences || getDefaultPreferences());
        setStats(profile.notification_stats as NotificationStats || getDefaultStats());
      }

      // Load recent notifications
      const { data: recentNotifications } = await supabase
        .from('notification_delivery_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (recentNotifications) {
        const formattedNotifications = recentNotifications.map(formatNotification);
        setNotifications(formattedNotifications);
      }

    } catch (error) {
      console.error('Error loading notification data:', error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updatePreferences = useCallback(async (newPreferences: Partial<NotificationPreferences>) => {
    if (!user || !preferences) return;

    const updated = { ...preferences, ...newPreferences };
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: updated })
        .eq('id', user.id);

      if (error) throw error;

      setPreferences(updated);
      
      toast({
        title: "Preferences Updated",
        description: "Your notification preferences have been saved",
      });

    } catch (error) {
      console.error('Error updating preferences:', error);
      toast({
        title: "Error",
        description: "Failed to update notification preferences",
        variant: "destructive",
      });
    }
  }, [user, preferences, toast]);

  const testNotification = useCallback(async (type: string) => {
    if (!user) return;

    try {
      // Create test notification
      const testData = {
        signal_id: 'test-signal',
        user_id: user.id,
        asset_name: 'BTCUSD',
        trade_type: 'buy',
        entry_price: 45000,
        notification_type: type,
        priority_level: 2,
        market_session: 'NY Open',
        author_name: 'Test Educator',
        delivery_channels: ['push', 'in_app'],
        user_ids: [user.id]
      };

      const { error } = await supabase.functions.invoke('enhanced-signal-notification-dispatcher', {
        body: { notifications: [testData] }
      });

      if (error) throw error;

      // Play test sound
      await playNotificationSound(type);

      toast({
        title: "Test Notification Sent",
        description: `Test ${type} notification has been dispatched`,
      });

    } catch (error) {
      console.error('Error sending test notification:', error);
      toast({
        title: "Test Failed",
        description: "Failed to send test notification",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const playNotificationSound = useCallback(async (soundType: string) => {
    if (!audioContextRef.current || !preferences?.device.vibration) return;

    try {
      // Resume audio context if needed
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // Check if sound is cached
      let audioBuffer = soundCacheRef.current.get(soundType);
      
      if (!audioBuffer) {
        // Load and cache sound
        const soundUrl = getTradingSoundUrl(soundType);
        const response = await fetch(soundUrl);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
        soundCacheRef.current.set(soundType, audioBuffer);
      }

      // Play sound
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start(0);

      // Trigger vibration if supported and enabled
      if (navigator.vibrate && preferences?.device.vibration) {
        const vibrationPattern = getVibrationPattern(soundType);
        navigator.vibrate(vibrationPattern);
      }

    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, [preferences]);

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );

    // Update stats
    if (user && stats) {
      const newStats = {
        ...stats,
        total_opened: stats.total_opened + 1,
        engagement_score: calculateEngagementScore(stats.total_sent, stats.total_delivered, stats.total_opened + 1)
      };

      await supabase
        .from('profiles')
        .update({ notification_stats: newStats })
        .eq('id', user.id);

      setStats(newStats);
    }
  }, [user, stats]);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const getNotificationsByType = useCallback((type: string) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  const getUnreadCount = useCallback(() => {
    return notifications.filter(n => !n.read).length;
  }, [notifications]);

  const handleRealtimeNotification = useCallback((payload: any) => {
    if (payload.eventType === 'INSERT' && payload.new) {
      const notification = formatNotification(payload.new);
      setNotifications(prev => [notification, ...prev].slice(0, 50));
      
      // Play sound for new notification
      if (payload.new.notification_type) {
        playNotificationSound(payload.new.notification_type);
      }
    }
  }, [playNotificationSound]);

  const formatNotification = (data: any): TradingNotification => ({
    id: data.id,
    type: data.notification_type,
    title: generateNotificationTitle(data),
    message: generateNotificationMessage(data),
    data: data.metadata || {},
    timestamp: data.created_at,
    read: false,
    priority: data.metadata?.priority || 1,
    source: data.delivery_channel
  });

  return {
    preferences,
    stats,
    notifications,
    isLoading,
    updatePreferences,
    testNotification,
    playNotificationSound,
    markNotificationAsRead,
    clearAllNotifications,
    getNotificationsByType,
    getUnreadCount,
    refreshData: loadUserNotificationData
  };
}

function getDefaultPreferences(): NotificationPreferences {
  return {
    alerts: {
      critical: { push: true, in_app: true, email: true, sound: "high" },
      important: { push: true, in_app: true, email: false, sound: "medium" },
      standard: { push: true, in_app: true, email: false, sound: "low" },
      info: { push: false, in_app: true, email: false, sound: "none" }
    },
    trading: {
      signal_created: { enabled: true, priority: "high", sound: "signal_alert" },
      signal_updated: { enabled: true, priority: "medium", sound: "update_chime" },
      price_alerts: { enabled: true, priority: "high", sound: "price_alert" },
      tp_hit: { enabled: true, priority: "high", sound: "success_ding" },
      stop_loss: { enabled: true, priority: "critical", sound: "warning_tone" }
    },
    schedule: {
      quiet_hours: { enabled: false, start: "22:00", end: "07:00" },
      market_hours_only: false,
      weekend_alerts: true
    },
    channels: {
      push: { enabled: true, priority_threshold: "standard" },
      in_app: { enabled: true, priority_threshold: "info" },
      email: { enabled: false, priority_threshold: "critical" }
    },
    device: {
      vibration: true,
      led_flash: false,
      priority_bypass: true
    }
  };
}

function getDefaultStats(): NotificationStats {
  return {
    total_sent: 0,
    total_delivered: 0,
    total_opened: 0,
    last_notification_at: null,
    engagement_score: 0,
    preferred_delivery_time: null
  };
}

function getTradingSoundUrl(soundType: string): string {
  const soundMap: Record<string, string> = {
    signal_alert: '/sounds/trading/signal-alert.mp3',
    update_chime: '/sounds/trading/update-chime.mp3',
    price_alert: '/sounds/trading/price-alert.mp3',
    success_ding: '/sounds/trading/success-ding.mp3',
    warning_tone: '/sounds/trading/warning-tone.mp3',
    high: '/sounds/trading/high-priority.mp3',
    medium: '/sounds/trading/medium-priority.mp3',
    low: '/sounds/trading/low-priority.mp3'
  };

  return soundMap[soundType] || '/sounds/trading/default.mp3';
}

function getVibrationPattern(soundType: string): number[] {
  const patterns: Record<string, number[]> = {
    signal_alert: [200, 100, 200],
    success_ding: [100, 50, 100, 50, 100],
    warning_tone: [300, 200, 300, 200, 300],
    price_alert: [150, 100, 150],
    update_chime: [100, 50, 100]
  };

  return patterns[soundType] || [200, 100, 200];
}

function generateNotificationTitle(data: any): string {
  const type = data.notification_type;
  const metadata = data.metadata || {};
  
  switch (type) {
    case 'signal_created':
      return `🎯 New ${metadata.trade_type?.toUpperCase()} Signal`;
    case 'tp_hit':
      return `💰 Take Profit Hit!`;
    case 'stop_loss':
      return `⚠️ Stop Loss Triggered`;
    case 'price_alert':
      return `📊 Price Alert`;
    default:
      return `📢 Trading Update`;
  }
}

function generateNotificationMessage(data: any): string {
  const metadata = data.metadata || {};
  
  switch (data.notification_type) {
    case 'signal_created':
      return `${metadata.asset_name} @ $${metadata.entry_price} by ${metadata.author_name}`;
    case 'tp_hit':
      return `${metadata.asset_name} TP reached - Great trade!`;
    case 'stop_loss':
      return `${metadata.asset_name} stopped out - Risk managed`;
    case 'price_alert':
      return `${metadata.asset_name} reached target level`;
    default:
      return `Signal updated by ${metadata.author_name}`;
  }
}

function calculateEngagementScore(sent: number, delivered: number, opened: number): number {
  if (sent === 0) return 0;
  
  const deliveryRate = delivered / sent;
  const openRate = delivered > 0 ? opened / delivered : 0;
  
  return Math.round((deliveryRate * 0.3 + openRate * 0.7) * 100);
}