import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Signal, SignalHigh, SignalMedium, SignalLow } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectionQualityIndicatorProps {
  status: 'connected' | 'connecting' | 'disconnected' | 'error';
  quality?: 'excellent' | 'good' | 'poor' | 'offline';
  latency?: number;
  className?: string;
  showText?: boolean;
}

export function ConnectionQualityIndicator({ 
  status, 
  quality = 'good', 
  latency,
  className,
  showText = true 
}: ConnectionQualityIndicatorProps) {
  const getQualityConfig = () => {
    if (status === 'disconnected' || status === 'error') {
      return {
        icon: WifiOff,
        label: 'Offline',
        variant: 'destructive' as const,
        className: 'text-destructive'
      };
    }

    if (status === 'connecting') {
      return {
        icon: Signal,
        label: 'Connecting...',
        variant: 'secondary' as const,
        className: 'text-muted-foreground'
      };
    }

    switch (quality) {
      case 'excellent':
        return {
          icon: SignalHigh,
          label: 'Excellent',
          variant: 'default' as const,
          className: 'text-emerald-500'
        };
      case 'good':
        return {
          icon: SignalMedium,
          label: 'Good',
          variant: 'default' as const,
          className: 'text-green-500'
        };
      case 'poor':
        return {
          icon: SignalLow,
          label: 'Poor',
          variant: 'secondary' as const,
          className: 'text-amber-500'
        };
      case 'offline':
        return {
          icon: WifiOff,
          label: 'Offline',
          variant: 'destructive' as const,
          className: 'text-destructive'
        };
    }
  };

  const config = getQualityConfig();
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className={cn('gap-1.5', className)}>
      <Icon className={cn('w-3 h-3', config.className)} />
      {showText && <span>{config.label}</span>}
      {latency && status === 'connected' && (
        <span className="text-xs opacity-70">({latency}ms)</span>
      )}
    </Badge>
  );
}
