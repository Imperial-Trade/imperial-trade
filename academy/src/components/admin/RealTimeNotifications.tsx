
import React, { useState, useEffect } from 'react';
import { Bell, X, AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { adminSecurity } from '@/services/AdminSecurityService';
import { performanceMonitor } from '@/services/PerformanceMonitorService';

interface Notification {
  id: string;
  type: 'security' | 'performance' | 'system' | 'user';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export const RealTimeNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Simulate real-time notifications
    const interval = setInterval(() => {
      checkForNewNotifications();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const checkForNewNotifications = () => {
    // Check security alerts
    const securityAlerts = adminSecurity.getSecurityAlerts(5);
    const systemHealth = performanceMonitor.getSystemHealth();

    // Create notifications from security alerts
    securityAlerts.forEach(alert => {
      const existingNotification = notifications.find(n => n.id === `security-${alert.id}`);
      if (!existingNotification) {
        addNotification({
          id: `security-${alert.id}`,
          type: 'security',
          severity: alert.severity,
          title: 'Security Alert',
          message: alert.message,
          timestamp: alert.timestamp,
          read: false
        });
      }
    });

    // Create performance notifications
    if (systemHealth.status === 'degraded' || systemHealth.status === 'critical') {
      const perfNotificationId = `performance-${Date.now()}`;
      const existingPerfNotification = notifications.find(n => 
        n.type === 'performance' && n.timestamp > new Date(Date.now() - 60000)
      );
      
      if (!existingPerfNotification) {
        addNotification({
          id: perfNotificationId,
          type: 'performance',
          severity: systemHealth.status === 'critical' ? 'critical' : 'high',
          title: 'Performance Issue',
          message: `System status is ${systemHealth.status}. Response time: ${systemHealth.responseTime.toFixed(0)}ms`,
          timestamp: new Date(),
          read: false
        });
      }
    }
  };

  const addNotification = (notification: Notification) => {
    setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
    setUnreadCount(prev => prev + 1);
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    const notification = notifications.find(n => n.id === id);
    if (notification && !notification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const getNotificationIcon = (type: Notification['type'], severity: Notification['severity']) => {
    if (severity === 'critical') return <XCircle className="w-4 h-4 text-red-500" />;
    if (severity === 'high') return <AlertTriangle className="w-4 h-4 text-orange-500" />;
    if (type === 'security') return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    if (type === 'performance') return <Info className="w-4 h-4 text-blue-500" />;
    return <CheckCircle className="w-4 h-4 text-green-500" />;
  };

  const getSeverityColor = (severity: Notification['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'high': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'medium': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="relative"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-500 text-white text-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {isOpen && (
        <Card className="absolute right-0 top-8 w-80 max-h-96 overflow-hidden shadow-lg z-50">
          <div className="p-3 border-b flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50/50 ${
                    !notification.read ? 'bg-blue-50/30' : ''
                  }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1">
                      {getNotificationIcon(notification.type, notification.severity)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          <Badge className={`text-xs ${getSeverityColor(notification.severity)}`}>
                            {notification.severity}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-400">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      )}
    </div>
  );
};
