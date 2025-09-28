import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Activity, TrendingUp, DollarSign, RefreshCw } from 'lucide-react';
import { realtimeMessageRateMonitor } from '@/services/RealtimeMessageRateMonitor';
import { useMonitoringRouteGate } from '@/hooks/useMonitoringRouteGate';

interface RateMetrics {
  messagesPerMinute: number;
  messagesPerHour: number;
  peakRate: number;
  isExcessive: boolean;
  costEstimate: number;
}

interface MessageType {
  type: string;
  source: string;
  count: number;
  rate: number;
}

export const RealtimeRateMonitor: React.FC = () => {
  const { shouldEnableMonitoring, currentRoute } = useMonitoringRouteGate();
  
  const [metrics, setMetrics] = useState<RateMetrics>({
    messagesPerMinute: 0,
    messagesPerHour: 0,
    peakRate: 0,
    isExcessive: false,
    costEstimate: 0
  });
  const [topTypes, setTopTypes] = useState<MessageType[]>([]);
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const refreshMetrics = () => {
    try {
      const currentMetrics = realtimeMessageRateMonitor.getCurrentRate();
      const health = realtimeMessageRateMonitor.getHealthReport();
      const messageTypes = realtimeMessageRateMonitor.getTopMessageTypes(10);

      setMetrics(currentMetrics);
      setTopTypes(messageTypes);
      setHealthStatus(health.status);
      setRecommendations(health.recommendations);
    } catch (error) {
      console.error('Error refreshing realtime rate metrics:', error);
    }
  };

  useEffect(() => {
    if (!shouldEnableMonitoring) {
      console.log(`🚫 RealtimeRateMonitor: DISABLED on route: ${currentRoute}`);
      return;
    }
    
    // Initial load
    refreshMetrics();

    // Auto-refresh every 10 seconds
    const interval = setInterval(refreshMetrics, 10000);

    return () => clearInterval(interval);
  }, [shouldEnableMonitoring, currentRoute]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return AlertTriangle;
      case 'warning': return TrendingUp;
      default: return Activity;
    }
  };

  const StatusIcon = getStatusIcon(healthStatus);

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <StatusIcon className="w-5 h-5" />
            <h3 className="text-lg font-semibold">Realtime Message Rate Monitor</h3>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={getStatusColor(healthStatus)}>
              {healthStatus.toUpperCase()}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshMetrics}
              className="h-8"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-primary">{metrics.messagesPerMinute}</div>
            <div className="text-sm text-muted-foreground">Messages/min</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-secondary">{metrics.messagesPerHour}</div>
            <div className="text-sm text-muted-foreground">Messages/hour</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{metrics.peakRate}</div>
            <div className="text-sm text-muted-foreground">Peak rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success">
              ${metrics.costEstimate.toFixed(4)}
            </div>
            <div className="text-sm text-muted-foreground">Est. cost/hour</div>
          </div>
        </div>

        {recommendations.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-warning" />
              Recommendations
            </h4>
            <ul className="space-y-1">
              {recommendations.map((rec, index) => (
                <li key={index} className="text-sm text-muted-foreground">
                  • {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h4 className="font-medium mb-3">Top Message Types</h4>
        <div className="space-y-2">
          {topTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No message types recorded</p>
          ) : (
            topTypes.map((type, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div>
                  <div className="font-medium text-sm">{type.type}</div>
                  <div className="text-xs text-muted-foreground">Source: {type.source}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-sm">{type.count}</div>
                  <div className="text-xs text-muted-foreground">
                    {type.rate.toFixed(1)}/hr
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
};