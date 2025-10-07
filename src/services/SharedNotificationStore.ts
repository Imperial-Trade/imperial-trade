export interface SignalNotification {
  id: string;
  type: 'signal_created' | 'tp_hit' | 'stop_loss_hit' | 'limit_activated' | 'limit_cancelled' | 'manual_close' | 'notes_updated' | 'all_tps_hit' | 'signal_updated';
  message: string;
  timestamp: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  isRead?: boolean;
}

type NotificationListener = (notifications: SignalNotification[]) => void;

class SharedNotificationStore {
  private notifications: SignalNotification[] = [];
  private listeners: Set<NotificationListener> = new Set();
  private maxNotifications = 50; // Keep last 50 notifications

  addNotification(notification: SignalNotification) {
    // Add to beginning of array (newest first)
    this.notifications = [
      { ...notification, isRead: false },
      ...this.notifications
    ].slice(0, this.maxNotifications);
    
    this.notifyListeners();
  }

  removeNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.notifyListeners();
  }

  markAsRead(id: string) {
    this.notifications = this.notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    );
    this.notifyListeners();
  }

  markAllAsRead() {
    this.notifications = this.notifications.map(n => ({ ...n, isRead: true }));
    this.notifyListeners();
  }

  getNotifications(): SignalNotification[] {
    return [...this.notifications];
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.isRead).length;
  }

  subscribe(callback: NotificationListener) {
    this.listeners.add(callback);
    // Immediately call with current state
    callback(this.getNotifications());
    
    return () => this.unsubscribe(callback);
  }

  unsubscribe(callback: NotificationListener) {
    this.listeners.delete(callback);
  }

  private notifyListeners() {
    const currentNotifications = this.getNotifications();
    this.listeners.forEach(listener => listener(currentNotifications));
  }

  clearAll() {
    this.notifications = [];
    this.notifyListeners();
  }
}

// Export singleton instance
export const notificationStore = new SharedNotificationStore();
