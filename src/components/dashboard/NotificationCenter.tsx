
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bell, 
  Check, 
  X, 
  TrendingUp, 
  Target,
  XCircle,
  Rocket,
  StopCircle,
  CheckCircle,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  signal_id?: string;
  user_id?: string;
}

// Icon mapping by notification type (matching InAppNotificationSystem)
const icons: Record<string, React.ReactNode> = {
  signal_created: <Bell className="w-5 h-5 text-blue-400" />,
  tp_hit: <Target className="w-5 h-5 text-green-400" />,
  multiple_tps_hit: <Target className="w-5 h-5 text-green-400" />,
  all_tps_hit: <DollarSign className="w-5 h-5 text-amber-400" />,
  stop_loss: <XCircle className="w-5 h-5 text-red-400" />,
  stop_loss_hit: <XCircle className="w-5 h-5 text-red-400" />,
  limit_order_activated: <Rocket className="w-5 h-5 text-purple-400" />,
  limit_cancelled: <StopCircle className="w-5 h-5 text-orange-400" />,
  manual_close: <CheckCircle className="w-5 h-5 text-blue-400" />,
  signal_updated: <AlertCircle className="w-5 h-5 text-blue-400" />,
  default: <TrendingUp className="w-5 h-5 text-primary" />,
};

// Color mapping by notification type (matching InAppNotificationSystem)
const colors: Record<string, string> = {
  signal_created: "border-blue-500 bg-blue-500/10",
  tp_hit: "border-green-500 bg-green-500/10",
  multiple_tps_hit: "border-green-500 bg-green-500/10",
  all_tps_hit: "border-amber-500 bg-amber-500/10",
  stop_loss: "border-red-500 bg-red-500/10",
  stop_loss_hit: "border-red-500 bg-red-500/10",
  limit_order_activated: "border-purple-500 bg-purple-500/10",
  limit_cancelled: "border-orange-500 bg-orange-500/10",
  manual_close: "border-blue-500 bg-blue-500/10",
  signal_updated: "border-blue-500 bg-blue-500/10",
  default: "border-primary bg-primary/10",
};

// Priority glow effects (matching InAppNotificationSystem)
const priorityGlow: Record<string, string> = {
  critical: "shadow-lg shadow-red-500/20 ring-1 ring-red-500/30",
  high: "shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/30",
  medium: "shadow-md shadow-gray-500/10",
  low: "shadow-sm",
};

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  // Load real notifications from database
  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Direct query to notification_delivery_log - 2,120 notifications stored
      const { data: allNotifications, error } = await supabase
        .from('notification_delivery_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Transform notifications with enhanced metadata parsing
      const transformedNotifications: Notification[] = (allNotifications || []).map((notif: any) => {
        const metadata = notif.metadata || {};
        const notifType = notif.notification_type;
        
        let title = 'Notification';
        let message = 'You have a new notification';
        let priority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
        let type = notifType; // Use the actual notification type
        
        // Parse based on notification type
        switch (notifType) {
          case 'signal_created':
            title = '🚀 New Signal Created';
            message = `${metadata.asset_name || metadata.asset_symbol || 'Asset'} - ${metadata.trade_type || 'Trade'} @ ${metadata.entry_price || 'Market'}`;
            priority = 'high';
            break;
          case 'tp_hit':
            title = '🎯 Take Profit Hit';
            const tpLevel = metadata.tp_level || (metadata.tp_hits && metadata.tp_hits[metadata.tp_hits.length - 1]);
            message = `TP${tpLevel || ''} reached for ${metadata.asset_name || metadata.asset_symbol || 'Asset'}`;
            priority = 'critical';
            break;
          case 'multiple_tps_hit':
            title = '🎯🎯 Multiple TPs Hit';
            message = `${metadata.new_tp_count || metadata.tp_hits?.length || 'Multiple'} targets reached for ${metadata.asset_name || metadata.asset_symbol || 'Asset'}`;
            priority = 'critical';
            break;
          case 'limit_order_activated':
            title = '✅ Limit Order Activated';
            message = `${metadata.asset_name || metadata.asset_symbol || 'Asset'} limit order activated at ${metadata.entry_price || 'target price'}`;
            priority = 'critical';
            break;
          case 'manual_close':
            title = '📊 Signal Closed';
            message = `${metadata.asset_name || metadata.asset_symbol || 'Asset'} signal manually closed - ${metadata.close_reason || 'Manual close'}`;
            priority = 'medium';
            break;
          case 'stop_loss':
          case 'stop_loss_hit':
            title = '⚠️ Stop Loss Hit';
            message = `Stop loss triggered for ${metadata.asset_name || metadata.asset_symbol || 'Asset'}`;
            priority = 'critical';
            break;
          case 'signal_updated':
            title = '🔄 Signal Updated';
            message = `${metadata.asset_name || metadata.asset_symbol || 'Asset'} signal updated`;
            priority = 'medium';
            break;
          default:
            title = notif.title || 'Notification';
            message = notif.message || `${notifType} notification`;
        }
        
        // Add author info if available
        if (metadata.author_name) {
          message += ` by ${metadata.author_name}`;
        }
        
        return {
          id: notif.id,
          type,
          title,
          message,
          timestamp: new Date(notif.created_at),
          isRead: notif.status === 'viewed' || notif.status === 'clicked',
          priority,
          signal_id: notif.signal_id,
          user_id: notif.author_id || metadata.author_id
        };
      });
      
      setNotifications(transformedNotifications);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Real-time auto-refresh when new notifications arrive
  useEffect(() => {
    if (!user) return;

    loadNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel('notification-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notification_delivery_log',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('📩 New notification received:', payload);
          loadNotifications();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' ? true : !n.isRead
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: string) => {
    try {
      const notification = notifications.find(n => n.id === id);
      if (!notification || notification.isRead) return;

      // Optimistic update
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );

      // Update database - set status to 'viewed' and opened_at timestamp
      const { error } = await supabase
        .from('notification_delivery_log')
        .update({ 
          status: 'viewed',
          opened_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      // Decrement badge count
      const { notificationService } = await import('@/services/NotificationService');
      notificationService.decrementUnreadCount(1);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      // Revert optimistic update on error
      loadNotifications();
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      if (unreadNotifications.length === 0) return;

      // Optimistic update
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

      // Update all unread notifications in database
      const { error } = await supabase
        .from('notification_delivery_log')
        .update({ 
          status: 'viewed',
          opened_at: new Date().toISOString()
        })
        .eq('user_id', user?.id)
        .neq('status', 'viewed')
        .neq('status', 'clicked');

      if (error) throw error;

      // Clear badge
      const { notificationService } = await import('@/services/NotificationService');
      notificationService.clearUnreadCount();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      loadNotifications();
    }
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex gap-1">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Unread
            </Button>
          </div>
        </div>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllAsRead} className="w-fit">
            Mark all as read
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-1 p-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50 animate-pulse" />
                <p>Loading notifications...</p>
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>{filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}</p>
              </div>
            ) : (
              filteredNotifications.map((notification, index) => (
                <div key={notification.id}>
                  <div
                    className={`p-3 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:bg-background/95 ${
                      colors[notification.type] || colors.default
                    } ${priorityGlow[notification.priority]} backdrop-blur-md bg-background/90 ${
                      !notification.isRead ? 'ring-2 ring-blue-400/30' : ''
                    }`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0">
                        {icons[notification.type] || icons.default}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm mb-1 truncate">
                              {notification.title}
                            </h4>
                            <p className="text-xs text-muted-foreground mb-2">
                              {notification.message}
                            </p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-muted-foreground">
                                {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                              </p>
                              {notification.priority === 'critical' && (
                                <span className="text-red-400 text-xs font-medium">URGENT</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < filteredNotifications.length - 1 && (
                    <Separator className="my-1" />
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
