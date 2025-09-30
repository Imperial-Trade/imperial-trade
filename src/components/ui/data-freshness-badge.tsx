import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataFreshnessBadgeProps {
  lastUpdated: Date | null;
  thresholdSeconds?: number;
  className?: string;
  showIcon?: boolean;
  showTime?: boolean;
}

export function DataFreshnessBadge({ 
  lastUpdated, 
  thresholdSeconds = 5,
  className,
  showIcon = true,
  showTime = true
}: DataFreshnessBadgeProps) {
  const getAgeStatus = () => {
    if (!lastUpdated) {
      return {
        icon: XCircle,
        label: 'No Data',
        variant: 'outline' as const,
        className: 'text-muted-foreground'
      };
    }

    const ageSeconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);

    if (ageSeconds < thresholdSeconds) {
      return {
        icon: CheckCircle2,
        label: 'Live',
        time: 'just now',
        variant: 'default' as const,
        className: 'text-emerald-500'
      };
    }

    if (ageSeconds < 30) {
      return {
        icon: Clock,
        label: 'Fresh',
        time: `${ageSeconds}s ago`,
        variant: 'secondary' as const,
        className: 'text-green-500'
      };
    }

    if (ageSeconds < 60) {
      return {
        icon: AlertTriangle,
        label: 'Stale',
        time: `${ageSeconds}s ago`,
        variant: 'secondary' as const,
        className: 'text-amber-500'
      };
    }

    const minutes = Math.floor(ageSeconds / 60);
    return {
      icon: XCircle,
      label: 'Outdated',
      time: `${minutes}m ago`,
      variant: 'destructive' as const,
      className: 'text-destructive'
    };
  };

  const status = getAgeStatus();
  const Icon = status.icon;

  return (
    <Badge variant={status.variant} className={cn('gap-1.5', className)}>
      {showIcon && <Icon className={cn('w-3 h-3', status.className)} />}
      <span>{status.label}</span>
      {showTime && status.time && (
        <span className="text-xs opacity-70">({status.time})</span>
      )}
    </Badge>
  );
}
