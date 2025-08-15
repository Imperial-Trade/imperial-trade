import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertTriangle,
  MoreHorizontal,
  Filter,
  Search
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useUserNotifications } from '@/hooks/useUserNotifications';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'signal': return <TrendingUp className="w-4 h-4 text-accent-blue" />;
    case 'follower': return <Users className="w-4 h-4 text-accent-green" />;
    case 'message': return <MessageSquare className="w-4 h-4 text-accent-gold" />;
    case 'system': return <Settings className="w-4 h-4 text-muted-foreground" />;
    case 'alert': return <AlertTriangle className="w-4 h-4 text-accent-red" />;
    default: return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
};

const getPriorityStyles = (priority: string) => {
  switch (priority) {
    case 'high': 
      return {
        border: 'border-l-accent-red',
        background: 'bg-destructive/5 dark:bg-destructive/10',
        glow: 'shadow-[0_0_15px_hsl(var(--accent-red)/0.2)]'
      };
    case 'medium': 
      return {
        border: 'border-l-accent-gold',
        background: 'bg-accent-gold/5 dark:bg-accent-gold/10',
        glow: 'shadow-[0_0_15px_hsl(var(--accent-gold)/0.15)]'
      };
    case 'low': 
      return {
        border: 'border-l-accent-blue',
        background: 'bg-accent-blue/5 dark:bg-accent-blue/10',
        glow: 'shadow-[0_0_15px_hsl(var(--accent-blue)/0.1)]'
      };
    default: 
      return {
        border: 'border-l-border',
        background: 'bg-muted/20',
        glow: ''
      };
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'signal': return 'Signal';
    case 'follower': return 'Follower';
    case 'message': return 'Message';
    case 'system': return 'System';
    case 'alert': return 'Alert';
    default: return 'Notification';
  }
};

export const NotificationCenter: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const { notifications, isLoading, error, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useUserNotifications();

  const filteredNotifications = notifications.filter(n => {
    const matchesReadFilter = filter === 'all' ? true : !n.is_read;
    const matchesSearch = searchQuery === '' || 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || n.type === typeFilter;
    return matchesReadFilter && matchesSearch && matchesType;
  });

  const notificationTypes = ['all', ...new Set(notifications.map(n => n.type))];

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-6 h-6 text-foreground" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent-red rounded-full flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-accent-blue hover:text-accent-blue/80 hover:bg-accent-blue/10 font-medium"
            >
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
              className="h-8 px-3 text-sm"
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('unread')}
              className="h-8 px-3 text-sm"
            >
              Unread
              {unreadCount > 0 && (
                <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1.5 text-xs">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 px-3 text-sm">
                  <Filter className="w-3 h-3 mr-1" />
                  {typeFilter === 'all' ? 'All Types' : getTypeLabel(typeFilter)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                {notificationTypes.map(type => (
                  <DropdownMenuItem 
                    key={type}
                    onClick={() => setTypeFilter(type)}
                    className={typeFilter === type ? 'bg-accent' : ''}
                  >
                    {type === 'all' ? 'All Types' : getTypeLabel(type)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search notifications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-9 bg-muted/50 border-border/50 focus:border-primary transition-colors"
            />
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive font-medium">Failed to load notifications</p>
          </div>
        )}
      </div>
      
      {/* Notifications List */}
      <ScrollArea className="h-[500px]">
        <div className="p-2">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 animate-pulse">
                  <div className="w-8 h-8 bg-muted rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="text-center py-12 px-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-muted/30 rounded-full flex items-center justify-center">
                <Bell className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchQuery || typeFilter !== 'all' || filter === 'unread' ? 'No matches found' : 'No notifications'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery || typeFilter !== 'all' || filter === 'unread' 
                  ? 'Try adjusting your filters or search query' 
                  : 'Stay tuned for important updates and alerts'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification, index) => {
                const priorityStyles = getPriorityStyles(notification.priority);
                
                return (
                  <div key={notification.id} className="group">
                    <div
                      className={`
                        relative p-4 rounded-xl border-l-4 transition-all duration-300 cursor-pointer
                        ${priorityStyles.border} ${priorityStyles.background} ${priorityStyles.glow}
                        ${!notification.is_read ? 'bg-primary/5 ring-1 ring-primary/10' : 'hover:bg-muted/50'}
                        hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]
                      `}
                      onClick={() => !notification.is_read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon Container */}
                        <div className={`
                          p-2 rounded-lg flex-shrink-0 transition-colors
                          ${!notification.is_read ? 'bg-primary/10' : 'bg-muted/50'}
                        `}>
                          {getNotificationIcon(notification.type)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge 
                                  variant="secondary" 
                                  className="text-xs px-2 py-0.5 bg-muted/70 text-muted-foreground"
                                >
                                  {getTypeLabel(notification.type)}
                                </Badge>
                                {!notification.is_read && (
                                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                                )}
                              </div>
                              <h4 className={`
                                text-sm leading-tight line-clamp-2
                                ${!notification.is_read ? 'font-semibold text-foreground' : 'font-medium text-foreground/90'}
                              `}>
                                {notification.title}
                              </h4>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {!notification.is_read && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    markAsRead(notification.id);
                                  }}
                                  className="h-7 w-7 p-0 hover:bg-accent-green/10 hover:text-accent-green"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </Button>
                              )}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    className="h-7 w-7 p-0 hover:bg-muted/70"
                                  >
                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  {!notification.is_read && (
                                    <DropdownMenuItem 
                                      onClick={() => markAsRead(notification.id)}
                                      className="text-accent-green"
                                    >
                                      <Check className="w-4 h-4 mr-2" />
                                      Mark as read
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuItem 
                                    onClick={() => deleteNotification(notification.id)}
                                    className="text-destructive"
                                  >
                                    <X className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <p className="text-xs text-muted-foreground/80">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </p>
                            {notification.priority !== 'low' && (
                              <Badge 
                                variant={notification.priority === 'high' ? 'destructive' : 'secondary'}
                                className="text-xs px-1.5 py-0.5"
                              >
                                {notification.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {index < filteredNotifications.length - 1 && (
                      <Separator className="my-2 mx-4 opacity-50" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};