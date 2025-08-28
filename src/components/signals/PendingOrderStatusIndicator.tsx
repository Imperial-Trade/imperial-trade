
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import { usePendingOrderMonitor } from '@/hooks/usePendingOrderMonitor';

export const PendingOrderStatusIndicator: React.FC = () => {
  const { stats, loading } = usePendingOrderMonitor();

  if (loading) {
    return (
      <Badge variant="outline" className="animate-pulse">
        <Clock className="h-3 w-3 mr-1" />
        Loading...
      </Badge>
    );
  }

  const getStatusIcon = () => {
    switch (stats.healthStatus) {
      case 'healthy':
        return <CheckCircle className="h-3 w-3 mr-1 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-3 w-3 mr-1 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-3 w-3 mr-1 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (stats.healthStatus) {
      case 'healthy':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'error':
        return 'destructive';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={getStatusColor()}>
        {getStatusIcon()}
        {stats.totalPending} Pending
      </Badge>
      
      {stats.recentlyActivated > 0 && (
        <Badge variant="outline">
          <Zap className="h-3 w-3 mr-1 text-blue-500" />
          {stats.recentlyActivated} Activated (24h)
        </Badge>
      )}
      
      {stats.averageWaitTime > 0 && (
        <Badge variant="outline">
          <Clock className="h-3 w-3 mr-1" />
          ~{stats.averageWaitTime}min avg
        </Badge>
      )}
    </div>
  );
};
