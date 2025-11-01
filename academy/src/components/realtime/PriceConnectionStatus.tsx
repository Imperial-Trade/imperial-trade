import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { Database } from 'lucide-react';

export const PriceConnectionStatus: React.FC = () => {
  const { connectionStatus, error } = useOptimizedWebSocketPrices();
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Update last update time when connection status changes
  useEffect(() => {
    if (connectionStatus === 'connected') {
      setLastUpdate(new Date());
    }
  }, [connectionStatus]);

  // Update seconds counter every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdate.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [lastUpdate]);

  const getStatusDisplay = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          label: 'Database Polling (Live)',
          variant: 'default' as const,
          description: `500ms • Updated ${secondsAgo}s ago`
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
          label: 'No Data',
          variant: 'outline' as const,
          description: 'No connection established'
        };
    }
  };

  const status = getStatusDisplay();

  return (
    <div className="flex items-center gap-2">
      <Database className="w-4 h-4 text-primary" />
      <Badge variant={status.variant}>
        {status.label}
      </Badge>
      <span className="text-xs text-muted-foreground">
        {status.description}
      </span>
    </div>
  );
};