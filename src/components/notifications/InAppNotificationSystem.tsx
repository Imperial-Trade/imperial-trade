import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, TrendingUp, TrendingDown, AlertCircle, CheckCircle, XCircle, Target, Rocket } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// FIX #5: Notification Queue Class for first-come-first-serve with 5-second delays
class NotificationQueue {
  private queue: SignalNotification[] = [];
  private isProcessing = false;
  private onShow: (notification: SignalNotification) => void;
  private onRemove: (id: string) => void;
  private playSound: (priority: string) => void;
  
  constructor(
    onShow: (n: SignalNotification) => void, 
    onRemove: (id: string) => void,
    playSound: (priority: string) => void
  ) {
    this.onShow = onShow;
    this.onRemove = onRemove;
    this.playSound = playSound;
  }
  
  add(notification: SignalNotification) {
    // Check for duplicates
    const isDuplicate = this.queue.some(n => 
      n.signalId === notification.signalId && 
      n.type === notification.type &&
      Math.abs(new Date(n.timestamp).getTime() - new Date(notification.timestamp).getTime()) < 10000
    );
    
    if (isDuplicate) {
      console.log('🚫 Duplicate notification blocked:', notification.title);
      return;
    }
    
    this.queue.push(notification);
    console.log(`📥 Added to queue: ${notification.title} (Queue size: ${this.queue.length})`);
    
    if (!this.isProcessing) {
      this.processNext();
    }
  }
  
  private async processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      console.log('✅ Notification queue empty');
      return;
    }
    
    this.isProcessing = true;
    const notification = this.queue.shift()!;
    
    console.log(`🔔 Processing notification: ${notification.title}`);
    
    // FIX #7: Play sound BEFORE showing notification
    this.playSound(notification.priority);
    
    // Show notification
    this.onShow(notification);
    
    // Wait 5 seconds
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Remove notification
    this.onRemove(notification.id);
    
    // Process next
    this.processNext();
  }
  
  clear() {
    this.queue = [];
    this.isProcessing = false;
  }
}

export interface SignalNotification {
  id: string;
  type: 'signal_created' | 'limit_order_activated' | 'tp_hit' | 'multiple_tps_hit' | 'stop_loss_hit' | 'signal_closed' | 'signal_updated' | 'manual_close' | 'all_tps_hit';
  title: string;
  message: string;
  signalId?: string;
  assetName?: string;
  authorName?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  autoRemove: boolean;
}

const InAppNotificationSystem = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<SignalNotification[]>([]);
  const lastNotificationTimeRef = useRef<{ [key: string]: number }>({});
  
  // FIX #5: Initialize notification queue
  const notificationQueueRef = useRef<NotificationQueue | null>(null);
  
  // FIX #7: Sound system
  const playNotificationSound = useCallback((priority: string) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Different frequencies for different priorities
      if (priority === 'critical' || priority === 'high') {
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.3;
      } else if (priority === 'medium') {
        oscillator.frequency.value = 600;
        gainNode.gain.value = 0.2;
      } else {
        oscillator.frequency.value = 400;
        gainNode.gain.value = 0.1;
      }
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.15);
      
      console.log(`🔊 Sound played for ${priority} priority notification`);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }, []);
  
  // Initialize queue on mount
  useEffect(() => {
    notificationQueueRef.current = new NotificationQueue(
      (notification) => setNotifications(prev => [notification, ...prev.slice(0, 4)]),
      (id) => setNotifications(prev => prev.filter(n => n.id !== id)),
      playNotificationSound
    );
    
    return () => {
      notificationQueueRef.current?.clear();
    };
  }, [playNotificationSound]);
  
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);
  
  // FIX #2 & #4: Improved addNotification with real author names
  const addNotification = useCallback((notification: Partial<SignalNotification>) => {
    const now = Date.now();
    
    // FIX #2: No cooldown for signal_created - each new signal should always notify
    if (notification.type !== 'signal_created') {
      const cooldownKey = `${notification.signalId}-${notification.type}`;
      const lastTime = lastNotificationTimeRef.current[cooldownKey] || 0;
      
      // 10-second cooldown for same signal + type (except signal_created)
      if (now - lastTime < 10000) {
        console.log('🚫 Notification blocked by cooldown:', notification.title);
        return;
      }
      
      lastNotificationTimeRef.current[cooldownKey] = now;
    } else {
      console.log('✅ Signal created - bypassing cooldown for new signal');
    }
    
    // FIX #4: Improved author name handling - fetch from signal context if available
    let authorName = notification.authorName || 'Unknown Trader';
    
    // Try to get real author name from signals context if notification doesn't have it
    if (authorName === 'Unknown Trader' || authorName === 'Provider') {
      try {
        // Access signals from SignalRealtimeContext if available via window
        const signalFromContext = (window as any).__signalsCache?.find((s: any) => s.id === notification.signalId);
        if (signalFromContext?.profiles?.display_name) {
          authorName = signalFromContext.profiles.display_name;
          console.log('✅ Fetched author name from context:', authorName);
        } else {
          authorName = 'Signal Provider'; // Generic fallback
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch author from context:', error);
        authorName = 'Signal Provider';
      }
    }
    
    const enhancedNotification: SignalNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: notification.type || 'signal_updated',
      title: notification.title || '🔔 New Signal',
      message: notification.message || 'Signal update',
      signalId: notification.signalId,
      assetName: notification.assetName || 'Asset',
      authorName: authorName,
      priority: notification.priority || 'medium',
      timestamp: new Date().toISOString(),
      autoRemove: notification.autoRemove !== false,
    };
    
    console.log('📬 Adding notification to queue:', {
      title: enhancedNotification.title,
      author: enhancedNotification.authorName,
      asset: enhancedNotification.assetName,
      type: enhancedNotification.type
    });
    
    // FIX #5: Add to queue instead of showing immediately
    notificationQueueRef.current?.add(enhancedNotification);
  }, []);
  
  // Subscribe to Supabase real-time notifications
  useEffect(() => {
    if (!user?.id) return;
    
    console.log('🔌 InAppNotificationSystem: Subscribing to signal notifications');
    
    const channel = supabase
      .channel('signal_notification')
      .on('broadcast', { event: 'signal_notification' }, (payload) => {
        console.log('📡 Received signal notification:', payload);
        
        if (payload.payload) {
          addNotification({
            type: payload.payload.notification_type || 'signal_updated',
            title: payload.payload.title || '🔔 Signal Update',
            message: payload.payload.message || payload.payload.body || 'New signal activity',
            signalId: payload.payload.signal_id,
            assetName: payload.payload.asset_name,
            authorName: payload.payload.author_name,
            priority: payload.payload.priority_level === 3 ? 'critical' : 
                     payload.payload.priority_level === 2 ? 'high' : 'medium',
            autoRemove: true
          });
        }
      })
      .subscribe();
    
    return () => {
      console.log('🔌 InAppNotificationSystem: Unsubscribing from signal notifications');
      supabase.removeChannel(channel);
    };
  }, [user?.id, addNotification]);
  
  // Listen for custom signal-posted events
  useEffect(() => {
    const handleSignalPosted = (event: CustomEvent) => {
      console.log('📡 signal-posted event received:', event.detail);
      addNotification(event.detail);
    };
    
    window.addEventListener('signal-posted', handleSignalPosted as EventListener);
    
    return () => {
      window.removeEventListener('signal-posted', handleSignalPosted as EventListener);
    };
  }, [addNotification]);
  
  // Expose addNotification globally
  useEffect(() => {
    (window as any).addNotification = addNotification;
    
    return () => {
      delete (window as any).addNotification;
    };
  }, [addNotification]);
  
  const icons = {
    signal_created: Bell,
    limit_order_activated: Rocket,
    tp_hit: Target,
    multiple_tps_hit: Target,
    stop_loss_hit: XCircle,
    signal_closed: AlertCircle,
    signal_updated: TrendingUp,
    manual_close: CheckCircle,
    all_tps_hit: CheckCircle,
  };
  
  const colors = {
    signal_created: 'border-blue-500 bg-blue-500/10',
    limit_order_activated: 'border-purple-500 bg-purple-500/10',
    tp_hit: 'border-green-500 bg-green-500/10',
    multiple_tps_hit: 'border-green-500 bg-green-500/10',
    stop_loss_hit: 'border-red-500 bg-red-500/10',
    signal_closed: 'border-yellow-500 bg-yellow-500/10',
    signal_updated: 'border-blue-500 bg-blue-500/10',
    manual_close: 'border-blue-500 bg-blue-500/10',
    all_tps_hit: 'border-green-500 bg-green-500/10',
  };
  
  const priorityGlow = {
    critical: 'shadow-lg shadow-red-500/50 ring-2 ring-red-500/30',
    high: 'shadow-md shadow-blue-500/30 ring-1 ring-blue-500/20',
    medium: 'shadow-sm',
    low: 'shadow-sm',
  };
  
  return (
    <div className="fixed top-20 right-4 z-[100] space-y-3 max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {notifications.map((notification) => {
          const Icon = icons[notification.type] || Bell;
          const colorClass = colors[notification.type] || colors.signal_updated;
          const glowClass = priorityGlow[notification.priority];
          
          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              className={`${colorClass} ${glowClass} backdrop-blur-lg border-2 rounded-xl p-4 pointer-events-auto relative overflow-hidden`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-sm mb-1 truncate">{notification.title}</h4>
                  <p className="text-xs opacity-80 line-clamp-2">{notification.message}</p>
                  {notification.authorName && (
                    <p className="text-xs opacity-60 mt-1">by {notification.authorName}</p>
                  )}
                  <p className="text-xs opacity-40 mt-1">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
                
                <button
                  onClick={() => removeNotification(notification.id)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              {/* Auto-remove progress bar */}
              {notification.autoRemove && (
                <motion.div
                  className="absolute bottom-0 left-0 h-1 bg-current opacity-30"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 5, ease: 'linear' }}
                />
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default InAppNotificationSystem;
