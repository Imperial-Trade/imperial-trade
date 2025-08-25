
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RealtimeConnectionStatusProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastUpdated?: Date | null;
  nextRetryAt?: number | null;
  className?: string;
}

export const RealtimeConnectionStatus: React.FC<RealtimeConnectionStatusProps> = ({
  status,
  lastUpdated,
  nextRetryAt,
  className
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Live',
          variant: 'default' as const,
          className: 'bg-green-500/10 text-green-600 border-green-500/30 hover:bg-green-500/20'
        };
      case 'connecting':
        return {
          icon: Loader2,
          text: 'Connecting...',
          variant: 'secondary' as const,
          className: 'bg-amber-500/10 text-amber-600 border-amber-500/30 animate-pulse'
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Offline',
          variant: 'outline' as const,
          className: 'bg-muted/50 text-muted-foreground border-muted'
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Error',
          variant: 'destructive' as const,
          className: 'bg-red-500/10 text-red-600 border-red-500/30'
        };
      default:
        return {
          icon: WifiOff,
          text: 'Unknown',
          variant: 'outline' as const,
          className: 'bg-muted/50 text-muted-foreground'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const formatRetryTime = () => {
    if (!nextRetryAt) return '';
    const seconds = Math.ceil((nextRetryAt - Date.now()) / 1000);
    return seconds > 0 ? ` (${seconds}s)` : '';
  };

  return (
    <Badge 
      variant={config.variant}
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium px-2 py-1",
        config.className,
        className
      )}
    >
      <Icon className={cn(
        "w-3 h-3",
        status === 'connecting' && "animate-spin"
      )} />
      <span>
        {config.text}
        {status === 'connecting' && nextRetryAt && formatRetryTime()}
      </span>
      {lastUpdated && status === 'connected' && (
        <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
      )}
    </Badge>
  );
};
