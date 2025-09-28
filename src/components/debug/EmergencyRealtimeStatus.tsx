import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Activity, Zap } from 'lucide-react';
import { emergencyRealtimeBreaker } from '@/services/EmergencyRealtimeBreaker';
import { useCostTracking } from '@/hooks/useCostTracking';
import { useUltraCostOptimization } from '@/hooks/useUltraCostOptimization';
import { useMonitoringRouteGate } from '@/hooks/useMonitoringRouteGate';

export const EmergencyRealtimeStatus: React.FC = () => {
  const { shouldEnableMonitoring, currentRoute } = useMonitoringRouteGate();
  const [status, setStatus] = React.useState(() => emergencyRealtimeBreaker.getStatus());
  const costMetrics = useCostTracking();
  const optimization = useUltraCostOptimization();

  React.useEffect(() => {
    if (!shouldEnableMonitoring) {
      console.log(`🚫 EmergencyRealtimeStatus: DISABLED on route: ${currentRoute}`);
      return;
    }
    
    const interval = setInterval(() => {
      setStatus(emergencyRealtimeBreaker.getStatus());
    }, 5000);
    return () => clearInterval(interval);
  }, [shouldEnableMonitoring, currentRoute]);

  const handleReset = () => {
    emergencyRealtimeBreaker.reset();
    costMetrics.resetMetrics();
    setStatus(emergencyRealtimeBreaker.getStatus());
  };

  const handleEmergencyMode = () => {
    optimization.enableEmergencyMode();
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" />
            Emergency Breaker Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={status.isEmergency ? "destructive" : "secondary"}>
              {status.isEmergency ? "EMERGENCY" : "NORMAL"}
            </Badge>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Hourly Usage</span>
              <span className={status.limitsStatus.hourlyUsage > 80 ? "text-destructive" : ""}>
                {status.limitsStatus.hourlyUsage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  status.limitsStatus.hourlyUsage > 90 ? 'bg-destructive' : 
                  status.limitsStatus.hourlyUsage > 70 ? 'bg-orange-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(status.limitsStatus.hourlyUsage, 100)}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Daily Usage</span>
              <span className={status.limitsStatus.dailyUsage > 80 ? "text-destructive" : ""}>
                {status.limitsStatus.dailyUsage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  status.limitsStatus.dailyUsage > 90 ? 'bg-destructive' : 
                  status.limitsStatus.dailyUsage > 70 ? 'bg-orange-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(status.limitsStatus.dailyUsage, 100)}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-muted-foreground">
              Failures: {status.metrics.consecutiveFailures}
            </span>
            <span className="text-xs text-muted-foreground">
              Reset in: {status.limitsStatus.hoursUntilReset.toFixed(1)}h
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="h-4 w-4" />
            Cost Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="space-y-1">
              <div className="text-lg font-mono">{costMetrics.summary.current}</div>
              <div className="text-xs text-muted-foreground">Current</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-mono">{costMetrics.summary.daily}</div>
              <div className="text-xs text-muted-foreground">Daily</div>
            </div>
            <div className="space-y-1">
              <div className="text-lg font-mono">{costMetrics.summary.monthly}</div>
              <div className="text-xs text-muted-foreground">Monthly</div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status</span>
            <Badge variant={
              costMetrics.status === 'critical' ? "destructive" : 
              costMetrics.status === 'warning' ? "outline" : "secondary"
            }>
              {costMetrics.status.toUpperCase()}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Messages</span>
            <span className="text-sm font-mono">{costMetrics.realtimeMessages.toLocaleString()}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Optimization</span>
            <Badge variant={optimization.isOptimized ? "secondary" : "outline"}>
              {optimization.projectedSavings.percentage}% Saved
            </Badge>
          </div>
        </CardContent>
      </Card>

      {(status.isEmergency || costMetrics.status === 'critical') && (
        <div className="md:col-span-2">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                {status.isEmergency ? 'Emergency mode active - All realtime connections blocked' : 
                 'Critical cost threshold exceeded - Immediate action required'}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleEmergencyMode}>
                  <Zap className="h-3 w-3 mr-1" />
                  Force Emergency
                </Button>
                <Button size="sm" variant="outline" onClick={handleReset}>
                  Reset Metrics
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
};