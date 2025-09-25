import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSignalRealtime } from '@/contexts/SignalRealtimeContext';

interface SignalStreamHealthMonitorProps {
  className?: string;
}

const SignalStreamHealthMonitor: React.FC<SignalStreamHealthMonitorProps> = ({ className }) => {
  const { connectionStatus, lastUpdated, error } = useSignalRealtime();

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'bg-success text-success-foreground';
      case 'connecting':
        return 'bg-warning text-warning-foreground';
      case 'disconnected':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastUpdated.getTime();
    const seconds = Math.floor(diff / 1000);
    
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    return `${Math.floor(seconds / 3600)}h ago`;
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">System Health</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span>Connection:</span>
          <Badge className={getStatusColor()}>
            {connectionStatus}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-xs">
          <span>Last Update:</span>
          <span className="text-muted-foreground">
            {formatLastUpdated()}
          </span>
        </div>
        
        {error && (
          <div className="text-xs">
            <span className="text-destructive">Error:</span>
            <p className="text-muted-foreground truncate">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SignalStreamHealthMonitor;