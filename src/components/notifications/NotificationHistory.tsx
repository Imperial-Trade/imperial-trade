import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Search, Filter, Bell, Check, X, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface NotificationDelivery {
  id: string;
  notification_id: string;
  onesignal_id: string | null;
  title: string;
  message: string;
  status: 'sent' | 'delivered' | 'opened' | 'failed';
  sent_at: string;
  delivered_at: string | null;
  error_message: string | null;
  platform: string | null;
  device_type: string | null;
  metadata: Record<string, any>;
}

export const NotificationHistory: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const pageSize = 20;

  useEffect(() => {
    if (user) {
      loadNotifications();
    }
  }, [user, statusFilter, page]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('push_notification_deliveries')
        .select('*')
        .eq('user_id', user?.id)
        .order('sent_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform data to match interface types
      const transformedData = (data || []).map(item => ({
        ...item,
        status: item.status as 'sent' | 'delivered' | 'opened' | 'failed',
        metadata: item.metadata as Record<string, any>,
      }));

      if (page === 1) {
        setNotifications(transformedData);
      } else {
        setNotifications(prev => [...prev, ...transformedData]);
      }

      setHasMore((data || []).length === pageSize);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'opened':
        return <Bell className="w-4 h-4 text-blue-500" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'default';
      case 'opened':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const filteredNotifications = notifications.filter(notification =>
    notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    notification.message.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Notification History</h3>
          <p className="text-muted-foreground">View your notification delivery history</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading && page === 1 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-muted-foreground">Loading notifications...</div>
            </CardContent>
          </Card>
        ) : filteredNotifications.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? "Try adjusting your search or filter criteria"
                    : "You haven't received any notifications yet"
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {filteredNotifications.map((notification) => (
              <Card key={notification.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="mt-1">
                      {getStatusIcon(notification.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="font-semibold text-foreground truncate">
                            {notification.title}
                          </h4>
                          <p className="text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span>
                              Sent {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true })}
                            </span>
                            {notification.delivered_at && (
                              <span>
                                Delivered {formatDistanceToNow(new Date(notification.delivered_at), { addSuffix: true })}
                              </span>
                            )}
                            {notification.platform && (
                              <span>{notification.platform}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getStatusColor(notification.status)}>
                            {notification.status}
                          </Badge>
                        </div>
                      </div>
                      
                      {notification.error_message && (
                        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                          <p className="text-sm text-red-700">
                            <strong>Error:</strong> {notification.error_message}
                          </p>
                        </div>
                      )}

                      {notification.metadata && Object.keys(notification.metadata).length > 0 && (
                        <details className="mt-3">
                          <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                            View details
                          </summary>
                          <div className="mt-2 p-3 bg-muted rounded-md">
                            <pre className="text-xs overflow-auto">
                              {JSON.stringify(notification.metadata, null, 2)}
                            </pre>
                          </div>
                        </details>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {hasMore && !loading && (
              <div className="text-center">
                <Button onClick={loadMore} variant="outline">
                  Load More
                </Button>
              </div>
            )}

            {loading && page > 1 && (
              <div className="text-center py-4">
                <div className="text-muted-foreground">Loading more...</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};