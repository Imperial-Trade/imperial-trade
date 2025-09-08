import React from 'react';
import { Badge } from '@/components/ui/badge';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { useFallbackPrices } from '@/contexts/FallbackPriceContext';

export const PriceConnectionStatus: React.FC = () => {
  const { connectionStatus, error } = useOptimizedWebSocketPrices();
  const { isActive: fallbackActive } = useFallbackPrices();

  const getStatusDisplay = () => {
    if (fallbackActive) {
      return {
        label: 'Mock Data Active',
        variant: 'secondary' as const,
        description: 'Using fallback price generation'
      };
    }
    
    switch (connectionStatus) {
      case 'connected':
        return {
          label: 'Live Prices',
          variant: 'default' as const,
          description: 'Connected to real-time data'
        };
      case 'connecting':
        return {
          label: 'Connecting...',
          variant: 'secondary' as const,
          description: 'Establishing connection'
        };
      case 'error':
        return {
          label: 'Connection Error',
          variant: 'destructive' as const,
          description: error || 'Failed to connect'
        };
      default:
        return {
          label: 'Disconnected',
          variant: 'outline' as const,
          description: 'No connection established'
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