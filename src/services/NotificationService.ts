import { supabase } from '@/integrations/supabase/client';

export interface NotificationBadgeState {
  unreadCount: number;
  lastCheckedAt: string | null;
  hasNewAlerts: boolean;
}

class NotificationService {
  private static instance: NotificationService;
  private badgeState: NotificationBadgeState = {
    unreadCount: 0,
    lastCheckedAt: null,
    hasNewAlerts: false
  };
  
  private listeners: Array<(state: NotificationBadgeState) => void> = [];
  private storageKey = 'imperial_notification_badge';

  private constructor() {
    this.loadBadgeState();
  }

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Badge state management
  getBadgeState(): NotificationBadgeState {
    return { ...this.badgeState };
  }

  subscribeToBadgeUpdates(callback: (state: NotificationBadgeState) => void): () => void {
    this.listeners.push(callback);
    // Immediately call with current state
    callback(this.getBadgeState());
    
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners() {
    this.listeners.forEach(callback => {
      callback(this.getBadgeState());
    });
  }

  incrementUnreadCount(count = 1) {
    this.badgeState.unreadCount += count;
    this.badgeState.hasNewAlerts = true;
    this.saveBadgeState();
    this.notifyListeners();
  }

  clearUnreadCount() {
    this.badgeState.unreadCount = 0;
    this.badgeState.hasNewAlerts = false;
    this.badgeState.lastCheckedAt = new Date().toISOString();
    this.saveBadgeState();
    this.notifyListeners();
  }

  markAsChecked() {
    this.badgeState.lastCheckedAt = new Date().toISOString();
    this.saveBadgeState();
    this.notifyListeners();
  }

  private loadBadgeState() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.badgeState = { ...this.badgeState, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.warn('Failed to load badge state:', error);
    }
  }

  private saveBadgeState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.badgeState));
    } catch (error) {
      console.warn('Failed to save badge state:', error);
    }
  }

  // Notification delivery tracking
  async recordNotificationDelivery(
    eventKey: string, 
    channel: 'in_app' | 'push', 
    status: 'delivered' | 'viewed' | 'clicked'
  ) {
    try {
      await supabase
        .from('notification_delivery_log')
        .update({ 
          status,
          delivered_at: status === 'delivered' ? new Date().toISOString() : undefined,
          opened_at: status === 'viewed' || status === 'clicked' ? new Date().toISOString() : undefined
        })
        .eq('event_key', eventKey)
        .eq('delivery_channel', channel);
    } catch (error) {
      console.warn('Failed to record delivery status:', error);
    }
  }

  // Real notification system - no more mock notifications
  async sendRealNotification(title: string, message: string, userId?: string) {
    console.log('🔔 Real notification:', { title, message, userId });
    
    // Add to in-app notifications system
    if ((window as any).addNotification) {
      (window as any).addNotification({
        type: 'system',
        title: title,
        message: message,
        timestamp: new Date()
      });
    }
    
    // Update badge for real notifications
    this.incrementUnreadCount(1);
    
    return true;
  }

  // Enhanced notification with delivery tracking
  addNotificationWithTracking(
    notification: any, 
    eventKey?: string,
    channel: 'in_app' | 'push' = 'in_app'
  ) {
    // Add to in-app notifications
    if ((window as any).addNotification) {
      (window as any).addNotification({
        ...notification,
        eventKey,
        deliveryChannel: channel
      });
    }

    // Update badge
    this.incrementUnreadCount(1);

    // Record delivery if eventKey provided
    if (eventKey) {
      this.recordNotificationDelivery(eventKey, channel, 'delivered');
    }
  }

  // Get user's notification preferences
  async getUserNotificationSettings(userId: string) {
    try {
      // Get notification preferences and push settings
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('notification_preferences, push_subscription_active')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Get xeon subscription status securely
      const { data: xeonStatus, error: xeonError } = await supabase
        .rpc('check_user_xeon_subscription', { user_id_param: userId });

      if (xeonError) {
        console.warn('Failed to get xeon subscription status:', xeonError);
      }

      return {
        ...profileData,
        xeon_stream_subscription: xeonStatus || false
      };
    } catch (error) {
      console.error('Failed to get notification settings:', error);
      return null;
    }
  }

  // Update notification preferences
  async updateNotificationSettings(userId: string, preferences: any) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ notification_preferences: preferences })
        .eq('id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to update notification settings:', error);
      return false;
    }
  }
}

export const notificationService = NotificationService.getInstance();
export default NotificationService;