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
  DollarSign,
  StopCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Enhanced notification interface for all signal events
interface SignalNotification {
  id: string;
  type: 'signal_created' | 'signal_updated' | 'tp_hit' | 'stop_loss_hit' | 'limit_activated' | 'limit_cancelled' | 'manual_close' | 'notes_updated' | 'all_tps_hit';
  title: string;
  message: string;
  timestamp: Date;
  signalId: string;
  assetName: string;
  authorName: string;
  eventKey?: string;
  deliveryChannel?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  autoRemove: boolean;
}

const InAppNotificationSystem = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SignalNotification[]>([]);
  const [lastNotificationTime, setLastNotificationTime] = useState<number>(0);

  const playNotificationSound = useCallback((priority: string) => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Different frequencies based on priority
    const frequencies: Record<string, number> = {
      critical: 1200, // Stop loss hits
      high: 1000,     // TP hits, limit activations
      medium: 800,    // New signals, manual closes
      low: 600,       // Notes updates
    };
    oscillator.frequency.value = frequencies[priority] || frequencies.medium;

    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioContext.currentTime + 0.6
    );

    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.6);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const addNotification = useCallback(
    (notification: Partial<SignalNotification>) => {
      const now = Date.now();
      const cooldown = 3000; // 3 seconds cooldown to prevent spam

      if (now - lastNotificationTime < cooldown) {
        console.warn("In-app notification suppressed due to cooldown.");
        return;
      }

      // Enhanced notification deduplication
      const notificationKey = notification.eventKey || `${notification.signalId}:${notification.type}:${notification.title}`;
      const lastShownTime = (window as any).lastInAppNotifications?.get(notificationKey) || 0;
      if (now - lastShownTime < 60000) { // 1 minute deduplication
        console.warn("In-app notification suppressed due to deduplication:", notificationKey);
        return;
      }
      
      // Initialize or update deduplication map
      if (!(window as any).lastInAppNotifications) {
        (window as any).lastInAppNotifications = new Map();
      }
      (window as any).lastInAppNotifications.set(notificationKey, now);

      setLastNotificationTime(now);

      const id = `${Date.now()}-${Math.random()}`;
      const enhancedNotification: SignalNotification = {
        id,
        type: notification.type || 'signal_updated',
        title: notification.title || 'Trading Alert',
        message: notification.message || '',
        timestamp: new Date(),
        signalId: notification.signalId || '',
        assetName: notification.assetName || '',
        authorName: notification.authorName || 'Imperial Trading',
        eventKey: notification.eventKey,
        deliveryChannel: 'in_app',
        priority: notification.priority || 'medium',
        autoRemove: notification.autoRemove !== false, // Default to auto-remove
      };
      
      setNotifications((prev) => [enhancedNotification, ...prev.slice(0, 4)]); // Keep only 5 notifications max
      
      // Auto-remove based on priority
      const autoRemoveDelay = {
        critical: 12000, // 12 seconds for critical alerts
        high: 10000,     // 10 seconds for important alerts
        medium: 8000,    // 8 seconds for standard alerts
        low: 6000,       // 6 seconds for minor updates
      }[enhancedNotification.priority];
      
      if (enhancedNotification.autoRemove) {
        setTimeout(() => removeNotification(id), autoRemoveDelay);
      }
      
      playNotificationSound(enhancedNotification.priority);

      // Record delivery tracking
      if (notification.eventKey && user?.id) {
        supabase
          .from('notification_delivery_log')
          .insert({
            user_id: user.id,
            signal_id: notification.signalId,
            notification_type: notification.type || 'signal_updated',
            delivery_channel: 'in_app',
            status: 'delivered',
            event_key: notification.eventKey,
            delivered_at: new Date().toISOString(),
            metadata: {
              asset_name: notification.assetName,
              author_name: notification.authorName,
              priority: notification.priority
            }
          })
          .then(({ error }) => {
            if (error) console.warn('Failed to log notification delivery:', error);
          });
      }
    },
    [playNotificationSound, removeNotification, lastNotificationTime, user?.id]
  );

  // Set up real-time listener for signal notifications
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔔 Setting up in-app notification listeners');

    const channel = supabase
      .channel('instant-alerts')
      .on('broadcast', { event: 'signal_notification' }, (payload) => {
        console.log('🚨 Received signal notification:', payload);
        
        const data = payload.payload;
        if (!data) return;

        // Map notification types to our enhanced system
        let type: SignalNotification['type'] = 'signal_updated';
        let title = '';
        let message = '';
        let priority: SignalNotification['priority'] = 'medium';

        switch (data.notification_type) {
          case 'signal_created':
            type = 'signal_created';
            title = `🚨 New ${data.trade_type?.toUpperCase()} Signal`;
            message = `${data.author_name} posted ${data.asset_name} at $${data.entry_price}`;
            priority = 'high';
            break;
          case 'tp_hit':
          case 'take_profit_hit':
            type = 'tp_hit';
            title = `🎯 Take Profit Hit - ${data.asset_name}`;
            message = `TP ${data.tp_hits?.[data.tp_hits.length - 1]} reached at $${data.triggered_price || data.target_price}`;
            priority = 'high';
            break;
          case 'stop_loss_hit':
            type = 'stop_loss_hit';
            title = `🔴 Stop Loss Hit - ${data.asset_name}`;
            message = `Stop loss triggered at $${data.triggered_price || data.target_price}`;
            priority = 'critical';
            break;
          case 'limit_activated':
            type = 'limit_activated';
            title = `✅ Limit Order Activated - ${data.asset_name}`;
            message = `${data.trade_type?.replace('_', ' ')?.toUpperCase()} order activated at $${data.entry_price}`;
            priority = 'high';
            break;
          case 'limit_cancelled':
            type = 'limit_cancelled';
            title = `❌ Limit Order Cancelled - ${data.asset_name}`;
            message = `${data.trade_type?.replace('_', ' ')?.toUpperCase()} order cancelled by ${data.author_name}`;
            priority = 'medium';
            break;
          case 'manual_close':
            type = 'manual_close';
            title = `🔒 Signal Manually Closed - ${data.asset_name}`;
            message = `${data.author_name} manually closed the signal`;
            priority = 'medium';
            break;
          case 'notes_updated':
            type = 'notes_updated';
            title = `📝 Notes Updated - ${data.asset_name}`;
            message = `${data.author_name} updated signal notes`;
            priority = 'low';
            break;
          case 'all_tps_hit':
            type = 'all_tps_hit';
            title = `🎉 All Take Profits Hit - ${data.asset_name}`;
            message = `Trade completed successfully by ${data.author_name}`;
            priority = 'high';
            break;
          default:
            title = `📊 Signal Update - ${data.asset_name}`;
            message = `${data.author_name} updated the signal`;
            priority = 'medium';
        }

        addNotification({
          type,
          title,
          message,
          signalId: data.signal_id,
          assetName: data.asset_name,
          authorName: data.author_name,
          eventKey: data.event_key,
          priority,
        });
      })
      .subscribe();

    // Also listen for custom signal events
    const handleSignalPosted = () => {
      addNotification({
        type: 'signal_created',
        title: '🚨 New Signal Posted',
        message: 'A new trading signal has been created',
        signalId: '',
        assetName: '',
        authorName: 'Educator',
        priority: 'high',
      });
    };

    window.addEventListener('signal-posted', handleSignalPosted);

    // Expose the addNotification function globally for compatibility
    (window as any).addNotification = addNotification;

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('signal-posted', handleSignalPosted);
      delete (window as any).addNotification;
    };
  }, [user?.id, addNotification]);

  const icons: Record<string, React.ReactNode> = {
    signal_created: <Bell className="w-5 h-5 text-blue-400" />,
    signal_updated: <TrendingUp className="w-5 h-5 text-yellow-400" />,
    tp_hit: <Target className="w-5 h-5 text-green-400" />,
    stop_loss_hit: <XCircle className="w-5 h-5 text-red-400" />,
    limit_activated: <Rocket className="w-5 h-5 text-purple-400" />,
    limit_cancelled: <StopCircle className="w-5 h-5 text-orange-400" />,
    manual_close: <CheckCircle className="w-5 h-5 text-blue-400" />,
    notes_updated: <AlertCircle className="w-5 h-5 text-gray-400" />,
    all_tps_hit: <DollarSign className="w-5 h-5 text-gold-400" />,
  };

  const colors: Record<string, string> = {
    signal_created: "border-blue-500 bg-blue-500/10",
    signal_updated: "border-yellow-500 bg-yellow-500/10", 
    tp_hit: "border-green-500 bg-green-500/10",
    stop_loss_hit: "border-red-500 bg-red-500/10",
    limit_activated: "border-purple-500 bg-purple-500/10",
    limit_cancelled: "border-orange-500 bg-orange-500/10",
    manual_close: "border-blue-500 bg-blue-500/10",
    notes_updated: "border-gray-500 bg-gray-500/10",
    all_tps_hit: "border-gold-500 bg-gold-500/10",
  };

  const priorityGlow: Record<string, string> = {
    critical: "shadow-lg shadow-red-500/20 ring-1 ring-red-500/30",
    high: "shadow-lg shadow-blue-500/20 ring-1 ring-blue-500/30", 
    medium: "shadow-md shadow-gray-500/10",
    low: "shadow-sm",
  };

  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 400, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 400, scale: 0.8, transition: { duration: 0.2 } }}
            transition={{ 
              type: "spring", 
              stiffness: 400, 
              damping: 25,
              mass: 0.8
            }}
            className="pointer-events-auto"
          >
            <Card
              className={`${
                colors[notification.type] || "border-gray-500 bg-gray-500/10"
              } ${priorityGlow[notification.priority]} border-2 backdrop-blur-md bg-background/90 hover:bg-background/95 transition-all duration-200`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="mt-1 flex-shrink-0">
                      {icons[notification.type] || (
                        <TrendingUp className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground text-sm leading-tight">
                        {notification.title}
                      </h4>
                      <p className="text-muted-foreground text-xs mt-1 leading-snug">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <p className="text-muted-foreground/80 text-xs">
                          {notification.timestamp.toLocaleTimeString()}
                        </p>
                        {notification.priority === 'critical' && (
                          <span className="text-red-400 text-xs font-medium">URGENT</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeNotification(notification.id)}
                    className="text-muted-foreground hover:text-foreground p-1 h-auto flex-shrink-0 ml-2"
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

export default InAppNotificationSystem;