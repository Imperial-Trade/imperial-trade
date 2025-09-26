import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, CheckCircle, XCircle, Activity } from 'lucide-react';
import { useNotificationHealth } from '@/hooks/useNotificationHealth';
import { cn } from '@/lib/utils';

export const NotificationHealthIndicator: React.FC = () => {
  const { health, getHealthStatus, getHealthColor, isLoading } = useNotificationHealth();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Activity className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Checking notification health...</span>
      </div>
    );
  }

  const status = getHealthStatus();
  const colorClass = getHealthColor();

  const getStatusIcon = () => {
    switch (status) {
      case 'healthy': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'caution': return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'critical': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'healthy': return 'Notifications Healthy';
      case 'warning': return 'Minor Issues Detected';
      case 'caution': return 'Performance Degraded';
      case 'critical': return 'Critical Issues';
      default: return 'Unknown Status';
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <p className={cn("font-medium text-sm", colorClass)}>
                {getStatusText()}
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                <span>Success: {health.successRate.toFixed(1)}%</span>
                <span>False Positives: {health.falsePositiveRate.toFixed(1)}%</span>
                <span>24h Sent: {health.totalSent24h}</span>
              </div>
            </div>
          </div>
          
          <Badge 
            variant={status === 'healthy' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {status.toUpperCase()}
          </Badge>
        </div>

        {health.issues.length > 0 && (
          <div className="mt-3 space-y-1">
            {health.issues.slice(0, 2).map((issue, index) => (
              <p key={index} className="text-xs text-red-400 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {issue}
              </p>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};