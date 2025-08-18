import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, X, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface InAppNotification {
  id: string;
  type: 'signal_created' | 'signal_updated' | 'tp_hit' | 'sl_hit' | 'signal_closed';
  title: string;
  message: string;
  signal_id?: string;
  asset_name?: string;
  price?: number;
  timestamp: Date;
  read?: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
}

export const InAppNotificationSystem: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isVisible, setIsVisible] = useState(false);

  // Add notification to display queue
  const addNotification = useCallback((notification: Omit<InAppNotification, 'id' | 'timestamp'>) => {
    const newNotification: InAppNotification = {
      ...notification,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep max 5 notifications
    setIsVisible(true);

    // Auto-hide after delay based on priority
    const hideDelay = notification.priority === 'critical' ? 10000 : 
                     notification.priority === 'high' ? 7000 : 5000;
    
    setTimeout(() => {
      removeNotification(newNotification.id);
    }, hideDelay);

    // Play notification sound
    playNotificationSound(notification.type);
  }, []);

  // Remove notification
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== id);
      if (filtered.length === 0) {
        setIsVisible(false);
      }
      return filtered;
    });
  }, []);

  // Play sound based on notification type
  const playNotificationSound = useCallback((type: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const soundConfig = {
        'signal_created': { frequency: 800, duration: 300 },
        'tp_hit': { frequency: 1000, duration: 200 },
        'sl_hit': { frequency: 400, duration: 500 },
        'signal_updated': { frequency: 600, duration: 200 },
        'signal_closed': { frequency: 700, duration: 250 }
      };

      const config = soundConfig[type as keyof typeof soundConfig] || soundConfig.signal_created;
      
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + config.duration / 1000);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration / 1000);
    } catch (error) {
      console.warn('Could not play notification sound:', error);
    }
  }, []);

  // Get icon for notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'signal_created': return <Bell className="w-4 h-4" />;
      case 'tp_hit': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'sl_hit': return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'signal_closed': return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  // Get priority styling
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'normal': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  // Subscribe to real-time trade alert changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('in-app-notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_alerts',
          filter: `user_id=neq.${user.id}` // Don't notify for own signals
        },
        (payload) => {
          const { eventType, new: newData, old: oldData } = payload;
          
          if (eventType === 'INSERT') {
            addNotification({
              type: 'signal_created',
              title: 'New Trading Signal',
              message: `${newData.asset_name} ${newData.trade_type.toUpperCase()} signal created`,
              signal_id: newData.id,
              asset_name: newData.asset_name,
              price: newData.entry_price,
              priority: 'high'
            });
          } else if (eventType === 'UPDATE') {
            // Check what changed
            if (oldData.status !== newData.status && newData.status === 'closed') {
              addNotification({
                type: 'signal_closed',
                title: 'Signal Closed',
                message: `${newData.asset_name} signal closed${newData.close_reason ? ` (${newData.close_reason})` : ''}`,
                signal_id: newData.id,
                asset_name: newData.asset_name,
                priority: 'normal'
              });
            }
            
            if (oldData.tp_hits?.length !== newData.tp_hits?.length) {
              const newTPs = newData.tp_hits?.filter((tp: number) => !oldData.tp_hits?.includes(tp)) || [];
              if (newTPs.length > 0) {
                addNotification({
                  type: 'tp_hit',
                  title: 'Take Profit Hit!',
                  message: `${newData.asset_name} TP${newTPs[0]} reached`,
                  signal_id: newData.id,
                  asset_name: newData.asset_name,
                  priority: 'high'
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, addNotification]);

  // Make addNotification globally available
  useEffect(() => {
    (window as any).addInAppNotification = addNotification;
    return () => {
      delete (window as any).addInAppNotification;
    };
  }, [addNotification]);

  if (!isVisible || notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            className="w-full"
          >
            <Card className={`p-4 shadow-lg ${getPriorityColor(notification.priority)}`}>
              <div className="flex items-start justify-between space-x-3">
                <div className="flex items-start space-x-3 flex-1">
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900">
                        {notification.title}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {notification.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-700">
                      {notification.message}
                    </p>
                    {notification.price && (
                      <p className="text-xs text-gray-500 mt-1">
                        Price: ${notification.price}
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {notification.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeNotification(notification.id)}
                  className="h-6 w-6 p-0 hover:bg-gray-200"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default InAppNotificationSystem;