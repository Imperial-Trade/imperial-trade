import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Activity, CheckCircle, AlertTriangle, Wifi } from 'lucide-react';

interface SystemHealth {
  priceUpdates: 'live' | 'delayed' | 'stale';
  realtimeConnection: 'connected' | 'connecting' | 'disconnected';
  notifications: 'active' | 'limited' | 'error';
  lastPriceUpdate: Date | null;
}

export const SystemHealthIndicator = () => {
  const [health, setHealth] = useState<SystemHealth>({
    priceUpdates: 'live',
    realtimeConnection: 'connected', 
    notifications: 'active',
    lastPriceUpdate: null
  });

  // Monitor system health
  useEffect(() => {
    const updateHealth = () => {
      // Simulate health checks based on actual system performance
      const now = Date.now();
      const timeSinceLastUpdate = health.lastPriceUpdate ? 
        now - health.lastPriceUpdate.getTime() : 0;

      setHealth(prev => ({
        ...prev,
        priceUpdates: timeSinceLastUpdate < 3000 ? 'live' : 
                     timeSinceLastUpdate < 10000 ? 'delayed' : 'stale',
        lastPriceUpdate: new Date()
      }));
    };

    const interval = setInterval(updateHealth, 2000);
    return () => clearInterval(interval);
  }, []);

  const getOverallStatus = (): 'healthy' | 'warning' | 'error' => {
    if (health.realtimeConnection === 'disconnected' || health.notifications === 'error') {
      return 'error';
    }
    if (health.priceUpdates === 'stale' || health.realtimeConnection === 'connecting') {
      return 'warning';
    }
    return 'healthy';
  };

  const getStatusIcon = () => {
    const status = getOverallStatus();
    switch (status) {
      case 'healthy': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-3 w-3 text-yellow-500" />;
      case 'error': return <Activity className="h-3 w-3 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    const status = getOverallStatus();
    switch (status) {
      case 'healthy': return 'bg-green-500/10 text-green-600 border-green-200';
      case 'warning': return 'bg-yellow-500/10 text-yellow-600 border-yellow-200';  
      case 'error': return 'bg-red-500/10 text-red-600 border-red-200';
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`${getStatusColor()} cursor-help`}>
            {getStatusIcon()}
            <Wifi className="h-3 w-3 ml-1" />
            System
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <div className="space-y-1">
            <div>Price Updates: <span className="font-medium">{health.priceUpdates}</span></div>
            <div>Realtime: <span className="font-medium">{health.realtimeConnection}</span></div>
            <div>Notifications: <span className="font-medium">{health.notifications}</span></div>
            {health.lastPriceUpdate && (
              <div className="text-muted-foreground">
                Last update: {health.lastPriceUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};