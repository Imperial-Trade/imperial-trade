import React, { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface RealTimeIndicatorProps {
  lastUpdated?: string;
  isConnected?: boolean;
  isLoading?: boolean;
  nextUpdate?: string;
  className?: string;
}

const RealTimeIndicator = memo(({ 
  lastUpdated, 
  isConnected = true, 
  isLoading = false,
  nextUpdate,
  className = "" 
}: RealTimeIndicatorProps) => {
  
  const getStatusConfig = () => {
    if (isLoading) {
      return {
        icon: <RefreshCw className="w-3 h-3 animate-spin" />,
        text: 'Updating...',
        color: 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      };
    }
    
    if (!isConnected) {
      return {
        icon: <WifiOff className="w-3 h-3" />,
        text: 'Offline',
        color: 'text-red-400 bg-red-500/10 border-red-500/20'
      };
    }
    
    return {
      icon: <Wifi className="w-3 h-3" />,
      text: 'Live',
      color: 'text-green-400 bg-green-500/10 border-green-500/20'
    };
  };

  const formatLastUpdated = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const distance = formatDistanceToNow(date, { addSuffix: true });
      return distance.replace('about ', '').replace(' ago', '');
    } catch {
      return 'Unknown';
    }
  };

  const formatNextUpdate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = date.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes <= 0) return 'Soon';
      if (diffMinutes < 60) return `${diffMinutes}m`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      return `${diffHours}h ${diffMinutes % 60}m`;
    } catch {
      return 'Unknown';
    }
  };

  const status = getStatusConfig();

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {/* Connection Status */}
      <Badge className={`${status.color} border w-fit px-2 py-1`}>
        <div className="flex items-center gap-1.5">
          {status.icon}
          <span className="text-xs font-medium">{status.text}</span>
        </div>
      </Badge>

      {/* Timing Information */}
      <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
        {lastUpdated && (
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Updated {formatLastUpdated(lastUpdated)}</span>
          </div>
        )}
        
        {nextUpdate && isConnected && !isLoading && (
          <div className="flex items-center gap-1.5">
            <RefreshCw className="w-3 h-3" />
            <span>Next update in {formatNextUpdate(nextUpdate)}</span>
          </div>
        )}
      </div>
    </div>
  );
});

RealTimeIndicator.displayName = 'RealTimeIndicator';

export default RealTimeIndicator;