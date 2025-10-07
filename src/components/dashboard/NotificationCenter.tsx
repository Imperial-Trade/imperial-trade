
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
  Users, 
  MessageSquare,
  Settings,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: 'signal' | 'follower' | 'message' | 'system' | 'alert';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  signal_id?: string;
  user_id?: string;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'signal': return <TrendingUp className="w-4 h-4" />;
    case 'follower': return <Users className="w-4 h-4" />;
    case 'message': return <MessageSquare className="w-4 h-4" />;
    case 'system': return <Settings className="w-4 h-4" />;
    case 'alert': return <AlertTriangle className="w-4 h-4" />;
    default: return <Bell className="w-4 h-4" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'border-l-red-500 bg-red-50 dark:bg-red-950/20';
    case 'medium': return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
    case 'low': return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
    default: return 'border-l-gray-500';
  }
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
      
      // Get user's notification history from various sources
      const { data: userNotifications } = await supabase
        .rpc('get_user_notifications', { 
          p_limit: 50 
        });

      // Get recent signal notifications from delivery logs
      const { data: signalNotifications } = await supabase
        .from('notification_delivery_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Transform and combine notifications
      const transformedNotifications: Notification[] = [];

      // Add forum notifications
      if (userNotifications) {
        userNotifications.forEach((notif: any) => {
          transformedNotifications.push({
            id: notif.event_id,
            type: notif.event_type === 'like' ? 'follower' : 'message',
            title: notif.event_type === 'like' ? 'Post Liked' : 'New Reply',
            message: notif.event_type === 'like' 
              ? `Someone liked your post: "${notif.post_title}"` 
              : `Someone replied to your post: "${notif.post_title}"`,
            timestamp: new Date(notif.created_at),
            isRead: !notif.unread,
            priority: 'medium'
          });
        });
      }

      // Add signal notifications
      if (signalNotifications) {
        signalNotifications.forEach((notif: any) => {
          if (notif.notification_type?.includes('signal')) {
            transformedNotifications.push({
              id: notif.id,
              type: 'signal',
              title: notif.notification_type === 'signal_created' ? 'New Signal' : 'Signal Updated',
              message: notif.message || `${notif.notification_type} notification`,
              timestamp: new Date(notif.created_at),
              isRead: notif.status === 'viewed' || notif.status === 'clicked',
              priority: notif.priority_level === 2 ? 'high' : 'medium',
              signal_id: notif.signal_id,
              user_id: notif.author_id
            });
          }
        });
      }

      // Sort by timestamp (most recent first)
      transformedNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setNotifications(transformedNotifications.slice(0, 50));
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const filteredNotifications = notifications.filter(n => 
    filter === 'all' ? true : !n.isRead
  );

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = async (id: string) => {
    try {
      // Update local state immediately
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );

      // Update in database if it's a forum notification
      const notification = notifications.find(n => n.id === id);
      if (notification && (notification.type === 'message' || notification.type === 'follower')) {
        await supabase.rpc('mark_notifications_read', {
          p_event_type: notification.type === 'follower' ? 'like' : 'comment',
          p_event_ids: [id]
        });
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      // Update local state immediately
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));

      // Update in database
      await supabase.rpc('mark_notifications_cleared');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
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
                    className={`p-3 rounded-lg border-l-4 transition-colors cursor-pointer hover:bg-muted/50 ${
                      getPriorityColor(notification.priority)
                    } ${!notification.isRead ? 'bg-muted/20' : ''}`}
                    onClick={() => !notification.isRead && markAsRead(notification.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="mt-0.5">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium truncate">
                              {notification.title}
                            </p>
                            {!notification.isRead && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {!notification.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notification.id);
                            }}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
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
