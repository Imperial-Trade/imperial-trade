
import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { cn } from '@/lib/utils';

interface ConnectionStatusProps {
  className?: string;
  showText?: boolean;
}

export function ConnectionStatus({ className, showText = true }: ConnectionStatusProps) {
  const { status, isOnline, lastOnline } = useConnectionStatus();

  const getStatusConfig = () => {
    switch (status) {
      case 'online':
        return {
          icon: Wifi,
          text: 'Online',
          className: 'text-green-500',
          bgClassName: 'bg-green-500/10'
        };
      case 'offline':
        return {
          icon: WifiOff,
          text: 'Offline',
          className: 'text-red-500',
          bgClassName: 'bg-red-500/10'
        };
      case 'checking':
        return {
          icon: AlertCircle,
          text: 'Checking...',
          className: 'text-yellow-500',
          bgClassName: 'bg-yellow-500/10'
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  if (isOnline && !showText) {
    return null; // Don't show when online and text is disabled
  }

  return (
    <div className={cn(
      'flex items-center gap-2 px-3 py-1.5 rounded-full transition-all',
      config.bgClassName,
      className
    )}>
      <Icon className={cn('w-4 h-4', config.className)} />
      {showText && (
        <span className={cn('text-sm font-medium', config.className)}>
          {config.text}
        </span>
      )}
      {status === 'offline' && lastOnline && showText && (
        <span className="text-xs text-muted-foreground ml-1">
          (Last seen: {lastOnline.toLocaleTimeString()})
        </span>
      )}
    </div>
  );
}
