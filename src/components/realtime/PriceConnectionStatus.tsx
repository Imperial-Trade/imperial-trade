import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';

export const PriceConnectionStatus: React.FC = () => {
  const { connectionStatus, error } = useOptimizedWebSocketPrices();

  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          label: 'Real-Time Data',
          variant: 'default' as const,
          description: 'Connected to live price feed'
        };
      case 'connecting':
        return {
          label: 'Connecting...',
          variant: 'secondary' as const,
          description: 'Establishing real-time connection'
        };
      case 'error':
        return {
          label: 'Connection Error',
          variant: 'destructive' as const,
          description: error || 'Failed to connect to live data'
        };
      default:
        return {
          label: 'No Data',
          variant: 'outline' as const,
          description: 'No real-time connection established'
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="flex items-center gap-2">
      <Badge variant={status.variant}>
        {status.label}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {status.description}
      </span>
    </div>
  );
};