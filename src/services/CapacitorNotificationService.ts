import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Preferences } from '@capacitor/preferences';
import { Badge } from '@capawesome/capacitor-badge';
import { notificationService } from './NotificationService';
import { supabase } from '@/integrations/supabase/client';

interface NotificationPayload {
  title: string;
  body: string;
  data: Record<string, any>;
  eventKey?: string;
  type?: string;
  signalId?: string;
}

class CapacitorNotificationService {
  private static instance: CapacitorNotificationService;
  private platform = Capacitor.getPlatform();
  private isNative = Capacitor.isNativePlatform();
  private deviceToken: string | null = null;
  private currentUserId: string | null = null;

  private constructor() {
    console.log(`🔔 Capacitor Notification Service initialized for: ${this.platform}`);
  }

  static getInstance(): CapacitorNotificationService {
    if (!CapacitorNotificationService.instance) {
      CapacitorNotificationService.instance = new CapacitorNotificationService();
    }
    return CapacitorNotificationService.instance;
  }

  // ============================================
  // INITIALIZATION
  // ============================================

  async initialize(userId?: string) {
    console.log(`🚀 [Capacitor] Initializing notifications for platform: ${this.platform}`);
    
    // ✅ CRITICAL FIX: Since we're PWA-only (not native app), disable Capacitor notifications
    // We use OneSignal via Airbnb modal instead. This prevents native prompts from appearing.
    if (this.isNative) {
      console.log('⚠️ [Capacitor] Native platform detected, but PWA mode is active. Skipping native notifications.');
      console.log('📱 [Capacitor] For PWA, OneSignal handles all push notifications via web API.');
      return; // Don't initialize native notifications - we're using OneSignal web push
    }
    
    if (userId) {
      this.currentUserId = userId;
    }

    // ✅ For web/PWA, we use OneSignal, not Capacitor
    // Do nothing - OneSignal is initialized via useOneSignal hook
    console.log('✅ [Capacitor] PWA mode - OneSignal handles notifications, skipping Capacitor setup');
  }

  // ============================================
  // MOBILE NATIVE NOTIFICATIONS (iOS/Android)
  // ============================================

  private async setupMobileNotifications() {
    try {
      console.log('📱 Setting up mobile push notifications...');

      // Request permissions
      const permission = await PushNotifications.requestPermissions();

      if (permission.receive === 'granted') {
        console.log('✅ Push notification permission granted');

        // Register for push
        await PushNotifications.register();

        // Listen for registration (FCM/APNS token)
        PushNotifications.addListener('registration', async (token: Token) => {
          console.log('📱 Device token received:', token.value);
          this.deviceToken = token.value;
          await this.registerDeviceToken(token.value);
        });

        // Listen for registration errors
        PushNotifications.addListener('registrationError', (error: any) => {
          console.error('❌ Registration error:', error);
        });

        // Listen for push received (app in FOREGROUND)
        PushNotifications.addListener('pushNotificationReceived', async (notification) => {
          console.log('📬 Push received (foreground):', notification);

          // Show as local notification with custom styling
          await this.showMobileLocalNotification({
            title: notification.title || '',
            body: notification.body || '',
            data: notification.data,
            eventKey: notification.data?.eventKey,
            type: notification.data?.type,
            signalId: notification.data?.signal_id,
          });
        });

        // Listen for push tapped (notification opened)
        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
          console.log('👆 Push notification tapped:', action);
          this.handleNotificationTap(action.notification.data);
        });

        // Request local notification permissions
        await LocalNotifications.requestPermissions();

        // Listen for local notification taps
        LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
          console.log('👆 Local notification tapped:', action);
          this.handleNotificationTap(action.notification.extra);
        });

      } else {
        console.warn('❌ Push notification permission denied');
      }

    } catch (error) {
      console.error('Failed to setup mobile notifications:', error);
    }
  }

  private async showMobileLocalNotification(payload: NotificationPayload) {
    // Check deduplication
    const shouldShow = await this.checkDeduplication(
      payload.eventKey || `${payload.type}_${payload.signalId}_${Date.now()}`
    );
    
    if (!shouldShow) {
      console.log('⏭️ Notification suppressed (duplicate)');
      return;
    }

    // Determine notification properties
    const priority = this.getNotificationPriority(payload.type || 'default');
    const channel = this.getNotificationChannel(payload.type || 'default');
    const sound = this.getNotificationSound(payload.type || 'default');
    const color = this.getNotificationColor(payload.type || 'default');

    try {
      // Show local notification
      await LocalNotifications.schedule({
        notifications: [{
          title: payload.title,
          body: payload.body,
          id: Date.now(),
          extra: payload.data,
          sound: sound,
          smallIcon: 'ic_notification', // Android
          iconColor: color, // Android
          channelId: channel, // Android
          threadIdentifier: payload.signalId || 'default', // iOS grouping
          summaryArgument: payload.type || 'signal', // iOS summary
        }]
      });

      // Increment badge
      await this.incrementBadge();

      // Sync with existing NotificationService for UI updates
      notificationService.incrementUnreadCount(1);

      console.log('✅ Mobile notification shown successfully');
    } catch (error) {
      console.error('Failed to show mobile notification:', error);
    }
  }

  // ============================================
  // DESKTOP WEB NOTIFICATIONS (Browser)
  // ============================================

  private async setupWebNotifications() {
    console.log('🌐 Setting up web push notifications...');

    // ✅ FIX: Disabled auto-request. We use OneSignal via Airbnb modal instead.
    // if ('Notification' in window && Notification.permission === 'default') {
    //   await Notification.requestPermission();
    // }
  }

  async showWebNotification(payload: NotificationPayload) {
    // Check deduplication
    const shouldShow = await this.checkDeduplication(
      payload.eventKey || `${payload.type}_${payload.signalId}_${Date.now()}`
    );
    
    if (!shouldShow) {
      console.log('⏭️ Notification suppressed (duplicate)');
      return;
    }

    if (Notification.permission === 'granted') {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: '/imperial-logo.png',
        badge: '/badge-icon.png',
        tag: payload.signalId || 'default',
        data: payload.data,
        requireInteraction: payload.type === 'stop_loss_hit' || payload.type === 'signal_closed',
      });

      notification.onclick = () => {
        window.focus();
        this.handleNotificationTap(payload.data);
        notification.close();
      };

      // Sync with existing NotificationService
      notificationService.incrementUnreadCount(1);
    }
  }

  // ============================================
  // DEDUPLICATION (Works on Both Platforms)
  // ============================================

  private async checkDeduplication(eventKey: string): Promise<boolean> {
    const now = Date.now();
    const DEDUP_WINDOW = 120000; // 120 seconds
    const storageKey = `notif_dedup_${eventKey}`;

    if (this.isNative) {
      // Mobile: Use Capacitor Preferences (persistent storage)
      const { value } = await Preferences.get({ key: storageKey });
      const lastShown = value ? parseInt(value, 10) : 0;

      if (now - lastShown < DEDUP_WINDOW) {
        return false;
      }

      await Preferences.set({ key: storageKey, value: now.toString() });
      return true;

    } else {
      // Desktop: Use window (existing code)
      if (!(window as any).lastShownMap) {
        (window as any).lastShownMap = new Map();
      }

      const lastShown = (window as any).lastShownMap.get(eventKey) || 0;

      if (now - lastShown < DEDUP_WINDOW) {
        return false;
      }

      (window as any).lastShownMap.set(eventKey, now);
      return true;
    }
  }

  // ============================================
  // BADGE MANAGEMENT (Mobile Only)
  // ============================================

  private async incrementBadge() {
    if (!this.isNative) return;

    try {
      const count = await this.getBadgeCount();
      await Badge.set({ count: count + 1 });
      await Preferences.set({ 
        key: 'badge_count', 
        value: (count + 1).toString() 
      });
    } catch (error) {
      console.error('Failed to increment badge:', error);
    }
  }

  async decrementBadge() {
    if (!this.isNative) return;

    try {
      const count = await this.getBadgeCount();
      const newCount = Math.max(0, count - 1);
      await Badge.set({ count: newCount });
      await Preferences.set({ 
        key: 'badge_count', 
        value: newCount.toString() 
      });

      // Sync with existing NotificationService
      notificationService.clearUnreadCount();
    } catch (error) {
      console.error('Failed to decrement badge:', error);
    }
  }

  async clearBadge() {
    if (!this.isNative) return;

    try {
      await Badge.clear();
      await Preferences.set({ key: 'badge_count', value: '0' });
      
      // Sync with existing NotificationService
      notificationService.clearUnreadCount();
    } catch (error) {
      console.error('Failed to clear badge:', error);
    }
  }

  private async getBadgeCount(): Promise<number> {
    try {
      const { value } = await Preferences.get({ key: 'badge_count' });
      return value ? parseInt(value, 10) : 0;
    } catch {
      return 0;
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private getNotificationPriority(type: string): number {
    const critical = ['stop_loss_hit', 'signal_closed', 'manual_close'];
    const high = ['tp_hit', 'take_profit_hit', 'signal_created', 'limit_order_activated'];

    if (critical.includes(type)) return 5; // Max priority
    if (high.includes(type)) return 4; // High priority
    return 3; // Default priority
  }

  private getNotificationChannel(type: string): string {
    const critical = ['stop_loss_hit', 'signal_closed', 'manual_close'];
    const high = ['tp_hit', 'take_profit_hit', 'signal_created', 'limit_order_activated'];

    if (critical.includes(type)) return 'critical_alerts';
    if (high.includes(type)) return 'high_priority';
    return 'standard_updates';
  }

  private getNotificationSound(type: string): string | undefined {
    const critical = ['stop_loss_hit', 'signal_closed', 'manual_close'];
    const high = ['tp_hit', 'take_profit_hit', 'signal_created', 'limit_order_activated'];

    if (critical.includes(type)) return 'critical_alert.wav';
    if (high.includes(type)) return 'signal_alert.wav';
    return undefined; // Default sound
  }

  private getNotificationColor(type: string): string {
    const critical = ['stop_loss_hit', 'signal_closed', 'manual_close'];
    const high = ['tp_hit', 'take_profit_hit', 'signal_created', 'limit_order_activated'];

    if (critical.includes(type)) return '#DC2626'; // Red
    if (high.includes(type)) return '#059669'; // Green
    return '#C09A58'; // Imperial Gold
  }

  private async registerDeviceToken(token: string) {
    try {
      if (!this.currentUserId) {
        console.warn('⚠️ No user ID available for device token registration');
        return;
      }

      console.log(`📱 Registering device token for user ${this.currentUserId} on ${this.platform}...`);

      // Call the register-device-token edge function
      const { data, error } = await supabase.functions.invoke('register-device-token', {
        body: {
          userId: this.currentUserId,
          token: token,
          platform: this.platform,
        }
      });

      if (error) {
        console.error('❌ Device token registration failed:', error);
        throw error;
      }

      console.log('✅ Device token registered successfully via edge function:', data);
    } catch (error) {
      console.error('❌ Failed to register device token:', error);
      // Don't throw - allow app to continue even if token registration fails
      // User can still use the app, just won't get push notifications
    }
  }

  private handleNotificationTap(data: any) {
    console.log('Handling notification tap:', data);

    // Navigate to appropriate screen
    if (data.signal_id) {
      // Navigate to signal stream with signal highlighted
      window.location.href = `/dashboard/signal-stream?signalId=${data.signal_id}`;
    }

    // Decrement badge when notification is tapped
    this.decrementBadge();
  }

  // ============================================
  // PUBLIC API (Compatible with ModernNotificationSystem)
  // ============================================

  async showNotification(payload: NotificationPayload) {
    console.log(`📢 Showing notification on ${this.platform}:`, payload);

    if (this.isNative) {
      await this.showMobileLocalNotification(payload);
    } else {
      await this.showWebNotification(payload);
    }
  }

  setCurrentUser(userId: string | null) {
    this.currentUserId = userId;
    if (userId && this.deviceToken) {
      // Re-register token with new user
      this.registerDeviceToken(this.deviceToken);
    }
  }

  getPlatform(): string {
    return this.platform;
  }

  isNativePlatform(): boolean {
    return this.isNative;
  }

  getDeviceToken(): string | null {
    return this.deviceToken;
  }
}

// Export singleton
export const capacitorNotificationService = CapacitorNotificationService.getInstance();
