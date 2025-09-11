import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { notificationService, NotificationBadgeState } from '@/services/NotificationService';

interface NotificationBadgeProps {
  className?: string;
  onClick?: () => void;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ className, onClick }) => {
  const [badgeState, setBadgeState] = useState<NotificationBadgeState>({
    unreadCount: 0,
    lastCheckedAt: null,
    hasNewAlerts: false
  });

  useEffect(() => {
    const unsubscribe = notificationService.subscribeToBadgeUpdates(setBadgeState);
    return unsubscribe;
  }, []);

  const handleClick = () => {
    notificationService.markAsChecked();
    onClick?.();
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={`relative ${className}`}
      onClick={handleClick}
    >
      <Bell className="h-5 w-5" />
      
      {badgeState.unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
          {badgeState.unreadCount > 99 ? '99+' : badgeState.unreadCount}
        </span>
      )}
      
      {badgeState.hasNewAlerts && badgeState.unreadCount === 0 && (
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500" />
      )}
    </Button>
  );
};

export default NotificationBadge;