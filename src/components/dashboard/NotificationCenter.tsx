import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bell, Target, XCircle, Rocket, StopCircle, CheckCircle, AlertCircle, DollarSign, TrendingUp, X } from "lucide-react";
import { notificationStore, SignalNotification } from "@/services/SharedNotificationStore";
import { formatDistanceToNow } from "date-fns";

const icons = {
  signal_created: <Bell className="w-5 h-5 text-blue-400" />,
  tp_hit: <Target className="w-5 h-5 text-green-400" />,
  stop_loss_hit: <XCircle className="w-5 h-5 text-red-400" />,
  limit_activated: <Rocket className="w-5 h-5 text-purple-400" />,
  limit_cancelled: <StopCircle className="w-5 h-5 text-orange-400" />,
  manual_close: <CheckCircle className="w-5 h-5 text-blue-400" />,
  notes_updated: <AlertCircle className="w-5 h-5 text-gray-400" />,
  all_tps_hit: <DollarSign className="w-5 h-5 text-gold-400" />,
  signal_updated: <TrendingUp className="w-5 h-5 text-yellow-400" />,
};

const colors = {
  signal_created: "border-blue-500 bg-blue-500/10",
  tp_hit: "border-green-500 bg-green-500/10",
  stop_loss_hit: "border-red-500 bg-red-500/10",
  limit_activated: "border-purple-500 bg-purple-500/10",
  limit_cancelled: "border-orange-500 bg-orange-500/10",
  manual_close: "border-blue-500 bg-blue-500/10",
  notes_updated: "border-gray-500 bg-gray-500/10",
  all_tps_hit: "border-gold-500 bg-gold-500/10",
  signal_updated: "border-yellow-500 bg-yellow-500/10",
};

const priorityGlow = {
  critical: "shadow-lg shadow-red-500/20 ring-1 ring-red-500/30",
  high: "shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/30",
  medium: "shadow-md shadow-gray-500/10",
  low: "shadow-sm",
};

export const NotificationCenter = () => {
  const [notifications, setNotifications] = useState<SignalNotification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    const unsubscribe = notificationStore.subscribe((updatedNotifications) => {
      setNotifications(updatedNotifications);
    });

    return unsubscribe;
  }, []);

  const filteredNotifications = filter === "all" 
    ? notifications 
    : notifications.filter(n => !n.isRead);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markAsRead = (id: string) => {
    notificationStore.markAsRead(id);
  };

  const markAllAsRead = () => {
    notificationStore.markAllAsRead();
  };

  const deleteNotification = (id: string) => {
    notificationStore.removeNotification(id);
  };

  const clearAll = () => {
    notificationStore.clearAll();
  };

  return (
    <Card className="w-full max-w-md border-border/50 bg-card/95 backdrop-blur-sm">
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-1">
                {unreadCount}
              </Badge>
            )}
          </div>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </Button>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
            className="flex-1"
          >
            All
          </Button>
          <Button
            variant={filter === "unread" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("unread")}
            className="flex-1"
          >
            Unread {unreadCount > 0 && `(${unreadCount})`}
          </Button>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={markAllAsRead}
            className="w-full mt-2 text-xs"
          >
            Mark all as read
          </Button>
        )}
      </div>

      <ScrollArea className="h-[400px]">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
            <Bell className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`
                  ${colors[notification.type]} 
                  ${priorityGlow[notification.priority]}
                  border-2 backdrop-blur-md bg-background/90 hover:bg-background/95 
                  transition-all duration-200 cursor-pointer
                  ${!notification.isRead ? 'ring-2 ring-primary/20' : ''}
                `}
                onClick={() => !notification.isRead && markAsRead(notification.id)}
              >
                <div className="p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {icons[notification.type]}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-foreground text-sm leading-tight">
                          {notification.title || notification.type.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ')}
                        </h4>
                        {notification.priority === 'critical' && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            URGENT
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-muted-foreground text-xs mt-1 leading-snug">
                        {notification.message}
                      </p>
                      
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <p className="text-muted-foreground/80 text-xs">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </p>
                        {!notification.isRead && (
                          <Badge variant="outline" className="text-xs">
                            New
                          </Badge>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      className="text-muted-foreground hover:text-foreground p-1 h-auto flex-shrink-0 ml-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
};
