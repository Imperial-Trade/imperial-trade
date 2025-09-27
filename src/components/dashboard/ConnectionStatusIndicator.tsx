import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, AlertTriangle, Clock } from 'lucide-react';

interface ConnectionStatusIndicatorProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error' | 'polling-fallback';
  priceConnectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string | null;
  lastUpdated?: Date | null;
  nextRetryAt?: number | null;
}

export default function ConnectionStatusIndicator({
  connectionStatus,
  priceConnectionStatus,
  error,
  lastUpdated,
  nextRetryAt
}: ConnectionStatusIndicatorProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4" />;
      case 'disconnected':
      case 'error':
        return <WifiOff className="h-4 w-4" />;
      case 'connecting':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'connected':
        return 'default' as const;
      case 'disconnected':
      case 'error':
        return 'destructive' as const;
      case 'connecting':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  const formatTime = (date?: Date | null) => {
    if (!date) return 'Never';
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(date);
  };

  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(connectionStatus)} className="flex items-center gap-1">
                {getStatusIcon(connectionStatus)}
                Signal Stream: {connectionStatus.replace('-', ' ').replace('_', ' ')}
              </Badge>
            </div>
            
            {priceConnectionStatus && (
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(priceConnectionStatus)} className="flex items-center gap-1">
                  {getStatusIcon(priceConnectionStatus)}
                  Live Prices: {priceConnectionStatus}
                </Badge>
              </div>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            Last updated: {formatTime(lastUpdated)}
          </div>
        </div>

        {error && (
          <div className="mt-2 text-sm text-destructive">
            {error}
          </div>
        )}

        {nextRetryAt && nextRetryAt > Date.now() && (
          <div className="mt-2 text-sm text-muted-foreground">
            Next retry: {formatTime(new Date(nextRetryAt))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}