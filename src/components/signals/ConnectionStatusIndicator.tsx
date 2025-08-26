
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Clock } from 'lucide-react';

interface ConnectionStatusIndicatorProps {
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected',
          variant: 'outline' as const,
          className: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20'
        };
      case 'connecting':
        return {
          icon: Clock,
          text: 'Connecting',
          variant: 'outline' as const,
          className: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20'
        };
      case 'disconnected':
      case 'error':
        return {
          icon: WifiOff,
          text: 'Disconnected',
          variant: 'outline' as const,
          className: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
        };
      default:
        return {
          icon: WifiOff,
          text: 'Unknown',
          variant: 'outline' as const,
          className: 'bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20'
        };
    }
  };

  const { icon: Icon, text, variant, className } = getStatusConfig();

  return (
    <Badge variant={variant} className={`${className} gap-1`}>
      <Icon className="h-3 w-3" />
      {text}
    </Badge>
  );
};
