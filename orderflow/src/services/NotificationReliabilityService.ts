import { supabase } from '@/integrations/supabase/client';
import { notificationService } from './NotificationService';

export interface NotificationMetrics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  deliveryRate: number;
  avgDeliveryTime: number;
}

class NotificationReliabilityService {
  private static instance: NotificationReliabilityService;
  private monitoringInterval: number | null = null;

  private constructor() {}

  static getInstance(): NotificationReliabilityService {
    if (!NotificationReliabilityService.instance) {
      NotificationReliabilityService.instance = new NotificationReliabilityService();
    }
    return NotificationReliabilityService.instance;
  }

  // Start monitoring notification reliability
  startMonitoring() {
    if (this.monitoringInterval) return;

    this.monitoringInterval = window.setInterval(() => {
      this.checkNotificationHealth();
    }, 60000); // Check every minute

    console.log('🔍 Notification reliability monitoring started');
  }

  // Stop monitoring
  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('⏹️ Notification reliability monitoring stopped');
    }
  }

  // Check notification system health
  async checkNotificationHealth(): Promise<NotificationMetrics> {
    try {
      const { data: recentLogs, error } = await supabase
        .from('notification_delivery_log')
        .select('status, sent_at, delivered_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      const totalSent = recentLogs?.length || 0;
      const totalDelivered = recentLogs?.filter(log => log.status === 'sent' || log.status === 'delivered').length || 0;
      const totalFailed = recentLogs?.filter(log => log.status === 'failed').length || 0;
      
      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 100;
      
      // Calculate average delivery time for successful deliveries
      const deliveredLogs = recentLogs?.filter(log => log.sent_at && log.delivered_at) || [];
      const avgDeliveryTime = deliveredLogs.length > 0 
        ? deliveredLogs.reduce((sum, log) => {
            const sentTime = new Date(log.sent_at!).getTime();
            const deliveredTime = new Date(log.delivered_at!).getTime();
            return sum + (deliveredTime - sentTime);
          }, 0) / deliveredLogs.length / 1000 // Convert to seconds
        : 0;

      const metrics: NotificationMetrics = {
        totalSent,
        totalDelivered,
        totalFailed,
        deliveryRate,
        avgDeliveryTime
      };

      // Alert if delivery rate is too low
      if (deliveryRate < 80 && totalSent > 10) {
        console.warn('⚠️ Low notification delivery rate:', deliveryRate.toFixed(1) + '%');
        
        // Notify admins about low delivery rate
        if ((window as any).addNotification) {
          (window as any).addNotification({
            type: 'warning',
            title: '⚠️ Notification System Alert',
            message: `Delivery rate dropped to ${deliveryRate.toFixed(1)}% - Check system health`,
            timestamp: new Date()
          });
        }
      }

      return metrics;
    } catch (error) {
      console.error('❌ Failed to check notification health:', error);
      return {
        totalSent: 0,
        totalDelivered: 0,
        totalFailed: 0,
        deliveryRate: 0,
        avgDeliveryTime: 0
      };
    }
  }

  // Retry failed notifications manually
  async retryFailedNotifications(): Promise<number> {
    try {
      console.log('🔄 Retrying failed notifications...');

      // Get recent failed notifications (last 2 hours)
      const { data: failedLogs, error } = await supabase
        .from('notification_delivery_log')
        .select('*')
        .eq('status', 'failed')
        .gte('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
        .limit(10);

      if (error) throw error;

      const retryCount = failedLogs?.length || 0;
      
      if (retryCount > 0) {
        // Mark for retry by calling the enhanced dispatcher
        for (const log of failedLogs || []) {
          try {
            // Get signal information
            const { data: signal, error: signalError } = await supabase
              .from('trade_alerts')
              .select('*')
              .eq('id', log.signal_id)
              .single();

            if (signalError || !signal) continue;

            // Get author profile separately
            const { data: profile } = await supabase
              .from('public_profiles')
              .select('display_name, avatar_url')
              .eq('id', signal.user_id)
              .single();

            // Retry the notification
            const retryPayload = {
              notifications: [{
                signal_id: log.signal_id,
                user_id: signal.user_id,
                asset_name: signal.asset_name,
                trade_type: signal.trade_type,
                entry_price: signal.entry_price,
                stop_loss: signal.stop_loss,
                tp1: signal.tp1,
                tp2: signal.tp2,
                tp3: signal.tp3,
                tp4: signal.tp4,
                tp5: signal.tp5,
                symbol: signal.tradermade_symbol,
                tradermade_symbol: signal.tradermade_symbol,
                created_at: signal.created_at,
                notification_type: log.notification_type,
                alert_type: log.notification_type,
                target_price: signal.entry_price,
                triggered_price: signal.entry_price,
                status: signal.status,
                author_id: signal.user_id,
                author_name: profile?.display_name || 'Unknown',
                author_avatar_url: profile?.avatar_url,
                delivery_channels: [log.delivery_channel],
                user_ids: [log.user_id],
                include_creator: false,
                priority_level: 1
              }]
            };

            // Call enhanced dispatcher
            const { error: dispatchError } = await supabase.functions.invoke(
              'enhanced-signal-notification-dispatcher',
              { body: retryPayload }
            );

            if (!dispatchError) {
              console.log('✅ Retry successful for notification:', log.id);
            }
          } catch (retryError) {
            console.warn('Failed to retry notification:', log.id, retryError);
          }
        }
      }

      console.log(`🔄 Retry attempt completed: ${retryCount} notifications processed`);
      return retryCount;
    } catch (error) {
      console.error('❌ Failed to retry notifications:', error);
      return 0;
    }
  }

  // Get detailed notification analytics
  async getNotificationAnalytics(days = 7): Promise<{
    daily: Array<{ date: string; sent: number; delivered: number; failed: number; rate: number }>;
    channels: Record<string, { sent: number; delivered: number; failed: number }>;
    types: Record<string, { sent: number; delivered: number; failed: number }>;
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data: logs, error } = await supabase
        .from('notification_delivery_log')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by day
      const dailyStats: Record<string, { sent: number; delivered: number; failed: number }> = {};
      const channelStats: Record<string, { sent: number; delivered: number; failed: number }> = {};
      const typeStats: Record<string, { sent: number; delivered: number; failed: number }> = {};

      for (const log of logs || []) {
        const date = new Date(log.created_at).toISOString().split('T')[0];
        
        // Daily stats
        if (!dailyStats[date]) {
          dailyStats[date] = { sent: 0, delivered: 0, failed: 0 };
        }
        if (log.status === 'sent' || log.status === 'delivered') dailyStats[date].sent++;
        if (log.status === 'delivered') dailyStats[date].delivered++;
        if (log.status === 'failed') dailyStats[date].failed++;

        // Channel stats
        if (!channelStats[log.delivery_channel]) {
          channelStats[log.delivery_channel] = { sent: 0, delivered: 0, failed: 0 };
        }
        if (log.status === 'sent' || log.status === 'delivered') channelStats[log.delivery_channel].sent++;
        if (log.status === 'delivered') channelStats[log.delivery_channel].delivered++;
        if (log.status === 'failed') channelStats[log.delivery_channel].failed++;

        // Type stats
        if (!typeStats[log.notification_type]) {
          typeStats[log.notification_type] = { sent: 0, delivered: 0, failed: 0 };
        }
        if (log.status === 'sent' || log.status === 'delivered') typeStats[log.notification_type].sent++;
        if (log.status === 'delivered') typeStats[log.notification_type].delivered++;
        if (log.status === 'failed') typeStats[log.notification_type].failed++;
      }

      // Convert daily stats to array with rates
      const daily = Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        ...stats,
        rate: stats.sent > 0 ? (stats.delivered / stats.sent) * 100 : 100
      })).sort((a, b) => a.date.localeCompare(b.date));

      return { daily, channels: channelStats, types: typeStats };
    } catch (error) {
      console.error('❌ Failed to get notification analytics:', error);
      return { daily: [], channels: {}, types: {} };
    }
  }

  // Test the entire notification flow
  async testNotificationFlow(userId: string): Promise<boolean> {
    try {
      console.log('🧪 Testing notification flow for user:', userId);

      // Create a test notification
      const testPayload = {
        notifications: [{
          signal_id: 'test-' + Date.now(),
          user_id: userId,
          asset_name: 'EURUSD',
          trade_type: 'buy',
          entry_price: 1.1000,
          stop_loss: 1.0950,
          tp1: 1.1100,
          symbol: 'EURUSD',
          tradermade_symbol: 'EURUSD',
          created_at: new Date().toISOString(),
          notification_type: 'signal_created',
          alert_type: 'signal_created',
          target_price: 1.1000,
          triggered_price: 1.1000,
          status: 'pending',
          author_id: userId,
          author_name: 'Test User',
          delivery_channels: ['in_app', 'push'],
          user_ids: [userId],
          include_creator: true,
          priority_level: 1
        }]
      };

      // Test the enhanced dispatcher
      const { data, error } = await supabase.functions.invoke(
        'enhanced-signal-notification-dispatcher',
        { body: testPayload }
      );

      if (error) {
        console.error('❌ Test notification failed:', error);
        return false;
      }

      console.log('✅ Test notification sent successfully:', data);
      return true;
    } catch (error) {
      console.error('❌ Test notification error:', error);
      return false;
    }
  }
}

export const notificationReliabilityService = NotificationReliabilityService.getInstance();
export default NotificationReliabilityService;