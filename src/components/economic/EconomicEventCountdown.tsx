import React, { useState, useEffect } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EconomicEvent } from '@/services/EconomicCalendarService';

interface EconomicEventCountdownProps {
  event: EconomicEvent;
  showIcon?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

export const EconomicEventCountdown: React.FC<EconomicEventCountdownProps> = ({
  event,
  showIcon = true,
  variant = 'default'
}) => {
  const [timeUntil, setTimeUntil] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isLive: boolean;
    isPast: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isLive: false,
    isPast: false
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const eventDate = new Date(`${event.date} ${event.time}`);
      const diffMs = eventDate.getTime() - now.getTime();

      if (diffMs < 0) {
        // Event has passed
        setTimeUntil({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isLive: false,
          isPast: true
        });
        return;
      }

      if (diffMs <= 60000) {
        // Event is live (within 1 minute)
        setTimeUntil({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: Math.floor(diffMs / 1000),
          isLive: true,
          isPast: false
        });
        return;
      }

      // Calculate time components
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setTimeUntil({
        days,
        hours,
        minutes,
        seconds,
        isLive: false,
        isPast: false
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [event.date, event.time]);

  const getDisplayText = () => {
    if (timeUntil.isPast) {
      return 'Completed';
    }

    if (timeUntil.isLive) {
      return 'LIVE NOW';
    }

    if (variant === 'compact') {
      if (timeUntil.days > 0) {
        return `${timeUntil.days}d ${timeUntil.hours}h`;
      }
      if (timeUntil.hours > 0) {
        return `${timeUntil.hours}h ${timeUntil.minutes}m`;
      }
      return `${timeUntil.minutes}m ${timeUntil.seconds}s`;
    }

    if (variant === 'detailed') {
      const parts = [];
      if (timeUntil.days > 0) parts.push(`${timeUntil.days} day${timeUntil.days !== 1 ? 's' : ''}`);
      if (timeUntil.hours > 0) parts.push(`${timeUntil.hours} hour${timeUntil.hours !== 1 ? 's' : ''}`);
      if (timeUntil.minutes > 0) parts.push(`${timeUntil.minutes} minute${timeUntil.minutes !== 1 ? 's' : ''}`);
      if (timeUntil.days === 0 && timeUntil.hours === 0) {
        parts.push(`${timeUntil.seconds} second${timeUntil.seconds !== 1 ? 's' : ''}`);
      }
      return parts.join(', ');
    }

    // Default variant
    if (timeUntil.days > 0) {
      return `${timeUntil.days}d ${timeUntil.hours}h ${timeUntil.minutes}m`;
    }
    if (timeUntil.hours > 0) {
      return `${timeUntil.hours}h ${timeUntil.minutes}m ${timeUntil.seconds}s`;
    }
    return `${timeUntil.minutes}m ${timeUntil.seconds}s`;
  };

  const getVariant = () => {
    if (timeUntil.isPast) {
      return 'secondary';
    }
    if (timeUntil.isLive) {
      return 'destructive';
    }
    if (timeUntil.days === 0 && timeUntil.hours === 0 && timeUntil.minutes <= 5) {
      return 'destructive';
    }
    if (timeUntil.days === 0 && timeUntil.hours === 0 && timeUntil.minutes <= 15) {
      return 'default';
    }
    return 'outline';
  };

  const getImpactColor = () => {
    switch (event.impact) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div className="flex items-center gap-2">
      {showIcon && (
        timeUntil.isLive ? (
          <AlertCircle className={`h-4 w-4 animate-pulse ${getImpactColor()}`} />
        ) : (
          <Clock className={`h-4 w-4 ${getImpactColor()}`} />
        )
      )}
      <Badge 
        variant={getVariant()}
        className={`
          font-mono text-xs
          ${timeUntil.isLive ? 'animate-pulse bg-red-500 text-white' : ''}
          ${timeUntil.days === 0 && timeUntil.hours === 0 && timeUntil.minutes <= 5 && !timeUntil.isLive ? 'bg-orange-500 text-white' : ''}
        `}
      >
        {getDisplayText()}
      </Badge>
    </div>
  );
};