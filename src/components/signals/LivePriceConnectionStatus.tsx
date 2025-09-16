import React from 'react';
import { useOptimizedWebSocketPrices } from '@/contexts/OptimizedWebSocketPriceContext';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';

export const LivePriceConnectionStatus: React.FC = () => {
  const { connectionStatus, error, prices } = useOptimizedWebSocketPrices();
  
  const getStatusInfo = () => {
    switch (connectionStatus) {
      case 'connected':
        return {
          icon: <Wifi className="h-3 w-3" />,
          text: 'Live Prices Connected',
          variant: 'default' as const,
          className: 'bg-success text-success-foreground'
        };
      case 'connecting':
        return {
          icon: <Loader2 className="h-3 w-3" style={{ willChange: 'transform', transform: 'translateZ(0)' }} />,
          text: 'Connecting...',
          variant: 'secondary' as const,
          className: 'bg-warning text-warning-foreground'
        };
      case 'error':
        return {
          icon: <AlertTriangle className="h-3 w-3" />,
          text: error || 'Connection Error',
          variant: 'destructive' as const,
          className: 'bg-destructive text-destructive-foreground'
        };
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="h-3 w-3" />,
          text: 'Disconnected',
          variant: 'outline' as const,
          className: 'bg-muted text-muted-foreground'
        };
    }
  };

  const statusInfo = getStatusInfo();
  const activePricesCount = Object.keys(prices).length;

  return (
    <div className="flex items-center gap-2">
      <Badge variant={statusInfo.variant} className={`${statusInfo.className} flex items-center gap-1.5 px-2 py-1`}>
        {statusInfo.icon}
        <span className="text-xs font-medium">{statusInfo.text}</span>
      </Badge>
      
      {connectionStatus === 'connected' && activePricesCount > 0 && (
        <Badge variant="outline" className="text-xs">
          {activePricesCount} symbols
        </Badge>
      )}
      
      {error && connectionStatus === 'error' && (
        <div className="text-xs text-muted-foreground max-w-xs truncate" title={error}>
          {error}
        </div>
      )}
    </div>
  );
};