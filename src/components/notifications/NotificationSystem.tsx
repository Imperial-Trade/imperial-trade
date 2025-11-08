
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  X,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  Rocket,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { notificationValidator, type SignalChangeData } from '@/utils/notificationValidation';
import { NotificationEvent, subscribeToNotifications } from '@/utils/notificationBus';

// Extend the Window interface to include webkitAudioContext
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

const NotificationSystem = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);

  const playNotificationSound = useCallback((type: string) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const frequencies: Record<string, number> = {
      new_signal: 800,
      tp_hit: 1000,
      trade_activated: 900,
      trade_closed: 600,
      stop_loss: 400,
      economic_event: 750,
      error: 200,
      default: 700,
    };
    oscillator.frequency.value = frequencies[type] || frequencies.default;

    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.5
    );

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    async (notification: any) => {
      const now = Date.now();
      const cooldown = 5000; // 5 seconds cooldown

      // Enhanced validation for signal-related notifications
      if (notification.metadata?.signal_id && notification.metadata?.change_types) {
        // Validate actual changes occurred
        const changeData: SignalChangeData = {
          signalId: notification.metadata.signal_id,
          oldData: notification.metadata.old_data || {},
          newData: notification.metadata.new_data || {},
          changeTypes: notification.metadata.change_types || [],
          timestamp: new Date()
        };

        const validation = await notificationValidator.validateSignalChange(changeData);
        if (!validation.isValid) {
          console.log(`🚫 Notification blocked by validation: ${validation.reason}`);
          return;
        }

        // Check rate limiting for signal notifications
        const rateLimitPassed = await notificationValidator.checkNotificationRateLimit(notification.metadata.signal_id);
        if (!rateLimitPassed) {
          console.log(`🚫 Notification blocked by rate limit: ${notification.metadata.signal_id}`);
          return;
        }
      }

      if (now - lastNotificationTime < cooldown) {
        console.warn("Notification suppressed due to cooldown.");
        return;
      }

      // Enhanced notification-level deduplication with 120s TTL
      const notificationKey = notification.eventKey || `${notification.title}:${notification.message}`;
      const lastShownTime = (window as any).lastShownMap?.get(notificationKey) || 0;
      if (now - lastShownTime < 120000) {
        console.warn("Notification suppressed due to 120s deduplication:", notificationKey);
        return;
      }
      
      // Initialize or update lastShownMap globally
      if (!(window as any).lastShownMap) {
        (window as any).lastShownMap = new Map();
      }
      (window as any).lastShownMap.set(notificationKey, now);

      setLastNotificationTime(now);

      const id = Date.now() + Math.random();
      const enhancedNotification = { 
        ...notification, 
        id, 
        timestamp: new Date(),
        eventKey: notification.eventKey || `notification_${id}`,
        deliveryChannel: notification.deliveryChannel || 'in_app'
      };
      
      setNotifications((prev) => [enhancedNotification, ...prev]);
      setTimeout(() => removeNotification(id.toString()), 8000);
      playNotificationSound(notification.type);

      // Record delivery if eventKey is provided
      if (notification.eventKey) {
        // Import notification service dynamically to avoid circular imports
        import('@/services/NotificationService').then(({ notificationService }) => {
          notificationService.recordNotificationDelivery(
            notification.eventKey,
            notification.deliveryChannel || 'in_app',
            'delivered'
          );
        });
      }
    },
    [playNotificationSound, removeNotification, lastNotificationTime]
  );

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((event: NotificationEvent) => {
      addNotification(event);
    });

    return () => {
      unsubscribe();
    };
  }, [addNotification]);

  const icons: Record<string, React.ReactNode> = {
    new_signal: <Bell className="w-5 h-5 text-blue-400" />,
    tp_hit: <Target className="w-5 h-5 text-emerald-400" />,
    trade_activated: <Rocket className="w-5 h-5 text-purple-400" />,
    trade_closed: <CheckCircle className="w-5 h-5 text-green-400" />,
    stop_loss: <XCircle className="w-5 h-5 text-red-400" />,
    economic_event: <Calendar className="w-5 h-5 text-orange-400" />,
    error: <AlertCircle className="w-5 h-5 text-red-400" />,
  };

  const colors: Record<string, string> = {
    new_signal: "border-blue-500 bg-blue-500/10",
    tp_hit: "border-emerald-500 bg-emerald-500/10",
    trade_activated: "border-purple-500 bg-purple-500/10",
    trade_closed: "border-green-500 bg-green-500/10",
    stop_loss: "border-red-500 bg-red-500/10",
    economic_event: "border-orange-500 bg-orange-500/10",
    error: "border-red-500 bg-red-500/10",
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <Card
              className={`${
                colors[notification.type] ||
                "border-yellow-500 bg-yellow-500/10"
              } border-2 shadow-lg backdrop-blur-sm bg-gray-900/80`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1">
                      {icons[notification.type] || (
                        <TrendingUp className="w-5 h-5 text-yellow-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white text-sm">
                        {notification.title}
                      </h4>
                      <p className="text-gray-300 text-xs mt-1">
                        {notification.message}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {notification.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNotification(notification.id)}
                    className="text-gray-400 hover:text-white p-1 h-auto"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default NotificationSystem;
